export interface User {
  id: number;
  role: 'paciente' | 'fonoaudiologa';
  name: string;
  email: string;
  phone?: string;
  is_activated: boolean;
  therapist_id?: number | null;
  activation_code_used?: string | null;
}

export interface AccessCode {
  id: number;
  code: string;
  therapist_id: number;
  patient_name?: string;
  patient_email?: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
  activated_by_name?: string;
  activated_by_email?: string;
}

export interface TherapistDashboardData {
  codes: AccessCode[];
  patients: Array<{
    id: number;
    name: string;
    email: string;
    activation_code: string;
    streak: number;
    best_streak: number;
    last_active?: string;
    xp: number;
    level: number;
    diagnosis: string;
    clinical_notes: string;
  }>;
  total_codes: number;
  available_codes: number;
  active_patients: number;
}

export interface VocalTip {
  id: number;
  title: string;
  category: string;
  summary: string;
  practicalAction: string;
  scientificSource: string;
  benefitTag: string;
  iconName: string;
}

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
  xp_points: number;
  level: number;
  level_title?: string;
  level_progress_percent?: number;
  xp_for_next_level?: number;
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
  min_level: number;
  xp_reward: number;
  is_challenge: boolean;
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
  xp_earned?: number;
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
  category: string;
  unlocked: boolean;
  icon: string;
}

export interface LevelConfig {
  level: number;
  title: string;
  min_xp: number;
  max_xp: number;
  description: string;
  icon: string;
  unlocked_features: string[];
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
  xp_points: number;
  level: number;
  level_title: string;
  level_progress_percent: number;
  xp_for_next_level: number;
  all_levels: LevelConfig[];
}

export interface SessionSaveResult {
  success: boolean;
  id: number;
  xp_earned: number;
  base_xp: number;
  accuracy_bonus: number;
  fatigue_bonus: number;
  streak_bonus: number;
  total_xp: number;
  old_level: number;
  new_level: number;
  leveled_up: boolean;
  level_title: string;
  unlocked_features: string[];
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
