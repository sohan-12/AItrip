import uuid
from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END

from backend.agents.state import TripPlanningState
from backend.agents.specialized import (
    research_agent_node,
    weather_agent_node,
    transport_agent_node,
    hotel_agent_node,
    experiences_agent_node,
    safety_agent_node,
    budget_agent_node,
    conflict_detector_node,
    optimizer_node,
    replanning_node,
)
from backend.models.location import (
    TripPlanRequest,
    TripPlanResponse,
    TripReplanRequest,
    TripReplanResponse,
    DayItinerary,
    ItineraryWaypoint,
    AgentTelemetryEvent,
)

# 1. Build Main Trip Planning StateGraph
workflow = StateGraph(TripPlanningState)
workflow.add_node("research", research_agent_node)
workflow.add_node("weather", weather_agent_node)
workflow.add_node("transport", transport_agent_node)
workflow.add_node("hotel", hotel_agent_node)
workflow.add_node("experiences", experiences_agent_node)
workflow.add_node("safety", safety_agent_node)
workflow.add_node("budget", budget_agent_node)
workflow.add_node("conflict_detector", conflict_detector_node)
workflow.add_node("optimizer", optimizer_node)

workflow.add_edge(START, "research")
workflow.add_edge("research", "weather")
workflow.add_edge("weather", "transport")
workflow.add_edge("transport", "hotel")
workflow.add_edge("hotel", "experiences")
workflow.add_edge("experiences", "safety")
workflow.add_edge("safety", "budget")
workflow.add_edge("budget", "conflict_detector")
workflow.add_edge("conflict_detector", "optimizer")
workflow.add_edge("optimizer", END)

plan_graph = workflow.compile()

# 2. Build Dynamic Replanning StateGraph
replan_workflow = StateGraph(TripPlanningState)
replan_workflow.add_node("conflict_detector", conflict_detector_node)
replan_workflow.add_node("replan", replanning_node)

replan_workflow.add_edge(START, "conflict_detector")
replan_workflow.add_edge("conflict_detector", "replan")
replan_workflow.add_edge("replan", END)

replan_graph = replan_workflow.compile()

