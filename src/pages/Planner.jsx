import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Calendar,
  DollarSign,
  Users,
  Sliders,
  Shield,
  MessageSquare,
  CheckCircle,
  MapPin,
  Navigation,
  Globe,
} from 'lucide-react';
import { resolveLocation } from '../services/locationResolverService.js';

export function PlannerPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedDestItem = location.state?.destinationItem;
  const initialDestQuery = searchParams.get('destination') || (passedDestItem ? passedDestItem.name : 'Bengaluru');

  const [origin, setOrigin] = useState(searchParams.get('origin') || 'Hyderabad');
  const [destinationInput, setDestinationInput] = useState(
    passedDestItem
      ? `${passedDestItem.name}${passedDestItem.country ? ', ' + passedDestItem.country : ''}`
      : initialDestQuery
  );
  const [resolvedDest, setResolvedDest] = useState(passedDestItem || null);
  const [isResolving, setIsResolving] = useState(false);

  const [days, setDays] = useState(4);
  const [travelers, setTravelers] = useState(2);
  const [budgetTier, setBudgetTier] = useState('Comfort (Curated Boutique)');
  const [travelStyle, setTravelStyle] = useState('Bespoke Cultural & Scenic Discovery');
  const [pace, setPace] = useState('Moderate (Balanced Exploration)');
  const [userPrompt, setUserPrompt] = useState(
    `Plan a memorable journey to ${initialDestQuery} with scenic highlights, cultural landmarks, authentic regional cuisine, and verified boutique stays.`
  );

  // Suggestion blueprint chips
  const suggestionChips = [
    { title: 'Bengaluru Garden City & Craft Breweries', dest: 'Bengaluru, India' },
    { title: 'Munnar Misty Hills & Tea Plantations', dest: 'Munnar, India' },
    { title: 'Tawang Himalayan Passes & Monasteries', dest: 'Tawang, India' },
    { title: 'Paris Haute Gastronomy & Seine Promenade', dest: 'Paris, France' },
    { title: 'Hallstatt Fairytale Alpine Lake Walk', dest: 'Hallstatt, Austria' },
    { title: 'Mount Everest High Altitude Base Camp', dest: 'Mount Everest, Nepal' },
  ];

  // Resolve location coordinates dynamically if not already provided
  useEffect(() => {
    if (passedDestItem) {
      setResolvedDest(passedDestItem);
      return;
    }

    let isMounted = true;
    setIsResolving(true);
    resolveLocation(initialDestQuery)
      .then((res) => {
        if (isMounted) {
          if (res) {
            setResolvedDest(res);
            setUserPrompt(
              `Plan an immersive ${days}-day trip to ${res.name}, ${res.country} focusing on scenic viewpoints, authentic local dining, and boutique accommodation.`
            );
          }
          setIsResolving(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsResolving(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialDestQuery]);

  const handleDestinationBlur = async () => {
    if (!destinationInput.trim()) return;
    setIsResolving(true);
    try {
      const res = await resolveLocation(destinationInput.trim());
      if (res) {
        setResolvedDest(res);
      }
    } catch (e) {
      console.warn('Location resolution warning:', e);
    } finally {
      setIsResolving(false);
    }
  };

  const handleApplyChip = (chip) => {
    setDestinationInput(chip.dest);
    setUserPrompt(`Plan a curated ${days}-day trip focusing on ${chip.title}.`);
    setIsResolving(true);
    resolveLocation(chip.dest)
      .then((res) => {
        if (res) setResolvedDest(res);
        setIsResolving(false);
      })
      .catch(() => setIsResolving(false));
  };

  const handleLaunchOrchestration = (e) => {
    e.preventDefault();

    const destName = resolvedDest ? resolvedDest.name : destinationInput.split(',')[0].trim();
    const destCountry = resolvedDest ? resolvedDest.country : (destinationInput.split(',')[1]?.trim() || 'Global');
    const lat = Number(resolvedDest?.latitude ?? resolvedDest?.lat) || 20.0;
    const lng = Number(resolvedDest?.longitude ?? resolvedDest?.lng) || 78.0;

    navigate('/generate', {
      state: {
        origin,
        destination: {
          name: destName,
          country: destCountry,
          region: resolvedDest?.region,
          latitude: lat,
          longitude: lng,
          type: resolvedDest?.type || 'city',
          image: resolvedDest?.image,
          shortDescription: resolvedDest?.shortDescription || resolvedDest?.description,
        },
        days,
        travelers,
        budgetTier,
        travelStyle,
        pace,
        userPrompt,
      },
    });
  };

  return (
    <div className="min-h-screen bg-space-950 font-sans py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Planner Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-[0.25em] uppercase font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>LANGGRAPH MULTI-AGENT CO-PILOT</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-sans mb-3">
            ORCHESTRATE YOUR JOURNEY
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            Choose ANY destination on Earth. 10 specialized LangGraph AI agents will coordinate research, live meteorological telemetry, transit corridors, boutique stays, budget calibration, and dynamic replanning.
          </p>
        </div>

        {/* Suggestion Prompt Chips */}
        <div className="mb-8">
          <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase mb-2.5 text-center">
            WORLDWIDE DESTINATION BLUEPRINTS
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestionChips.map((chip) => (
              <button
                key={chip.title}
                type="button"
                onClick={() => handleApplyChip(chip)}
                className="text-xs font-semibold px-4 py-2 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/40 border border-white/10 text-slate-300 hover:text-cyan-300 transition-all text-left cursor-pointer"
              >
                ✦ {chip.title}
              </button>
            ))}
          </div>
        </div>

        {/* AI Planning Form Container */}
        <form
          onSubmit={handleLaunchOrchestration}
          className="p-6 sm:p-10 rounded-3xl bg-space-900/80 border border-white/15 backdrop-blur-xl shadow-2xl space-y-8"
        >
          {/* Main Conversational Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>DESCRIBE YOUR IDEAL TRIP VISION</span>
            </label>
            <textarea
              rows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. Plan a 4-day road trip with sunset forts, open-top Thar car rental, authentic seafood shacks, and boutique colonial stays..."
              className="w-full bg-space-950/80 border border-white/15 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans shadow-inner leading-relaxed"
              required
            />
          </div>

          {/* Grid of Key Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Origin */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>DEPARTURE ORIGIN</span>
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Hyderabad, Mumbai, Delhi, London..."
                className="w-full bg-space-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-sans focus:outline-none focus:border-cyan-400"
                required
              />
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PRIMARY DESTINATION (ANY PLACE ON EARTH)</span>
                </span>
                {isResolving && <span className="text-cyan-400 text-[10px] animate-pulse">Resolving GIS...</span>}
              </label>
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onBlur={handleDestinationBlur}
                placeholder="e.g. Bangalore, Munnar, Tawang, Paris, Hallstatt, Mount Everest..."
                className="w-full bg-space-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-sans focus:outline-none focus:border-cyan-400"
                required
              />

              {/* Geographic Verification Badge */}
              {resolvedDest && (
                <div className="pt-1 flex items-center gap-2 text-[10px] font-mono text-cyan-300">
                  <Navigation className="w-3 h-3 text-cyan-400" />
                  <span>
                    Verified GIS: {resolvedDest.name}, {resolvedDest.country} (
                    {Number(resolvedDest.latitude || resolvedDest.lat || 0).toFixed(2)}°N,{' '}
                    {Number(resolvedDest.longitude || resolvedDest.lng || 0).toFixed(2)}°E)
                  </span>
                </div>
              )}
            </div>

            {/* Duration Days */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>DURATION (DAYS)</span>
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full bg-space-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-sans focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value={3}>3 Days (Long Weekend Escape)</option>
                <option value={4}>4 Days (Recommended Golden Ratio)</option>
                <option value={5}>5 Days (In-Depth Road Trip)</option>
                <option value={7}>7 Days (Full Grand Tour)</option>
                <option value={10}>10 Days (Comprehensive Regional Expedition)</option>
              </select>
            </div>

            {/* Travelers */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>TRAVELERS</span>
              </label>
              <select
                value={travelers}
                onChange={(e) => setTravelers(Number(e.target.value))}
                className="w-full bg-space-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-sans focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value={1}>1 Solo Explorer</option>
                <option value={2}>2 Couple / Travel Partners</option>
                <option value={4}>4 Family / Small Group</option>
                <option value={6}>6 Friends Expedition</option>
              </select>
            </div>

            {/* Budget Tier */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                <span>BUDGET TIER</span>
              </label>
              <select
                value={budgetTier}
                onChange={(e) => setBudgetTier(e.target.value)}
                className="w-full bg-space-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-sans focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="Comfort (Curated Boutique)">Comfort Boutique (₹8,000 - ₹14,000 / day)</option>
                <option value="Backpacker / Value">Value Explorer (₹3,000 - ₹6,000 / day)</option>
                <option value="Ultra Luxury Heritage">Ultra Luxury (₹22,000+ / day)</option>
              </select>
            </div>

            {/* Travel Pace */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>TRAVEL PACE & DENSITY</span>
              </label>
              <select
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                className="w-full bg-space-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-sans focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="Moderate (Balanced Exploration)">Moderate (Balanced Exploration & Relaxation)</option>
                <option value="Slow & Relaxed">Slow Pace (Max 2 signature experiences / day)</option>
                <option value="Intense / Action-Packed">High Energy (Early Sunrise to Late Night)</option>
              </select>
            </div>
          </div>

          {/* Agent Capability Guarantee Notice */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-center gap-3 text-xs text-slate-300">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Real-time multi-agent execution: Weather Agent fetches live telemetry from Open-Meteo, Transport Agent calculates geodesic corridors, and Conflict Detector calibrates buffer zones.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-black tracking-widest uppercase transition-all shadow-glow-cyan hover:scale-[1.01] flex items-center justify-center gap-3 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>LAUNCH 10-AGENT MULTI-AGENT ORCHESTRATION</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
