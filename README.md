# RideBuddy — Community-Driven & AI-Verified Safe Navigation

RideBuddy is a unified, full-stack Next.js web application for real-time road hazard reporting, safety-scored navigation, and municipal operations management.

---

## 🌟 Key Features

### 1. 🛣️ Citizen Navigation & Live Hazards (`/`)
- **Interactive Map**: Live spatial map rendered via MapLibre GL with customizable vector styles.
- **Hazard-Aware Routing**: Evaluates driving alternatives from OSRM against active database hazards within the bounding box, calculating penalty delay scores and ranking the safest path.
- **Turn-by-Turn & Voice Alerts**: Audio and visual navigation instructions with real-time proximity warnings for upcoming road hazards.
- **4-Step Hazard Reporting**:
  1. Hazard type selection (Pothole, Flood, Accident, Roadblock, Debris, Speed Breaker, Patch work, Low Light, Others).
  2. Photo capture.
  3. Real-time GPS location confirmation.
  4. Instant duplicate check within 30m and **Google Gemini Vision AI** image validation.
- **Offline Resilience & PWA**: Service worker caching and notification support.
- **User Milestones**: Personal dashboard (`/dashboard`) tracking total contributions and milestone badges.

### 2. 🏛️ Government & Municipal Operations Portal (`/gov`)
- **Executive Dashboard (`/gov`)**: Real-time aggregate statistics for active, in-progress, and resolved road hazards.
- **Hazard Records (`/gov/hazards`)**: Filterable management table by status (`active`, `in_progress`, `resolved`) and hazard type.
- **Spatial Map & Radar (`/gov/map`)**: Full-screen spatial map with color-coded status pins and nearest unresolved hazard distance calculator.
- **Hazard Lifecycle Panel**: Detail drawer with mini map preview, coordinates, AI verification confidence score, and status advance buttons (`active` → `in_progress` → `resolved`).
- **Role-Based Access Control**: Protected via JWT with `role === 'official'`.

### 3. ⚡ Native Full-Stack API (`/api/*`)
- Eliminates external server dependencies by running all backend endpoints natively in Next.js App Router Route Handlers.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router + Turbopack) |
| **Frontend** | React 19, TypeScript, TailwindCSS, MapLibre GL, Turf.js |
| **State & Data** | React Hooks, TanStack React Query |
| **Backend & Routing** | Next.js Route Handlers (`app/api/*`), OSRM Engine, Axios |
| **Database** | PostgreSQL (`pg` pool) with automatic SSL adaptation |
| **Authentication** | Custom Bcrypt password hashing + JWT tokens (7-day duration) |
| **AI Verification** | Google Gemini Vision AI (`@google/generative-ai`) |

---

## ⚙️ Environment Configuration

Create `.env.local` inside the `ride_buddy` directory:

```env
# PostgreSQL Connection String (Neon, Supabase, RDS, or local)
DATABASE_URL=postgresql://username:password@localhost:5432/ridebuddy

# JWT Secret for token signing
JWT_SECRET=super-secure-jwt-secret-replace-in-production

# Google Gemini API Key for image validation (Optional: skips gracefully if omitted)
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# MapTiler Key for MapLibre tiles (Optional: falls back to demo tiles)
NEXT_PUBLIC_MAPTILER_KEY=

# API URL (Leave blank for relative Next.js routing)
NEXT_PUBLIC_API_URL=
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Run the consolidated SQL migration from `migrations/001_init_schema.sql` on your PostgreSQL database.

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- **Citizen Map**: `http://localhost:3000/`
- **Citizen Login**: `http://localhost:3000/login`
- **Citizen Dashboard**: `http://localhost:3000/dashboard`
- **Government Portal**: `http://localhost:3000/gov`
- **Government Login**: `http://localhost:3000/gov/login`

### 4. Build for Production
```bash
npm run build
npm run start
```
