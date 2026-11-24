'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { completeFitnessOnboarding } from '@/actions/fitness';
import { saveSocialProfile } from '@/actions/social';
import { grantWellbeingConsent } from '@/actions/account';
import { recommendTemplate, type TrainingProfileData } from '@/lib/fitness/profile';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';
import { TextInput } from '@/components/ui/TextInput';
import { NotificationsPromptCard } from '@/components/notifications/NotificationsPromptCard';
import { PremiumRequest } from '@/components/premium/PremiumRequest';

const RESTS = [60, 90, 120, 180];
// As perguntas do perfil de treino passaram para "Novo programa com IA" (cada programa tem as suas respostas).
type FlowStep = 'hello' | 'profile' | 'rest' | 'alert' | 'weighIn' | 'start';
const FLOW: FlowStep[] = ['hello', 'profile', 'rest', 'alert', 'weighIn', 'start'];
const WEIGH_INS = ['DAILY', 'WEEKLY', 'OFF'] as const;
type WeighIn = (typeof WEIGH_INS)[number];
/** Opção "a IA monta o meu programa" em "por onde começar" (só com o recurso `ai`). */
const AI_START = 'ai';
const STEPS = FLOW.length;

/**
 * Boas-vindas (onboarding): olá, perfil, descanso, aviso de fim de descanso, lembrete de pesagem e por onde
 * começar: o programa feito pela IA em destaque (com o recurso `ai`), um modelo (o sugerido pelo perfil de treino,
 * se já existir) ou do zero. As perguntas do perfil fazem-se ao criar um programa com IA.
 */
