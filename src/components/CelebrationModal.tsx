import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Sparkles, Star, Flame, CheckCircle2, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface CelebrationData {
  type: 'level' | 'badge';
  title: string;
  subtitle: string;
  description: string;
  icon?: string;
  levelNumber?: number;
  xpBonus?: number;
}

interface CelebrationModalProps {
  data: CelebrationData | null;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ data, onClose }) => {
  useEffect(() => {
    if (!data) return;

    // Trigger colorful confetti celebration
    try {
      const end = Date.now() + 1500;
      const colors = ['#0d9488', '#14b8a6', '#f59e0b', '#fbbf24', '#6366f1'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Play soft harmonic audio fanfare using Web Audio API
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.55);
        });
      }
    } catch {
      // Audio or confetti fallback gracefully ignored
    }
  }, [data]);

  if (!data) return null;

  const isLevel = data.type === 'level';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className="relative max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center overflow-hidden z-10"
        >
          {/* Background Ambient Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none ${
              isLevel ? 'bg-amber-400' : 'bg-teal-400'
            }`}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors z-20"
            aria-label="Fechar celebração"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Badge / Level Trophy with Framer Motion */}
          <div className="relative my-4 flex justify-center">
            {/* Spinning decorative aura rays */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className={`w-36 h-36 rounded-full border-2 border-dashed ${
                  isLevel ? 'border-amber-300' : 'border-teal-300'
                } opacity-50`}
              />
            </motion.div>

            {/* Glowing Icon Hub */}
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', damping: 14, stiffness: 200 }}
              className={`relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg ${
                isLevel
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-500/30 ring-8 ring-amber-100'
                  : 'bg-gradient-to-tr from-teal-600 to-emerald-400 text-white shadow-teal-500/30 ring-8 ring-teal-100'
              }`}
            >
              {isLevel ? (
                <div className="flex flex-col items-center">
                  <Trophy className="w-10 h-10 drop-shadow-sm" />
                  <span className="text-xs font-black tracking-wider uppercase mt-0.5">
                    Nv. {data.levelNumber || 'Up'}
                  </span>
                </div>
              ) : (
                <Award className="w-12 h-12 drop-shadow-sm" />
              )}

              {/* Floating Stars */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-md"
              >
                <Sparkles className="w-4 h-4 fill-amber-300" />
              </motion.div>
            </motion.div>
          </div>

          {/* Header pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2"
            style={{
              backgroundColor: isLevel ? '#fef3c7' : '#ccfbf1',
              color: isLevel ? '#92400e' : '#115e59',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLevel ? 'Evolução de Nível Vocal' : 'Novo Distintivo Desbloqueado'}</span>
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-2xl font-black text-slate-900 tracking-tight"
          >
            {data.title}
          </motion.h3>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-sm font-semibold text-teal-700 mt-1"
          >
            {data.subtitle}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-xs text-slate-600 mt-3 leading-relaxed px-2"
          >
            {data.description}
          </motion.p>

          {/* Reward highlight */}
          {data.xpBonus && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="mt-4 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>+{data.xpBonus} Pontos de Experiência (XP) Computados</span>
            </motion.div>
          )}

          {/* Action button */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-6 pt-2"
          >
            <button
              onClick={onClose}
              className={`w-full py-3 px-6 rounded-xl font-bold text-sm shadow-md transition-all transform active:scale-95 text-white ${
                isLevel
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/25'
              }`}
            >
              Continuar Praticando
            </button>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
