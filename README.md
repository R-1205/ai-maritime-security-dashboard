# AI-Powered Maritime Security & Vessel Monitoring

**AIS Analytics · Anomaly Detection · Trajectory Prediction** — Operational Dashboard (CRP-317)

![Dashboard preview](assets/dashboard-preview.png)

## Overview

Maritime security faces persistent threats — illegal fishing, smuggling, piracy and unauthorized vessel movements. Traditional vessel monitoring often fails to detect unusual activity early or predict where a vessel is heading.

This project implements an AI-powered maritime security and vessel monitoring system built on **Automatic Identification System (AIS)** data analytics, machine learning and deep learning. It ingests vessel identification, position, speed and course data; preprocesses and engineers features; runs five models in parallel; and presents vessel traffic, detected anomalies and forecasts through a monitoring dashboard with rule-based alerting for maritime authorities.

## The Dashboard

A professional maritime domain-awareness console styled as a digital Admiralty chart table, implemented in pure HTML/CSS/JavaScript (no frameworks, no build step).

**Sections**

| Section | What it shows |
|---|---|
| Operational chart | Live vessel contacts with tracks, LSTM forecast path + confidence envelope, DBSCAN cluster hulls, geofenced restricted zone, soundings, graticule |
| Alert queue | Isolation Forest + rule-engine alerts (route deviation, AIS signal gap, loitering, speed anomaly) with severity + ACK workflow |
| Vessel dossier | Identity, classification confidence (Random Forest / CNN), anomaly score gauge vs 0.65 threshold, last AIS fixes |
| Vessel traffic table | All contacts: MMSI, type, position, SOG/COG, classifier output, anomaly score, status |
| Model evaluation | Held-out test-set metrics for all five models |
| Analytics | LSTM track forecast, DBSCAN SOG/COG clustering, anomaly-score distribution, 24 h AIS ingest rate |
| System architecture | End-to-end pipeline diagram incl. retraining feedback loop |

## Models

| Model | Task | Reported metric |
|---|---|---|
| Random Forest | Vessel type classification | Accuracy 96.4% |
| LSTM (2×128 units) | Trajectory prediction | MAE 0.041° / RMSE 0.063° |
| DBSCAN (ε=0.35, minPts=6) | Behaviour clustering | Silhouette 0.71 |
| CNN (5 conv blocks) | Image-based vessel classification | Accuracy 93.7% |
| Isolation Forest (n=300) | Anomaly detection on AIS behaviour | F1 92.7% |

> **Note on data:** vessel traffic, alert events and metric values shown in the dashboard are simulated demo content. Replace `maritime-dashboard/` values with your experimental results and live AIS feed before production use.

## Getting started

```bash
# option 1 — just open it
open index.html            # macOS
xdg-open index.html        # Linux

# option 2 — run it like production (what Railway does)
npm start                  # → http://localhost:3000
```

No dependencies, no build step, works offline (Google Fonts load when online, with local fallbacks).

## Deployment on Railway (railway.com)

The project is Railway-ready out of the box:

- `package.json` → `npm start` runs `server.js` (zero-dependency Node static server)
- `railway.toml` → build/start command, `/health` healthcheck, restart policy
- `Dockerfile` → alternative container build (same `server.js`)
- Listens on `process.env.PORT` — Railway injects it automatically

**Deploy from GitHub (recommended):**

1. Push this repo to GitHub.
2. On [railway.com](https://railway.com): **New Project → Deploy from GitHub repo** → pick the repo.
3. Railway auto-detects Node — build & deploy starts immediately.
4. **Settings → Networking → Generate Domain** → live at `https://<project>.up.railway.app`

**Deploy with the Railway CLI:**

```bash
npm i -g @railway/cli
railway login
railway init          # inside this folder
railway up            # build + deploy
railway domain        # generate a public URL
```

Health check endpoint: `GET /health` → `{ "status": "ok" }`

## Deployment on GitHub Pages (static alternative)

The repository also ships with `.github/workflows/deploy.yml`, which deploys the static files automatically on every push to `main`:

1. Push to GitHub.
2. Repository **Settings → Pages → Source**: select **GitHub Actions**.
3. The dashboard goes live at `https://<user>.github.io/<repo>/`.

## Project structure

```
├── index.html                 # dashboard structure
├── styles.css                 # chart-table design system
├── app.js                     # AIS simulation, canvas chart, analytics
├── server.js                  # zero-dep Node static server (Railway/production)
├── package.json               # npm start → server.js
├── railway.toml               # Railway build/deploy config + healthcheck
├── Dockerfile                 # container build (optional)
├── assets/dashboard-preview.png
└── .github/workflows/deploy.yml   # GitHub Pages (static alternative)
```

## Project details

- **Project code:** CRP-317
- **Team:** Keerthiga K · Jolin Ashika J · Narmadha M
- **Department:** Electronics & Communication Engineering
- **Institution:** IFET College of Engineering, Villupuram, India

## Domains supported

Maritime security · Search & rescue support · Environmental protection · Maritime traffic management · Anti-trafficking operations
