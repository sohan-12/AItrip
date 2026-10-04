from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
import uuid
from backend.models.location import (
    TripPlanRequest,
    TripPlanResponse,
    TripReplanRequest,
    TripReplanResponse,
    AgentTelemetryEvent,
)
from backend.agents.supervisor import SupervisorAgent
from backend.database import get_db, SessionLocal
from backend.models.db_models import Trip, TripDestination, TripActivity, AgentRun, AgentEvent, TripRevision

router = APIRouter(prefix="/api/trips", tags=["trips"])

# In-memory trip store for fast retrieval
_TRIP_STORE: Dict[str, TripPlanResponse] = {}

def _persist_trip_to_db(plan: TripPlanResponse):
    try:
        with SessionLocal() as db:
            db_trip = Trip(
                id=plan.tripId,
                origin_name=plan.origin.name,
                origin_lat=plan.origin.latitude,
                origin_lng=plan.origin.longitude,
                destination_name=plan.destination.name,
                destination_lat=plan.destination.latitude,
                destination_lng=plan.destination.longitude,
                duration_days=plan.durationDays,
                travelers=plan.travelers,
                budget=plan.estimatedBudget.get("totalEstimated", 30000.0),
                currency="INR",
                summary=plan.summary,
                status=plan.status,
            )
            db.merge(db_trip)

            # Persist destination
            dest = TripDestination(
                id=f"td-{uuid.uuid4().hex[:8]}",
                trip_id=plan.tripId,
                name=plan.destination.name,
                country=plan.destination.country,
                latitude=plan.destination.latitude,
                longitude=plan.destination.longitude,
            )
            db.add(dest)

            # Persist agent run and telemetry events
            run = AgentRun(
                id=f"run-{uuid.uuid4().hex[:8]}",
                trip_id=plan.tripId,
                trigger_type="plan_creation",
                status="completed",
                total_events=len(plan.agentEvents),
            )
            db.add(run)

            for ev in plan.agentEvents:
                a_ev = AgentEvent(
                    id=f"ev-{uuid.uuid4().hex[:8]}",
                    run_id=run.id,
                    trip_id=plan.tripId,
                    agent_name=ev.agent,
                    status=ev.status,
                    message=ev.message,
                    timestamp=ev.timestamp,
                    details_json=str(ev.details) if ev.details else None,
                )
                db.add(a_ev)

            # Persist activities
            for day in plan.itinerary:
                for act in day.activities:
                    db_act = TripActivity(
                        id=act.id,
                        trip_id=plan.tripId,
                        day_number=day.day,
                        time_slot=act.time,
                        title=act.title,
                        description=act.description,
                        location=act.location,
                        latitude=act.lat,
                        longitude=act.lng,
                        category=act.category,
                        cost=act.cost,
                        duration=act.duration,
                        transit_time=act.transitTime,
                        icon=act.icon,
                    )
                    db.merge(db_act)

            db.commit()
    except Exception as e:
        # Non-blocking db persistence
        pass

@router.post("", response_model=TripPlanResponse)
async def create_trip(request: TripPlanRequest):
    plan = await SupervisorAgent.orchestrate_plan(request)
    _TRIP_STORE[plan.tripId] = plan
    _persist_trip_to_db(plan)
    return plan

@router.post("/plan", response_model=TripPlanResponse)
async def plan_trip(request: TripPlanRequest):
    try:
        plan = await SupervisorAgent.orchestrate_plan(request)
        _TRIP_STORE[plan.tripId] = plan
        _persist_trip_to_db(plan)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Trip Planning orchestration error: {str(e)}")

@router.get("/{trip_id}", response_model=TripPlanResponse)
async def get_trip(trip_id: str):
    if trip_id in _TRIP_STORE:
        return _TRIP_STORE[trip_id]
    raise HTTPException(status_code=404, detail="Trip not found")

@router.post("/{trip_id}/replan", response_model=TripReplanResponse)
async def replan_specific_trip(trip_id: str, request: TripReplanRequest):
    try:
        request.tripId = trip_id
        replan = await SupervisorAgent.replan_trip(request)
        return replan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Dynamic Replanning error: {str(e)}")

@router.post("/replan", response_model=TripReplanResponse)
async def replan_trip(request: TripReplanRequest):
    try:
        replan = await SupervisorAgent.replan_trip(request)
        return replan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Dynamic Replanning error: {str(e)}")

@router.get("/{trip_id}/events", response_model=List[AgentTelemetryEvent])
async def get_trip_events(trip_id: str):
    if trip_id in _TRIP_STORE:
        return _TRIP_STORE[trip_id].agentEvents
    raise HTTPException(status_code=404, detail="Trip not found")
