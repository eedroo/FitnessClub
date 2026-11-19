import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { allowExport } from '@/lib/ratelimit';
import { todayInTz } from '@/lib/dates';
import { buildExport } from '@/lib/account/export';

/** Exportação de todos os dados do utilizador (RGPD): JSON `fitnessclub-export-v1`, como anexo. 3 por dia. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await allowExport(userId))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      activeDays: { orderBy: { day: 'asc' } },
      fitnessPrefs: true,
      fitnessPrograms: { orderBy: { order: 'asc' }, include: { workouts: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } } } },
      fitnessSessions: { orderBy: { startedAt: 'asc' }, include: { sets: { orderBy: { completedAt: 'asc' } } } },
      customExercises: { orderBy: { id: 'asc' } },
      bodyWeights: { orderBy: { date: 'asc' } },
      bodyGoal: true,
      exerciseNotes: { orderBy: { exerciseId: 'asc' } },
      trainingProfile: true,
      aiRequests: { orderBy: { createdAt: 'asc' } },
      activities: { orderBy: { startedAt: 'asc' } },
    },
  });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const [profile, friendships, posts, comments, likes] = await Promise.all([
    db.socialProfile.findUnique({ where: { userId }, select: { handle: true, displayName: true, bio: true, shareLevels: true, createdAt: true } }),
    db.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, acceptedAt: true, requester: { select: { socialProfile: { select: { handle: true } } } }, addressee: { select: { socialProfile: { select: { handle: true } } } } },
    }),
    db.post.findMany({ where: { authorId: userId }, orderBy: { createdAt: 'asc' }, select: { text: true, visibility: true, workout: true, createdAt: true } }),
    db.postComment.findMany({ where: { authorId: userId }, orderBy: { createdAt: 'asc' }, select: { postId: true, text: true, createdAt: true } }),
    db.postLike.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { postId: true, createdAt: true } }),
  ]);

  const data = buildExport({
    user,
    activeDays: user.activeDays,
    ai: user.aiRequests,
    activities: user.activities,
    social: {
      profile,
      friends: friendships.map((f) => ({ handle: (f.requesterId === userId ? f.addressee : f.requester).socialProfile?.handle ?? null, since: f.acceptedAt })),
      posts,
      comments,
      likes,
    },
    fitness: {
      prefs: user.fitnessPrefs,
      programs: user.fitnessPrograms,
      sessions: user.fitnessSessions,
      customExercises: user.customExercises,
      weights: user.bodyWeights,
      goal: user.bodyGoal,
      exerciseNotes: user.exerciseNotes,
      profile: user.trainingProfile,
    },
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="fitnessclub-export-${todayInTz(user.timezone)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
