"use client"

import { Radio, ShieldAlert, Eye } from "lucide-react"
import Link from "next/link"

interface CivilianHeaderProps {
    activeView: "report" | "feed" | "verify"
    onViewChange: (view: "report" | "feed" | "verify") => void
}

export function CivilianHeader({ activeView, onViewChange }: CivilianHeaderProps) {
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
                            CITIZEN PORTAL
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
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
                    className={`flex flex-1 items-center justify-center gap-1.5 border-r border-border px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${activeView === "report"
                            ? "bg-crisis-red text-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    REPORT
                </button>
                <button
                    role="tab"
                    aria-selected={activeView === "feed"}
                    onClick={() => onViewChange("feed")}
                    className={`flex flex-1 items-center justify-center gap-1.5 border-r border-border px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${activeView === "feed"
                            ? "bg-crisis-yellow text-background"
                            : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                >
                    <Radio className="h-3.5 w-3.5" />
                    MY REPORTS
                </button>
                <button
                    role="tab"
                    aria-selected={activeView === "verify"}
                    onClick={() => onViewChange("verify")}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${activeView === "verify"
                            ? "bg-yellow-500 text-background"
                            : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                >
                    <Eye className="h-3.5 w-3.5" />
                    VERIFY
                </button>
            </nav>
        </header>
    )
}
