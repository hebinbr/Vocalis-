import React, { useState, useMemo } from 'react';
import { Lightbulb, BookOpen, Droplets, RefreshCw, ChevronRight, ChevronLeft, ShieldCheck, Apple, Wind, Sparkles } from 'lucide-react';
import { VocalTip } from '../types';

const EVIDENCE_BASED_TIPS: VocalTip[] = [
  {
    id: 1,
    title: 'Hidratação Sistêmica & Viscosidade do Muco',
    category: 'Hidratação & Biomecânica',
    summary: 'A hidratação adequada reduz a Pressão de Limiar de Fonação (PTP), diminuindo o esforço mecânico necessário para fazer as pregas vocais vibrarem.',
    practicalAction: 'Beba água em temperatura ambiente em pequenos goles frequentes (150-200ml a cada hora). Evite beber grandes volumes de uma só vez.',
    scientificSource: 'Verdolini-Abbott, K. et al. (1994; 2002) - Laryngoscope / Sivasankar & Fisher (2002)',
    benefitTag: 'Reduz fadiga e atrito em até 35%',
    iconName: 'Droplets'
  },
  {
    id: 2,
    title: 'O Perigo do Pigarro & Choque Mecânico',
    category: 'Comportamento Vocal',
    summary: 'Pigarrear provoca uma colisão violenta e hiperadutora entre as bordas livres das pregas vocais, perpetuando edema e hiperemia tecidual.',
    practicalAction: 'Ao sentir vontade de pigarrear, substitua pelo "método da deglutição com esforço": beba um gole de água ou engula a saliva forçando o fechamento sem emitir som.',
    scientificSource: 'Behlau, M. & Pontes, P. (1995) - Higiene Vocal para Profissionais da Voz',
    benefitTag: 'Previne nódulos e lesões fonotraumáticas',
    iconName: 'ShieldCheck'
  },
  {
    id: 3,
    title: 'Aquecimento Vocal & Trato Semiocluído (SOVTE)',
    category: 'Fisiologia do Exercício',
    summary: 'Exercícios com resistência anterior (tubo, canudo, vibração de lábios) equilibram a pressão supraglótica e subglótica, promovendo fonação com máxima eficiência energética.',
    practicalAction: 'Dedique de 3 a 5 minutos ao exercício de vibração labial ou canudo antes de reuniões, aulas ou apresentações exigentes.',
    scientificSource: 'Titze, Ingo (2006) - Voice Training and Therapy with Semi-Occluded Vocal Tract',
    benefitTag: 'Equalização de impedância acústica',
    iconName: 'Wind'
  },
  {
    id: 4,
    title: 'Maçã: Propriedades Adstringentes e Ressonância',
    category: 'Nutrição & Salivação',
    summary: 'A pectina da maçã exerce efeito mecânico adstringente suave na mucosa da faringe, limpando o excesso de muco sem ressecar o epitélio glótico.',
    practicalAction: 'Consuma meia maçã 20 minutos antes de sessões de fala prolongada ou mastigue vagarosamente para estimular a musculatura da articulação temporomandibular.',
    scientificSource: 'Behlau, M. (2009) - Voz: O Livro do Especialista, Revinter',
    benefitTag: 'Limpeza de secreção e relaxamento mastigatório',
    iconName: 'Apple'
  },
  {
    id: 5,
    title: 'Refluxo Laringofaríngeo Silencioso (RLF)',
    category: 'Gastroenterologia & Laringe',
    summary: 'O ácido e a pepsina refluídos durante a noite inflamam a comissura posterior e o terço posterior das pregas vocais, gerando rouquidão matinal e pigarro crônico.',
    practicalAction: 'Faça sua última refeição pelo menos 2 horas e meia antes de dormir e evite deitar logo após consumir café, chocolate, molho de tomate ou hortelã.',
    scientificSource: 'Koufman, J. A. (1991) - The Otolaryngologic Manifestations of GERD / Belafsky et al. (2002)',
    benefitTag: 'Proteção da mucosa contra pepsina ácida',
    iconName: 'ShieldCheck'
  },
  {
    id: 6,
    title: 'Nebulização & Inalação com Soro Fisiológico 0.9%',
    category: 'Hidratação de Superfície',
    summary: 'Diferente da água bebida que vai para o estômago, o vapor frio de solução isotônica hidrata diretamente a superfície do epitélio mucociliar das pregas vocais.',
    practicalAction: 'Faça 5 a 10 minutos de inalação ultrassônica ou pneumática com soro fisiológico estéril antes ou após dias de alta demanda vocal.',
    scientificSource: 'Tanner, K. et al. (2010) - Journal of Speech, Language, and Hearing Research',
    benefitTag: 'Hidratação tópica instantânea da mucosa vocal',
    iconName: 'Droplets'
  },
  {
    id: 7,
    title: 'Micro-Repousos Vocais Estratégicos',
    category: 'Ergonomia Vocal',
    summary: 'As células musculares da laringe e os tecidos da lâmina própria necessitam de intervalos de silêncio para dissipar micro-edemas de colisão celular.',
    practicalAction: 'Para cada 45 minutos de fala contínua, guarde 5 a 10 minutos de silêncio vocal absoluto (sem sussurrar, pois sussurrar gera compressão medial excessiva).',
    scientificSource: 'Stemple, J. C. et al. (2010) - Clinical Voice Pathology: Theory and Management',
    benefitTag: 'Recuperação muscular e prevenção de estresse mecânico',
    iconName: 'Sparkles'
  }
];

