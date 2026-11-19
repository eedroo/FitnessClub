'use server';

import { cookies } from 'next/headers';
import { IANAZone } from 'luxon';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { settingsPatchSchema, type SettingsPatch } from '@/lib/validation/settings';
import { ACCENT_COOKIE, ACCENT_COOKIE_MAX_AGE } from '@/lib/accent';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, dbToAppLocale } from '@/i18n/locales';

type SettingsField = 'name' | 'locale' | 'theme' | 'timezone' | 'accent';

export type SaveSettingsResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Partial<Record<SettingsField, string>> };

const FIELD_ERRORS: Record<SettingsField, string> = {
  name: 'validation.nameLength',
  locale: 'validation.required',
  theme: 'validation.required',
  timezone: 'validation.timezone',
  accent: 'validation.required',
};

/**
 * Guarda as definições e escreve o cookie NEXT_LOCALE.
 * O cliente chama depois `update()` da sessão, `setTheme()` e `router.refresh()`.
 */
export async function saveSettings(input: SettingsPatch): Promise<SaveSettingsResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, formError: 'common.errors.unauthorized' };

  const parsed = settingsPatchSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<SettingsField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as SettingsField;
      if (field in FIELD_ERRORS) fieldErrors[field] = FIELD_ERRORS[field];
    }
    return { ok: false, fieldErrors };
  }
  if (parsed.data.timezone !== undefined && !IANAZone.isValidZone(parsed.data.timezone)) {
    return { ok: false, fieldErrors: { timezone: 'validation.timezone' } };
  }

  const before = await db.user.findUnique({ where: { id: session.user.id }, select: { locale: true } });
  if (!before) return { ok: false, formError: 'common.errors.unauthorized' };
  await db.user.update({ where: { id: session.user.id }, data: parsed.data });
  cookies().set(LOCALE_COOKIE, dbToAppLocale(parsed.data.locale ?? before.locale), LOCALE_COOKIE_OPTIONS);
  if (parsed.data.accent) cookies().set(ACCENT_COOKIE, parsed.data.accent, { maxAge: ACCENT_COOKIE_MAX_AGE, path: '/', sameSite: 'lax' });


  return { ok: true };
}
