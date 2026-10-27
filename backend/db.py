"""
Vocalis - Banco de Dados SQLite com Criptografia de Dados Clínicos, Gamificação & Sistema de Autenticação/Códigos Clínicos
Gerencia esquema relacional, autenticação de pacientes e fonoaudiólogas, códigos de ativação clínica,
migrações automáticas de níveis e XP, sementes fonoaudiológicas, desafios especiais e auditoria de privacidade.
"""

import os
import sqlite3
import json
import random
import string
import hashlib
import hmac
from datetime import datetime, date, timedelta
from crypto_vault import encrypt_text, decrypt_text

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.join(DB_DIR, "vocalis.db")

# Configuração dos Níveis de Gamificação Fonoaudiológica
LEVEL_CONFIG = [
    {
        "level": 1,
        "title": "Aprendiz Vocal",
        "min_xp": 0,
        "max_xp": 200,
        "description": "Início da conscientização respiratória e soltura muscular laríngea.",
        "icon": "Seedling",
        "unlocked_features": ["Exercícios Fundamentais de Vibração e Bocejo"]
    },
    {
        "level": 2,
        "title": "Ressonador Ativo",
        "min_xp": 200,
        "max_xp": 550,
        "description": "Domínio do Trato Vocal Semiocluído (SOVTE) e foco de máscara facial.",
        "icon": "Waves",
        "unlocked_features": ["Canudo d'Água (SOVTE)", "Humming Facial", "Desafios de Bolhas"]
    },
    {
        "level": 3,
        "title": "Guardião da Laringe",
        "min_xp": 550,
        "max_xp": 1050,
        "description": "Coordenação pneumofonoarticulatória avançada e equilíbrio glótico.",
        "icon": "ShieldCheck",
        "unlocked_features": ["Protocolo Relação s/z", "Desafio da Proporção Áurea"]
    },
    {
        "level": 4,
        "title": "Mestre da Fonação",
        "min_xp": 1050,
        "max_xp": 1750,
        "description": "Elasticidade muscular cricotireóidea e ampliação da tessitura sem quebras.",
        "icon": "TrendingUp",
        "unlocked_features": ["Glissandos Ascendentes", "Sirene Vocal", "Desafio do Arco-Íris"]
    },
    {
        "level": 5,
        "title": "Voz de Ouro & Maestria",
        "min_xp": 1750,
        "max_xp": 999999,
        "description": "Alta performance acústica, resistência profissional e relaxamento profundo.",
        "icon": "Crown",
        "unlocked_features": ["Vocal Fry / Basculamento", "Desafio de Hiperarticulação Rítmica"]
    }
]


def hash_password(password: str, salt: bytes = None) -> tuple[str, str]:
    """Gera hash seguro com PBKDF2-HMAC-SHA256 (10.000 iterações)."""
    if salt is None:
        salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 10000, dklen=32)
    return key.hex(), salt.hex()


def verify_password(password: str, hash_hex: str, salt_hex: str) -> bool:
    """Valida a senha do usuário contra o hash armazenado."""
    try:
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 10000, dklen=32)
        return hmac.compare_digest(key.hex(), hash_hex)
    except Exception:
        return False


def generate_code_str(prefix="VOCA") -> str:
    """Gera código alfanumérico único para a fonoaudióloga fornecer ao paciente."""
    chars = "".join(random.choices(string.digits + "ABCDEFGHJKLMNPQRSTUVWXYZ", k=4))
    return f"{prefix}-{chars}"


def get_level_info(xp: int) -> dict:
    """Calcula nível e progresso percentual baseado no XP acumulado."""
    for cfg in LEVEL_CONFIG:
        if cfg["level"] == 5 and xp >= cfg["min_xp"]:
            return {
                **cfg,
                "current_xp": xp,
                "progress_percent": 100,
                "xp_for_next_level": 0
            }
        if cfg["min_xp"] <= xp < cfg["max_xp"]:
            span = cfg["max_xp"] - cfg["min_xp"]
            current_in_level = xp - cfg["min_xp"]
            percent = min(100, max(0, int((current_in_level / span) * 100)))
            return {
                **cfg,
                "current_xp": xp,
                "progress_percent": percent,
                "xp_for_next_level": cfg["max_xp"] - xp
            }
    # Fallback para nível 1
    return {
        **LEVEL_CONFIG[0],
        "current_xp": xp,
        "progress_percent": 0,
        "xp_for_next_level": 200 - xp
    }


