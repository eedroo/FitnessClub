import { initials } from '@/lib/social/rules';

/** Avatar com as iniciais (as fotos de perfil chegam com o armazenamento de imagens). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="mg-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
