<p align="center">
  <h1 align="center">🔴 CIVIC LENS</h1>
  <p align="center"><strong>AI-Powered Disaster Intelligence Platform</strong></p>
  <p align="center">
    <em>Turn every smartphone into a field sensor. Every citizen into a first responder. Every data point into a life-saving decision.</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Gemini_2.5_Flash-blue?style=for-the-badge&logo=google" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/Frontend-Next.js_16-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Maps-Leaflet.js-199900?style=for-the-badge&logo=leaflet" alt="Leaflet"/>
  <img src="https://img.shields.io/badge/Status-Production_Ready-brightgreen?style=for-the-badge" alt="Status"/>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Setup Guide](#-setup-guide)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [External APIs](#-external-apis)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌍 Overview

**Civic Lens** is a dual-interface disaster intelligence platform that bridges citizens on the ground with government crisis response teams. Citizens report ground-level conditions via geotagged photos, GPS, and voice recordings. Google Gemini 2.5 Flash AI analyzes these multi-modal inputs in real-time, generating severity assessments, broadcast directives, and predictive simulations — all surfaced through an operational command dashboard.

### Two Interfaces

| Interface | URL | Purpose |
|-----------|-----|---------|
| **Citizen Portal** | `https://localhost:3001` | Mobile-first reporting with geotagged camera, voice SOS, offline support |
| **Government Dashboard** | `https://localhost:3001/dashboard` | 5-tab command center with live maps, AI intelligence, analytics |

---

## 🚀 Key Features

### Citizen Portal (14 Features)
- 📸 **Geotagged Live Camera** — Full-screen viewfinder with GPS watermark burned into photos
- 🎙️ **Voice SOS Recording** — Hold-to-record audio messages
- 📡 **Offline Mode** — Reports cached locally, auto-synced when network returns
- 🧠 **Real-time AI Assessment** — Gemini analyzes photo + text, returns severity & broadcast
- 🔊 **Audio Dispatch** — ElevenLabs TTS converts AI assessment to voice alerts
- 🌐 **Bilingual Broadcast** — Emergency messages in English + Tamil

### Government Dashboard (35+ Features)
- 🗺️ **Dark Satellite Map** — CartoDB Dark Matter tiles with severity-colored pulse markers
- 🔥 **Heatmap Layer** — Incident density visualization weighted by severity
- 🤝 **Crowd Verification** — Auto-clusters 3+ reports within 5km → escalates to CRITICAL
- 🔄 **Status Workflow** — NEW → VERIFIED → DISPATCHED → RESOLVED lifecycle
- 🌤️ **Live Weather** — OpenWeatherMap integration with real-time data
- 🌍 **USGS Earthquake Feed** — Real-time seismic monitoring near India
- 🫁 **Air Quality Index** — Live AQI from World Air Quality Index
- 📊 **Analytics Dashboard** — Severity breakdown, status pipeline, city analysis, hazard distribution
- 🏥 **Healthcare Forecasting** — Hospital loads, ICU beds, ambulance estimates
- 📦 **Supply Chain Tracking** — Relief supplies + warehouse utilization
- 🧠 **AI Commander** — Generates tactical rescue plans from all active reports
- 🔮 **Predictive Simulation** — AI-modeled disaster spread over configurable hours

---

## 🏗️ Architecture

```
                    ┌──────────────────────┐
                    │   CITIZEN PORTAL     │
                    │  (Next.js — Mobile)  │
                    │                      │
                    │  📸 GeoTag Camera    │
                    │  🎙️ Voice SOS       │
                    │  📡 Offline Queue    │
                    └──────────┬───────────┘
                               │ HTTPS POST
                    ┌──────────▼───────────┐
                    │   FASTAPI BACKEND    │
                    │   (Python :8001)     │
                    │                      │
                    │  🧠 Gemini 2.5 Flash │
                    │  🤝 Crowd Verify     │
                    │  📊 Analytics Engine │
                    └──┬───┬───┬───┬───┬──┘
                       │   │   │   │   │
          ┌────────────┘   │   │   │   └────────────┐
          ▼                ▼   ▼   ▼                ▼
     OpenWeather       USGS  WAQI  ElevenLabs    Gemini
       (Weather)     (Quakes)(AQI)  (TTS)        (AI)
                    ┌──────────┴───────────┐
                    │  GOV DASHBOARD       │
                    │  (Next.js — Desktop) │
                    │                      │
                    │  5 Tabs: Command,    │
                    │  Predict, Reports,   │
                    │  AURA Intel,         │
                    │  Analytics           │
                    └──────────────────────┘
```

---

## 📦 Prerequisites

| Requirement | Version | Note |
|-------------|---------|------|
| **Node.js** | 18+ | Required for Next.js frontend |
| **Python** | 3.10+ | Required for FastAPI backend |
| **pip** | Latest | Python package manager |
| **Google Gemini API Key** | — | Get from [Google AI Studio](https://aistudio.google.com/apikey) |
| **OpenSSL** (optional) | — | Only if you need to regenerate SSL certificates |

### Optional API Keys
| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **ElevenLabs** | Voice audio alerts | 10,000 chars/month free |
| **OpenWeatherMap** | Live weather data | Falls back to simulated data |
| **WAQI** | Air quality | Falls back to estimated data |
| **USGS** | Earthquake data | Completely free, no key needed |

---

## 🛠️ Setup Guide

### Step 1: Clone the Repository

```bash
git clone <repo-url>
cd "CIVIC LENS"
```

### Step 2: Generate SSL Certificates

SSL is required for camera and GPS access in the browser.

```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

> **Already have certs?** Place `key.pem` and `cert.pem` in the `certs/` directory.

### Step 3: Set Up the Backend

```bash
cd civic-lens-crisis

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `.env` with your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here       # optional
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here      # optional
```

> **Get a Gemini API key free:** [Google AI Studio](https://aistudio.google.com/apikey)

### Step 4: Set Up the Frontend

```bash
cd ../civic-lens-ui

# Install dependencies
npm install
```

### Step 5: Start the Platform

Open **two terminals**:

**Terminal 1 — Backend (Port 8001):**
```bash
cd civic-lens-crisis
venv\Scripts\activate   # or source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --ssl-keyfile ../certs/key.pem --ssl-certfile ../certs/cert.pem
```

**Terminal 2 — Frontend (Port 3001):**
```bash
cd civic-lens-ui
npm run dev
```

### Step 6: Access the Platform

| Page | URL |
|------|-----|
| Citizen Portal | `https://localhost:3001` |
| Government Dashboard | `https://localhost:3001/dashboard` |
| API Health Check | `https://localhost:8001` |

> ⚠️ **SSL Warning:** Your browser will show a certificate warning (self-signed). Click **Advanced → Proceed** to continue. This is normal and required for camera/GPS access.

### Mobile Access (Same Wi-Fi)

Find your PC's IP address:
```bash
# Windows
ipconfig
# Look for IPv4 Address, e.g., 192.168.1.5
```

Then on your phone, open: `https://192.168.1.5:3001`

---

## 📱 Usage

### Citizen: Submit a Report

1. Open `https://localhost:3001` on your phone
2. *(Optional)* Hold **"🎤 HOLD TO RECORD SOS"** to record a voice message
3. Tap **"🔴 LIVE CAMERA"** to open the geotagged camera
   - Wait for 🟢 GPS LOCKED indicator
   - Point at the hazard → tap the white capture button
   - Review → tap **USE PHOTO** (GPS watermark is burned in)
4. GPS auto-populates — or tap **GPS** button to manually lock
5. Select hazard type: **FIRE / FLOOD / COLLAPSE / CHEMICAL / ELECTRIC / OTHER**
6. Type a situation description
7. Tap **"⚠️ SUBMIT EMERGENCY REPORT"**
8. AI Assessment appears in 3-8 seconds with severity + broadcast

### Government: Monitor & Respond

1. Open `https://localhost:3001/dashboard`
2. **Command Center** — Live map, weather, AI Commander, report cards
   - Click report status buttons to update workflow (NEW → VERIFIED → DISPATCHED → RESOLVED)
   - Click **GENERATE PLAN** for AI tactical rescue strategy
   - Click **DISPATCH WHATSAPP/SMS** to broadcast alerts
3. **Predictive Engine** — Configure disaster parameters → run AI simulation
4. **Manage Reports** — Filter by severity, override AI, batch manage
5. **AURA Intel** — View 8 data fusion feeds, explainable AI per report, early warnings, healthcare & supply forecasts
6. **Analytics** — Post-disaster metrics, severity/status distribution, city & hazard breakdowns

### Offline Reporting

1. Disconnect from the internet
2. Orange banner: "⚡ Zero-Connectivity Mode Active"
3. Fill out and submit reports normally — they're queued locally
4. Reconnect → reports auto-sync with "SYNCING OFFLINE MESH DATA..." banner

---

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/api/reports` | All reports with AI assessments |
| `POST` | `/api/report-hazard` | Submit citizen report (multipart form: image, audio, location, hazardType, description, lat, lng) |
| `POST` | `/api/update-report-status` | Update lifecycle (report_id, new_status: NEW/VERIFIED/DISPATCHED/RESOLVED) |

### Intelligence Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/commander` | AI generates tactical rescue plan from all reports |
| `POST` | `/api/simulate-disaster` | Predictive disaster spread simulation |
| `POST` | `/api/verify-rumor` | AI cross-references rumor text against reports |
| `POST` | `/api/dispatch-broadcast` | Simulated WhatsApp/SMS broadcast |

### Data Feed Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/weather/{city}` | Live weather (OpenWeatherMap) |
| `GET` | `/api/seismic` | Live earthquake data (USGS) |
| `GET` | `/api/air-quality/{city}` | Live AQI data (WAQI) |
| `GET` | `/api/analytics` | Aggregated post-disaster analytics |
| `GET` | `/api/early-warning` | 6-source early warning signals |
| `GET` | `/api/healthcare-forecast` | Hospital load + resource forecast |
| `GET` | `/api/supply-status` | Relief supply chain status |

---

## 🌐 External APIs

| API | Usage | Key Required | Fallback |
|-----|-------|:------------:|----------|
| **Google Gemini 2.5 Flash** | Report analysis, simulation, planning | ✅ Yes | — (core feature) |
| **OpenWeatherMap** | Live weather | ⚠️ Optional | Simulated NDMA sensor data |
| **USGS Earthquake Hazards** | Seismic monitoring | ❌ No | "No activity" message |
| **WAQI (Air Quality)** | Live AQI | ⚠️ Optional | Estimated SAFAR data |
| **ElevenLabs** | TTS audio alerts | ⚠️ Optional | "Audio unavailable" fallback |

---

## 📂 Project Structure

```
CIVIC LENS/
├── README.md                          # This file
├── CIVIC_LENS_COMPLETE_GUIDE.md       # Detailed feature guide & pitch doc
├── certs/
│   ├── cert.pem                       # SSL certificate
│   └── key.pem                        # SSL private key
│
├── civic-lens-crisis/                 # 🐍 BACKEND (FastAPI)
│   ├── main.py                        # All API endpoints + AI logic
│   ├── requirements.txt               # Python dependencies
│   ├── .env                           # API keys (gitignored)
│   ├── .env.example                   # Template for .env
│   └── static/                        # Uploaded images & audio files
│
└── civic-lens-ui/                     # ⚛️ FRONTEND (Next.js 16)
    ├── package.json                   # Node dependencies
    ├── next.config.mjs                # Next.js configuration
    ├── app/
    │   ├── page.tsx                   # Citizen Portal (root page)
    │   ├── dashboard/
    │   │   └── page.tsx               # Government Dashboard (5-tab)
    │   ├── layout.tsx                 # Root layout
    │   └── globals.css                # Global styles
    └── components/
        ├── report-hazard.tsx          # Citizen report form
        ├── GeoTaggedCamera.tsx        # Live camera with GPS watermark
        ├── LiveMap.jsx                # Dark map + heatmap + markers
        ├── civilian-header.tsx        # Citizen portal header/nav
        ├── civilian-feed.tsx          # "My Reports" feed
        ├── signal-verification.tsx    # Rumor verification
        ├── status-bar.tsx             # Bottom status bar
        └── ui/                        # Reusable UI components
```

---

## 🔧 Troubleshooting

### "Failed to fetch" errors in console
The backend isn't running or there are multiple zombie processes.
```bash
# Kill all Python processes and restart
# Windows:
taskkill /F /IM python.exe
# Then restart backend:
cd civic-lens-crisis
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --ssl-keyfile ../certs/key.pem --ssl-certfile ../certs/cert.pem
```

### SSL certificate warning
This is expected — self-signed certificates are required for browser camera & GPS APIs.
- **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
- **Mobile Safari**: Settings → General → Profile → Install certificate

### Camera or GPS not working
- Both require **HTTPS** — ensure you're accessing via `https://`, not `http://`
- Camera needs user permission — check browser permission prompt
- GPS may take 5-10 seconds to acquire signal indoors
- On LAN IPs (192.168.x.x), some browsers block GPS — use `localhost` for testing

### Map shows gray/empty tiles
- Check internet connection — map tiles load from CartoDB CDN
- Hard refresh: `Ctrl + Shift + R`

### "\_leaflet\_pos" error
- This is a known Leaflet race condition during zoom — already patched with deferred FitBounds
- If it reappears, hard refresh the page

### Backend crashes on startup
```bash
# Check Python version (need 3.10+)
python --version

# Ensure all dependencies installed
pip install -r requirements.txt

# Check .env file exists with GEMINI_API_KEY
cat .env
```

### Port already in use
```bash
# Windows — find and kill process on port 8001
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Then restart
```

---

## 🧪 Testing

### Quick Smoke Test
```bash
# Backend health check
curl -k https://localhost:8001/

# Fetch reports
curl -k https://localhost:8001/api/reports

# Weather API
curl -k https://localhost:8001/api/weather/Pune

# Seismic data
curl -k https://localhost:8001/api/seismic

# Analytics
curl -k https://localhost:8001/api/analytics
```

### Full Flow Test
1. Open Citizen Portal → Submit a report with photo + GPS
2. Open Dashboard → Verify report appears on map
3. Click status buttons → Update from NEW → VERIFIED → DISPATCHED
4. Check Analytics tab → Verify status pipeline updates
5. Click GENERATE PLAN → Verify AI Commander produces strategy

---

## 👥 Team

Built as part of a disaster management technology initiative using Google Gemini AI.

## 📄 License

This project is developed for educational and civic technology purposes.

---

<p align="center">
  <strong>🔴 CIVIC LENS — Because every second counts in a crisis.</strong>
</p>