def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Tabela de Usuários (Pacientes e Fonoaudiólogas)
    cursor.execute("""
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
    """)

    # Tabela de Códigos de Ativação Clínica gerados pela Fonoaudióloga
    cursor.execute("""
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
    """)

    # Tabela do Paciente (Campos sensíveis criptografados)
    cursor.execute("""
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
    """)

    # Migrações seguras se colunas novas precisarem ser adicionadas
    try:
        cursor.execute("ALTER TABLE patient ADD COLUMN user_id INTEGER")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE patient ADD COLUMN xp_points INTEGER DEFAULT 350")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE patient ADD COLUMN level INTEGER DEFAULT 2")
    except Exception:
        pass

    # Tabela de Catálogo de Exercícios Vocais & Desafios
    cursor.execute("""
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
    """)

    # Tabela de Registros de Exercícios (Logs)
    cursor.execute("""
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
    """)

    try:
        cursor.execute("ALTER TABLE exercise_logs ADD COLUMN user_id INTEGER")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE exercise_logs ADD COLUMN xp_earned INTEGER DEFAULT 50")
    except Exception:
        pass

    # Tabela de Lembretes Diários
    cursor.execute("""
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
    """)

    # Tabela de Auditoria de Segurança
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details_enc TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # Seed inicial de usuários se vazia
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        # 1. Fonoaudióloga padrão
        fono_hash, fono_salt = hash_password("Fono1234!")
        cursor.execute("""
        INSERT INTO users (role, name, email, phone, password_hash, salt, is_activated)
        VALUES ('fonoaudiologa', 'Dra. Beatriz Menezes', 'dra.beatriz@vocalis.com.br', '(11) 98765-4321', ?, ?, 1)
        """, (fono_hash, fono_salt))
        fono_id = cursor.lastrowid

        # Códigos de acesso criados pela fonoaudióloga
        cursor.execute("""
        INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used, created_at)
        VALUES (?, 'VOCA-7842', 'Camila Vasconcelos', 'camila@email.com', 1, CURRENT_TIMESTAMP)
        """, (fono_id,))
        code_1_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used, created_at)
        VALUES (?, 'VOCA-2026', 'Novo Paciente VIP', '', 0, CURRENT_TIMESTAMP)
        """, (fono_id,))

        cursor.execute("""
        INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used, created_at)
        VALUES (?, 'FONO-9900', 'Paciente Avaliação', '', 0, CURRENT_TIMESTAMP)
        """, (fono_id,))

        # 2. Paciente padrão ativado
        paciente_hash, paciente_salt = hash_password("Voz1234!")
        cursor.execute("""
        INSERT INTO users (role, name, email, password_hash, salt, is_activated, therapist_id, activation_code_used)
        VALUES ('paciente', 'Camila Vasconcelos', 'camila@email.com', ?, ?, 1, ?, 'VOCA-7842')
        """, (paciente_hash, paciente_salt, fono_id))
        paciente_id = cursor.lastrowid

        cursor.execute("UPDATE access_codes SET used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?", (paciente_id, code_1_id))
        conn.commit()

    # Seed inicial do paciente clínico se tabela estiver sem registro
    cursor.execute("SELECT COUNT(*) FROM patient")
    if cursor.fetchone()[0] == 0:
        p_name = encrypt_text("Camila Vasconcelos")
        p_diag = encrypt_text("Fadiga vocal ocupacional com fenda glótica paralela leve (Professora de Ensino Médio)")
        p_therapist = encrypt_text("Dra. Beatriz Menezes")
        p_crfa = encrypt_text("CRFa 2-19842/SP")
        p_notes = encrypt_text("Foco em hidratação pré-aula, exercícios com tubo de ressonância (SOVTE) e monitoramento de tensão cervical.")
        
        cursor.execute("""
        INSERT INTO patient (user_id, name_enc, diagnosis_enc, therapist_name_enc, therapist_crfa_enc, clinical_notes_enc, daily_goal_minutes, streak_count, best_streak, last_exercise_date, xp_points, level)
        VALUES (2, ?, ?, ?, ?, ?, 15, 4, 12, ?, 380, 2)
        """, (p_name, p_diag, p_therapist, p_crfa, p_notes, (date.today() - timedelta(days=1)).isoformat()))
        conn.commit()

    # Seed e atualização de exercícios e novos desafios de nível
    seed_exercises = [
        # Nível 1: Fundamentais
        (
            "vib_labios",
            "Vibração de Lábios (Trilos)",
            "Aquecimento & Soltura",
            "Frequência Confortável (130Hz - 260Hz)",
            "Produção contínua do som 'Brrr' com vibração solta dos lábios.",
            "Equaliza a pressão subglótica, reduz o impacto direto das pregas vocais e ativa a musculatura respiratória diafragmática.",
            json.dumps([
                "Sente-se ereto com os ombros relaxados e respire pelo abdômen.",
                "Junte os lábios suavemente sem comprimir.",
                "Sopre o ar fazendo os lábios vibrarem continuamente no som 'Brrr'.",
                "Mantenha um som constante por 8 a 10 segundos, sem oscilar a intensidade.",
                "Repita 4 séries com pausas de 15 segundos para hidratação."
            ]),
            4, 45, 196,
            "Se sentir cócegas no nariz ou nos lábios, é sinal de ressonância adequada.",
            "Wind", 1, 40, 0
        ),
        (
            "bocejo_suspiro",
            "Bocejo-Suspiro (Yawn-Sigh)",
            "Relaxamento Laríngeo",
            "Descendente Suave",
            "Indução de bocejo verdadeiro com saída de ar em suspiro vocalizado suave.",
            "Promove o rebaixamento fisiológico da cartilagem tireóidea e relaxamento de toda a musculatura supra-hioidea.",
            json.dumps([
                "Abra a boca e simule um bocejo gostoso, sentindo a laringe descer e o céu da boca subir.",
                "No ápice do bocejo, solte o ar suspirando com voz suave na vogal 'Aaaaah'.",
                "Deixe o queixo cair solto e os ombros descerem.",
                "Repita lentamente 5 vezes com intervalos de respiração serena."
            ]),
            5, 45, 170,
            "Sensação de frescor no fundo da garganta é perfeitamente normal durante este exercício.",
            "Feather", 1, 35, 0
        ),

        # Nível 2: Trato Semiocluído e Ressonância
        (
            "canudo_sovte",
            "Tubo Semiocluído / Canudo d'Água (SOVTE)",
            "Trato Vocal Semiocluído",
            "Glide Suave (150Hz - 320Hz)",
            "Fonação através de um canudo com ponta imersa a 2cm em copo com água.",
            "Cria contrapressão positiva no trato vocal, promovendo afastamento mecânico suave das bordas livres das pregas vocais e aumento da ressonância acústica.",
            json.dumps([
                "Coloque água em um copo (cerca de metade do volume).",
                "Mergulhe o canudo a exatamente 2 cm abaixo da superfície da água.",
                "Vede bem os lábios ao redor do canudo sem deixar o ar escapar pelos lados ou nariz.",
                "Emita um som confortável 'Uuuu', produzindo borbulhas constantes e suaves na água.",
                "Faça pequenas subidas e descidas de tom sem forçar a garganta."
            ]),
            5, 60, 220,
            "Mantenha as bolhas uniformes. Não deixe o canudo encostar no fundo do copo.",
            "Waves", 2, 50, 0
        ),
        (
            "humming_mascara",
            "Humming (Ressonância em /m/)",
            "Ressonância & Foco Facial",
            "Médio Suave (165Hz - 240Hz)",
            "Emissão suave do som 'Mmm' sentindo a vibração óssea na máscara facial (nariz e maçãs do rosto).",
            "Transfere a energia acústica da laringe para os ressonadores faciais, gerando projeção brilhante e relaxamento da garganta.",
            json.dumps([
                "Mantenha a boca fechada, dentes ligeiramente separados e mandíbula solta.",
                "Inspire pelo nariz com calma.",
                "Produza o som 'Mmm' como se estivesse saboreando uma comida deliciosa.",
                "Coloque a ponta dos dedos delicadamente na asa do nariz para sentir a vibração.",
                "Execute em tom médio e relaxado por 10 segundos cada repetição."
            ]),
            4, 50, 210,
            "Se sentir aperto na garganta, imagine que está engolindo ar e abrindo a faringe.",
            "Smile", 2, 45, 0
        ),
        (
            "desafio_bolhas_sovte",
            "Desafio Especial: Bolhas Contínuas SOVTE",
            "Desafio Nível 2",
            "Sustentação Estável (220Hz)",
            "Desafio de estabilidade de fluxo aéreo sustentando borbulhamento por 90 segundos com pressão uniforme.",
            "Fortalecimento da capacidade vital e resistência pneumofônica sem estresse mecânico glótico.",
            json.dumps([
                "Mergulhe o canudo a 2cm.",
                "Inicie a fonação contínua e mantenha as bolhas no mesmo tamanho e frequência de som.",
                "Procure manter o pitch fixo na frequência recomendada pelo aplicativo.",
                "Não deixe o som morrer antes do cronômetro atingir a meta."
            ]),
            3, 90, 220,
            "Bônus especial de 75 XP concedido ao manter a afinação estável.",
            "Award", 2, 75, 1
        ),

        # Nível 3: Coordenação Pneumofônica Avançada
        (
            "relacao_sz",
            "Sustentação Fricativa /s/ e /z/",
            "Coordenação Pneumofônica",
            "Tempo Máximo de Fonação",
            "Emissão contínua cronometrada do som surdo /s/ seguida pelo som sonoro /z/.",
            "Avalia a eficiência do fechamento glótico e o suporte respiratório. A relação ideal entre /s/ e /z/ fica próxima de 1,0 (entre 0.8 e 1.2).",
            json.dumps([
                "Inspire profundamente pelo nariz expandindo a região costo-diafragmática.",
                "Ao iniciar o cronômetro, solte o som /s/ de forma contínua e suave até esgotar o ar confortável.",
                "Descanse 30 segundos respirando normalmente.",
                "Inspire novamente da mesma forma e emita o som /z/ cronometrado.",
                "O aplicativo calcula automaticamente a sua relação s/z."
            ]),
            3, 60, 180,
            "Não esvazie os pulmões até sentir dor; pare quando o som perder estabilidade.",
            "Timer", 3, 60, 0
        ),
        (
            "desafio_proporcao_aurea",
            "Desafio de Ouro: Proporção s/z Perfeita",
            "Desafio Nível 3",
            "Relação 0.90 - 1.10",
            "Desafio de alta precisão glótica: alcance uma relação s/z exatamente entre 0.90 e 1.10.",
            "Consagração de fechamento glótico ideal e sincronia neuromuscular completa.",
            json.dumps([
                "Realize 1 rodada de aquecimento leve com humming.",
                "Execute a medição do /s/ sem tensão nos ombros.",
                "Execute o /z/ mantendo a mesma pressão de ar e suporte diafragmático.",
                "Atingir a faixa de 0.90 a 1.10 desbloqueia o distintivo de ouro."
            ]),
            2, 70, 185,
            "Concede 90 XP e distintivo de 'Harmonia Pneumofônica'.",
            "Award", 3, 90, 1
        ),

        # Nível 4: Flexibilidade & Extensão
        (
            "glissando_sirene",
            "Glissando / Sirene Vocal",
            "Flexibilidade & Extensão",
            "Grave ao Agudo (120Hz - 440Hz)",
            "Transição contínua e deslizante do tom mais grave confortável até o tom agudo suave.",
            "Alongamento e fortalecimento coordenado dos músculos tensores (cricotireóideo) e adutores das pregas vocais, eliminando quebras vocais.",
            json.dumps([
                "Pode ser feito em vibração de lábios ou com a sílaba 'Uuu'.",
                "Inicie em uma nota grave relaxada.",
                "Deslize suavemente a voz para o agudo sem dar saltos bruscos ou aumentar o volume.",
                "No topo, retorne deslizando suavemente de volta à nota grave inicial.",
                "Imagine desenhar um arco-íris suave com o som."
            ]),
            4, 60, 260,
            "Nunca force notas excessivamente agudas com esforço. O volume deve permanecer leve.",
            "TrendingUp", 4, 70, 0
        ),
        (
            "desafio_arco_iris",
            "Desafio Arco-Íris Acústico",
            "Desafio Nível 4",
            "Extensão de 2 Oitavas",
            "Realize 5 glissandos perfeitos cobrindo desde o registro basal até o registro de cabeça sem quebras ou perda de fôlego.",
            "Flexibilização máxima do ligamento vocal e ajuste fino do músculo cricotireóideo.",
            json.dumps([
                "Suba e desça a voz de forma ultra-suave.",
                "Acompanhe o traçado do diapasão em tempo real.",
                "Mantenha a postura ereta e o queixo paralelo ao chão."
            ]),
            5, 75, 290,
            "Recompensa: 100 XP e título de Mestre dos Glissandos.",
            "Award", 4, 100, 1
        ),

        # Nível 5: Desaquecimento & Alta Performance Vocal
        (
            "vocal_fry",
            "Vocal Fry / Basculamento Posterior",
            "Desaquecimento Vocal",
            "Sub-grave / Frequência Mínima (<90Hz)",
            "Produção do som crepitante/borbulhante 'creak' no limite inferior da tessitura.",
            "Excelente para desaquecimento vocal e descompressão após dias intensos de trabalho, aproximando o corpo celular das pregas vocais sem estresse muscular.",
            json.dumps([
                "Sente-se confortavelmente e esvazie metade do ar dos pulmões.",
                "Com o restinho do ar, emita um som crepitante bem frouxo e lento, como uma porta velha rangendo.",
                "O som deve parecer pequenos estalinhos contínuos na garganta.",
                "Faça por 4 a 6 segundos sem nenhuma força ou esforço."
            ]),
            4, 40, 80,
            "Não faça com força de ar. Deve soar quase como um sussurro crepitante relaxante.",
            "Moon", 5, 80, 0
        ),
        (
            "desafio_alta_performance",
            "Desafio Supremo: Articulação Rítmica & Projeção",
            "Desafio Nível 5",
            "Alta Performance",
            "Coordenação de trava-línguas com foco articulatório e projeção de máscara facial sem esforço laríngeo.",
            "Precisão fonética máxima, velocidade de fala equilibrada e clareza para profissionais da voz.",
            json.dumps([
                "Pronuncie frases com trava-línguas mantendo a mandíbula ampla e relaxada.",
                "Alterne volumes entre piano e forte mantendo a ressonância frontal.",
                "Finalize com 1 minuto de vocal fry de descompressão."
            ]),
            5, 90, 220,
            "Recompensa máxima: 120 XP e selo de 'Voz de Ouro'.",
            "Award", 5, 120, 1
        )
    ]

    for item in seed_exercises:
        cursor.execute("""
        INSERT INTO exercises (
            id, title, category, target_range, description, benefits, instructions,
            default_reps, default_duration_sec, target_hz, caution_tips, icon_name,
            min_level, xp_reward, is_challenge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,
            category=excluded.category,
            target_range=excluded.target_range,
            description=excluded.description,
            benefits=excluded.benefits,
            instructions=excluded.instructions,
            default_reps=excluded.default_reps,
            default_duration_sec=excluded.default_duration_sec,
            target_hz=excluded.target_hz,
            caution_tips=excluded.caution_tips,
            icon_name=excluded.icon_name,
            min_level=excluded.min_level,
            xp_reward=excluded.xp_reward,
            is_challenge=excluded.is_challenge
        """, item)

    conn.commit()
    conn.close()


# ==========================================
# GESTÃO DE USUÁRIOS E AUTENTICAÇÃO
# ==========================================

def register_user(data):
    """Cadastra novo usuário (Paciente ou Fonoaudióloga) com hash seguro e feedback."""
    conn = get_connection()
    cursor = conn.cursor()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    role = data.get("role", "paciente")
    activation_code = data.get("activation_code", "").strip().upper()

    if not name or not email or not password:
        conn.close()
        return {"error": "Nome, e-mail e senha são obrigatórios."}, 400

    if len(password) < 6:
        conn.close()
        return {"error": "A senha deve conter no mínimo 6 caracteres."}, 400

    # Verifica duplicidade de e-mail
    existing = cursor.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return {"error": "Este e-mail já está cadastrado no sistema."}, 409

    pwd_hash, salt = hash_password(password)

    if role == "fonoaudiologa":
        # Fonoaudióloga nasce ativada e ganha códigos iniciais
        cursor.execute("""
        INSERT INTO users (role, name, email, phone, password_hash, salt, is_activated)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        """, (role, name, email, phone, pwd_hash, salt))
        therapist_id = cursor.lastrowid

        # Gera 2 códigos iniciais para ela fornecer aos seus pacientes
        c1 = generate_code_str("VOCA")
        c2 = generate_code_str("FONO")
        cursor.execute("INSERT INTO access_codes (therapist_id, code) VALUES (?, ?)", (therapist_id, c1))
        cursor.execute("INSERT INTO access_codes (therapist_id, code) VALUES (?, ?)", (therapist_id, c2))
        conn.commit()

        user = {
            "id": therapist_id,
            "role": "fonoaudiologa",
            "name": name,
            "email": email,
            "phone": phone,
            "is_activated": True
        }
        conn.close()
        return {"success": True, "user": user, "message": "Cadastro de fonoaudióloga realizado com sucesso!"}, 201

    else:
        # Paciente: verifica se já informou código válido no cadastro
        is_activated = 0
        therapist_id = None
        code_used = None

        if activation_code:
            code_row = cursor.execute("""
            SELECT id, therapist_id, is_used FROM access_codes WHERE code = ?
            """, (activation_code,)).fetchone()

            if code_row and not code_row["is_used"]:
                is_activated = 1
                therapist_id = code_row["therapist_id"]
                code_used = activation_code

        cursor.execute("""
        INSERT INTO users (role, name, email, password_hash, salt, is_activated, therapist_id, activation_code_used)
        VALUES ('paciente', ?, ?, ?, ?, ?, ?, ?)
        """, (name, email, pwd_hash, salt, is_activated, therapist_id, code_used))
        user_id = cursor.lastrowid

        if is_activated and activation_code:
            cursor.execute("""
            UPDATE access_codes SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP
            WHERE code = ?
            """, (user_id, activation_code))

        # Cria prontuário inicial no SQLite para o paciente
        therapist_name = "Dra. Beatriz Menezes"
        if therapist_id:
            th_row = cursor.execute("SELECT name FROM users WHERE id = ?", (therapist_id,)).fetchone()
            if th_row:
                therapist_name = th_row["name"]

        cursor.execute("""
        INSERT INTO patient (user_id, name_enc, diagnosis_enc, therapist_name_enc, therapist_crfa_enc, clinical_notes_enc, daily_goal_minutes, streak_count, best_streak, last_exercise_date, xp_points, level)
        VALUES (?, ?, ?, ?, ?, ?, 15, 0, 0, NULL, 50, 1)
        """, (
            user_id,
            encrypt_text(name),
            encrypt_text("Avaliação vocal inicial"),
            encrypt_text(therapist_name),
            encrypt_text("CRFa Ativo"),
            encrypt_text("Início do acompanhamento clínico via Vocalis.")
        ))

        conn.commit()

        user = {
            "id": user_id,
            "role": "paciente",
            "name": name,
            "email": email,
            "is_activated": bool(is_activated),
            "therapist_id": therapist_id,
            "activation_code_used": code_used
        }
        conn.close()
        return {"success": True, "user": user, "message": "Cadastro de paciente realizado com sucesso!"}, 201


def login_user(data):
    """Autentica o usuário pelo e-mail e senha."""
    conn = get_connection()
    cursor = conn.cursor()

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        conn.close()
        return {"error": "E-mail e senha são obrigatórios."}, 400

    user_row = cursor.execute("""
    SELECT id, role, name, email, phone, password_hash, salt, is_activated, therapist_id, activation_code_used
    FROM users WHERE email = ?
    """, (email,)).fetchone()

    if not user_row or not verify_password(password, user_row["password_hash"], user_row["salt"]):
        conn.close()
        return {"error": "E-mail ou senha incorretos."}, 401

    user = {
        "id": user_row["id"],
        "role": user_row["role"],
        "name": user_row["name"],
        "email": user_row["email"],
        "phone": user_row["phone"],
        "is_activated": bool(user_row["is_activated"]),
        "therapist_id": user_row["therapist_id"],
        "activation_code_used": user_row["activation_code_used"]
    }
    conn.close()
    return {"success": True, "user": user}, 200


def activate_patient_with_code(user_id, code_str):
    """Ativa a conta do paciente após inserir o código fornecido pela fonoaudióloga."""
    conn = get_connection()
    cursor = conn.cursor()

    clean_code = code_str.strip().upper()
    code_row = cursor.execute("""
    SELECT id, therapist_id, is_used FROM access_codes WHERE code = ?
    """, (clean_code,)).fetchone()

    if not code_row:
        conn.close()
        return {"error": "Código de ativação não encontrado ou inválido."}, 404

    if code_row["is_used"]:
        conn.close()
        return {"error": "Este código já foi utilizado por outro paciente."}, 400

    therapist_id = code_row["therapist_id"]

    # Atualiza o código como utilizado
    cursor.execute("""
    UPDATE access_codes SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (user_id, code_row["id"]))

    # Ativa o paciente
    cursor.execute("""
    UPDATE users SET is_activated = 1, therapist_id = ?, activation_code_used = ?
    WHERE id = ?
    """, (therapist_id, clean_code, user_id))

    # Atualiza prontuário do paciente com a fonoaudióloga vinculada
    th_user = cursor.execute("SELECT name FROM users WHERE id = ?", (therapist_id,)).fetchone()
    th_name = th_user["name"] if th_user else "Dra. Beatriz Menezes"

    cursor.execute("""
    UPDATE patient SET therapist_name_enc = ?
    WHERE user_id = ? OR id = (SELECT id FROM patient WHERE user_id = ? LIMIT 1)
    """, (encrypt_text(th_name), user_id, user_id))

    conn.commit()

    updated_user = cursor.execute("""
    SELECT id, role, name, email, phone, is_activated, therapist_id, activation_code_used
    FROM users WHERE id = ?
    """, (user_id,)).fetchone()

    conn.close()

    return {
        "success": True,
        "message": f"Acesso aos exercícios liberado pela fonoaudióloga {th_name}!",
        "user": {
            "id": updated_user["id"],
            "role": updated_user["role"],
            "name": updated_user["name"],
            "email": updated_user["email"],
            "is_activated": True,
            "therapist_id": therapist_id,
            "activation_code_used": clean_code
        }
    }, 200


