/**
 * Centralized API configuration for Civic Lens.
 * 
 * In DEVELOPMENT: auto-detects hostname + port 8001 (local backend)
 * In PRODUCTION:  uses NEXT_PUBLIC_API_URL environment variable (Render deploy)
 */
export function getApiBaseUrl(): string {
    // If a production API URL is set, use it
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // Fallback: local development — same hostname, port 8001
    if (typeof window !== "undefined") {
        return `${window.location.protocol}//${window.location.hostname}:8001`;
    }

    return "https://localhost:8001";
}
