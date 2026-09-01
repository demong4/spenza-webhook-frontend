# Frontend — webhook subscription and delivery service

React + Vite + Tailwind v4. See the [root README](../README.md) for the full
write-up.

## Running

```bash
npm install
npm run dev      # http://localhost:5173
```

`/api` is proxied to `http://localhost:4000`, so the backend must be running.
Configured in `vite.config.ts`.

## Layout

```
src/
  lib/api.ts          fetch wrapper: attaches the JWT, normalises errors
  lib/auth.tsx        auth context; verifies a stored token on load
  hooks/              useEventStream - the SSE subscription
  pages/              Login/Signup, Subscriptions, EventLog, EventDetail
  components/         Layout, StatusDot, Copyable
  index.css           Tailwind import plus the design tokens in @theme
```

## Notes

- The design tokens live in `@theme` in `index.css`; Tailwind generates the
  matching utilities (`bg-canvas`, `text-muted`, and so on).
- The live log updates from Server-Sent Events. `useEventStream` keeps its
  handlers in a ref so the connection is opened once rather than on every
  render.
- No component library, by choice — see the root README.