def create_access_code(therapist_id, patient_name="", patient_email=""):
    """Gera um novo código de acesso vinculado à fonoaudióloga para entregar ao paciente."""
    conn = get_connection()
    cursor = conn.cursor()

    code = generate_code_str("VOCA")
    # Garante unicidade
    while cursor.execute("SELECT id FROM access_codes WHERE code = ?", (code,)).fetchone():
        code = generate_code_str("VOCA")

    cursor.execute("""
    INSERT INTO access_codes (therapist_id, code, patient_name, patient_email, is_used)
    VALUES (?, ?, ?, ?, 0)
    """, (therapist_id, code, patient_name, patient_email))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_id,
        "code": code,
        "therapist_id": therapist_id,
        "patient_name": patient_name,
        "patient_email": patient_email,
        "is_used": False,
        "created_at": datetime.now().isoformat()
    }


def get_therapist_dashboard_data(therapist_id):
    """Retorna códigos gerados e lista de pacientes vinculados para a área da Fonoaudióloga."""
    conn = get_connection()
    cursor = conn.cursor()

    # Códigos gerados
    codes_rows = cursor.execute("""
    SELECT ac.id, ac.code, ac.patient_name, ac.patient_email, ac.is_used, ac.used_at, ac.created_at,
           u.name as activated_by_name, u.email as activated_by_email
    FROM access_codes ac
    LEFT JOIN users u ON ac.used_by_user_id = u.id
    WHERE ac.therapist_id = ?
    ORDER BY ac.created_at DESC
    """, (therapist_id,)).fetchall()

    codes = []
    for r in codes_rows:
        codes.append({
            "id": r["id"],
            "code": r["code"],
            "patient_name": r["patient_name"],
            "patient_email": r["patient_email"],
            "is_used": bool(r["is_used"]),
            "used_at": r["used_at"],
            "created_at": r["created_at"],
            "activated_by_name": r["activated_by_name"],
            "activated_by_email": r["activated_by_email"]
        })

    # Pacientes vinculados
    patients_rows = cursor.execute("""
    SELECT u.id, u.name, u.email, u.activation_code_used, u.created_at,
           p.streak_count, p.best_streak, p.last_exercise_date, p.xp_points, p.level,
           p.diagnosis_enc, p.clinical_notes_enc
    FROM users u
    LEFT JOIN patient p ON (p.user_id = u.id OR p.name_enc = u.name)
    WHERE u.therapist_id = ? AND u.role = 'paciente'
    ORDER BY u.created_at DESC
    """, (therapist_id,)).fetchall()

    patients = []
    for p in patients_rows:
        patients.append({
            "id": p["id"],
            "name": p["name"],
            "email": p["email"],
            "activation_code": p["activation_code_used"],
            "streak": p["streak_count"] or 0,
            "best_streak": p["best_streak"] or 0,
            "last_active": p["last_exercise_date"],
            "xp": p["xp_points"] or 0,
            "level": p["level"] or 1,
            "diagnosis": decrypt_text(p["diagnosis_enc"]) if p["diagnosis_enc"] else "Acompanhamento geral",
            "clinical_notes": decrypt_text(p["clinical_notes_enc"]) if p["clinical_notes_enc"] else ""
        })

    conn.close()
    return {
        "codes": codes,
        "patients": patients,
        "total_codes": len(codes),
        "available_codes": len([c for c in codes if not c["is_used"]]),
        "active_patients": len(patients)
    }


