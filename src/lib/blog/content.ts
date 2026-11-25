import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { AppLocale } from '@/i18n/locales';
import { parseBlocks, type MdBlock } from '@/lib/markdown';

/**
 * Blog público (captação): `content/blog/<slug>/<locale>.md`, com cabeçalho `title:`, `description:`, `date:` e o corpo
 * em markdown mínimo (o mesmo dos documentos legais). Sem a língua pedida, usa pt-PT.
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  minutes: number; // tempo de leitura
  blocks: MdBlock[];
}

const ROOT = path.join(process.cwd(), 'content', 'blog');
const SLUG = /^[a-z0-9-]{3,80}$/;

export function parsePost(slug: string, source: string): BlogPost {
  const meta: Record<string, string> = {};
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  for (; i < lines.length; i++) {
    const m = /^(\w+):\s*(.+)$/.exec(lines[i]!.trim());
    if (!m) break;
    meta[m[1]!] = m[2]!;
  }
  const body = lines.slice(i).join('\n');
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: meta.title ?? slug,
    description: meta.description ?? '',
    date: meta.date ?? '',
    minutes: Math.max(1, Math.round(words / 200)),
    blocks: parseBlocks(body),
  };
}

export function getPost(slug: string, locale: AppLocale): BlogPost | null {
  if (!SLUG.test(slug)) return null;
  const dir = path.join(ROOT, slug);
  if (!fs.existsSync(dir)) return null;
  const file = [path.join(dir, `${locale}.md`), path.join(dir, 'pt-PT.md')].find((f) => fs.existsSync(f));
  return file ? parsePost(slug, fs.readFileSync(file, 'utf8')) : null;
}

/** Todos os artigos, do mais recente para o mais antigo. */
export function listPosts(locale: AppLocale): BlogPost[] {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT)
    .filter((s) => SLUG.test(s))
    .map((s) => getPost(s, locale))
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}
