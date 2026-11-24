import { upload } from '@vercel/blob/client';
import type { MediaKind } from './blob';

/**
 * No browser: reduz a foto (lado maior 1600 px; avatares 512 px) para WebP e envia-a directamente para o Blob.
 * Fotos do iPhone (HEIC) chegam já como JPEG ao escolher na galeria; o canvas trata do resto.
 */
async function shrink(file: Blob, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.85));
  // Safari antigo não gera WebP: JPEG.
  if (blob && blob.type === 'image/webp') return blob;
  return (await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))) ?? file;
}

export async function uploadPhoto(file: Blob, kind: MediaKind, userId: string): Promise<string> {
  const small = await shrink(file, kind === 'avatars' ? 512 : 1600);
  const ext = small.type === 'image/webp' ? 'webp' : small.type === 'image/png' ? 'png' : 'jpg';
  const res = await upload(`${kind}/${userId}/foto.${ext}`, small, { access: 'public', handleUploadUrl: '/api/blob/upload', contentType: small.type });
  return res.url;
}
