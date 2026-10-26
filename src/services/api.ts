import { Patient, Exercise, ExerciseLog, Reminder, ProgressStats, SecurityAudit } from '../types';

export const api = {
  async getStatus(): Promise<{ status: string; backend: string; database: string; encryption: string }> {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Falha ao obter status do servidor');
    return res.json();
  },

  async getPatient(): Promise<Patient> {
    const res = await fetch('/api/patient');
    if (!res.ok) throw new Error('Falha ao obter dados do paciente');
    return res.json();
  },

  async updatePatient(data: Partial<Patient>): Promise<Patient> {
    const res = await fetch('/api/patient', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao salvar dados do paciente');
    return res.json();
  },

  async getExercises(): Promise<Exercise[]> {
    const res = await fetch('/api/exercises');
    if (!res.ok) throw new Error('Falha ao listar exercícios');
    return res.json();
  },

  async getLogs(): Promise<ExerciseLog[]> {
    const res = await fetch('/api/logs');
    if (!res.ok) throw new Error('Falha ao carregar registros');
    return res.json();
  },

  async addLog(log: {
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
  }): Promise<{ success: boolean; id: number }> {
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

  async getReminders(): Promise<Reminder[]> {
    const res = await fetch('/api/reminders');
    if (!res.ok) throw new Error('Falha ao buscar lembretes');
    return res.json();
  },

  async addReminder(data: Partial<Reminder>): Promise<{ success: boolean; id: number }> {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
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

  async getProgressStats(): Promise<ProgressStats> {
    const res = await fetch('/api/progress/stats');
    if (!res.ok) throw new Error('Falha ao carregar progresso');
    return res.json();
  },

  async getSecurityAudit(): Promise<SecurityAudit> {
    const res = await fetch('/api/security/audit');
    if (!res.ok) throw new Error('Falha ao inspecionar criptografia');
    return res.json();
  }
};
