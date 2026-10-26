"""
Vocalis - Banco de Dados SQLite com Criptografia de Dados Clínicos
Gerencia esquema relacional, migrações automáticas, sementes fonoaudiológicas
e auditoria criptográfica de privacidade de pacientes.
"""

import os
import sqlite3
import json
from datetime import datetime, date, timedelta
from crypto_vault import encrypt_text, decrypt_text

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.join(DB_DIR, "vocalis.db")


def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Tabela do Paciente (Campos sensíveis criptografados)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patient (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_enc TEXT NOT NULL,
        diagnosis_enc TEXT NOT NULL,
        therapist_name_enc TEXT,
        therapist_crfa_enc TEXT,
        clinical_notes_enc TEXT,
        daily_goal_minutes INTEGER DEFAULT 15,
        streak_count INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        last_exercise_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Tabela de Catálogo de Exercícios Vocais
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
        icon_name TEXT DEFAULT 'Activity'
    );
    """)

    # Tabela de Registros de Exercícios (Logs) com reflexões cifradas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exercise_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    );
    """)

    # Tabela de Lembretes Diários
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    # Seed inicial do paciente se tabela estiver vazia
    cursor.execute("SELECT COUNT(*) FROM patient")
    if cursor.fetchone()[0] == 0:
        p_name = encrypt_text("Camila Vasconcelos")
        p_diag = encrypt_text("Fadiga vocal ocupacional com fenda glótica paralela leve (Professora de Ensino Médio)")
        p_therapist = encrypt_text("Dra. Beatriz Menezes")
        p_crfa = encrypt_text("CRFa 2-19842/SP")
        p_notes = encrypt_text("Foco em hidratação pré-aula, exercícios com tubo de ressonância (SOVTE) e monitoramento de tensão cervical.")
        
        cursor.execute("""
        INSERT INTO patient (name_enc, diagnosis_enc, therapist_name_enc, therapist_crfa_enc, clinical_notes_enc, daily_goal_minutes, streak_count, best_streak, last_exercise_date)
        VALUES (?, ?, ?, ?, ?, 15, 4, 12, ?)
        """, (p_name, p_diag, p_therapist, p_crfa, p_notes, (date.today() - timedelta(days=1)).isoformat()))
        conn.commit()

    # Seed de Exercícios
    cursor.execute("SELECT COUNT(*) FROM exercises")
    if cursor.fetchone()[0] == 0:
        seed_exercises = [
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
                4,
                45,
                196,
                "Se sentir cócegas no nariz ou nos lábios, é sinal de ressonância adequada. Se os lábios pararem, apoie suavemente os dedos nas bochechas.",
                "Wind"
            ),
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
                5,
                60,
                220,
                "Mantenha as bolhas uniformes. Não deixe o canudo encostar no fundo do copo.",
                "Waves"
            ),
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
                    "Inspire novamente da mesma forma e emita o som /z/ (como o zumbido de abelha) cronometrado.",
                    "O aplicativo calculará automaticamente sua relação s/z para acompanhar sua evolução."
                ]),
                3,
                60,
                180,
                "Não esvazie os pulmões até sentir dor ou aperto no peito; pare quando o fluxo sonoro perder a estabilidade.",
                "Timer"
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
                4,
                50,
                210,
                "Se sentir aperto na garganta, imagine que está engolindo ar e abrindo a faringe.",
                "Smile"
            ),
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
                4,
                60,
                260,
                "Nunca force notas excessivamente agudas com esforço. O volume deve permanecer leve e constante.",
                "TrendingUp"
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
                5,
                45,
                170,
                "Sensação de frescor no fundo da garganta é perfeitamente normal durante este exercício.",
                "Feather"
            ),
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
                    "Faça por 4 a 6 segundos sem nenhuma força ou esforço.",
                    "Ideal para o final do dia de trabalho vocal."
                ]),
                4,
                40,
                80,
                "Não faça com força de ar. Deve soar quase como um sussurro crepitante relaxante.",
                "Moon"
            )
        ]

        cursor.executemany("""
        INSERT INTO exercises (id, title, category, target_range, description, benefits, instructions, default_reps, default_duration_sec, target_hz, caution_tips, icon_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_exercises)
        conn.commit()

    # Seed de Lembretes Diários
    cursor.execute("SELECT COUNT(*) FROM reminders")
    if cursor.fetchone()[0] == 0:
        seed_reminders = [
            (
                encrypt_text("Aquecimento Matinal com Trilos"),
                "08:15",
                json.dumps(["seg", "ter", "qua", "qui", "sex"]),
                1,
                1,
                "aquecimento"
            ),
            (
                encrypt_text("Pausa de Hidratação & Canudo SOVTE"),
                "14:00",
                json.dumps(["seg", "ter", "qua", "qui", "sex", "sab"]),
                1,
                1,
                "hidratacao"
            ),
            (
                encrypt_text("Desaquecimento Noturno & Relaxamento"),
                "20:30",
                json.dumps(["dom", "seg", "ter", "qua", "qui", "sex", "sab"]),
                1,
                1,
                "desaquecimento"
            )
        ]
        cursor.executemany("""
        INSERT INTO reminders (title_enc, time_str, days_mask, is_active, sound_alert, category)
        VALUES (?, ?, ?, ?, ?, ?)
        """, seed_reminders)
        conn.commit()

    # Seed de Logs Recentes para alimentar o sistema de progresso visual
    cursor.execute("SELECT COUNT(*) FROM exercise_logs")
    if cursor.fetchone()[0] == 0:
        today = date.today()
        sample_logs = [
            (
                "vib_labios",
                "Vibração de Lábios (Trilos)",
                180,
                4,
                94.5,
                2,
                5,
                2,
                encrypt_text("A voz respondeu mais rápido hoje. Sem pigarro no final do exercício."),
                (today - timedelta(days=3)).isoformat()
            ),
            (
                "canudo_sovte",
                "Tubo Semiocluído / Canudo d'Água (SOVTE)",
                240,
                5,
                92.0,
                3,
                6,
                2,
                encrypt_text("Fiz com canudo de 5mm. Sensação imediata de alívio na laringe após a aula."),
                (today - timedelta(days=2)).isoformat()
            ),
            (
                "relacao_sz",
                "Sustentação Fricativa /s/ e /z/",
                120,
                3,
                96.0,
                2,
                3,
                1,
                encrypt_text("Sustentei /s/ por 18s e /z/ por 17.5s. Relação s/z deu 1.02 (ótimo fechamento)."),
                (today - timedelta(days=1)).isoformat()
            ),
            (
                "bocejo_suspiro",
                "Bocejo-Suspiro (Yawn-Sigh)",
                150,
                5,
                98.0,
                1,
                4,
                1,
                encrypt_text("Alívio da rigidez cervical posterior. Excelente antes de dormir."),
                today.isoformat()
            )
        ]
        cursor.executemany("""
        INSERT INTO exercise_logs (exercise_id, exercise_title, duration_sec, repetitions, pitch_accuracy, effort_level, fatigue_before, fatigue_after, notes_enc, date_iso)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_logs)
        conn.commit()

    conn.close()


