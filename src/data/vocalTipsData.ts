import { VocalTip, WeatherData, ProgressStats, ExerciseLog } from '../types';

export const ALL_VOCAL_TIPS: VocalTip[] = [
  // --- DICAS BASEADAS NO CLIMA (AR SECO) ---
  {
    id: 101,
    title: 'Ar Seco: Aumento da Pressão de Limiar de Fonação (PTP)',
    category: 'Alerta Climático · Ar Seco',
    summary: 'Em umidade inferior a 40%, a evaporação do biofilme que reveste as pregas vocais é acelerada, exigindo até 40% mais pressão subglótica para iniciar a fonação, gerando esforço precoce e aspereza.',
    practicalAction: 'Nebulize ou inale vapor de soro fisiológico 0.9% por 5 a 10 minutos. Aumente a ingestão de água para 2.500ml ao dia e coloque uma bacia de água ou toalha úmida no ambiente de trabalho/quarto.',
    scientificSource: 'Sivasankar, M. & Fisher, K. (2002) - Oral breathing with dry air increases phonation threshold pressure, Laryngoscope',
    benefitTag: 'Reduz pressão de atrito em dias de ar seco',
    iconName: 'Droplets',
    climateTrigger: 'dry',
    hydrationGoalBonusMl: 500
  },
  {
    id: 102,
    title: 'Ar-Condicionado: Desumidificação Forçada & Ressecamento',
    category: 'Ambiente & Ergonomia Vocal',
    summary: 'Aparelhos de ar-condicionado retiram a umidade do ar, derrubando-a para níveis críticos (20% a 25%). Isso espessa o muco laríngeo, provocando falsa sensação de pigarro.',
    practicalAction: 'Mantenha um copo de água na mesa e tome 2 pequenos goles a cada 20 minutos. Jamais pigarreie; engula a saliva com força ("deglutição com esforço") para limpar a laringe sem impacto tecidual.',
    scientificSource: 'Behlau, M. & Pontes, P. (1995) - Higiene Vocal para Profissionais da Voz, Revinter',
    benefitTag: 'Protege contra choque térmico e desidratação interna',
    iconName: 'Wind',
    climateTrigger: 'dry',
    hydrationGoalBonusMl: 400
  },

  // --- DICAS BASEADAS NO CLIMA (FRIO) ---
  {
    id: 103,
    title: 'Clima Frio: Vasoconstrição e Rigidez Muscular Cervical',
    category: 'Alerta Climático · Tempo Frio',
    summary: 'Baixas temperaturas causam contração reflexa da musculatura perilaríngea e elevação da laringe. Falar no frio sem aquecimento prévio predispõe a sobrecargas musculares e quebras de tom.',
    practicalAction: 'Faça 3 a 5 minutos de aquecimento com canudo ou vibração labial antes de sair ao ar livre. Beba líquidos em temperatura ambiente ou levemente mornos. Use um lenço ou cachecol leve no pescoço.',
    scientificSource: 'Titze, I. R. (2006) - Voice Training and Therapy with Semi-Occluded Vocal Tract, NCVS',
    benefitTag: 'Previne choque térmico e rigidez laríngea',
    iconName: 'ShieldCheck',
    climateTrigger: 'cold',
    hydrationGoalBonusMl: 250
  },

  // --- DICAS BASEADAS NO CLIMA (CALOR) ---
  {
    id: 104,
    title: 'Calor Elevado: Transpiração & Viscosidade Salivar',
    category: 'Alerta Climático · Calor Intenso',
    summary: 'Em dias de calor, a perda de líquidos e eletrólitos pelo suor diminui o volume intravascular, reduzindo a hidratação das camadas profundas da lâmina própria das pregas vocais.',
    practicalAction: 'Antecipe a sede: beba água antes de sentir a boca seca. Evite água com excesso de gelo imediatamente antes de apresentações ou aulas para não causar choque térmico e constrição súbita.',
    scientificSource: 'Verdolini-Abbott, K. et al. (1994; 2002) - Hydration and phonatory threshold pressure, Laryngoscope',
    benefitTag: 'Reposição hídrica sistêmica acelerada',
    iconName: 'Droplets',
    climateTrigger: 'hot',
    hydrationGoalBonusMl: 600
  },

  // --- DICAS BASEADAS NO CLIMA (ÚMIDO / AMENO) ---
  {
    id: 105,
    title: 'Clima Favorável: Janela Ótima para Exercícios de Extensão',
    category: 'Alerta Climático · Condição Ideal',
    summary: 'Com umidade relativa entre 50% e 70%, o muco das pregas vocais atinge sua viscosidade ideal de deslizamento, propiciando menor gasto energético durante a fonação.',
    practicalAction: 'Aproveite a condição climática amena para treinar exercícios de glissandos ascendentes e sirenes vocais, ampliando sua flexibilidade cricotireóidea com mínimo risco de atrito.',
    scientificSource: 'Sivasankar, M. et al. (2008) - Laryngeal hydration and acoustic perturbation measures',
    benefitTag: 'Janela propícia para exercícios de extensão',
    iconName: 'Sparkles',
    climateTrigger: 'moderate',
    hydrationGoalBonusMl: 200
  },

  // --- DICAS BASEADAS NA FREQUÊNCIA DE USO DO APP ---
  {
    id: 201,
    title: 'Alta Constância: Prevenção de Fadiga Acumulada',
    category: 'Frequência do Paciente · Sequência Ativa',
    summary: 'A prática frequente e disciplinada condiciona o aparelho fonador, mas a tensão muscular residual pode acumular-se se não houver um protocolo rigoroso de desaquecimento.',
    practicalAction: 'Finalize a rotina do dia com 2 minutos de som basal (vocal fry) ou bocejo-suspiro prolongado. Isso abaixa a laringe e desfaz hiperadutâncias antes do repouso noturno.',
    scientificSource: 'Stemple, J. C. (2010) - Vocal Function Exercises: Clinical Efficacy and Long-Term Retention',
    benefitTag: 'Descompressão muscular pós-treino contínuo',
    iconName: 'Flame',
    frequencyTrigger: 'high_streak'
  },
  {
    id: 202,
    title: 'Fadiga Pós-Uso Detectada: Repouso Relativo e Inalação',
    category: 'Frequência do Paciente · Recuperação Muscular',
    summary: 'Identificamos relato de esforço ou cansaço muscular recente. As células do epitélio vocal necessitam de intervalos de silêncio para dissipar mediadores inflamatórios de microtrauma.',
    practicalAction: 'Pratique 10 a 15 minutos de silêncio vocal absoluto. Não sussurre (sussurrar gera compressão anterior excessiva). Tome 1 copo d’água morna e faça inalação com soro isotônico.',
    scientificSource: 'Colton, R. & Casper, J. (2006) - Understanding Voice Problems: Vocal Fatigue and Recovery Cycles',
    benefitTag: 'Regeneração celular e relaxamento glótico',
    iconName: 'HeartPulse',
    frequencyTrigger: 'fatigued'
  },
  {
    id: 203,
    title: 'Início Gradual: Princípio da Sobrecarga Progressiva',
    category: 'Frequência do Paciente · Construção de Hábito',
    summary: 'Ao iniciar a terapia vocal, a musculatura laríngea responde muito melhor a estímulos diários curtos (10 a 15 minutos) do que a longas sessões espaçadas que provocam estresse tecidual.',
    practicalAction: 'Mantenha a meta de 15 minutos ao dia. Se sentir que a voz pesou, divida em duas sessões de 7 minutos (manhã e tarde) para que a laringe assimile o movimento sem cansaço.',
    scientificSource: 'Behlau, M. (2009) - Princípios da Aprendizagem Motora em Terapia de Voz, Revinter',
    benefitTag: 'Formação consistente de memória muscular',
    iconName: 'Sparkles',
    frequencyTrigger: 'low_frequency'
  },
  {
    id: 204,
    title: 'Exercício de Hoje Concluído: Hidratação e Consolidação',
    category: 'Frequência do Paciente · Meta Batida',
    summary: 'Você já praticou seus exercícios prescritos hoje! A consolidação do novo padrão neuromuscular e o remodelamento tecidual ocorrem durante o sono e o repouso noturno.',
    practicalAction: 'Evite alimentos pesados ou café nas 3 horas anteriores ao sono para impedir que refluxo ácido atinja a comissura posterior das pregas vocais durante a noite.',
    scientificSource: 'Koufman, J. A. (1991) - The Otolaryngologic Manifestations of Gastroesophageal Reflux Disease',
    benefitTag: 'Proteção contra refluxo e repouso celular',
    iconName: 'CheckCircle2',
    frequencyTrigger: 'moderate'
  },

  // --- DICAS CLÍNICAS GERAIS DE HIGIENE E BIOMECÂNICA ---
  {
    id: 1,
    title: 'Hidratação Sistêmica & Viscosidade do Muco',
    category: 'Hidratação & Biomecânica',
    summary: 'A hidratação adequada reduz a Pressão de Limiar de Fonação (PTP), diminuindo o esforço mecânico necessário para fazer as pregas vocais vibrarem suavemente.',
    practicalAction: 'Beba água em temperatura ambiente em pequenos goles frequentes (150-200ml a cada hora). Evite beber grandes volumes de uma só vez para não sobrecarregar a bexiga sem absorção celular.',
    scientificSource: 'Verdolini-Abbott, K. et al. (1994; 2002) - Laryngoscope / Sivasankar & Fisher (2002)',
    benefitTag: 'Reduz fadiga e atrito em até 35%',
    iconName: 'Droplets',
    climateTrigger: 'general',
    frequencyTrigger: 'general',
    hydrationGoalBonusMl: 300
  },
  {
    id: 2,
    title: 'O Perigo do Pigarro & Choque Mecânico',
    category: 'Comportamento Vocal',
    summary: 'Pigarrear provoca uma colisão violenta e hiperadutora entre as bordas livres das pregas vocais, perpetuando edema e hiperemia tecidual.',
    practicalAction: 'Ao sentir vontade de pigarrear, substitua pelo "método da deglutição com esforço": beba um gole de água ou engula a saliva forçando o fechamento sem emitir som.',
    scientificSource: 'Behlau, M. & Pontes, P. (1995) - Higiene Vocal para Profissionais da Voz',
    benefitTag: 'Previne nódulos e lesões fonotraumáticas',
    iconName: 'ShieldCheck',
    climateTrigger: 'general',
    frequencyTrigger: 'general'
  },
  {
    id: 3,
    title: 'Aquecimento Vocal & Trato Semiocluído (SOVTE)',
    category: 'Fisiologia do Exercício',
    summary: 'Exercícios com resistência anterior (tubo, canudo, vibração de lábios) equilibram a pressão supraglótica e subglótica, promovendo fonação com máxima eficiência energética.',
    practicalAction: 'Dedique de 3 a 5 minutos ao exercício de vibração labial ou canudo antes de reuniões, aulas ou apresentações exigentes.',
    scientificSource: 'Titze, Ingo (2006) - Voice Training and Therapy with Semi-Occluded Vocal Tract',
    benefitTag: 'Equalização de impedância acústica',
    iconName: 'Wind',
    climateTrigger: 'general',
    frequencyTrigger: 'general'
  },
  {
    id: 4,
    title: 'Maçã: Propriedades Adstringentes e Ressonância',
    category: 'Nutrição & Salivação',
    summary: 'A pectina da maçã exerce efeito mecânico adstringente suave na mucosa da faringe, limpando o excesso de muco sem ressecar o epitélio glótico.',
    practicalAction: 'Consuma meia maçã 20 minutos antes de sessões de fala prolongada ou mastigue vagarosamente para estimular a musculatura da articulação temporomandibular.',
    scientificSource: 'Behlau, M. (2009) - Voz: O Livro do Especialista, Revinter',
    benefitTag: 'Limpeza de secreção e relaxamento mastigatório',
    iconName: 'Apple',
    climateTrigger: 'general',
    frequencyTrigger: 'general'
  },
  {
    id: 5,
    title: 'Refluxo Laringofaríngeo Silencioso (RLF)',
    category: 'Gastroenterologia & Laringe',
    summary: 'O ácido e a pepsina refluídos durante a noite inflamam a comissura posterior e o terço posterior das pregas vocais, gerando rouquidão matinal e pigarro crônico.',
    practicalAction: 'Faça sua última refeição pelo menos 2 horas e meia antes de dormir e evite deitar logo após consumir café, chocolate, molho de tomate ou hortelã.',
    scientificSource: 'Koufman, J. A. (1991) - The Otolaryngologic Manifestations of GERD / Belafsky et al. (2002)',
    benefitTag: 'Proteção da mucosa contra pepsina ácida',
    iconName: 'ShieldCheck',
    climateTrigger: 'general',
    frequencyTrigger: 'general'
  },
  {
    id: 6,
    title: 'Nebulização & Inalação com Soro Fisiológico 0.9%',
    category: 'Hidratação de Superfície',
    summary: 'Diferente da água bebida que vai para o estômago, o vapor frio de solução isotônica hidrata diretamente a superfície do epitélio mucociliar das pregas vocais.',
    practicalAction: 'Faça 5 a 10 minutos de inalação com soro fisiológico estéril antes ou após dias de alta demanda vocal ou exposição prolongada ao ar-condicionado.',
    scientificSource: 'Tanner, K. et al. (2010) - Journal of Speech, Language, and Hearing Research',
    benefitTag: 'Hidratação tópica instantânea da mucosa vocal',
    iconName: 'Droplets',
    climateTrigger: 'general',
    frequencyTrigger: 'general'
  },
  {
    id: 7,
    title: 'Micro-Repousos Vocais Estratégicos',
    category: 'Ergonomia Vocal',
    summary: 'As células musculares da laringe e os tecidos da lâmina própria necessitam de intervalos de silêncio para dissipar micro-edemas de colisão celular.',
    practicalAction: 'Para cada 45 minutos de fala contínua, guarde 5 a 10 minutos de silêncio vocal absoluto (sem sussurrar, pois sussurrar gera compressão medial excessiva).',
    scientificSource: 'Stemple, J. C. et al. (2010) - Clinical Voice Pathology: Theory and Management',
    benefitTag: 'Recuperação muscular e prevenção de estresse mecânico',
    iconName: 'Sparkles',
    climateTrigger: 'general',
    frequencyTrigger: 'general'
  }
];

