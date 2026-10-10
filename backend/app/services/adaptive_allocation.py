"""
SeatSync Adaptive Allocation Engine

Implements multi-factor weighted scoring for intelligent table assignment.
This replaces the simple deterministic allocator with configurable optimization.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from dataclasses import replace

from app.services.allocation_policy import AllocationPolicy, get_policy
from app.services.allocation import reservation_conflicts


@dataclass
class ScoringFactors:
    """Individual scoring components for a table recommendation."""
    capacity_fit: float  # 0.0 (worst) to 1.0 (perfect)
    wait_impact: float   # 0.0 (high impact) to 1.0 (low impact)
    idle_time: float     # 0.0 (just used) to 1.0 (long idle)
    revenue_opportunity: float  # 0.0 (low) to 1.0 (high)
    
    def to_dict(self) -> Dict[str, float]:
        return {
            'capacityFit': round(self.capacity_fit, 4),
            'waitImpact': round(self.wait_impact, 4),
            'idleTime': round(self.idle_time, 4),
            'revenueOpportunity': round(self.revenue_opportunity, 4),
        }


@dataclass
class TableRecommendation:
    """A scored table recommendation with explanation."""
    table: any  # RestaurantTable model instance
    score: float  # Weighted total score (0.0 to 1.0)
    factors: ScoringFactors
    reason: str
    
    def to_dict(self) -> Dict:
        return {
            'table': self.table.to_dict() if self.table else None,
            'score': round(self.score, 4),
            'factors': self.factors.to_dict(),
            'reason': self.reason,
        }


def _as_utc(value):
    """Normalize datetime to UTC timezone."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _reservation_conflicts(reservation, at, hold_minutes) -> bool:
    """Compatibility wrapper for the shared reservation interval rule."""
    return reservation_conflicts(reservation, at, hold_minutes)


def _calculate_capacity_score(
    table_capacity: int,
    party_size: int,
    policy: AllocationPolicy
) -> float:
    """Score based on capacity utilization.
    
    Perfect match (party_size == capacity) scores 1.0.
    Larger tables score lower based on wasted seats.
    """
    if table_capacity < party_size:
        return 0.0  # Table too small
    
    waste = table_capacity - party_size
    if waste == 0:
        return 1.0  # Perfect match
    
    # Normalize waste: 0 waste = 1.0, max_waste = 0.0
    normalized_waste = min(waste / policy.max_capacity_waste, 1.0)
    return 1.0 - (normalized_waste * 0.7)  # Never go below 0.3 for feasible tables


def _calculate_wait_impact_score(
    table,
    party_size: int,
    reservations: List,
    at: datetime,
    policy: AllocationPolicy
) -> float:
    """Score based on impact on future reservations.
    
    If seating this party would block an upcoming reservation,
    score is lower. Considers expected dining duration.
    """
    # Estimate dining duration based on party size
    # Rough heuristic: 45 min base + 10 min per person
    estimated_duration_minutes = 45 + (party_size * 10)
    estimated_end = at + timedelta(minutes=estimated_duration_minutes)
    
    # Check if any upcoming reservation would conflict
    upcoming_conflicts = []
    for reservation in reservations:
        if (reservation.table_id == table.id and
            reservation.status in ('confirmed', 'checked_in')):
            res_time = _as_utc(reservation.starts_at)
            if at < res_time < estimated_end:
                minutes_until = (res_time - at).total_seconds() / 60
                upcoming_conflicts.append(minutes_until)
    
    if not upcoming_conflicts:
        return 1.0  # No wait impact
    
    # Score inversely with time until conflict
    min_conflict = min(upcoming_conflicts)
    normalized = min(min_conflict / policy.max_wait_impact_minutes, 1.0)
    return normalized * 0.5  # Penalize conflicts significantly


def _calculate_idle_time_score(
    table,
    at: datetime,
    policy: AllocationPolicy
) -> float:
    """Score based on how long the table has been idle.
    
    Tables that have been available longer score higher
    (helps distribute load and avoid perpetually idle tables).
    """
    if table.status != 'available':
        return 0.0
    
    # If table was just seated and cleared, time_seated tracks last use
    # If time_seated is None, table hasn't been used recently
    if table.time_seated is None:
        # Table has been idle for "a long time" - score high
        return 1.0
    
    last_used = _as_utc(table.time_seated)
    idle_minutes = (at - last_used).total_seconds() / 60
    
    # Normalize: longer idle = higher score
    normalized = min(idle_minutes / policy.max_idle_penalty_minutes, 1.0)
    return normalized


def _calculate_revenue_score(
    table_capacity: int,
    party_size: int,
    policy: AllocationPolicy
) -> float:
    """Score based on revenue optimization.
    
    Considers potential revenue from this party vs table capacity.
    Larger parties on appropriately sized tables score higher.
    """
    # Estimated revenue for this party
    party_revenue = party_size * policy.average_party_spend_per_person
    
    # Potential revenue if table was at full capacity
    potential_revenue = table_capacity * policy.average_party_spend_per_person
    
    if potential_revenue == 0:
        return 0.5
    
    # Utilization ratio: higher is better
    utilization = party_revenue / potential_revenue
    
    # Perfect utilization (100%) scores 1.0
    # 50% utilization scores 0.5
    return utilization


