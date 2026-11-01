import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Calendar,
  AlertCircle,
  Sparkles,
  HeartPulse,
  Flame,
  CheckCircle2,
  Trash2,
  Smile,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { VocalSymptomEntry, User } from '../types';
import { SymptomDiaryModal } from './SymptomDiaryModal';

interface SymptomDiarySectionProps {
  symptoms: VocalSymptomEntry[];
  currentUser?: User | null;
  onAddSymptom: (entry: VocalSymptomEntry) => void;
  onDeleteSymptom?: (id: number) => void;
}

export const SymptomDiarySection: React.FC<SymptomDiarySectionProps> = ({
  symptoms,
  currentUser,
  onAddSymptom,
  onDeleteSymptom,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSaved = (entry: VocalSymptomEntry) => {
    setIsModalOpen(false);
    onAddSymptom(entry);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta anotação do diário de sintomas?')) return;
    if (onDeleteSymptom) {
      setDeletingId(id);
      try {
        await onDeleteSymptom(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getEffortBadge = (val: number) => {
    if (val <= 2) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Esforço Leve ({val}/5)
        </span>
      );
    }
    if (val === 3) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Esforço Moderado ({val}/5)
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        Esforço Elevado ({val}/5)
      </span>
    );
  };

  const getFatigueBadge = (val: number) => {
    if (val <= 2) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          Fadiga Baixa ({val}/5)
        </span>
      );
    }
    if (val === 3) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Fadiga Média ({val}/5)
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
        Fadiga Severa ({val}/5)
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-400"></span>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Acompanhamento Longitudinal
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-display">
            Diário de Sintomas & Autoavaliação Vocal
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Registre notas curtas sobre como sua voz se sentiu ao final de cada dia. Essas anotações ficam disponíveis para a sua fonoaudióloga analisar a correlação entre a prática e o alívio dos sintomas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 hover:shadow-lg transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Registrar Sintoma de Hoje</span>
        </button>
      </div>

      {/* Symptoms List */}
      <div className="space-y-4">
        {symptoms.length > 0 ? (
          symptoms.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 hover:border-teal-300 dark:hover:border-teal-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{new Date(`${item.entry_date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <div className="flex items-center gap-2">
                    {getEffortBadge(item.vocal_effort)}
                    {getFatigueBadge(item.fatigue_score)}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Prontuário Criptografado</span>
                  </span>
                  {onDeleteSymptom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tags: Symptoms & Triggers */}
              {(item.symptoms?.length > 0 || item.triggers?.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {item.symptoms?.map((symp) => (
                    <span
                      key={symp}
                      className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {symp}
                    </span>
                  ))}
                  {item.triggers?.map((trig) => (
                    <span
                      key={trig}
                      className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                    >
                      Gatilho: {trig}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes content */}
              {item.notes && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{item.notes}"
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-10 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma anotação de sintomas registrada ainda
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Ao final do seu dia, registre como suas pregas vocais reagiram à rotina. Isso auxilia sua fonoaudióloga a modular os exercícios corretos.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Primeira Anotação</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <SymptomDiaryModal
          currentUser={currentUser}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
