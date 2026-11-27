import { inngest } from '../client';
import { notifyFriendsTrained } from '@/lib/social/friendWorkout';
import { reportJobFailure } from '../sentry';

/** «Fulana treinou»: avisa os amigos de quem terminou um treino. */
export const friendTrained = inngest.createFunction(
  { id: 'social-friend-trained', retries: 1, onFailure: reportJobFailure('social-friend-trained') },
  { event: 'social/friend.trained' },
  async ({ event, step }) => step.run('notify', () => notifyFriendsTrained(event.data.userId, event.data.sessionId)),
);
