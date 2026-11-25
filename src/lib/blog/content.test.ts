import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const ROOT = path.join(process.cwd(), 'content', 'blog');

describe('blog', () => {
  it('lê o cabeçalho e calcula o tempo de leitura', async () => {
    const { parsePost } = await import('./content');
    const p = parsePost('teste', 'title: Olá\ndescription: Um artigo\ndate: 2026-11-25\n\n# Título\n\n' + 'palavra '.repeat(400));
    expect(p).toMatchObject({ slug: 'teste', title: 'Olá', description: 'Um artigo', date: '2026-11-25', minutes: 2 });
    expect(p.blocks.length).toBeGreaterThan(0);
  });

  it('cada artigo existe nas 3 línguas, com título, descrição e data', async () => {
    const { parsePost } = await import('./content');
    const slugs = fs.readdirSync(ROOT);
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      for (const locale of ['pt-PT', 'pt-BR', 'en']) {
        const file = path.join(ROOT, slug, `${locale}.md`);
        expect(fs.existsSync(file), file).toBe(true);
        const p = parsePost(slug, fs.readFileSync(file, 'utf8'));
        expect(p.title.length, file).toBeGreaterThan(5);
        expect(p.description.length, file).toBeGreaterThan(20);
        expect(p.date, file).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
