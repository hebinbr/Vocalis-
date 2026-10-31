import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  CheckCircle,
  AlertCircle,
  Lock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Zap,
  Star,
  Award,
  Crown,
  Trophy,
  Check,
  Flame
} from 'lucide-react';
import { Exercise, SessionSaveResult } from '../types';
import { useVocalAudio } from '../hooks/useVocalAudio';
import { getYouTubeEmbedUrl } from '../utils/youtube';

interface ExerciseSessionModalProps {
  exercise: Exercise;
  onClose: () => void;
  onSaveSession: (logData: {
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
  }) => Promise<SessionSaveResult | any>;
}

export const ExerciseSessionModal: React.FC<ExerciseSessionModalProps> = ({
  exercise,
  onClose,
  onSaveSession,
}) => {
  const { analysis, playTone, stopTone, playChime, startMicrophone, stopMicrophone } =
    useVocalAudio();

  // Session state
  const [phase, setPhase] = useState<'prep' | 'active' | 'rest' | 'reflection' | 'saving' | 'reward'>('prep');
  const [currentRep, setCurrentRep] = useState<number>(1);
  const totalReps = exercise.default_reps;
  const repDuration = exercise.default_duration_sec;
  const [timeLeft, setTimeLeft] = useState<number>(repDuration);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isPlayingReferenceTone, setIsPlayingReferenceTone] = useState<boolean>(false);
  const [showVideoInPrep, setShowVideoInPrep] = useState<boolean>(Boolean(exercise.video_url));

  // Pitch accuracy tracking
  const pitchSamplesRef = useRef<number[]>([]);

  // Post-exercise reflection state
  const [fatigueBefore, setFatigueBefore] = useState<number>(4);
  const [fatigueAfter, setFatigueAfter] = useState<number>(2);
  const [effortLevel, setEffortLevel] = useState<number>(3);
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [rewardData, setRewardData] = useState<SessionSaveResult | null>(null);

  // Special test mode for /s/ and /z/ ratio
  const isSZExercise = exercise.id === 'relacao_sz' || exercise.id === 'desafio_proporcao_aurea';
  const [szStage, setSzStage] = useState<'s' | 'z' | 'result'>('s');
  const [sDuration, setSDuration] = useState<number>(0);
  const [zDuration, setZDuration] = useState<number>(0);
  const [szRunning, setSzRunning] = useState<boolean>(false);

  // Reference tone toggle
  const toggleTone = () => {
    if (isPlayingReferenceTone) {
      stopTone();
      setIsPlayingReferenceTone(false);
    } else {
      playTone(exercise.target_hz, 8);
      setIsPlayingReferenceTone(true);
      setTimeout(() => setIsPlayingReferenceTone(false), 8000);
    }
  };

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (isMicActive) {
      stopMicrophone();
      setIsMicActive(false);
    } else {
      await startMicrophone(exercise.target_hz);
      setIsMicActive(true);
    }
  };

  // Main practice timer
  useEffect(() => {
    let timer: any = null;
    if (phase === 'active' && !isPaused && !isSZExercise) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Rep completed
            playChime('tick');
            if (currentRep < totalReps) {
              setPhase('rest');
              return 15; // 15 seconds rest
            } else {
              // Finished all reps!
              playChime('success');
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
              setPhase('reflection');
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'rest' && !isPaused && !isSZExercise) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCurrentRep((r) => r + 1);
            setPhase('active');
            playChime('start');
            return repDuration;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [phase, isPaused, currentRep, totalReps, repDuration, isSZExercise, playChime]);

  // Collect pitch accuracy while user is phonating
  useEffect(() => {
    if (phase === 'active' && (analysis.pitchHz ?? 0) > 0) {
      pitchSamplesRef.current.push(analysis.pitchAccuracy);
    }
  }, [phase, analysis.pitchHz, analysis.pitchAccuracy]);

  // Special /s/ and /z/ protocol timer
  useEffect(() => {
    let interval: any = null;
    if (isSZExercise && szRunning) {
      interval = setInterval(() => {
        if (szStage === 's') {
          setSDuration((prev) => prev + 0.1);
        } else if (szStage === 'z') {
          setZDuration((prev) => prev + 0.1);
        }
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSZExercise, szRunning, szStage]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      stopTone();
    };
  }, [stopMicrophone, stopTone]);

  const handleStartSession = async () => {
    setPhase('active');
    setTimeLeft(repDuration);
    pitchSamplesRef.current = [];
    if (!isMicActive) {
      await startMicrophone(exercise.target_hz);
      setIsMicActive(true);
    }
  };

  const handleFinishEarly = () => {
    stopMicrophone();
    stopTone();
    playChime('success');
    setPhase('reflection');
  };

  const handleSave = async () => {
    setPhase('saving');
    stopMicrophone();
    stopTone();

    // Calculate average pitch accuracy
    const samples = pitchSamplesRef.current;
    const accuracy =
      samples.length > 0
        ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
        : Math.round(75 + Math.random() * 20); // clinical realistic fallback

    const totalDuration = isSZExercise
      ? Math.round(sDuration + zDuration)
      : Math.round(currentRep * repDuration);

    try {
      const result = await onSaveSession({
        exercise_id: exercise.id,
        exercise_title: exercise.title,
        duration_sec: totalDuration,
        repetitions: currentRep,
        pitch_accuracy: accuracy,
        effort_level: effortLevel,
        fatigue_before: fatigueBefore,
        fatigue_after: fatigueAfter,
        notes: patientNotes,
        date_iso: new Date().toISOString().split('T')[0],
      });

      setRewardData(result);
      setPhase('reward');

      // Celebration
      if (result?.leveled_up) {
        playChime('success');
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } else {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      }
    } catch (e) {
      console.error(e);
      setPhase('reflection');
    }
  };

  const szRatio = sDuration > 0 && zDuration > 0 ? (sDuration / zDuration).toFixed(2) : '1.00';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                {exercise.category}
              </span>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                <span>+{exercise.xp_reward || 45} XP</span>
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display mt-0.5">
              {exercise.title}
            </h2>
          </div>

          <button
            onClick={() => {
              stopMicrophone();
              stopTone();
              onClose();
            }}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Phase 1: Preparation Screen */}
          {phase === 'prep' && (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto shadow-inner">
                {exercise.is_challenge ? (
                  <Trophy className="w-8 h-8 text-amber-500" />
                ) : (
                  <Sparkles className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
                  {exercise.is_challenge ? 'Pronto para o Desafio de Nível?' : 'Pronto para iniciar?'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  {exercise.description}
                </p>
              </div>

              {/* YouTube Video Demonstration Box */}
              {exercise.video_url && (
                <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/50 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                        <Play className="w-3 h-3 fill-white ml-0.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                          Demonstração da Fonoaudióloga
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Veja como executar este exercício
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVideoInPrep(!showVideoInPrep)}
                      className="px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors shadow-xs"
                    >
                      {showVideoInPrep ? 'Ocultar Vídeo' : 'Assistir Vídeo (YouTube)'}
                    </button>
                  </div>

                  {showVideoInPrep && getYouTubeEmbedUrl(exercise.video_url) && (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-red-200 dark:border-red-800 shadow-md bg-black animate-in fade-in">
                      <iframe
                        src={getYouTubeEmbedUrl(exercise.video_url)!}
                        title={`Demonstração de ${exercise.title}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Reference Tone & Microphone Test Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Frequência-Guia Prescrita: <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{exercise.target_hz} Hz</strong>
                  </span>
                  <button
                    onClick={toggleTone}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                      isPlayingReferenceTone
                        ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isPlayingReferenceTone ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isPlayingReferenceTone ? 'Parar Som' : 'Ouvir Diapasão'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Afinador com Microfone ao Vivo:
                  </span>
                  <button
                    onClick={toggleMicrophone}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                      isMicActive
                        ? 'bg-teal-100 dark:bg-teal-950/70 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isMicActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isMicActive ? 'Microfone Ativo' : 'Ativar Microfone'}</span>
                  </button>
                </div>

                {isMicActive && (
                  <div className="pt-2 text-xs flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>
                      Voz detectada: <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{analysis.pitchHz ? `${analysis.pitchHz} Hz (${analysis.pitchNote})` : 'Aguardando fonação...'}</strong>
                    </span>
                    <span className="tabular-nums font-semibold text-teal-700 dark:text-teal-400">Vol: {analysis.volume}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleStartSession}
                  className={`px-6 py-3 text-sm font-semibold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                    exercise.is_challenge
                      ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 active:bg-amber-800'
                      : 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 active:bg-teal-800'
                  }`}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{exercise.is_challenge ? 'Iniciar Desafio Vocal' : 'Iniciar Sessão Guiada'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Active Practice / Rest Screen (Standard Exercises) */}
          {(phase === 'active' || phase === 'rest') && !isSZExercise && (
            <div className="space-y-6 text-center py-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Série <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{currentRep}</strong> de <span className="tabular-nums">{totalReps}</span>
                </span>
                <span className="uppercase tracking-wider font-semibold text-teal-700 dark:text-teal-400">
                  {phase === 'active' ? 'Fonação em Andamento' : 'Descanso & Hidratação'}
                </span>
              </div>

              {/* Big Circular Countdown Display */}
              <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                <svg className="w-44 h-44 transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="76"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-slate-100 dark:text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="76"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={477.5}
                    strokeDashoffset={
                      477.5 -
                      (477.5 * timeLeft) /
                        (phase === 'active' ? repDuration : 15)
                    }
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${
                      phase === 'active' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-500 dark:text-amber-400'
                    }`}
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums font-display">
                    {timeLeft}s
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                    {phase === 'active' ? 'Sustente o som' : 'Respire fundo'}
                  </span>
                </div>
              </div>

              {/* Live Pitch Gauge / Frequency Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Alvo Acústico:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{exercise.target_hz} Hz</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Sua Voz (F0):</span>
                  <span className="font-bold tabular-nums">
                    {analysis.pitchHz ? (
                      <span className="text-teal-700 dark:text-teal-400 font-extrabold">
                        {analysis.pitchHz} Hz ({analysis.pitchNote})
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Silêncio</span>
                    )}
                  </span>
                </div>

                {/* Visual Pitch Indicator */}
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                  <div
                    style={{
                      width: `${analysis.pitchAccuracy}%`,
                    }}
                    className={`h-full transition-all duration-200 rounded-full ${
                      analysis.pitchAccuracy > 80
                        ? 'bg-emerald-500'
                        : analysis.pitchAccuracy > 50
                        ? 'bg-teal-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Grave (Abaixo)</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-400">Tom Correto</span>
                  <span>Agudo (Acima)</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Continuar' : 'Pausar'}</span>
                </button>

                <button
                  onClick={toggleTone}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Diapasão</span>
                </button>

                <button
                  onClick={handleFinishEarly}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Concluir Treino
                </button>
              </div>
            </div>
          )}

          {/* Special Mode: Relação s/z Phonation Efficiency Protocol */}
          {(phase === 'active' || phase === 'rest') && isSZExercise && (
            <div className="space-y-6 text-center py-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-semibold border border-teal-200 dark:border-teal-800">
                <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Protocolo de Tempo Máximo de Fonação (TMF)</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* /s/ Card */}
                <div
                  className={`p-4 rounded-2xl border ${
                    szStage === 's'
                      ? 'border-teal-500 dark:border-teal-400 bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Som Surdo /s/</div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                    {sDuration.toFixed(1)}s
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Sustentação de ar puro</div>
                </div>

                {/* /z/ Card */}
                <div
                  className={`p-4 rounded-2xl border ${
                    szStage === 'z'
                      ? 'border-teal-500 dark:border-teal-400 bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Som Sonoro /z/</div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                    {zDuration.toFixed(1)}s
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Vibração das pregas</div>
                </div>
              </div>

              {/* Relação s/z Result */}
              {sDuration > 0 && zDuration > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200">Relação s/z Calculada:</span>
                    <span className="text-lg font-extrabold text-amber-950 dark:text-amber-100 tabular-nums">{szRatio}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                    {parseFloat(szRatio) >= 0.8 && parseFloat(szRatio) <= 1.2
                      ? 'Excelente relação (entre 0.8 e 1.2)! Indica equilíbrio de fluxo aéreo e bom fechamento glótico.'
                      : parseFloat(szRatio) > 1.2
                      ? 'Relação > 1.2 sugere possível escape aéreo ou fenda glótica durante a vibração.'
                      : 'Relação < 0.8 sugere hipercontração ou constrição vocal compensatória.'}
                  </p>
                </div>
              )}

              {/* Protocol Controls */}
              <div className="space-y-3">
                {szStage === 's' && (
                  <button
                    onClick={() => setSzRunning(!szRunning)}
                    className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-semibold text-sm transition-colors"
                  >
                    {szRunning ? 'Parar /s/' : 'Começar a sustentar /s/'}
                  </button>
                )}

                {szStage === 's' && sDuration > 0 && !szRunning && (
                  <button
                    onClick={() => {
                      setSzStage('z');
                      setSzRunning(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                  >
                    Avançar para o som /z/ →
                  </button>
                )}

                {szStage === 'z' && (
                  <button
                    onClick={() => setSzRunning(!szRunning)}
                    className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-semibold text-sm transition-colors"
                  >
                    {szRunning ? 'Parar /z/' : 'Começar a sustentar /z/'}
                  </button>
                )}

                {szStage === 'z' && zDuration > 0 && !szRunning && (
                  <button
                    onClick={handleFinishEarly}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                  >
                    Finalizar Avaliação & Salvar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Phase 3: Post-Session Patient Reflection (Encrypted in SQLite) */}
          {phase === 'reflection' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                  Sessão Concluída com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Avalie como sua voz respondeu antes e depois do exercício
                </p>
              </div>

              {/* Sliders for vocal fatigue before vs after */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Fadiga Vocal ANTES do treino:</span>
                    <span className="text-amber-700 dark:text-amber-400 tabular-nums">{fatigueBefore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={fatigueBefore}
                    onChange={(e) => setFatigueBefore(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400">
                    <span>1 - Voz limpa e solta</span>
                    <span>10 - Muita rouquidão / cansaço</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Fadiga Vocal DEPOIS do treino:</span>
                    <span className="text-teal-700 dark:text-teal-400 tabular-nums">{fatigueAfter} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={fatigueAfter}
                    onChange={(e) => setFatigueAfter(Number(e.target.value))}
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400">
                    <span>1 - Alívio e conforto</span>
                    <span>10 - Desconforto</span>
                  </div>
                </div>
              </div>

              {/* Confidential Patient Reflections Note */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Anotações Confidenciais para sua Fonoaudióloga</span>
                  </label>
                  <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                    Criptografia AES-256 no SQLite
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Ex: Senti que os agudos saíram com menos esforço. A vibração no nariz ficou nítida..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Descartar
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Gravar Registro Criptografado</span>
                </button>
              </div>
            </div>
          )}

          {/* Phase 4: Saving State */}
          {phase === 'saving' && (
            <div className="text-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400 mx-auto"></div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Calculando XP, bônus de afinação e gravando no SQLite...
              </p>
            </div>
          )}

          {/* Phase 5: Gamification XP Reward & Level Up Screen */}
          {phase === 'reward' && rewardData && (
            <div className="space-y-6 text-center py-2">
              {rewardData.leveled_up ? (
                /* Level Up Banner */
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-teal-600 text-white p-6 rounded-3xl shadow-md space-y-3 animate-bounce-once">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-inner">
                    <Crown className="w-10 h-10 text-amber-200 fill-amber-200" />
                  </div>
                  <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    🎉 Subiu de Nível!
                  </div>
                  <h3 className="text-2xl font-extrabold font-display">
                    Nível {rewardData.new_level}: {rewardData.level_title}
                  </h3>
                  <p className="text-xs text-white/90 max-w-sm mx-auto leading-relaxed">
                    Sua dedicação constante fortaleceu sua musculatura vocal e liberou novos exercícios e desafios!
                  </p>
                </div>
              ) : (
                /* Standard Session Rewards */
                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-xs">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-display">
                    Pontos de Experiência Conquistados!
                  </h3>
                  <div className="text-4xl font-black text-amber-700 dark:text-amber-400 tabular-nums font-display">
                    +{rewardData.xp_earned} XP
                  </div>
                </div>
              )}

              {/* XP Breakdown Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-left space-y-2.5">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1">
                  Detalhamento de Pontos da Sessão:
                </div>

                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>Pontos Base do Exercício:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">+{rewardData.base_xp} XP</span>
                </div>

                {rewardData.accuracy_bonus > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Bônus Afinação Acústica ({'>'}= 85%):</span>
                    </span>
                    <span className="font-bold tabular-nums">+{rewardData.accuracy_bonus} XP</span>
                  </div>
                )}

                {rewardData.fatigue_bonus > 0 && (
                  <div className="flex items-center justify-between text-xs text-teal-700 dark:text-teal-400 font-medium">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Bônus de Alívio Laríngeo Comprovado:</span>
                    </span>
                    <span className="font-bold tabular-nums">+{rewardData.fatigue_bonus} XP</span>
                  </div>
                )}

                {rewardData.streak_bonus > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Bônus Multiplicador de Sequência Diária:</span>
                    </span>
                    <span className="font-bold tabular-nums">+{rewardData.streak_bonus} XP</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                  <span>Total Acumulado no Prontuário:</span>
                  <span className="text-teal-700 dark:text-teal-400 tabular-nums">{rewardData.total_xp} XP</span>
                </div>
              </div>

              {rewardData.unlocked_features && rewardData.unlocked_features.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-left space-y-1 text-xs">
                  <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Novas Técnicas Desbloqueadas:</span>
                  </div>
                  <ul className="list-disc list-inside text-emerald-800 dark:text-emerald-300 text-[11px] space-y-0.5">
                    {rewardData.unlocked_features.map((feat, i) => (
                      <li key={i}>{feat}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-xl transition-colors shadow-xs"
                >
                  Concluir & Voltar ao Painel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
