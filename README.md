# Webhook relay — frontend

React frontend for the webhook subscription and delivery service. Sign up,
create subscriptions, and watch incoming events and their delivery attempts
update live.

Built for the Spenza code test. The backend lives in a separate repository, as
the assignment asks: **[spenza-webhook-backend](https://github.com/demong4/spenza-webhook-backend)**. Start that first —
everything here talks to its API.

---

## Quick start

The backend must be running and reachable on **http://localhost:4000**:

```bash
git clone https://github.com/demong4/spenza-webhook-backend.git
cd spenza-webhook-backend
cp .env.example .env
sed -i "s|^JWT_SECRET=$|JWT_SECRET=$(openssl rand -hex 32)|" .env
docker compose up -d --build
```

Then, in this repository:

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to `localhost:4000`, so the
app is single-origin in development and `EventSource` behaves the same as it
would deployed behind one host.

### With Docker instead

```bash
docker compose up --build          # http://localhost:8080
```

The image is a static build served by nginx, which proxies `/api` to whatever
`BACKEND_URL` points at. It defaults to `http://host.docker.internal:4000`,
i.e. a backend running on the host. To point somewhere else:

```bash
BACKEND_URL=http://192.168.0.5:4000 docker compose up --build
```

---

## What the screens do

**Subscriptions** — create a subscription from a source URL and a callback URL,
list them, and cancel. Creating one returns an **ingest URL** (where events are
POSTed to) and a **signing secret**, which is shown once and never again.
Optionally restrict a subscription to certain event types, or require that
incoming events carry a valid signature.

**Event log** — every event received, newest first, updating live over Server
Sent Events. Filter by subscription or by delivery status. A stat strip shows
how many were delivered, are retrying, or gave up.

**Event detail** — the full payload, plus the **delivery attempt timeline**:
one entry per attempt with its status code, duration and error, and the backoff
gap labelled between attempts. This is where the retry behaviour is actually
visible.

---

## Design notes

**No component library.** This is a few forms, a table and a timeline. A
component framework would be a large dependency for very little, and the
assignment asked for a basic frontend. The CSS is Tailwind v4 with the palette
defined once as tokens in `@theme` in `src/index.css`, so `bg-canvas` and
`text-ok` work like built-in utilities.

**Server Sent Events, not websockets.** The event log only flows one way, and
`EventSource` reconnects on its own without extra code. A websocket would be
more machinery for capability that is never used.

`useEventStream` keeps its handlers in a ref rather than listing them as effect
dependencies. They are inline arrow functions, so they are a new object on
every render, and depending on them directly would tear down and reopen the
connection constantly. The ref lets the effect run once while still calling the
latest handlers.

**Tokens are verified, not trusted.** A JWT in `localStorage` proves nothing —
it may be expired or belong to a deleted account — so it is checked against
`/auth/me` on load before the user is treated as signed in. Protected routes
render nothing while that check is in flight, rather than flashing the login
page on a refresh.

**Motion is minimal and means something.** A new row fades in; a row whose
status changed only flashes its left edge. Re-running the fade on an update
read as the row flickering out and back. Both are disabled under
`prefers-reduced-motion`.

---

## Layout

```
src/
  lib/api.ts        fetch wrapper: attaches the JWT, normalises errors
  lib/auth.tsx      auth context; verifies a stored token on load
  lib/types.ts      shapes shared with the API
  hooks/            useEventStream - the SSE subscription
  pages/            Login/Signup, Subscriptions, EventLog, EventDetail
  components/       Layout, StatusDot, Copyable
  index.css         Tailwind import plus the design tokens in @theme
```

---

## Known limitations

- **The JWT is stored in `localStorage`**, which any XSS on the page can read.
  An httpOnly cookie is stronger, but costs CSRF protection and complicates
  authenticating the `EventSource` connection. A deliberate trade at this
  scope.
- **The SSE connection passes its token in the query string**, because
  `EventSource` cannot set an `Authorization` header. That puts it in server
  access logs. A short lived, stream-only ticket would be the fix.
- **No tests.** The app was verified by driving it in a real browser — signup,
  subscription creation, live event arrival, and the retry timeline — but that
  is manual verification rather than a regression suite.

## What I would add next

- Component tests for `useEventStream`, which is the one piece with real
  subtlety in it.
- Pagination on the event log; it currently caps at the most recent 200.
- Replaying a dead event from the UI. The backend already records every
  attempt and its failure reason.
