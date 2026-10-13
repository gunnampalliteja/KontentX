# Kampus.VC — AI Content Creator Marketplace 🚀
> **Applied AI Venture Studio Challenge**: Connecting Generative AI Creators with Brands & Creative Agencies.

---

## 🌟 Live Application & Quick Start

```bash
# Navigate to the project directory and install dependencies
cd d:\projects\Hackathon\kampus-vc
npm install

# Configure the MongoDB connection:
Copy-Item .env.example .env
# Edit .env with your local MongoDB or Atlas connection details

# Run the Vite frontend and TypeScript API together
npm run dev
# Frontend: http://localhost:5173
# API health: http://localhost:3001/api/health
```

The API expects a reachable MongoDB server. Set `MONGODB_URI` to your local MongoDB URI or Atlas connection string and `MONGODB_DATABASE` to the database name. MongoDB creates the database and collections when the API starts; it creates the required indexes and seeds demo data on the first startup.

The API seeds the demo marketplace data and demo accounts on first startup:

- Creator: `creator@demo.com` / `demo123`
- Brand: `brand@demo.com` / `demo123`

MongoDB connection settings are configured through environment variables; see [.env.example](./.env.example). `npm run build` type-checks and builds both the frontend and API. Run the compiled API with `npm run start:api`.

### Backend

The backend is a Node.js 24, TypeScript, and Express API backed by MongoDB through a single reusable `MongoClient`. Creator account and profile data are embedded in one document; briefs, proposals, sessions, and saved-creator relationships live in separate collections to keep independently queried or potentially growing data bounded. Indexes enforce unique emails and one proposal per creator per brief, and a TTL index expires old sessions. Authentication uses bcrypt password hashes and opaque, hashed server-side session tokens delivered in HTTP-only, same-site cookies. Zod validates incoming API payloads; Helmet and rate limits provide baseline HTTP and authentication hardening. The MongoDB driver's default connection-pool settings are retained until deployment workload and connection metrics justify tuning; monitor driver pool wait events and MongoDB `connections.current` across all API instances before changing them.

The Vite development server proxies `/api` to port 3001. In production, route `/api` to the API process through the deployment's same-origin reverse proxy and serve the Vite `dist` directory separately. Configure MongoDB backups, availability, and access controls for the deployment environment. Data from the former SQLite implementation is not automatically migrated; export and import it separately if it contains data you need to keep.

Core API routes include `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/creators`, `GET /api/briefs`, `POST /api/briefs`, `POST /api/briefs/:id/applications`, `PATCH /api/applications/:id/status`, and `/api/me/saved-creators`.

---

## 🎯 Challenge Requirements & Evaluation Matrix Checklist

| Criterion | Weight | Built Features & Implementation in Kampus.VC | Status |
| :--- | :---: | :--- | :---: |
| **Creator Profiles & AI Portfolios** | **30%** | • Rich creator profiles showcasing AI videos, 3D renders, animations, and graphics.<br>• Transparent tool disclosure (Sora, Runway Gen-3, Midjourney, ComfyUI, Kling).<br>• Documented generation pipeline (e.g., *Prompt ideation → Sora camera tracking → DaVinci color grading*).<br>• Prompt blueprints inspection & copy.<br>• Commercial licensing badges & client history. | ✅ **100% Complete** |
| **Brief Definition** | **20%** | • Structured briefs capturing campaign requirements, audience, timeline, budget.<br>• **Format & Aspect Ratios**: Multi-ratio support (`16:9`, `9:16`, `1:1`, `4:5`, resolution 4K/8K, duration).<br>• **Commercial-Use Terms**: Exclusivity (Exclusive buyout, Non-exclusive, Limited), license duration, territory, platforms.<br>• Deliverable milestone checklists. | ✅ **100% Complete** |
| **Discovery & Filtering** | **25%** | • Multi-facet search across skills, specializations, AI tools, and content types.<br>• Verified-only toggle, rating slider, budget/hourly rate filter, availability status.<br>• Sensible empty-state handling with one-click filter reset.<br>• Bookmark / Save Creator shortlist for brands. | ✅ **100% Complete** |
| **User Experience (PC & Mobile)** | **15%** | • Dark glassmorphism aesthetic inspired by modern AI studios.<br>• Fully responsive across PC, tablet, and mobile devices.<br>• **Distinct role-based experience**: Dedicated Creator Portal vs Brand/Agency Hub with separate dashboards, proposal management, and milestone releases.<br>• Fast 1-click demo role switcher in navbar. | ✅ **100% Complete** |
| **Presentation & Demo** | **10%** | • Interactive 5-slide Pitch Deck & Data Model viewer (`/demo-deck`) built right into the app.<br>• Complete data model documentation. | ✅ **100% Complete** |
| **BONUS: Verification Signals** | **+5%** | • **Creator Verification Signals**: Visible trust indicators for verified tools, repeatable workflows, and authenticated client past work. Simulation benchmark test engine. | ✅ **Earned** |
| **BONUS: AI Brief Builder** | **+5%** | • **AI-Assisted Brief Builder**: Transforms rough unformatted prompts (e.g. *"We need cyberpunk TikTok reels for energy drink"*) into complete structured briefs with deliverables, aspect ratios, tools, and buyout terms. | ✅ **Earned** |

