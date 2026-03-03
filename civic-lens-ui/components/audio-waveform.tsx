"use client"

import { useState, useCallback, useRef } from "react"
import { Volume2, VolumeX } from "lucide-react"

interface AudioWaveformProps {
  reportId: string
  audioUrl?: string
}

export function AudioWaveform({ reportId, audioUrl }: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) {
      setIsPlaying(false)
      return
    }

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(console.error)
      setIsPlaying(true)
    }
  }, [isPlaying, audioUrl])

  return (
    <div className="flex items-center gap-0 border-2 border-foreground">
      {/* hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime)
        }}
      />
      {/* Play Button */}
      <button
        onClick={togglePlay}
        className={`flex h-10 w-12 shrink-0 items-center justify-center border-r-2 border-foreground transition-colors ${
          isPlaying
            ? "bg-crisis-red text-foreground"
            : "bg-crisis-surface-elevated text-foreground hover:bg-crisis-red"
        }`}
        aria-label={`${isPlaying ? "Stop" : "Play"} audio alert for report ${reportId}`}
      >
        {isPlaying ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {/* Waveform Visualizer */}
      <div
        className="flex flex-1 items-end justify-center gap-[2px] bg-input px-2 py-1"
        style={{ height: 40 }}
        aria-hidden="true"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={`w-[3px] bg-crisis-red ${isPlaying ? "waveform-bar" : ""}`}
            style={{
              height: isPlaying ? undefined : `${15 + Math.sin(i * 0.7) * 12 + Math.random() * 8}%`,
              minHeight: 2,
              transition: isPlaying ? "none" : "height 0.2s",
            }}
          />
        ))}
      </div>

      {/* Duration */}
      <div className="flex h-10 shrink-0 items-center border-l-2 border-foreground bg-input px-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {isPlaying
            ? `${Math.floor(currentTime/60)}:${String(Math.floor(currentTime%60)).padStart(2,'0')}`
            : `${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}`}
        </span>
      </div>
    </div>
  )
}
