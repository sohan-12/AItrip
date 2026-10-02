from fastapi import APIRouter, HTTPException
from typing import Dict
from backend.models.location import TripPlanRequest, TripPlanResponse, TripReplanRequest, TripReplanResponse
from backend.agents.supervisor import SupervisorAgent

router = APIRouter(prefix="/api/trips", tags=["trips"])

# In-memory trip store
_TRIP_STORE: Dict[str, TripPlanResponse] = {}

@router.post("/plan", response_model=TripPlanResponse)
async def plan_trip(request: TripPlanRequest):
    try:
        plan = await SupervisorAgent.orchestrate_plan(request)
        _TRIP_STORE[plan.tripId] = plan
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Trip Planning orchestration error: {str(e)}")

@router.post("/replan", response_model=TripReplanResponse)
async def replan_trip(request: TripReplanRequest):
    try:
        replan = await SupervisorAgent.replan_trip(request)
        return replan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Dynamic Replanning error: {str(e)}")

@router.get("/{trip_id}", response_model=TripPlanResponse)
async def get_trip(trip_id: str):
    if trip_id in _TRIP_STORE:
        return _TRIP_STORE[trip_id]
    raise HTTPException(status_code=404, detail="Trip not found")