class SupervisorAgent:
    """
    Supervisor Agent for AITrip Global Agentic AI Travel Planner.
    Orchestrates the LangGraph multi-agent pipeline:
    Research -> Weather -> Transport -> Hotel -> Experiences -> Safety -> Budget -> Conflict Detector -> Optimizer
    """

    @classmethod
    async def orchestrate_plan(cls, request: TripPlanRequest) -> TripPlanResponse:
        trip_id = f"trip-{uuid.uuid4().hex[:8]}"

        # Initialize LangGraph state
        initial_state: TripPlanningState = {
            "origin": request.origin.model_dump(),
            "destination": request.destination.model_dump(),
            "duration_days": request.durationDays,
            "travelers": request.travelers,
            "budget": request.budget,
            "budget_tier": request.budgetTier or "Comfort (Curated Boutique)",
            "travel_style": request.travelStyle or "Bespoke Cultural & Scenic Discovery",
            "pace": request.pace or "Moderate (Balanced Exploration)",
            "preferences": request.preferences,
            "user_prompt": request.userPrompt,
            "agent_events": [
                {
                    "agent": "Supervisor",
                    "status": "initiated",
                    "message": f"Orchestrating autonomous LangGraph multi-agent pipeline for {request.destination.name}, {request.destination.country}.",
                }
            ],
        }

        # Run compiled LangGraph workflow asynchronously
        final_state = await plan_graph.ainvoke(initial_state)

        # Convert raw dicts to Pydantic models
        itinerary_models: List[DayItinerary] = []
        for day in final_state.get("itinerary", []):
            waypoints = [ItineraryWaypoint(**act) for act in day.get("activities", [])]
            itinerary_models.append(
                DayItinerary(
                    day=day.get("day", 1),
                    title=day.get("title", f"Day {day.get('day', 1)}"),
                    theme=day.get("theme"),
                    morning=day.get("morning"),
                    afternoon=day.get("afternoon"),
                    evening=day.get("evening"),
                    diningRecommendation=day.get("diningRecommendation"),
                    activities=waypoints,
                )
            )

        events = [AgentTelemetryEvent(**ev) for ev in final_state.get("agent_events", [])]

        return TripPlanResponse(
            tripId=trip_id,
            status="completed",
            origin=request.origin,
            destination=request.destination,
            summary=final_state.get("summary", ""),
            durationDays=request.durationDays,
            travelers=request.travelers,
            estimatedBudget=final_state.get("budget_breakdown", {}),
            weatherOverview=final_state.get("weather", {}),
            transportRecommendation=final_state.get("transport", {}),
            hotelRecommendation=final_state.get("hotel", {}),
            safetyAdvisories=final_state.get("safety", {}),
            packingChecklist=final_state.get("packing_checklist", []),
            itinerary=itinerary_models,
            agentEvents=events,
            conflictsDetected=final_state.get("conflicts", []),
            optimizationsApplied=final_state.get("optimizations", []),
        )

    @classmethod
    async def replan_trip(cls, request: TripReplanRequest) -> TripReplanResponse:
        current_trip = request.currentTrip or {}
        days_data = current_trip.get("days", [])
        if not days_data and "itinerary" in current_trip:
            days_data = current_trip.get("itinerary", [])

        replan_state: TripPlanningState = {
            "origin": current_trip.get("origin", {"name": "Hyderabad"}),
            "destination": current_trip.get("destination", {"name": current_trip.get("destinationName", "Destination")}),
            "duration_days": current_trip.get("durationDays", len(days_data) or 4),
            "travelers": current_trip.get("travelers", 2),
            "budget": current_trip.get("budget", {}).get("total", 30000.0) if isinstance(current_trip.get("budget"), dict) else 30000.0,
            "condition_change": request.conditionChange,
            "disruption_type": request.disruptionType,
            "itinerary": days_data,
            "agent_events": [
                {
                    "agent": "Supervisor",
                    "status": "initiated",
                    "message": f"Supervising dynamic replan: disruption '{request.conditionChange}' received.",
                }
            ],
            "conflicts": [],
        }

        replan_result = await replan_graph.ainvoke(replan_state)

        updated_days: List[DayItinerary] = []
        for day in replan_result.get("itinerary", []):
            waypoints = []
            for act in day.get("activities", []):
                waypoints.append(
                    ItineraryWaypoint(
                        id=act.get("id", str(uuid.uuid4())[:8]),
                        time=act.get("time", "10:00"),
                        title=act.get("title", "Adjusted Activity"),
                        description=act.get("description", ""),
                        location=act.get("location", ""),
                        lat=float(act.get("lat", 0.0)),
                        lng=float(act.get("lng", 0.0)),
                        category=act.get("category", "Activity"),
                        cost=float(act.get("cost", 0.0)),
                        duration=act.get("duration", "1.5 hours"),
                        transitTime=act.get("transitTime", "15 mins"),
                        icon=act.get("icon", "Compass"),
                    )
                )
            updated_days.append(
                DayItinerary(
                    day=day.get("day", 1),
                    title=day.get("title", f"Day {day.get('day', 1)}"),
                    theme=day.get("theme"),
                    morning=day.get("morning"),
                    afternoon=day.get("afternoon"),
                    evening=day.get("evening"),
                    diningRecommendation=day.get("diningRecommendation"),
                    activities=waypoints,
                )
            )

        events = [AgentTelemetryEvent(**ev) for ev in replan_result.get("agent_events", [])]

        return TripReplanResponse(
            tripId=request.tripId,
            status="replanned",
            conditionChange=request.conditionChange,
            replanSummary=replan_result.get("replan_summary", "Dynamic replan complete."),
            conflictsIdentified=replan_result.get("conflicts", []),
            adaptationsApplied=replan_result.get("adaptations_applied", []),
            updatedItinerary=updated_days,
            agentEvents=events,
        )
