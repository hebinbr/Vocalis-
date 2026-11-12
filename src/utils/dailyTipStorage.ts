import { VocalTip } from '../types';

export const DAILY_TIP_STORAGE_KEY = 'vocalis_daily_hygiene_tip_v1';
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface PersistedDailyTipState {
  tipId: number;
  assignedAt: number;
  expiresAt: number;
  previousTipIds: number[];
  applied: boolean;
}

function safeReadStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage access errors in restricted sandboxes
  }
  return null;
}

function safeWriteStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage access errors in restricted sandboxes
  }
}

export function getOrRotateDailyTip(tips: VocalTip[]): {
  tip: VocalTip;
  state: PersistedDailyTipState;
} {
  const fallbackTip = tips[0];
  const now = Date.now();

  try {
    const raw = safeReadStorage(DAILY_TIP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedDailyTipState>;
      if (
        typeof parsed.tipId === 'number' &&
        typeof parsed.expiresAt === 'number' &&
        typeof parsed.assignedAt === 'number' &&
        now < parsed.expiresAt
      ) {
        const existingTip = tips.find((t) => t.id === parsed.tipId);
        if (existingTip) {
          return {
            tip: existingTip,
            state: {
              tipId: parsed.tipId,
              assignedAt: parsed.assignedAt,
              expiresAt: parsed.expiresAt,
              previousTipIds: Array.isArray(parsed.previousTipIds) ? parsed.previousTipIds : [parsed.tipId],
              applied: Boolean(parsed.applied),
            },
          };
        }
      }

      // Expired (>= 24h) or tip no longer exists -> pick a different tip
      const lastTipId = typeof parsed?.tipId === 'number' ? parsed.tipId : null;
      const prevHistory = Array.isArray(parsed?.previousTipIds) ? parsed.previousTipIds : [];

      let candidates = tips.filter((t) => t.id !== lastTipId && !prevHistory.includes(t.id));
      let nextHistory = [...prevHistory];

      if (candidates.length === 0) {
        // All tips have been shown; reset cycle while still ensuring different from immediately previous tip
        candidates = tips.filter((t) => t.id !== lastTipId);
        nextHistory = lastTipId !== null ? [lastTipId] : [];
      }

      if (candidates.length === 0) {
        candidates = tips;
      }

      const nextTip = candidates[Math.floor(Math.random() * candidates.length)] || fallbackTip;
      const newState: PersistedDailyTipState = {
        tipId: nextTip.id,
        assignedAt: now,
        expiresAt: now + TWENTY_FOUR_HOURS_MS,
        previousTipIds: [...nextHistory, nextTip.id],
        applied: false,
      };
      safeWriteStorage(DAILY_TIP_STORAGE_KEY, JSON.stringify(newState));
      return { tip: nextTip, state: newState };
    }
  } catch {
    // Corrupted JSON fallback -> rotate cleanly
  }

  // First visit: pick initial tip deterministically or from hygiene list and persist for 24h
  const hygienePreferred = tips.filter((t) => t.climateTrigger === 'general');
  const pool = hygienePreferred.length > 0 ? hygienePreferred : tips;
  const daySeed = Math.floor(now / TWENTY_FOUR_HOURS_MS);
  const initialTip = pool[daySeed % pool.length] || fallbackTip;

  const initialState: PersistedDailyTipState = {
    tipId: initialTip.id,
    assignedAt: now,
    expiresAt: now + TWENTY_FOUR_HOURS_MS,
    previousTipIds: [initialTip.id],
    applied: false,
  };
  safeWriteStorage(DAILY_TIP_STORAGE_KEY, JSON.stringify(initialState));
  return { tip: initialTip, state: initialState };
}

export function setDailyTipApplied(applied: boolean): PersistedDailyTipState | null {
  try {
    const raw = safeReadStorage(DAILY_TIP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDailyTipState;
    const updated: PersistedDailyTipState = {
      ...parsed,
      applied,
    };
    safeWriteStorage(DAILY_TIP_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

export function formatRemaining24h(expiresAt: number, now: number = Date.now()): string {
  const diff = Math.max(0, expiresAt - now);
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return 'em instantes';
}
