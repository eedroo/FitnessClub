import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/auth';
import { getEntitlements } from '@/lib/entitlements/server';
import { allowedPath, IMAGE_TYPES, MAX_UPLOAD_BYTES } from '@/lib/media/blob';

/**
 * Envio directo de fotos do telemóvel para o Vercel Blob (o ficheiro não passa pelo servidor): aqui só se dá o
 * token, depois de verificar a sessão e o caminho (`posts/<eu>/…` ou `avatars/<eu>/…`), o tipo e o tamanho.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const s = await auth();
        const uid = s?.user?.id;
        if (!uid || !(await getEntitlements(uid)).features.pro) throw new Error('unauthorized');
        if (!allowedPath(pathname, uid)) throw new Error('bad path');
        return { allowedContentTypes: IMAGE_TYPES, maximumSizeInBytes: MAX_UPLOAD_BYTES, addRandomSuffix: true, tokenPayload: uid };
      },
      onUploadCompleted: async () => {
        // Nada a fazer: o URL só fica associado quando a pessoa publica (e é verificado nesse momento).
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 400 });
  }
}
