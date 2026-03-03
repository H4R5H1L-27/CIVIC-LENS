"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Radio, Filter, ShieldAlert, Activity, Map, BarChart3, Zap, Brain, Layers, Shield, Eye, Cpu, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react"
import { ReportCard, type ReportData } from "@/components/report-card"
import type { Severity } from "@/components/severity-badge"
import { getApiBaseUrl } from "@/lib/api-config"

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[500px] w-full bg-gray-900 animate-pulse border-4 border-gray-700 flex items-center justify-center font-mono text-crisis-red">
            INITIALIZING GOD VIEW SATELLITE...
        </div>
    ),
})

type FilterType = "all" | "critical" | "warning" | "info"
type DashboardTab = "overview" | "simulation" | "reports" | "aura" | "analytics"

// Safe string converter for Gemini responses (sometimes returns objects instead of strings)
const toStr = (val: any): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object") return Object.values(val).filter(Boolean).join(" — ");
    return String(val);
}

export default function GovernmentDashboard() {
    const [activeTab, setActiveTab] = useState<DashboardTab>("overview")
    const [filter, setFilter] = useState<FilterType>("all")
    const [liveReports, setLiveReports] = useState<ReportData[]>([])
    const [reportCount, setReportCount] = useState(0)

    // commander
    const [rescuePlan, setRescuePlan] = useState<any | null>(null)
    const [isPlanning, setIsPlanning] = useState(false)

    // simulation — India-specific parameters
    const [simulation, setSimulation] = useState<any | null>(null)
    const [simCity, setSimCity] = useState<string | null>(null)
    const [simScenarioDesc, setSimScenarioDesc] = useState<string | null>(null)
    const [isSimulating, setIsSimulating] = useState(false)
    const [selectedCity, setSelectedCity] = useState("Pune")
    const [disasterType, setDisasterType] = useState("Flood")
    const [rainfallMm, setRainfallMm] = useState(220)
    const [damRelease, setDamRelease] = useState(true)
    const [riverLevelDelta, setRiverLevelDelta] = useState(3)
    const [timeHorizon, setTimeHorizon] = useState(24)

    // dispatch
    const [dispatchStatus, setDispatchStatus] = useState<{ [id: string]: 'dispatching' | 'done' | 'error' }>({})
    const [webhookLogs, setWebhookLogs] = useState<{ [id: string]: any }>({})
    const [humanOverrides, setHumanOverrides] = useState<{ [id: string]: boolean }>({})

    // AURA live data
    const [earlyWarnings, setEarlyWarnings] = useState<any[]>([])
    const [healthcareData, setHealthcareData] = useState<any>(null)
    const [supplyData, setSupplyData] = useState<any>(null)

    // Weather + Analytics + Live APIs
    const [weatherData, setWeatherData] = useState<any>(null)
    const [analyticsData, setAnalyticsData] = useState<any>(null)
    const [reportStatuses, setReportStatuses] = useState<{ [id: string]: string }>({})
    const [seismicData, setSeismicData] = useState<any>(null)
    const [aqiData, setAqiData] = useState<any>(null)

    const BASE_URL = getApiBaseUrl();

    // fetch reports
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await fetch(`${BASE_URL}/api/reports`)
                const data = await res.json()
                const normalized: ReportData[] = data.reports.map((r: any) => {
                    const raw = (r.assessment?.severity || "").toLowerCase()
                    let sev: Severity = "info"
                    if (raw === "critical" || raw === "high") sev = "critical"
                    else if (raw === "warning" || raw === "medium") sev = "warning"
                    else sev = "info"
                    return {
                        id: r.id, severity: sev,
                        summary: r.assessment?.summary || "",
                        location: r.location || "",
                        timestamp: r.assessment?.timestamp || "",
                        imageUrl: r.image_url, imageAlt: r.hazardType || "",
                        audioUrl: r.audio_url,
                        lat: r.lat, lng: r.lng,
                        assessment: r.assessment,
                        status: r.status || "NEW",
                        crowd_verified: r.crowd_verified || false,
                        crowd_count: r.crowd_count || 1,
                    }
                })
                setLiveReports(normalized)
                setReportCount(normalized.length)
            } catch (error) {
                console.error("Failed to fetch live feed:", error)
            }
        }
        fetchReports()
        const interval = setInterval(fetchReports, 8000)
        return () => clearInterval(interval)
    }, [])

    // Fetch AURA subsystem data
    useEffect(() => {
        const fetchAuraData = async () => {
            try {
                const [ewRes, hcRes, supRes] = await Promise.all([
                    fetch(`${BASE_URL}/api/early-warning`),
                    fetch(`${BASE_URL}/api/healthcare-forecast`),
                    fetch(`${BASE_URL}/api/supply-status`),
                ])
                const ewData = await ewRes.json()
                const hcData = await hcRes.json()
                const supData = await supRes.json()
                setEarlyWarnings(ewData.warnings || [])
                setHealthcareData(hcData)
                setSupplyData(supData)
            } catch (err) { console.error("AURA fetch failed:", err) }
        }
        fetchAuraData()
        const interval = setInterval(fetchAuraData, 10000)
        return () => clearInterval(interval)
    }, [])

    // Fetch weather + analytics + seismic + AQI
    useEffect(() => {
        const fetchExtra = async () => {
            try {
                const [wRes, aRes, sRes, aqRes] = await Promise.all([
                    fetch(`${BASE_URL}/api/weather/Pune`),
                    fetch(`${BASE_URL}/api/analytics`),
                    fetch(`${BASE_URL}/api/seismic`),
                    fetch(`${BASE_URL}/api/air-quality/Pune`),
                ])
                if (wRes.ok) setWeatherData(await wRes.json())
                if (aRes.ok) setAnalyticsData(await aRes.json())
                if (sRes.ok) setSeismicData(await sRes.json())
                if (aqRes.ok) setAqiData(await aqRes.json())
            } catch (err) { console.error("Extra fetch failed:", err) }
        }
        fetchExtra()
        const interval = setInterval(fetchExtra, 15000)
        return () => clearInterval(interval)
    }, [])

    const filteredReports = filter === "all" ? liveReports : liveReports.filter((r) => r.severity === filter)

    const filters: { key: FilterType; label: string }[] = [
        { key: "all", label: "ALL" },
        { key: "critical", label: "CRITICAL" },
        { key: "warning", label: "WARNING" },
        { key: "info", label: "INFO" },
    ]

    // --- HANDLERS ---
    const handleGeneratePlan = async () => {
        if (liveReports.length === 0) { alert("No active crisis data."); return; }
        setIsPlanning(true)
        try {
            const res = await fetch(`${BASE_URL}/api/rescue-plan`)
            const data = await res.json()
            if (data.status === "success") setRescuePlan(data.tactical_plan)
        } catch (error) { console.error("Plan failed:", error) }
        finally { setIsPlanning(false) }
    }

    const handleRunSimulation = async () => {
        setIsSimulating(true)
        try {
            const formData = new FormData()
            formData.append("city", selectedCity)
            formData.append("disaster_type", disasterType)
            formData.append("rainfall_mm", String(rainfallMm))
            formData.append("dam_release", damRelease ? "yes" : "no")
            formData.append("river_level_delta", String(riverLevelDelta))
            formData.append("time_horizon_hours", String(timeHorizon))
            const res = await fetch(`${BASE_URL}/api/simulate`, { method: "POST", body: formData })
            const data = await res.json()
            if (data.status === "success") {
                setSimulation(data.simulation)
                setSimCity(data.city)
                setSimScenarioDesc(data.scenario)
            }
        } catch (error) { console.error("Simulation failed:", error) }
        finally { setIsSimulating(false) }
    }

    const handleDispatchBroadcast = async (reportId: string, location: string) => {
        setDispatchStatus(prev => ({ ...prev, [reportId]: 'dispatching' }))
        try {
            const formData = new FormData()
            formData.append("report_id", reportId)
            formData.append("target_zone", location)
            const res = await fetch(`${BASE_URL}/api/dispatch-broadcast`, { method: "POST", body: formData })
            const data = await res.json()
            if (data.status === "success") {
                setWebhookLogs(prev => ({ ...prev, [reportId]: data.receipt }))
                setDispatchStatus(prev => ({ ...prev, [reportId]: 'done' }))
            }
        } catch (error) {
            console.error("Dispatch failed:", error)
            setDispatchStatus(prev => ({ ...prev, [reportId]: 'error' }))
        }
    }

    const handleOverride = (reportId: string) => {
        setHumanOverrides(prev => ({ ...prev, [reportId]: true }))
    }

    // Report Status Workflow
    const handleStatusUpdate = async (reportId: string, newStatus: string) => {
        try {
            const formData = new FormData()
            formData.append("report_id", reportId)
            formData.append("new_status", newStatus)
            const res = await fetch(`${BASE_URL}/api/update-report-status`, { method: "POST", body: formData })
            if (res.ok) {
                setReportStatuses(prev => ({ ...prev, [reportId]: newStatus }))
            }
        } catch (err) { console.error("Status update failed:", err) }
    }

    // Stats
    const criticalCount = liveReports.filter(r => r.severity === "critical").length
    const warningCount = liveReports.filter(r => r.severity === "warning").length

    const tabs: { key: DashboardTab; label: string; Icon: any }[] = [
        { key: "overview", label: "COMMAND CENTER", Icon: Activity },
        { key: "simulation", label: "PREDICTIVE ENGINE", Icon: BarChart3 },
        { key: "reports", label: "MANAGE REPORTS", Icon: Zap },
        { key: "aura", label: "AURA INTEL", Icon: Brain },
        { key: "analytics", label: "ANALYTICS", Icon: TrendingUp },
    ]

    return (
        <div className="min-h-dvh bg-black text-white font-mono">
            {/* TOP BAR */}
            <header className="border-b-2 border-gray-700 bg-gray-950 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center border-2 border-blue-500 bg-blue-500">
                            <ShieldAlert className="h-6 w-6 text-black" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-widest text-white">
                                CIVIC LENS — COMMAND DASHBOARD
                            </h1>
                            <p className="text-xs uppercase tracking-widest text-blue-400">
                                Government Crisis Management System
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* live stats */}
                        <div className="flex items-center gap-6 text-xs uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="text-red-400">{criticalCount} CRITICAL</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                                <span className="text-yellow-400">{warningCount} WARNING</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                                <span className="text-green-400">{reportCount} TOTAL</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Tabs */}
                <nav className="flex gap-0 mt-4 border-2 border-gray-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === tab.key
                                ? "bg-blue-500 text-black"
                                : "bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                        >
                            <tab.Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="p-6">
                {/* ====== OVERVIEW TAB ====== */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* SYSTEM STATUS BAR */}
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                            {[
                                { label: "PLATFORM", value: "ONLINE", color: "text-green-400 border-green-800", dot: "bg-green-500" },
                                { label: "GEMINI AI", value: "CONNECTED", color: "text-cyan-400 border-cyan-800", dot: "bg-cyan-500" },
                                { label: "THREAT LEVEL", value: criticalCount > 0 ? "ELEVATED" : "NORMAL", color: criticalCount > 0 ? "text-red-400 border-red-800" : "text-green-400 border-green-800", dot: criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-green-500" },
                                { label: "ACTIVE REPORTS", value: String(reportCount), color: reportCount > 0 ? "text-yellow-400 border-yellow-800" : "text-gray-400 border-gray-700", dot: reportCount > 0 ? "bg-yellow-500" : "bg-gray-600" },
                                { label: "IMD WEATHER", value: "FEED ACTIVE", color: "text-blue-400 border-blue-800", dot: "bg-blue-500" },
                                { label: "SENSOR GRID", value: "4 NODES", color: "text-purple-400 border-purple-800", dot: "bg-purple-500" },
                            ].map(s => (
                                <div key={s.label} className={`bg-gray-900 border-2 ${s.color.split(' ')[1]} p-3`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`h-2 w-2 rounded-full ${s.dot}`}></span>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest">{s.label}</span>
                                    </div>
                                    <p className={`text-sm font-black ${s.color.split(' ')[0]}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* LIVE WEATHER WIDGET */}
                        {weatherData && (
                            <div className="bg-gray-900 border-2 border-blue-800 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-[9px] text-gray-500 uppercase tracking-widest">LIVE WEATHER — {weatherData.city}</span>
                                            <p className="text-2xl font-black text-white">{weatherData.temp_c}°C</p>
                                        </div>
                                        <div className="h-10 w-px bg-gray-700"></div>
                                        <div className="grid grid-cols-5 gap-6">
                                            <div><span className="text-[9px] text-gray-500 block">WIND</span><span className="text-sm font-bold text-blue-400">{weatherData.wind_speed_kmh} km/h</span></div>
                                            <div><span className="text-[9px] text-gray-500 block">HUMIDITY</span><span className="text-sm font-bold text-cyan-400">{weatherData.humidity}%</span></div>
                                            <div><span className="text-[9px] text-gray-500 block">RAIN (1H)</span><span className="text-sm font-bold text-yellow-400">{weatherData.rain_1h_mm} mm</span></div>
                                            <div><span className="text-[9px] text-gray-500 block">CLOUDS</span><span className="text-sm font-bold text-gray-400">{weatherData.clouds_pct}%</span></div>
                                            <div><span className="text-[9px] text-gray-500 block">VISIBILITY</span><span className="text-sm font-bold text-green-400">{(weatherData.visibility_m / 1000).toFixed(1)} km</span></div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-blue-900 text-blue-300 text-[9px] px-2 py-1 font-bold uppercase">{weatherData.description}</span>
                                        <p className="text-[8px] text-gray-600 mt-1">{weatherData.source}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Map + Commander Side by Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* GOD VIEW MAP */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                    <Map className="h-4 w-4" /> GOD VIEW — LIVE SATELLITE
                                </h3>
                                <LiveMap reports={liveReports} />
                            </div>

                            {/* AI COMMANDER */}
                            <div className="border-4 border-gray-700 bg-gray-950 p-6">
                                <div className="flex items-center justify-between border-b-2 border-gray-700 pb-4 mb-4">
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                                            <span className="animate-pulse h-3 w-3 bg-blue-500 rounded-full"></span>
                                            AI Commander
                                        </h2>
                                        <p className="text-xs text-gray-400 mt-1">Data Fusion & Resource Allocation</p>
                                    </div>
                                    <button
                                        onClick={handleGeneratePlan}
                                        disabled={isPlanning || liveReports.length === 0}
                                        className={`px-5 py-2.5 font-bold uppercase tracking-wider transition-all border-2 text-xs ${isPlanning
                                            ? "border-blue-500 bg-blue-500/20 text-blue-300 animate-pulse"
                                            : liveReports.length === 0
                                                ? "border-gray-600 text-gray-600 cursor-not-allowed"
                                                : "border-blue-500 bg-blue-500 text-black hover:bg-blue-400"
                                            }`}
                                    >
                                        {isPlanning ? "SYNTHESIZING..." : "GENERATE PLAN"}
                                    </button>
                                </div>

                                {rescuePlan ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-widest">
                                                {rescuePlan.crisis_level}
                                            </span>
                                            <span className="text-gray-500 text-xs">STRATEGY LOCKED</span>
                                        </div>
                                        <div className="bg-gray-900 p-3 border-l-4 border-blue-500">
                                            <h3 className="text-blue-400 text-xs uppercase tracking-widest mb-1">Summary</h3>
                                            <p className="text-sm leading-relaxed">{rescuePlan.global_summary}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-900 p-3 border-l-4 border-crisis-red">
                                                <h3 className="text-crisis-red text-xs uppercase tracking-widest mb-1">Priority Zones</h3>
                                                <p className="text-xs whitespace-pre-wrap">{rescuePlan.priority_zones}</p>
                                            </div>
                                            <div className="bg-gray-900 p-3 border-l-4 border-yellow-500">
                                                <h3 className="text-yellow-500 text-xs uppercase tracking-widest mb-1">Resources</h3>
                                                <p className="text-xs">{rescuePlan.resource_allocation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-600">
                                        <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-xs uppercase tracking-widest">Awaiting crisis data — submit reports from the Citizen Portal</p>
                                        <p className="text-[10px] text-gray-700 mt-1">AI Commander analyzes incoming reports and generates a tactical response plan</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Reports Overview */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                                    LATEST INCIDENTS ({reportCount})
                                </h3>
                                {analyticsData && (
                                    <span className="text-[9px] text-green-400 font-bold uppercase">
                                        ✓ {analyticsData.crowd_verified_count || 0} CROWD-VERIFIED
                                    </span>
                                )}
                            </div>
                            {liveReports.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-700 p-8 text-center">
                                    <p className="text-gray-500 text-xs uppercase tracking-widest">No active incidents — system monitoring in progress</p>
                                    <p className="text-gray-600 text-[10px] mt-1">Reports submitted via the Citizen Portal will appear here in real-time</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {liveReports.slice(0, 6).map((report: any) => (
                                        <div key={report.id} className="relative">
                                            {/* Crowd-verified badge */}
                                            {report.crowd_verified && (
                                                <div className="absolute -top-2 -right-2 z-10 bg-green-600 text-white text-[8px] px-2 py-1 font-black uppercase tracking-wider border-2 border-green-400">
                                                    ✓ CROWD-VERIFIED ({report.crowd_count})
                                                </div>
                                            )}
                                            <ReportCard
                                                report={report}
                                                onDispatch={handleDispatchBroadcast}
                                                dispatchStatus={dispatchStatus[report.id]}
                                                webhookLog={webhookLogs[report.id]}
                                                humanOverride={!!humanOverrides[report.id]}
                                                onOverride={handleOverride}
                                            />
                                            {/* Status Workflow */}
                                            <div className="flex gap-1 mt-1">
                                                {["NEW", "VERIFIED", "DISPATCHED", "RESOLVED"].map(s => {
                                                    const current = reportStatuses[report.id] || report.status || "NEW"
                                                    const isActive = current === s
                                                    const colors: any = { NEW: "border-gray-600 text-gray-400", VERIFIED: "border-yellow-600 text-yellow-400", DISPATCHED: "border-blue-600 text-blue-400", RESOLVED: "border-green-600 text-green-400" }
                                                    return (
                                                        <button key={s} onClick={() => handleStatusUpdate(report.id, s)}
                                                            className={`flex-1 py-1 text-[8px] font-black uppercase tracking-wider border-2 transition-all ${isActive ? colors[s] + " bg-opacity-20 bg-gray-800" : "border-gray-800 text-gray-700 hover:text-gray-400"
                                                                }`}>{s}</button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ====== SIMULATION TAB ====== */}
                {activeTab === "simulation" && (
                    <div className="space-y-6">
                        <div className="border-4 border-purple-900 bg-gray-950 p-6 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-purple-400 flex items-center gap-2 mb-1">
                                <span className="text-3xl">⚡</span> Geospatial Risk Prediction Engine
                            </h2>
                            <p className="text-sm text-gray-400 mb-6">
                                AI-powered disaster impact modeling using hydrological data, terrain analysis, historical precedent, and real-time sensor feeds.
                            </p>

                            {/* SCENARIO INPUT PANEL */}
                            <div className="border-2 border-purple-800 bg-gray-900 p-5 mb-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-4">SCENARIO CONFIGURATION</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {/* City */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Target City</label>
                                        <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                                            className="w-full bg-black border-2 border-purple-600 p-2.5 text-white text-sm focus:outline-none">
                                            <option value="Pune">Pune</option>
                                            <option value="Mumbai">Mumbai</option>
                                            <option value="Chennai">Chennai</option>
                                            <option value="Kolkata">Kolkata</option>
                                            <option value="Delhi">Delhi</option>
                                            <option value="Bangalore">Bangalore</option>
                                            <option value="Hyderabad">Hyderabad</option>
                                            <option value="Ahmedabad">Ahmedabad</option>
                                        </select>
                                    </div>
                                    {/* Disaster Type */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Disaster Type</label>
                                        <select value={disasterType} onChange={e => setDisasterType(e.target.value)}
                                            className="w-full bg-black border-2 border-purple-600 p-2.5 text-white text-sm focus:outline-none">
                                            <option value="Flood">🌊 Flood</option>
                                            <option value="Earthquake">🏚️ Earthquake</option>
                                            <option value="Cyclone">🌀 Cyclone</option>
                                            <option value="Heatwave">🔥 Heatwave</option>
                                            <option value="Urban Fire">🏠 Urban Fire</option>
                                            <option value="Dam Breach">🚿 Dam Breach</option>
                                        </select>
                                    </div>
                                    {/* Rainfall */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Rainfall (mm/6h)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="range" min={50} max={500} step={10} value={rainfallMm}
                                                onChange={e => setRainfallMm(Number(e.target.value))}
                                                className="flex-1 accent-purple-500" />
                                            <span className="text-purple-400 font-bold text-sm w-12 text-right">{rainfallMm}</span>
                                        </div>
                                    </div>
                                    {/* Dam Release */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Dam Release</label>
                                        <button onClick={() => setDamRelease(!damRelease)}
                                            className={`w-full p-2.5 text-sm font-bold uppercase border-2 transition-colors ${damRelease ? "border-red-500 bg-red-500/20 text-red-400" : "border-gray-600 bg-black text-gray-500"
                                                }`}>
                                            {damRelease ? "YES — ACTIVE" : "NO"}
                                        </button>
                                    </div>
                                    {/* River Level */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">River Level +m</label>
                                        <div className="flex items-center gap-2">
                                            <input type="range" min={0} max={10} step={0.5} value={riverLevelDelta}
                                                onChange={e => setRiverLevelDelta(Number(e.target.value))}
                                                className="flex-1 accent-purple-500" />
                                            <span className="text-purple-400 font-bold text-sm w-10 text-right">+{riverLevelDelta}m</span>
                                        </div>
                                    </div>
                                    {/* Time */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Time Horizon</label>
                                        <select value={timeHorizon} onChange={e => setTimeHorizon(Number(e.target.value))}
                                            className="w-full bg-black border-2 border-purple-600 p-2.5 text-white text-sm focus:outline-none">
                                            <option value={6}>6 hours</option>
                                            <option value={12}>12 hours</option>
                                            <option value={24}>24 hours</option>
                                            <option value={48}>48 hours</option>
                                            <option value={72}>72 hours</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Execute button */}
                                <button onClick={handleRunSimulation} disabled={isSimulating}
                                    className={`w-full mt-5 px-6 py-4 font-bold uppercase tracking-wider transition-all border-2 text-sm ${isSimulating ? "border-purple-500 bg-purple-500/20 text-purple-300 animate-pulse"
                                        : "border-purple-500 bg-purple-600 text-white hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                                        }`}>
                                    {isSimulating ? `⏳ COMPUTING ${disasterType.toUpperCase()} RISK MODEL — ${selectedCity.toUpperCase()}...` : `⚡ RUN PREDICTION — ${selectedCity.toUpperCase()}`}
                                </button>
                            </div>

                            {/* RESULTS */}
                            {simulation ? (
                                <div className="border-t-2 border-purple-500 pt-6 space-y-6">
                                    {/* City + Scenario Banner */}
                                    <div className="flex items-center justify-between bg-purple-900/40 p-4 border border-purple-700">
                                        <div>
                                            <p className="text-xs text-purple-300 uppercase tracking-widest">TARGET</p>
                                            <p className="text-xl font-black text-white">{simCity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-purple-300 uppercase tracking-widest">CONFIDENCE</p>
                                            <p className="text-2xl font-black text-purple-400">{simulation.confidence_percent || "—"}%</p>
                                        </div>
                                    </div>

                                    {/* Explainable AI */}
                                    <div className="bg-purple-900/30 p-5 border-l-4 border-purple-500">
                                        <span className="text-purple-300 text-xs block mb-2 font-bold uppercase tracking-widest">EXPLAINABLE AI OUTPUT</span>
                                        <p className="text-base leading-relaxed">{simulation.explainable_output}</p>
                                    </div>

                                    {/* High-Risk Zones + Evacuation Routes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-red-900/20 border-2 border-red-800 p-4">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">🚨 HIGH-RISK ZONES</h4>
                                            <ul className="space-y-2">
                                                {(simulation.high_risk_zones || []).map((zone: any, i: number) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm">
                                                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                                                        {toStr(zone)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-green-900/20 border-2 border-green-800 p-4">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">🛣️ EVACUATION ROUTES</h4>
                                            <ul className="space-y-2">
                                                {(simulation.evacuation_routes || []).map((route: any, i: number) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm">
                                                        <span className="text-green-400">→</span>
                                                        {toStr(route)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                        {[
                                            { val: simulation.metrics?.affected_wards, label: "Affected Wards", color: "border-red-900 text-crisis-red" },
                                            { val: simulation.metrics?.population_at_risk?.toLocaleString(), label: "Population at Risk", color: "border-orange-900 text-orange-400" },
                                            { val: simulation.metrics?.required_rescue_boats, label: "Rescue Boats", color: "border-blue-900 text-blue-400" },
                                            { val: simulation.metrics?.required_medical_teams, label: "Medical Teams", color: "border-green-900 text-green-400" },
                                            { val: simulation.metrics?.ambulances_required, label: "Ambulances", color: "border-cyan-900 text-cyan-400" },
                                        ].map(m => (
                                            <div key={m.label} className={`bg-gray-900 border-2 ${m.color.split(' ')[0]} p-4 text-center`}>
                                                <p className={`text-2xl font-black ${m.color.split(' ')[1]}`}>{m.val ?? "—"}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Full Metrics Table */}
                                    <table className="w-full text-left border-collapse border border-gray-700">
                                        <thead>
                                            <tr className="bg-gray-800 text-purple-400 text-xs uppercase tracking-widest">
                                                <th className="border border-gray-700 p-3">Metric</th>
                                                <th className="border border-gray-700 p-3 text-right">Impact</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            <tr><td className="border border-gray-700 p-3">Affected Wards</td><td className="border border-gray-700 p-3 text-right text-crisis-red font-bold">{simulation.metrics?.affected_wards}</td></tr>
                                            <tr><td className="border border-gray-700 p-3">Population at Risk</td><td className="border border-gray-700 p-3 text-right text-orange-400 font-bold">{simulation.metrics?.population_at_risk?.toLocaleString()}</td></tr>
                                            <tr><td className="border border-gray-700 p-3">Roads Submerged</td><td className="border border-gray-700 p-3 text-right">{simulation.metrics?.roads_submerged_km} km</td></tr>
                                            <tr><td className="border border-gray-700 p-3">Hospitals at Risk</td><td className="border border-gray-700 p-3 text-right text-red-400 font-bold">{simulation.metrics?.hospitals_at_risk}</td></tr>
                                            <tr><td className="border border-gray-700 p-3">Rescue Boats Required</td><td className="border border-gray-700 p-3 text-right text-blue-400 font-bold">{simulation.metrics?.required_rescue_boats}</td></tr>
                                            <tr><td className="border border-gray-700 p-3">Medical Teams</td><td className="border border-gray-700 p-3 text-right text-green-400 font-bold">{simulation.metrics?.required_medical_teams}</td></tr>
                                            <tr><td className="border border-gray-700 p-3">Shelters Needed</td><td className="border border-gray-700 p-3 text-right text-yellow-400 font-bold">{simulation.metrics?.shelters_needed}</td></tr>
                                            <tr><td className="border border-gray-700 p-3">Ambulances</td><td className="border border-gray-700 p-3 text-right text-cyan-400 font-bold">{simulation.metrics?.ambulances_required}</td></tr>
                                            <tr><td className="border border-gray-700 p-3 text-gray-400">Est. Evacuation Time</td><td className="border border-gray-700 p-3 text-right text-gray-400">{simulation.metrics?.estimated_evacuation_hours} hours</td></tr>
                                        </tbody>
                                    </table>

                                    {/* Disaster Timeline */}
                                    {simulation.timeline && simulation.timeline.length > 0 && (
                                        <div className="bg-gray-900 border-2 border-purple-800 p-4">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3">⏱ DISASTER EVOLUTION TIMELINE</h4>
                                            <div className="relative">
                                                {simulation.timeline.map((t: any, i: number) => (
                                                    <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                                                        <div className="flex flex-col items-center">
                                                            <div className="h-3 w-3 rounded-full bg-purple-500 border-2 border-purple-300 shrink-0"></div>
                                                            {i < simulation.timeline.length - 1 && <div className="w-0.5 h-6 bg-purple-800"></div>}
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-purple-300 font-bold uppercase">+{t.hours ?? t.hour ?? i}h</span>
                                                            <p className="text-sm text-gray-300">{toStr(t.event || t.description || t)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hospital Impact */}
                                    {simulation.hospital_impact && simulation.hospital_impact.length > 0 && (
                                        <div className="bg-gray-900 border-2 border-red-800 p-4">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">🏥 HOSPITAL IMPACT ASSESSMENT</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {simulation.hospital_impact.map((h: any, i: number) => (
                                                    <div key={i} className={`p-3 border ${(toStr(h.status)).includes("RISK") ? "border-red-700 bg-red-900/20" : "border-green-700 bg-green-900/20"}`}>
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${(toStr(h.status)).includes("RISK") ? "text-red-400" : "text-green-400"}`}>{toStr(h.status)}</span>
                                                        <p className="text-sm text-white font-bold mt-1">{toStr(h.name)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Supply Needs */}
                                    {simulation.metrics?.food_packets_required && (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-gray-900 border-2 border-yellow-900 p-4 text-center">
                                                <p className="text-2xl font-black text-yellow-400">{simulation.metrics.food_packets_required?.toLocaleString()}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">Food Packets</p>
                                            </div>
                                            <div className="bg-gray-900 border-2 border-blue-900 p-4 text-center">
                                                <p className="text-2xl font-black text-blue-400">{simulation.metrics.drinking_water_liters?.toLocaleString()}L</p>
                                                <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">Drinking Water</p>
                                            </div>
                                            <div className="bg-gray-900 border-2 border-cyan-900 p-4 text-center">
                                                <p className="text-2xl font-black text-cyan-400">{simulation.metrics.icu_beds_needed}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">ICU Beds</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-16 border-t-2 border-gray-800">
                                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-purple-900" />
                                    <p className="text-gray-500 text-xs uppercase tracking-widest">Configure parameters above and run the prediction model</p>
                                    <p className="text-gray-600 text-[10px] mt-2">Uses historical flood data, IMD weather records, terrain elevation, and drainage infrastructure models</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ====== REPORTS TAB ====== */}
                {activeTab === "reports" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold uppercase tracking-widest text-white">
                                ALL FIELD REPORTS ({reportCount})
                            </h3>
                            {/* Filter */}
                            <div className="flex items-center gap-0 border-2 border-gray-700">
                                <div className="flex h-9 shrink-0 items-center border-r-2 border-gray-700 bg-gray-900 px-2">
                                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                                {filters.map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilter(f.key)}
                                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${filter === f.key
                                            ? f.key === "critical"
                                                ? "bg-crisis-red text-white"
                                                : f.key === "warning"
                                                    ? "bg-crisis-yellow text-black"
                                                    : "bg-white text-black"
                                            : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Map */}
                        <LiveMap reports={filteredReports} />

                        {/* Reports Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredReports.length === 0 ? (
                                <div className="col-span-full border-2 border-dashed border-gray-700 p-12 text-center">
                                    <p className="text-sm uppercase text-gray-500">NO REPORTS MATCHING FILTER</p>
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
                )}

                {/* ====== AURA — LIVE OPERATIONAL INTELLIGENCE ====== */}
                {activeTab === "aura" && (
                    <div className="space-y-6">
                        {/* HERO */}
                        <div className="border-4 border-cyan-800 bg-gradient-to-br from-gray-950 via-cyan-950/20 to-gray-950 p-6 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <Brain className="h-7 w-7 text-cyan-400" />
                                        <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400">AURA — LIVE INTELLIGENCE</h2>
                                    </div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">
                                        AI Unified Response Architecture • Multi-Modal Data Fusion • Explainable Decision Engine
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-cyan-400">{reportCount}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Signals Ingested</p>
                                </div>
                            </div>
                        </div>

                        {/* DATA FUSION ENGINE — LIVE FEEDS */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Layers className="h-4 w-4" /> MULTI-MODAL DATA FUSION ENGINE
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {[
                                    { source: "Citizen Reports", icon: "📱", status: liveReports.length > 0 ? "LIVE" : "IDLE", count: String(liveReports.length), color: "text-green-400 border-green-800" },
                                    { source: "Computer Vision", icon: "🛰️", status: liveReports.some((r: any) => r.imageUrl) ? "ACTIVE" : "STANDBY", count: String(liveReports.filter((r: any) => r.imageUrl).length), color: "text-blue-400 border-blue-800" },
                                    { source: "GPS / IoT", icon: "📡", status: liveReports.some((r: any) => r.lat) ? "STREAMING" : "OFFLINE", count: String(liveReports.filter((r: any) => r.lat).length), color: "text-purple-400 border-purple-800" },
                                    { source: "AI Assessment", icon: "🧠", status: liveReports.some((r: any) => r.assessment) ? "ONLINE" : "STANDBY", count: String(liveReports.filter((r: any) => r.assessment).length), color: "text-cyan-400 border-cyan-800" },
                                    { source: "Crowd Verify", icon: "👥", status: liveReports.some((r: any) => r.crowd_verified) ? "ACTIVE" : "IDLE", count: String(liveReports.filter((r: any) => r.crowd_verified).length), color: "text-green-400 border-green-800" },
                                    { source: "Weather API", icon: "🌦️", status: weatherData ? "LIVE" : "STANDBY", count: weatherData ? `${weatherData.temp_c}°` : "--", color: "text-yellow-400 border-yellow-800" },
                                    { source: "USGS Seismic", icon: "🌍", status: seismicData?.count > 0 ? "ALERT" : "QUIET", count: String(seismicData?.count || 0), color: seismicData?.count > 0 ? "text-red-400 border-red-800" : "text-green-400 border-green-800" },
                                    { source: "Air Quality", icon: "🫁", status: aqiData ? (aqiData.aqi > 150 ? "UNHEALTHY" : aqiData.aqi > 100 ? "MODERATE" : "GOOD") : "PENDING", count: aqiData ? String(aqiData.aqi) : "--", color: aqiData?.aqi > 150 ? "text-red-400 border-red-800" : aqiData?.aqi > 100 ? "text-yellow-400 border-yellow-800" : "text-green-400 border-green-800" },
                                ].map(feed => (
                                    <div key={feed.source} className={`bg-gray-900 border-2 ${feed.color.split(" ")[1]} p-3`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-lg">{feed.icon}</span>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${feed.status === "IDLE" || feed.status === "OFFLINE" || feed.status === "STANDBY" ? "text-gray-500" : feed.color.split(" ")[0]}`}>
                                                {feed.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{feed.source}</p>
                                        <p className={`text-xl font-black mt-1 ${feed.color.split(" ")[0]}`}>{feed.count}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* EXPLAINABLE AI — PER-REPORT INTELLIGENCE */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Eye className="h-4 w-4" /> EXPLAINABLE AI — SIGNAL INTELLIGENCE PER REPORT
                            </h3>
                            {liveReports.length === 0 ? (
                                <div className="text-center py-12 text-gray-600">
                                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-xs uppercase tracking-widest">No signals ingested yet. Submit a report from the Citizen Portal.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {liveReports.map((report: any) => (
                                        <div key={report.id} className="border-2 border-gray-700 bg-gray-900 p-4 hover:border-cyan-800 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest ${report.severity === "critical" ? "bg-red-500 text-white" :
                                                        report.severity === "warning" ? "bg-yellow-500 text-black" :
                                                            "bg-gray-500 text-white"
                                                        }`}>{report.severity}</span>
                                                    <span className="text-xs text-gray-400">📍 {report.location}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-500">{report.id.substring(0, 12)}...</span>
                                            </div>

                                            {/* AI Reasoning */}
                                            <div className="bg-black border border-gray-700 p-3 mb-3">
                                                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">AI REASONING</p>
                                                <p className="text-sm text-gray-300 leading-relaxed">{report.summary}</p>
                                            </div>

                                            {/* Source Attribution Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                <div className="bg-black border border-gray-800 p-2 text-center">
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Visual Signal</p>
                                                    <p className={`text-sm font-bold mt-1 ${report.imageUrl ? "text-green-400" : "text-gray-600"}`}>
                                                        {report.imageUrl ? "✓ Verified" : "— None"}
                                                    </p>
                                                </div>
                                                <div className="bg-black border border-gray-800 p-2 text-center">
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">GPS Lock</p>
                                                    <p className={`text-sm font-bold mt-1 ${report.lat ? "text-green-400" : "text-gray-600"}`}>
                                                        {report.lat ? "✓ Locked" : "— Manual"}
                                                    </p>
                                                </div>
                                                <div className="bg-black border border-gray-800 p-2 text-center">
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Audio Intel</p>
                                                    <p className={`text-sm font-bold mt-1 ${report.audioUrl ? "text-blue-400" : "text-gray-600"}`}>
                                                        {report.audioUrl ? "✓ Analyzed" : "— None"}
                                                    </p>
                                                </div>
                                                <div className="bg-black border border-gray-800 p-2 text-center">
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">AI Confidence</p>
                                                    <p className={`text-sm font-bold mt-1 ${(report.assessment?.confidence_score || 0) >= 85 ? "text-green-400" :
                                                        (report.assessment?.confidence_score || 0) >= 70 ? "text-yellow-400" : "text-red-400"
                                                        }`}>
                                                        {report.assessment?.confidence_score ? `${report.assessment.confidence_score}%` : "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RESOURCE OPTIMIZATION ENGINE */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Cpu className="h-4 w-4" /> RESOURCE OPTIMIZATION ENGINE
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Rescue Teams", value: Math.max(criticalCount * 3 + warningCount, 0), color: "text-red-400 border-red-900" },
                                    { label: "Ambulances", value: Math.max(criticalCount * 2 + warningCount, 0), color: "text-orange-400 border-orange-900" },
                                    { label: "Shelters", value: Math.max(Math.ceil(criticalCount * 1.5), 0), color: "text-blue-400 border-blue-900" },
                                    { label: "Medical Units", value: Math.max(criticalCount * 2 + Math.ceil(warningCount * 0.5), 0), color: "text-green-400 border-green-900" },
                                ].map(r => (
                                    <div key={r.label} className={`bg-gray-900 border-2 ${r.color.split(" ")[1]} p-5 text-center`}>
                                        <p className={`text-4xl font-black ${r.color.split(" ")[0]}`}>{r.value}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-2">{r.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 bg-cyan-900/20 border border-cyan-800 p-3">
                                <p className="text-[10px] text-cyan-300 italic">
                                    Auto-calculated: {criticalCount} critical × 3 teams + {warningCount} warning × 1 team.
                                    Constraint-based optimization applied for resource allocation.
                                </p>
                            </div>
                        </div>

                        {/* TRUST & GOVERNANCE */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Shield className="h-4 w-4" /> TRUST & GOVERNANCE LAYER
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-900 border-2 border-yellow-900 p-4">
                                    <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-2">Human Override Log</p>
                                    <p className="text-2xl font-black text-yellow-400">{Object.keys(humanOverrides).filter(k => humanOverrides[k]).length}</p>
                                    <p className="text-[9px] text-gray-500 mt-1">Overrides applied by authority</p>
                                </div>
                                <div className="bg-gray-900 border-2 border-green-900 p-4">
                                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Dispatches Sent</p>
                                    <p className="text-2xl font-black text-green-400">{Object.keys(dispatchStatus).filter(k => dispatchStatus[k] === "done").length}</p>
                                    <p className="text-[9px] text-gray-500 mt-1">Verified and dispatched alerts</p>
                                </div>
                                <div className="bg-gray-900 border-2 border-blue-900 p-4">
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">Data Authenticity</p>
                                    <p className="text-2xl font-black text-blue-400">{liveReports.filter((r: any) => r.imageUrl && r.lat).length}/{reportCount}</p>
                                    <p className="text-[9px] text-gray-500 mt-1">Reports with verified visual + GPS</p>
                                </div>
                            </div>
                        </div>

                        {/* ====== EARLY WARNING & ALERT SYSTEM ====== */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Radio className="h-4 w-4" /> EARLY WARNING & ALERT SYSTEM
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                {earlyWarnings.map((w: any, i: number) => (
                                    <div key={i} className={`bg-gray-900 border-2 p-4 ${(w.level || "") === "red" ? "border-red-600" :
                                        (w.level || "") === "orange" ? "border-orange-600" :
                                            (w.level || "") === "yellow" ? "border-yellow-600" :
                                                "border-green-700"
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{toStr(w.source)}</span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${(w.level || "") === "red" ? "bg-red-500 text-white" :
                                                (w.level || "") === "orange" ? "bg-orange-500 text-white" :
                                                    (w.level || "") === "yellow" ? "bg-yellow-500 text-black" :
                                                        "bg-green-500 text-white"
                                                }`}>{toStr(w.level).toUpperCase()}</span>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">{toStr(w.message)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ====== HEALTHCARE LOAD FORECASTING ====== */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> HEALTHCARE LOAD FORECASTING
                            </h3>
                            {healthcareData ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                                        {healthcareData.hospitals?.map((h: any, i: number) => (
                                            <div key={i} className={`bg-gray-900 border-2 p-4 ${h.status === "STRESS" ? "border-red-700" : "border-gray-600"}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs font-bold text-white">{h.name}</p>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 ${h.status === "STRESS" ? "bg-red-500 text-white animate-pulse" : "bg-green-900 text-green-400"}`}>{h.status}</span>
                                                </div>
                                                <div className="w-full bg-gray-800 h-2 mt-2 mb-1">
                                                    <div className={`h-full ${h.current_load > 85 ? "bg-red-500" : h.current_load > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                                                        style={{ width: `${Math.min(h.current_load, 100)}%` }}></div>
                                                </div>
                                                <div className="flex justify-between text-[9px] text-gray-500">
                                                    <span>Load: {h.current_load}%</span>
                                                    <span>ICU: {h.icu_available} beds</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: "Ambulances Needed", val: healthcareData.forecast?.ambulances_needed, color: "text-red-400" },
                                            { label: "Blood Units", val: healthcareData.forecast?.blood_units_needed, color: "text-orange-400" },
                                            { label: "ICU Beds", val: healthcareData.forecast?.icu_beds_needed, color: "text-blue-400" },
                                            { label: "Medical Teams", val: healthcareData.forecast?.medical_teams_needed, color: "text-green-400" },
                                        ].map(f => (
                                            <div key={f.label} className="bg-black border border-gray-700 p-3 text-center">
                                                <p className={`text-2xl font-black ${f.color}`}>{f.val}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{f.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-600 text-xs text-center py-4">Loading hospital data...</p>
                            )}
                        </div>

                        {/* ====== SUPPLY CHAIN & RELIEF LOGISTICS ====== */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                📦 SUPPLY CHAIN & RELIEF LOGISTICS
                            </h3>
                            {supplyData ? (
                                <>
                                    <table className="w-full text-left border-collapse mb-4">
                                        <thead>
                                            <tr className="bg-gray-800 text-[10px] uppercase tracking-widest">
                                                <th className="border border-gray-700 p-3 text-gray-400">Supply Item</th>
                                                <th className="border border-gray-700 p-3 text-green-400 text-right">Available</th>
                                                <th className="border border-gray-700 p-3 text-orange-400 text-right">Required</th>
                                                <th className="border border-gray-700 p-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs">
                                            {supplyData.supplies?.map((s: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-900/50">
                                                    <td className="border border-gray-700 p-3 text-white font-bold">{s.item}</td>
                                                    <td className="border border-gray-700 p-3 text-right text-green-400">{s.available.toLocaleString()}</td>
                                                    <td className="border border-gray-700 p-3 text-right text-orange-400">{s.required.toLocaleString()}</td>
                                                    <td className="border border-gray-700 p-3 text-center">
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 ${s.status === "CRITICAL" ? "bg-red-500 text-white" :
                                                            s.status === "LOW" ? "bg-yellow-500 text-black" :
                                                                "bg-green-900 text-green-400"
                                                            }`}>{s.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">WAREHOUSE UTILIZATION</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {supplyData.warehouses?.map((w: any, i: number) => (
                                            <div key={i} className="bg-gray-900 border border-gray-700 p-3">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs text-white font-bold">{w.name}</span>
                                                    <span className="text-[10px] text-gray-500">{w.location}</span>
                                                </div>
                                                <div className="w-full bg-gray-800 h-2.5 mt-2">
                                                    <div className={`h-full ${w.utilization > 80 ? "bg-red-500" : w.utilization > 60 ? "bg-yellow-500" : "bg-cyan-500"}`}
                                                        style={{ width: `${w.utilization}%` }}></div>
                                                </div>
                                                <p className="text-[9px] text-gray-500 mt-1">{w.utilization}% utilized</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-600 text-xs text-center py-4">Loading supply data...</p>
                            )}
                        </div>

                        {/* ====== SMART EVACUATION PLANNING ====== */}
                        <div className="border-4 border-gray-700 bg-gray-950 p-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                🛣️ SMART EVACUATION PLANNING
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                {[
                                    { label: "Safe Corridors", value: criticalCount > 0 ? "3 IDENTIFIED" : "STANDBY", icon: "🛡️", color: criticalCount > 0 ? "text-green-400 border-green-800" : "text-gray-500 border-gray-700" },
                                    { label: "Bridge Risk", value: criticalCount > 2 ? "HIGH" : "NORMAL", icon: "🌉", color: criticalCount > 2 ? "text-red-400 border-red-800" : "text-green-400 border-green-800" },
                                    { label: "Shelter Capacity", value: `${Math.max(100 - criticalCount * 15, 20)}%`, icon: "🏠", color: criticalCount > 3 ? "text-orange-400 border-orange-800" : "text-blue-400 border-blue-800" },
                                    { label: "Traffic Integration", value: "LIVE", icon: "🚗", color: "text-cyan-400 border-cyan-800" },
                                ].map(e => (
                                    <div key={e.label} className={`bg-gray-900 border-2 ${e.color.split(" ")[1]} p-4`}>
                                        <span className="text-2xl">{e.icon}</span>
                                        <p className={`text-lg font-black mt-2 ${e.color.split(" ")[0]}`}>{e.value}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">{e.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ====== ANALYTICS TAB ====== */}
                {activeTab === "analytics" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" /> POST-DISASTER ANALYTICS — AFTER ACTION REPORT
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">Real-time situational analysis and response effectiveness metrics</p>
                        </div>

                        {analyticsData ? (
                            <>
                                {/* Overview Metrics Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                                    {[
                                        { label: "TOTAL REPORTS", value: analyticsData.total_reports, color: "text-white border-gray-600" },
                                        { label: "CROWD VERIFIED", value: analyticsData.crowd_verified_count, color: "text-green-400 border-green-800" },
                                        { label: "RESOLUTION RATE", value: `${analyticsData.resolution_pct}%`, color: analyticsData.resolution_pct > 50 ? "text-green-400 border-green-800" : "text-red-400 border-red-800" },
                                        { label: "AVG CONFIDENCE", value: `${analyticsData.avg_confidence}%`, color: "text-cyan-400 border-cyan-800" },
                                        { label: "AVG RESPONSE", value: analyticsData.avg_response_min > 0 ? `${analyticsData.avg_response_min}m` : "N/A", color: "text-yellow-400 border-yellow-800" },
                                        { label: "ACTIVE CITIES", value: Object.keys(analyticsData.city_breakdown || {}).length, color: "text-purple-400 border-purple-800" },
                                    ].map(m => (
                                        <div key={m.label} className={`bg-gray-900 border-2 ${m.color.split(' ')[1]} p-4`}>
                                            <span className="text-[9px] text-gray-500 uppercase tracking-widest">{m.label}</span>
                                            <p className={`text-2xl font-black mt-1 ${m.color.split(' ')[0]}`}>{m.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Severity Breakdown */}
                                    <div className="border-4 border-gray-700 bg-gray-950 p-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">SEVERITY DISTRIBUTION</h3>
                                        <div className="space-y-3">
                                            {Object.entries(analyticsData.severity_breakdown || {}).map(([sev, count]: [string, any]) => {
                                                const colors: any = { Critical: "bg-red-600", High: "bg-orange-500", Medium: "bg-yellow-500", Low: "bg-green-500" }
                                                const pct = analyticsData.total_reports > 0 ? Math.round((count / analyticsData.total_reports) * 100) : 0
                                                return (
                                                    <div key={sev}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="uppercase font-bold text-gray-300">{sev}</span>
                                                            <span className="text-gray-500">{count} ({pct}%)</span>
                                                        </div>
                                                        <div className="w-full bg-gray-800 h-3">
                                                            <div className={`h-full ${colors[sev] || 'bg-gray-500'} transition-all`} style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Status Pipeline */}
                                    <div className="border-4 border-gray-700 bg-gray-950 p-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">STATUS PIPELINE</h3>
                                        <div className="space-y-3">
                                            {Object.entries(analyticsData.status_breakdown || {}).map(([status, count]: [string, any]) => {
                                                const colors: any = { NEW: "bg-gray-500", VERIFIED: "bg-yellow-500", DISPATCHED: "bg-blue-500", RESOLVED: "bg-green-500" }
                                                const pct = analyticsData.total_reports > 0 ? Math.round((count / analyticsData.total_reports) * 100) : 0
                                                return (
                                                    <div key={status}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="uppercase font-bold text-gray-300">{status}</span>
                                                            <span className="text-gray-500">{count} ({pct}%)</span>
                                                        </div>
                                                        <div className="w-full bg-gray-800 h-3">
                                                            <div className={`h-full ${colors[status] || 'bg-gray-500'} transition-all`} style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* City Breakdown */}
                                    <div className="border-4 border-gray-700 bg-gray-950 p-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">CITY-LEVEL BREAKDOWN</h3>
                                        <div className="space-y-2">
                                            {Object.entries(analyticsData.city_breakdown || {}).sort((a: any, b: any) => b[1] - a[1]).map(([city, count]: [string, any]) => (
                                                <div key={city} className="flex items-center justify-between bg-gray-900 border border-gray-700 p-3">
                                                    <span className="text-sm font-bold text-white">{city}</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 bg-gray-800 h-2">
                                                            <div className="h-full bg-purple-500" style={{ width: `${Math.round((count / analyticsData.total_reports) * 100)}%` }}></div>
                                                        </div>
                                                        <span className="text-sm font-black text-purple-400 w-8 text-right">{count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hazard Type Breakdown */}
                                    <div className="border-4 border-gray-700 bg-gray-950 p-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">HAZARD TYPE DISTRIBUTION</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(analyticsData.hazard_breakdown || {}).sort((a: any, b: any) => b[1] - a[1]).map(([hazard, count]: [string, any]) => {
                                                const icons: any = { Flood: "🌊", Waterlogging: "💧", Landslide: "⛰️", "Building Collapse": "🏚️", "High Winds": "💨", "Dam Overflow": "🌊", "Storm Surge": "🌊", Fire: "🔥" }
                                                return (
                                                    <div key={hazard} className="bg-gray-900 border border-gray-700 p-3 flex items-center gap-3">
                                                        <span className="text-2xl">{icons[hazard] || "⚠️"}</span>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{hazard}</p>
                                                            <p className="text-xs text-gray-500">{count} reports</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Top Affected Areas */}
                                <div className="border-4 border-gray-700 bg-gray-950 p-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">🎯 TOP AFFECTED AREAS — RESPONSE PRIORITY</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                        {(analyticsData.top_affected_areas || []).map((area: any, i: number) => (
                                            <div key={area.area} className={`p-4 border-2 ${i === 0 ? 'border-red-600 bg-red-900/20' : i === 1 ? 'border-orange-600 bg-orange-900/20' : 'border-gray-700 bg-gray-900'}`}>
                                                <p className="text-[9px] text-gray-500 uppercase tracking-widest">#{i + 1} PRIORITY</p>
                                                <p className="text-lg font-black text-white mt-1">{area.area}</p>
                                                <p className={`text-2xl font-black mt-2 ${i === 0 ? 'text-red-400' : i === 1 ? 'text-orange-400' : 'text-gray-400'}`}>{area.count}</p>
                                                <p className="text-[9px] text-gray-600">incidents reported</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-600">
                                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="text-xs uppercase tracking-widest">Loading analytics data...</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

