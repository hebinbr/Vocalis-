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

    CREATE TABLE IF NOT EXISTS vocal_symptoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      vocal_effort INTEGER DEFAULT 2,
      fatigue_score INTEGER DEFAULT 2,
      symptoms_json TEXT DEFAULT '[]',
      triggers_json TEXT DEFAULT '[]',
      notes_enc TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS security_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      details_enc TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Garante colunas de vídeo no YouTube e personalização de prescrição da fonoaudióloga
  try { db.exec('ALTER TABLE exercises ADD COLUMN video_url TEXT;'); } catch {}
  try { db.exec('ALTER TABLE exercises ADD COLUMN therapist_id INTEGER;'); } catch {}
  try { db.exec('ALTER TABLE exercises ADD COLUMN created_by_name TEXT;'); } catch {}
  try { db.exec('ALTER TABLE exercises ADD COLUMN patient_id INTEGER;'); } catch {}
  try { db.exec('ALTER TABLE exercises ADD COLUMN is_custom INTEGER DEFAULT 0;'); } catch {}

  // Atualiza links de vídeo dos exercícios padrão se ainda não tiverem
  try {
    db.prepare("UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=0h9Vp1Xb1l8' WHERE id = 'vib_labios' AND (video_url IS NULL OR video_url = '')").run();
    db.prepare("UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=8VzGq_Jd_5A' WHERE id = 'canudo_sovte' AND (video_url IS NULL OR video_url = '')").run();
    db.prepare("UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=kYJ5o-tKj8U' WHERE id = 'bocejo_suspiro' AND (video_url IS NULL OR video_url = '')").run();
    db.prepare("UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=9gWzJgE5GQE' WHERE id = 'humming_mascara' AND (video_url IS NULL OR video_url = '')").run();
    db.prepare("UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=1F2lP9v-5yQ' WHERE id = 'glissando_sirene' AND (video_url IS NULL OR video_url = '')").run();
    db.prepare("UPDATE exercises SET video_url = 'https://www.youtube.com/watch?v=1YmN3BwU6lE' WHERE id = 'vocal_fry' AND (video_url IS NULL OR video_url = '')").run();
  } catch {}

  // Auto-seed de Usuários e Códigos Clínicos se vazio
  try {
    const userCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (!userCount || userCount.count === 0) {
      const { hashHex: fonoHash, saltHex: fonoSalt } = hashPassword('Fono1234!');
      const fonoRes = db.prepare(`
        INSERT INTO users (role, name, email, phone, password_hash, salt, is_activated)
        VALUES ('fonoaudiologa', 'Dra. Beatriz Menezes', 'dra.beatriz@vocalis.com.br', '(11) 98765-4321', ?, ?, 1)
      `).run(fonoHash, fonoSalt);
      const fonoId = Number(fonoRes.lastInsertRowid);

      const c1Res = db.prepare(`
        INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used)
        VALUES (?, 'VOCA-7842', 'Camila Vasconcelos', 'camila@email.com', 1)
      `).run(fonoId);
      const c1Id = Number(c1Res.lastInsertRowid);

      db.prepare(`
        INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used)
        VALUES (?, 'VOCA-2026', 'Novo Paciente VIP', '', 0)
      `).run(fonoId);

      db.prepare(`
        INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used)
        VALUES (?, 'FONO-9900', 'Paciente Avaliação', '', 0)
      `).run(fonoId);

      const { hashHex: pacHash, saltHex: pacSalt } = hashPassword('Voz1234!');
      const pacRes = db.prepare(`
        INSERT INTO users (role, name, email, password_hash, salt, is_activated, therapist_id, activation_code_used)
        VALUES ('paciente', 'Camila Vasconcelos', 'camila@email.com', ?, ?, 1, ?, 'VOCA-7842')
      `).run(pacHash, pacSalt, fonoId);
      const pacId = Number(pacRes.lastInsertRowid);

      db.prepare('UPDATE access_codes SET used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?').run(pacId, c1Id);
    }
  } catch (err) {
    console.warn('[Vocalis SQLite Seed Error - Users]:', err);
  }

  // Auto-seed do Paciente Clínico se vazio
  try {
    const patCount: any = db.prepare('SELECT COUNT(*) as count FROM patient').get();
    if (!patCount || patCount.count === 0) {
      const pName = encryptText('Camila Vasconcelos');
      const pDiag = encryptText('Fadiga vocal ocupacional com fenda glótica paralela leve (Professora de Ensino Médio)');
      const pTherapist = encryptText('Dra. Beatriz Menezes');
      const pCrfa = encryptText('CRFa 2-19842/SP');
      const pNotes = encryptText('Foco em hidratação pré-aula, exercícios com tubo de ressonância (SOVTE) e monitoramento de tensão cervical.');
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO patient (user_id, name_enc, diagnosis_enc, therapist_name_enc, therapist_crfa_enc, clinical_notes_enc, daily_goal_minutes, streak_count, best_streak, last_exercise_date, xp_points, level)
        VALUES (2, ?, ?, ?, ?, ?, 15, 4, 12, ?, 380, 2)
      `).run(pName, pDiag, pTherapist, pCrfa, pNotes, yesterday);
    }
  } catch (err) {
    console.warn('[Vocalis SQLite Seed Error - Patient]:', err);
  }

  // Auto-seed do Catálogo de Exercícios Vocais se vazio
  try {
    const exCount: any = db.prepare('SELECT COUNT(*) as count FROM exercises').get();
    if (!exCount || exCount.count === 0) {
      const seedExercises = [
        [
          'vib_labios',
          'Vibração de Lábios (Trilos)',
          'Aquecimento & Soltura',
          'Frequência Confortável (130Hz - 260Hz)',
          "Produção contínua do som 'Brrr' com vibração solta dos lábios.",
          'Equaliza a pressão subglótica, reduz o impacto direto das pregas vocais e ativa a musculatura respiratória diafragmática.',
          JSON.stringify([
            'Sente-se ereto com os ombros relaxados e respire pelo abdômen.',
            'Junte os lábios suavemente sem comprimir.',
            "Sopre o ar fazendo os lábios vibrarem continuamente no som 'Brrr'.",
            'Mantenha um som constante por 8 a 10 segundos, sem oscilar a intensidade.',
            'Repita 4 séries com pausas de 15 segundos para hidratação.'
          ]),
          4, 45, 196,
          'Se sentir cócegas no nariz ou nos lábios, é sinal de ressonância adequada.',
          'Wind', 1, 40, 0
        ],
        [
          'bocejo_suspiro',
          'Bocejo-Suspiro (Yawn-Sigh)',
          'Relaxamento Laríngeo',
          'Descendente Suave',
          'Indução de bocejo verdadeiro com saída de ar em suspiro vocalizado suave.',
          'Promove o rebaixamento fisiológico da cartilagem tireóidea e relaxamento de toda a musculatura supra-hioidea.',
          JSON.stringify([
            'Abra a boca e simule um bocejo gostoso, sentindo a laringe descer e o céu da boca subir.',
            "No ápice do bocejo, solte o ar suspirando com voz suave na vogal 'Aaaaah'.",
            'Deixe o queixo cair solto e os ombros descerem.',
            'Repita lentamente 5 vezes com intervalos de respiração serena.'
          ]),
          5, 45, 170,
          'Sensação de frescor no fundo da garganta é perfeitamente normal durante este exercício.',
          'Feather', 1, 35, 0
        ],
        [
          'canudo_sovte',
          "Tubo Semiocluído / Canudo d'Água (SOVTE)",
          'Trato Vocal Semiocluído',
          'Glide Suave (150Hz - 320Hz)',
          'Fonação através de um canudo com ponta imersa a 2cm em copo com água.',
          'Cria contrapressão positiva no trato vocal, promovendo afastamento mecânico suave das bordas livres das pregas vocais e aumento da ressonância acústica.',
          JSON.stringify([
            'Coloque água em um copo (cerca de metade do volume).',
            'Mergulhe o canudo a exatamente 2 cm abaixo da superfície da água.',
            'Vede bem os lábios ao redor do canudo sem deixar o ar escapar pelos lados ou nariz.',
            "Emita um som confortável 'Uuuu', produzindo borbulhas constantes e suaves na água.",
            'Faça pequenas subidas e descidas de tom sem forçar a garganta.'
          ]),
          5, 60, 220,
          'Mantenha as bolhas uniformes. Não deixe o canudo encostar no fundo do copo.',
          'Waves', 2, 50, 0
        ],
        [
          'humming_mascara',
          'Humming (Ressonância em /m/)',
          'Ressonância & Foco Facial',
          'Médio Suave (165Hz - 240Hz)',
          "Emissão suave do som 'Mmm' sentindo a vibração óssea na máscara facial (nariz e maçãs do rosto).",
          'Transfere a energia acústica da laringe para os ressonadores faciais, gerando projeção brilhante e relaxamento da garganta.',
          JSON.stringify([
            'Mantenha a boca fechada, dentes ligeiramente separados e mandíbula solta.',
            'Inspire pelo nariz com calma.',
            "Produza o som 'Mmm' como se estivesse saboreando uma comida deliciosa.",
            'Coloque a ponta dos dedos delicadamente na asa do nariz para sentir a vibração.',
            'Execute em tom médio e relaxado por 10 segundos cada repetição.'
          ]),
          4, 50, 210,
          'Se sentir aperto na garganta, imagine que está engolindo ar e abrindo a faringe.',
          'Smile', 2, 45, 0
        ],
        [
          'desafio_bolhas_sovte',
          'Desafio Especial: Bolhas Contínuas SOVTE',
          'Desafio Nível 2',
          'Sustentação Estável (220Hz)',
          'Desafio de estabilidade de fluxo aéreo sustentando borbulhamento por 90 segundos com pressão uniforme.',
          'Fortalecimento da capacidade vital e resistência pneumofônica sem estresse mecânico glótico.',
          JSON.stringify([
            'Mergulhe o canudo a 2cm.',
            'Inicie a fonação contínua e mantenha as bolhas no mesmo tamanho e frequência de som.',
            'Procure manter o pitch fixo na frequência recomendada pelo aplicativo.',
            'Não deixe o som morrer antes do cronômetro atingir a meta.'
          ]),
          3, 90, 220,
          'Bônus especial de 75 XP concedido ao manter a afinação estável.',
          'Award', 2, 75, 1
        ],
        [
          'relacao_sz',
          'Sustentação Fricativa /s/ e /z/',
          'Coordenação Pneumofônica',
          'Tempo Máximo de Fonação',
          'Emissão contínua cronometrada do som surdo /s/ seguida pelo som sonoro /z/.',
          'Avalia a eficiência do fechamento glótico e o suporte respiratório. A relação ideal entre /s/ e /z/ fica próxima de 1,0 (entre 0.8 e 1.2).',
          JSON.stringify([
            'Inspire profundamente pelo nariz expandindo a região costo-diafragmática.',
            'Ao iniciar o cronômetro, solte o som /s/ de forma contínua e suave até esgotar o ar confortável.',
            'Descanse 30 segundos respirando normalmente.',
            'Inspire novamente da mesma forma e emita o som /z/ cronometrado.',
            'O aplicativo calcula automaticamente a sua relação s/z.'
          ]),
          3, 60, 180,
          'Não esvazie os pulmões até sentir dor; pare quando o som perder estabilidade.',
          'Timer', 3, 60, 0
        ],
        [
          'desafio_proporcao_aurea',
          'Desafio de Ouro: Proporção s/z Perfeita',
          'Desafio Nível 3',
          'Relação 0.90 - 1.10',
          'Desafio de alta precisão glótica: alcance uma relação s/z exatamente entre 0.90 e 1.10.',
          'Consagração de fechamento glótico ideal e sincronia neuromuscular completa.',
          JSON.stringify([
            'Realize 1 rodada de aquecimento leve com humming.',
            'Execute a medição do /s/ sem tensão nos ombros.',
            'Execute o /z/ mantendo a mesma pressão de ar e suporte diafragmático.',
            'Atingir a faixa de 0.90 a 1.10 desbloqueia o distintivo de ouro.'
          ]),
          2, 70, 185,
          "Concede 90 XP e distintivo de 'Harmonia Pneumofônica'.",
          'Award', 3, 90, 1
        ],
        [
          'glissando_sirene',
          'Glissando / Sirene Vocal',
          'Flexibilidade & Extensão',
          'Grave ao Agudo (120Hz - 440Hz)',
          'Transição contínua e deslizante do tom mais grave confortável até o tom agudo suave.',
          'Alongamento e fortalecimento coordenado dos músculos tensores (cricotireóideo) e adutores das pregas vocais, eliminando quebras vocais.',
          JSON.stringify([
            "Pode ser feito em vibração de lábios ou com a sílaba 'Uuu'.",
            'Inicie em uma nota grave relaxada.',
            'Deslize suavemente a voz para o agudo sem dar saltos bruscos ou aumentar o volume.',
            'No topo, retorne deslizando suavemente de volta à nota grave inicial.',
            'Imagine desenhar um arco-íris suave com o som.'
          ]),
          4, 60, 260,
          'Nunca force notas excessivamente agudas com esforço. O volume deve permanecer leve.',
          'TrendingUp', 4, 70, 0
        ],
        [
          'desafio_arco_iris',
          'Desafio Arco-Íris Acústico',
          'Desafio Nível 4',
          'Extensão de 2 Oitavas',
          'Realize 5 glissandos perfeitos cobrindo desde o registro basal até o registro de cabeça sem quebras ou perda de fôlego.',
          'Flexibilização máxima do ligamento vocal e ajuste fino do músculo cricotireóideo.',
          JSON.stringify([
            'Suba e desça a voz de forma ultra-suave.',
            'Acompanhe o traçado do diapasão em tempo real.',
            'Mantenha a postura ereta e o queixo paralelo ao chão.'
          ]),
          5, 75, 290,
          'Recompensa: 100 XP e título de Mestre dos Glissandos.',
          'Award', 4, 100, 1
        ],
        [
          'vocal_fry',
          'Vocal Fry / Basculamento Posterior',
          'Desaquecimento Vocal',
          'Sub-grave / Frequência Mínima (<90Hz)',
          "Produção do som crepitante/borbulhante 'creak' no limite inferior da tessitura.",
          'Excelente para desaquecimento vocal e descompressão após dias intensos de trabalho, aproximando o corpo celular das pregas vocais sem estresse muscular.',
          JSON.stringify([
            'Sente-se confortavelmente e esvazie metade do ar dos pulmões.',
            'Com o restinho do ar, emita um som crepitante bem frouxo e lento, como uma porta velha rangendo.',
            'O som deve parecer pequenos estalinhos contínuos na garganta.',
            'Faça por 4 a 6 segundos sem nenhuma força ou esforço.'
          ]),
          4, 40, 80,
          'Não faça com força de ar. Deve soar quase como um sussurro crepitante relaxante.',
          'Moon', 5, 80, 0
        ],
        [
          'desafio_alta_performance',
          'Desafio Supremo: Articulação Rítmica & Projeção',
          'Desafio Nível 5',
          'Alta Performance',
          'Coordenação de trava-línguas com foco articulatório e projeção de máscara facial sem esforço laríngeo.',
          'Precisão fonética máxima, velocidade de fala equilibrada e clareza para profissionais da voz.',
          JSON.stringify([
            'Pronuncie frases com trava-línguas mantendo a mandíbula ampla e relaxada.',
            'Alterne volumes entre piano e forte mantendo a ressonância frontal.',
            'Finalize com 1 minuto de vocal fry de descompressão.'
          ]),
          5, 90, 220,
          "Recompensa máxima: 120 XP e selo de 'Voz de Ouro'.",
          'Award', 5, 120, 1
        ]
      ];

      const insertEx = db.prepare(`
        INSERT INTO exercises (
          id, title, category, target_range, description, benefits, instructions,
          default_reps, default_duration_sec, target_hz, caution_tips, icon_name,
          min_level, xp_reward, is_challenge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const ex of seedExercises) {
        insertEx.run(...ex);
      }
    }
  } catch (err) {
    console.warn('[Vocalis SQLite Seed Error - Exercises]:', err);
  }

  // Auto-seed de Lembretes se vazio
  try {
    const remCount: any = db.prepare('SELECT COUNT(*) as count FROM reminders').get();
    if (!remCount || remCount.count === 0) {
      db.prepare(`
        INSERT INTO reminders (user_id, title_enc, time_str, days_mask, is_active, sound_alert, category)
        VALUES (?, ?, ?, ?, 1, 1, ?)
      `).run(2, encryptText('Aquecimento Matinal com Trilos'), '08:15', JSON.stringify(['seg', 'ter', 'qua', 'qui', 'sex']), 'aquecimento');

      db.prepare(`
        INSERT INTO reminders (user_id, title_enc, time_str, days_mask, is_active, sound_alert, category)
        VALUES (?, ?, ?, ?, 1, 1, ?)
      `).run(2, encryptText('Pausa de Hidratação & Canudo SOVTE'), '14:00', JSON.stringify(['seg', 'ter', 'qua', 'qui', 'sex', 'sab']), 'hidratacao');

      db.prepare(`
        INSERT INTO reminders (user_id, title_enc, time_str, days_mask, is_active, sound_alert, category)
        VALUES (?, ?, ?, ?, 1, 1, ?)
      `).run(2, encryptText('Desaquecimento Noturno & Relaxamento'), '20:30', JSON.stringify(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']), 'desaquecimento');
    }
  } catch (err) {
    console.warn('[Vocalis SQLite Seed Error - Reminders]:', err);
  }

  // Auto-seed de Logs se vazio
  try {
    const logCount: any = db.prepare('SELECT COUNT(*) as count FROM exercise_logs').get();
    if (!logCount || logCount.count === 0) {
      const today = new Date();
      const d1 = new Date(today); d1.setDate(today.getDate() - 3);
      const d2 = new Date(today); d2.setDate(today.getDate() - 2);
      const d3 = new Date(today); d3.setDate(today.getDate() - 1);
      const d4 = new Date(today);

      db.prepare(`
        INSERT INTO exercise_logs (user_id, exercise_id, exercise_title, duration_sec, repetitions, pitch_accuracy, effort_level, fatigue_before, fatigue_after, notes_enc, date_iso, xp_earned)
        VALUES (2, 'vib_labios', 'Vibração de Lábios (Trilos)', 180, 4, 94.5, 2, 5, 2, ?, ?, 50)
      `).run(encryptText('A voz respondeu mais rápido hoje. Sem pigarro no final do exercício.'), d1.toISOString().split('T')[0]);

      db.prepare(`
        INSERT INTO exercise_logs (user_id, exercise_id, exercise_title, duration_sec, repetitions, pitch_accuracy, effort_level, fatigue_before, fatigue_after, notes_enc, date_iso, xp_earned)
        VALUES (2, 'canudo_sovte', 'Tubo Semiocluído / Canudo d''Água (SOVTE)', 240, 5, 92.0, 3, 6, 2, ?, ?, 50)
      `).run(encryptText('Fiz com canudo de 5mm. Sensação imediata de alívio na laringe após a aula.'), d2.toISOString().split('T')[0]);

      db.prepare(`
        INSERT INTO exercise_logs (user_id, exercise_id, exercise_title, duration_sec, repetitions, pitch_accuracy, effort_level, fatigue_before, fatigue_after, notes_enc, date_iso, xp_earned)
        VALUES (2, 'relacao_sz', 'Sustentação Fricativa /s/ e /z/', 120, 3, 96.0, 2, 3, 1, ?, ?, 50)
      `).run(encryptText('Sustentei /s/ por 18s e /z/ por 17.5s. Relação s/z deu 1.02 (ótimo fechamento).'), d3.toISOString().split('T')[0]);

      db.prepare(`
        INSERT INTO exercise_logs (user_id, exercise_id, exercise_title, duration_sec, repetitions, pitch_accuracy, effort_level, fatigue_before, fatigue_after, notes_enc, date_iso, xp_earned)
        VALUES (2, 'bocejo_suspiro', 'Bocejo-Suspiro (Yawn-Sigh)', 150, 5, 98.0, 1, 4, 1, ?, ?, 50)
      `).run(encryptText('Alívio da rigidez cervical posterior. Excelente antes de dormir.'), d4.toISOString().split('T')[0]);
    }
  } catch (err) {
    console.warn('[Vocalis SQLite Seed Error - Logs]:', err);
  }

  // Auto-seed de Sintomas Vocais se vazio
  try {
    const sympCount: any = db.prepare('SELECT COUNT(*) as count FROM vocal_symptoms').get();
    if (!sympCount || sympCount.count === 0) {
      const today = new Date();
      const d1 = new Date(today); d1.setDate(today.getDate() - 1);
      const d2 = new Date(today); d2.setDate(today.getDate() - 3);
      const d3 = new Date(today); d3.setDate(today.getDate() - 5);

      db.prepare(`
        INSERT INTO vocal_symptoms (user_id, entry_date, vocal_effort, fatigue_score, symptoms_json, triggers_json, notes_enc)
        VALUES (2, ?, 3, 4, ?, ?, ?)
      `).run(
        d1.toISOString().split('T')[0],
        JSON.stringify(['Rouquidão matinal', 'Pigarro persistente', 'Tensão cervical']),
        JSON.stringify(['Uso vocal prolongado (6 aulas)', 'Ar-condicionado da escola']),
        encryptText('Garganta áspera após dar aulas consecutivas sem microfone. O exercício de vibração labial prescrito pela fonoaudióloga aliviou a tensão na laringe antes de dormir.')
      );

      db.prepare(`
        INSERT INTO vocal_symptoms (user_id, entry_date, vocal_effort, fatigue_score, symptoms_json, triggers_json, notes_enc)
        VALUES (2, ?, 2, 3, ?, ?, ?)
      `).run(
        d2.toISOString().split('T')[0],
        JSON.stringify(['Cansaço ao final do dia', 'Secura na boca']),
        JSON.stringify(['Pouca água durante a tarde']),
        encryptText('Bebi apenas 1 litro de água hoje. Senti a voz um pouco mais pesada para projetar na sala de aula, mas sem dor glótica.')
      );

      db.prepare(`
        INSERT INTO vocal_symptoms (user_id, entry_date, vocal_effort, fatigue_score, symptoms_json, triggers_json, notes_enc)
        VALUES (2, ?, 2, 2, ?, ?, ?)
      `).run(
        d3.toISOString().split('T')[0],
        JSON.stringify(['Leve pigarro transitório']),
        JSON.stringify(['Poeira de giz']),
        encryptText('Dia produtivo e voz equilibrada. Pratiquei o canudo d''água (SOVTE) às 14h conforme o plano prescrito.')
      );
    }
  } catch (err) {
    console.warn('[Vocalis SQLite Seed Error - Symptoms]:', err);
  }
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

  getExercises(patientId?: number) {
    const db = getDatabase();
    let query = 'SELECT * FROM exercises WHERE (patient_id IS NULL OR patient_id = 0';
    const params: any[] = [];
    if (patientId) {
      query += ' OR patient_id = ?';
      params.push(patientId);
    }
    query += ') ORDER BY is_custom DESC, min_level ASC, is_challenge ASC, id ASC';
    const rows = db.prepare(query).all(...params);
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      target_range: r.target_range || 'Frequência Confortável',
      description: r.description,
      benefits: r.benefits || '',
      instructions: r.instructions ? (typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions) : [],
      default_reps: r.default_reps || 3,
      default_duration_sec: r.default_duration_sec || 60,
      target_hz: r.target_hz || 220,
      caution_tips: r.caution_tips || '',
      icon_name: r.icon_name || 'Activity',
      min_level: r.min_level ?? 1,
      xp_reward: r.xp_reward ?? 45,
      is_challenge: Boolean(r.is_challenge),
      video_url: r.video_url || undefined,
      therapist_id: r.therapist_id || undefined,
      created_by_name: r.created_by_name || undefined,
      patient_id: r.patient_id || undefined,
      is_custom: Boolean(r.is_custom)
    }));
  },

  addExercise(data: any, therapistId: number = 1, therapistName: string = 'Dra. Beatriz Menezes') {
    const db = getDatabase();
    const id = data.id || `custom_${Date.now()}`;
    const title = data.title || 'Novo Exercício Vocal';
    const category = data.category || 'Trato Vocal Semiocluído';
    const targetRange = data.target_range || 'Frequência Confortável';
    const description = data.description || '';
    const benefits = data.benefits || '';
    const instructionsStr = JSON.stringify(Array.isArray(data.instructions) ? data.instructions : [data.instructions || 'Siga as orientações da sua fonoaudióloga.']);
    const defaultReps = Number(data.default_reps || 3);
    const defaultDurationSec = Number(data.default_duration_sec || 60);
    const targetHz = Number(data.target_hz || 220);
    const cautionTips = data.caution_tips || 'Interrompa caso sinta dor, esforço exagerado ou desconforto vocal.';
    const iconName = data.icon_name || 'Sparkles';
    const minLevel = Number(data.min_level || 1);
    const xpReward = Number(data.xp_reward || 45);
    const isChallenge = data.is_challenge ? 1 : 0;
    const videoUrl = data.video_url || '';
    const patientId = data.patient_id ? Number(data.patient_id) : null;

    db.prepare(`
      INSERT INTO exercises (
        id, title, category, target_range, description, benefits, instructions,
        default_reps, default_duration_sec, target_hz, caution_tips, icon_name,
        min_level, xp_reward, is_challenge, video_url, therapist_id, created_by_name, patient_id, is_custom
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id, title, category, targetRange, description, benefits, instructionsStr,
      defaultReps, defaultDurationSec, targetHz, cautionTips, iconName,
      minLevel, xpReward, isChallenge, videoUrl, therapistId, therapistName, patientId
    );

    return {
      success: true,
      exercise: {
        id, title, category, target_range: targetRange, description, benefits,
        instructions: JSON.parse(instructionsStr),
        default_reps: defaultReps,
        default_duration_sec: defaultDurationSec,
        target_hz: targetHz,
        caution_tips: cautionTips,
        icon_name: iconName,
        min_level: minLevel,
        xp_reward: xpReward,
        is_challenge: Boolean(isChallenge),
        video_url: videoUrl,
        therapist_id: therapistId,
        created_by_name: therapistName,
        patient_id: patientId,
        is_custom: true
      }
    };
  },

  updateExercise(id: string, data: any) {
    const db = getDatabase();
    const existing: any = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Exercício não encontrado');
    }

    const title = data.title ?? existing.title;
    const category = data.category ?? existing.category;
    const targetRange = data.target_range ?? existing.target_range;
    const description = data.description ?? existing.description;
    const benefits = data.benefits ?? existing.benefits;
    const instructionsStr = data.instructions ? JSON.stringify(data.instructions) : existing.instructions;
    const defaultReps = data.default_reps ? Number(data.default_reps) : existing.default_reps;
    const defaultDurationSec = data.default_duration_sec ? Number(data.default_duration_sec) : existing.default_duration_sec;
    const targetHz = data.target_hz ? Number(data.target_hz) : existing.target_hz;
    const cautionTips = data.caution_tips ?? existing.caution_tips;
    const videoUrl = data.video_url !== undefined ? data.video_url : existing.video_url;
    const patientId = data.patient_id !== undefined ? (data.patient_id ? Number(data.patient_id) : null) : existing.patient_id;

    db.prepare(`
      UPDATE exercises SET
        title = ?,
        category = ?,
        target_range = ?,
        description = ?,
        benefits = ?,
        instructions = ?,
        default_reps = ?,
        default_duration_sec = ?,
        target_hz = ?,
        caution_tips = ?,
        video_url = ?,
        patient_id = ?
      WHERE id = ?
    `).run(
      title, category, targetRange, description, benefits, instructionsStr,
      defaultReps, defaultDurationSec, targetHz, cautionTips, videoUrl, patientId, id
    );

    return { success: true, message: 'Exercício atualizado com sucesso' };
  },

  deleteExercise(id: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
    return { success: true, message: 'Exercício removido' };
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
  },

  getSymptoms(userId?: number) {
    const db = getDatabase();
    let query = `
      SELECT s.*, u.name as patient_name
      FROM vocal_symptoms s
      LEFT JOIN users u ON u.id = s.user_id
    `;
    const params: any[] = [];
    if (userId) {
      query += ' WHERE s.user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY s.entry_date DESC, s.id DESC';
    const rows = db.prepare(query).all(...params);

    return rows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      patient_name: r.patient_name || 'Paciente',
      entry_date: r.entry_date,
      vocal_effort: r.vocal_effort,
      fatigue_score: r.fatigue_score,
      symptoms: r.symptoms_json ? (typeof r.symptoms_json === 'string' ? JSON.parse(r.symptoms_json) : r.symptoms_json) : [],
      triggers: r.triggers_json ? (typeof r.triggers_json === 'string' ? JSON.parse(r.triggers_json) : r.triggers_json) : [],
      notes: r.notes_enc ? decryptText(r.notes_enc) : '',
      created_at: r.created_at
    }));
  },

  addSymptom(data: any, userId?: number) {
    const db = getDatabase();
    const uid = userId || data.user_id || 2;
    const entryDate = data.entry_date || new Date().toISOString().split('T')[0];
    const vocalEffort = Number(data.vocal_effort ?? 2);
    const fatigueScore = Number(data.fatigue_score ?? 2);
    const symptomsJson = JSON.stringify(Array.isArray(data.symptoms) ? data.symptoms : []);
    const triggersJson = JSON.stringify(Array.isArray(data.triggers) ? data.triggers : []);
    const notesEnc = encryptText(data.notes || '');

    const res = db.prepare(`
      INSERT INTO vocal_symptoms (user_id, entry_date, vocal_effort, fatigue_score, symptoms_json, triggers_json, notes_enc)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uid, entryDate, vocalEffort, fatigueScore, symptomsJson, triggersJson, notesEnc);

    const insertedId = Number(res.lastInsertRowid);
    const userRow: any = db.prepare('SELECT name FROM users WHERE id = ?').get(uid);

    return {
      success: true,
      symptom: {
        id: insertedId,
        user_id: uid,
        patient_name: userRow?.name || 'Paciente',
        entry_date: entryDate,
        vocal_effort: vocalEffort,
        fatigue_score: fatigueScore,
        symptoms: data.symptoms || [],
        triggers: data.triggers || [],
        notes: data.notes || '',
        created_at: new Date().toISOString()
      }
    };
  },

  deleteSymptom(id: number) {
    const db = getDatabase();
    db.prepare('DELETE FROM vocal_symptoms WHERE id = ?').run(id);
    return { success: true, id };
  }
};