# ==========================================
# EXERCÍCIOS, LOGS E PROGRESSO CLÍNICO
# ==========================================

def get_patient(user_id=None):
    conn = get_connection()
    if user_id:
        row = conn.execute("SELECT * FROM patient WHERE user_id = ? LIMIT 1", (user_id,)).fetchone()
    else:
        row = None
    if not row:
        row = conn.execute("SELECT * FROM patient LIMIT 1").fetchone()
    conn.close()
    if not row:
        return None
    
    xp = row["xp_points"] if "xp_points" in row.keys() and row["xp_points"] is not None else 350
    level_info = get_level_info(xp)
    
    return {
        "id": row["id"],
        "name": decrypt_text(row["name_enc"]),
        "diagnosis": decrypt_text(row["diagnosis_enc"]),
        "therapist_name": decrypt_text(row["therapist_name_enc"]),
        "therapist_crfa": decrypt_text(row["therapist_crfa_enc"]),
        "clinical_notes": decrypt_text(row["clinical_notes_enc"]),
        "daily_goal_minutes": row["daily_goal_minutes"],
        "streak_count": row["streak_count"],
        "best_streak": row["best_streak"],
        "last_exercise_date": row["last_exercise_date"],
        "xp_points": xp,
        "level": level_info["level"],
        "level_title": level_info["title"],
        "level_progress_percent": level_info["progress_percent"],
        "xp_for_next_level": level_info["xp_for_next_level"],
        "created_at": row["created_at"]
    }


