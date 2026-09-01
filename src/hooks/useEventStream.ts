import { useEffect, useRef, useState } from 'react';
import { getToken } from '../lib/api.js';
import type { WebhookEvent } from '../lib/types.js';

/** A status update carries less than a full event - just what changed. */
export interface StatusUpdate {
  id: string;
  deliveryStatus: WebhookEvent['deliveryStatus'];
  retryCount: number;
  statusCode: number | null;
  durationMs: number;
  lastError: string | null;
}

interface Handlers {
  onEvent: (event: WebhookEvent) => void;
  onStatus: (update: StatusUpdate) => void;
}

/**
 * Subscribes to the backend's SSE stream for as long as the component is
 * mounted.
 *
 * The handlers are kept in a ref rather than listed as effect dependencies.
 * They are usually inline arrow functions, so they are a new value on every
 * render; depending on them directly would tear down and reopen the
 * connection on each render. The ref lets the effect run once while still
 * calling the latest version of each handler.
 */
export function useEventStream(handlers: Handlers): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // EventSource cannot set an Authorization header, so the token travels
    // as a query parameter. See the backend's stream controller.
    const source = new EventSource(`/api/stream?token=${encodeURIComponent(token)}`);

    source.onopen = () => setConnected(true);

    // The browser reconnects automatically; this only reports the gap.
    source.onerror = () => setConnected(false);

    source.addEventListener('event.received', (message) => {
      handlersRef.current.onEvent(JSON.parse(message.data) as WebhookEvent);
    });

    source.addEventListener('event.status', (message) => {
      handlersRef.current.onStatus(JSON.parse(message.data) as StatusUpdate);
    });

    source.addEventListener('ping', () => setConnected(true));

    // Cleanup runs when the component unmounts. Without it, navigating away
    // and back would leave the old connection open and duplicate every row.
    return () => source.close();
  }, []);

  return { connected };
}
