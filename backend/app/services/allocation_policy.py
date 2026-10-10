"""
Configurable allocation policies and scoring weights for adaptive table assignment.

This module defines the SeatSync adaptive scoring engine configuration,
allowing restaurants to tune allocation behavior based on their priorities.
"""

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class AllocationWeights:
    """Configurable weights for multi-factor table scoring.
    
    All weights should sum to 1.0 for normalized scoring.
    Default weights balance capacity optimization, wait minimization,
    and table utilization.
    """
    capacity_fit: float = 0.40
    """Weight for capacity utilization (minimize wasted seats)"""
    
    wait_impact: float = 0.30
    """Weight for estimated wait time impact on other parties"""
    
    idle_time: float = 0.20
    """Weight for table idle time (prefer underutilized tables)"""
    
    revenue_opportunity: float = 0.10
    """Weight for estimated revenue potential"""
    
    def validate(self) -> bool:
        """Ensure weights sum to approximately 1.0"""
        total = (self.capacity_fit + self.wait_impact + 
                self.idle_time + self.revenue_opportunity)
        return 0.99 <= total <= 1.01
    
    def to_dict(self) -> Dict[str, float]:
        return {
            'capacityFit': self.capacity_fit,
            'waitImpact': self.wait_impact,
            'idleTime': self.idle_time,
            'revenueOpportunity': self.revenue_opportunity,
        }


@dataclass
class AllocationPolicy:
    """Restaurant-specific allocation policies and constraints."""
    
    reservation_hold_minutes: int = 90
    """Time window to protect confirmed/checked-in reservations"""
    
    grace_period_minutes: int = 15
    """Grace period before considering a reservation as no-show"""
    
    max_capacity_waste: int = 4
    """Maximum acceptable surplus seats (for score normalization)"""
    
    max_wait_impact_minutes: int = 60
    """Maximum estimated wait impact for normalization"""
    
    max_idle_penalty_minutes: int = 120
    """Maximum idle time to penalize in scoring"""
    
    average_party_spend_per_person: float = 35.0
    """Average spend per person for revenue estimation (USD)"""
    
    weights: AllocationWeights = field(default_factory=AllocationWeights)
    """Scoring weights configuration"""
    
    def to_dict(self) -> Dict:
        return {
            'reservationHoldMinutes': self.reservation_hold_minutes,
            'gracePeriodMinutes': self.grace_period_minutes,
            'maxCapacityWaste': self.max_capacity_waste,
            'maxWaitImpactMinutes': self.max_wait_impact_minutes,
            'maxIdlePenaltyMinutes': self.max_idle_penalty_minutes,
            'averagePartySpendPerPerson': self.average_party_spend_per_person,
            'weights': self.weights.to_dict(),
        }


# Default policy instance
DEFAULT_POLICY = AllocationPolicy()


# Restaurant-specific policy overrides (can be moved to database)
RESTAURANT_POLICIES: Dict[str, AllocationPolicy] = {
    'default': DEFAULT_POLICY,
    
    # Example: High-end restaurant prioritizing revenue
    'premium_dining': AllocationPolicy(
        weights=AllocationWeights(
            capacity_fit=0.30,
            wait_impact=0.25,
            idle_time=0.15,
            revenue_opportunity=0.30,
        ),
        average_party_spend_per_person=75.0,
    ),
    
    # Example: High-volume casual dining prioritizing turnover
    'casual_dining': AllocationPolicy(
        weights=AllocationWeights(
            capacity_fit=0.35,
            wait_impact=0.40,
            idle_time=0.20,
            revenue_opportunity=0.05,
        ),
        grace_period_minutes=10,
        average_party_spend_per_person=25.0,
    ),
}


def get_policy(restaurant_id: str = 'default') -> AllocationPolicy:
    """Retrieve allocation policy for a restaurant.
    
    Args:
        restaurant_id: Restaurant identifier
        
    Returns:
        AllocationPolicy instance with configured weights and policies
    """
    return RESTAURANT_POLICIES.get(restaurant_id, DEFAULT_POLICY)
