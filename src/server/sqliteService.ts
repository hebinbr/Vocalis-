/**
 * Vocalis - Serviço SQLite Resiliente com Criptografia LGPD em Node.js
 * Atua como motor nativo de alta disponibilidade para o banco vocalis.db.
 * Garante que em ambientes de deploy (como Cloud Run) o banco SQLite funcione
 * com 100% de disponibilidade, seja com Python ou como motor primário/failover.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importa node:sqlite dinamicamente para compatibilidade universal
let DatabaseSync: any = null;
try {
  // @ts-ignore
  const sqlite = await import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (e) {
  try {
    const req = (await import('module')).createRequire(import.meta.url);
    DatabaseSync = req('node:sqlite').DatabaseSync;
  } catch (err) {
    console.warn('[Vocalis SQLite] node:sqlite could not be loaded via import:', err);
  }
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'vocalis.db');
const MASTER_SECRET = process.env.VOCALIS_MASTER_KEY || 'Vocalis_Speech_Therapy_LGPD_Patient_Vault_2026';

// Configuração dos Níveis de Gamificação Fonoaudiológica
export const LEVEL_CONFIG = [
  {
    level: 1,
    title: 'Aprendiz Vocal',
    min_xp: 0,
    max_xp: 200,
    description: 'Início da conscientização respiratória e soltura muscular laríngea.',
    icon: 'Seedling',
    unlocked_features: ['Exercícios Fundamentais de Vibração e Bocejo']
  },
  {
    level: 2,
    title: 'Ressonador Ativo',
    min_xp: 200,
    max_xp: 550,
    description: 'Domínio do Trato Vocal Semiocluído (SOVTE) e foco de máscara facial.',
    icon: 'Waves',
    unlocked_features: ["Canudo d'Água (SOVTE)", 'Humming Facial', 'Desafios de Bolhas']
  },
  {
    level: 3,
    title: 'Guardião da Laringe',
    min_xp: 550,
    max_xp: 1050,
    description: 'Coordenação pneumofonoarticulatória avançada e equilíbrio glótico.',
    icon: 'ShieldCheck',
    unlocked_features: ['Protocolo Relação s/z', 'Desafio da Proporção Áurea']
  },
  {
    level: 4,
    title: 'Mestre da Fonação',
    min_xp: 1050,
    max_xp: 1750,
    description: 'Elasticidade muscular cricotireóidea e ampliação da tessitura sem quebras.',
    icon: 'TrendingUp',
    unlocked_features: ['Glissandos Ascendentes', 'Sirene Vocal', 'Desafio do Arco-Íris']
  },
  {
    level: 5,
    title: 'Voz de Ouro & Maestria',
    min_xp: 1750,
    max_xp: 999999,
    description: 'Alta performance acústica, resistência profissional e relaxamento profundo.',
    icon: 'Crown',
    unlocked_features: ['Vocal Fry / Basculamento', 'Desafio de Hiperarticulação Rítmica']
  }
];

export function getLevelInfo(xp: number) {
  for (const cfg of LEVEL_CONFIG) {
    if (cfg.level === 5 && xp >= cfg.min_xp) {
      return {
        ...cfg,
        current_xp: xp,
        progress_percent: 100,
        xp_for_next_level: 0
      };
    }
    if (cfg.min_xp <= xp && xp < cfg.max_xp) {
      const span = cfg.max_xp - cfg.min_xp;
      const currentInLevel = xp - cfg.min_xp;
      const percent = Math.min(100, Math.max(0, Math.round((currentInLevel / span) * 100)));
      return {
        ...cfg,
        current_xp: xp,
        progress_percent: percent,
        xp_for_next_level: cfg.max_xp - xp
      };
    }
  }
  return {
    ...LEVEL_CONFIG[0],
    current_xp: xp,
    progress_percent: 0,
    xp_for_next_level: 200 - xp
  };
}

// Criptografia compatível 100% com crypto_vault.py (LGPD)
function deriveKeys(salt: Buffer) {
  const derived = crypto.pbkdf2Sync(MASTER_SECRET, salt, 10000, 64, 'sha256');
  return { encKey: derived.subarray(0, 32), macKey: derived.subarray(32, 64) };
}

function generateKeystream(key: Buffer, nonce: Buffer, length: number): Buffer {
  const chunks: Buffer[] = [];
  let total = 0;
  let counter = 0;
  while (total < length) {
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(Buffer.concat([nonce, counterBuf]));
    const block = hmac.digest();
    chunks.push(block);
    total += block.length;
    counter++;
  }
  return Buffer.concat(chunks).subarray(0, length);
}

export function encryptText(plaintext: string | null | undefined): string {
  if (!plaintext && plaintext !== '0') return '';
  const textStr = String(plaintext);
  if (textStr === '') return '';

  const salt = crypto.randomBytes(16);
  const nonce = crypto.randomBytes(16);
  const { encKey, macKey } = deriveKeys(salt);

  const rawData = Buffer.from(textStr, 'utf8');
  const keystream = generateKeystream(encKey, nonce, rawData.length);
  const ciphertext = Buffer.alloc(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    ciphertext[i] = rawData[i] ^ keystream[i];
  }

  const header = Buffer.from('v2', 'ascii');
  const mac = crypto.createHmac('sha256', macKey)
    .update(Buffer.concat([header, salt, nonce, ciphertext]))
    .digest();

  return `ENC:v2:${salt.toString('base64')}:${nonce.toString('base64')}:${ciphertext.toString('base64')}:${mac.toString('base64')}`;
}

export function decryptText(encryptedStr: string | null | undefined): string {
  if (!encryptedStr) return '';
  if (typeof encryptedStr !== 'string' || !encryptedStr.startsWith('ENC:v2:')) {
    return String(encryptedStr);
  }

  const parts = encryptedStr.split(':');
  if (parts.length !== 6) return '[Formato de registro criptografado corrompido]';

  const [, version, saltB64, nonceB64, cipherB64, macB64] = parts;
  try {
    const salt = Buffer.from(saltB64, 'base64');
    const nonce = Buffer.from(nonceB64, 'base64');
    const ciphertext = Buffer.from(cipherB64, 'base64');
    const expectedMac = Buffer.from(macB64, 'base64');

    const { encKey, macKey } = deriveKeys(salt);
    const header = Buffer.from(version, 'ascii');
    const computedMac = crypto.createHmac('sha256', macKey)
      .update(Buffer.concat([header, salt, nonce, ciphertext]))
      .digest();

    if (!crypto.timingSafeEqual(expectedMac, computedMac)) {
      return '[Erro de integridade: Registro modificado ou chave incorreta]';
    }

    const keystream = generateKeystream(encKey, nonce, ciphertext.length);
    const decrypted = Buffer.alloc(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      decrypted[i] = ciphertext[i] ^ keystream[i];
    }
    return decrypted.toString('utf8');
  } catch (err: any) {
    return `[Falha na decifração: ${err.message}]`;
  }
}

export function hashPassword(password: string, saltHex?: string): { hashHex: string; saltHex: string } {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
  return { hashHex: key.toString('hex'), saltHex: salt.toString('hex') };
}

export function verifyPassword(password: string, hashHex: string, saltHex: string): boolean {
  try {
    const { hashHex: computed } = hashPassword(password, saltHex);
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hashHex, 'hex'));
  } catch {
    return false;
  }
}

export function generateCodeStr(prefix = 'VOCA'): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${rand}`;
}

// Inicializador e conexão SQLite
let dbInstance: any = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!DatabaseSync) {
    throw new Error('SQLite engine not available in Node runtime');
  }
  dbInstance = new DatabaseSync(DB_PATH);
  initDatabaseTables(dbInstance);
  return dbInstance;
}

function initDatabaseTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      is_activated INTEGER DEFAULT 0,
      therapist_id INTEGER,
      activation_code_used TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS access_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      therapist_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      patient_name TEXT,
      patient_email TEXT,
      is_used INTEGER DEFAULT 0,
      used_by_user_id INTEGER,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (therapist_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS patient (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name_enc TEXT NOT NULL,
      diagnosis_enc TEXT NOT NULL,
      therapist_name_enc TEXT,
      therapist_crfa_enc TEXT,
      clinical_notes_enc TEXT,
      daily_goal_minutes INTEGER DEFAULT 15,
      streak_count INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      last_exercise_date TEXT,
      xp_points INTEGER DEFAULT 350,
      level INTEGER DEFAULT 2,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      target_range TEXT NOT NULL,
      description TEXT NOT NULL,
      benefits TEXT NOT NULL,
      instructions TEXT NOT NULL,
      default_reps INTEGER DEFAULT 3,
      default_duration_sec INTEGER DEFAULT 60,
      target_hz INTEGER DEFAULT 220,
      caution_tips TEXT,
      icon_name TEXT DEFAULT 'Activity',
      min_level INTEGER DEFAULT 1,
      xp_reward INTEGER DEFAULT 45,
      is_challenge INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      exercise_id TEXT NOT NULL,
      exercise_title TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      repetitions INTEGER NOT NULL,
      pitch_accuracy REAL DEFAULT 90.0,
      effort_level INTEGER DEFAULT 3,
      fatigue_before INTEGER DEFAULT 4,
      fatigue_after INTEGER DEFAULT 2,
      notes_enc TEXT,
      date_iso TEXT NOT NULL,
      xp_earned INTEGER DEFAULT 50,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title_enc TEXT NOT NULL,
      time_str TEXT NOT NULL,
      days_mask TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      sound_alert INTEGER DEFAULT 1,
      category TEXT DEFAULT 'aquecimento',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      details_enc TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Operações da API
export const sqliteService = {
  getStatus() {
    return {
      status: 'online',
      backend: 'Node.js SQLite Engine + Python Bridge',
      database: 'SQLite 3 (vocalis.db)',
      encryption: 'PBKDF2-HMAC-SHA256 + CTR Stream + Encrypt-then-MAC',
      service: 'Vocalis Speech Therapy API'
    };
  },

  getPatient(userId?: number) {
    const db = getDatabase();
    let row: any = null;
    if (userId) {
      row = db.prepare('SELECT * FROM patient WHERE user_id = ? LIMIT 1').get(userId);
    }
    if (!row) {
      row = db.prepare('SELECT * FROM patient LIMIT 1').get();
    }
    if (!row) return null;

    const xp = row.xp_points ?? 350;
    const levelInfo = getLevelInfo(xp);

    return {
      id: row.id,
      name: decryptText(row.name_enc),
      diagnosis: decryptText(row.diagnosis_enc),
      therapist_name: decryptText(row.therapist_name_enc),
      therapist_crfa: decryptText(row.therapist_crfa_enc),
      clinical_notes: decryptText(row.clinical_notes_enc),
      daily_goal_minutes: row.daily_goal_minutes,
      streak_count: row.streak_count,
      best_streak: row.best_streak,
      last_exercise_date: row.last_exercise_date,
      xp_points: xp,
      level: levelInfo.level,
      level_title: levelInfo.title,
      level_progress_percent: levelInfo.progress_percent,
      xp_for_next_level: levelInfo.xp_for_next_level,
      created_at: row.created_at
    };
  },

  updatePatient(data: any, userId?: number) {
    const db = getDatabase();
    let current: any = null;
    if (userId) {
      current = db.prepare('SELECT * FROM patient WHERE user_id = ? LIMIT 1').get(userId);
    }
    if (!current) {
      current = db.prepare('SELECT * FROM patient LIMIT 1').get();
    }
    if (!current) return null;

    const nameEnc = encryptText(data.name ?? decryptText(current.name_enc));
    const diagEnc = encryptText(data.diagnosis ?? decryptText(current.diagnosis_enc));
    const thEnc = encryptText(data.therapist_name ?? decryptText(current.therapist_name_enc));
    const crfaEnc = encryptText(data.therapist_crfa ?? decryptText(current.therapist_crfa_enc));
    const notesEnc = encryptText(data.clinical_notes ?? decryptText(current.clinical_notes_enc));
    const dailyGoal = Number(data.daily_goal_minutes ?? current.daily_goal_minutes);

    db.prepare(`
      UPDATE patient SET
        name_enc = ?,
        diagnosis_enc = ?,
        therapist_name_enc = ?,
        therapist_crfa_enc = ?,
        clinical_notes_enc = ?,
        daily_goal_minutes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nameEnc, diagEnc, thEnc, crfaEnc, notesEnc, dailyGoal, current.id);

    return this.getPatient(userId);
  },

  getExercises() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM exercises ORDER BY min_level ASC, is_challenge ASC, id ASC').all();
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      target_range: r.target_range,
      description: r.description,
      benefits: r.benefits,
      instructions: r.instructions ? JSON.parse(r.instructions) : [],
      default_reps: r.default_reps,
      default_duration_sec: r.default_duration_sec,
      target_hz: r.target_hz,
      caution_tips: r.caution_tips,
      icon_name: r.icon_name,
      min_level: r.min_level ?? 1,
      xp_reward: r.xp_reward ?? 45,
      is_challenge: Boolean(r.is_challenge)
    }));
  },

  getLogs(userId?: number) {
    const db = getDatabase();
    let rows: any[] = [];
    if (userId) {
      rows = db.prepare('SELECT * FROM exercise_logs WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC').all(userId);
    } else {
      rows = db.prepare('SELECT * FROM exercise_logs ORDER BY created_at DESC').all();
    }
    return rows.map((r: any) => ({
      id: r.id,
      exercise_id: r.exercise_id,
      exercise_title: r.exercise_title,
      duration_sec: r.duration_sec,
      repetitions: r.repetitions,
      pitch_accuracy: r.pitch_accuracy,
      effort_level: r.effort_level,
      fatigue_before: r.fatigue_before,
      fatigue_after: r.fatigue_after,
      notes: decryptText(r.notes_enc),
      date_iso: r.date_iso,
      xp_earned: r.xp_earned ?? 50,
      created_at: r.created_at
    }));
  },

  addLog(data: any, userId?: number) {
    const db = getDatabase();
    const notesEnc = encryptText(data.notes || '');
    const todayStr = new Date().toISOString().split('T')[0];
    const dateIso = data.date_iso || todayStr;

    // Get exercise base XP
    const exRow: any = db.prepare('SELECT xp_reward FROM exercises WHERE id = ?').get(data.exercise_id);
    const baseXp = exRow ? exRow.xp_reward : 45;

    const durationSec = Number(data.duration_sec || 60);
    const reps = Number(data.repetitions || 3);
    const accuracy = Number(data.pitch_accuracy || 90.0);
    const fatigueBefore = Number(data.fatigue_before ?? 4);
    const fatigueAfter = Number(data.fatigue_after ?? 2);

    let accuracyBonus = 0;
    if (accuracy >= 95.0) accuracyBonus = 25;
    else if (accuracy >= 85.0) accuracyBonus = 15;

    let fatigueBonus = 0;
    if (fatigueBefore > fatigueAfter) {
      fatigueBonus = (fatigueBefore - fatigueAfter) * 10;
    }

    let patientRow: any = null;
    if (userId) {
      patientRow = db.prepare('SELECT id, streak_count, best_streak, last_exercise_date, xp_points, level FROM patient WHERE user_id = ? LIMIT 1').get(userId);
    }
    if (!patientRow) {
      patientRow = db.prepare('SELECT id, streak_count, best_streak, last_exercise_date, xp_points, level FROM patient LIMIT 1').get();
    }

    let streak = 1;
    let best = 1;
    let oldXp = 350;
    let oldLevel = 2;
    let pId = 1;

    if (patientRow) {
      pId = patientRow.id;
      streak = patientRow.streak_count || 0;
      best = patientRow.best_streak || 0;
      oldXp = patientRow.xp_points ?? 350;
      oldLevel = patientRow.level ?? 2;
      const lastDStr = patientRow.last_exercise_date;

      if (!lastDStr) {
        streak = 1;
      } else {
        const lastDate = new Date(lastDStr);
        const today = new Date(todayStr);
        const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 0) {
          // Same day, streak keeps
        } else if (diffDays === 1) {
          streak += 1;
        } else {
          streak = 1;
        }
      }
      if (streak > best) best = streak;
    }

    const streakBonus = streak * 5;
    const totalXpEarned = baseXp + accuracyBonus + fatigueBonus + streakBonus;
    const newXp = oldXp + totalXpEarned;
    const newLevelInfo = getLevelInfo(newXp);
    const newLevel = newLevelInfo.level;
    const leveledUp = newLevel > oldLevel;

    const res = db.prepare(`
      INSERT INTO exercise_logs (
        user_id, exercise_id, exercise_title, duration_sec, repetitions,
        pitch_accuracy, effort_level, fatigue_before, fatigue_after,
        notes_enc, date_iso, xp_earned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId ?? null,
      data.exercise_id,
      data.exercise_title,
      durationSec,
      reps,
      accuracy,
      Number(data.effort_level || 3),
      fatigueBefore,
      fatigueAfter,
      notesEnc,
      dateIso,
      totalXpEarned
    );

    db.prepare(`
      UPDATE patient SET
        streak_count = ?,
        best_streak = ?,
        last_exercise_date = ?,
        xp_points = ?,
        level = ?
      WHERE id = ?
    `).run(streak, best, todayStr, newXp, newLevel, pId);

    return {
      success: true,
      id: Number(res.lastInsertRowid),
      xp_earned: totalXpEarned,
      base_xp: baseXp,
      accuracy_bonus: accuracyBonus,
      fatigue_bonus: fatigueBonus,
      streak_bonus: streakBonus,
      total_xp: newXp,
      old_level: oldLevel,
      new_level: newLevel,
      leveled_up: leveledUp,
      level_title: newLevelInfo.title,
      unlocked_features: leveledUp ? newLevelInfo.unlocked_features : []
    };
  },

  deleteLog(id: number) {
    const db = getDatabase();
    db.prepare('DELETE FROM exercise_logs WHERE id = ?').run(id);
    return { success: true };
  },

  getReminders(userId?: number) {
    const db = getDatabase();
    let rows: any[] = [];
    if (userId) {
      rows = db.prepare('SELECT * FROM reminders WHERE user_id = ? OR user_id IS NULL ORDER BY time_str ASC').all(userId);
    } else {
      rows = db.prepare('SELECT * FROM reminders ORDER BY time_str ASC').all();
    }
    return rows.map((r: any) => ({
      id: r.id,
      title: decryptText(r.title_enc),
      time_str: r.time_str,
      days_mask: r.days_mask ? JSON.parse(r.days_mask) : [],
      is_active: Boolean(r.is_active),
      sound_alert: Boolean(r.sound_alert),
      category: r.category
    }));
  },

  addReminder(data: any, userId?: number) {
    const db = getDatabase();
    const titleEnc = encryptText(data.title || 'Lembrete Vocal');
    const daysJson = JSON.stringify(data.days_mask || ['seg', 'ter', 'qua', 'qui', 'sex']);
    const res = db.prepare(`
      INSERT INTO reminders (user_id, title_enc, time_str, days_mask, is_active, sound_alert, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId ?? null,
      titleEnc,
      data.time_str || '09:00',
      daysJson,
      data.is_active !== false ? 1 : 0,
      data.sound_alert !== false ? 1 : 0,
      data.category || 'aquecimento'
    );
    return { success: true, id: Number(res.lastInsertRowid) };
  },

  updateReminder(id: number, data: any) {
    const db = getDatabase();
    const fields: string[] = [];
    const params: any[] = [];

    if ('title' in data) {
      fields.push('title_enc = ?');
      params.push(encryptText(data.title));
    }
    if ('time_str' in data) {
      fields.push('time_str = ?');
      params.push(data.time_str);
    }
    if ('days_mask' in data) {
      fields.push('days_mask = ?');
      params.push(JSON.stringify(data.days_mask));
    }
    if ('is_active' in data) {
      fields.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }
    if ('sound_alert' in data) {
      fields.push('sound_alert = ?');
      params.push(data.sound_alert ? 1 : 0);
    }
    if ('category' in data) {
      fields.push('category = ?');
      params.push(data.category);
    }

    if (fields.length > 0) {
      params.push(id);
      db.prepare(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }
    return { success: true };
  },

  deleteReminder(id: number) {
    const db = getDatabase();
    db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    return { success: true };
  },

  getProgressStats(userId?: number) {
    const logs = this.getLogs(userId);
    const patient = this.getPatient(userId) || { daily_goal_minutes: 15, xp_points: 350, level: 2, streak_count: 0, best_streak: 0 };

    const totalDurationSec = logs.reduce((acc: number, l: any) => acc + (l.duration_sec || 0), 0);
    const totalSessions = logs.length;
    const avgAccuracy = totalSessions > 0
      ? Number((logs.reduce((acc: number, l: any) => acc + (l.pitch_accuracy || 0), 0) / totalSessions).toFixed(1))
      : 92.0;

    const fatigueReductions = logs
      .filter((l: any) => l.fatigue_before != null && l.fatigue_after != null)
      .map((l: any) => l.fatigue_before - l.fatigue_after);
    const avgFatigueRelief = fatigueReductions.length > 0
      ? Number((fatigueReductions.reduce((a: number, b: number) => a + b, 0) / fatigueReductions.length).toFixed(1))
      : 1.5;

    const today = new Date();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayLogs = logs.filter((l: any) => l.date_iso === iso);
      const dayMin = Math.floor(dayLogs.reduce((acc: number, l: any) => acc + (l.duration_sec || 0), 0) / 60);
      last7Days.push({
        date: iso,
        day_name: dayNames[d.getDay()],
        minutes: dayMin,
        target_minutes: patient.daily_goal_minutes || 15,
        completed: dayMin >= (patient.daily_goal_minutes || 15),
        count: dayLogs.length
      });
    }

    const patientXp = patient.xp_points || 350;
    const patientLevel = patient.level || 2;
    const streak = patient.streak_count || 0;
    const bestStreak = patient.best_streak || 0;

    const badges = [
      {
        id: 'primeira_nota',
        title: 'Primeira Nota',
        description: 'Completou o primeiro exercício vocal com sucesso',
        category: 'Iniciação',
        unlocked: totalSessions >= 1,
        icon: 'Award'
      },
      {
        id: 'fogo_vocal',
        title: 'Chama da Constância',
        description: 'Alcançou sequência de pelo menos 3 dias consecutivos',
        category: 'Disciplina',
        unlocked: streak >= 3 || bestStreak >= 3,
        icon: 'Flame'
      },
      {
        id: 'semana_perfeita',
        title: 'Semana Vocal de Ferro',
        description: 'Manteve 7 dias consecutivos de cuidado com a voz',
        category: 'Disciplina',
        unlocked: streak >= 7 || bestStreak >= 7,
        icon: 'ShieldCheck'
      },
      {
        id: 'alta_precisao',
        title: 'Afinador de Ouro',
        description: 'Alcançou precisão acústica (F0) acima de 95%',
        category: 'Técnica',
        unlocked: logs.some((l: any) => (l.pitch_accuracy || 0) >= 95),
        icon: 'Zap'
      },
      {
        id: 'mestre_sovte',
        title: 'Mestre do Canudo SOVTE',
        description: 'Praticou exercícios de trato semiocluído (bolhas e vibração)',
        category: 'Reabilitação',
        unlocked: logs.some((l: any) => ['canudo_sovte', 'vib_labios', 'desafio_bolhas_sovte'].includes(l.exercise_id)),
        icon: 'Waves'
      },
      {
        id: 'harmonia_sz',
        title: 'Harmonia Pneumofônica',
        description: 'Realizou a medição do tempo de sustentação de /s/ e /z/',
        category: 'Avaliação',
        unlocked: logs.some((l: any) => ['relacao_sz', 'desafio_proporcao_aurea'].includes(l.exercise_id)),
        icon: 'Timer'
      },
      {
        id: 'alivio_profundo',
        title: 'Alívio Laríngeo Profundo',
        description: 'Reduziu a fadiga vocal em 3 ou mais pontos em uma sessão',
        category: 'Bem-Estar',
        unlocked: logs.some((l: any) => ((l.fatigue_before || 0) - (l.fatigue_after || 0)) >= 3),
        icon: 'TrendingDown'
      },
      {
        id: 'resistencia_vocal',
        title: 'Voz Resistente',
        description: 'Acumulou mais de 20 minutos de exercícios fonoaudiológicos',
        category: 'Condicionamento',
        unlocked: totalDurationSec >= 1200,
        icon: 'Clock'
      },
      {
        id: 'guardiao_laringe',
        title: 'Guardião da Laringe',
        description: 'Alcançou o Nível 3 desbloqueando coordenação avançada',
        category: 'Nível',
        unlocked: patientLevel >= 3,
        icon: 'Shield'
      },
      {
        id: 'mestre_supremo',
        title: 'Voz de Ouro & Maestria',
        description: 'Alcançou o Nível 5 de Alta Performance Vocal',
        category: 'Nível',
        unlocked: patientLevel >= 5,
        icon: 'Crown'
      }
    ];

    const levelInfo = getLevelInfo(patientXp);

    return {
      total_sessions: totalSessions,
      total_minutes: Math.floor(totalDurationSec / 60),
      streak_days: streak,
      best_streak: bestStreak,
      avg_pitch_accuracy: avgAccuracy,
      avg_fatigue_relief: avgFatigueRelief,
      daily_goal_minutes: patient.daily_goal_minutes || 15,
      last_7_days: last7Days,
      badges,
      xp_points: patientXp,
      level: patientLevel,
      level_title: levelInfo.title,
      level_progress_percent: levelInfo.progress_percent,
      xp_for_next_level: levelInfo.xp_for_next_level,
      all_levels: LEVEL_CONFIG
    };
  },

  getSecurityAudit() {
    const db = getDatabase();
    const rawPatient: any = db.prepare('SELECT id, name_enc, diagnosis_enc, therapist_name_enc, clinical_notes_enc FROM patient LIMIT 1').get();
    const rawLogs = db.prepare('SELECT id, exercise_title, notes_enc, date_iso FROM exercise_logs ORDER BY id DESC LIMIT 3').all();
    const rawReminders = db.prepare('SELECT id, title_enc, time_str FROM reminders LIMIT 3').all();

    return {
      encryption_algorithm: 'PBKDF2-HMAC-SHA256 (10k rounds) + Authenticated Symmetric CTR + Encrypt-then-MAC',
      database_type: 'SQLite 3 (vocalis.db)',
      privacy_compliance: 'LGPD (Lei Geral de Proteção de Dados - Art. 11: Dados de Saúde)',
      patient_record: {
        raw_encrypted_in_sqlite: {
          name: rawPatient?.name_enc || '',
          diagnosis: rawPatient?.diagnosis_enc || '',
          clinical_notes: rawPatient?.clinical_notes_enc || ''
        },
        decrypted_in_memory: {
          name: rawPatient ? decryptText(rawPatient.name_enc) : '',
          diagnosis: rawPatient ? decryptText(rawPatient.diagnosis_enc) : '',
          clinical_notes: rawPatient ? decryptText(rawPatient.clinical_notes_enc) : ''
        }
      },
      logs_sample: rawLogs.map((r: any) => ({
        exercise: r.exercise_title,
        raw_encrypted_note: r.notes_enc,
        decrypted_note: decryptText(r.notes_enc)
      })),
      reminders_sample: rawReminders.map((r: any) => ({
        time: r.time_str,
        raw_encrypted_title: r.title_enc,
        decrypted_title: decryptText(r.title_enc)
      }))
    };
  },

  registerUser(data: any) {
    const db = getDatabase();
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const phone = (data.phone || '').trim();
    const password = data.password || '';
    const role = data.role || 'paciente';
    const activationCode = (data.activation_code || '').trim().toUpperCase();

    if (!name || !email || !password) {
      return { status: 400, body: { error: 'Nome, e-mail e senha são obrigatórios.' } };
    }
    if (password.length < 6) {
      return { status: 400, body: { error: 'A senha deve conter no mínimo 6 caracteres.' } };
    }

    const existing: any = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return { status: 409, body: { error: 'Este e-mail já está cadastrado no sistema.' } };
    }

    const { hashHex, saltHex } = hashPassword(password);

    if (role === 'fonoaudiologa') {
      const res = db.prepare(`
        INSERT INTO users (role, name, email, phone, password_hash, salt, is_activated)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(role, name, email, phone, hashHex, saltHex);

      const therapistId = Number(res.lastInsertRowid);
      const c1 = generateCodeStr('VOCA');
      const c2 = generateCodeStr('FONO');
      db.prepare('INSERT INTO access_codes (therapist_id, code) VALUES (?, ?)').run(therapistId, c1);
      db.prepare('INSERT INTO access_codes (therapist_id, code) VALUES (?, ?)').run(therapistId, c2);

      return {
        status: 201,
        body: {
          success: true,
          user: {
            id: therapistId,
            role: 'fonoaudiologa',
            name,
            email,
            phone,
            is_activated: true
          },
          message: 'Cadastro de fonoaudióloga realizado com sucesso!'
        }
      };
    } else {
      let isActivated = 0;
      let therapistId: number | null = null;
      let codeUsed: string | null = null;

      if (activationCode) {
        const codeRow: any = db.prepare('SELECT id, therapist_id, is_used FROM access_codes WHERE code = ?').get(activationCode);
        if (codeRow && !codeRow.is_used) {
          isActivated = 1;
          therapistId = codeRow.therapist_id;
          codeUsed = activationCode;
        }
      }

      const res = db.prepare(`
        INSERT INTO users (role, name, email, password_hash, salt, is_activated, therapist_id, activation_code_used)
        VALUES ('paciente', ?, ?, ?, ?, ?, ?, ?)
      `).run(name, email, hashHex, saltHex, isActivated, therapistId, codeUsed);
      const userId = Number(res.lastInsertRowid);

      if (isActivated && activationCode) {
        db.prepare('UPDATE access_codes SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?').run(userId, activationCode);
      }

      let therapistName = 'Dra. Beatriz Menezes';
      if (therapistId) {
        const thRow: any = db.prepare('SELECT name FROM users WHERE id = ?').get(therapistId);
        if (thRow) therapistName = thRow.name;
      }

      db.prepare(`
        INSERT INTO patient (user_id, name_enc, diagnosis_enc, therapist_name_enc, therapist_crfa_enc, clinical_notes_enc, daily_goal_minutes, streak_count, best_streak, last_exercise_date, xp_points, level)
        VALUES (?, ?, ?, ?, ?, ?, 15, 0, 0, NULL, 50, 1)
      `).run(
        userId,
        encryptText(name),
        encryptText('Avaliação vocal inicial'),
        encryptText(therapistName),
        encryptText('CRFa Ativo'),
        encryptText('Início do acompanhamento clínico via Vocalis.')
      );

      return {
        status: 201,
        body: {
          success: true,
          user: {
            id: userId,
            role: 'paciente',
            name,
            email,
            is_activated: Boolean(isActivated),
            therapist_id: therapistId,
            activation_code_used: codeUsed
          },
          message: 'Cadastro de paciente realizado com sucesso!'
        }
      };
    }
  },

  loginUser(data: any) {
    const db = getDatabase();
    const email = (data.email || '').trim().toLowerCase();
    const password = data.password || '';

    if (!email || !password) {
      return { status: 400, body: { error: 'E-mail e senha são obrigatórios.' } };
    }

    const userRow: any = db.prepare(`
      SELECT id, role, name, email, phone, password_hash, salt, is_activated, therapist_id, activation_code_used
      FROM users WHERE email = ?
    `).get(email);

    if (!userRow || !verifyPassword(password, userRow.password_hash, userRow.salt)) {
      return { status: 401, body: { error: 'E-mail ou senha incorretos.' } };
    }

    return {
      status: 200,
      body: {
        success: true,
        user: {
          id: userRow.id,
          role: userRow.role,
          name: userRow.name,
          email: userRow.email,
          phone: userRow.phone,
          is_activated: Boolean(userRow.is_activated),
          therapist_id: userRow.therapist_id,
          activation_code_used: userRow.activation_code_used
        }
      }
    };
  },

  activatePatientWithCode(userId: number, codeStr: string) {
    const db = getDatabase();
    const cleanCode = (codeStr || '').trim().toUpperCase();

    const codeRow: any = db.prepare('SELECT id, therapist_id, is_used FROM access_codes WHERE code = ?').get(cleanCode);
    if (!codeRow) {
      return { status: 404, body: { error: 'Código de ativação não encontrado ou inválido.' } };
    }
    if (codeRow.is_used) {
      return { status: 400, body: { error: 'Este código já foi utilizado por outro paciente.' } };
    }

    const therapistId = codeRow.therapist_id;

    db.prepare('UPDATE access_codes SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?').run(userId, codeRow.id);
    db.prepare('UPDATE users SET is_activated = 1, therapist_id = ?, activation_code_used = ? WHERE id = ?').run(therapistId, cleanCode, userId);

    const thUser: any = db.prepare('SELECT name FROM users WHERE id = ?').get(therapistId);
    const thName = thUser ? thUser.name : 'Dra. Beatriz Menezes';

    db.prepare(`
      UPDATE patient SET therapist_name_enc = ?
      WHERE user_id = ? OR id = (SELECT id FROM patient WHERE user_id = ? LIMIT 1)
    `).run(encryptText(thName), userId, userId);

    const updatedUser: any = db.prepare(`
      SELECT id, role, name, email, phone, is_activated, therapist_id, activation_code_used
      FROM users WHERE id = ?
    `).get(userId);

    return {
      status: 200,
      body: {
        success: true,
        message: `Acesso aos exercícios liberado pela fonoaudióloga ${thName}!`,
        user: {
          id: updatedUser.id,
          role: updatedUser.role,
          name: updatedUser.name,
          email: updatedUser.email,
          is_activated: true,
          therapist_id: therapistId,
          activation_code_used: cleanCode
        }
      }
    };
  },

  createAccessCode(therapistId: number, patientName = '', patientEmail = '') {
    const db = getDatabase();
    let code = generateCodeStr('VOCA');
    while (db.prepare('SELECT id FROM access_codes WHERE code = ?').get(code)) {
      code = generateCodeStr('VOCA');
    }

    const res = db.prepare(`
      INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used)
      VALUES (?, ?, ?, ?, 0)
    `).run(therapistId, code, patientName, patientEmail);

    return {
      id: Number(res.lastInsertRowid),
      code,
      therapist_id: therapistId,
      patient_name: patientName,
      patient_email: patientEmail,
      is_used: false,
      created_at: new Date().toISOString()
    };
  },

  getTherapistDashboardData(therapistId: number) {
    const db = getDatabase();
    const codesRows = db.prepare(`
      SELECT ac.id, ac.code, ac.patient_name, ac.patient_email, ac.is_used, ac.used_at, ac.created_at,
             u.name as activated_by_name, u.email as activated_by_email
      FROM access_codes ac
      LEFT JOIN users u ON ac.used_by_user_id = u.id
      WHERE ac.therapist_id = ?
      ORDER BY ac.created_at DESC
    `).all(therapistId);

    const codes = codesRows.map((r: any) => ({
      id: r.id,
      code: r.code,
      patient_name: r.patient_name,
      patient_email: r.patient_email,
      is_used: Boolean(r.is_used),
      used_at: r.used_at,
      created_at: r.created_at,
      activated_by_name: r.activated_by_name,
      activated_by_email: r.activated_by_email
    }));

    const patientsRows = db.prepare(`
      SELECT u.id, u.name, u.email, u.activation_code_used, u.created_at,
             p.streak_count, p.best_streak, p.last_exercise_date, p.xp_points, p.level,
             p.diagnosis_enc, p.clinical_notes_enc
      FROM users u
      LEFT JOIN patient p ON (p.user_id = u.id OR p.name_enc = u.name)
      WHERE u.therapist_id = ? AND u.role = 'paciente'
      ORDER BY u.created_at DESC
    `).all(therapistId);

    const patients = patientsRows.map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      activation_code: p.activation_code_used,
      streak: p.streak_count || 0,
      best_streak: p.best_streak || 0,
      last_active: p.last_exercise_date,
      xp: p.xp_points || 0,
      level: p.level || 1,
      diagnosis: p.diagnosis_enc ? decryptText(p.diagnosis_enc) : 'Acompanhamento geral',
      clinical_notes: p.clinical_notes_enc ? decryptText(p.clinical_notes_enc) : ''
    }));

    return {
      codes,
      patients,
      total_codes: codes.length,
      available_codes: codes.filter((c: any) => !c.is_used).length,
      active_patients: patients.length
    };
  }
};