def get_patient():
    conn = get_connection()
    row = conn.execute("SELECT * FROM patient LIMIT 1").fetchone()
    conn.close()
    if not row:
        return None
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
        "created_at": row["created_at"]
    }


def update_patient(data):
    conn = get_connection()
    cursor = conn.cursor()
    
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
    return get_patient()


def get_all_exercises():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM exercises ORDER BY id").fetchall()
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
            "icon_name": r["icon_name"]
        })
    return results


def get_all_logs():
    conn = get_connection()
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
            "created_at": r["created_at"]
        })
    return results


def add_exercise_log(data):
    conn = get_connection()
    cursor = conn.cursor()

    notes_enc = encrypt_text(data.get("notes", ""))
    date_iso = data.get("date_iso", date.today().isoformat())

    cursor.execute("""
    INSERT INTO exercise_logs (
        exercise_id, exercise_title, duration_sec, repetitions,
        pitch_accuracy, effort_level, fatigue_before, fatigue_after,
        notes_enc, date_iso
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("exercise_id"),
        data.get("exercise_title"),
        int(data.get("duration_sec", 60)),
        int(data.get("repetitions", 3)),
        float(data.get("pitch_accuracy", 90.0)),
        int(data.get("effort_level", 3)),
        int(data.get("fatigue_before", 3)),
        int(data.get("fatigue_after", 1)),
        notes_enc,
        date_iso
    ))
    new_id = cursor.lastrowid

    # Atualiza streak do paciente automaticamente
    patient_row = cursor.execute("SELECT id, streak_count, best_streak, last_exercise_date FROM patient LIMIT 1").fetchone()
    if patient_row:
        p_id = patient_row["id"]
        streak = patient_row["streak_count"] or 0
        best = patient_row["best_streak"] or 0
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
                pass  # Mesmo dia, mantém streak
            elif delta == 1:
                streak += 1  # Dia consecutivo!
            else:
                streak = 1  # Quebrou o streak, reinicia em 1
                
        if streak > best:
            best = streak
            
        cursor.execute("""
        UPDATE patient SET streak_count = ?, best_streak = ?, last_exercise_date = ?
        WHERE id = ?
        """, (streak, best, today_date.isoformat(), p_id))

    conn.commit()
    conn.close()
    return {"success": True, "id": new_id}


def delete_exercise_log(log_id):
    conn = get_connection()
    conn.execute("DELETE FROM exercise_logs WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()
    return {"success": True}


def get_reminders():
    conn = get_connection()
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


def add_reminder(data):
    conn = get_connection()
    cursor = conn.cursor()
    title_enc = encrypt_text(data.get("title", "Lembrete Vocal"))
    days_json = json.dumps(data.get("days_mask", ["seg", "ter", "qua", "qui", "sex"]))
    
    cursor.execute("""
    INSERT INTO reminders (title_enc, time_str, days_mask, is_active, sound_alert, category)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
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
    """
    Retorna comparação entre como os dados estão no arquivo SQLite (cifrados)
    versus como eles são apresentados ao paciente/terapeuta após decifração autorizada.
    Isso fornece transparência total sobre a proteção de privacidade.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    raw_patient = cursor.execute("SELECT id, name_enc, diagnosis_enc, therapist_name_enc, clinical_notes_enc FROM patient LIMIT 1").fetchone()
    raw_logs = cursor.execute("SELECT id, exercise_title, notes_enc, date_iso FROM exercise_logs ORDER BY id DESC LIMIT 3").fetchall()
    raw_reminders = cursor.execute("SELECT id, title_enc, time_str FROM reminders LIMIT 3").fetchall()
    conn.close()

    comparison = {
        "encryption_algorithm": "PBKDF2-HMAC-SHA256 (100k rounds) + Authenticated Symmetric CTR + Encrypt-then-MAC",
        "database_type": "SQLite 3",
        "privacy_compliance": "LGPD (Lei Geral de Proteção de Dados) & Padrão de Sigilo Fonoaudiológico",
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
