"""
Tests for the SeatSync adaptive allocation scoring engine.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.services.allocation_policy import AllocationPolicy, AllocationWeights
from app.services.adaptive_allocation import (
    recommend_tables,
    recommend_single_table,
    score_table,
    _calculate_capacity_score,
    _calculate_wait_impact_score,
    _calculate_idle_time_score,
    _calculate_revenue_score,
)


class MockTable:
    def __init__(self, id, capacity, status='available', section='Main', time_seated=None):
        self.id = id
        self.capacity = capacity
        self.status = status
        self.section = section
        self.time_seated = time_seated
        self.party_size = 0
    
    def to_dict(self):
        return {
            'id': self.id,
            'capacity': self.capacity,
            'status': self.status,
            'section': self.section,
        }


class MockReservation:
    def __init__(self, table_id, starts_at, status='confirmed'):
        self.id = f'RES-{table_id}'
        self.table_id = table_id
        self.starts_at = starts_at
        self.status = status


@pytest.fixture
def default_policy():
    return AllocationPolicy()


@pytest.fixture
def revenue_optimized_policy():
    """Policy for high-end restaurant prioritizing revenue."""
    return AllocationPolicy(
        weights=AllocationWeights(
            capacity_fit=0.30,
            wait_impact=0.25,
            idle_time=0.15,
            revenue_opportunity=0.30,
        ),
        average_party_spend_per_person=75.0,
    )


def test_capacity_score_perfect_match(default_policy):
    """Perfect capacity match should score 1.0"""
    score = _calculate_capacity_score(4, 4, default_policy)
    assert score == 1.0


def test_capacity_score_one_seat_waste(default_policy):
    """One wasted seat should still score high"""
    score = _calculate_capacity_score(5, 4, default_policy)
    assert score > 0.8
    assert score < 1.0


def test_capacity_score_max_waste(default_policy):
    """Maximum waste should still be feasible but scored low"""
    score = _calculate_capacity_score(8, 4, default_policy)
    assert score >= 0.3  # Never below 0.3 for feasible tables
    assert score < 0.5


def test_capacity_score_undersized_table(default_policy):
    """Undersized table should score 0.0"""
    score = _calculate_capacity_score(2, 4, default_policy)
    assert score == 0.0


def test_wait_impact_no_conflicts(default_policy):
    """No upcoming reservations should score 1.0"""
    table = MockTable('T01', 4)
    now = datetime.now(timezone.utc)
    score = _calculate_wait_impact_score(table, 2, [], now, default_policy)
    assert score == 1.0


def test_wait_impact_with_near_conflict(default_policy):
    """Reservation starting soon should lower score"""
    table = MockTable('T01', 4)
    now = datetime.now(timezone.utc)
    near_reservation = MockReservation('T01', now + timedelta(minutes=50))
    
    score = _calculate_wait_impact_score(table, 4, [near_reservation], now, default_policy)
    assert score < 0.6  # Should penalize potential conflict


def test_wait_impact_with_far_reservation(default_policy):
    """Reservation far in future should not impact score much"""
    table = MockTable('T01', 4)
    now = datetime.now(timezone.utc)
    far_reservation = MockReservation('T01', now + timedelta(hours=3))
    
    score = _calculate_wait_impact_score(table, 2, [far_reservation], now, default_policy)
    assert score > 0.9  # Minimal impact


def test_idle_time_score_never_used(default_policy):
    """Table never used should score maximum"""
    table = MockTable('T01', 4, time_seated=None)
    now = datetime.now(timezone.utc)
    score = _calculate_idle_time_score(table, now, default_policy)
    assert score == 1.0


def test_idle_time_score_recently_used(default_policy):
    """Recently used table should score lower"""
    now = datetime.now(timezone.utc)
    table = MockTable('T01', 4, time_seated=now - timedelta(minutes=10))
    score = _calculate_idle_time_score(table, now, default_policy)
    assert score < 0.3


def test_idle_time_score_long_idle(default_policy):
    """Table idle for long time should score high"""
    now = datetime.now(timezone.utc)
    table = MockTable('T01', 4, time_seated=now - timedelta(hours=2))
    score = _calculate_idle_time_score(table, now, default_policy)
    assert score >= 0.9


def test_revenue_score_full_utilization(default_policy):
    """Full table utilization should maximize revenue score"""
    score = _calculate_revenue_score(4, 4, default_policy)
    assert score == 1.0


def test_revenue_score_half_utilization(default_policy):
    """Half utilization should score 0.5"""
    score = _calculate_revenue_score(4, 2, default_policy)
    assert score == 0.5


def test_revenue_score_three_quarters_utilization(default_policy):
    """75% utilization should score 0.75"""
    score = _calculate_revenue_score(4, 3, default_policy)
    assert score == 0.75


def test_single_table_recommendation():
    """Basic recommendation should return best table"""
    tables = [
        MockTable('T01', 2),
        MockTable('T02', 4),
        MockTable('T03', 6),
    ]
    
    recommendation = recommend_single_table(tables, party_size=3)
    
    assert recommendation is not None
    assert recommendation.table.id == 'T02'  # Smallest suitable
    assert 0.0 <= recommendation.score <= 1.0
    assert recommendation.factors is not None


def test_recommendation_with_section_preference():
    """Section preference should influence selection"""
    tables = [
        MockTable('T01', 4, section='Window'),
        MockTable('T02', 4, section='Patio'),
    ]
    
    recommendation = recommend_single_table(
        tables, 
        party_size=3, 
        preferred_section='Window'
    )
    
    assert recommendation.table.id == 'T01'


def test_recommendation_respects_reservation_holds():
    """Tables with active reservations should not be recommended"""
    now = datetime.now(timezone.utc)
    tables = [
        MockTable('T01', 4),
        MockTable('T02', 4),
    ]
    reservations = [
        MockReservation('T01', now + timedelta(minutes=30)),  # Within 90-min window
    ]
    
    recommendation = recommend_single_table(
        tables,
        party_size=3,
        reservations=reservations,
        at=now,
    )
    
    assert recommendation.table.id == 'T02'  # T01 is protected


def test_recommendation_ignores_cancelled_reservations():
    """Cancelled reservations should not block tables"""
    now = datetime.now(timezone.utc)
    tables = [MockTable('T01', 4)]
    reservations = [
        MockReservation('T01', now + timedelta(minutes=30), status='cancelled'),
    ]
    
    recommendation = recommend_single_table(
        tables,
        party_size=3,
        reservations=reservations,
        at=now,
    )
    
    assert recommendation is not None
    assert recommendation.table.id == 'T01'


def test_multiple_candidates_returned():
    """return_all_candidates should return all feasible tables ranked"""
    tables = [
        MockTable('T01', 2),
        MockTable('T02', 4),
        MockTable('T03', 6),
        MockTable('T04', 8),
    ]
    
    recommendations = recommend_tables(
        tables,
        party_size=3,
        return_all_candidates=True,
    )
    
    assert len(recommendations) == 3  # T01 too small, T02/T03/T04 feasible
    assert recommendations[0].table.id == 'T02'  # Best: smallest surplus
    assert recommendations[1].table.id == 'T03'
    assert recommendations[2].table.id == 'T04'
    
    # Scores should be descending
    assert recommendations[0].score >= recommendations[1].score
    assert recommendations[1].score >= recommendations[2].score


def test_no_recommendation_when_all_tables_occupied():
    """Should return empty list when no tables available"""
    tables = [
        MockTable('T01', 4, status='occupied'),
        MockTable('T02', 4, status='cleaning'),
    ]
    
    recommendations = recommend_tables(tables, party_size=3)
    
    assert recommendations == []


def test_no_recommendation_when_all_tables_too_small():
    """Should return empty list when no table fits"""
    tables = [
        MockTable('T01', 2),
        MockTable('T02', 2),
    ]
    
    recommendations = recommend_tables(tables, party_size=4)
    
    assert recommendations == []


def test_revenue_optimized_policy_prefers_full_tables():
    """Revenue-optimized policy should prefer tables that maximize utilization"""
    revenue_policy = AllocationPolicy(
        weights=AllocationWeights(
            capacity_fit=0.20,
            wait_impact=0.20,
            idle_time=0.10,
            revenue_opportunity=0.50,  # Heavy revenue weighting
        ),
    )
    
    tables = [
        MockTable('T01', 4),
        MockTable('T02', 6),
    ]
    
    # Party of 4 should prefer T01 (100% utilization) over T02 (67% utilization)
    # even though T02 has more total capacity
    recommendations = recommend_tables(
        tables,
        party_size=4,
        return_all_candidates=True,
    )
    
    # T01 should score higher due to perfect revenue utilization
    t01_rec = next(r for r in recommendations if r.table.id == 'T01')
    t02_rec = next(r for r in recommendations if r.table.id == 'T02')
    
    assert t01_rec.factors.revenue_opportunity == 1.0
    assert t02_rec.factors.revenue_opportunity < 0.7
    assert t01_rec.score > t02_rec.score


def test_recommendation_reason_explains_choice():
    """Recommendation reason should be human-readable"""
    tables = [MockTable('T01', 4)]
    
    recommendation = recommend_single_table(tables, party_size=4)
    
    assert recommendation.reason is not None
    assert isinstance(recommendation.reason, str)
    assert len(recommendation.reason) > 10
    assert 'perfect capacity match' in recommendation.reason.lower()


def test_weighted_scoring_combines_all_factors():
    """Total score should reflect all weighted factors"""
    now = datetime.now(timezone.utc)
    table = MockTable('T01', 4, time_seated=now - timedelta(hours=1))
    policy = AllocationPolicy()
    
    score, factors = score_table(table, 3, [], now, policy)
    
    # Verify all factors are calculated
    assert factors.capacity_fit > 0
    assert factors.wait_impact > 0
    assert factors.idle_time > 0
    assert factors.revenue_opportunity > 0
    
    # Verify score is weighted sum
    expected = (
        factors.capacity_fit * policy.weights.capacity_fit +
        factors.wait_impact * policy.weights.wait_impact +
        factors.idle_time * policy.weights.idle_time +
        factors.revenue_opportunity * policy.weights.revenue_opportunity
    )
    assert abs(score - expected) < 0.001


def test_invalid_party_size_returns_empty():
    """Invalid party size should return no recommendations"""
    tables = [MockTable('T01', 4)]
    
    recommendations = recommend_tables(tables, party_size=0)
    assert recommendations == []
    
    recommendations = recommend_tables(tables, party_size=-1)
    assert recommendations == []


def test_policy_weights_validation():
    """Policy weights should sum to approximately 1.0"""
    valid_weights = AllocationWeights(
        capacity_fit=0.4,
        wait_impact=0.3,
        idle_time=0.2,
        revenue_opportunity=0.1,
    )
    assert valid_weights.validate()
    
    invalid_weights = AllocationWeights(
        capacity_fit=0.5,
        wait_impact=0.3,
        idle_time=0.3,
        revenue_opportunity=0.3,  # Sum = 1.4
    )
    assert not invalid_weights.validate()
