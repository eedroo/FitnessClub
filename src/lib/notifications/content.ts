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