export function selectContextualTip(
  rawWeather?: WeatherData | null,
  stats?: ProgressStats | null,
  rawLogs?: ExerciseLog[] | null,
  preferredMode: 'climate' | 'frequency' | 'all' = 'climate'
): { tip: VocalTip; reasonBadge: string; reasonDetail: string } {
  const weather = rawWeather || {
    city: 'São Paulo (Referência)',
    temperature: 24,
    relativeHumidity: 48,
    condition: 'moderate' as const,
    conditionLabel: 'Condição Apoiada'
  };
  const logs = Array.isArray(rawLogs) ? rawLogs : [];
  const streak = stats?.streak_days || 0;
  const recentLog = logs.length > 0 ? logs[0] : null;
  const hasHighFatigue = Boolean(recentLog && ((recentLog.fatigue_after || 0) >= 4 || (recentLog.fatigue_before || 0) >= 6));
  const cityName = String(weather.city || 'Sua Região');
  const temp = Number(weather.temperature ?? 24);
  const humidity = Number(weather.relativeHumidity ?? 48);

  // 1. Se modo preferido for Frequência
  if (preferredMode === 'frequency') {
    if (hasHighFatigue && recentLog) {
      const tip = ALL_VOCAL_TIPS.find((t) => t.id === 202) || ALL_VOCAL_TIPS[0];
      return {
        tip,
        reasonBadge: 'Baseado na Fadiga Recente',
        reasonDetail: `Último registro indicou fadiga nível ${recentLog.fatigue_after}/10. Foco em repouso e hidratação.`
      };
    }
    if (streak >= 3) {
      const tip = ALL_VOCAL_TIPS.find((t) => t.id === 201) || ALL_VOCAL_TIPS[0];
      return {
        tip,
        reasonBadge: `Baseado na sua Sequência de ${streak} Dias`,
        reasonDetail: `Excelente assiduidade! Dica de descompressão para prevenir sobrecarga muscular contínua.`
      };
    }
    if (streak <= 1 && logs.length <= 3) {
      const tip = ALL_VOCAL_TIPS.find((t) => t.id === 203) || ALL_VOCAL_TIPS[0];
      return {
        tip,
        reasonBadge: 'Baseado no seu Ritmo Inicial',
        reasonDetail: 'Você está no início da rotina. Sessões curtas diárias consolidam a memória muscular.'
      };
    }
    const tip = ALL_VOCAL_TIPS.find((t) => t.id === 204) || ALL_VOCAL_TIPS[0];
    return {
      tip,
      reasonBadge: 'Baseado no Treino de Hoje',
      reasonDetail: 'Treino ativo registrado no banco SQLite. Foco em hidratação e sono reparador.'
    };
  }

  // 2. Se modo for Clima
  if (weather.condition === 'dry' || humidity < 40) {
    const tip = ALL_VOCAL_TIPS.find((t) => t.id === 101) || ALL_VOCAL_TIPS[0];
    return {
      tip,
      reasonBadge: `Alerta Climático: Ar Seco (${humidity}% UR)`,
      reasonDetail: `Na região de ${cityName}, a umidade está baixa. Risco aumentado de viscosidade do muco.`
    };
  }

  if (weather.condition === 'cold' || temp < 18) {
    const tip = ALL_VOCAL_TIPS.find((t) => t.id === 103) || ALL_VOCAL_TIPS[0];
    return {
      tip,
      reasonBadge: `Alerta Climático: Tempo Frio (${temp}°C)`,
      reasonDetail: `Temperatura baixa em ${cityName}. Músculos laríngeos exigem aquecimento térmico prévio.`
    };
  }

  if (weather.condition === 'hot' || temp >= 29) {
    const tip = ALL_VOCAL_TIPS.find((t) => t.id === 104) || ALL_VOCAL_TIPS[0];
    return {
      tip,
      reasonBadge: `Alerta Climático: Calor Elevado (${temp}°C)`,
      reasonDetail: `Altas temperaturas em ${cityName}. Reposição hídrica deve ser intensificada.`
    };
  }

  // Clima ameno/ideal
  const tip = ALL_VOCAL_TIPS.find((t) => t.id === 105) || ALL_VOCAL_TIPS[0];
  return {
    tip,
    reasonBadge: `Clima Favorável em ${cityName} (${temp}°C · ${humidity}% UR)`,
    reasonDetail: 'Umidade e temperatura adequadas para a biomecânica das pregas vocais.'
  };
}