export function BodyWelcome({
  initialRest,
  templates,
  initialProfile,
  initialPublic,
  hasConsent,
  aiAvailable,
  premiumRequested,
}: {
  initialRest: number;
  /** Já deu o consentimento de dados de saúde (preciso para guardar o peso). */
  hasConsent: boolean;
  aiAvailable: boolean;
  /** Já pediu o Premium (sem o recurso `ai`, a IA aparece com o botão para o pedir). */
  premiumRequested: boolean;
  /** O perfil público (toda a conta é um perfil): @ sugerido e nome. */
  initialPublic: { handle: string; displayName: string };
  templates: { id: string; name: string; description: string }[];
  initialProfile: TrainingProfileData;
}) {
  const t = useTranslations('fitness.welcome');
  const te = useTranslations();
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const cur = FLOW[step]!;
  const [pub, setPub] = useState(initialPublic);
  const [rest, setRest] = useState(initialRest);
  const [custom, setCustom] = useState(RESTS.includes(initialRest) ? '' : String(initialRest));
  const [alert, setAlert] = useState(true);
  const [template, setTemplate] = useState<string | null>(aiAvailable ? AI_START : 'ppl');
  const [weighIn, setWeighIn] = useState<WeighIn>('OFF');
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const finish = () =>
    start(async () => {
      const saved = await saveSocialProfile({ handle: pub.handle, displayName: pub.displayName, bio: null });
      if (!saved.ok) {
        setStep(FLOW.indexOf('profile'));
        return setError(te(saved.error));
      }
      // Lembrete de pesagem sem consentimento de dados de saúde: só com a caixa marcada (senão fica desligado).
      const wantsWeighIn = weighIn !== 'OFF' && (hasConsent || consent);
      if (wantsWeighIn && !hasConsent) await grantWellbeingConsent();
      const ai = template === AI_START;
      const res = await completeFitnessOnboarding({
        defaultRestSec: rest,
        restAlert: alert,
        templateId: ai ? null : template,
        weighInFrequency: wantsWeighIn ? weighIn : 'OFF',
      });
      if (!res.ok) return setError(te(res.error));
      // O token passa a `onboarded` (o middleware deixa de trazer aqui) e entra-se nos treinos (ou na IA).
      await update({});
      router.push(ai ? '/ai/new' : '/');
      router.refresh();
    });

  return (
    <div className="mg-body-welcome">
      <div className="mg-body-welcome__progress" aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={i <= step ? 'mg-body-welcome__dot mg-body-welcome__dot--done' : 'mg-body-welcome__dot'} />
        ))}
      </div>

      {cur === 'hello' && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('hello')}</h2>
          <p className="mg-body-welcome__text">{t('helloText')}</p>
        </section>
      )}

      {cur === 'profile' && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('profileTitle')}</h2>
          <p className="mg-body-welcome__text">{t('profileText')}</p>
          <label className="mg-activity-form__field">
            {t('profileHandle')}
            <TextInput value={pub.handle} maxLength={21} autoCapitalize="none" spellCheck={false} onChange={(e) => setPub({ ...pub, handle: e.target.value })} />
          </label>
          <label className="mg-activity-form__field">
            {t('profileName')}
            <TextInput value={pub.displayName} maxLength={40} onChange={(e) => setPub({ ...pub, displayName: e.target.value })} />
          </label>
        </section>
      )}

      {cur === 'rest' && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('restTitle')}</h2>
          <div className="mg-body-welcome__options" role="radiogroup" aria-label={t('restTitle')}>
            {RESTS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={rest === s && !custom}
                className={rest === s && !custom ? 'mg-body-welcome__option mg-body-welcome__option--active' : 'mg-body-welcome__option'}
                onClick={() => {
                  setRest(s);
                  setCustom('');
                }}
              >
                <strong>{t('seconds', { n: s })}</strong>
              </button>
            ))}
          </div>
          <label className="mg-body-welcome__text">
            {t('restOther')}
            <TextInput
              inputMode="numeric"
              value={custom}
              placeholder="75"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustom(v);
                const n = Number(v);
                if (n >= 10 && n <= 900) setRest(n);
              }}
            />
          </label>
          <p className="mg-body-welcome__text">{t('restHint')}</p>
        </section>
      )}

      {cur === 'alert' && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('alertTitle')}</h2>
          <p className="mg-body-welcome__text">{t('alertText')}</p>
          <CheckChip icon="bell" label={t('alertToggle')} checked={alert} onCheckedChange={setAlert} />
          {alert && <NotificationsPromptCard />}
        </section>
      )}

      {cur === 'weighIn' && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('weighInTitle')}</h2>
          <p className="mg-body-welcome__text">{t('weighInText')}</p>
          <div className="mg-body-welcome__options" role="radiogroup" aria-label={t('weighInTitle')}>
            {WEIGH_INS.map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={weighIn === w}
                className={weighIn === w ? 'mg-body-welcome__option mg-body-welcome__option--active' : 'mg-body-welcome__option'}
                onClick={() => setWeighIn(w)}
              >
                <strong>{t(`weighIn.${w}`)}</strong>
                <span>{t(`weighIn.${w}Text`)}</span>
              </button>
            ))}
          </div>
          {weighIn !== 'OFF' && !hasConsent && (
            <>
              <p className="mg-body-welcome__text">{t('weighInConsent')}</p>
              <CheckChip icon="heart" label={t('weighInConsentToggle')} checked={consent} onCheckedChange={setConsent} />
            </>
          )}
        </section>
      )}

      {cur === 'start' && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('startTitle')}</h2>
          <div className="mg-body-welcome__options" role="radiogroup" aria-label={t('startTitle')}>
            {aiAvailable && (
              <button
                type="button"
                role="radio"
                aria-checked={template === AI_START}
                className={
                  template === AI_START
                    ? 'mg-body-welcome__option mg-body-welcome__option--ai mg-body-welcome__option--active'
                    : 'mg-body-welcome__option mg-body-welcome__option--ai'
                }
                onClick={() => setTemplate(AI_START)}
              >
                <strong>{t('aiStart')}</strong>
                <span>{t('aiStartText')}</span>
              </button>
            )}
            {!aiAvailable && (
              <div className="mg-body-welcome__option mg-body-welcome__option--ai mg-body-welcome__option--locked">
                <strong>{t('aiStart')}</strong>
                <span>{t('aiStartText')}</span>
                <PremiumRequest requested={premiumRequested} />
              </div>
            )}
            {[...templates, { id: '', name: t('fromScratch'), description: t('fromScratchText') }].map((tpl) => {
              const active = (template ?? '') === tpl.id;
              return (
                <button
                  key={tpl.id || 'scratch'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? 'mg-body-welcome__option mg-body-welcome__option--active' : 'mg-body-welcome__option'}
                  onClick={() => setTemplate(tpl.id || null)}
                >
                  <strong>{tpl.name}</strong>
                  <span>{tpl.description}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}

      <div className="mg-body-welcome__actions">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            {t('back')}
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS - 1 ? (
          <Button
            className="mg-btn--body"
            onClick={() => {
              // Ao chegar a "por onde começar", sugere o modelo que combina com o perfil.
              if (FLOW[step + 1] === 'start' && template !== AI_START) setTemplate(recommendTemplate(initialProfile));
              setStep(step + 1);
            }}
          >
            {t('next')}
          </Button>
        ) : (
          <Button className="mg-btn--body" loading={pending} onClick={finish}>
            {t('finish')}
          </Button>
        )}
      </div>
    </div>
  );
}
