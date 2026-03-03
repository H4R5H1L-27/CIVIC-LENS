"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Radio, Filter } from "lucide-react"
import { ReportCard, type ReportData } from "@/components/report-card"
import type { Severity } from "@/components/severity-badge"
import { getApiBaseUrl } from "@/lib/api-config"

// load map only on client
const LiveMap = dynamic(() => import('@/components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-gray-900 animate-pulse border-4 border-gray-700 flex items-center justify-center font-mono text-crisis-red">
      INITIALIZING GOD VIEW SATELLITE...
    </div>
  ),
})


type FilterType = "all" | "critical" | "warning" | "info"

export function LiveFeed() {
  const [filter, setFilter] = useState<FilterType>("all")
  const [liveReports, setLiveReports] = useState<ReportData[]>([])
  const [reportCount, setReportCount] = useState(0)
  // commander dashboard state
  const [rescuePlan, setRescuePlan] = useState<any | null>(null)
  const [isPlanning, setIsPlanning] = useState(false)

  // simulation state
  const [simulation, setSimulation] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("Heavy Rainfall (220mm) + Dam Release");

  // rumor debunker state
  const [rumorText, setRumorText] = useState("");
  const [debunkerResult, setDebunkerResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // dispatch state
  const [dispatchStatus, setDispatchStatus] = useState<{ [id: string]: 'dispatching' | 'done' | 'error' }>({});
  const [webhookLogs, setWebhookLogs] = useState<{ [id: string]: any }>({});

  // human override state
  const [humanOverrides, setHumanOverrides] = useState<{ [id: string]: boolean }>({});

  // fetch reports from backend on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/reports`)
        const data = await res.json()
        // convert backend report objects into the shape expected by ReportCard
        const normalized: ReportData[] = data.reports.map((r: any) => {
          // severity from assessment may be capitalized; normalize to lowercase
          // map any reported severity into the small set our UI understands
          const raw = (r.assessment?.severity || "").toLowerCase()
          let sev: Severity = "info"
          if (raw === "critical" || raw === "high") sev = "critical"
          else if (raw === "warning" || raw === "medium") sev = "warning"
          else sev = "info"

          return {
            id: r.id,
            severity: sev,
            summary: r.assessment?.summary || "",
            location: r.location || "",
            timestamp: r.assessment?.timestamp || "",
            imageUrl: r.image_url,
            imageAlt: r.hazardType || "",
            audioUrl: r.audio_url,
            lat: r.lat,
            lng: r.lng,
            assessment: r.assessment
          }
        })
        setLiveReports(normalized)
        setReportCount(normalized.length)
      } catch (error) {
        console.error("Failed to fetch live feed:", error)
      }
    }

    fetchReports()
    // optional polling every 5s:
    // const interval = setInterval(fetchReports, 5000)
    // return () => clearInterval(interval)
  }, [])

  const filteredReports =
    filter === "all"
      ? liveReports
      : liveReports.filter((r) => r.severity === filter)

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "ALL" },
    { key: "critical", label: "CRITICAL" },
    { key: "warning", label: "WARNING" },
    { key: "info", label: "INFO" },
  ]

  // base URL for backend; using window.hostname lets phone access via network IP
  const BASE_URL = getApiBaseUrl();

  const handleGeneratePlan = async () => {
    if (liveReports.length === 0) {
      alert("COMMANDER ERROR: No active crisis data on the map to analyze.");
      return;
    }
    setIsPlanning(true);
    try {
      const res = await fetch(`${BASE_URL}/api/rescue-plan`);
      const data = await res.json();
      if (data.status === "success") {
        setRescuePlan(data.tactical_plan);
      } else {
        console.error("Commander API Error:", data.message);
      }
    } catch (error) {
      console.error("Failed to generate rescue plan:", error);
    } finally {
      setIsPlanning(false);
    }
  }

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const formData = new FormData();
      formData.append("scenario", selectedScenario);

      const res = await fetch(`${BASE_URL}/api/simulate`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status === "success") {
        setSimulation(data.simulation);
      }
    } catch (error) {
      console.error("Simulation failed:", error);
    } finally {
      setIsSimulating(false);
    }
  }

  const handleVerifyRumor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rumorText.trim()) return;

    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append("rumor_text", rumorText);

      const res = await fetch(`${BASE_URL}/api/verify-rumor`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.status === "success") {
        setDebunkerResult(data.verification);
      }
    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setIsVerifying(false);
    }
  }

  const handleDispatchBroadcast = async (reportId: string, location: string) => {
    setDispatchStatus(prev => ({ ...prev, [reportId]: 'dispatching' }));
    try {
      const formData = new FormData();
      formData.append("report_id", reportId);
      formData.append("target_zone", location);

      const res = await fetch(`${BASE_URL}/api/dispatch-broadcast`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status === "success") {
        setWebhookLogs(prev => ({ ...prev, [reportId]: data.receipt }));
        setDispatchStatus(prev => ({ ...prev, [reportId]: 'done' }));
      }
    } catch (error) {
      console.error("Dispatch failed:", error);
      setDispatchStatus(prev => ({ ...prev, [reportId]: 'error' }));
    }
  }

  const handleOverride = (reportId: string) => {
    setHumanOverrides(prev => ({ ...prev, [reportId]: true }));
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Feed Header */}
      <div className="border-b-2 border-foreground bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
              LIVE COMM-LINK
            </h2>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              INCOMING FIELD REPORTS
            </p>
          </div>
          <div className="flex items-center gap-2 border-2 border-crisis-red px-3 py-1.5">
            <Radio className="h-3 w-3 text-crisis-red animate-crisis-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase text-crisis-red">
              {reportCount} ACTIVE
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-3 flex items-center gap-0 border-2 border-foreground">
          <div className="flex h-9 shrink-0 items-center border-r-2 border-foreground bg-secondary px-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${filter === f.key
                ? f.key === "critical"
                  ? "bg-crisis-red text-foreground"
                  : f.key === "warning"
                    ? "bg-crisis-yellow text-background"
                    : "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- AI RESCUE COMMANDER DASHBOARD --- */}
      <div className="mb-8 border-4 border-gray-700 bg-black p-6 font-mono text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-gray-700 pb-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
              <span className="animate-pulse h-3 w-3 bg-blue-500 rounded-full"></span>
              AI Commander Module
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Global Data Fusion & Resource Allocation
            </p>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={isPlanning || liveReports.length === 0}
            className={`px-6 py-3 font-bold uppercase tracking-wider transition-all border-2 ${isPlanning
              ? "border-blue-500 bg-blue-500/20 text-blue-300 animate-pulse"
              : liveReports.length === 0
                ? "border-gray-600 text-gray-600 cursor-not-allowed"
                : "border-blue-500 bg-blue-500 text-black hover:bg-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              }`}
          >
            {isPlanning ? "SYNTHESIZING STRATEGY..." : "GENERATE TACTICAL PLAN"}
          </button>

        </div>

        {/* COMMANDER RESULTS */}
        {rescuePlan && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-4">
              <span className="bg-red-600 text-white px-3 py-1 text-sm font-bold uppercase tracking-widest">
                {rescuePlan.crisis_level}
              </span>
              <span className="text-gray-400 text-sm">STRATEGY LOCK CONFIRMED</span>
            </div>

            <div className="bg-gray-900 p-4 border-l-4 border-blue-500">
              <h3 className="text-blue-400 text-xs uppercase tracking-widest mb-2">Global Situation Summary</h3>
              <p className="text-lg leading-relaxed">{rescuePlan.global_summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 border-l-4 border-crisis-red">
                <h3 className="text-crisis-red text-xs uppercase tracking-widest mb-2">Priority Extraction Zones</h3>
                <p className="text-md whitespace-pre-wrap leading-relaxed">{rescuePlan.priority_zones}</p>
              </div>

              <div className="bg-gray-900 p-4 border-l-4 border-yellow-500">
                <h3 className="text-yellow-500 text-xs uppercase tracking-widest mb-2">Resource Allocation</h3>
                <p className="text-md leading-relaxed">{rescuePlan.resource_allocation}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- DIGITAL TWIN SIMULATION ENGINE --- */}
      <div className="mb-8 border-4 border-purple-900 bg-black p-6 font-mono text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]">
        <h2 className="text-xl font-black uppercase tracking-widest text-purple-400 flex items-center gap-2 mb-4">
          <span className="text-2xl">🌍</span> Digital Twin Simulation Engine
        </h2>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="flex-1 bg-gray-900 border-2 border-purple-500 p-3 text-white focus:outline-none"
          >
            <option value="Heavy Rainfall (220mm) + Dam Release">Scenario A: Heavy Rainfall + Dam Release</option>
            <option value="Category 4 Cyclone + Storm Surge">Scenario B: Category 4 Cyclone + Storm Surge</option>
            <option value="Flash Flood + Bridge Collapse">Scenario C: Flash Flood + Infrastructure Failure</option>
          </select>

          <button
            onClick={handleRunSimulation}
            disabled={isSimulating || liveReports.length === 0}
            className={`px-6 py-3 font-bold uppercase tracking-wider transition-all border-2 ${isSimulating
              ? "border-purple-500 bg-purple-500/20 text-purple-300 animate-pulse"
              : liveReports.length === 0
                ? "border-gray-600 text-gray-600 cursor-not-allowed"
                : "border-purple-500 bg-black text-purple-400 hover:bg-purple-900/50"
              }`}
          >
            {isSimulating ? "RUNNING HYDROLOGICAL MODEL..." : "EXECUTE SIMULATION"}
          </button>
        </div>

        {/* SIMULATION OUTPUT TABLE */}
        {simulation && (
          <div className="mt-4 border-t-2 border-purple-500 pt-4">
            <div className="bg-purple-900/30 p-4 border-l-4 border-purple-500 mb-4">
              <span className="text-purple-300 text-xs block mb-1 font-bold">EXPLAINABLE AI OUTPUT</span>
              <p className="text-sm leading-relaxed">{simulation.explainable_output}</p>
            </div>

            <table className="w-full text-left border-collapse border border-gray-700">
              <thead>
                <tr className="bg-gray-800 text-purple-400 text-xs uppercase tracking-widest">
                  <th className="border border-gray-700 p-2">Predicted Metric</th>
                  <th className="border border-gray-700 p-2 text-right">Estimated Impact</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr>
                  <td className="border border-gray-700 p-2">Affected Wards</td>
                  <td className="border border-gray-700 p-2 text-right text-crisis-red font-bold">{simulation.metrics?.affected_wards}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 p-2">Population at Risk</td>
                  <td className="border border-gray-700 p-2 text-right text-orange-400 font-bold">{simulation.metrics?.population_at_risk?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 p-2">Roads Submerged</td>
                  <td className="border border-gray-700 p-2 text-right">{simulation.metrics?.roads_submerged_km} km</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 p-2">Hospitals at Risk</td>
                  <td className="border border-gray-700 p-2 text-right text-red-400 font-bold">{simulation.metrics?.hospitals_at_risk}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 p-2">Required Rescue Boats</td>
                  <td className="border border-gray-700 p-2 text-right text-blue-400 font-bold">{simulation.metrics?.required_rescue_boats}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 p-2">Required Medical Teams</td>
                  <td className="border border-gray-700 p-2 text-right text-green-400 font-bold">{simulation.metrics?.required_medical_teams}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 p-2 text-gray-400">Est. Evacuation Time</td>
                  <td className="border border-gray-700 p-2 text-right text-gray-400">{simulation.metrics?.estimated_evacuation_hours} hours</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- AI RUMOR DEBUNKER MODULE --- */}
      <div className="mb-8 border-4 border-gray-700 bg-black p-6 font-mono text-white shadow-2xl">
        <h2 className="text-xl font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2 mb-4">
          <span className="text-2xl">👁️</span> Signal Verification (Anti-Panic)
        </h2>

        <form onSubmit={handleVerifyRumor} className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            value={rumorText}
            onChange={(e) => setRumorText(e.target.value)}
            placeholder="Paste unverified WhatsApp forward here..."
            className="flex-1 bg-gray-900 border-2 border-gray-700 p-3 text-white focus:border-yellow-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isVerifying || !rumorText}
            className={`px-6 py-3 font-bold uppercase tracking-wider transition-all border-2 ${isVerifying
              ? "border-yellow-500 bg-yellow-500/20 text-yellow-300 animate-pulse"
              : !rumorText
                ? "border-gray-600 text-gray-600 cursor-not-allowed"
                : "border-yellow-500 bg-black text-yellow-500 hover:bg-yellow-900/50"
              }`}
          >
            {isVerifying ? "CROSS-REFERENCING..." : "VERIFY INTEL"}
          </button>
        </form>

        {/* DEBUNKER RESULTS */}
        {debunkerResult && (
          <div className={`p-4 border-l-8 ${debunkerResult.status === 'DEBUNKED' ? 'border-crisis-red bg-red-900/20' :
            debunkerResult.status === 'CONFIRMED' ? 'border-green-500 bg-green-900/20' :
              'border-gray-500 bg-gray-800'
            }`}>
            <div className="flex items-center gap-4 mb-3">
              <span className={`px-3 py-1 text-sm font-black uppercase tracking-widest text-black ${debunkerResult.status === 'DEBUNKED' ? 'bg-crisis-red text-white' :
                debunkerResult.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-gray-400'
                }`}>
                {debunkerResult.status}
              </span>
              <span className="text-gray-400 text-sm">CONFIDENCE: {debunkerResult.confidence}</span>
            </div>

            <p className="text-md mb-2"><strong className="text-gray-400">AI Reasoning:</strong> {debunkerResult.reasoning}</p>

            <div className="mt-4 bg-black p-3 border-2 border-gray-700">
              <span className="block text-xs text-blue-400 font-bold mb-1 uppercase tracking-widest">Suggested Public Broadcast</span>
              <p className="text-sm">{debunkerResult.public_statement}</p>
            </div>
          </div>
        )}
      </div>

      {/* God‑View Map */}
      <LiveMap reports={liveReports} />

      {/* Reports Feed */}
      <div className="flex flex-col gap-3 p-4">
        {filteredReports.length === 0 ? (
          <div className="border-2 border-dashed border-border p-8 text-center">
            <p className="font-mono text-sm uppercase text-muted-foreground">
              NO REPORTS MATCHING FILTER
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDispatch={handleDispatchBroadcast}
              dispatchStatus={dispatchStatus[report.id]}
              webhookLog={webhookLogs[report.id]}
              humanOverride={!!humanOverrides[report.id]}
              onOverride={handleOverride}
            />
          ))
        )}
      </div>
    </div>
  )
}
