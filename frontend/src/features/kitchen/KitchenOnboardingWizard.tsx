import { useMemo, useState } from 'react';

import { Badge, Button, Card, Icon, Progress, toast } from '@/design-system';
import { cn } from '@/lib/cn';

import { kitchenOnboardingService, type KitchenOnboardingState, type OnboardingStep } from './onboarding';
import { emptyDraft, STEPS, type WizardDraft } from './onboarding-steps';

/**
 * The first-login setup wizard. Drives the backend's onboarding endpoints:
 * each step PATCHes the restaurant's settings (or its primary branch) and marks
 * itself complete; `complete` then flips the restaurant AND its organization to
 * ACTIVE, which is what actually opens the kitchen board.
 *
 * Every step is mandatory server-side — `complete` rejects a partial wizard — so
 * there is no skip. Steps that carry no data (staff invites) are acknowledged
 * rather than filled in, and each one submits the same defaults the backend
 * would have applied anyway.
 */
export function KitchenOnboardingWizard({
  state,
  onCompleted,
}: {
  state: KitchenOnboardingState;
  onCompleted: () => void;
}) {
  const [completed, setCompleted] = useState<OnboardingStep[]>(state.completedSteps);
  const [draft, setDraft] = useState<WizardDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Resume where they left off: first step that isn't done yet.
  const [index, setIndex] = useState(() => {
    const firstPending = STEPS.findIndex((s) => !state.completedSteps.includes(s.key));
    return firstPending === -1 ? 0 : firstPending;
  });

  const step = STEPS[index];
  const patch = (p: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...p }));
  const doneCount = completed.length;
  const allDone = useMemo(() => STEPS.every((s) => completed.includes(s.key)), [completed]);

  const saveStep = async () => {
    const problem = step.validate?.(draft) ?? null;
    if (problem) return toast.error(problem);

    setSaving(true);
    try {
      const next = await kitchenOnboardingService.submitStep(step.key, step.toData(draft));
      setCompleted(next.completedSteps);
      const nextPending = STEPS.findIndex((s) => !next.completedSteps.includes(s.key));
      if (nextPending !== -1) setIndex(nextPending);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not save ${step.title.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await kitchenOnboardingService.complete();
      toast.success('Setup complete — opening your kitchen');
      onCompleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not finish setup');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Kitchen setup</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Let's get your kitchen open
        </h1>
        <p className="mt-2 text-foreground-muted">
          {doneCount} of {STEPS.length} done. Your progress saves as you go — you can leave and come back.
        </p>

        <Progress value={(doneCount / STEPS.length) * 100} className="mt-5" />

        <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
          <StepRail steps={completed} activeIndex={index} onJump={setIndex} />

          <div className="min-w-0">
            {allDone ? (
              <Card padding="lg" className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Icon name="checkCircle" className="h-5 w-5 text-success" />
                  <h2 className="text-lg font-semibold">Everything's set</h2>
                </div>
                <p className="text-sm text-foreground-muted">
                  All {STEPS.length} steps are done. Finishing activates your restaurant and opens the kitchen board.
                </p>
                <Button loading={finishing} leftIcon="check" onClick={() => void finish()}>
                  Finish setup &amp; open kitchen
                </Button>
              </Card>
            ) : (
              <Card padding="lg" className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{step.title}</h2>
                    {completed.includes(step.key) && <Badge tone="success" variant="soft">Saved</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">{step.description}</p>
                </div>

                <step.Body draft={draft} patch={patch} />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    leftIcon="arrowLeft"
                    disabled={index === 0}
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  >
                    Back
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-subtle">
                      Step {index + 1} of {STEPS.length}
                    </span>
                    <Button loading={saving} onClick={() => void saveStep()}>
                      {completed.includes(step.key) ? 'Save changes' : 'Save & continue'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/** Left rail: which steps are done, and a way back to any of them. */
function StepRail({
  steps,
  activeIndex,
  onJump,
}: {
  steps: OnboardingStep[];
  activeIndex: number;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {STEPS.map((s, i) => {
        const done = steps.includes(s.key);
        const active = i === activeIndex;
        return (
          <li key={s.key} className="shrink-0 lg:shrink">
            <button
              type="button"
              onClick={() => onJump(i)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-primary/40',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold',
                  done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-muted text-foreground-subtle',
                )}
              >
                {done ? <Icon name="check" className="h-3 w-3" /> : i + 1}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
