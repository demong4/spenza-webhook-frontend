import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusDot } from '../components/StatusDot.js';
import { useEventStream, type StatusUpdate } from '../hooks/useEventStream.js';
import { api } from '../lib/api.js';
import type { EventStats, WebhookEvent } from '../lib/types.js';

const MAX_ROWS = 200;

function time(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleTimeString('en-GB', { hour12: false }) +
    '.' +
    String(d.getMilliseconds()).padStart(3, '0')
  );
}

export function EventLog() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  // Which rows should animate, and how. A new arrival fades in; an existing
  // row whose status changed only flashes its left edge.
  const [live, setLive] = useState<Map<string, 'in' | 'touch'>>(new Map());

  const loadStats = useCallback(async () => {
    setStats(await api<EventStats>('/events/stats').catch(() => null));
  }, []);

  useEffect(() => {
    const query = statusFilter ? `?status=${statusFilter}&limit=200` : '?limit=200';
    api<WebhookEvent[]>(`/events${query}`)
      .then(setEvents)
      .finally(() => setLoading(false));
    void loadStats();
  }, [statusFilter, loadStats]);

  const markLive = useCallback((id: string, kind: 'in' | 'touch') => {
    setLive((prev) => new Map(prev).set(id, kind));
    // Drop the flag once the animation has finished, so a later update to the
    // same row animates again.
    setTimeout(() => {
      setLive((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }, 950);
  }, []);

  const { connected } = useEventStream({
    onEvent: useCallback(
      (event: WebhookEvent) => {
        // Functional update: React batches state changes, so computing the
        // next list from the previous one avoids dropping events that arrive
        // in the same tick.
        setEvents((prev) =>
          prev.some((e) => e.id === event.id) ? prev : [event, ...prev].slice(0, MAX_ROWS),
        );
        markLive(event.id, 'in');
        void loadStats();
      },
      [markLive, loadStats],
    ),

    onStatus: useCallback(
      (update: StatusUpdate) => {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === update.id
              ? {
                  ...e,
                  deliveryStatus: update.deliveryStatus,
                  retryCount: update.retryCount,
                  lastError: update.lastError,
                }
              : e,
          ),
        );
        markLive(update.id, 'touch');
        void loadStats();
      },
      [markLive, loadStats],
    ),
  });

  const shown = statusFilter
    ? events.filter((e) => e.deliveryStatus === statusFilter)
    : events;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-lg text-text">Event log</h1>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? 'bg-ok animate-pulse' : 'bg-faint'
            }`}
          />
          {connected ? 'live' : 'reconnecting'}
        </span>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ml-auto rounded border border-line bg-surface px-2 py-1 text-sm text-muted outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          {['pending', 'delivering', 'delivered', 'failed', 'dead', 'filtered'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-5">
          <Stat label="total" value={stats.total} />
          <Stat label="delivered" value={stats.byStatus.delivered ?? 0} tone="text-ok" />
          <Stat label="retrying" value={stats.byStatus.failed ?? 0} tone="text-warn" />
          <Stat label="dead" value={stats.byStatus.dead ?? 0} tone="text-bad" />
          <Stat label="filtered" value={stats.byStatus.filtered ?? 0} tone="text-dead" />
        </div>
      )}

      <div className="overflow-x-auto rounded border border-line">
        <div className="min-w-[720px]">
          <div className="flex gap-4 border-b border-line bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-faint">
            <span className="w-28">time</span>
            <span className="flex-1">event type</span>
            <span className="w-28">status</span>
            <span className="w-16 text-right">attempts</span>
            <span className="w-64">last error</span>
          </div>

          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Loading...</p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              No events yet. POST to a subscription's ingest URL, or run the simulator.
            </p>
          ) : (
            shown.map((e) => (
              <Link
                key={e.id}
                to={`/events/${e.id}`}
                className={`flex gap-4 border-b border-line border-l-2 border-l-transparent px-4 py-2 font-mono text-xs transition-colors last:border-b-0 hover:bg-surface ${
                  live.get(e.id) === 'in'
                    ? 'row-in'
                    : live.get(e.id) === 'touch'
                      ? 'row-touch'
                      : ''
                }`}
              >
                <span className="w-28 text-faint">{time(e.receivedAt)}</span>
                <span className="flex-1 truncate text-text">{e.eventType}</span>
                <span className="w-28">
                  <StatusDot status={e.deliveryStatus} />
                </span>
                <span className="w-16 text-right text-muted">{e.retryCount}</span>
                <span className="w-64 truncate text-faint">{e.lastError ?? ''}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className={`font-mono text-xl ${tone ?? 'text-text'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-faint">{label}</div>
    </div>
  );
}
