import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  FileDown,
  Eye,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
  Share2,
  Stethoscope,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { ExerciseLog, Patient, ProgressStats, VocalSymptomEntry } from '../types';
import {
  generatePatientClinicalPdf,
  GeneratedPdfResult,
  PdfExportConfig,
  ReportPeriod
} from '../utils/pdfExport';
import { shareOrDownloadPdfBlob, triggerHaptic } from '../utils/androidBridge';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  stats: ProgressStats | null;
  logs: ExerciseLog[];
  symptoms: VocalSymptomEntry[];
  onExportSuccess?: (filename: string) => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  patient,
  stats,
  logs,
  symptoms,
  onExportSuccess,
}) => {
  const [periodDays, setPeriodDays] = useState<ReportPeriod>('30');
  const [include30DayChart, setInclude30DayChart] = useState<boolean>(true);
  const [includeWeeklyAdherence, setIncludeWeeklyAdherence] = useState<boolean>(true);
  const [includeExerciseNotes, setIncludeExerciseNotes] = useState<boolean>(true);
  const [includeSymptoms, setIncludeSymptoms] = useState<boolean>(true);
  const [includeConsultationSpace, setIncludeConsultationSpace] = useState<boolean>(true);
  const [patientNoteForTherapist, setPatientNoteForTherapist] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<GeneratedPdfResult | null>(null);

  // Clean up object URL on unmount or close
  useEffect(() => {
    return () => {
      if (previewData?.blobUrl) {
        URL.revokeObjectURL(previewData.blobUrl);
      }
    };
  }, [previewData]);

  useEffect(() => {
    if (!isOpen && previewData?.blobUrl) {
      URL.revokeObjectURL(previewData.blobUrl);
      setPreviewData(null);
    }
  }, [isOpen]);

  const filteredPreviewStats = useMemo(() => {
    const isWithin = (dateStr?: string) => {
      if (periodDays === 'all' || !dateStr) return true;
      const days = periodDays === '7' ? 7 : 30;
      const cleanDate = dateStr.split('T')[0].split(' ')[0];
      const target = new Date(`${cleanDate}T12:00:00`);
      if (isNaN(target.getTime())) return true;
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - (days - 1));
      return target >= cutoff;
    };

    const matchingLogs = logs.filter((l) => isWithin(l.date_iso || l.created_at));
    const matchingSymptoms = symptoms.filter((s) => isWithin(s.entry_date || s.created_at));
    const totalMinutes = Math.round(matchingLogs.reduce((acc, l) => acc + (l.duration_sec || 0), 0) / 60);

    return {
      logsCount: matchingLogs.length,
      symptomsCount: matchingSymptoms.length,
      totalMinutes,
    };
  }, [logs, symptoms, periodDays]);

  if (!isOpen) return null;

  const buildConfig = (previewOnly: boolean): PdfExportConfig => ({
    periodDays,
    include30DayChart,
    includeWeeklyAdherence,
    includeExerciseNotes,
    includeSymptoms,
    includeConsultationSpace,
    patientNoteForTherapist: patientNoteForTherapist.trim() || undefined,
    previewOnly,
  });

  const handleGenerate = async (previewOnly: boolean) => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      if (previewData?.blobUrl) {
        URL.revokeObjectURL(previewData.blobUrl);
        setPreviewData(null);
      }

      const result = await generatePatientClinicalPdf({
        patient,
        stats,
        logs,
        symptoms,
        config: buildConfig(previewOnly),
      });

      if (previewOnly) {
        setPreviewData(result);
      } else {
        URL.revokeObjectURL(result.blobUrl);
        if (onExportSuccess) onExportSuccess(result.filename);
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      setErrorMsg(err?.message || 'Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadFromPreview = () => {
    if (!previewData) return;
    const link = document.createElement('a');
    link.href = previewData.blobUrl;
    link.download = previewData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onExportSuccess) onExportSuccess(previewData.filename);
    onClose();
  };

  const handleSharePdf = async () => {
    try {
      setIsGenerating(true);
      setErrorMsg(null);
      const result =
        previewData ||
        (await generatePatientClinicalPdf({
          patient,
          stats,
          logs,
          symptoms,
          config: buildConfig(true),
        }));

      triggerHaptic(15);
      const method = await shareOrDownloadPdfBlob(
        result.blob,
        result.filename,
        'Relatório Clínico Vocalis',
        `Relatório de evolução vocal de ${patient?.name || 'Paciente'} para acompanhamento fonoaudiológico.`
      );
      if (method === 'download' && onExportSuccess) {
        onExportSuccess(result.filename);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setErrorMsg('Não foi possível compartilhar diretamente. Use "Baixar PDF" para enviar ao seu terapeuta.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                Exportação Estruturada para Terapeuta
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 font-display">
                {previewData ? 'Pré-visualização do Relatório PDF' : 'Configurar Relatório Clínico (.pdf)'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body: Preview View or Configurator */}
        {previewData ? (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 bg-slate-100 dark:bg-slate-950 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-medium truncate">
                Arquivo: <strong className="text-slate-900 dark:text-slate-100">{previewData.filename}</strong>
              </span>
              <span className="shrink-0 ml-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                {previewData.logsCount} sessões · {previewData.symptomsCount} sintomas
              </span>
            </div>

            <div className="flex-1 min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white">
              <iframe
                src={previewData.blobUrl}
                title="Prévia do Relatório PDF"
                className="w-full h-full min-h-[380px] border-0"
              />
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* Period Selection */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>1. Período do Histórico de Exercícios</span>
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: '7' as ReportPeriod, label: 'Últimos 7 dias', desc: 'Semana recente' },
                  { id: '30' as ReportPeriod, label: 'Últimos 30 dias', desc: 'Ciclo mensal' },
                  { id: 'all' as ReportPeriod, label: 'Todo o Histórico', desc: 'Desde o início' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPeriodDays(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      periodDays === opt.id
                        ? 'border-teal-600 dark:border-teal-400 bg-teal-50/70 dark:bg-teal-950/50 ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Dynamic Preview Count Pill */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Dados incluídos neste recorte:</span>
                </span>
                <div className="flex items-center gap-3 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  <span>{filteredPreviewStats.logsCount} exercício(s)</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{filteredPreviewStats.totalMinutes} min</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{filteredPreviewStats.symptomsCount} registro(s) de sintomas</span>
                </div>
              </div>
            </div>

            {/* Sections Checklist */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                <SlidersHorizontal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>2. Seções do Relatório Clínico</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  {
                    checked: include30DayChart,
                    onChange: setInclude30DayChart,
                    title: 'Gráfico de Consistência (30 dias)',
                    desc: 'Barras diárias comparadas à meta vocal',
                  },
                  {
                    checked: includeWeeklyAdherence,
                    onChange: setIncludeWeeklyAdherence,
                    title: 'Tabela de Adesão Semanal',
                    desc: 'Detalhamento dos últimos 7 dias',
                  },
                  {
                    checked: includeExerciseNotes,
                    onChange: setIncludeExerciseNotes,
                    title: 'Notas Pessoais das Sessões',
                    desc: 'Sensações e comentários após cada treino',
                  },
                  {
                    checked: includeSymptoms,
                    onChange: setIncludeSymptoms,
                    title: 'Diário de Sintomas Vocais',
                    desc: 'Esforço, fadiga, sintomas e gatilhos',
                  },
                  {
                    checked: includeConsultationSpace,
                    onChange: setIncludeConsultationSpace,
                    title: 'Campo de Parecer & Assinaturas',
                    desc: 'Linhas para anotações da fonoaudióloga',
                  },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      item.checked
                        ? 'bg-teal-50/40 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800'
                        : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional message to Therapist */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>3. Recado ou Observação para a Terapeuta (Opcional)</span>
                </span>
                <span className="text-[10px] font-normal normal-case text-slate-500">
                  Aparecerá destacado na página 1
                </span>
              </label>

              <textarea
                rows={2}
                value={patientNoteForTherapist}
                onChange={(e) => setPatientNoteForTherapist(e.target.value)}
                placeholder="Ex: Dra. Beatriz, senti mais facilidade no canudo esta semana, mas minha voz cansou na quinta após reunião longa."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-900/60 flex items-center gap-2.5 text-[11px] text-teal-900 dark:text-teal-200">
              <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Destinatária: <strong>{patient?.therapist_name || 'Dra. Beatriz Menezes'}</strong> ({patient?.therapist_crfa || 'CRFa 2-19842'}). O PDF inclui síntese por exercício, precisão F0 e redução de fadiga.
              </span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2.5">
          {previewData ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (previewData.blobUrl) URL.revokeObjectURL(previewData.blobUrl);
                  setPreviewData(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar às Opções</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSharePdf}
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadFromPreview}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Baixar PDF Agora</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  )}
                  <span>Pré-visualizar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerate(false)}
                  disabled={isGenerating}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  <span>{isGenerating ? 'Gerando PDF...' : 'Baixar Relatório PDF'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
