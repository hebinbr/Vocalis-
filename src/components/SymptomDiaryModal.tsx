import React, { useState } from 'react';
import {
  X,
  FileText,
  Calendar,
  Smile,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Check,
  Stethoscope,
  HeartPulse,
  Flame,
  Zap
} from 'lucide-react';
import { VocalSymptomEntry, User } from '../types';
import { api } from '../services/api';

interface SymptomDiaryModalProps {
  currentUser?: User | null;
  onClose: () => void;
  onSaved: (entry: VocalSymptomEntry) => void;
}

const COMMON_SYMPTOMS = [
  'Rouquidão matinal',
  'Pigarro persistente',
  'Ardor ou queimação na garganta',
  'Tensão cervical / pescoço',
  'Voz falhando (quebras)',
  'Perda de tons agudos',
  'Voz soprosa / fraca',
  'Aperto na garganta',
  'Secura / necessidade de engolir',
  'Sem sintomas (voz leve e confortável)'
];

const COMMON_TRIGGERS = [
  'Uso vocal prolongado (aulas/reuniões)',
  'Ar-condicionado forte',
  'Pouca hidratação de água',
  'Noite mal dormida',
  'Estresse / Ansiedade',
  'Refluxo ou azia',
  'Ambiente ruidoso (falar alto)',
  'Poeira ou fumaça'
];

export const SymptomDiaryModal: React.FC<SymptomDiaryModalProps> = ({
  currentUser,
  onClose,
  onSaved,
}) => {
  const [entryDate, setEntryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [vocalEffort, setVocalEffort] = useState<number>(2);
  const [fatigueScore, setFatigueScore] = useState<number>(2);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Rouquidão matinal']);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(['Uso vocal prolongado (aulas/reuniões)']);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleSymptom = (item: string) => {
    if (item === 'Sem sintomas (voz leve e confortável)') {
      setSelectedSymptoms([item]);
      return;
    }
    setSelectedSymptoms((prev) => {
      const filtered = prev.filter((s) => s !== 'Sem sintomas (voz leve e confortável)');
      if (filtered.includes(item)) {
        return filtered.filter((s) => s !== item);
      } else {
        return [...filtered, item];
      }
    });
  };

  const toggleTrigger = (item: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() && selectedSymptoms.length === 0) {
      setErrorMsg('Por favor, selecione ao menos um sintoma ou descreva como sua voz se sentiu.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      const res = await api.addSymptom(
        {
          entry_date: entryDate,
          vocal_effort: vocalEffort,
          fatigue_score: fatigueScore,
          symptoms: selectedSymptoms,
          triggers: selectedTriggers,
          notes: notes.trim(),
        },
        currentUser?.id
      );

      if (res && res.symptom) {
        onSaved(res.symptom);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar no banco de dados SQLite.');
    } finally {
      setSaving(false);
    }
  };

  const getEffortLabel = (val: number) => {
    switch (val) {
      case 1:
        return 'Nenhum Esforço (Voz fluida e natural)';
      case 2:
        return 'Confortável (Fonação tranquila)';
      case 3:
        return 'Leve Esforço (Sensação de peso no final do dia)';
      case 4:
        return 'Esforço Moderado (Voz pesada, exigindo ar)';
      case 5:
        return 'Esforço Intenso (Dor ou aperto excessivo)';
      default:
        return '';
    }
  };

  const getFatigueLabel = (val: number) => {
    switch (val) {
      case 1:
        return 'Disposta (Sem fadiga vocal)';
      case 2:
        return 'Leve Cansaço (Recupera com repouso breve)';
      case 3:
        return 'Fadiga Moderada (Voz perde volume)';
      case 4:
        return 'Fadiga Severa (Dificuldade de manter tom)';
      case 5:
        return 'Esgotada (Necessidade absoluta de repouso)';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                Diário Clínico do Paciente
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                Como Sua Voz se Sentiu Hoje?
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Data do Registro
            </label>
            <div className="relative max-w-xs">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Effort Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                1. Nível de Esforço para Falar ao Longo do Dia
              </span>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                Grau {vocalEffort} de 5
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {getEffortLabel(vocalEffort)}
            </p>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={vocalEffort}
              onChange={(e) => setVocalEffort(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-1">
              <span>1 (Nenhum esforço)</span>
              <span>3 (Moderado)</span>
              <span>5 (Esforço extremo)</span>
            </div>
          </div>

          {/* Fatigue Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                2. Sensação de Cansaço / Fadiga Vocal Noturna
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                Nível {fatigueScore} de 5
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {getFatigueLabel(fatigueScore)}
            </p>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={fatigueScore}
              onChange={(e) => setFatigueScore(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-1">
              <span>1 (Disposta)</span>
              <span>3 (Cansaço típico)</span>
              <span>5 (Esgotada)</span>
            </div>
          </div>

          {/* Symptoms Checklist */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Sintomas Sentidos Durante o Dia (Selecione todos que se aplicam)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((item) => {
                const isSelected = selectedSymptoms.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleSymptom(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Triggers Checklist */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              4. Fatores do Ambiente ou Demanda Vocal
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TRIGGERS.map((item) => {
                const isSelected = selectedTriggers.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleTrigger(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient Notes Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              5. Observações do Dia para a Fonoaudióloga
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Dei 5 aulas hoje e senti a voz áspera às 16h. Pratiquei o canudo d'água no intervalo e percebi alívio imediato na garganta..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
              Estas observações são protegidas por criptografia e ficam disponíveis no prontuário da sua fonoaudióloga.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Gravando no SQLite...' : 'Salvar Registro no Diário'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