def update_patient(data, user_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    if user_id:
        current = conn.execute("SELECT * FROM patient WHERE user_id = ? LIMIT 1", (user_id,)).fetchone()
    else:
        current = None
    if not current:
        current = conn.execute("SELECT * FROM patient LIMIT 1").fetchone()
    if not current:
        conn.close()
        return None

    name_enc = encrypt_text(data.get("name", decrypt_text(current["name_enc"])))
    diagnosis_enc = encrypt_text(data.get("diagnosis", decrypt_text(current["diagnosis_enc"])))
    therapist_enc = encrypt_text(data.get("therapist_name", decrypt_text(current["therapist_name_enc"])))
    crfa_enc = encrypt_text(data.get("therapist_crfa", decrypt_text(current["therapist_crfa_enc"])))
    notes_enc = encrypt_text(data.get("clinical_notes", decrypt_text(current["clinical_notes_enc"])))
    daily_goal = int(data.get("daily_goal_minutes", current["daily_goal_minutes"]))

    cursor.execute("""
    UPDATE patient SET
        name_enc = ?,
        diagnosis_enc = ?,
        therapist_name_enc = ?,
        therapist_crfa_enc = ?,
        clinical_notes_enc = ?,
        daily_goal_minutes = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (name_enc, diagnosis_enc, therapist_enc, crfa_enc, notes_enc, daily_goal, current["id"]))
    
    conn.commit()
    conn.close()
    return get_patient(user_id)


def get_all_exercises():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM exercises ORDER BY min_level ASC, is_challenge ASC, id ASC").fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "category": r["category"],
            "target_range": r["target_range"],
            "description": r["description"],
            "benefits": r["benefits"],
            "instructions": json.loads(r["instructions"]) if r["instructions"] else [],
            "default_reps": r["default_reps"],
            "default_duration_sec": r["default_duration_sec"],
            "target_hz": r["target_hz"],
            "caution_tips": r["caution_tips"],
            "icon_name": r["icon_name"],
            "min_level": r["min_level"] if "min_level" in r.keys() else 1,
            "xp_reward": r["xp_reward"] if "xp_reward" in r.keys() else 45,
            "is_challenge": bool(r["is_challenge"]) if "is_challenge" in r.keys() else False
        })
    return results


def get_all_logs(user_id=None):
    conn = get_connection()
    if user_id:
        rows = conn.execute("SELECT * FROM exercise_logs WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC", (user_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM exercise_logs ORDER BY created_at DESC").fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "exercise_id": r["exercise_id"],
            "exercise_title": r["exercise_title"],
            "duration_sec": r["duration_sec"],
            "repetitions": r["repetitions"],
            "pitch_accuracy": r["pitch_accuracy"],
            "effort_level": r["effort_level"],
            "fatigue_before": r["fatigue_before"],
            "fatigue_after": r["fatigue_after"],
            "notes": decrypt_text(r["notes_enc"]),
            "date_iso": r["date_iso"],
            "xp_earned": r["xp_earned"] if "xp_earned" in r.keys() and r["xp_earned"] is not None else 50,
            "created_at": r["created_at"]
        })
    return results


def add_exercise_log(data, user_id=None):
    conn = get_connection()
    cursor = conn.cursor()

    notes_enc = encrypt_text(data.get("notes", ""))
    date_iso = data.get("date_iso", date.today().isoformat())
    
    # Busca dados do exercício para base de XP
    ex_row = cursor.execute("SELECT xp_reward FROM exercises WHERE id = ?", (data.get("exercise_id"),)).fetchone()
    base_xp = ex_row["xp_reward"] if ex_row else 45

    duration_sec = int(data.get("duration_sec", 60))
    reps = int(data.get("repetitions", 3))
    accuracy = float(data.get("pitch_accuracy", 90.0))
    fatigue_before = int(data.get("fatigue_before", 4))
    fatigue_after = int(data.get("fatigue_after", 2))

    # Bônus por afinação
    accuracy_bonus = 0
    if accuracy >= 95.0:
        accuracy_bonus = 25
    elif accuracy >= 85.0:
        accuracy_bonus = 15

    # Bônus por alívio de fadiga
    fatigue_bonus = 0
    if fatigue_before > fatigue_after:
        fatigue_bonus = (fatigue_before - fatigue_after) * 10

    # Busca paciente
    if user_id:
        patient_row = cursor.execute("SELECT id, streak_count, best_streak, last_exercise_date, xp_points, level FROM patient WHERE user_id = ? LIMIT 1", (user_id,)).fetchone()
    else:
        patient_row = None
    if not patient_row:
        patient_row = cursor.execute("SELECT id, streak_count, best_streak, last_exercise_date, xp_points, level FROM patient LIMIT 1").fetchone()

    streak = 1
    best = 1
    old_xp = 350
    old_level = 2
    p_id = 1
    
    if patient_row:
        p_id = patient_row["id"]
        streak = patient_row["streak_count"] or 0
        best = patient_row["best_streak"] or 0
        old_xp = patient_row["xp_points"] if "xp_points" in patient_row.keys() and patient_row["xp_points"] is not None else 350
        old_level = patient_row["level"] if "level" in patient_row.keys() and patient_row["level"] is not None else 2
        last_d_str = patient_row["last_exercise_date"]
        
        today_date = date.today()
        if not last_d_str:
            streak = 1
        else:
            try:
                last_d = datetime.fromisoformat(last_d_str).date()
            except Exception:
                last_d = date.fromisoformat(last_d_str)
                
            delta = (today_date - last_d).days
            if delta == 0:
                pass
            elif delta == 1:
                streak += 1
            else:
                streak = 1
                
        if streak > best:
            best = streak

    streak_bonus = streak * 5
    total_xp_earned = base_xp + accuracy_bonus + fatigue_bonus + streak_bonus
    new_xp = old_xp + total_xp_earned
    
    new_level_info = get_level_info(new_xp)
    new_level = new_level_info["level"]
    leveled_up = new_level > old_level

    cursor.execute("""
    INSERT INTO exercise_logs (
        user_id, exercise_id, exercise_title, duration_sec, repetitions,
        pitch_accuracy, effort_level, fatigue_before, fatigue_after,
        notes_enc, date_iso, xp_earned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        data.get("exercise_id"),
        data.get("exercise_title"),
        duration_sec,
        reps,
        accuracy,
        int(data.get("effort_level", 3)),
        fatigue_before,
        fatigue_after,
        notes_enc,
        date_iso,
        total_xp_earned
    ))
    new_log_id = cursor.lastrowid

    cursor.execute("""
    UPDATE patient SET
        streak_count = ?,
        best_streak = ?,
        last_exercise_date = ?,
        xp_points = ?,
        level = ?
    WHERE id = ?
    """, (streak, best, date.today().isoformat(), new_xp, new_level, p_id))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "id": new_log_id,
        "xp_earned": total_xp_earned,
        "base_xp": base_xp,
        "accuracy_bonus": accuracy_bonus,
        "fatigue_bonus": fatigue_bonus,
        "streak_bonus": streak_bonus,
        "total_xp": new_xp,
        "old_level": old_level,
        "new_level": new_level,
        "leveled_up": leveled_up,
        "level_title": new_level_info["title"],
        "unlocked_features": new_level_info["unlocked_features"] if leveled_up else []
    }


