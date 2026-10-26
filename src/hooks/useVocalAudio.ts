import { useState, useRef, useEffect, useCallback } from 'react';

export interface VocalAnalysis {
  isListening: boolean;
  volume: number; // 0 - 100
  pitchHz: number | null;
  pitchNote: string | null;
  pitchAccuracy: number; // 0 - 100
  pitchDeviation: 'match' | 'low' | 'high' | 'idle';
  error: string | null;
}

// Map frequency to musical note name (e.g. 220Hz -> A3 / Lá3)
const NOTE_STRINGS = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];

function hzToNote(freq: number): string {
  const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
  const rounded = Math.round(noteNum) + 69;
  const noteIndex = rounded % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_STRINGS[noteIndex]}${octave}`;
}

// Autocorrelation algorithm for human vocal fundamental frequency (F0)
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // If signal is too quiet (< 0.015), treat as silence
  if (rms < 0.015) return -1;

  // Trim quiet ends
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const bufTrimmed = buf.subarray(r1, r2);
  const trimmedSize = bufTrimmed.length;

  const c = new Float32Array(trimmedSize);
  for (let i = 0; i < trimmedSize; i++) {
    for (let j = 0; j < trimmedSize - i; j++) {
      c[i] = c[i] + bufTrimmed[j] * bufTrimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmedSize; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  // Parabolic interpolation for fine frequency resolution
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

export function useVocalAudio() {
  const [analysis, setAnalysis] = useState<VocalAnalysis>({
    isListening: false,
    volume: 0,
    pitchHz: null,
    pitchNote: null,
    pitchAccuracy: 0,
    pitchDeviation: 'idle',
    error: null,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeToneOscRef = useRef<OscillatorNode | null>(null);
  const targetHzRef = useRef<number>(220);

  // Initialize or resume AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Soft clinical tone generator (e.g. Diapasão vocal / guia de frequência)
  const playTone = useCallback((frequency: number, durationSec: number = 3) => {
    try {
      const ctx = getAudioContext();
      if (activeToneOscRef.current) {
        activeToneOscRef.current.stop();
        activeToneOscRef.current.disconnect();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Smooth attack and release envelope to prevent clicking
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationSec);
      activeToneOscRef.current = osc;
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }, [getAudioContext]);

  const stopTone = useCallback(() => {
    if (activeToneOscRef.current) {
      try {
        activeToneOscRef.current.stop();
        activeToneOscRef.current.disconnect();
      } catch (_) {}
      activeToneOscRef.current = null;
    }
  }, []);

  // Chimes for exercises and reminders
  const playChime = useCallback((type: 'success' | 'alert' | 'start' | 'tick') => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // Double uplifting tone: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        osc.frequency.setValueAtTime(783.99, now + 0.24);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'alert') {
        // Friendly gentle chime for daily reminders
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.2); // A5
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      } else {
        // Gentle tick
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (e) {
      console.warn('Chime error:', e);
    }
  }, [getAudioContext]);

  // Start real-time microphone analysis
  const startMicrophone = useCallback(async (targetHz: number = 220) => {
    targetHzRef.current = targetHz;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);

      const updatePitch = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);

        // Calculate RMS volume
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        const volumeScore = Math.min(Math.round(rms * 400), 100);

        const pitch = autoCorrelate(buffer, ctx.sampleRate);

        if (pitch > 65 && pitch < 700) {
          const note = hzToNote(pitch);
          const target = targetHzRef.current;
          const diff = Math.abs(pitch - target);
          const tolerance = Math.max(target * 0.15, 20); // 15% pitch window
          const accuracy = Math.max(0, Math.round(100 - (diff / tolerance) * 50));
          
          let deviation: 'match' | 'low' | 'high' = 'match';
          if (pitch < target - 12) {
            deviation = 'low';
          } else if (pitch > target + 12) {
            deviation = 'high';
          }

          setAnalysis({
            isListening: true,
            volume: volumeScore,
            pitchHz: Math.round(pitch),
            pitchNote: note,
            pitchAccuracy: Math.min(accuracy, 100),
            pitchDeviation: deviation,
            error: null,
          });
        } else {
          setAnalysis((prev) => ({
            ...prev,
            isListening: true,
            volume: volumeScore,
            pitchHz: null,
            pitchNote: null,
            pitchDeviation: 'idle',
          }));
        }

        animFrameRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setAnalysis((prev) => ({
        ...prev,
        isListening: false,
        error: 'Acesso ao microfone necessário para feedback acústico ao vivo.',
      }));
    }
  }, [getAudioContext]);

  const stopMicrophone = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    setAnalysis({
      isListening: false,
      volume: 0,
      pitchHz: null,
      pitchNote: null,
      pitchAccuracy: 0,
      pitchDeviation: 'idle',
      error: null,
    });
  }, []);

  useEffect(() => {
    return () => {
      stopMicrophone();
      stopTone();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopMicrophone, stopTone]);

  return {
    analysis,
    playTone,
    stopTone,
    playChime,
    startMicrophone,
    stopMicrophone,
  };
}
