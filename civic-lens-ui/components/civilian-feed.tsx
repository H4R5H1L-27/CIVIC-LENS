"use client"

import { useState, useEffect } from "react"
import { Radio, Filter } from "lucide-react"
import { ReportCard, type ReportData } from "@/components/report-card"
import type { Severity } from "@/components/severity-badge"
import { getApiBaseUrl } from "@/lib/api-config"

type FilterType = "all" | "critical" | "warning" | "info"

export function CivilianFeed() {
    const [filter, setFilter] = useState<FilterType>("all")
    const [liveReports, setLiveReports] = useState<ReportData[]>([])
    const [reportCount, setReportCount] = useState(0)

    const BASE_URL = getApiBaseUrl();

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
                console.error("Failed to fetch reports:", error)
            }
        }

        fetchReports()
        const interval = setInterval(fetchReports, 10000)
        return () => clearInterval(interval)
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

    return (
        <div className="flex flex-col pb-24">
            {/* Feed Header */}
            <div className="border-b-2 border-foreground bg-background px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                            REPORTED INCIDENTS
                        </h2>
                        <p className="font-mono text-xs uppercase text-muted-foreground">
                            ALL FIELD REPORTS
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

            {/* Reports Feed — civilian view (no dispatch buttons) */}
            <div className="flex flex-col gap-3 p-4">
                {filteredReports.length === 0 ? (
                    <div className="border-2 border-dashed border-border p-8 text-center">
                        <p className="font-mono text-sm uppercase text-muted-foreground">
                            NO REPORTS YET — SUBMIT ONE TO GET STARTED
                        </p>
                    </div>
                ) : (
                    filteredReports.map((report) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
