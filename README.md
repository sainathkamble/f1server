# 🏎️ F1 SYNC — Backend Server

> The backend powering [F1 Sync](https://f1sync.vercel.app) — a real-time Formula 1 data platform. Built with Node.js + Express, WebSockets, Redis Pub/Sub, and live F1 data via OpenF1 API and SignalR.

**🔗 Live API:** [https://f1server-axse.onrender.com](https://f1server-axse.onrender.com)  
**🖥️ Frontend:** [https://f1sync.vercel.app](https://f1sync.vercel.app)

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure register/login with access tokens stored in HTTP-only cookies
- 👤 **User Profiles** — User model with avatar support stored in MongoDB
- 🏎️ **F1 REST API** — Drivers, constructors, race schedule endpoints
- ⚡ **Real-time Live Timing** — Official F1 live timing data via SignalR WebSocket connection
- 🔴 **Redis Pub/Sub** — Live data published to Redis channels, WebSocket server subscribes and broadcasts to clients
- 🗄️ **Redis Caching** — Smart cache-aside pattern with per-data-type TTLs (5s for positions, up to 1hr for static data)
- 📡 **Polling Service** — Per-session pollers hitting OpenF1 API for positions, telemetry, weather, race control, team radio
- 🌐 **Socket.IO** — Real-time WebSocket server with room-based broadcasting
- 🛡️ **Auth Middleware** — JWT verification middleware protecting private routes
- 🔄 **Graceful degradation** — API routes continue working even if Redis is unavailable

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server & REST API |
| MongoDB + Mongoose | User data persistence |
| Redis | Caching + Pub/Sub message broker |
| Socket.IO | WebSocket server for real-time events |
| OpenF1 API | F1 positions, telemetry, weather, radio data |
| SignalR (WebSocket) | Official F1 live timing stream |
| JWT + Cookie-Parser | Stateless auth via HTTP-only cookies |
| dotenv | Environment variable management |
| CORS | Cross-origin request handling |

---

## 📁 Project Structure

```
f1-server/
├── index.js                        # Entry point — DB connect, start server
├── app.js                          # Express app, middleware, routes, HTTP server
│
├── db/
│   ├── index.js                    # MongoDB connection
│   └── redis.js                    # Redis client + subscriber instance
│
├── routes/
│   ├── user.route.js               # /v1/auth — register, login, logout, profile
│   ├── drivers.route.js            # /v1/drivers
│   ├── constructors.route.js       # /v1/constructors
│   └── schedule.route.js           # /v1/schedule
│
├── controllers/
│   ├── user.controller.js          # Auth logic — register, login, profile
│   ├── f1.controller.js            # Live F1 data via SignalR
│   ├── drivers.controller.js       # Driver data handlers
│   └── constructors.controller.js  # Constructor data handlers
│   └── livetiming.controller.js    # SignalR forwarder — bridges F1 → Redis
│
├── services/
│   ├── cache.service.js            # Redis get/set/delete/publish + withCache helper
│   ├── polling.service.js          # Per-session OpenF1 pollers
│   └── openf1.service.js           # OpenF1 API wrapper (positions, telemetry, etc.)
│
├── websocket/
│   ├── index.js                    # Socket.IO init, Redis subscriptions, room management
│   └── handlers.js                 # Channel message handler — Redis → Socket.IO emit
│
├── models/
│   └── user.model.js               # Mongoose user schema
│
├── middleware/
│   └── auth.middleware.js          # JWT verifyToken middleware
│
└── .env
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v18+`
- MongoDB (local or Atlas)
- Redis (local or Redis Cloud)

### 1. Clone the repository

```bash
git clone https://github.com/sainathkamble/f1-server.git
cd f1-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root:

```env
# Server
PORT=8000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/f1sync

# Redis
REDIS_URL=redis://localhost:6379

# JWT
ACCESS_TOKEN_SECRET=your_jwt_secret_here
ACCESS_TOKEN_EXPIRY=1d

# Frontend (for CORS)
CLIENT_URL=https://f1sync.vercel.app
```

### 4. Start the development server

```bash
npm run dev
```

Server runs at `http://localhost:8000`

### 5. Start for production

```bash
npm start
```

---

## 🔌 API Endpoints

### Auth — `/v1/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/auth/register` | ❌ | Register a new user |
| `POST` | `/v1/auth/login` | ❌ | Login — sets HTTP-only cookie with JWT |
| `POST` | `/v1/auth/logout` | ✅ | Logout — clears cookie |
| `GET` | `/v1/auth/profile` | ✅ | Get logged-in user profile |

### Drivers — `/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/drivers` | ❌ | Get all current F1 drivers |

### Constructors — `/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/constructors` | ❌ | Get all F1 constructors/teams |

### Schedule — `/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/schedule` | ❌ | Get the full F1 season race calendar |

> ✅ = Requires valid JWT in `access_token` cookie

---

## ⚡ Real-time Architecture

The live data pipeline has two layers:

### Layer 1 — Official Live Timing (SignalR)

```
F1 Official SignalR Stream
        ↓
livetiming.controller.js (forwarder)
        ↓
Redis Pub/Sub channels (channel:livetiming:<topic>)
        ↓
WebSocket server subscribes → emits to "livetiming" room
        ↓
Frontend clients
```

**Topics forwarded:** `Heartbeat`, `CarData.z`, `Position.z`, `ExtrapolatedClock`, `TopThree`, `TimingStats`, `TimingAppData`, `WeatherData`, `TrackStatus`, `DriverList`, `RaceControlMessages`, `SessionInfo`, `SessionData`, `LapCount`, `TimingData`

### Layer 2 — OpenF1 Polling

```
OpenF1 REST API (polled every 5–60s per data type)
        ↓
polling.service.js (per-session pollers)
        ↓
hasChanged() diff check → only publish if data changed
        ↓
Redis cache (setCache) + Redis Pub/Sub (publishToChannel)
        ↓
websocket/handlers.js → io.to(room).emit(event, data)
        ↓
Frontend clients in session room
```

---

## 🗄️ Redis Caching

All F1 data is cached in Redis with smart TTLs to minimize external API calls:

| Data Type | Cache Key | TTL |
|---|---|---|
| Sessions | `f1:sessions` | 1 hour |
| Drivers | `f1:drivers:<sessionKey>` | 1 hour |
| Results | `f1:results:<sessionKey>` | 30 min |
| Standings | `f1:standings:<year>` | 15 min |
| Weather | `f1:weather:<sessionKey>` | 30 sec |
| Race Control | `f1:racecontrol:<sessionKey>` | 10 sec |
| Positions | `f1:positions:<sessionKey>` | 5 sec |
| Telemetry | `f1:telemetry:<sessionKey>:<driverNum>` | 5 sec |
| Team Radio | `f1:radio:<sessionKey>` | 2 min |

The `withCache()` helper handles cache-aside automatically:
```js
const data = await withCache(KEYS.sessions(), TTL.SESSIONS, () => openF1Service.getSessions());
```

---

## 📡 Redis Pub/Sub Channels

| Channel | Trigger | Event emitted to client |
|---|---|---|
| `channel:positions:<sessionKey>` | Position poll | `positions:update` |
| `channel:telemetry:<sessionKey>` | Telemetry poll | `telemetry:update` |
| `channel:weather:<sessionKey>` | Weather poll | `weather:update` |
| `channel:racecontrol:<sessionKey>` | Race control poll | `racecontrol:update` |
| `channel:radio:<sessionKey>` | Team radio poll | `radio:new` |
| `channel:livetiming:<topic>` | SignalR forwarder | `<topic>` |

---

## 🔄 Polling Service

When a session goes live, per-session pollers are started with staggered intervals to avoid thundering herd on the OpenF1 API:

| Data | Poll Interval | Stagger Delay |
|---|---|---|
| Positions | 5s | 0ms |
| Telemetry | 5s | 600ms |
| Weather | 60s | 1200ms |
| Race Control | 60s | 1800ms |
| Team Radio | 60s | 2400ms |

Each poller tracks a `lastPolledAt` timestamp and uses it as a `since` parameter — so each request only fetches **new data** since the last poll, keeping payloads tiny.

Data is only published to Redis if it has actually changed (`hasChanged()` diff check).

---

## 🌐 WebSocket Events (Socket.IO)

### Client → Server

| Event | Description |
|---|---|
| `join:livetiming` | Join the official live timing room |
| `leave:livetiming` | Leave the live timing room |
| `ping` | Heartbeat check |

### Server → Client

| Event | Room | Payload |
|---|---|---|
| `joined:livetiming` | socket | `{ room, message }` |
| `positions:update` | `session:<key>` | `{ data, timestamp, sessionKey }` |
| `telemetry:update` | `session:<key>` | `{ data, timestamp, sessionKey }` |
| `weather:update` | `session:<key>` | `{ data, timestamp, sessionKey }` |
| `racecontrol:update` | `session:<key>` | `{ data, timestamp, sessionKey }` |
| `radio:new` | `session:<key>` | `{ data, timestamp, sessionKey }` |
| `pong` | socket | `{ timestamp }` |
| F1 timing topics | `livetiming` | `{ data, timestamp }` |

---

## 🔐 Authentication

- On login, a signed JWT is set as an **HTTP-only cookie** (`access_token`)
- The `verifyToken` middleware reads and validates the cookie on protected routes
- Credentials flow is enabled via CORS (`credentials: true`)
- Tokens expire after `ACCESS_TOKEN_EXPIRY` (default: 1 day)

---

## 🧠 Key Design Decisions

**Redis as the backbone** — Rather than having the WebSocket server call the OpenF1 API directly, all live data flows through Redis. This decouples the polling layer from the WebSocket layer, so either can be restarted independently without data loss.

**Diff-based publishing** — Pollers use `hasChanged()` to compare new data with what's already in Redis. If nothing changed, nothing is published. This prevents flooding WebSocket clients with redundant updates.

**Staggered pollers** — Each data type starts with a small delay offset to spread the load across the polling cycle instead of hammering OpenF1 all at once.

**Graceful Redis fallback** — If Redis is unavailable at startup, the server logs a warning and continues running. REST API routes work normally; only live WebSocket events are degraded.

---

## 🌍 Deployment

Deployed on **Render** (free tier).

| Service | Platform |
|---|---|
| Backend API + WebSocket | Render |
| MongoDB | MongoDB Atlas |
| Redis | Redis Cloud / Upstash |
| Frontend | Vercel |

> Note: Render free tier spins down after inactivity. First request may be slow (~30s cold start).

---

## 👨‍💻 Author

**Sainath Kamble**

- 🌐 Portfolio: [sainathkamble.vercel.app](https://sainathkamble.vercel.app)
- 🐙 GitHub: [@sainathkamble](https://github.com/sainathkamble)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Built for F1 fans, by an F1 fan ❤️</p>