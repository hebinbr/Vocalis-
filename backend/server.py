"""
Vocalis - Servidor REST API em Python
Conecta a interface do paciente com o banco SQLite criptografado.
"""

import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
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
            patient = db.get_patient()
            self._send_json(patient or {})
            return

        if path == "/api/exercises":
            exercises = db.get_all_exercises()
            self._send_json(exercises)
            return

        if path == "/api/logs":
            logs = db.get_all_logs()
            self._send_json(logs)
            return

        if path == "/api/reminders":
            reminders = db.get_reminders()
            self._send_json(reminders)
            return

        if path == "/api/security/audit":
            audit = db.get_security_audit_sample()
            self._send_json(audit)
            return

        if path == "/api/progress/stats":
            logs = db.get_all_logs()
            patient = db.get_patient() or {}
            
            # Cálculo de estatísticas visuais detalhadas
            total_duration_sec = sum(l["duration_sec"] for l in logs)
            total_sessions = len(logs)
            avg_accuracy = round(sum(l["pitch_accuracy"] for l in logs) / max(total_sessions, 1), 1)
            
            # Redução média de fadiga vocal (antes vs depois)
            fatigue_reductions = [l["fatigue_before"] - l["fatigue_after"] for l in logs if l["fatigue_before"] is not None]
            avg_fatigue_relief = round(sum(fatigue_reductions) / max(len(fatigue_reductions), 1), 1)

            # Histórico dos últimos 7 dias para visualização gráfica
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

            # Badges / Conquistas
            badges = [
                {
                    "id": "primeira_nota",
                    "title": "Primeira Nota",
                    "description": "Completou seu primeiro exercício vocal",
                    "unlocked": total_sessions >= 1,
                    "icon": "Award"
                },
                {
                    "id": "resistencia_vocal",
                    "title": "Voz Resistente",
                    "description": "Acumulou mais de 10 minutos de exercícios vocais guiados",
                    "unlocked": total_duration_sec >= 600,
                    "icon": "ShieldCheck"
                },
                {
                    "id": "constancia_vocal",
                    "title": "Constância Terapêutica",
                    "description": "Alcançou sequência de pelo menos 3 dias consecutivos",
                    "unlocked": (patient.get("streak_count", 0) >= 3 or patient.get("best_streak", 0) >= 3),
                    "icon": "Flame"
                },
                {
                    "id": "mestre_sovte",
                    "title": "Mestre do Trato Ocluído",
                    "description": "Completou sessões de Canudo d'Água ou Vibração",
                    "unlocked": any(l["exercise_id"] in ["canudo_sovte", "vib_labios"] for l in logs),
                    "icon": "Waves"
                },
                {
                    "id": "alta_precisao",
                    "title": "Afinador de Ouro",
                    "description": "Alcançou precisão de frequência de afinação acima de 95%",
                    "unlocked": any(l["pitch_accuracy"] >= 95 for l in logs),
                    "icon": "Zap"
                }
            ]

            stats = {
                "total_sessions": total_sessions,
                "total_minutes": total_duration_sec // 60,
                "streak_days": patient.get("streak_count", 0),
                "best_streak": patient.get("best_streak", 0),
                "avg_pitch_accuracy": avg_accuracy,
                "avg_fatigue_relief": avg_fatigue_relief,
                "daily_goal_minutes": patient.get("daily_goal_minutes", 15),
                "last_7_days": last_7_days,
                "badges": badges
            }
            self._send_json(stats)
            return

        self._send_json({"error": "Endpoint não encontrado"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        data = self._read_json()

        if path == "/api/logs":
            res = db.add_exercise_log(data)
            self._send_json(res, status=201)
            return

        if path == "/api/reminders":
            res = db.add_reminder(data)
            self._send_json(res, status=201)
            return

        self._send_json({"error": "Endpoint não encontrado"}, status=404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        data = self._read_json()

        if path == "/api/patient":
            updated = db.update_patient(data)
            self._send_json(updated)
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
        # Silencia logs verbosos de HTTP para não poluir terminal
        pass


def run():
    db.init_db()
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, VocalisAPIHandler)
    print(f"[Vocalis Python Backend] Running on http://127.0.0.1:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Vocalis Python Backend] Shutting down...")
        httpd.server_close()


if __name__ == "__main__":
    run()
