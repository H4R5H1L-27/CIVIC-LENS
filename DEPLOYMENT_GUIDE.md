# CIVIC LENS — Deployment Guide

## Architecture Overview

```
┌───────────────────┐         ┌───────────────────┐
│   VERCEL           │         │   RENDER.COM       │
│   (Frontend)       │ ──API──▶│   (Backend)        │
│                    │         │                    │
│ civic-lens-ui/     │         │ civic-lens-crisis/ │
│ Next.js 16         │         │ FastAPI + Python   │
│                    │         │                    │
│ Free HTTPS ✅      │         │ Free HTTPS ✅      │
│ Global CDN ✅      │         │ Auto-sleep free ✅  │
└───────────────────┘         └───────────────────┘
```

**SSL Certificates**: You do NOT need the self-signed certs for production. 
Vercel and Render both provide free auto-provisioned SSL (Let's Encrypt).  
The `certs/` folder is only for local development.

---

## Step 1: Deploy Backend to Render.com

### 1a. Create a GitHub Repository

```bash
cd "CIVIC LENS/civic-lens-crisis"
git init
git add .
git commit -m "Initial backend deployment"
git remote add origin https://github.com/YOUR_USERNAME/civic-lens-api.git
git push -u origin main
```

### 1b. Deploy on Render

1. Go to [render.com](https://render.com) → Sign up / Log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (`civic-lens-api`)
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `civic-lens-api` |
| **Region** | Oregon (US West) or Singapore (closest to India) |
| **Branch** | `main` |
| **Runtime** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

5. Add **Environment Variables** (Settings → Environment):

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `ELEVENLABS_API_KEY` | Your ElevenLabs key (optional) |
| `ELEVENLABS_VOICE_ID` | Your voice ID (optional) |
| `PYTHON_VERSION` | `3.11.0` |

6. Click **"Create Web Service"**
7. Wait for deploy (~3-5 minutes)
8. Your backend URL will be: `https://civic-lens-api.onrender.com`

### 1c. Verify Backend

```bash
curl https://civic-lens-api.onrender.com/
# Should return: {"status": "System Online. Awaiting Crisis Data."}

curl https://civic-lens-api.onrender.com/api/reports
# Should return: {"reports": [...], "count": 35}
```

---

## Step 2: Deploy Frontend to Vercel

### 2a. Create GitHub Repo for Frontend

```bash
cd "CIVIC LENS/civic-lens-ui"
git init
git add .
git commit -m "Initial frontend deployment"
git remote add origin https://github.com/YOUR_USERNAME/civic-lens-ui.git
git push -u origin main
```

### 2b. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your `civic-lens-ui` repo
4. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `.` (leave default) |
| **Build Command** | `next build` (auto-detected) |
| **Output Directory** | `.next` (auto-detected) |

5. Add **Environment Variable**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://civic-lens-api.onrender.com` |

   ⚠️ **Use your actual Render URL** from Step 1

6. Click **"Deploy"**
7. Wait ~2-3 minutes
8. Your frontend URL: `https://civic-lens-ui.vercel.app`

### 2c. Verify Frontend

1. Open `https://civic-lens-ui.vercel.app` → Citizen Portal loads
2. Open `https://civic-lens-ui.vercel.app/dashboard` → Government Dashboard loads
3. Reports should appear on the map from the Render backend

---

## Step 3: Post-Deployment Verification

### Checklist

| Test | Expected Result |
|------|----------------|
| Open Citizen Portal | Report form loads with camera + upload buttons |
| Open Dashboard | 5-tab interface with map + reports |
| Submit a report | AI assessment returns (Gemini connection) |
| Click GPS button | Browser asks for location permission |
| Open Live Camera | Camera viewfinder opens with GPS overlay |
| Check AURA Intel tab | 8 data fusion feeds show status |
| Check Analytics tab | Metrics + charts render |
| Check Early Warnings | Weather + seismic data loads |

### Troubleshooting

**Reports not loading on dashboard?**
- Check browser console for CORS errors  
- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel (no trailing slash)
- Check Render backend is running (not in sleep mode)

**Camera not working?**
- Camera requires HTTPS — both Vercel and Render provide this automatically ✅
- Check that you granted camera permission in the browser

**Backend sleeping (Render free tier)?**
- Free tier sleeps after 15 min of inactivity
- First request after sleep takes ~30 seconds to cold-start
- Solution: Upgrade to paid ($7/month) or use an uptime monitor like UptimeRobot to ping every 14 minutes

**Images not showing?**
- Uploaded images are stored on Render's ephemeral filesystem
- They will be lost on redeploy or sleep cycle
- For production: Use Cloudinary, AWS S3, or Firebase Storage for persistent image hosting

---

## Custom Domain (Optional)

### Vercel (Frontend)
1. Go to Project → Settings → Domains
2. Add your domain: `civiclens.in`
3. Update your DNS CNAME: `civiclens.in → cname.vercel-dns.com`
4. SSL auto-provisions via Let's Encrypt

### Render (Backend)
1. Go to Service → Settings → Custom Domains
2. Add your domain: `api.civiclens.in`
3. Update DNS CNAME: `api.civiclens.in → civic-lens-api.onrender.com`
4. SSL auto-provisions

Then update Vercel env var:
```
NEXT_PUBLIC_API_URL=https://api.civiclens.in
```

---

## Alternative: Single-Server Deployment (VPS)

If you prefer deploying both frontend and backend on a single VPS
(DigitalOcean, AWS EC2, Oracle Cloud free tier):

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js 18+ and Python 3.11+
# Clone your repo
git clone https://github.com/YOUR_USERNAME/civic-lens.git
cd civic-lens

# Backend setup
cd civic-lens-crisis
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

# Start backend (use PM2 or systemd for production)
nohup uvicorn main:app --host 0.0.0.0 --port 8001 &

# Frontend setup
cd ../civic-lens-ui
npm install
NEXT_PUBLIC_API_URL=https://your-domain.com:8001 npm run build
npm start -- -p 3001

# Use Nginx as reverse proxy + Let's Encrypt for SSL
# Caddy is even simpler (auto-HTTPS):
# caddy reverse-proxy --from civiclens.in --to :3001
```

---

## Summary

| Component | Platform | URL | SSL |
|-----------|----------|-----|-----|
| Frontend | **Vercel** | `https://civic-lens-ui.vercel.app` | ✅ Auto (Let's Encrypt) |
| Backend | **Render.com** | `https://civic-lens-api.onrender.com` | ✅ Auto (Let's Encrypt) |
| Local Dev | Self-signed | `https://localhost:3001` / `:8001` | ✅ Self-signed certs |

**Self-signed certs from local dev → NOT needed for production.**  
Both platforms provide free, automatic SSL certificates.