---

## 🏛️ Data Model Architecture

The data model is engineered specifically for generative AI content creation workflows:

### 1. `CreatorProfile` & `PortfolioItem` Data Model
```typescript
interface CreatorProfile {
  id: string;
  name: string;
  tagline: string;
  bio: string;
  location: string;
  hourlyRate: number;
  skills: string[];                      // e.g. ['AI Filmmaking', 'Motion Graphics', 'Temporal Consistency']
  specializations: string[];             // e.g. ['Brand Films', 'Product Visualization']
  tools: AITool[];                       // e.g. [{ name: 'OpenAI Sora', verified: true, proficiency: 'expert' }]
  portfolioItems: PortfolioItem[];       // Transparent generation work
  verifications: Verification[];         // Trust badges (tool, workflow, identity)
  availability: 'available' | 'busy' | 'unavailable';
  rating: number;
  completedProjects: number;
}

interface PortfolioItem {
  id: string;
  title: string;
  type: 'video' | 'animation' | 'image' | '3d' | 'graphic';
  thumbnail: string;
  tools: string[];                       // Tools used for this specific piece
  workflow: string;                      // Full multi-step pipeline description
  prompt?: string;                       // Prompt blueprint
  commercialLicense: boolean;            // Cleared for commercial advertising
  clientName?: string;
}
```

### 2. `Brief` & `CommercialUse` Data Model
```typescript
interface Brief {
  id: string;
  brandName: string;
  title: string;
  description: string;
  contentType: string[];                 // e.g. ['Product Video', 'Social Creatives']
  style: string[];                       // e.g. ['Futuristic', 'Minimalist', 'Neon']
  format: Format[];                      // Multi-aspect ratio deliverables
  budget: BudgetRange;                   // min, max, currency, fixed/hourly
  timeline: string;
  deliverables: string[];                // Deliverable milestone checklist
  commercialUse: CommercialUse;          // Legal rights and licensing
  requiredTools?: string[];              // Preferred AI models
  requiredSkills: string[];
  aiGenerated?: boolean;                 // Generated via AI Brief Builder
  rawIdea?: string;                      // Original rough prompt
}

interface Format {
  aspectRatio: string;                   // '16:9' | '9:16' | '1:1' | '4:5' | '3:2'
  resolution: string;                    // '4K', '1080p 60fps', '8K'
  duration?: string;                     // e.g. '15s', '60s'
}

interface CommercialUse {
  allowed: boolean;
  exclusivity: 'exclusive' | 'non-exclusive' | 'limited';
  licenseDuration: string;               // e.g. '1 year', 'Perpetual'
  territory: string;                     // e.g. 'Worldwide'
  platforms: string[];                   // e.g. ['TikTok', 'Instagram', 'TV', 'Digital Ads']
}
```

---

## 👥 Distinct User Role Capabilities

### 🎨 1. Content Creator Role
- **Showcase AI Portfolios**: Add new artwork with tools, generation pipeline steps, and prompt blueprints.
- **Earn Verification Signals**: Take benchmark tool audits for OpenAI Sora, Runway Gen-3, ComfyUI, etc.
- **Browse Campaign Briefs**: Filter by budget, content format, and style; apply with customized quotes and attached portfolio proof.
- **Manage Engagements**: Track milestone status (`in_progress` → `submitted` → `approved`), upload asset URLs, and receive escrow payouts.

### 🏢 2. Brand / Agency Owner Role
- **AI-Assisted Brief Builder**: Turn rough ideas into structured briefs with 1-click AI generation.
- **Discover & Filter Creators**: Multi-filter by tool proficiency, hourly rate, rating, verification signals, and availability.
- **Review Creator Proposals**: Evaluate candidate pitches, inspect attached generative artwork, and shortlist/hire creators.
- **Milestone Delivery & Escrow Release**: Review submitted video/image assets, provide revision feedback, and release escrow upon milestone approval.
- **Saved Creators**: Bookmark top AI artists for upcoming campaigns.

---

## 🛠️ Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Dark Glassmorphic Theme
- **State Management**: Zustand with persistent storage
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Routing**: React Router v6