export const DailyVocalTip: React.FC = () => {
  // Deterministic daily pick based on day of year, with option to cycle through
  const initialIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % EVIDENCE_BASED_TIPS.length;
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  const tip = EVIDENCE_BASED_TIPS[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % EVIDENCE_BASED_TIPS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + EVIDENCE_BASED_TIPS.length) % EVIDENCE_BASED_TIPS.length);
  };

  const getTipIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-sky-600" />;
      case 'Apple':
        return <Apple className="w-5 h-5 text-emerald-600" />;
      case 'Wind':
        return <Wind className="w-5 h-5 text-teal-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-indigo-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-indigo-50/40 rounded-3xl border border-teal-200/60 p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all">
      {/* Decorative background watermark */}
      <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left side: Badge & Title & Clinical insight */}
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Dica de Higiene Vocal do Dia</span>
            </span>

            <span className="text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-md">
              {tip.category}
            </span>

            <span className="text-xs font-medium text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>{tip.benefitTag}</span>
            </span>
          </div>

          <div className="flex items-start gap-3 pt-1">
            <div className="p-2.5 rounded-2xl bg-white shadow-xs border border-teal-100 shrink-0 mt-0.5">
              {getTipIcon(tip.iconName)}
            </div>

            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {tip.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {tip.summary}
              </p>
              <div className="pt-1.5 p-3 rounded-xl bg-white/90 border border-teal-100/90 text-xs text-slate-800 flex items-start gap-2 shadow-xs">
                <span className="font-bold text-teal-800 shrink-0">Ação prática recomendada:</span>
                <span className="text-slate-700 leading-normal">{tip.practicalAction}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 pl-12">
            <BookOpen className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="italic font-medium">Evidência Científica: {tip.scientificSource}</span>
          </div>
        </div>

        {/* Right side: Interactive navigation controls */}
        <div className="flex md:flex-col items-center justify-between md:justify-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-teal-100">
          <div className="text-[11px] font-bold text-slate-500 tabular-nums">
            {currentIndex + 1} de {EVIDENCE_BASED_TIPS.length}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-xs"
              title="Dica anterior"
              aria-label="Dica anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-xs"
              title="Próxima evidência científica"
              aria-label="Próxima evidência"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