def delete_exercise_log(log_id):
    conn = get_connection()
    conn.execute("DELETE FROM exercise_logs WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()
    return {"success": True}


def get_reminders(user_id=None):
    conn = get_connection()
    if user_id:
        rows = conn.execute("SELECT * FROM reminders WHERE user_id = ? OR user_id IS NULL ORDER BY time_str ASC", (user_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM reminders ORDER BY time_str ASC").fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": decrypt_text(r["title_enc"]),
            "time_str": r["time_str"],
            "days_mask": json.loads(r["days_mask"]) if r["days_mask"] else [],
            "is_active": bool(r["is_active"]),
            "sound_alert": bool(r["sound_alert"]),
            "category": r["category"]
        })
    return results


def add_reminder(data, user_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    title_enc = encrypt_text(data.get("title", "Lembrete Vocal"))
    days_json = json.dumps(data.get("days_mask", ["seg", "ter", "qua", "qui", "sex"]))
    
    cursor.execute("""
    INSERT INTO reminders (user_id, title_enc, time_str, days_mask, is_active, sound_alert, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        title_enc,
        data.get("time_str", "09:00"),
        days_json,
        1 if data.get("is_active", True) else 0,
        1 if data.get("sound_alert", True) else 0,
        data.get("category", "aquecimento")
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"success": True, "id": new_id}


def update_reminder(reminder_id, data):
    conn = get_connection()
    cursor = conn.cursor()
    
    fields = []
    params = []
    if "title" in data:
        fields.append("title_enc = ?")
        params.append(encrypt_text(data["title"]))
    if "time_str" in data:
        fields.append("time_str = ?")
        params.append(data["time_str"])
    if "days_mask" in data:
        fields.append("days_mask = ?")
        params.append(json.dumps(data["days_mask"]))
    if "is_active" in data:
        fields.append("is_active = ?")
        params.append(1 if data["is_active"] else 0)
    if "sound_alert" in data:
        fields.append("sound_alert = ?")
        params.append(1 if data["sound_alert"] else 0)
    if "category" in data:
        fields.append("category = ?")
        params.append(data["category"])

    if fields:
        params.append(reminder_id)
        cursor.execute(f"UPDATE reminders SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()

    conn.close()
    return {"success": True}


def delete_reminder(reminder_id):
    conn = get_connection()
    conn.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
    conn.commit()
    conn.close()
    return {"success": True}


def get_security_audit_sample():
    conn = get_connection()
    cursor = conn.cursor()
    
    raw_patient = cursor.execute("SELECT id, name_enc, diagnosis_enc, therapist_name_enc, clinical_notes_enc FROM patient LIMIT 1").fetchone()
    raw_logs = cursor.execute("SELECT id, exercise_title, notes_enc, date_iso FROM exercise_logs ORDER BY id DESC LIMIT 3").fetchall()
    raw_reminders = cursor.execute("SELECT id, title_enc, time_str FROM reminders LIMIT 3").fetchall()
    conn.close()

    comparison = {
        "encryption_algorithm": "PBKDF2-HMAC-SHA256 (10k rounds) + Authenticated Symmetric CTR + Encrypt-then-MAC",
        "database_type": "SQLite 3",
        "privacy_compliance": "LGPD (Lei Geral de Proteção de Dados - Art. 11: Dados de Saúde)",
        "patient_record": {
            "raw_encrypted_in_sqlite": {
                "name": raw_patient["name_enc"] if raw_patient else "",
                "diagnosis": raw_patient["diagnosis_enc"] if raw_patient else "",
                "clinical_notes": raw_patient["clinical_notes_enc"] if raw_patient else ""
            },
            "decrypted_in_memory": {
                "name": decrypt_text(raw_patient["name_enc"]) if raw_patient else "",
                "diagnosis": decrypt_text(raw_patient["diagnosis_enc"]) if raw_patient else "",
                "clinical_notes": decrypt_text(raw_patient["clinical_notes_enc"]) if raw_patient else ""
            }
        },
        "logs_sample": [
            {
                "exercise": r["exercise_title"],
                "raw_encrypted_note": r["notes_enc"],
                "decrypted_note": decrypt_text(r["notes_enc"])
            }
            for r in raw_logs
        ],
        "reminders_sample": [
            {
                "time": r["time_str"],
                "raw_encrypted_title": r["title_enc"],
                "decrypted_title": decrypt_text(r["title_enc"])
            }
            for r in raw_reminders
        ]
    }
    return comparison
