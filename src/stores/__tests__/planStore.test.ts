import {
  isPlanDirty,
  planFromSettings,
  shownPlan,
  usePlanStore,
  type Plan,
} from '../planStore';

const saved: Plan = {
  investmentCents: 150_000,
  savingsCents: 100_000,
  expenditureCents: 200_000,
};

beforeEach(() => {
  usePlanStore.setState(usePlanStore.getInitialState(), true);
});

it('starts with no draft, which is clean and shows the saved plan', () => {
  const { draft } = usePlanStore.getState();

  expect(draft).toBeNull();
  expect(isPlanDirty(draft, saved)).toBe(false);
  expect(shownPlan(draft, saved)).toEqual(saved);
});

it('is clean when the draft equals the saved plan', () => {
  usePlanStore.getState().patchDraft(saved, { savingsCents: 100_000 });

  expect(usePlanStore.getState().draft).toEqual(saved);
  expect(isPlanDirty(usePlanStore.getState().draft, saved)).toBe(false);
});

it.each(['investmentCents', 'savingsCents', 'expenditureCents'] as const)(
  'is dirty when %s differs from the saved plan',
  field => {
    usePlanStore
      .getState()
      .patchDraft(saved, { [field]: saved[field] + 5_000 });

    expect(isPlanDirty(usePlanStore.getState().draft, saved)).toBe(true);
  },
);

it('patches one field, keeping the others from the saved plan', () => {
  usePlanStore.getState().patchDraft(saved, { investmentCents: 175_000 });

  expect(usePlanStore.getState().draft).toEqual({
    ...saved,
    investmentCents: 175_000,
  });
});

it('patches one field on top of earlier edits, not on top of the saved plan', () => {
  const { patchDraft } = usePlanStore.getState();
  patchDraft(saved, { investmentCents: 175_000 });
  patchDraft(saved, { savingsCents: 80_000 });

  expect(usePlanStore.getState().draft).toEqual({
    investmentCents: 175_000,
    savingsCents: 80_000,
    expenditureCents: 200_000,
  });
});

it('discards the draft on reset, so the saved plan shows again', () => {
  usePlanStore.getState().patchDraft(saved, { investmentCents: 175_000 });
  usePlanStore.getState().resetDraft();

  expect(usePlanStore.getState().draft).toBeNull();
  expect(shownPlan(usePlanStore.getState().draft, saved)).toEqual(saved);
});

it('reads the saved plan from the settings row', () => {
  expect(
    planFromSettings({
      monthly_investment_cents: 150_000,
      monthly_savings_cents: 100_000,
      monthly_expenditure_cents: 200_000,
    }),
  ).toEqual(saved);
});
