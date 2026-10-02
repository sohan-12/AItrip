from typing import TypedDict, List, Dict, Any, Optional
from backend.models.location import (
    TripOrigin,
    TripDestination,
    DayItinerary,
    AgentTelemetryEvent,
)

class TripPlanningState(TypedDict, total=False):
    # Input Configuration
    origin: Dict[str, Any]
    destination: Dict[str, Any]
    duration_days: int
    travelers: int
    budget: float
    budget_tier: str
    travel_style: str
    pace: str
    preferences: List[str]
    user_prompt: Optional[str]

    # Agent Deliverables
    research: Dict[str, Any]
    weather: Dict[str, Any]
    transport: Dict[str, Any]
    hotel: Dict[str, Any]
    experiences: List[Dict[str, Any]]
    budget_breakdown: Dict[str, Any]
    safety: Dict[str, Any]
    packing_checklist: List[Dict[str, Any]]

    # Multi-Agent Coordination & Synthesis
    conflicts: List[Dict[str, Any]]
    optimizations: List[str]
    itinerary: List[Dict[str, Any]]
    agent_events: List[Dict[str, Any]]
    summary: str

    # Dynamic Replanning State
    condition_change: Optional[str]
    disruption_type: Optional[str]
    replan_summary: Optional[str]
    adaptations_applied: List[str]
