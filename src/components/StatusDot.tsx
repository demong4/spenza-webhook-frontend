import type { DeliveryStatus } from '../lib/types.js';

// Colour carries meaning here, so the label is always shown next to the dot -
// the dot alone would be unreadable to anyone who cannot distinguish them.
const STYLES: Record<DeliveryStatus, { dot: string; text: string }> = {
  pending: { dot: 'bg-faint', text: 'text-muted' },
  delivering: { dot: 'bg-accent animate-pulse', text: 'text-accent' },
  delivered: { dot: 'bg-ok', text: 'text-ok' },
  failed: { dot: 'bg-warn', text: 'text-warn' },
  dead: { dot: 'bg-bad', text: 'text-bad' },
  filtered: { dot: 'bg-dead', text: 'text-dead' },
};

export function StatusDot({ status }: { status: DeliveryStatus }) {
  const style = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-2 ${style.text}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
