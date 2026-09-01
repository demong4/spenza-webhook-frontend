import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusDot } from '../components/StatusDot.js';
import { api } from '../lib/api.js';
import type { EventDetail as EventDetailType } from '../lib/types.js';

export function EventDetail() {
  // useParams reads the :id segment out of the matched route path.
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<EventDetailType>(`/events/${id}`)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [id]);

  if (error) {
    return <p className="rounded border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>;
  }
  if (!event) return <p className="text-sm text-muted">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/events" className="text-sm text-muted hover:text-text">
          &larr; Event log
        </Link>
        <h1 className="mt-2 font-mono text-lg text-text">{event.eventType}</h1>
        <p className="mt-1 font-mono text-xs text-faint">{event.id}</p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-4">
        <Field label="status">
          <StatusDot status={event.deliveryStatus} />
        </Field>
        <Field label="attempts">{event.retryCount}</Field>
        <Field label="received">{new Date(event.receivedAt).toLocaleString()}</Field>
        <Field label="source">
          <span className="truncate">{event.sourceUrl ?? '-'}</span>
        </Field>
      </dl>

      <section>
        <h2 className="mb-3 text-sm text-text">Delivery attempts</h2>
        {event.attempts.length === 0 ? (
          <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {event.deliveryStatus === 'filtered'
              ? 'Filtered by the subscription’s event types, so it was never delivered.'
              : 'No attempt has been made yet.'}
          </p>
        ) : (
          // A vertical rail with one node per attempt. The gap between two
          // nodes is the backoff delay, which makes the retry schedule
          // visible rather than something you have to infer.
          <ol className="relative space-y-4 border-l border-line pl-6">
            {event.attempts.map((a, index) => {
              const previous = event.attempts[index - 1];
              const gapSeconds = previous
                ? Math.round(
                    (new Date(a.attemptedAt).getTime() -
                      new Date(previous.attemptedAt).getTime()) /
                      1000,
                  )
                : null;
              const ok = a.statusCode !== null && a.statusCode >= 200 && a.statusCode < 300;

              return (
                <li key={a.attemptNo} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1.5 h-2 w-2 rounded-full ring-4 ring-canvas ${
                      ok ? 'bg-ok' : 'bg-bad'
                    }`}
                  />
                  {gapSeconds !== null && (
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                      waited {gapSeconds}s
                    </p>
                  )}
                  <div className="rounded border border-line bg-surface px-3 py-2">
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                      <span className="text-muted">attempt {a.attemptNo}</span>
                      <span className={ok ? 'text-ok' : 'text-bad'}>
                        {a.statusCode ?? 'no response'}
                      </span>
                      <span className="text-faint">{a.durationMs}ms</span>
                      <span className="ml-auto text-faint">
                        {new Date(a.attemptedAt).toLocaleTimeString('en-GB', { hour12: false })}
                      </span>
                    </div>
                    {a.error && <p className="mt-1 text-xs text-bad">{a.error}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm text-text">Payload</h2>
        <pre className="overflow-x-auto rounded border border-line bg-surface p-4 font-mono text-xs text-muted">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 truncate font-mono text-sm text-text">{children}</dd>
    </div>
  );
}
