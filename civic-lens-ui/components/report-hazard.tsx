"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, MapPin, Upload, X, AlertTriangle, Crosshair, Video } from "lucide-react"
import { GeoTaggedCamera } from "./GeoTaggedCamera"
import { getApiBaseUrl } from "@/lib/api-config"

export function ReportHazard() {
  // keep the File object separate from the data URL used for preview
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [location, setLocation] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  // GPS coordinates
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [hazardType, setHazardType] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // backend response
  const [assessment, setAssessment] = useState<any | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  // base URL for API; using hostname so phone can call this PC
  const BASE_URL = getApiBaseUrl();
  const fileInputRef = useRef<HTMLInputElement>(null)
  // audio SOS recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // network/offline state
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<FormData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleGetLocation = useCallback(() => {
    setIsLocating(true)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`)
          setIsLocating(false)
        },
        () => {
          setLocation("GEOLOCATION UNAVAILABLE")
          setIsLocating(false)
        }
      )
    } else {
      setLocation("GEOLOCATION NOT SUPPORTED")
      setIsLocating(false)
    }
  }, [])

  // hook: watch network status
  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // hook: sync queued reports when connection returns
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (!isOffline && offlineQueue.length > 0) {
        setIsSyncing(true);
        console.log(`🟢 Network Restored. Syncing ${offlineQueue.length} queued reports...`);

        for (const formData of offlineQueue) {
          try {
            await fetch(`${BASE_URL}/api/report-hazard`, {
              method: "POST",
              body: formData,
            });
            console.log("✅ Offline report successfully synced!");
          } catch (err) {
            console.error("Failed to sync report:", err);
          }
        }

        setOfflineQueue([]);
        setIsSyncing(false);
        alert("CRITICAL: Network restored. All offline SOS reports have been synced with the AI Commander.");
      }
    };

    syncOfflineQueue();
  }, [isOffline, offlineQueue]);

  // audio recording helpers
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop()); // Turn off mic
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access is required for Audio SOS.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // new GPS capture function with high accuracy
  const captureLocation = useCallback(() => {
    setIsLocating(true)

    // geolocation API requires secure context (HTTPS or localhost)
    // On LAN IPs (e.g. http://192.168.x.x) GPS may not work in browsers
    // We still try, and fallback to manual entry if it fails

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toString())
          setLng(position.coords.longitude.toString())
          setLocation(`GPS: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`)
          setIsLocating(false)
        },
        (error) => {
          // error object sometimes comes through empty; show any available details
          const msg = error?.message || "Unknown error"
          const code = error?.code != null ? ` (code ${error.code})` : ""
          console.error(`GPS Error${code}:`, msg, error)
          alert(`Could not lock GPS${code}: ${msg}. Please enter location manually.`)
          setIsLocating(false)
        },
        { enableHighAccuracy: true }
      )
    } else {
      alert("Geolocation is not supported by your browser.")
      setIsLocating(false)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!imageFile) {
      alert("CRITICAL: Image file required before transmission.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      // append the actual File object
      formData.append("image", imageFile);
      if (audioBlob) {
        formData.append("audio", audioBlob, "sos_beacon.webm");
      }
      formData.append("location", location || "Unknown Location");
      formData.append("hazardType", hazardType || "Unspecified");
      formData.append("description", description || "");
      formData.append("lat", lat);
      formData.append("lng", lng);

      // --- THE OFFLINE INTERCEPTOR ---
      if (isOffline) {
        setOfflineQueue(prev => [...prev, formData]);
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setImageFile(null);
          setImagePreview(null);
          setAudioBlob(null);
          setLocation("");
          setHazardType("");
          setDescription("");
        }, 2000);
        return; // Stop execution here!
      }
      // -------------------------------

      // Standard online transmission
      const response = await fetch(`${BASE_URL}/api/report-hazard`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // THIS IS NEW: It catches the exact FastAPI error reason
        const errorBody = await response.json();
        console.error("🚨 FASTAPI REJECTED THE DATA. Reason:", errorBody);
        throw new Error(`Server rejected transmission: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Transmission Successful. AI Response:", data);
      // save useful results for display/playback
      setAssessment(data.assessment);
      setAudioUrl(data.audio_url);
      setSubmitted(true);

      // clear form if you want manual reset; commented out so user can read results
      // setTimeout(() => {
      //   setSubmitted(false);
      //   setImageFile(null);
      //   setImagePreview(null);
      //   setLocation("");
      //   setHazardType("");
      //   setDescription("");
      // }, 2000);

    } catch (error) {
      console.error("Transmission Error:", error);
      alert("CONNECTION FAILED. Check the browser console for details.");
    } finally {
      setIsSubmitting(false);
    }
  }, [imageFile, location, hazardType, description]);

  // removed duplicate submission logic - handled above in handleSubmit

  return (
    <div className="flex flex-col gap-0 p-4 pb-24">
      {/* network status banners */}
      {isOffline && (
        <div className="mb-6 border-4 border-orange-500 bg-orange-500/10 p-4 text-orange-400 font-mono shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center gap-4">
          <span className="h-4 w-4 bg-orange-500 rounded-full animate-ping"></span>
          <div>
            <h3 className="font-black uppercase tracking-widest">Zero-Connectivity Mode Active</h3>
            <p className="text-sm">Network lost. Reports will be cached locally and auto-synced upon reconnection.</p>
            {offlineQueue.length > 0 && (
              <span className="block mt-2 text-xs font-bold text-white bg-orange-600 px-2 py-1 max-w-max">
                QUEUED SOS BEACONS: {offlineQueue.length}
              </span>
            )}
          </div>
        </div>
      )}

      {isSyncing && (
        <div className="mb-6 border-4 border-green-500 bg-green-500/10 p-4 text-green-400 font-mono flex items-center gap-4">
          <span className="h-4 w-4 bg-green-500 animate-spin"></span>
          <h3 className="font-black uppercase tracking-widest">SYNCING OFFLINE MESH DATA...</h3>
        </div>
      )}

      {/* Section Label */}
      <div className="mb-4 border-b-2 border-foreground pb-2">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
          REPORT HAZARD
        </h2>
        <p className="font-mono text-xs uppercase text-muted-foreground">
          CAPTURE // LOCATE // TRANSMIT
        </p>
      </div>

      {/* optional audio SOS recorder */}
      <div className="flex flex-col gap-2 mt-4">
        <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">
          Optional: Voice SOS Beacon
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-4 border-2 font-black uppercase tracking-widest transition-all w-full flex justify-center items-center gap-2 ${isRecording
              ? "border-crisis-red bg-crisis-red text-white animate-pulse"
              : audioBlob
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-gray-600 bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
          >
            {isRecording ? "🎤 RECORDING... RELEASE TO STOP" : audioBlob ? "✅ SOS RECORDED (HOLD TO OVERWRITE)" : "🎤 HOLD TO RECORD SOS"}
          </button>

          {audioBlob && (
            <button
              type="button"
              onClick={() => setAudioBlob(null)}
              className="text-crisis-red underline text-xs font-mono uppercase"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {/* GeoTagged Camera Modal */}
      {showCamera && (
        <GeoTaggedCamera
          onCapture={(file, capturedLat, capturedLng, accuracy) => {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result as string)
            reader.readAsDataURL(file)
            if (capturedLat) setLat(capturedLat)
            if (capturedLng) setLng(capturedLng)
            if (capturedLat && capturedLng) {
              setLocation(`GPS: ${parseFloat(capturedLat).toFixed(5)}, ${parseFloat(capturedLng).toFixed(5)} (±${accuracy}m)`)
            }
            setShowCamera(false)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="mb-4 relative">
        <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-crisis-yellow">
          01 // VISUAL EVIDENCE
        </label>
        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Captured hazard evidence"
              className="h-56 w-full object-cover sm:h-72"
            />
            <button
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
              }}
              className="absolute right-2 top-2 border-2 border-foreground bg-background p-1.5 text-foreground hover:bg-crisis-red"
              aria-label="Remove captured image"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-3 py-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-crisis-green">
                ✓ IMAGE CAPTURED
              </span>
              {lat && lng && (
                <span className="font-mono text-[10px] uppercase text-green-400">
                  📍 GEOTAGGED
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Live Camera Button */}
            <button
              onClick={() => setShowCamera(true)}
              className="flex h-56 w-1/2 flex-col items-center justify-center gap-3 border-2 border-red-600 bg-red-950/30 transition-colors hover:bg-red-900/40 sm:h-72"
              aria-label="Open geotagged camera"
            >
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center border-2 border-red-500 bg-red-900/50">
                  <Video className="h-7 w-7 text-red-400" />
                </div>
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
              </div>
              <div className="text-center">
                <p className="font-mono text-sm font-bold uppercase text-red-400">
                  LIVE CAMERA
                </p>
                <p className="font-mono text-[9px] uppercase text-red-400/60">
                  AUTO GPS WATERMARK
                </p>
              </div>
            </button>

            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-56 w-1/2 flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground bg-secondary transition-colors hover:border-foreground hover:bg-accent sm:h-72"
              aria-label="Upload hazard photo"
            >
              <div className="flex h-14 w-14 items-center justify-center border-2 border-gray-600">
                <Upload className="h-7 w-7 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="font-mono text-sm font-bold uppercase text-foreground">
                  UPLOAD FILE
                </p>
                <p className="font-mono text-[9px] uppercase text-muted-foreground">
                  JPG / PNG / WEBP
                </p>
              </div>
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="sr-only"
          aria-label="File input for hazard photo"
        />
      </div>

      {/* Geolocation Input */}
      <div className="mb-4">
        <label
          htmlFor="geo-input"
          className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-crisis-yellow"
        >
          02 // GEOLOCATION
        </label>
        <div className="flex gap-0">
          <div className="relative flex-1 border-2 border-foreground">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="geo-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="COORDINATES OR ADDRESS"
              className="h-12 w-full bg-input pl-10 pr-4 font-mono text-sm uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-crisis-red"
            />
          </div>
          <button
            onClick={captureLocation}
            disabled={isLocating}
            className="flex h-12 items-center gap-2 border-2 border-l-0 border-foreground bg-crisis-surface-elevated px-4 font-mono text-xs font-bold uppercase text-foreground transition-colors hover:bg-crisis-red disabled:opacity-50"
            aria-label="Get GPS Location"
          >
            <Crosshair className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isLocating ? "LOCATING..." : "GPS"}</span>
          </button>
        </div>
        {lat && lng && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Coordinates: {lat}, {lng}
          </p>
        )}
      </div>

      {/* Hazard Type */}
      <div className="mb-4">
        <label
          htmlFor="hazard-type"
          className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-crisis-yellow"
        >
          03 // HAZARD CLASSIFICATION
        </label>
        <div className="grid grid-cols-3 gap-0 border-2 border-foreground">
          {[
            { id: "fire", label: "FIRE" },
            { id: "flood", label: "FLOOD" },
            { id: "collapse", label: "COLLAPSE" },
            { id: "chemical", label: "CHEMICAL" },
            { id: "electrical", label: "ELECTRIC" },
            { id: "other", label: "OTHER" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setHazardType(type.id)}
              className={`border border-border px-2 py-3 font-mono text-[11px] font-bold uppercase transition-colors ${hazardType === type.id
                ? "bg-crisis-red text-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label
          htmlFor="description-input"
          className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-crisis-yellow"
        >
          04 // SITUATION BRIEF
        </label>
        <textarea
          id="description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="DESCRIBE THE HAZARD CONDITION..."
          rows={3}
          className="w-full resize-none border-2 border-foreground bg-input p-3 font-mono text-sm uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-crisis-red"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || submitted}
        className={`flex w-full items-center justify-center gap-3 border-3 px-6 py-5 font-mono text-base font-bold uppercase tracking-wider transition-all ${submitted
          ? "border-crisis-green bg-crisis-green text-background"
          : isSubmitting
            ? "border-crisis-yellow bg-crisis-yellow text-background animate-crisis-pulse"
            : "border-crisis-red bg-crisis-red text-foreground hover:bg-crisis-red-bright active:scale-[0.98]"
          }`}
        aria-label="Submit emergency hazard report"
      >
        <AlertTriangle className="h-5 w-5" />
        {submitted
          ? "REPORT TRANSMITTED"
          : isSubmitting
            ? "TRANSMITTING..."
            : "SUBMIT EMERGENCY REPORT"}
      </button>

      {/* --- AI DISASTER ASSESSMENT RESULTS --- */}
      {assessment && (
        <div className="mt-8 border-4 border-crisis-red bg-black p-6 text-white shadow-2xl">

          <div className="flex items-center justify-between border-b-2 border-gray-700 pb-4">
            <h2 className="text-2xl font-black uppercase tracking-widest text-crisis-red">
              AI Hazard Assessment
            </h2>
            <span className={`px-4 py-1 text-sm font-bold uppercase tracking-wider ${assessment.severity === 'Critical' ? 'bg-red-600 animate-pulse' :
              assessment.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500 text-black'
              }`}>
              Severity: {assessment.severity}
            </span>
          </div>

          <div className="mt-4 space-y-4 font-mono">
            <div>
              <h3 className="text-gray-400 text-sm uppercase">Technical Summary</h3>
              <p className="text-lg font-medium">{assessment.summary}</p>
            </div>

            <div className="bg-gray-900 p-4 border-l-4 border-blue-500">
              <h3 className="text-blue-400 text-sm uppercase mb-1">Broadcast Directive (English)</h3>
              <p>{assessment.broadcast_english}</p>
            </div>

            <div className="bg-gray-900 p-4 border-l-4 border-green-500">
              <h3 className="text-green-400 text-sm uppercase mb-1">Local Broadcast (Tamil)</h3>
              <p>{assessment.broadcast_local}</p>
            </div>
          </div>

          {/* ELEVENLABS AUDIO PLAYER */}
          {audioUrl ? (
            <div className="mt-6 border-t-2 border-gray-700 pt-6">
              <h3 className="text-sm font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                Live Audio Dispatch
              </h3>
              <audio
                controls
                autoPlay
                className="w-full h-12 rounded-none grayscale"
                src={audioUrl}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : (
            <div className="mt-6 border-t-2 border-gray-700 pt-6">
              <p className="text-sm font-mono uppercase text-gray-500">
                ⚠️ Audio dispatch unavailable — TTS credits exhausted
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
