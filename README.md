# Civic Autopilot

**Autonomous Disaster Response Operating System**



## Core Vision
Civic Autopilot is an **AI‑powered autonomous city coordination platform** that **simulates** disaster scenarios and **automatically generates** optimized emergency actions in real time. It goes beyond detection – it **orchestrates** evacuation, resource allocation, and traffic management without human lag.

---

## Problem Statement
Current disaster‑response systems focus on **detection** (flood, fire, etc.) but lack the ability to **coordinate** swift, city‑wide actions. Municipal agencies often react too slowly, leading to unnecessary loss of life and resources. Civic Autopilot reduces operational latency by turning raw sensor data into **actionable, AI‑driven orchestration**.

---

## Key Features
- **Manual disaster trigger** (hackathon‑friendly demo mode)
- Dynamic **flood / wildfire spread simulation**
- Real‑time **safest‑evacuation routing** using A* pathfinding
- Intelligent **shelter assignment** based on capacity & demographics
- **Ambulance & rescue scheduling** via OR‑Tools
- **Resource distribution optimisation** (food, medicine, oxygen)
- **Traffic rerouting & signal recommendations** for emergency corridors
- Live **AI agent command centre** orchestrating all modules
- **Explainable AI** explanations powered by LLMs
- Interactive **GIS map visualisation** (Mapbox GL)

---

## Technology Stack
### Frontend
- **Next.js** – React framework with SSR for SEO & fast navigation
- **Tailwind CSS** – Utility‑first styling, dark‑mode ready
- **Framer Motion** – Smooth micro‑animations & motion graphics
- **Mapbox GL JS** – High‑performance GIS rendering
- **Recharts** – Dynamic charts for resource dashboards

### Backend
- **FastAPI** (Python) – Async API layer
- **OSMnx / NetworkX** – Road‑network graph construction & analysis
- **OR‑Tools** – Vehicle‑routing & linear optimisation
- **GeoPandas** – Spatial data handling
- **SimPy** – Discrete‑event simulation of disaster spread

### AI & ML
- **LangGraph** – Orchestrates multi‑agent LLM workflows
- **Groq API (DeepSeek / Llama‑3)** – Real‑time inference for explanations
- **XGBoost** – Lightweight predictive models (optional)
- **Florence‑2 / YOLOv8** – Optional visual damage assessment

### Database & Deployment
- **Supabase / PostgreSQL** – Managed PostGIS for spatial queries
- **Vercel** (frontend) & **Render** (backend) – Serverless, auto‑scaling deployments

---

## Data Sources
- **OpenStreetMap** – Road network, hospitals, shelters
- **OpenWeather API** – Live precipitation & wind data
- **NASA SRTM** – Elevation for flood risk
- **WorldPop** – Population density layers
- **Kaggle disaster datasets** – Historical event patterns

---
