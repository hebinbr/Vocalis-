import {
  Patient,
  Exercise,
  ExerciseLog,
  Reminder,
  ProgressStats,
  SecurityAudit,
  SessionSaveResult,
  User,
  TherapistDashboardData,
  AccessCode
} from '../types';

export const api = {
  async getStatus(): Promise<{ status: string; backend: string; database: string; encryption: string }> {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Falha ao obter status do servidor');
    return res.json();
  },

  // Autenticação & Cadastro
  async register(data: {
    role: 'paciente' | 'fonoaudiologa';
    name: string;
    email: string;
    password: string;
    phone?: string;
    activation_code?: string;
  }): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao realizar cadastro');
    return result;
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Credenciais inválidas');
    return result;
  },

  async activateWithCode(userId: number, code: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Código inválido ou já utilizado');
    return result;
  },

  // Área da Fonoaudióloga
  async getTherapistDashboard(therapistId: number = 1): Promise<TherapistDashboardData> {
    const res = await fetch(`/api/therapist/dashboard?therapist_id=${therapistId}`);
    if (!res.ok) throw new Error('Falha ao carregar painel da fonoaudióloga');
    return res.json();
  },

  async generateAccessCode(data: {
    therapist_id: number;
    patient_name?: string;
    patient_email?: string;
  }): Promise<{ success: boolean; code: AccessCode }> {
    const res = await fetch('/api/therapist/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao gerar novo código clínico');
    return res.json();
  },

  // Prontuário Clínico do Paciente
  async getPatient(userId?: number): Promise<Patient> {
    const url = userId ? `/api/patient?user_id=${userId}` : '/api/patient';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao obter dados do paciente');
    return res.json();
  },

  async updatePatient(data: Partial<Patient>, userId?: number): Promise<Patient> {
    const res = await fetch('/api/patient', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user_id: userId })
    });
    if (!res.ok) throw new Error('Falha ao salvar dados do paciente');
    return res.json();
  },

  async getExercises(): Promise<Exercise[]> {
    const res = await fetch('/api/exercises');
    if (!res.ok) throw new Error('Falha ao listar exercícios');
    return res.json();
  },

  async getLogs(userId?: number): Promise<ExerciseLog[]> {
    const url = userId ? `/api/logs?user_id=${userId}` : '/api/logs';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar registros');
    return res.json();
  },

  async addLog(log: {
    user_id?: number;
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
  }): Promise<SessionSaveResult> {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
    if (!res.ok) throw new Error('Falha ao registrar exercício');
    return res.json();
  },

  async deleteLog(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/logs/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao remover registro');
    return res.json();
  },

  async getReminders(userId?: number): Promise<Reminder[]> {
    const url = userId ? `/api/reminders?user_id=${userId}` : '/api/reminders';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao buscar lembretes');
    return res.json();
  },

  async addReminder(data: Partial<Reminder>, userId?: number): Promise<{ success: boolean; id: number }> {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user_id: userId })
    });
    if (!res.ok) throw new Error('Falha ao criar lembrete');
    return res.json();
  },

  async updateReminder(id: number, data: Partial<Reminder>): Promise<{ success: boolean }> {
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao atualizar lembrete');
    return res.json();
  },

  async deleteReminder(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao excluir lembrete');
    return res.json();
  },

  async getProgressStats(userId?: number): Promise<ProgressStats> {
    const url = userId ? `/api/progress/stats?user_id=${userId}` : '/api/progress/stats';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar progresso');
    return res.json();
  },

  async getSecurityAudit(): Promise<SecurityAudit> {
    const res = await fetch('/api/security/audit');
    if (!res.ok) throw new Error('Falha ao inspecionar criptografia');
    return res.json();
  }
};
