"""
Vocalis - Servidor REST API em Python
Conecta a interface do paciente e da fonoaudióloga com o banco SQLite criptografado.
"""

import sys
import os
import json
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import date, timedelta

# Garante que o diretório backend está no path
sys.path.insert(0, os.path.dirname(__file__))

import db

PORT = int(os.environ.get("PYTHON_BACKEND_PORT", 5001))


class VocalisAPIHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Connection", "close")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def _read_json(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                return {}
            body = self.rfile.read(content_length).decode("utf-8")
            return json.loads(body)
        except Exception:
            return {}

    def _send_json(self, data, status=200):
        self._set_headers(status)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = parse_qs(parsed.query)
        user_id = int(query.get("user_id", [0])[0]) or None
        
        if path == "/api/status" or path == "/api/health":
            self._send_json({
                "status": "online",
                "backend": "Python 3.10",
                "database": "SQLite 3",
                "encryption": "PBKDF2-HMAC-SHA256 + CTR Stream + Encrypt-then-MAC",
                "service": "Vocalis Speech Therapy API"
            })
            return

        if path == "/api/patient":
            patient = db.get_patient(user_id)
            self._send_json(patient or {})
            return

        if path == "/api/exercises":
            exercises = db.get_all_exercises()
            self._send_json(exercises)
            return

        if path == "/api/logs":
            logs = db.get_all_logs(user_id)
            self._send_json(logs)
            return

        if path == "/api/reminders":
            reminders = db.get_reminders(user_id)
            self._send_json(reminders)
            return

        if path == "/api/security/audit":
            audit = db.get_security_audit_sample()
            self._send_json(audit)
            return

        if path == "/api/therapist/dashboard":
            therapist_id = int(query.get("therapist_id", [1])[0])
            dashboard = db.get_therapist_dashboard_data(therapist_id)
            self._send_json(dashboard)
            return

        if path == "/api/progress/stats":
            logs = db.get_all_logs(user_id)
            patient = db.get_patient(user_id) or {}
            
            total_duration_sec = sum(l["duration_sec"] for l in logs)
            total_sessions = len(logs)
            avg_accuracy = round(sum(l["pitch_accuracy"] for l in logs) / max(total_sessions, 1), 1)
            
            fatigue_reductions = [l["fatigue_before"] - l["fatigue_after"] for l in logs if l["fatigue_before"] is not None]
            avg_fatigue_relief = round(sum(fatigue_reductions) / max(len(fatigue_reductions), 1), 1)

            today = date.today()
            last_7_days = []
            for i in range(6, -1, -1):
                day = today - timedelta(days=i)
                iso = day.isoformat()
                day_logs = [l for l in logs if l["date_iso"] == iso]
                day_min = sum(l["duration_sec"] for l in day_logs) // 60
                last_7_days.append({
                    "date": iso,
                    "day_name": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][day.weekday()],
                    "minutes": day_min,
                    "target_minutes": patient.get("daily_goal_minutes", 15),
                    "completed": day_min >= (patient.get("daily_goal_minutes", 15)),
                    "count": len(day_logs)
                })

            patient_xp = patient.get("xp_points", 350)
            patient_level = patient.get("level", 2)
            streak = patient.get("streak_count", 0)
            best_streak = patient.get("best_streak", 0)

            badges = [
                {
                    "id": "primeira_nota",
                    "title": "Primeira Nota",
                    "description": "Completou o primeiro exercício vocal com sucesso",
                    "category": "Iniciação",
                    "unlocked": total_sessions >= 1,
                    "icon": "Award"
                },
                {
                    "id": "fogo_vocal",
                    "title": "Chama da Constância",
                    "description": "Alcançou sequência de pelo menos 3 dias consecutivos",
                    "category": "Disciplina",
                    "unlocked": (streak >= 3 or best_streak >= 3),
                    "icon": "Flame"
                },
                {
                    "id": "semana_perfeita",
                    "title": "Semana Vocal de Ferro",
                    "description": "Manteve 7 dias consecutivos de cuidado com a voz",
                    "category": "Disciplina",
                    "unlocked": (streak >= 7 or best_streak >= 7),
                    "icon": "ShieldCheck"
                },
                {
                    "id": "alta_precisao",
                    "title": "Afinador de Ouro",
                    "description": "Alcançou precisão acústica (F0) acima de 95%",
                    "category": "Técnica",
                    "unlocked": any(l["pitch_accuracy"] >= 95 for l in logs),
                    "icon": "Zap"
                },
                {
                    "id": "mestre_sovte",
                    "title": "Mestre do Canudo SOVTE",
                    "description": "Praticou exercícios de trato semiocluído (bolhas e vibração)",
                    "category": "Reabilitação",
                    "unlocked": any(l["exercise_id"] in ["canudo_sovte", "vib_labios", "desafio_bolhas_sovte"] for l in logs),
                    "icon": "Waves"
                },
                {
                    "id": "harmonia_sz",
                    "title": "Harmonia Pneumofônica",
                    "description": "Realizou a medição do tempo de sustentação de /s/ e /z/",
                    "category": "Avaliação",
                    "unlocked": any(l["exercise_id"] in ["relacao_sz", "desafio_proporcao_aurea"] for l in logs),
                    "icon": "Timer"
                },
                {
                    "id": "alivio_profundo",
                    "title": "Alívio Laríngeo Profundo",
                    "description": "Reduziu a fadiga vocal em 3 ou mais pontos em uma sessão",
                    "category": "Bem-Estar",
                    "unlocked": any((l["fatigue_before"] - l["fatigue_after"]) >= 3 for l in logs),
                    "icon": "TrendingDown"
                },
                {
                    "id": "resistencia_vocal",
                    "title": "Voz Resistente",
                    "description": "Acumulou mais de 20 minutos de exercícios fonoaudiológicos",
                    "category": "Condicionamento",
                    "unlocked": total_duration_sec >= 1200,
                    "icon": "Clock"
                },
                {
                    "id": "guardiao_laringe",
                    "title": "Guardião da Laringe",
                    "description": "Alcançou o Nível 3 desbloqueando coordenação avançada",
                    "category": "Nível",
                    "unlocked": patient_level >= 3,
                    "icon": "Shield"
                },
                {
                    "id": "mestre_supremo",
                    "title": "Voz de Ouro & Maestria",
                    "description": "Alcançou o Nível 5 de Alta Performance Vocal",
                    "category": "Nível",
                    "unlocked": patient_level >= 5,
                    "icon": "Crown"
                }
            ]

            stats = {
                "total_sessions": total_sessions,
                "total_minutes": total_duration_sec // 60,
                "streak_days": streak,
                "best_streak": best_streak,
                "avg_pitch_accuracy": avg_accuracy,
                "avg_fatigue_relief": avg_fatigue_relief,
                "daily_goal_minutes": patient.get("daily_goal_minutes", 15),
                "last_7_days": last_7_days,
                "badges": badges,
                "xp_points": patient_xp,
                "level": patient_level,
                "level_title": patient.get("level_title", "Ressonador Ativo"),
                "level_progress_percent": patient.get("level_progress_percent", 42),
                "xp_for_next_level": patient.get("xp_for_next_level", 170),
                "all_levels": db.LEVEL_CONFIG
            }
            self._send_json(stats)
            return

        self._send_json({"error": "Endpoint não encontrado"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        data = self._read_json()

        # Autenticação & Cadastro
        if path == "/api/auth/register":
            res, code = db.register_user(data)
            self._send_json(res, status=code)
            return

        if path == "/api/auth/login":
            res, code = db.login_user(data)
            self._send_json(res, status=code)
            return

        if path == "/api/auth/activate":
            user_id = data.get("user_id")
            code_str = data.get("code", "")
            res, status_code = db.activate_patient_with_code(user_id, code_str)
            self._send_json(res, status=status_code)
            return

        if path == "/api/therapist/generate-code":
            therapist_id = data.get("therapist_id", 1)
            patient_name = data.get("patient_name", "")
            patient_email = data.get("patient_email", "")
            code_obj = db.create_access_code(therapist_id, patient_name, patient_email)
            self._send_json({"success": True, "code": code_obj}, status=201)
            return

        if path == "/api/logs":
            user_id = data.get("user_id")
            res = db.add_exercise_log(data, user_id)
            self._send_json(res, status=201)
            return

        if path == "/api/reminders":
            user_id = data.get("user_id")
            res = db.add_reminder(data, user_id)
            self._send_json(res, status=201)
            return

        if path == "/api/exercises":
            therapist_id = data.get("therapist_id", 1)
            therapist_name = data.get("created_by_name", "Dra. Beatriz Menezes")
            res = db.add_exercise(data, therapist_id, therapist_name)
            self._send_json(res, status=201)
            return

        self._send_json({"error": "Endpoint não encontrado"}, status=404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        data = self._read_json()

        if path == "/api/patient":
            user_id = data.get("user_id")
            updated = db.update_patient(data, user_id)
            self._send_json(updated)
            return

        if path.startswith("/api/exercises/"):
            try:
                ex_id = path.split("/")[-1]
                res = db.update_exercise(ex_id, data)
                if not res:
                    self._send_json({"error": "Exercício não encontrado"}, status=404)
                else:
                    self._send_json(res)
                return
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
                return

        if path.startswith("/api/reminders/"):
            try:
                rem_id = int(path.split("/")[-1])
                res = db.update_reminder(rem_id, data)
                self._send_json(res)
                return
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
                return

        self._send_json({"error": "Endpoint não encontrado"}, status=404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path.startswith("/api/exercises/"):
            try:
                ex_id = path.split("/")[-1]
                res = db.delete_exercise(ex_id)
                self._send_json(res)
                return
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
                return

        if path.startswith("/api/logs/"):
            try:
                log_id = int(path.split("/")[-1])
                res = db.delete_exercise_log(log_id)
                self._send_json(res)
                return
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
                return

        if path.startswith("/api/reminders/"):
            try:
                rem_id = int(path.split("/")[-1])
                res = db.delete_reminder(rem_id)
                self._send_json(res)
                return
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
                return

        self._send_json({"error": "Endpoint não encontrado"}, status=404)

    def log_message(self, format, *args):
        pass


class ReusableThreadingServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def server_bind(self):
        import socket
        try:
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if hasattr(socket, "SO_REUSEPORT"):
                try:
                    self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
                except Exception:
                    pass
        except Exception:
            pass
        super().server_bind()


def run():
    db.init_db()
    server_address = ("127.0.0.1", PORT)

    # Verifica se já há uma instância saudável ativa na porta antes de tentar bind
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.4)
            if s.connect_ex(server_address) == 0:
                print(f"[Vocalis Python Backend] Instância já ativa e escutando na porta {PORT}. Encerrando duplicata com sucesso.")
                sys.exit(0)
    except Exception:
        pass

    try:
        httpd = ReusableThreadingServer(server_address, VocalisAPIHandler)
        print(f"[Vocalis Python Backend] Running multi-threaded on http://127.0.0.1:{PORT}")
        httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:
            print(f"[Vocalis Python Backend] Porta {PORT} já ocupada por processo ativo. Encerrando duplicata.")
            sys.exit(0)
        else:
            raise
    except KeyboardInterrupt:
        print("\n[Vocalis Python Backend] Shutting down...")


if __name__ == "__main__":
    run()
