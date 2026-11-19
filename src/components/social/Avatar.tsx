import Image from 'next/image';
import { initials } from '@/lib/social/rules';

/** Avatar: a foto de perfil, ou as iniciais num círculo grafite. */
export function Avatar({ name, url = null, size = 40 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <Image className="mg-avatar mg-avatar--photo" src={url} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  return (
    <span className="mg-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
