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
  AccessCode,
  VocalSymptomEntry
} from '../types';

/**
 * Utilitário de requisição com auto-retry para garantir alta disponibilidade
 * com o backend local Python SQLite durante transições e requisições simultâneas.
 */
async function fetchJsonWithRetry<T>(url: string, options?: RequestInit, maxAttempts = 4): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        // Se status 502/503/504 (servidor ainda inicializando), tenta novamente
        if ([502, 503, 504].includes(res.status) && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 200 * attempt));
          continue;
        }
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Falha na requisição (${res.status})`);
      }
      return await res.json();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }
  throw lastError;
}

export const api = {
  async getStatus(): Promise<{ status: string; backend: string; database: string; encryption: string }> {
    return fetchJsonWithRetry('/api/status');
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
    return fetchJsonWithRetry('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; user: User }> {
    return fetchJsonWithRetry('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async activateWithCode(userId: number, code: string): Promise<{ success: boolean; user: User; message: string }> {
    return fetchJsonWithRetry('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code })
    });
  },

  // Área da Fonoaudióloga
  async getTherapistDashboard(therapistId: number = 1): Promise<TherapistDashboardData> {
    return fetchJsonWithRetry(`/api/therapist/dashboard?therapist_id=${therapistId}`);
  },

  async generateAccessCode(data: {
    therapist_id: number;
    patient_name?: string;
    patient_email?: string;
  }): Promise<{ success: boolean; code: AccessCode }> {
    return fetchJsonWithRetry('/api/therapist/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Prontuário Clínico do Paciente
  async getPatient(userId?: number): Promise<Patient> {
    const url = userId ? `/api/patient?user_id=${userId}` : '/api/patient';
    return fetchJsonWithRetry(url);
  },

  async updatePatient(data: Partial<Patient>, userId?: number): Promise<Patient> {
    return fetchJsonWithRetry('/api/patient', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user_id: userId })
    });
  },

  async getExercises(patientId?: number): Promise<Exercise[]> {
    const url = patientId ? `/api/exercises?patient_id=${patientId}` : '/api/exercises';
    return fetchJsonWithRetry(url);
  },

  async createExercise(data: Partial<Exercise> & { therapist_id?: number; created_by_name?: string }): Promise<{ success: boolean; exercise: Exercise }> {
    return fetchJsonWithRetry('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async updateExercise(id: string, data: Partial<Exercise>): Promise<{ success: boolean; message: string }> {
    return fetchJsonWithRetry(`/api/exercises/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteExercise(id: string): Promise<{ success: boolean; message: string }> {
    return fetchJsonWithRetry(`/api/exercises/${id}`, {
      method: 'DELETE'
    });
  },

  async getLogs(userId?: number): Promise<ExerciseLog[]> {
    const url = userId ? `/api/logs?user_id=${userId}` : '/api/logs';
    return fetchJsonWithRetry(url);
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
    return fetchJsonWithRetry('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  },

  async deleteLog(id: number): Promise<{ success: boolean }> {
    return fetchJsonWithRetry(`/api/logs/${id}`, {
      method: 'DELETE'
    });
  },

  async getReminders(userId?: number): Promise<Reminder[]> {
    const url = userId ? `/api/reminders?user_id=${userId}` : '/api/reminders';
    return fetchJsonWithRetry(url);
  },

  async addReminder(data: Partial<Reminder>, userId?: number): Promise<{ success: boolean; id: number }> {
    return fetchJsonWithRetry('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user_id: userId })
    });
  },

  async updateReminder(id: number, data: Partial<Reminder>): Promise<{ success: boolean }> {
    return fetchJsonWithRetry(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteReminder(id: number): Promise<{ success: boolean }> {
    return fetchJsonWithRetry(`/api/reminders/${id}`, {
      method: 'DELETE'
    });
  },

  async getProgressStats(userId?: number): Promise<ProgressStats> {
    const url = userId ? `/api/progress/stats?user_id=${userId}` : '/api/progress/stats';
    return fetchJsonWithRetry(url);
  },

  async getSecurityAudit(): Promise<SecurityAudit> {
    return fetchJsonWithRetry('/api/security/audit');
  },

  // Diário de Sintomas Vocais
  async getSymptoms(userId?: number): Promise<VocalSymptomEntry[]> {
    const url = userId ? `/api/symptoms?user_id=${userId}` : '/api/symptoms';
    return fetchJsonWithRetry(url);
  },

  async addSymptom(data: Partial<VocalSymptomEntry>, userId?: number): Promise<{ success: boolean; symptom: VocalSymptomEntry }> {
    return fetchJsonWithRetry('/api/symptoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user_id: userId })
    });
  },

  async deleteSymptom(id: number): Promise<{ success: boolean; id: number }> {
    return fetchJsonWithRetry(`/api/symptoms/${id}`, {
      method: 'DELETE'
    });
  }
};
