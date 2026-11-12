import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatientReportData, Patient, ExerciseLog, ProgressStats, VocalSymptomEntry } from '../types';

export type ReportPeriod = '7' | '30' | 'all';

export interface PdfExportConfig {
  periodDays?: ReportPeriod;
  includeWeeklyAdherence?: boolean;
  include30DayChart?: boolean;
  includeExerciseNotes?: boolean;
  includeSymptoms?: boolean;
  includeConsultationSpace?: boolean;
  patientNoteForTherapist?: string;
  previewOnly?: boolean;
}

interface GeneratePdfOptions {
  patient?: Patient | null;
  stats?: ProgressStats | null;
  logs?: ExerciseLog[];
  symptoms?: VocalSymptomEntry[];
  clinicalNotesForSession?: string;
  config?: PdfExportConfig;
}

export interface GeneratedPdfResult {
  filename: string;
  blob: Blob;
  blobUrl: string;
  logsCount: number;
  symptomsCount: number;
}

/**
 * Remove acentos para nome seguro de arquivo
 */
function sanitizeForFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Converte caracteres Unicode não suportados pelo conjunto WinAnsi (Helvetica padrão do jsPDF)
 * evitando símbolos corrompidos no documento gerado.
 */
function safePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↓/g, '(queda)')
    .replace(/↑/g, '(alta)')
    .replace(/•/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
}

