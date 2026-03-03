"use client"

import { Radio, ShieldAlert } from "lucide-react"

interface CrisisHeaderProps {
  activeView: "report" | "feed"
  onViewChange: (view: "report" | "feed") => void
}

export function CrisisHeader({ activeView, onViewChange }: CrisisHeaderProps) {
  return (
    <header className="border-b-2 border-foreground bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-crisis-red bg-crisis-red">
            <ShieldAlert className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
              CIVIC LENS
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-crisis-red animate-crisis-pulse">
              CRISIS MODE ACTIVE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping bg-crisis-green opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 bg-crisis-green" />
          </span>
          <span className="font-mono text-[10px] uppercase text-crisis-green">ONLINE</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="flex border-t-2 border-foreground" role="tablist">
        <button
          role="tab"
          aria-selected={activeView === "report"}
          onClick={() => onViewChange("report")}
          className={`flex flex-1 items-center justify-center gap-2 border-r border-border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
            activeView === "report"
              ? "bg-crisis-red text-foreground"
              : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          REPORT HAZARD
        </button>
        <button
          role="tab"
          aria-selected={activeView === "feed"}
          onClick={() => onViewChange("feed")}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
            activeView === "feed"
              ? "bg-crisis-yellow text-background"
              : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Radio className="h-4 w-4" />
          LIVE COMM-LINK
        </button>
      </nav>
    </header>
  )
}
