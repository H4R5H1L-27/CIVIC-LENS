"use client"

import { useState } from "react"
import { CivilianHeader } from "@/components/civilian-header"
import { ReportHazard } from "@/components/report-hazard"
import { CivilianFeed } from "@/components/civilian-feed"
import { SignalVerification } from "@/components/signal-verification"
import { StatusBar } from "@/components/status-bar"

export default function CivilianPage() {
  const [activeView, setActiveView] = useState<"report" | "feed" | "verify">("report")

  return (
    <div className="relative mx-auto min-h-dvh max-w-lg bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40">
        <CivilianHeader activeView={activeView} onViewChange={setActiveView} />
      </div>

      {/* Main Content */}
      <main>
        {activeView === "report" ? (
          <ReportHazard />
        ) : activeView === "feed" ? (
          <CivilianFeed />
        ) : (
          <SignalVerification />
        )}
      </main>

      {/* Fixed Status Bar */}
      <StatusBar />
    </div>
  )
}
