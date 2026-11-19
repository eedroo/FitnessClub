'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CircleUserRound, History, ListChecks, Users } from 'lucide-react';

const ICONS = [Users, ListChecks, History, CalendarDays, CircleUserRound];

/** Navegação: Feed · Treinos · Sessões · Dia · Eu (a biblioteca de exercícios abre-se a partir dos treinos). */
export function BodyNav({ label, items }: { label: string; items: { href: string; label: string; match: string[] }[] }) {
  const pathname = usePathname();
  const isActive = (match: string[]) =>
    match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)));
  return (
    <nav className="mg-body-nav" aria-label={label}>
      {items.map((item, i) => {
        const Icon = ICONS[i] ?? ListChecks;
        const active = isActive(item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'mg-body-nav__item mg-body-nav__item--active' : 'mg-body-nav__item'}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
