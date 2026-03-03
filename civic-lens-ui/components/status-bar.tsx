"use client"

import { useEffect, useState } from "react"
import { Wifi, Battery, Signal } from "lucide-react"

export function StatusBar() {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t-2 border-foreground bg-background px-4 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Signal className="h-3 w-3 text-crisis-green" />
          <span className="font-mono text-[10px] uppercase text-crisis-green">CONNECTED</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-[10px] uppercase text-muted-foreground">4G</span>
        </div>
      </div>
      <div className="font-mono text-[10px] font-bold uppercase text-foreground tabular-nums">
        {time || "--:--:--"} UTC
      </div>
      <div className="flex items-center gap-1">
        <Battery className="h-3 w-3 text-crisis-yellow" />
        <span className="font-mono text-[10px] uppercase text-crisis-yellow">72%</span>
      </div>
    </footer>
  )
}
