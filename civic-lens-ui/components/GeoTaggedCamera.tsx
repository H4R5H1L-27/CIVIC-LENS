"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, X, Crosshair, MapPin, RotateCcw } from "lucide-react"

interface GeoTaggedCameraProps {
    onCapture: (file: File, lat: string, lng: string, accuracy: number) => void
    onClose: () => void
}

export function GeoTaggedCamera({ onCapture, onClose }: GeoTaggedCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [gpsLat, setGpsLat] = useState<number | null>(null)
    const [gpsLng, setGpsLng] = useState<number | null>(null)
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
    const [gpsStatus, setGpsStatus] = useState<"searching" | "locked" | "failed">("searching")
    const [cameraReady, setCameraReady] = useState(false)
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
    const [capturedFile, setCapturedFile] = useState<File | null>(null)
    const [timestamp, setTimestamp] = useState("")
    const watchIdRef = useRef<number | null>(null)

    // Start GPS tracking
    useEffect(() => {
        if ("geolocation" in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    setGpsLat(pos.coords.latitude)
                    setGpsLng(pos.coords.longitude)
                    setGpsAccuracy(Math.round(pos.coords.accuracy))
                    setGpsStatus("locked")
                },
                (err) => {
                    console.error("GPS Error:", err)
                    setGpsStatus("failed")
                },
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
            )
        } else {
            setGpsStatus("failed")
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
        }
    }, [])

    // Timestamp ticker
    useEffect(() => {
        const updateTime = () => {
            const now = new Date()
            setTimestamp(now.toISOString().replace("T", " ").substring(0, 19) + " UTC")
        }
        updateTime()
        const interval = setInterval(updateTime, 1000)
        return () => clearInterval(interval)
    }, [])

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop())
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play()
                    setCameraReady(true)
                }
            }
        } catch (err) {
            console.error("Camera access denied:", err)
            alert("Camera access is required for geotagged photo capture.")
            onClose()
        }
    }, [facingMode, onClose])

    useEffect(() => {
        startCamera()
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop())
            }
        }
    }, [startCamera])

    // Switch camera
    const switchCamera = useCallback(() => {
        setFacingMode(prev => prev === "environment" ? "user" : "environment")
    }, [])

    // Capture photo with GPS watermark
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Draw GPS watermark bar at bottom
        const barHeight = 60
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)"
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight)

        // GPS text
        ctx.font = "bold 16px 'Courier New', monospace"
        ctx.fillStyle = "#00ff88"
        const gpsText = gpsLat !== null && gpsLng !== null
            ? `GPS: ${gpsLat.toFixed(6)}, ${gpsLng.toFixed(6)}  |  ACC: ±${gpsAccuracy}m`
            : "GPS: UNAVAILABLE"
        ctx.fillText(gpsText, 12, canvas.height - barHeight + 22)

        // Timestamp
        ctx.fillStyle = "#ffaa00"
        ctx.fillText(`TIME: ${timestamp}`, 12, canvas.height - barHeight + 46)

        // CIVIC LENS badge
        ctx.fillStyle = "#ff4444"
        ctx.font = "bold 14px 'Courier New', monospace"
        const badge = "CIVIC LENS // GEOTAGGED"
        const badgeWidth = ctx.measureText(badge).width
        ctx.fillText(badge, canvas.width - badgeWidth - 12, canvas.height - barHeight + 22)

        // Accuracy indicator
        if (gpsAccuracy !== null) {
            ctx.fillStyle = gpsAccuracy < 30 ? "#00ff88" : gpsAccuracy < 100 ? "#ffaa00" : "#ff4444"
            ctx.fillText(
                gpsAccuracy < 30 ? "HIGH PRECISION" : gpsAccuracy < 100 ? "MODERATE" : "LOW PRECISION",
                canvas.width - badgeWidth - 12,
                canvas.height - barHeight + 46
            )
        }

        // Convert to blob
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `geotag_${Date.now()}.jpg`, { type: "image/jpeg" })
                setCapturedFile(file)
                setCapturedPreview(canvas.toDataURL("image/jpeg", 0.92))
            }
        }, "image/jpeg", 0.92)
    }, [gpsLat, gpsLng, gpsAccuracy, timestamp])

    // Confirm and send to parent
    const confirmCapture = useCallback(() => {
        if (capturedFile) {
            onCapture(
                capturedFile,
                gpsLat?.toString() || "",
                gpsLng?.toString() || "",
                gpsAccuracy || 0
            )
        }
    }, [capturedFile, gpsLat, gpsLng, gpsAccuracy, onCapture])

    // Retake
    const retake = useCallback(() => {
        setCapturedPreview(null)
        setCapturedFile(null)
    }, [])

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Top bar */}
            <div className="bg-black/90 border-b-2 border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-red-500" />
                    <span className="font-mono text-sm font-bold uppercase tracking-widest text-white">
                        GEOTAGGED CAPTURE
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {/* GPS status */}
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${gpsStatus === "locked" ? "bg-green-500 animate-pulse" :
                                gpsStatus === "searching" ? "bg-yellow-500 animate-ping" :
                                    "bg-red-500"
                            }`}></span>
                        <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${gpsStatus === "locked" ? "text-green-400" :
                                gpsStatus === "searching" ? "text-yellow-400" :
                                    "text-red-400"
                            }`}>
                            {gpsStatus === "locked" ? "GPS LOCKED" :
                                gpsStatus === "searching" ? "ACQUIRING..." :
                                    "NO GPS"}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Camera view or preview */}
            <div className="flex-1 relative overflow-hidden">
                {capturedPreview ? (
                    <img src={capturedPreview} alt="Captured" className="w-full h-full object-contain" />
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Viewfinder overlay */}
                        {cameraReady && (
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Corner brackets */}
                                <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-red-500/70"></div>
                                <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-red-500/70"></div>
                                <div className="absolute bottom-24 left-8 w-16 h-16 border-b-2 border-l-2 border-red-500/70"></div>
                                <div className="absolute bottom-24 right-8 w-16 h-16 border-b-2 border-r-2 border-red-500/70"></div>

                                {/* Crosshair center */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <Crosshair className="h-10 w-10 text-red-500/50" />
                                </div>

                                {/* GPS Data overlay — top left */}
                                <div className="absolute top-12 left-12 bg-black/60 px-3 py-2 border border-green-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <MapPin className="h-3 w-3 text-green-400" />
                                        <span className="font-mono text-[10px] font-bold text-green-400 uppercase tracking-widest">
                                            GPS DATA
                                        </span>
                                    </div>
                                    {gpsLat !== null && gpsLng !== null ? (
                                        <>
                                            <p className="font-mono text-xs text-green-300">
                                                LAT: {gpsLat.toFixed(6)}
                                            </p>
                                            <p className="font-mono text-xs text-green-300">
                                                LNG: {gpsLng.toFixed(6)}
                                            </p>
                                            <p className="font-mono text-[10px] text-yellow-400 mt-1">
                                                ACC: ±{gpsAccuracy}m
                                            </p>
                                        </>
                                    ) : (
                                        <p className="font-mono text-xs text-yellow-400 animate-pulse">
                                            ACQUIRING SIGNAL...
                                        </p>
                                    )}
                                </div>

                                {/* Timestamp overlay — top right */}
                                <div className="absolute top-12 right-12 bg-black/60 px-3 py-2 border border-orange-800/50">
                                    <span className="font-mono text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                                        {timestamp}
                                    </span>
                                </div>

                                {/* Record indicator */}
                                <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-red-600 animate-pulse"></span>
                                    <span className="font-mono text-xs font-bold text-red-400 uppercase tracking-widest">
                                        LIVE
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Bottom controls */}
            <div className="bg-black/90 border-t-2 border-gray-700 px-4 py-4">
                {capturedPreview ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={retake}
                            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-gray-600 font-mono text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:border-gray-400 transition-all"
                        >
                            <RotateCcw className="h-4 w-4" />
                            RETAKE
                        </button>
                        <button
                            onClick={confirmCapture}
                            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-green-600 bg-green-600/20 font-mono text-sm font-bold uppercase tracking-widest text-green-400 hover:bg-green-600/40 transition-all"
                        >
                            <Camera className="h-4 w-4" />
                            USE PHOTO
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        {/* Switch camera */}
                        <button
                            onClick={switchCamera}
                            className="p-3 border-2 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </button>

                        {/* Capture button */}
                        <button
                            onClick={capturePhoto}
                            disabled={!cameraReady}
                            className="relative h-16 w-16 rounded-full border-4 border-white disabled:border-gray-600 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                            aria-label="Capture geotagged photo"
                        >
                            <div className="absolute inset-1.5 rounded-full bg-white"></div>
                        </button>

                        {/* placeholder for symmetry */}
                        <div className="p-3 w-11"></div>
                    </div>
                )}

                {/* GPS info bar */}
                <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest">
                    <span className={gpsStatus === "locked" ? "text-green-400" : "text-yellow-400"}>
                        {gpsStatus === "locked"
                            ? `📍 ${gpsLat?.toFixed(4)}, ${gpsLng?.toFixed(4)} (±${gpsAccuracy}m)`
                            : gpsStatus === "searching"
                                ? "📡 Acquiring GPS signal..."
                                : "⚠️ GPS unavailable — photo will not be geotagged"}
                    </span>
                    <span className="text-gray-500">CIVIC LENS CAM</span>
                </div>
            </div>
        </div>
    )
}
