import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => {
  class WebPushError extends Error {
    constructor(public statusCode: number) {
      super(`status ${statusCode}`);
    }
  }
  return {
    WebPushError,
    sendNotification: vi.fn(),
    subs: [] as { id: string; userId: string; endpoint: string; p256dh: string; auth: string }[],
  };
});

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: m.sendNotification },
  WebPushError: m.WebPushError,
}));

vi.mock('@/lib/db', () => ({
  db: {
    pushSubscription: {
      findMany: vi.fn(async ({ where }) => m.subs.filter((s) => s.userId === where.userId)),
      deleteMany: vi.fn(async ({ where }) => {
        m.subs = m.subs.filter((s) => s.id !== where.id);
        return { count: 1 };
      }),
    },
  },
}));

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub';
process.env.VAPID_PRIVATE_KEY = 'priv';
process.env.VAPID_SUBJECT = 'mailto:teste@example.com';

const { pushToUser } = await import('./send');

const payload = { title: 'Descanso terminado', body: 'Bora para a próxima série.', url: '/session', tag: 'rest' };
const sub = (id: string) => ({ id, userId: 'u1', endpoint: `https://push.example.com/${id}`, p256dh: 'k', auth: 'a' });

describe('pushToUser', () => {
  beforeEach(() => {
    m.subs = [];
    m.sendNotification.mockReset().mockResolvedValue({ statusCode: 201 });
  });

  it('envia a cada dispositivo com o ícone e o TTL pedido', async () => {
    m.subs = [sub('s1')];
    expect(await pushToUser('u1', payload, { ttl: 60 })).toBe(1);
    const sent = JSON.parse(m.sendNotification.mock.calls[0]![1]);
    expect(sent).toMatchObject({ title: 'Descanso terminado', url: '/session', tag: 'rest', icon: '/icons/icon-192.png' });
    expect(m.sendNotification.mock.calls[0]![2]).toMatchObject({ TTL: 60 });
  });

  it('sem TTL usa 4 horas', async () => {
    m.subs = [sub('s1')];
    await pushToUser('u1', payload);
    expect(m.sendNotification.mock.calls[0]![2]).toMatchObject({ TTL: 4 * 3600 });
  });

  it('410 apaga a subscrição e conta 0', async () => {
    m.subs = [sub('s1')];
    m.sendNotification.mockRejectedValueOnce(new m.WebPushError(410));
    expect(await pushToUser('u1', payload)).toBe(0);
    expect(m.subs).toEqual([]);
  });

  it('com um dispositivo a falhar (500) e outro ok conta 1; o que falhou mantém-se', async () => {
    m.subs = [sub('s1'), sub('s2')];
    m.sendNotification.mockRejectedValueOnce(new m.WebPushError(500));
    expect(await pushToUser('u1', payload)).toBe(1);
    expect(m.subs).toHaveLength(2);
  });

  it('sem subscrições não envia', async () => {
    expect(await pushToUser('u1', payload)).toBe(0);
    expect(m.sendNotification).not.toHaveBeenCalled();
  });
});
