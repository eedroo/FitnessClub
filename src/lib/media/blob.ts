/**
 * Fotos no Vercel Blob (store público; os URLs são longos e impossíveis de adivinhar). Puro: caminhos por pessoa e
 * verificação de que um URL é nosso e da pessoa certa (ninguém publica fotos de outra conta).
 */
export type MediaKind = 'posts' | 'avatars';

export const MAX_POST_IMAGES = 4;
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Caminho permitido para a pessoa: `posts/<userId>/<nome>` ou `avatars/<userId>/<nome>`. */
export function allowedPath(pathname: string, userId: string): MediaKind | null {
  const m = /^(posts|avatars)\/([^/]+)\/[\w.-]{1,120}$/.exec(pathname);
  if (!m || m[2] !== userId) return null;
  return m[1] as MediaKind;
}

/** URL do nosso Blob, da pessoa e do tipo certo. */
export function ownBlobUrl(url: string, userId: string, kind: MediaKind): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !u.hostname.endsWith('.public.blob.vercel-storage.com')) return false;
    return allowedPath(decodeURIComponent(u.pathname.slice(1)), userId) === kind;
  } catch {
    return false;
  }
}
