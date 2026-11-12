/**
 * Ponte de recursos nativos para Android (PWA Standalone + WebView APK Kotlin)
 * Integra vibração háptica, Wake Lock de tela durante exercícios,
 * notificações locais e compartilhamento nativo de PDFs.
 */

export interface NativeAndroidBridgeInterface {
  vibrate?: (ms: number) => void;
  showNotification?: (title: string, body: string) => void;
  syncReminders?: (remindersJson: string) => void;
  sharePdfBase64?: (base64Data: string, filename: string, title: string) => void;
  keepScreenOn?: (enabled: boolean) => void;
  getAppVersion?: () => string;
}

declare global {
  interface Window {
    VocalisAndroid?: NativeAndroidBridgeInterface;
  }
}

export function isNativeAndroidShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.VocalisAndroid);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent) || isNativeAndroidShell();
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    isNativeAndroidShell() ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function triggerHaptic(pattern: number | number[] = 15): void {
  try {
    if (typeof window !== 'undefined' && window.VocalisAndroid?.vibrate) {
      const ms = Array.isArray(pattern) ? pattern[0] || 20 : pattern;
      window.VocalisAndroid.vibrate(ms);
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore vibration permission restrictions
  }
}

export function syncAndroidAlarms(reminders: unknown[]): boolean {
  try {
    if (typeof window !== 'undefined' && window.VocalisAndroid?.syncReminders) {
      window.VocalisAndroid.syncReminders(JSON.stringify(reminders || []));
      return true;
    }
  } catch {
    // Ignore bridge invocation errors
  }
  return false;
}

let activeWakeLock: { release: () => Promise<void> } | null = null;

export async function acquireWakeLock(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && window.VocalisAndroid?.keepScreenOn) {
      window.VocalisAndroid.keepScreenOn(true);
      return true;
    }
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      const navAny = navigator as unknown as {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
      };
      if (navAny.wakeLock) {
        activeWakeLock = await navAny.wakeLock.request('screen');
        return true;
      }
    }
  } catch {
    // Wake Lock not supported or blocked by battery saver
  }
  return false;
}

export async function releaseWakeLock(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.VocalisAndroid?.keepScreenOn) {
      window.VocalisAndroid.keepScreenOn(false);
    }
    if (activeWakeLock) {
      await activeWakeLock.release();
      activeWakeLock = null;
    }
  } catch {
    activeWakeLock = null;
  }
}

export async function shareOrDownloadPdfBlob(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<'native-apk' | 'web-share' | 'download'> {
  // 1. Se rodando dentro do APK Android nativo com bridge Kotlin
  if (typeof window !== 'undefined' && window.VocalisAndroid?.sharePdfBase64) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || '');
        const idx = res.indexOf(',');
        resolve(idx !== -1 ? res.slice(idx + 1) : res);
      };
      reader.onerror = () => reject(new Error('Falha ao converter PDF para envio ao Android'));
      reader.readAsDataURL(blob);
    });
    window.VocalisAndroid.sharePdfBase64(base64, filename, title);
    return 'native-apk';
  }

  // 2. Web Share API (Android Chrome / PWA Standalone -> WhatsApp, Gmail, Drive)
  const file = new File([blob], filename, { type: 'application/pdf' });
  const nav = navigator as unknown as {
    share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
    canShare?: (data: { files?: File[] }) => boolean;
  };

  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    await nav.share({
      title,
      text,
      files: [file],
    });
    return 'web-share';
  }

  // 3. Fallback universal para download direto
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'download';
}
