/**
 * Utilitários para parsing, validação, normalização e conversão de links do YouTube
 * para o formato seguro de incorporação (Embed) com suporte a Shorts, YouTu.be,
 * transmissões ao vivo (/live/), embeds sem cookies e URLs completas.
 */

export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  let cleanUrl = url.trim();

  // Remove aspas ou tags se o usuário colou iframe completo
  if (cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) {
    cleanUrl = cleanUrl.slice(1, -1).trim();
  }
  if (cleanUrl.startsWith("'") && cleanUrl.endsWith("'")) {
    cleanUrl = cleanUrl.slice(1, -1).trim();
  }

  // Se o usuário colou uma tag iframe, extrai o atributo src
  const iframeSrcMatch = cleanUrl.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    cleanUrl = iframeSrcMatch[1].trim();
  }

  // Caso 1: youtu.be/VIDEO_ID (suporta parâmetros ?si=... ou timestamp)
  const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // Caso 2: youtube.com/watch?v=VIDEO_ID (suporta &v= ou ?v= em qualquer posição)
  const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Caso 3: youtube.com/embed/VIDEO_ID ou youtube-nocookie.com/embed/VIDEO_ID
  const embedMatch = cleanUrl.match(/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // Caso 4: youtube.com/shorts/VIDEO_ID
  const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // Caso 5: youtube.com/live/VIDEO_ID (transmissões e gravações ao vivo)
  const liveMatch = cleanUrl.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch && liveMatch[1]) return liveMatch[1];

  // Caso 6: youtube.com/v/VIDEO_ID
  const vMatch = cleanUrl.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i);
  if (vMatch && vMatch[1]) return vMatch[1];

  // Caso 7: apenas o ID de 11 caracteres isolado
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

export function normalizeYouTubeUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
}

export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeVideoId(url) !== null;
}
