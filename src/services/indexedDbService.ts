import { ExerciseLog, SessionSaveResult, OfflineSyncStatus, Patient, ProgressStats } from '../types';
import { api } from './api';

const DB_NAME = 'vocalis_indexeddb_v1';
const DB_VERSION = 1;

export interface SyncQueueItem {
  queue_id?: number;
  local_id: number;
  action: 'ADD_LOG' | 'DELETE_LOG';
  payload: any;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

export interface CachedEntity<T = any> {
  cache_key: string;
  data: T;
  cached_at: string;
}

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isSupported: boolean = false;
  private isSyncing: boolean = false;
  private lastSyncTime: string | null = null;
  private listeners: Set<(status: OfflineSyncStatus) => void> = new Set();

  // In-memory fallback if IndexedDB is blocked in sandboxed iframes
  private memoryLogs: ExerciseLog[] = [];
  private memoryQueue: SyncQueueItem[] = [];
  private memoryCache: Map<string, any> = new Map();

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
    if (typeof window !== 'undefined') {
      try {
        const storedLastSync = localStorage.getItem('vocalis_last_sync_time');
        if (storedLastSync) this.lastSyncTime = storedLastSync;
      } catch {}

      // Listen for network connectivity changes
      window.addEventListener('online', () => {
        console.info('[Vocalis Offline Sync] Conexão restabelecida. Disparando sincronização automática...');
        this.notifyStatus();
        this.syncPendingLogs();
      });

      window.addEventListener('offline', () => {
        console.info('[Vocalis Offline Sync] Dispositivo offline. As gravações serão salvas no IndexedDB.');
        this.notifyStatus();
      });

      // Also trigger sync on tab visibility return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          this.syncPendingLogs();
        }
      });
    }
  }

  /**
   * Initializes or gets the open IndexedDB instance.
   */
  public async getDb(): Promise<IDBDatabase | null> {
    if (!this.isSupported) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Store: exercise_logs
          if (!db.objectStoreNames.contains('exercise_logs')) {
            const logStore = db.createObjectStore('exercise_logs', {
              keyPath: 'local_id',
              autoIncrement: true
            });
            logStore.createIndex('by_server_id', 'id', { unique: false });
            logStore.createIndex('by_user_id', 'user_id', { unique: false });
            logStore.createIndex('by_sync_status', 'sync_status', { unique: false });
            logStore.createIndex('by_date', 'date_iso', { unique: false });
          }

          // 2. Store: sync_queue
          if (!db.objectStoreNames.contains('sync_queue')) {
            const queueStore = db.createObjectStore('sync_queue', {
              keyPath: 'queue_id',
              autoIncrement: true
            });
            queueStore.createIndex('by_created', 'created_at', { unique: false });
          }

          // 3. Store: clinical_cache
          if (!db.objectStoreNames.contains('clinical_cache')) {
            db.createObjectStore('clinical_cache', { keyPath: 'cache_key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (err) => {
          console.warn('[Vocalis IndexedDB] Falha ao abrir banco local, usando fallback seguro:', err);
          resolve(null);
        };

        request.onblocked = () => {
          console.warn('[Vocalis IndexedDB] Banco de dados bloqueado por outra aba');
          resolve(null);
        };
      } catch (err) {
        console.warn('[Vocalis IndexedDB] Erro de inicialização:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves an exercise log locally into IndexedDB with optimistic offline status.
   */
  public async saveLogLocally(
    logData: {
      exercise_id: string;
      exercise_title: string;
      duration_sec: number;
      repetitions: number;
      pitch_accuracy: number;
      effort_level: number;
      fatigue_before: number;
      fatigue_after: number;
      notes: string;
      date_iso: string;
      user_id?: number;
    },
    currentPatient?: Patient | null,
    currentStats?: ProgressStats | null
  ): Promise<{ log: ExerciseLog; result: SessionSaveResult }> {
    const nowIso = new Date().toISOString();
    const tempLocalId = Date.now();
    const targetUserId = logData.user_id || currentPatient?.id || 2;

    // Calculate optimistic XP and rewards
    const baseXp = 40;
    const accuracyBonus = (logData.pitch_accuracy || 0) >= 90 ? 15 : (logData.pitch_accuracy || 0) >= 80 ? 10 : 5;
    const fatigueRelief = Math.max(0, (logData.fatigue_before || 0) - (logData.fatigue_after || 0));
    const fatigueBonus = fatigueRelief >= 3 ? 15 : fatigueRelief >= 1 ? 10 : 0;
    const streakBonus = Math.min(25, ((currentStats?.streak_days || 0) + 1) * 5);
    const xpEarned = baseXp + accuracyBonus + fatigueBonus + streakBonus;

    const currentXp = currentPatient?.xp_points || currentStats?.xp_points || 350;
    const newTotalXp = currentXp + xpEarned;
    const currentLevel = currentPatient?.level || currentStats?.level || 2;
    const newLevel = newTotalXp >= 1000 ? 5 : newTotalXp >= 750 ? 4 : newTotalXp >= 550 ? 3 : 2;
    const leveledUp = newLevel > currentLevel;

    const localLog: ExerciseLog = {
      id: tempLocalId, // Temporary ID until synced
      local_id: tempLocalId,
      exercise_id: logData.exercise_id,
      exercise_title: logData.exercise_title,
      duration_sec: logData.duration_sec,
      repetitions: logData.repetitions,
      pitch_accuracy: logData.pitch_accuracy,
      effort_level: logData.effort_level,
      fatigue_before: logData.fatigue_before,
      fatigue_after: logData.fatigue_after,
      notes: logData.notes,
      date_iso: logData.date_iso || nowIso.split('T')[0],
      xp_earned: xpEarned,
      created_at: nowIso,
      sync_status: 'pending'
    };

    const optimisticResult: SessionSaveResult = {
      success: true,
      id: tempLocalId,
      xp_earned: xpEarned,
      base_xp: baseXp,
      accuracy_bonus: accuracyBonus,
      fatigue_bonus: fatigueBonus,
      streak_bonus: streakBonus,
      total_xp: newTotalXp,
      old_level: currentLevel,
      new_level: newLevel,
      leveled_up: leveledUp,
      level_title: newLevel === 5 ? 'Voz de Ouro' : newLevel === 4 ? 'Mestre dos Glissandos' : newLevel === 3 ? 'Harmonia Pneumofônica' : 'Ressonador Ativo',
      unlocked_features: leveledUp ? ['Novos desafios vocais desbloqueados'] : []
    };

    const db = await this.getDb();

    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(['exercise_logs', 'sync_queue'], 'readwrite');
          const logsStore = tx.objectStore('exercise_logs');
          const queueStore = tx.objectStore('sync_queue');

          logsStore.put(localLog);
          queueStore.add({
            local_id: tempLocalId,
            action: 'ADD_LOG',
            payload: {
              ...logData,
              user_id: targetUserId,
              xp_earned: xpEarned
            },
            created_at: nowIso,
            retry_count: 0
          });

          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (e) {
          console.warn('[Vocalis IndexedDB] Erro na transação de gravação:', e);
          resolve();
        }
      });
    } else {
      // In-memory / localStorage fallback
      this.memoryLogs.unshift(localLog);
      this.memoryQueue.push({
        local_id: tempLocalId,
        action: 'ADD_LOG',
        payload: {
          ...logData,
          user_id: targetUserId,
          xp_earned: xpEarned
        },
        created_at: nowIso,
        retry_count: 0
      });
      try {
        localStorage.setItem('vocalis_memory_logs', JSON.stringify(this.memoryLogs.slice(0, 50)));
        localStorage.setItem('vocalis_memory_queue', JSON.stringify(this.memoryQueue));
      } catch {}
    }

    this.notifyStatus();

    // Trigger immediate background sync attempt if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => {
        this.syncPendingLogs();
      }, 500);
    }

    return { log: localLog, result: optimisticResult };
  }

  /**
   * Retrieves all cached exercise logs from IndexedDB, ordered from newest to oldest.
   */
  public async getCachedLogs(userId?: number): Promise<ExerciseLog[]> {
    const db = await this.getDb();
    if (!db) {
      try {
        const stored = localStorage.getItem('vocalis_memory_logs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return this.memoryLogs;
    }

    return new Promise<ExerciseLog[]>((resolve) => {
      try {
        const tx = db.transaction('exercise_logs', 'readonly');
        const store = tx.objectStore('exercise_logs');
        const req = store.getAll();

        req.onsuccess = () => {
          const results: ExerciseLog[] = req.result || [];
          results.sort((a, b) => {
            const dateA = new Date(a.date_iso || a.created_at).getTime();
            const dateB = new Date(b.date_iso || b.created_at).getTime();
            return dateB - dateA;
          });
          resolve(results);
        };

        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Merges server logs into IndexedDB, preserving any pending local logs.
   */
  public async mergeServerLogs(serverLogs: ExerciseLog[], userId?: number): Promise<ExerciseLog[]> {
    const db = await this.getDb();
    if (!db) {
      // Memory fallback: keep pending ones at top, then server logs
      const pendingMemory = this.memoryLogs.filter((l) => l.sync_status === 'pending');
      const serverIds = new Set(serverLogs.map((l) => l.id));
      const combined = [...pendingMemory, ...serverLogs.filter((l) => !pendingMemory.some((p) => p.id === l.id))];
      this.memoryLogs = combined;
      try {
        localStorage.setItem('vocalis_memory_logs', JSON.stringify(combined.slice(0, 50)));
      } catch {}
      return combined;
    }

    return new Promise<ExerciseLog[]>((resolve) => {
      try {
        const tx = db.transaction(['exercise_logs'], 'readwrite');
        const store = tx.objectStore('exercise_logs');
        const getAllReq = store.getAll();

        getAllReq.onsuccess = () => {
          const existing: ExerciseLog[] = getAllReq.result || [];
          const pendingLogs = existing.filter((l) => l.sync_status === 'pending');
          const serverLogIds = new Set(serverLogs.map((s) => s.id));

          // Put each server log into IndexedDB with 'synced' status
          for (const sLog of serverLogs) {
            store.put({
              ...sLog,
              local_id: sLog.id,
              sync_status: 'synced'
            });
          }

          // Combine: pending logs first, then server logs
          const combined = [
            ...pendingLogs,
            ...serverLogs.filter((s) => !pendingLogs.some((p) => p.exercise_id === s.exercise_id && p.date_iso === s.date_iso && p.duration_sec === s.duration_sec))
          ];

          combined.sort((a, b) => {
            const dateA = new Date(a.date_iso || a.created_at).getTime();
            const dateB = new Date(b.date_iso || b.created_at).getTime();
            return dateB - dateA;
          });

          tx.oncomplete = () => resolve(combined);
        };

        getAllReq.onerror = () => resolve(serverLogs);
      } catch {
        resolve(serverLogs);
      }
    });
  }

  /**
   * Checks the number of items currently waiting in the sync queue.
   */
  public async getPendingCount(): Promise<number> {
    const db = await this.getDb();
    if (!db) {
      return this.memoryQueue.length;
    }

    return new Promise<number>((resolve) => {
      try {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  /**
   * Processes the sync queue: sends pending logs to the backend and marks them as synced.
   */
  public async syncPendingLogs(onProgress?: (syncedCount: number, remaining: number) => void): Promise<{
    synced: number;
    failed: number;
    remaining: number;
  }> {
    if (this.isSyncing) {
      const count = await this.getPendingCount();
      return { synced: 0, failed: 0, remaining: count };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const count = await this.getPendingCount();
      return { synced: 0, failed: 0, remaining: count };
    }

    this.isSyncing = true;
    this.notifyStatus();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const db = await this.getDb();

      if (db) {
        const queueItems = await new Promise<SyncQueueItem[]>((resolve) => {
          try {
            const tx = db.transaction('sync_queue', 'readonly');
            const req = tx.objectStore('sync_queue').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });

        for (const item of queueItems) {
          try {
            if (item.action === 'ADD_LOG') {
              const res = await api.addLog(item.payload);

              // Update the log in exercise_logs to mark as 'synced' with the real server id
              await new Promise<void>((resolve) => {
                const tx = db.transaction(['exercise_logs', 'sync_queue'], 'readwrite');
                const logStore = tx.objectStore('exercise_logs');
                const qStore = tx.objectStore('sync_queue');

                // Get existing local record
                const getReq = logStore.get(item.local_id);
                getReq.onsuccess = () => {
                  const existing = getReq.result;
                  if (existing) {
                    existing.sync_status = 'synced';
                    if (res && res.id) existing.id = res.id;
                    logStore.put(existing);
                  }
                };

                // Delete from queue
                if (item.queue_id != null) {
                  qStore.delete(item.queue_id);
                }

                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
              });

              syncedCount++;
              if (onProgress) {
                onProgress(syncedCount, queueItems.length - syncedCount);
              }
            }
          } catch (itemErr: any) {
            console.warn('[Vocalis Sync] Falha ao sincronizar item individual da fila:', itemErr);
            failedCount++;
          }
        }
      } else {
        // Memory fallback queue processing
        const queue = [...this.memoryQueue];
        for (const item of queue) {
          try {
            if (item.action === 'ADD_LOG') {
              const res = await api.addLog(item.payload);
              // Update log status
              const target = this.memoryLogs.find((l) => l.local_id === item.local_id);
              if (target) {
                target.sync_status = 'synced';
                if (res?.id) target.id = res.id;
              }
              this.memoryQueue = this.memoryQueue.filter((q) => q.local_id !== item.local_id);
              syncedCount++;
            }
          } catch {
            failedCount++;
          }
        }
        try {
          localStorage.setItem('vocalis_memory_logs', JSON.stringify(this.memoryLogs));
          localStorage.setItem('vocalis_memory_queue', JSON.stringify(this.memoryQueue));
        } catch {}
      }

      if (syncedCount > 0) {
        this.lastSyncTime = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        try {
          localStorage.setItem('vocalis_last_sync_time', this.lastSyncTime);
        } catch {}
      }
    } finally {
      this.isSyncing = false;
      this.notifyStatus();
    }

    const remaining = await this.getPendingCount();
    return { synced: syncedCount, failed: failedCount, remaining };
  }

  /**
   * Caches a generic entity (patient profile, stats, reminders, symptoms).
   */
  public async cacheEntity<T>(key: string, data: T): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryCache.set(key, data);
      return;
    }

    return new Promise<void>((resolve) => {
      try {
        const tx = db.transaction('clinical_cache', 'readwrite');
        tx.objectStore('clinical_cache').put({
          cache_key: key,
          data,
          cached_at: new Date().toISOString()
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Retrieves a cached entity from IndexedDB.
   */
  public async getCachedEntity<T>(key: string): Promise<T | null> {
    const db = await this.getDb();
    if (!db) {
      return this.memoryCache.get(key) || null;
    }

    return new Promise<T | null>((resolve) => {
      try {
        const tx = db.transaction('clinical_cache', 'readonly');
        const req = tx.objectStore('clinical_cache').get(key);
        req.onsuccess = () => {
          resolve(req.result ? req.result.data : null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Returns current sync and connectivity status.
   */
  public async getStatus(): Promise<OfflineSyncStatus> {
    const pendingCount = await this.getPendingCount();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    return {
      isOnline,
      pendingCount,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      hasIndexedDb: this.isSupported
    };
  }

  /**
   * Subscribe to real-time sync status updates.
   */
  public subscribe(listener: (status: OfflineSyncStatus) => void): () => void {
    this.listeners.add(listener);
    this.getStatus().then((st) => listener(st));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyStatus() {
    const status = await this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (err) {
        console.warn('Listener error:', err);
      }
    });
  }
}

export const offlineStorage = new IndexedDbService();
