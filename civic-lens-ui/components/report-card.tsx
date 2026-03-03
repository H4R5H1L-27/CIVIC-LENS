"use client"

import { MapPin, Clock } from "lucide-react"
import { SeverityBadge, type Severity } from "@/components/severity-badge"
import { AudioWaveform } from "@/components/audio-waveform"

export interface ReportData {
  id: string
  severity: Severity
  summary: string
  location: string
  timestamp: string
  imageUrl: string
  imageAlt: string
  audioUrl?: string
  lat?: number
  lng?: number
  assessment?: any // may include confidence_score
}

interface ReportCardProps {
  report: ReportData
  onDispatch?: (id: string, location: string) => void
  dispatchStatus?: 'dispatching' | 'done' | 'error'
  webhookLog?: any
  humanOverride?: boolean
  onOverride?: (id: string) => void
}

export function ReportCard({ report, onDispatch, dispatchStatus, webhookLog, humanOverride, onOverride }: ReportCardProps) {
  return (
    <article
      className={`border-2 bg-card ${
        report.severity === "critical"
          ? "border-crisis-red"
          : report.severity === "warning"
          ? "border-crisis-yellow"
          : "border-border"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b-2 border-border px-3 py-2">
        <SeverityBadge severity={report.severity} />
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <time className="font-mono text-[10px] uppercase">{report.timestamp}</time>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex gap-0">
        {/* Image Thumbnail */}
        <div className="relative h-28 w-28 shrink-0 border-r-2 border-border sm:h-32 sm:w-32">
          <img
            src={report.imageUrl}
            alt={report.imageAlt}
            className="h-full w-full object-cover"
          />
          {/* Scanline overlay for that raw aesthetic */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
            <div
              className="h-1/2 w-full bg-foreground/10 animate-scanline"
            />
          </div>
        </div>

        {/* Report Content */}
        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            <p className="font-mono text-sm font-bold uppercase leading-tight text-foreground">
              {report.summary}
            </p>
            <div className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate font-mono text-[10px] uppercase">
                {report.location}
              </span>
            </div>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
            RPT-{report.id}
          </div>
        </div>
      </div>

      {/* Audio Section */}
      <div className="border-t-2 border-border px-3 py-2">
        <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          AUDIO ALERT
        </label>
        <AudioWaveform reportId={report.id} audioUrl={report.audioUrl} />
      </div>

      {/* --- THE DISPATCHER & OVERRIDE MODULE --- */}
      {onDispatch && (
        <div className="mt-6 pt-4 border-t-2 border-gray-700">
          
          {/* CONFIDENCE CHECK LOGIC */}
          {report.assessment?.confidence_score < 75 && !humanOverride ? (
            <div className="bg-yellow-900/20 border-2 border-yellow-500 p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl animate-pulse">⚠️</span>
                <div>
                  <h4 className="text-yellow-500 font-black uppercase tracking-widest text-sm">
                    AI Confidence Low: {report.assessment?.confidence_score}%
                  </h4>
                  <p className="text-gray-400 text-xs mt-1">
                    Visual data is ambiguous. Auto-dispatch suspended pending human verification.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOverride && onOverride(report.id)}
                className="w-full mt-3 py-2 border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold uppercase tracking-widest text-xs transition-colors"
              >
                👁️ Review Image & Manually Approve Dispatch
              </button>
            </div>
          ) : (
            // THE STANDARD DISPATCH BUTTON (Only shows if Confidence >= 75 OR Human Overrode it)
            <>
              {!webhookLog ? (
                <button
                  onClick={() => onDispatch(report.id, report.location)}
                  disabled={dispatchStatus === 'dispatching'}
                  className={`w-full py-3 font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${
                    dispatchStatus === 'dispatching'
                      ? "border-green-500 bg-green-500/20 text-green-400 animate-pulse"
                      : "border-green-500 bg-black text-green-500 hover:bg-green-900/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  }`}
                >
                  {dispatchStatus === 'dispatching' ? (
                    <>
                      <span className="h-3 w-3 bg-green-500 rounded-full animate-ping"></span>
                      PINGING CELL TOWERS IN {report.location.toUpperCase()}...
                    </>
                  ) : (
                    "🚀 DISPATCH WHATSAPP / SMS BROADCAST"
                  )}
                </button>
              ) : (
                <div className="bg-black border-2 border-green-500 p-4 font-mono">
                  <h4 className="text-green-500 text-sm font-bold uppercase mb-2 flex items-center gap-2">
                    <span className="text-lg">✅</span> Payload Delivered to Webhook
                  </h4>
                  <pre className="text-xs text-green-400 overflow-x-auto p-2 bg-gray-900 border border-green-900">
                    {JSON.stringify(webhookLog, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}
