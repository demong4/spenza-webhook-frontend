import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatusDot } from '../components/StatusDot.js';
import { useEventStream, type StatusUpdate } from '../hooks/useEventStream.js';
import { api } from '../lib/api.js';
import type { EventStats, Subscription, WebhookEvent } from '../lib/types.js';

const MAX_ROWS = 200;

/**
 * Labels a subscription for the log. The source URL's host is the useful part
 * - the full URL is too long for a column. When two subscriptions share a
 * host, the callback's path is appended so they can still be told apart.
 */
function buildLabels(subscriptions: Subscription[]): Map<string, string> {
  const host = (url: string) => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  };

  const counts = new Map<string, number>();
  for (const s of subscriptions) {
    const h = host(s.sourceUrl);
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }

  const labels = new Map<string, string>();
  for (const s of subscriptions) {
    const h = host(s.sourceUrl);
    let label = h;
    if ((counts.get(h) ?? 0) > 1) {
      // Ambiguous host - disambiguate by where it is delivered.
      try {
        const cb = new URL(s.callbackUrl);
        label = `${h} \u2192 ${cb.pathname}`;
      } catch {
        label = `${h} \u2192 ${s.id.slice(0, 8)}`;
      }
    }
    labels.set(s.id, label);
  }
  return labels;
}

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
  // Filters live in the URL rather than in component state, so a filtered
  // view can be linked to - the event detail page links back to "all events
  // for this subscription" - and survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') ?? '';
  const subscriptionFilter = searchParams.get('subscriptionId') ?? '';

  const setFilter = useCallback(
    (key: 'status' | 'subscriptionId', value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  // Which rows should animate, and how. A new arrival fades in; an existing
  // row whose status changed only flashes its left edge.
  const [live, setLive] = useState<Map<string, 'in' | 'touch'>>(new Map());

  const loadStats = useCallback(async () => {
    setStats(await api<EventStats>('/events/stats').catch(() => null));
  }, []);

  // Loaded once so every row can be labelled with the subscription it came
  // from - including rows pushed over SSE, which carry only a subscription id.
  useEffect(() => {
    api<Subscription[]>('/subscriptions').then(setSubscriptions).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '200' });
    if (statusFilter) params.set('status', statusFilter);
    if (subscriptionFilter) params.set('subscriptionId', subscriptionFilter);

    api<WebhookEvent[]>(`/events?${params.toString()}`)
      .then(setEvents)
      .finally(() => setLoading(false));
    void loadStats();
  }, [statusFilter, subscriptionFilter, loadStats]);

  const labels = useMemo(() => buildLabels(subscriptions), [subscriptions]);

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

  // SSE pushes every event for this user regardless of the active filter, so
  // the same filter is applied client-side to keep the view consistent.
  const shown = events.filter(
    (e) =>
      (!statusFilter || e.deliveryStatus === statusFilter) &&
      (!subscriptionFilter || e.subscriptionId === subscriptionFilter),
  );

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
          value={subscriptionFilter}
          onChange={(e) => setFilter('subscriptionId', e.target.value)}
          className="ml-auto rounded border border-line bg-surface px-2 py-1 text-sm text-muted outline-none focus:border-accent"
        >
          <option value="">All subscriptions</option>
          {subscriptions.map((s) => (
            <option key={s.id} value={s.id}>
              {labels.get(s.id) ?? s.sourceUrl}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setFilter('status', e.target.value)}
          className="rounded border border-line bg-surface px-2 py-1 text-sm text-muted outline-none focus:border-accent"
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
        <div className="min-w-[900px]">
          <div className="flex gap-4 border-b border-line bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-faint">
            <span className="w-28">time</span>
            <span className="w-44">source</span>
            <span className="flex-1">event type</span>
            <span className="w-28">status</span>
            <span className="w-16 text-right">attempts</span>
            <span className="w-52">last error</span>
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
                <span className="w-44 truncate text-muted">
                  {labels.get(e.subscriptionId) ?? '-'}
                </span>
                <span className="flex-1 truncate text-text">{e.eventType}</span>
                <span className="w-28">
                  <StatusDot status={e.deliveryStatus} />
                </span>
                <span className="w-16 text-right text-muted">{e.retryCount}</span>
                <span className="w-52 truncate text-faint">{e.lastError ?? ''}</span>
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
