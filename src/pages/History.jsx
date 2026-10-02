import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tripService } from '../services/index.js';
import { Map, Clock, ArrowRight, Compass, Sparkles } from 'lucide-react';

export function HistoryPage() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    tripService.getAllTrips().then(setTrips);
  }, []);

  return (
    <div className="min-h-screen bg-space-950 font-sans py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="text-xs font-bold tracking-[0.25em] text-cyan-400 uppercase font-mono mb-2 flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>EXPEDITION LOGBOOK</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-sans mb-3">
            YOUR SAVED TRIPS & ITINERARIES
          </h1>
          <p className="text-slate-300 text-sm">
            All active, generated, and completed multi-agent journeys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              className="usa-card group block relative rounded-3xl overflow-hidden border border-white/10 bg-space-900 shadow-2xl"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <img
                  src={trip.coverImage}
                  alt={trip.title}
                  className="usa-card-img w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-space-950 via-space-950/40 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-space-950/80 backdrop-blur-md text-cyan-300 border border-cyan-500/30">
                    {trip.status}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-3">
                <div className="text-xs font-mono text-cyan-400 font-bold uppercase">
                  {trip.destinationName} • {trip.tripStyle}
                </div>
                <h3 className="usa-card-title text-xl font-black text-white uppercase tracking-tight font-sans leading-tight">
                  {trip.title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-sans">
                  {trip.summary}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs font-mono">
                  <div className="text-slate-400">
                    {trip.durationDays} Days • ₹{trip.budget?.total?.toLocaleString()}
                  </div>
                  <div className="text-cyan-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>VIEW DASHBOARD</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