function formatDateBr(isoOrDateStr: string | null | undefined): string {
  if (!isoOrDateStr) return 'Não registrado';
  try {
    const cleanDate = isoOrDateStr.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(isoOrDateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
    return isoOrDateStr;
  } catch {
    return isoOrDateStr;
  }
}

function formatDurationCompact(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds || 0));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min} min`;
}

function getLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWithinPeriod(dateStr: string | null | undefined, periodDays: ReportPeriod): boolean {
  if (periodDays === 'all' || !dateStr) return true;
  const days = periodDays === '7' ? 7 : 30;
  const cleanDate = dateStr.split('T')[0].split(' ')[0];
  const target = new Date(`${cleanDate}T12:00:00`);
  if (isNaN(target.getTime())) return true;

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return target >= cutoff;
}

/**
 * Gera relatório clínico formatado em PDF com histórico de exercícios,
 * consistência de 30 dias, precisão acústica, diário de sintomas e espaço de parecer.
 */
export async function generatePatientClinicalPdf(
  reportDataOrOptions: PatientReportData | GeneratePdfOptions
): Promise<GeneratedPdfResult> {
  const patient = reportDataOrOptions.patient || {
    id: 2,
    name: 'Paciente Vocalis',
    diagnosis: 'Hiperfunção Laríngea / Reabilitação Vocal',
    therapist_name: 'Dra. Beatriz Menezes',
    therapist_crfa: 'CRFa 2-19842',
    clinical_notes: 'Plano de reabilitação com SOVTE e relaxamento cervical.',
    daily_goal_minutes: 15,
    streak_count: 0,
    best_streak: 0,
    last_exercise_date: null,
    xp_points: 350,
    level: 2,
    level_title: 'Ressonador Ativo',
    created_at: new Date().toISOString()
  };

  const config: PdfExportConfig = {
    periodDays: 'all',
    includeWeeklyAdherence: true,
    include30DayChart: true,
    includeExerciseNotes: true,
    includeSymptoms: true,
    includeConsultationSpace: true,
    previewOnly: false,
    ...(('config' in reportDataOrOptions && reportDataOrOptions.config) || {})
  };

  const periodDays = config.periodDays || 'all';
  const allLogs = reportDataOrOptions.logs || [];
  const allSymptoms = reportDataOrOptions.symptoms || [];
  const stats = reportDataOrOptions.stats || null;

  const filteredLogs = allLogs.filter((l) => isWithinPeriod(l.date_iso || l.created_at, periodDays));
  const filteredSymptoms = allSymptoms.filter((s) => isWithinPeriod(s.entry_date || s.created_at, periodDays));

  const periodLabel =
    periodDays === '7'
      ? 'Últimos 7 Dias'
      : periodDays === '30'
      ? 'Últimos 30 Dias'
      : 'Histórico Completo';

  // Cria documento PDF em formato A4 Retrato
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const now = new Date();
  const emissionDateStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  const ensureSpace = (neededMm: number, headerSubtitle: string, currentY: number): number => {
    if (currentY + neededMm <= pageHeight - 16) return currentY;
    doc.addPage();
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(safePdfText(`VOCALIS · ${headerSubtitle}`), margin, 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      safePdfText(`Paciente: ${patient.name || 'Paciente'} · ${periodLabel}`),
      pageWidth - margin,
      9.5,
      { align: 'right' }
    );
    return 22;
  };

  // ==========================================
  // PÁGINA 1: CABEÇALHO CLÍNICO, IDENTIFICAÇÃO E RESUMO
  // ==========================================

  doc.setFillColor(15, 118, 110); // #0f766e
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(13, 148, 136); // #0d9488
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15.5);
  doc.text(safePdfText('VOCALIS · TERAPIA & REABILITAÇÃO FONOAUDIOLÓGICA'), margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.text(
    safePdfText(`RELATÓRIO CLÍNICO DE EVOLUÇÃO VOCAL (${periodLabel.toUpperCase()})`),
    margin,
    18
  );

  doc.setFontSize(7.8);
  doc.setTextColor(204, 251, 241);
  doc.text(
    safePdfText(`Emitido em ${emissionDateStr} · Relatório Estruturado para Terapeuta`),
    margin,
    24
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DADOS CRIPTOGRAFADOS LGPD', pageWidth - margin, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Prontuário ID: #${patient.id || 2}`, pageWidth - margin, 16, { align: 'right' });
  doc.text(
    safePdfText(`${patient.therapist_name || 'Dra. Beatriz Menezes'} (${patient.therapist_crfa || 'CRFa 2-19842'})`),
    pageWidth - margin,
    21,
    { align: 'right' }
  );

  let currentY = 35;

  // 1. Bloco de Identificação do Paciente
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 35, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IDENTIFICAÇÃO DO PACIENTE E PRESCRIÇÃO TERAPÊUTICA', margin + 4, currentY + 6);

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.setFont('helvetica', 'bold');
  doc.text('Paciente:', margin + 4, currentY + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.text(safePdfText(patient.name || 'Paciente Não Identificado'), margin + 21, currentY + 12.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Fonoaudióloga:', margin + 102, currentY + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    safePdfText(`${patient.therapist_name || 'Dra. Beatriz Menezes'} (${patient.therapist_crfa || 'CRFa 2-19842'})`),
    margin + 128,
    currentY + 12.5
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Diagnóstico / Foco:', margin + 4, currentY + 18.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    safePdfText(patient.diagnosis || 'Disfonia Funcional / Condicionamento Vocal'),
    margin + 36,
    currentY + 18.5
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Meta Diária:', margin + 4, currentY + 24.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.daily_goal_minutes || 15} min/dia`, margin + 25, currentY + 24.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Nível Vocal:', margin + 62, currentY + 24.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    safePdfText(`Nv. ${stats?.level || patient.level || 2} (${stats?.level_title || patient.level_title || 'Ressonador Ativo'})`),
    margin + 83,
    currentY + 24.5
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Sequência:', margin + 142, currentY + 24.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${stats?.streak_days ?? patient.streak_count ?? 0}d (Max: ${stats?.best_streak ?? patient.best_streak ?? 0}d)`,
    margin + 161,
    currentY + 24.5
  );

  if (patient.clinical_notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Conduta:', margin + 4, currentY + 30.5);
    doc.setFont('helvetica', 'italic');
    const notePreview =
      patient.clinical_notes.length > 100
        ? `${patient.clinical_notes.substring(0, 100)}...`
        : patient.clinical_notes;
    doc.text(safePdfText(notePreview), margin + 21, currentY + 30.5);
  }

  currentY += 39;

  // Nota opcional escrita pelo paciente para a fonoaudióloga
  const patientMsg = config.patientNoteForTherapist?.trim();
  if (patientMsg) {
    const wrappedMsg = doc.splitTextToSize(safePdfText(patientMsg), contentWidth - 10);
    const boxHeight = Math.max(16, 10 + wrappedMsg.length * 4.2);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.text('MENSAGEM DO PACIENTE PARA A TERAPEUTA:', margin + 4, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 41, 59);
    doc.text(wrappedMsg, margin + 4, currentY + 10.5);

    currentY += boxHeight + 5;
  }

  // 2. Indicadores Principais do Período Selecionado
  const usePeriodCalc = periodDays !== 'all' || !stats;
  const totalSessions = usePeriodCalc ? filteredLogs.length : stats?.total_sessions ?? filteredLogs.length;
  const totalMinutes = usePeriodCalc
    ? Math.round(filteredLogs.reduce((acc, l) => acc + (l.duration_sec || 0), 0) / 60)
    : stats?.total_minutes ?? Math.round(filteredLogs.reduce((acc, l) => acc + (l.duration_sec || 0), 0) / 60);

  const avgPitch =
    filteredLogs.length > 0
      ? Number(
          (
            filteredLogs.reduce((acc, l) => acc + (l.pitch_accuracy || 0), 0) / filteredLogs.length
          ).toFixed(1)
        )
      : stats?.avg_pitch_accuracy ?? 0;

  const avgFatigueRelief =
    filteredLogs.length > 0
      ? Number(
          (
            filteredLogs.reduce(
              (acc, l) => acc + Math.max(0, (l.fatigue_before ?? 0) - (l.fatigue_after ?? 0)),
              0
            ) / filteredLogs.length
          ).toFixed(1)
        )
      : stats?.avg_fatigue_relief ?? 0;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 19;
  const metrics = [
    {
      title: 'Sessões no Período',
      val: `${totalSessions}`,
      sub: periodLabel,
      bg: [240, 253, 250],
      border: [153, 246, 228],
      text: [15, 118, 110]
    },
    {
      title: 'Tempo Praticado',
      val: `${totalMinutes} min`,
      sub: 'Fonação acumulada',
      bg: [238, 242, 255],
      border: [199, 210, 254],
      text: [67, 56, 202]
    },
    {
      title: 'Precisão Acústica (F0)',
      val: `${avgPitch}%`,
      sub: 'Estabilidade média',
      bg: [254, 252, 232],
      border: [254, 240, 138],
      text: [161, 98, 7]
    },
    {
      title: 'Alívio Médio Fadiga',
      val: `-${avgFatigueRelief} pts`,
      sub: 'Escala pré -> pós (0-10)',
      bg: [240, 253, 244],
      border: [187, 247, 208],
      text: [22, 101, 52]
    }
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(m.bg[0], m.bg[1], m.bg[2]);
    doc.setDrawColor(m.border[0], m.border[1], m.border[2]);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.text(safePdfText(m.title), x + 3, currentY + 5);

    doc.setFontSize(11);
    doc.text(safePdfText(m.val), x + 3, currentY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(100, 116, 139);
    doc.text(safePdfText(m.sub), x + 3, currentY + 16);
  });

  currentY += cardHeight + 6;

  // 3. Gráfico Vetorial de Consistência dos Últimos 30 Dias
  if (config.include30DayChart !== false) {
    currentY = ensureSpace(52, 'CONSISTÊNCIA DE PRÁTICA (30 DIAS)', currentY);

    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CONSISTÊNCIA DIÁRIA DE PRÁTICA (ÚLTIMOS 30 DIAS)', margin, currentY);

    const dailyGoal = patient.daily_goal_minutes || 15;
    const today = new Date();
    const series30: Array<{ iso: string; label: string; min: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = getLocalIsoDate(d);
      const dayLogs = allLogs.filter(
        (l) => (l.date_iso || '').startsWith(iso) || (l.created_at || '').startsWith(iso)
      );
      const min = Math.round(dayLogs.reduce((acc, l) => acc + (l.duration_sec || 0), 0) / 60);
      series30.push({
        iso,
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        min
      });
    }

    const active30Days = series30.filter((s) => s.min > 0).length;
    const goalMet30Days = series30.filter((s) => s.min >= dailyGoal).length;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      safePdfText(
        `Dias ativos: ${active30Days}/30 (${Math.round((active30Days / 30) * 100)}%) · Meta de ${dailyGoal} min atingida em ${goalMet30Days} dia(s)`
      ),
      margin,
      currentY + 4.5
    );

    currentY += 7;

    const chartBoxH = 34;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, chartBoxH, 2, 2, 'FD');

    const plotX = margin + 9;
    const plotY = currentY + 4;
    const plotW = contentWidth - 13;
    const plotH = chartBoxH - 11;
    const maxMin = Math.max(dailyGoal + 5, ...series30.map((s) => s.min), 20);

    // Linha de meta prescrita
    const goalY = plotY + plotH - (dailyGoal / maxMin) * plotH;
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(plotX, goalY, plotX + plotW, goalY);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(6);
    doc.setTextColor(15, 118, 110);
    doc.text(`${dailyGoal}m`, margin + 2, goalY + 1);

    const barSlot = plotW / 30;
    const barW = Math.max(2, barSlot - 1.3);

    series30.forEach((pt, idx) => {
      const bx = plotX + idx * barSlot + 0.5;
      if (pt.min > 0) {
        const bh = Math.max(1.5, (pt.min / maxMin) * plotH);
        const by = plotY + plotH - bh;
        if (pt.min >= dailyGoal) {
          doc.setFillColor(16, 185, 129); // emerald-500
        } else {
          doc.setFillColor(20, 184, 166); // teal-500
        }
        doc.rect(bx, by, barW, bh, 'F');
      } else {
        doc.setFillColor(203, 213, 225); // slate-300
        doc.rect(bx, plotY + plotH - 0.6, barW, 0.6, 'F');
      }

      if (idx % 5 === 0 || idx === 29) {
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text(pt.label, bx + barW / 2, plotY + plotH + 4, { align: 'center' });
      }
    });

    currentY += chartBoxH + 6;
  }

  // 4. Tabela de Adesão Semanal (Últimos 7 Dias)
  if (config.includeWeeklyAdherence !== false) {
    currentY = ensureSpace(55, 'ADESÃO SEMANAL AOS EXERCÍCIOS', currentY);

    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FREQUÊNCIA E ADESÃO SEMANAL (ÚLTIMOS 7 DIAS)', margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      safePdfText(`Comparativo diário com a meta terapêutica de ${patient.daily_goal_minutes || 15} minutos.`),
      margin,
      currentY + 4.3
    );

    currentY += 6;

    const weekRows = (stats?.last_7_days || []).map((day) => {
      const statusText = day.completed
        ? 'Meta Atingida'
        : day.minutes > 0
        ? `Parcial (${day.minutes} min)`
        : 'Sem registro';
      return [
        formatDateBr(day.date),
        safePdfText(day.day_name),
        `${day.minutes} min`,
        `${day.target_minutes || patient.daily_goal_minutes || 15} min`,
        `${day.count} sessão(ões)`,
        statusText
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Data', 'Dia', 'Tempo Praticado', 'Meta', 'Sessões', 'Status da Meta']],
      body:
        weekRows.length > 0
          ? weekRows
          : [[formatDateBr(new Date().toISOString()), 'Hoje', '0 min', '15 min', '0 sessões', 'Aguardando prática']],
      theme: 'grid',
      styles: {
        fontSize: 7.8,
        cellPadding: 2,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 26 },
        1: { halign: 'center', cellWidth: 24 },
        2: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 24 },
        4: { halign: 'center', cellWidth: 28 },
        5: { halign: 'center', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const text = String(data.cell.raw);
          if (text.includes('Meta Atingida')) {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (text.includes('Parcial')) {
            data.cell.styles.textColor = [217, 119, 6];
          } else {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      }
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 40) + 8;
  }

  // ==========================================
  // PÁGINA 2: RESUMO POR TÉCNICA & HISTÓRICO CRONOLÓGICO DE EXERCÍCIOS
  // ==========================================
  doc.addPage();

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('VOCALIS · HISTÓRICO DE EXERCÍCIOS E PARÂMETROS ACÚSTICOS', margin, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    safePdfText(`Paciente: ${patient.name || 'Paciente'} · ${periodLabel}`),
    pageWidth - margin,
    9.5,
    { align: 'right' }
  );

  currentY = 21;

  // Resumo agrupado por exercício (ajuda o terapeuta a ver rapidamente o volume por técnica)
  if (filteredLogs.length > 0) {
    const groupedMap = new Map<
      string,
      { title: string; sessions: number; totalSec: number; pitchSum: number; reliefSum: number }
    >();
    filteredLogs.forEach((l) => {
      const key = l.exercise_title || l.exercise_id || 'Exercício Vocal';
      const prev = groupedMap.get(key) || {
        title: key,
        sessions: 0,
        totalSec: 0,
        pitchSum: 0,
        reliefSum: 0
      };
      prev.sessions += 1;
      prev.totalSec += l.duration_sec || 0;
      prev.pitchSum += l.pitch_accuracy || 0;
      prev.reliefSum += Math.max(0, (l.fatigue_before ?? 0) - (l.fatigue_after ?? 0));
      groupedMap.set(key, prev);
    });

    const summaryRows = Array.from(groupedMap.values())
      .sort((a, b) => b.sessions - a.sessions)
      .map((item) => [
        safePdfText(item.title),
        `${item.sessions}x`,
        formatDurationCompact(item.totalSec),
        `${(item.pitchSum / item.sessions).toFixed(1)}%`,
        `-${(item.reliefSum / item.sessions).toFixed(1)} pts`
      ]);

    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SÍNTESE POR TÉCNICA FONOAUDIOLÓGICA', margin, currentY);
    currentY += 3.5;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Exercício / Técnica', 'Sessões', 'Tempo Acumulado', 'Precisão F0 Média', 'Alívio Médio']],
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 7.6, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 32 },
        3: { halign: 'center', cellWidth: 34 },
        4: { halign: 'center', cellWidth: 28 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 25) + 8;
  }

  currentY = ensureSpace(45, 'HISTÓRICO DETALHADO DE EXERCÍCIOS', currentY);

  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`HISTÓRICO CRONOLÓGICO DE EXERCÍCIOS (${filteredLogs.length} REGISTROS)`, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Registros individuais com duração, repetições, precisão acústica (F0), esforço percebido e variação de fadiga.',
    margin,
    currentY + 4.3
  );

  currentY += 6.5;

  const includeNotes = config.includeExerciseNotes !== false;

  const exerciseRows = filteredLogs.map((log) => {
    const durationLabel = formatDurationCompact(log.duration_sec || 0);
    const accuracy = log.pitch_accuracy != null ? `${Number(log.pitch_accuracy).toFixed(1)}%` : 'N/A';
    const hasFatigue = log.fatigue_before != null && log.fatigue_after != null;
    const diff = hasFatigue ? log.fatigue_before - log.fatigue_after : 0;
    const fatigue = hasFatigue
      ? `${log.fatigue_before} -> ${log.fatigue_after}${diff > 0 ? ` (-${diff})` : ''}`
      : 'N/A';
    const noteText = log.notes ? safePdfText(log.notes.trim()) : 'Sem notas';

    const row = [
      formatDateBr(log.date_iso || log.created_at),
      safePdfText(log.exercise_title || log.exercise_id || 'Exercício'),
      `${durationLabel} (${log.repetitions || 1}x)`,
      accuracy,
      `Nv. ${log.effort_level || 2}/5`,
      fatigue
    ];

    if (includeNotes) {
      row.push(noteText);
    }

    return row;
  });

  const exerciseHead = includeNotes
    ? [['Data', 'Exercício Fonoaudiológico', 'Duração / Rep.', 'Precisão (F0)', 'Esforço', 'Fadiga', 'Notas & Sensação Vocal']]
    : [['Data', 'Exercício Fonoaudiológico', 'Duração / Rep.', 'Precisão (F0)', 'Esforço', 'Fadiga']];

  const emptyRow = includeNotes
    ? [formatDateBr(new Date().toISOString()), 'Nenhum exercício no período selecionado', '-', '-', '-', '-', 'Ajuste o filtro ou pratique no app']
    : [formatDateBr(new Date().toISOString()), 'Nenhum exercício no período selecionado', '-', '-', '-', '-'];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: exerciseHead,
    body: exerciseRows.length > 0 ? exerciseRows : [emptyRow],
    theme: 'grid',
    styles: {
      fontSize: 7.4,
      cellPadding: 2,
      font: 'helvetica',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: includeNotes
      ? {
          0: { halign: 'center', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 40, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 23 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'center', cellWidth: 23 },
          6: { halign: 'left' }
        }
      : {
          0: { halign: 'center', cellWidth: 24 },
          1: { halign: 'left', fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 28 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 28 }
        },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  currentY = ((doc as any).lastAutoTable?.finalY || currentY + 40) + 8;

  // ==========================================
  // SEÇÃO 3: DIÁRIO DE SINTOMAS & ESPAÇO DE PARECER
  // ==========================================
  if (config.includeSymptoms !== false || config.includeConsultationSpace !== false) {
    doc.addPage();

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('VOCALIS · DIÁRIO DE SINTOMAS & AVALIAÇÃO DA CONSULTA', margin, 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      safePdfText(`Paciente: ${patient.name || 'Paciente'} · Consulta Presencial`),
      pageWidth - margin,
      9.5,
      { align: 'right' }
    );

    currentY = 22;

    if (config.includeSymptoms !== false) {
      doc.setTextColor(15, 118, 110);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('REGISTRO DO DIÁRIO DE SINTOMAS E QUEIXAS DO PACIENTE', margin, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Autoavaliações registradas pelo paciente sobre fadiga vocal, sensações laríngeas e gatilhos ambientais.',
        margin,
        currentY + 4.3
      );

      currentY += 6.5;

      const symptomRows = filteredSymptoms.map((entry) => {
        const sympList =
          Array.isArray(entry.symptoms) && entry.symptoms.length > 0
            ? safePdfText(entry.symptoms.join(', '))
            : 'Nenhum sintoma agudo';
        const trigList =
          Array.isArray(entry.triggers) && entry.triggers.length > 0
            ? safePdfText(entry.triggers.join(', '))
            : 'Sem gatilho';
        const notes = entry.notes ? safePdfText(entry.notes.trim()) : 'Sem notas';

        return [
          formatDateBr(entry.entry_date),
          `Esforço: ${entry.vocal_effort || 1}/5\nFadiga: ${entry.fatigue_score || 1}/5`,
          sympList,
          trigList,
          notes
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Data', 'Nível (1-5)', 'Sintomas Apontados', 'Gatilhos Ambientais/Uso', 'Observações do Paciente']],
        body:
          symptomRows.length > 0
            ? symptomRows
            : [
                [
                  formatDateBr(new Date().toISOString()),
                  'Normal',
                  'Sem queixas registradas no período',
                  'Nenhum',
                  'Estabilidade e hidratação adequadas.'
                ]
              ],
        theme: 'grid',
        styles: {
          fontSize: 7.4,
          cellPadding: 2,
          font: 'helvetica',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { halign: 'center', cellWidth: 24 },
          2: { halign: 'left', cellWidth: 44 },
          3: { halign: 'left', cellWidth: 40 },
          4: { halign: 'left' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      const finalYAfterSymptoms = (doc as any).lastAutoTable?.finalY || currentY + 40;
      currentY = Math.max(finalYAfterSymptoms + 8, 95);
    }

    if (config.includeConsultationSpace !== false) {
      currentY = ensureSpace(90, 'PARECER CLÍNICO DA CONSULTA PRESENCIAL', currentY);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, contentWidth, 54, 2, 2, 'FD');

      doc.setTextColor(15, 118, 110);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('ANOTAÇÕES CLÍNICAS DA CONSULTA (ESPAÇO RESERVADO À FONOAUDIÓLOGA)', margin + 4, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Evolução perceptivo-auditiva (GRBASI), medidas de TMF (s/z), laringoscopia ou ajuste de conduta:',
        margin + 4,
        currentY + 11
      );

      doc.setDrawColor(226, 232, 240);
      for (let l = 0; l < 5; l++) {
        const lineY = currentY + 18 + l * 7;
        doc.line(margin + 4, lineY, margin + contentWidth - 4, lineY);
      }

      currentY += 60;

      // Assinaturas
      const signColWidth = (contentWidth - 20) / 2;
      const fonoX = margin + 5;
      doc.setDrawColor(100, 116, 139);
      doc.line(fonoX, currentY + 14, fonoX + signColWidth, currentY + 14);

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(safePdfText(patient.therapist_name || 'Dra. Beatriz Menezes'), fonoX + signColWidth / 2, currentY + 19, {
        align: 'center'
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        safePdfText(`Fonoaudióloga Responsável · ${patient.therapist_crfa || 'CRFa 2-19842'}`),
        fonoX + signColWidth / 2,
        currentY + 23.5,
        { align: 'center' }
      );

      const pacX = margin + signColWidth + 15;
      doc.line(pacX, currentY + 14, pacX + signColWidth, currentY + 14);

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(safePdfText(patient.name || 'Paciente Vocalis'), pacX + signColWidth / 2, currentY + 19, {
        align: 'center'
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Assinatura do(a) Paciente / Responsável', pacX + signColWidth / 2, currentY + 23.5, {
        align: 'center'
      });
    }
  }

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      safePdfText('Vocalis · Sistema de Prontuário & Terapia Vocal Criptografado (LGPD Lei 13.709/2018).'),
      margin,
      pageHeight - 6.5
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  const patientCleanName = sanitizeForFileName(patient.name || 'Paciente');
  const dateStr = now.toISOString().split('T')[0];
  const periodSuffix = periodDays === 'all' ? 'Completo' : `${periodDays}dias`;
  const filename = `Relatorio_Vocalis_${patientCleanName}_${periodSuffix}_${dateStr}.pdf`;

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  if (!config.previewOnly) {
    doc.save(filename);
  }

  return {
    filename,
    blob,
    blobUrl,
    logsCount: filteredLogs.length,
    symptomsCount: filteredSymptoms.length
  };
}