def score_table(
    table,
    party_size: int,
    reservations: List,
    at: datetime,
    policy: AllocationPolicy
) -> Tuple[float, ScoringFactors]:
    """Calculate weighted score for a single table.
    
    Returns:
        Tuple of (total_score, individual_factors)
    """
    factors = ScoringFactors(
        capacity_fit=_calculate_capacity_score(table.capacity, party_size, policy),
        wait_impact=_calculate_wait_impact_score(table, party_size, reservations, at, policy),
        idle_time=_calculate_idle_time_score(table, at, policy),
        revenue_opportunity=_calculate_revenue_score(table.capacity, party_size, policy),
    )
    
    # Apply weights
    weights = policy.weights
    total_score = (
        factors.capacity_fit * weights.capacity_fit +
        factors.wait_impact * weights.wait_impact +
        factors.idle_time * weights.idle_time +
        factors.revenue_opportunity * weights.revenue_opportunity
    )
    
    return total_score, factors


def _generate_recommendation_reason(
    table,
    party_size: int,
    factors: ScoringFactors,
    rank: int
) -> str:
    """Generate human-readable explanation for recommendation."""
    reasons = []
    
    # Capacity assessment
    waste = table.capacity - party_size
    if waste == 0:
        reasons.append("perfect capacity match")
    elif waste <= 2:
        reasons.append(f"good fit ({waste} extra seat{'s' if waste > 1 else ''})")
    else:
        reasons.append(f"accommodates party with {waste} surplus seats")
    
    # Wait impact
    if factors.wait_impact >= 0.9:
        reasons.append("no impact on upcoming reservations")
    elif factors.wait_impact >= 0.5:
        reasons.append("minimal conflict with future bookings")
    else:
        reasons.append("may affect upcoming reservation timing")
    
    # Idle time
    if factors.idle_time >= 0.8:
        reasons.append("table has been underutilized")
    elif factors.idle_time >= 0.5:
        reasons.append("table recently became available")
    
    # Revenue
    revenue_util = factors.revenue_opportunity
    if revenue_util >= 0.85:
        reasons.append("excellent revenue optimization")
    elif revenue_util >= 0.6:
        reasons.append("good revenue potential")
    
    # Combine with rank indicator
    if rank == 1:
        prefix = "Best match: "
    elif rank == 2:
        prefix = "Strong alternative: "
    else:
        prefix = f"Option {rank}: "
    
    return prefix + "; ".join(reasons) + "."


def recommend_tables(
    tables: List,
    party_size: int,
    reservations: List = None,
    at: datetime = None,
    preferred_section: str = None,
    restaurant_id: str = 'default',
    return_all_candidates: bool = False,
    reservation_hold_minutes: int = None,
    turn_time_minutes: int = 90,
) -> List[TableRecommendation]:
    """Generate scored table recommendations using adaptive allocation.
    
    Args:
        tables: List of RestaurantTable objects
        party_size: Number of guests
        reservations: List of Reservation objects for conflict checking
        at: Target time for seating (defaults to now)
        preferred_section: Optional section preference (adds bonus)
        restaurant_id: Restaurant ID for policy lookup
        return_all_candidates: If True, return all feasible tables ranked
        
    Returns:
        List of TableRecommendation objects, sorted by score (best first)
    """
    if reservations is None:
        reservations = []
    
    if at is None:
        at = datetime.now(timezone.utc)
    else:
        at = _as_utc(at)
    
    if not isinstance(party_size, int) or isinstance(party_size, bool) or party_size < 1:
        return []
    
    # Get restaurant-specific policy
    policy = get_policy(restaurant_id)
    if reservation_hold_minutes is not None:
        policy = replace(policy, reservation_hold_minutes=reservation_hold_minutes)
    
    # Identify held tables
    held_table_ids = {
        r.table_id for r in reservations
        if r.table_id and reservation_conflicts(
            r, at, policy.reservation_hold_minutes, turn_time_minutes
        )
    }
    
    # Filter to feasible candidates
    candidates = [
        table for table in tables
        if (table.status == 'available' and
            table.capacity >= party_size and
            table.id not in held_table_ids)
    ]
    
    if not candidates:
        return []
    
    # Score all candidates
    scored_candidates = []
    for table in candidates:
        score, factors = score_table(table, party_size, reservations, at, policy)
        
        # Section preference bonus (adds up to 0.1 to score)
        if preferred_section and table.section.casefold() == preferred_section.casefold():
            score = min(score + 0.1, 1.0)
        
        scored_candidates.append((table, score, factors))
    
    # Sort by score (descending), then by capacity (ascending), then by ID
    scored_candidates.sort(
        key=lambda x: (-x[1], x[0].capacity - party_size, str(x[0].id))
    )
    
    # Convert to recommendations with explanations
    recommendations = []
    for rank, (table, score, factors) in enumerate(scored_candidates, start=1):
        reason = _generate_recommendation_reason(table, party_size, factors, rank)
        recommendations.append(
            TableRecommendation(
                table=table,
                score=score,
                factors=factors,
                reason=reason,
            )
        )
        
        # Return only top candidate unless all requested
        if not return_all_candidates and rank == 1:
            break
    
    return recommendations


def recommend_single_table(
    tables: List,
    party_size: int,
    reservations: List = None,
    at: datetime = None,
    preferred_section: str = None,
    restaurant_id: str = 'default',
) -> Optional[TableRecommendation]:
    """Get the single best table recommendation.
    
    Convenience wrapper around recommend_tables that returns only the top result.
    """
    recommendations = recommend_tables(
        tables=tables,
        party_size=party_size,
        reservations=reservations,
        at=at,
        preferred_section=preferred_section,
        restaurant_id=restaurant_id,
        return_all_candidates=False,
    )
    return recommendations[0] if recommendations else None
