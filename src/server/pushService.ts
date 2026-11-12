import { createRequire } from 'module';
import type { PushSubscription } from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof import('web-push');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid-keys.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

export interface PushReminderPayload {
  id: number;
  title: string;
  time_str: string;
  days_mask: string[];
  is_active: boolean;
  sound_alert?: boolean;
  category: string;
  exercise_id?: string;
}

interface StoredPushSubscriber {
  endpoint: string;
  subscription: PushSubscription;
  reminders: PushReminderPayload[];
  tzOffsetMinutes: number;
  userId?: number;
  updatedAt: string;
}

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const DAY_MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const CATEGORY_LABELS: Record<string, string> = {
  aquecimento: 'Aquecimento Vocal',
  hidratacao: 'Hidratação Laríngea',
  exercicio: 'Exercício Terapêutico',
  desaquecimento: 'Desaquecimento Vocal',
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadOrCreateVapidKeys(): VapidKeys {
  ensureDataDir();

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
      if (parsed?.publicKey && parsed?.privateKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Vocalis Push] Falha ao ler vapid-keys.json, gerando novas chaves:', err);
  }

  const generated = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(generated, null, 2), 'utf8');
  return generated;
}

function readSubscribers(): StoredPushSubscriber[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSubscribers(list: StoredPushSubscriber[]) {
  ensureDataDir();
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

class PushNotificationService {
  private vapidKeys: VapidKeys;
  private firedKeys = new Map<string, number>();
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.vapidKeys = loadOrCreateVapidKeys();
    webpush.setVapidDetails(
      'mailto:suporte@vocalis-fono.app',
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    );
  }

  getPublicKey(): string {
    return this.vapidKeys.publicKey;
  }

  subscribe(payload: {
    subscription: PushSubscription;
    reminders?: PushReminderPayload[];
    tzOffsetMinutes?: number;
    userId?: number;
  }): { success: boolean; subscriberCount: number } {
    if (!payload?.subscription?.endpoint) {
      throw new Error('Subscription endpoint inválido');
    }

    const list = readSubscribers();
    const endpoint = payload.subscription.endpoint;
    const nowIso = new Date().toISOString();
    const tzOffset =
      typeof payload.tzOffsetMinutes === 'number' && Number.isFinite(payload.tzOffsetMinutes)
        ? payload.tzOffsetMinutes
        : 180;

    const existingIdx = list.findIndex((s) => s.endpoint === endpoint);
    const record: StoredPushSubscriber = {
      endpoint,
      subscription: payload.subscription,
      reminders: Array.isArray(payload.reminders)
        ? payload.reminders
        : existingIdx !== -1
          ? list[existingIdx].reminders
          : [],
      tzOffsetMinutes: tzOffset,
      userId: payload.userId ?? (existingIdx !== -1 ? list[existingIdx].userId : undefined),
      updatedAt: nowIso,
    };

    if (existingIdx !== -1) {
      list[existingIdx] = record;
    } else {
      list.push(record);
    }

    writeSubscribers(list);
    return { success: true, subscriberCount: list.length };
  }

  syncReminders(payload: {
    endpoint?: string;
    userId?: number;
    reminders: PushReminderPayload[];
    tzOffsetMinutes?: number;
  }): { success: boolean; updated: number } {
    if (!Array.isArray(payload?.reminders)) {
      return { success: false, updated: 0 };
    }

    const list = readSubscribers();
    let updated = 0;
    const nowIso = new Date().toISOString();

    for (const sub of list) {
      const matchEndpoint = payload.endpoint && sub.endpoint === payload.endpoint;
      const matchUser =
        !payload.endpoint && payload.userId !== undefined && sub.userId === payload.userId;

      if (matchEndpoint || matchUser) {
        sub.reminders = payload.reminders;
        if (
          typeof payload.tzOffsetMinutes === 'number' &&
          Number.isFinite(payload.tzOffsetMinutes)
        ) {
          sub.tzOffsetMinutes = payload.tzOffsetMinutes;
        }
        sub.updatedAt = nowIso;
        updated++;
      }
    }

    if (updated > 0) {
      writeSubscribers(list);
    }

    return { success: true, updated };
  }

  unsubscribe(endpoint: string): { success: boolean } {
    if (!endpoint) return { success: true };
    const list = readSubscribers();
    const filtered = list.filter((s) => s.endpoint !== endpoint);
    if (filtered.length !== list.length) {
      writeSubscribers(filtered);
    }
    return { success: true };
  }

  async sendTestPush(endpoint?: string, userId?: number): Promise<{
    success: boolean;
    sent: number;
    total: number;
  }> {
    const list = readSubscribers();
    const targets = list.filter((s) => {
      if (endpoint) return s.endpoint === endpoint;
      if (userId !== undefined) return s.userId === userId;
      return true;
    });

    if (targets.length === 0) {
      return { success: false, sent: 0, total: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: 'Vocalis: Lembrete em Segundo Plano Ativo!',
      body: 'Você receberá seus alertas de exercícios vocais mesmo quando o aplicativo estiver fechado.',
      reminderId: 999999,
      category: 'aquecimento',
      url: '/?tab=exercises',
      tag: `vocalis-push-test-${Date.now()}`,
    });

    let sent = 0;
    const expiredEndpoints = new Set<string>();

    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, notificationPayload);
          sent++;
        } catch (err: any) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) {
            expiredEndpoints.add(sub.endpoint);
          } else {
            console.warn('[Vocalis Push] Falha no envio de teste:', err?.message || err);
          }
        }
      })
    );

    if (expiredEndpoints.size > 0) {
      writeSubscribers(list.filter((s) => !expiredEndpoints.has(s.endpoint)));
    }

    return { success: sent > 0, sent, total: targets.length };
  }

  async checkAndSendDueNotifications(): Promise<void> {
    const list = readSubscribers();
    if (list.length === 0) return;

    const nowMs = Date.now();
    const expiredEndpoints = new Set<string>();

    // Cleanup old fired keys (> 2 hours)
    for (const [key, ts] of this.firedKeys.entries()) {
      if (nowMs - ts > 2 * 60 * 60 * 1000) {
        this.firedKeys.delete(key);
      }
    }

    for (const sub of list) {
      if (!Array.isArray(sub.reminders) || sub.reminders.length === 0) continue;

      const tzOffsetMs = (sub.tzOffsetMinutes ?? 180) * 60_000;
      const localDate = new Date(nowMs - tzOffsetMs);
      const dayCode = DAY_MAP[localDate.getUTCDay()];
      const hh = String(localDate.getUTCHours()).padStart(2, '0');
      const mm = String(localDate.getUTCMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}`;
      const dateStr = `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;

      for (const rem of sub.reminders) {
        if (!rem?.is_active) continue;
        const days = Array.isArray(rem.days_mask) ? rem.days_mask : [];
        if (!days.includes(dayCode)) continue;
        if (rem.time_str !== currentTime) continue;

        const dedupKey = `${sub.endpoint}|${rem.id}|${dateStr}|${currentTime}`;
        if (this.firedKeys.has(dedupKey)) continue;
        this.firedKeys.set(dedupKey, nowMs);

        const catLabel = CATEGORY_LABELS[rem.category] || 'Higiene Vocal';
        const payload = JSON.stringify({
          title: `Vocalis: ${rem.title}`,
          body: `⏰ Horário de ${catLabel} (${rem.time_str}). Toque para iniciar seu exercício vocal.`,
          reminderId: rem.id,
          exerciseId: rem.exercise_id || '',
          category: rem.category,
          timeStr: rem.time_str,
          url: `/?tab=exercises&reminderId=${encodeURIComponent(String(rem.id))}`,
          tag: `vocalis-reminder-${rem.id}-${dateStr}-${currentTime}`,
        });

        try {
          await webpush.sendNotification(sub.subscription, payload);
        } catch (err: any) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) {
            expiredEndpoints.add(sub.endpoint);
          } else {
            console.warn('[Vocalis Push] Erro ao enviar push agendado:', err?.message || err);
          }
        }
      }
    }

    if (expiredEndpoints.size > 0) {
      writeSubscribers(list.filter((s) => !expiredEndpoints.has(s.endpoint)));
    }
  }

  startScheduler(): void {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(() => {
      this.checkAndSendDueNotifications().catch((err) => {
        console.warn('[Vocalis Push Scheduler Error]:', err);
      });
    }, 20_000);
    console.log('[Vocalis] Agendador Web Push (VAPID) iniciado para notificações fora do app.');
  }
}

export const pushService = new PushNotificationService();
