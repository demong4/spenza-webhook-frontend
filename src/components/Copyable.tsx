import { useState } from 'react';

/** Click-to-copy for the long generated URLs and secrets. */
export function Copyable({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard is unavailable over plain http on some browsers; the text
      // is still selectable by hand, so failing quietly is acceptable here.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy to clipboard"
      className="group flex w-full items-center gap-2 rounded border border-line bg-canvas px-2 py-1 text-left font-mono text-xs text-muted transition-colors hover:border-line-bright hover:text-text"
    >
      <span className="truncate">{label ?? value}</span>
      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-faint group-hover:text-accent">
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  );
}
