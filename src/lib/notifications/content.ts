import type { Locale } from '@prisma/client';
import { translatorFor } from '@/i18n/translator';

/** Texto de um aviso push, na língua da pessoa (`messages/*.json`, `notifications.push`). */
export interface NotificationContent {
  title: string;
  body: string;
  url: string;
}

/** Fim do descanso numa sessão de treino; com o nome do exercício quando se sabe. */
export function restDoneNotification(locale: Locale, exerciseName?: string): NotificationContent {
  const t = translatorFor(locale);
  return {
    title: t('notifications.push.restDone.title'),
    body: exerciseName ? t('notifications.push.restDone.body', { exercise: exerciseName }) : t('notifications.push.restDone.bodyGeneric'),
    url: '/session',
  };
}

export function testNotification(locale: Locale): NotificationContent {
  const t = translatorFor(locale);
  return { title: t('notifications.push.test.title'), body: t('notifications.push.test.body'), url: '/settings' };
}

/** Retrospectiva semanal da IA pronta. */
export function aiInsightNotification(locale: Locale, id: string): NotificationContent {
  const t = translatorFor(locale);
  return { title: t('notifications.push.aiInsight.title'), body: t('notifications.push.aiInsight.body'), url: `/insights/${id}` };
}

/** Rede social: pedido de amizade, amizade aceite, comentário (os gostos ficam só no sino da app). */
export function socialNotification(
  locale: Locale,
  kind: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'COMMENT' | 'INVITE' | 'INVITE_REQUEST' | 'INVITE_ACCEPTED',
  name: string,
  url: string,
): NotificationContent {
  const t = translatorFor(locale);
  return { title: t(`notifications.push.social.${kind}.title`), body: t(`notifications.push.social.${kind}.body`, { name }), url };
}
