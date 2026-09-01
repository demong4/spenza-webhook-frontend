export type DeliveryStatus =
  | 'pending'
  | 'delivering'
  | 'delivered'
  | 'failed'
  | 'dead'
  | 'filtered';

export interface Subscription {
  id: string;
  sourceUrl: string;
  callbackUrl: string;
  eventTypes: string[];
  status: 'active' | 'cancelled';
  createdAt: string;
  cancelledAt: string | null;
  ingestUrl: string;
  /** Returned only by the create call - never on a later read. */
  secret?: string;
  eventCount?: number;
}

export interface WebhookEvent {
  id: string;
  subscriptionId: string;
  sourceUrl?: string;
  eventType: string;
  receivedAt: string;
  deliveryStatus: DeliveryStatus;
  retryCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string;
  lastError: string | null;
}

export interface DeliveryAttempt {
  attemptNo: number;
  statusCode: number | null;
  error: string | null;
  durationMs: number;
  attemptedAt: string;
}

export interface EventDetail extends WebhookEvent {
  payload: unknown;
  attempts: DeliveryAttempt[];
}

export interface EventStats {
  total: number;
  byStatus: Partial<Record<DeliveryStatus, number>>;
}
