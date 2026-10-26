export interface Patient {
  id: number;
  name: string;
  diagnosis: string;
  therapist_name: string;
  therapist_crfa: string;
  clinical_notes: string;
  daily_goal_minutes: number;
  streak_count: number;
  best_streak: number;
  last_exercise_date: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  title: string;
  category: string;
  target_range: string;
  description: string;
  benefits: string;
  instructions: string[];
  default_reps: number;
  default_duration_sec: number;
  target_hz: number;
  caution_tips: string;
  icon_name: string;
}

export interface ExerciseLog {
  id: number;
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
  created_at: string;
}

export interface Reminder {
  id: number;
  title: string;
  time_str: string;
  days_mask: string[];
  is_active: boolean;
  sound_alert: boolean;
  category: 'aquecimento' | 'hidratacao' | 'exercicio' | 'desaquecimento';
}

export interface DayProgress {
  date: string;
  day_name: string;
  minutes: number;
  target_minutes: number;
  completed: boolean;
  count: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export interface ProgressStats {
  total_sessions: number;
  total_minutes: number;
  streak_days: number;
  best_streak: number;
  avg_pitch_accuracy: number;
  avg_fatigue_relief: number;
  daily_goal_minutes: number;
  last_7_days: DayProgress[];
  badges: Badge[];
}

export interface SecurityAudit {
  encryption_algorithm: string;
  database_type: string;
  privacy_compliance: string;
  patient_record: {
    raw_encrypted_in_sqlite: {
      name: string;
      diagnosis: string;
      clinical_notes: string;
    };
    decrypted_in_memory: {
      name: string;
      diagnosis: string;
      clinical_notes: string;
    };
  };
  logs_sample: Array<{
    exercise: string;
    raw_encrypted_note: string;
    decrypted_note: string;
  }>;
  reminders_sample: Array<{
    time: string;
    raw_encrypted_title: string;
    decrypted_title: string;
  }>;
}
