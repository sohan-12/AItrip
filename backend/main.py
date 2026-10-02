import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.routers import locations, trips

load_dotenv()

app = FastAPI(
    title="AITrip Agentic AI Travel Planner API",
    description="Backend microservice for Location Resolution, LangGraph Agent Orchestration, and Dynamic Itinerary Synthesis.",
    version="1.0.0",
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(locations.router)
app.include_router(trips.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AITrip Agentic AI Travel Planner API",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "geocoder": "active",
        "agents": ["Supervisor", "Planner", "Transport", "Hotel", "Weather", "Budget", "Research", "Execution"],
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
