import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatientReportData, Patient, ExerciseLog, ProgressStats, VocalSymptomEntry } from '../types';

interface GeneratePdfOptions {
  patient?: Patient | null;
  stats?: ProgressStats | null;
  logs?: ExerciseLog[];
  symptoms?: VocalSymptomEntry[];
  clinicalNotesForSession?: string;
}

/**
 * Utilitário de formatação de strings e remoção de caracteres problemáticos
 */
function sanitizeForFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

function formatDateBr(isoOrDateStr: string | null | undefined): string {
  if (!isoOrDateStr) return 'Não registrado';
  try {
    const parts = isoOrDateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(isoOrDateStr);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return isoOrDateStr;
  }
}

/**
 * Gera e realiza o download do relatório clínico oficial em PDF
 * para ser apresentado pelo paciente em consultas presenciais de fonoaudiologia.
 */
export async function generatePatientClinicalPdf(
  reportDataOrOptions: PatientReportData | GeneratePdfOptions
): Promise<void> {
  const patient = reportDataOrOptions.patient || {
    id: 2,
    name: 'Paciente Vocalis',
    diagnosis: 'Hiperfunção Laríngea / Nódulos Vocais',
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

  const logs = reportDataOrOptions.logs || [];
  const stats = reportDataOrOptions.stats || null;
  const symptoms = reportDataOrOptions.symptoms || [];

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
  const emissionDateStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  // ==========================================
  // PÁGINA 1: CABEÇALHO CLÍNICO, IDENTIFICAÇÃO E RESUMO
  // ==========================================

  // Barra de Destaque Superior (Teal Fonoaudiológico)
  doc.setFillColor(15, 118, 110); // #0f766e
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Faixa decorativa sutil
  doc.setFillColor(13, 148, 136); // #0d9488
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  // Título e Identidade da Clínica no Cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VOCALIS · TERAPIA & REABILITAÇÃO FONOAUDIOLÓGICA', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('RELATÓRIO CLÍNICO DE EVOLUÇÃO VOCAL E ADESÃO TERAPÊUTICA', margin, 18);

  doc.setFontSize(8);
  doc.setTextColor(204, 251, 241);
  doc.text(`Emissão: ${emissionDateStr} · Documento para Apresentação em Consulta Presencial`, margin, 24);

  // Status de Criptografia LGPD no topo direito
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DADOS CRIPTOGRAFADOS LGPD', pageWidth - margin, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Prontuário SQLite ID: #${patient.id || 2}`, pageWidth - margin, 16, { align: 'right' });
  doc.text(`Fono: ${patient.therapist_name || 'Dra. Beatriz Menezes'} (${patient.therapist_crfa || 'CRFa 2-19842'})`, pageWidth - margin, 21, { align: 'right' });

  let currentY = 36;

  // 1. Bloco de Identificação do Paciente
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, contentWidth, 34, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('IDENTIFICAÇÃO DO PACIENTE E PRESCRIÇÃO TERAPÊUTICA', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700

  // Linha 1: Nome, Fonoaudióloga
  doc.setFont('helvetica', 'bold');
  doc.text('Nome do Paciente:', margin + 4, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.name || 'Paciente Não Identificado', margin + 35, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Fonoaudióloga:', margin + 105, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.therapist_name || 'Dra. Beatriz Menezes'} (${patient.therapist_crfa || 'CRFa 2-19842'})`, margin + 130, currentY + 13);

  // Linha 2: Diagnóstico
  doc.setFont('helvetica', 'bold');
  doc.text('Hipótese Diagnóstica:', margin + 4, currentY + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.diagnosis || 'Disfonia Funcional / Em investigação clínica', margin + 39, currentY + 19);

  // Linha 3: Meta, Nível, Sequência
  doc.setFont('helvetica', 'bold');
  doc.text('Meta Diária Prescrita:', margin + 4, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.daily_goal_minutes || 15} minutos/dia`, margin + 40, currentY + 25);

  doc.setFont('helvetica', 'bold');
  doc.text('Nível Vocal Atual:', margin + 70, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nv. ${stats?.level || patient.level || 2} (${stats?.level_title || patient.level_title || 'Ressonador Ativo'})`, margin + 98, currentY + 25);

  doc.setFont('helvetica', 'bold');
  doc.text('Sequência:', margin + 142, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats?.streak_days || patient.streak_count || 0} dias (Recorde: ${stats?.best_streak || patient.best_streak || 0})`, margin + 160, currentY + 25);

  // Linha 4: Observação Clínica Geral
  if (patient.clinical_notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Conduta / Observação:', margin + 4, currentY + 30.5);
    doc.setFont('helvetica', 'italic');
    doc.text(
      patient.clinical_notes.length > 95 ? `${patient.clinical_notes.substring(0, 95)}...` : patient.clinical_notes,
      margin + 42,
      currentY + 30.5
    );
  }

  currentY += 38;

  // 2. Indicadores Principais de Desempenho (4 Cards Métricos)
  const totalSessions = stats?.total_sessions || logs.length || 0;
  const totalMinutes = stats?.total_minutes || Math.floor(logs.reduce((acc, l) => acc + (l.duration_sec || 0), 0) / 60);
  const avgPitch = stats?.avg_pitch_accuracy || (totalSessions > 0 ? Number((logs.reduce((acc, l) => acc + (l.pitch_accuracy || 0), 0) / totalSessions).toFixed(1)) : 92.0);
  const avgFatigueRelief = stats?.avg_fatigue_relief || 1.5;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 19;
  const metrics = [
    { title: 'Sessões Realizadas', val: `${totalSessions}`, sub: 'Exercícios no SQLite', bg: [240, 253, 250], border: [153, 246, 228], text: [15, 118, 110] },
    { title: 'Tempo Total de Treino', val: `${totalMinutes} min`, sub: 'Duração acumulada', bg: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] },
    { title: 'Precisão Acústica (F0)', val: `${avgPitch}%`, sub: 'Estabilidade da nota', bg: [254, 252, 232], border: [254, 240, 138], text: [161, 98, 7] },
    { title: 'Alívio Médio de Fadiga', val: `-${avgFatigueRelief} pts`, sub: 'Pós-exercício (0-10)', bg: [240, 253, 244], border: [187, 247, 208], text: [22, 101, 52] },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(m.bg[0], m.bg[1], m.bg[2]);
    doc.setDrawColor(m.border[0], m.border[1], m.border[2]);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.text(m.title, x + 3, currentY + 5);

    doc.setFontSize(11);
    doc.text(m.val, x + 3, currentY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(m.sub, x + 3, currentY + 16);
  });

  currentY += cardHeight + 6;

  // 3. Tabela de Adesão Semanal (Últimos 7 Dias)
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('FREQUÊNCIA E ADESÃO SEMANAL AOS EXERCÍCIOS (ÚLTIMOS 7 DIAS)', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Registro diário comparativo com a meta terapêutica de 15 minutos prescrita pela fonoaudióloga.', margin, currentY + 4.5);

  currentY += 6.5;

  const weekRows = (stats?.last_7_days || []).map((day) => {
    const statusText = day.completed
      ? 'Meta Atingida'
      : day.minutes > 0
        ? `Parcial (${day.minutes} min)`
        : 'Sem registro';
    return [
      formatDateBr(day.date),
      day.day_name,
      `${day.minutes} min`,
      `${day.target_minutes || 15} min`,
      `${day.count} sessão(ões)`,
      statusText
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Data', 'Dia da Semana', 'Tempo Praticado', 'Meta Prescrita', 'Sessões', 'Status da Meta']],
    body: weekRows.length > 0 ? weekRows : [
      [formatDateBr(new Date().toISOString()), 'Hoje', '0 min', '15 min', '0 sessões', 'Aguardando prática']
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
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
      1: { halign: 'center', cellWidth: 28 },
      2: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 46, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text.includes('Meta Atingida')) {
          data.cell.styles.textColor = [16, 185, 129]; // emerald
        } else if (text.includes('Parcial')) {
          data.cell.styles.textColor = [217, 119, 6]; // amber
        } else {
          data.cell.styles.textColor = [148, 163, 184]; // slate-400
        }
      }
    }
  });

  // ==========================================
  // PÁGINA 2: HISTÓRICO CRONOLÓGICO DE EXERCÍCIOS VOCAIS
  // ==========================================
  doc.addPage();

  // Cabeçalho resumido da página secundária
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VOCALIS · HISTÓRICO DE EXERCÍCIOS E PARÂMETROS ACÚSTICOS', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Paciente: ${patient.name || 'Paciente'} · Prontuário SQLite #${patient.id || 2}`, pageWidth - margin, 10, { align: 'right' });

  currentY = 22;

  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HISTÓRICO DETALHADO DOS EXERCÍCIOS VOCAIS REALIZADOS', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Dados de execução acústica sincronizados com o banco de dados seguro SQLite. Registra afinação (F0), duração e fadiga.',
    margin,
    currentY + 4.5
  );

  currentY += 7;

  const exerciseRows = logs.map((log) => {
    const durationMin = Math.round((log.duration_sec || 0) / 60) || '< 1';
    const accuracy = log.pitch_accuracy != null ? `${log.pitch_accuracy.toFixed(1)}%` : 'N/A';
    const fatigue = log.fatigue_before != null && log.fatigue_after != null
      ? `${log.fatigue_before} → ${log.fatigue_after} (${log.fatigue_before > log.fatigue_after ? '↓' : '—'})`
      : 'N/A';
    const noteText = log.notes ? log.notes.trim() : 'Sem notas';

    return [
      formatDateBr(log.date_iso),
      log.exercise_title || log.exercise_id || 'Exercício',
      `${durationMin} min (${log.repetitions || 1}x)`,
      accuracy,
      `Nv. ${log.effort_level || 2}/5`,
      fatigue,
      noteText
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Data', 'Exercício Fonoaudiológico', 'Duração / Rep.', 'Precisão (F0)', 'Esforço', 'Fadiga Laríngea', 'Notas & Sensação Vocal']],
    body: exerciseRows.length > 0 ? exerciseRows : [
      [formatDateBr(new Date().toISOString()), 'Nenhum exercício registrado ainda', '—', '—', '—', '—', 'Inicie os exercícios pelo app']
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
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
      1: { halign: 'left', cellWidth: 42, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 24 },
      6: { halign: 'left' } // Preenche o restante com as anotações do paciente
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // ==========================================
  // PÁGINA 3: DIÁRIO DE SINTOMAS & CAMPO PARA CONSULTA PRESENCIAL
  // ==========================================
  doc.addPage();

  // Cabeçalho da página 3
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VOCALIS · DIÁRIO DE SINTOMAS & AVALIAÇÃO DA CONSULTA', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Paciente: ${patient.name || 'Paciente'} · Consulta Presencial`, pageWidth - margin, 10, { align: 'right' });

  currentY = 22;

  // Seção do Diário de Sintomas
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REGISTRO DO DIÁRIO DE SINTOMAS E QUEIXAS DO PACIENTE', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Anotações registradas pelo paciente ao final do dia sobre fadiga vocal, sensações laríngeas e gatilhos de esforço.',
    margin,
    currentY + 4.5
  );

  currentY += 7;

  const symptomRows = symptoms.map((entry) => {
    const sympList = Array.isArray(entry.symptoms) && entry.symptoms.length > 0
      ? entry.symptoms.join(', ')
      : 'Nenhum sintoma agudo';
    const trigList = Array.isArray(entry.triggers) && entry.triggers.length > 0
      ? entry.triggers.join(', ')
      : 'Sem gatilho';
    const notes = entry.notes ? entry.notes.trim() : 'Sem notas';

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
    head: [['Data', 'Nível (1-5)', 'Sintomas Apontados', 'Gatilhos Ambientais/Uso', 'Observações Pessoais do Paciente']],
    body: symptomRows.length > 0 ? symptomRows : [
      [formatDateBr(new Date().toISOString()), 'Normal', 'Sem queixas registradas', 'Nenhum', 'Voz com boa estabilidade e hidratação adequada.']
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
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

  // Localiza onde a tabela de sintomas terminou
  const finalYAfterSymptoms = (doc as any).lastAutoTable?.finalY || currentY + 40;
  currentY = Math.max(finalYAfterSymptoms + 6, 120);

  // Se estiver muito próximo do fim da página, adiciona página para o parecer
  if (currentY > pageHeight - 90) {
    doc.addPage();
    // Cabeçalho da página 4
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('VOCALIS · PARECER CLÍNICO DA CONSULTA PRESENCIAL', margin, 10);
    currentY = 24;
  }

  // 4. Espaço para Anotações da Fonoaudióloga na Consulta Presencial
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, currentY, contentWidth, 54, 2, 2, 'FD');

  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('ANOTAÇÕES CLÍNICAS DA CONSULTA PRESENCIAL (ESPAÇO RESERVADO À FONOAUDIÓLOGA)', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Registre aqui evolução perceptivo-auditiva, medidas de TMF (s/z), laringoscopia ou ajuste de exercícios:', margin + 4, currentY + 11);

  // Linhas pautadas para anotação manual durante a consulta
  doc.setDrawColor(226, 232, 240);
  for (let l = 0; l < 5; l++) {
    const lineY = currentY + 18 + l * 7;
    doc.line(margin + 4, lineY, margin + contentWidth - 4, lineY);
  }

  currentY += 60;

  // 5. Bloco de Assinaturas (Fonoaudióloga e Paciente)
  const signColWidth = (contentWidth - 20) / 2;

  // Assinatura Fonoaudióloga
  const fonoX = margin + 5;
  doc.setDrawColor(100, 116, 139);
  doc.line(fonoX, currentY + 15, fonoX + signColWidth, currentY + 15);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(patient.therapist_name || 'Dra. Beatriz Menezes', fonoX + signColWidth / 2, currentY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fonoaudióloga Responsável · ${patient.therapist_crfa || 'CRFa 2-19842'}`, fonoX + signColWidth / 2, currentY + 24.5, { align: 'center' });

  // Assinatura Paciente
  const pacX = margin + signColWidth + 15;
  doc.line(pacX, currentY + 15, pacX + signColWidth, currentY + 15);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(patient.name || 'Paciente Vocalis', pacX + signColWidth / 2, currentY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura do(a) Paciente / Responsável', pacX + signColWidth / 2, currentY + 24.5, { align: 'center' });

  // 6. Rodapé em todas as páginas (Numeração e Aviso LGPD)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'Vocalis · Sistema de Prontuário & Terapia Vocal Criptografado (LGPD Lei 13.709/2018). Documento para fins clínicos.',
      margin,
      pageHeight - 6.5
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // Nome do Arquivo Sanitizado
  const patientCleanName = sanitizeForFileName(patient.name || 'Paciente');
  const dateStr = now.toISOString().split('T')[0];
  const filename = `Relatorio_Clinico_Vocalis_${patientCleanName}_${dateStr}.pdf`;

  // Executa o download automático no navegador
  doc.save(filename);
}
