# CivicResolve

CivicResolve is a full-stack civic issue reporting platform that helps residents report local problems, track complaint progress in real time, and build community visibility through a public map and support signals.

## Why CivicResolve

Local civic issues often get buried in scattered chats or one-off reports. CivicResolve creates a shared, transparent workflow where complaints are publicly visible, trackable, and easier to escalate as a community.

## Key Features

- Real-time public complaint feed with live updates via Socket.IO
- Complaint reporting with category, location, ward, priority, and photo upload
- AI-assisted complaint drafting and department recommendation
- Interactive map view for complaint locations (React Leaflet)
- Community support system to boost complaint visibility
- User authentication with profile management
- OTP verification flows for email and phone
- Multilingual interface support
- Local JSON data store with optional Supabase-backed sync

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Leaflet
- Backend: Node.js, Express 5, Socket.IO
- Auth/Security: JWT, bcrypt, optional Supabase Auth
- AI: Google Gemini API (`@google/genai`)
- Messaging: Nodemailer (SMTP), Twilio (SMS OTP)
- Data: lowdb (local JSON) with optional Supabase database mirror

## Project Structure

```text
civicresolve/
  backend/
    server.js
    sql/supabase_schema.sql
  src/
    components/
    App.tsx
    api.ts
    geminiService.ts
    i18n.ts
    types.ts
  .env.example
  package.json
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

Minimum local setup:

- `GEMINI_API_KEY`
- `JWT_SECRET`

Recommended for full functionality:

- Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- SMTP (`SMTP_*`) for email OTP delivery
- Twilio (`TWILIO_*`) for phone OTP delivery

For local testing without SMTP/Twilio, keep:

- `OTP_DEV_FALLBACK=true`

### 3) Run the app

Run frontend + backend together:

```bash
npm run dev:all
```

Or run separately:

```bash
npm run backend
npm run dev
```

Frontend default: `http://localhost:5173`  
Backend default: `http://localhost:5000`

## Available Scripts

- `npm run dev` - start Vite frontend
- `npm run backend` - start Express backend
- `npm run dev:all` - run backend and frontend concurrently
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run typecheck` - TypeScript type checking

## Configuration Notes

- Frontend can target a custom backend using:
  - `VITE_API_BASE_URL`
  - `VITE_SOCKET_URL`
- If Supabase DB tables are available, backend can hydrate/sync data using `backend/sql/supabase_schema.sql`.
- Without Supabase DB readiness, app continues using local lowdb storage.

## API Overview

Core backend endpoints:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `GET /api/profile`
- `GET /api/complaints`
- `POST /api/complaints`
- `POST /api/complaints/:id/support`
- `POST /api/generate`

## Security and Production Notes

- Use a strong, random `JWT_SECRET` in production.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Set `OTP_DEV_FALLBACK=false` in production.
- Configure CORS and allowed origins before public deployment.
- Replace development defaults for secrets and transport credentials.

## Supabase Setup (Optional)

1. Create a Supabase project.
2. Run [`backend/sql/supabase_schema.sql`](backend/sql/supabase_schema.sql) in Supabase SQL Editor.
3. Add Supabase keys to `.env`.
4. Restart backend and confirm `/api/health` reports Supabase DB readiness.



