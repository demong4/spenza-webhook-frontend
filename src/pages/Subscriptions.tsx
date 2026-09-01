import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copyable } from '../components/Copyable.js';
import { api } from '../lib/api.js';
import type { Subscription } from '../lib/types.js';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sourceUrl, setSourceUrl] = useState('https://api.stripe.com');
  const [callbackUrl, setCallbackUrl] = useState('http://localhost:5001/ok');
  const [eventTypes, setEventTypes] = useState('');
  const [creating, setCreating] = useState(false);

  // The secret is only ever returned once, at creation. Held here so it can
  // be shown until the page is left, then it is gone for good.
  const [freshSecret, setFreshSecret] = useState<{ id: string; secret: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setSubscriptions(await api<Subscription[]>('/subscriptions'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const types = eventTypes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await api<Subscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          sourceUrl,
          callbackUrl,
          ...(types.length > 0 ? { eventTypes: types } : {}),
        }),
      });

      if (created.secret) setFreshSecret({ id: created.id, secret: created.secret });
      setEventTypes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm('Cancel this subscription? Existing events are kept.')) return;
    try {
      await api(`/subscriptions/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-lg text-text">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted">
          Each subscription gets an ingest URL. Anything POSTed there is stored and
          forwarded to the callback URL, with retries on failure.
        </p>
      </section>

      <form
        onSubmit={create}
        className="grid gap-4 rounded border border-line bg-surface p-4 sm:grid-cols-2"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-faint">
            Source URL
          </span>
          <input
            required
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full rounded border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
          <span className="mt-1 block text-xs text-faint">
            Labels which service this is for. Never called by us.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-faint">
            Callback URL
          </span>
          <input
            required
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            className="w-full rounded border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
          <span className="mt-1 block text-xs text-faint">
            Where events are delivered. This is what gets retried.
          </span>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-faint">
            Event types <span className="normal-case text-faint">(optional, comma separated)</span>
          </span>
          <input
            value={eventTypes}
            onChange={(e) => setEventTypes(e.target.value)}
            placeholder="payment.succeeded, invoice.created"
            className="w-full rounded border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-accent placeholder:text-faint"
          />
          <span className="mt-1 block text-xs text-faint">
            Leave empty to receive everything. Other types are stored as filtered.
          </span>
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create subscription'}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
      )}

      {freshSecret && (
        <div className="rounded border border-accent/40 bg-accent/5 p-4">
          <p className="text-sm text-accent">Signing secret - shown once</p>
          <p className="mt-1 mb-2 text-xs text-muted">
            Deliveries are signed with this as <code className="font-mono">X-Webhook-Signature</code>.
            It is not retrievable later.
          </p>
          <Copyable value={freshSecret.secret} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : subscriptions.length === 0 ? (
        <p className="rounded border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No subscriptions yet. Create one above.
        </p>
      ) : (
        <div className="divide-y divide-line rounded border border-line">
          {subscriptions.map((s) => (
            <div key={s.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-text">{s.sourceUrl}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                      s.status === 'active'
                        ? 'bg-ok/10 text-ok'
                        : 'bg-faint/10 text-faint'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-xs text-faint">{s.eventCount ?? 0} events</span>
                </div>

                <div className="flex items-baseline gap-2 text-xs">
                  <span className="shrink-0 text-faint">callback</span>
                  <span className="truncate font-mono text-muted">{s.callbackUrl}</span>
                </div>

                {s.eventTypes.length > 0 && (
                  <div className="flex flex-wrap items-baseline gap-2 text-xs">
                    <span className="shrink-0 text-faint">types</span>
                    {s.eventTypes.map((t) => (
                      <span key={t} className="rounded bg-raised px-1.5 py-0.5 font-mono text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <Copyable value={s.ingestUrl} />
              </div>

              <div className="flex items-start">
                {s.status === 'active' && (
                  <button
                    onClick={() => cancel(s.id)}
                    className="rounded border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-bad/50 hover:text-bad"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
