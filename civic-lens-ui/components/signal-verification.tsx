"use client"

import { useState } from "react"
import { getApiBaseUrl } from "@/lib/api-config"

export function SignalVerification() {
    const [rumorText, setRumorText] = useState("");
    const [debunkerResult, setDebunkerResult] = useState<any | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const BASE_URL = getApiBaseUrl();

    const handleVerifyRumor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rumorText.trim()) return;

        setIsVerifying(true);
        try {
            const formData = new FormData();
            formData.append("rumor_text", rumorText);

            const res = await fetch(`${BASE_URL}/api/verify-rumor`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.status === "success") {
                setDebunkerResult(data.verification);
            }
        } catch (error) {
            console.error("Verification failed:", error);
        } finally {
            setIsVerifying(false);
        }
    }

    return (
        <div className="p-4 pb-24">
            <div className="mb-4 border-b-2 border-foreground pb-2">
                <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                    SIGNAL VERIFICATION
                </h2>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                    VERIFY RUMORS // FIGHT MISINFORMATION
                </p>
            </div>

            <div className="border-4 border-gray-700 bg-black p-6 font-mono text-white shadow-2xl">
                <h2 className="text-xl font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2 mb-4">
                    <span className="text-2xl">👁️</span> Anti-Panic Intelligence
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                    Paste any unverified WhatsApp forward, social media post, or rumor below.
                    Our AI will cross-reference it against verified ground-truth sensor data.
                </p>

                <form onSubmit={handleVerifyRumor} className="flex flex-col gap-4 mb-6">
                    <textarea
                        value={rumorText}
                        onChange={(e) => setRumorText(e.target.value)}
                        placeholder="Paste unverified WhatsApp forward or social media rumor here..."
                        rows={4}
                        className="w-full bg-gray-900 border-2 border-gray-700 p-3 text-white focus:border-yellow-500 focus:outline-none resize-none font-mono text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isVerifying || !rumorText}
                        className={`w-full px-6 py-4 font-bold uppercase tracking-wider transition-all border-2 ${isVerifying
                            ? "border-yellow-500 bg-yellow-500/20 text-yellow-300 animate-pulse"
                            : !rumorText
                                ? "border-gray-600 text-gray-600 cursor-not-allowed"
                                : "border-yellow-500 bg-black text-yellow-500 hover:bg-yellow-900/50"
                            }`}
                    >
                        {isVerifying ? "CROSS-REFERENCING AGAINST GROUND TRUTH..." : "🔍 VERIFY INTEL"}
                    </button>
                </form>

                {/* DEBUNKER RESULTS */}
                {debunkerResult && (
                    <div className={`p-4 border-l-8 ${debunkerResult.status === 'DEBUNKED' ? 'border-crisis-red bg-red-900/20' :
                        debunkerResult.status === 'CONFIRMED' ? 'border-green-500 bg-green-900/20' :
                            'border-gray-500 bg-gray-800'
                        }`}>
                        <div className="flex items-center gap-4 mb-3">
                            <span className={`px-3 py-1 text-sm font-black uppercase tracking-widest text-black ${debunkerResult.status === 'DEBUNKED' ? 'bg-crisis-red text-white' :
                                debunkerResult.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-gray-400'
                                }`}>
                                {debunkerResult.status}
                            </span>
                            <span className="text-gray-400 text-sm">CONFIDENCE: {debunkerResult.confidence}</span>
                        </div>

                        <p className="text-md mb-2"><strong className="text-gray-400">AI Reasoning:</strong> {debunkerResult.reasoning}</p>

                        <div className="mt-4 bg-black p-3 border-2 border-gray-700">
                            <span className="block text-xs text-blue-400 font-bold mb-1 uppercase tracking-widest">Suggested Public Broadcast</span>
                            <p className="text-sm">{debunkerResult.public_statement}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
