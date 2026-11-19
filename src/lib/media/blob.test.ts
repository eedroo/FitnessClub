import { describe, expect, it } from 'vitest';
import { allowedPath, ownBlobUrl } from './blob';

describe('fotos no Blob', () => {
  it('só nos caminhos da própria pessoa', () => {
    expect(allowedPath('posts/u1/foto-abc.webp', 'u1')).toBe('posts');
    expect(allowedPath('avatars/u1/a.jpg', 'u1')).toBe('avatars');
    expect(allowedPath('posts/u2/foto.webp', 'u1')).toBeNull();
    expect(allowedPath('posts/u1/../u2/x.webp', 'u1')).toBeNull();
    expect(allowedPath('outros/u1/x.webp', 'u1')).toBeNull();
  });
  it('URL nosso, da pessoa e do tipo', () => {
    const ok = 'https://abc123.public.blob.vercel-storage.com/posts/u1/foto-x1.webp';
    expect(ownBlobUrl(ok, 'u1', 'posts')).toBe(true);
    expect(ownBlobUrl(ok, 'u1', 'avatars')).toBe(false);
    expect(ownBlobUrl(ok, 'u2', 'posts')).toBe(false);
    expect(ownBlobUrl('https://evil.com/posts/u1/foto.webp', 'u1', 'posts')).toBe(false);
    expect(ownBlobUrl('nada', 'u1', 'posts')).toBe(false);
  });
});
