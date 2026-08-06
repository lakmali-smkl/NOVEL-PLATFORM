# 📚 Lumiverse

Lumiverse is a full-stack MERN platform for publishing and reading creative writing — novels/stories and articles — with role-based accounts for **readers**, **writers**, and **admins**, real-time-feeling messaging and notifications, and a full moderation panel.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
  - [Reader](#-reader)
  - [Writer](#-writer)
  - [Admin](#-admin)
  - [Platform-wide](#-platform-wide)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone & install](#1-clone--install)
  - [2. Configure environment variables](#2-configure-environment-variables)
  - [3. Run the app](#3-run-the-app)
- [Available Scripts](#available-scripts)
- [Roles & Permissions](#roles--permissions)
- [Data Models](#data-models)
- [API Overview](#api-overview)
- [Security](#security)
- [Testing & CI](#testing--ci)
- [Deployment Notes](#deployment-notes)

---

## Overview

Readers can browse, favorite, collect, and comment on published stories and articles. Writers get a full authoring dashboard with performance stats. Admins get a control panel for moderation, analytics, and platform announcements — and also inherit full writer capabilities, so a single admin account can both moderate the platform and publish content.

The whole app is themeable (7 built-in themes), and every account type shares a real-time-feeling direct-messaging and notification system, including a WhatsApp-style message interaction model (edit, delete, react, reply, forward).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Create React App), React Router 7, Axios, Recharts |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose 9) |
| Auth | JWT (`jsonwebtoken`), password hashing via `bcryptjs` |
| Security | `helmet`, `cors`, `express-rate-limit` on auth endpoints |
| File uploads | `multer` (disk storage, served from `/uploads`) |
| Testing | Jest (backend), `react-scripts test` / Testing Library (frontend) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) — lints/builds the client and syntax-checks + tests the server on every push/PR to `main`/`dev` |

## Features

### 📖 Reader
- Browse and read published stories/articles, with reading history and per-genre recommendations
- Like, comment, and reply (with deep-linkable comment/reply URLs from notifications); commenter/replier names are clickable to message them directly
- Favorites, custom collections ("Read Later" style folders), and reading stats
- Request to become a writer
- Direct-message any other user, including a one-click **Contact Admin** shortcut
- 7 selectable themes (Midnight, Dark, Snow, Ocean, Forest, Purple, Sunset)

### ✍️ Writer
- Full writer dashboard: performance overview, per-work like/comment breakdown, works table
- Create/edit/publish stories and articles (draft or published), with cover photo and `.txt`/`.pdf` text import
- Manage all owned works from one place
- Everything a reader can do, plus writer-only tooling

### 🛡️ Admin
- User Directory — view any user's full profile, role, status, and (for writers) every work they've published with live like/comment/view stats; promote/demote/suspend accounts
- Writer Requests queue (approve/reject)
- Content Oversight — global view of all stories/articles across the platform, with moderation delete
- Site Growth analytics (registrations, stories, articles, trend chart, daily breakdown)
- Announcements — create/edit/delete platform-wide banners with optional auto-expiry
- **Also has full writer capabilities** — the admin sidebar includes its own "Writer Tools" section (Writer Dashboard, Create Story, Create Article, My Works), so an admin account never needs a separate login to publish content

### 💬 Platform-wide
- Direct messaging with conversation list, unread badges, and WhatsApp-style per-message actions: edit, delete (for everyone), emoji reactions (toggle on/off, one per user), reply-with-quote, and forward to another user
- Notifications feed (likes, comments, replies, new messages) with per-item read tracking and instant unread-count sync across the UI
- All destructive/ownership-sensitive routes are protected by JWT auth + server-side ownership checks (see [Security](#security))

## Project Structure

```
novel-platform/
├── client/                      # React frontend (Create React App)
│   └── src/
│       ├── pages/                # Route-level views (Home, Login, Dashboard,
│       │                         #   WriterDashboard*, AdminDashboard + admin
│       │                         #   subpages, ChatPage, Notifications, ...)
│       ├── components/           # Shared UI (Navbar, Footer, ChatbotWidget, ...)
│       ├── ThemeContext.js       # Theme definitions + provider
│       └── config.js             # API_BASE_URL (reads REACT_APP_API_URL)
│
├── server/                      # Express backend
│   ├── server.js                 # App entry point — most routes live here
│   ├── routes/admin.js           # Admin-only routes (mounted at /api/admin,
│   │                              #   globally guarded by auth + admin middleware)
│   ├── models/                   # Mongoose schemas: User, Novel, Article,
│   │                              #   Message, Notification, Announcement,
│   │                              #   Collection, WriterRequest
│   ├── middleware/auth.js        # `auth` (JWT verify) and `admin` (role check)
│   ├── utils/crypto.js           # AES-256-GCM encrypt/decrypt for message text
│   └── uploads/                  # User-uploaded cover photos / text files
│
├── .github/workflows/ci.yml     # CI: client build+test, server syntax+test
└── .postman/                    # Postman/API client resources
```

## Getting Started

### Prerequisites
- Node.js 18+ (CI runs on Node 20)
- A MongoDB database (local or Atlas)

### 1. Clone & install
```bash
git clone <repo-url>
cd novel-platform

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

**`server/.env`** (copy from `server/.env.example`):
```env
PORT=5000
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=generate-a-long-random-string-and-never-commit-it
CLIENT_URL=http://localhost:3000
```
> The server refuses to start if `JWT_SECRET` or `MONGO_URI` is missing — this is intentional (fail fast rather than run insecurely). `CLIENT_URL` accepts a comma-separated list if you need multiple allowed origins for CORS.

**`client/.env`** (copy from `client/.env.example`, optional for local dev):
```env
REACT_APP_API_URL=http://localhost:5000
```
> Omit this for local development — it defaults to `http://localhost:5000` automatically. Set it when deploying the frontend separately from the backend.

### 3. Run the app
```bash
# Terminal 1 — backend
cd server && npm start        # http://localhost:5000

# Terminal 2 — frontend
cd client && npm start        # http://localhost:3000
```
> Neither server auto-reloads on file changes (no nodemon on the backend). After editing backend code, stop and restart `npm start` in `server/` for the change to take effect.

## Available Scripts

**`server/`**
| Script | Description |
|---|---|
| `npm start` | Start the Express server |
| `npm run start:prod` | Start via PM2 (`ecosystem.config.js`), for production |
| `npm test` | Run the Jest test suite |

**`client/`**
| Script | Description |
|---|---|
| `npm start` | Run the CRA dev server |
| `npm run build` | Production build to `client/build/` |
| `npm test` | Run the CRA/Testing Library test suite |

## Roles & Permissions

| | Reader | Writer | Admin |
|---|:---:|:---:|:---:|
| Read, like, comment, favorite, message | ✅ | ✅ | ✅ |
| Request writer access | ✅ | — | — |
| Create/edit/publish own stories & articles | — | ✅ | ✅ |
| Writer dashboard & performance stats | — | ✅ | ✅ |
| User management, moderation, analytics, announcements | — | — | ✅ |

A user's role is stored on their `User` document (`isWriter`, `isAdmin` booleans). Admin implies writer-level access throughout the app — an admin is never blocked from a writer-only page.

## Data Models

| Model | Purpose |
|---|---|
| `User` | Account, role flags, favorites, reading history, writer-request status |
| `Novel` / `Article` | Content items — title, body, author, status (`draft`/`published`), genre, likes, nested comments/replies, views |
| `Message` | Direct messages between two users — text (encrypted at rest), read state, edited/forwarded flags, reply-quote, per-user emoji reactions |
| `Notification` | Like/comment/reply/message alerts per recipient, with read tracking |
| `Announcement` | Platform-wide banners, with optional TTL-based auto-expiry |
| `Collection` | User-created folders for saving stories/articles |
| `WriterRequest` | Pending/approved/rejected requests to upgrade a reader to writer |

## API Overview

All routes are prefixed implicitly by the server root (`http://localhost:5000`). Full detail lives in `server/server.js` and `server/routes/admin.js`; the high-level surface:

- **Auth** — `POST /register`, `POST /login`, password-reset flow (rate-limited)
- **Content** — `GET/POST /api/novels`, `GET/POST /api/articles` (creation requires auth; `authorId` is taken from the verified JWT, never the request body), plus `/:id`, `/author/:authorId`, like/comment/reply sub-routes
- **Users** — profile lookup, settings, favorites, reading history/stats, admin-contact lookup
- **Messaging** — `/api/messages*` (conversations, send, edit, delete, react, read receipts, unread count)
- **Notifications** — `/api/notifications*` (list, mark-read, delete, unread count)
- **Collections** — `/api/collections*`
- **Admin** — everything under `/api/admin/*` (`server/routes/admin.js`), globally protected by `auth` + `admin` middleware: user directory, writer requests, content oversight, growth analytics, announcements

## Security

- **JWT auth** on every state-changing or user-specific route via the shared `auth` middleware; admin-only routes additionally require the `admin` middleware.
- **Ownership checks**: mutating routes — including content *creation*, not just edits/deletes — derive the owner from the authenticated `req.user._id` rather than trusting any client-supplied ID (applies to content, likes/comments, messages, favorites, collections, history, etc.).
- **Messages encrypted at rest**: direct-message text (and quoted reply snippets) are encrypted with AES-256-GCM before being saved (`server/utils/crypto.js`), so a raw database dump doesn't expose conversation content. The key is derived from `JWT_SECRET`, so no extra secret needs configuring. Decryption happens server-side, only for the sender/receiver, right before a response is sent.
- **Rate limiting** on `/login`, `/register`, and `/api/forgot-password` (20 requests / 15 min per IP).
- **Helmet** for standard secure headers; CORS restricted to `CLIENT_URL`.
- Sensitive fields (`password`, `hintAnswer`) are excluded from any route that returns a user document.

## Testing & CI

- Backend: `server/middleware/auth.test.js` (Jest) covers the JWT auth middleware.
- Frontend: CRA's default Testing Library setup.
- GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`/`dev`: installs, builds, and tests the client; syntax-checks and tests the server.

## Deployment Notes

- `server/ecosystem.config.js` + `npm run start:prod` supports running the backend under PM2.
- The frontend can be deployed separately (e.g., Vercel) — set `REACT_APP_API_URL` to the deployed backend's URL.
- Set `CLIENT_URL` on the backend to match the deployed frontend origin(s) so CORS allows it.
