/** The five screens; none take params. */
export type RootParamList = {
  Overview: undefined;
  Finance: undefined;
  Trading: undefined;
  Planner: undefined;
  Settings: undefined;
};

export type ScreenName = keyof RootParamList;
type FinnyParamList = RootParamList;

declare global {
  namespace ReactNavigation {
    // Makes `useNavigation()` check screen names against Finny's.
    interface RootParamList extends FinnyParamList {}
  }
}

/** The desktop pill's tabs. */
export const SCREENS: readonly { name: ScreenName; label: string }[] = [
  { name: 'Overview', label: 'Overview' },
  { name: 'Finance', label: 'Personal Finance' },
  { name: 'Trading', label: 'Trading' },
  { name: 'Planner', label: 'Goals & Planner' },
  { name: 'Settings', label: 'Settings' },
];

/** The mobile bar's tabs. Ask Finny has no screen this build, so its tab is disabled. */
export const MOBILE_TABS: readonly {
  name: ScreenName | 'AskFinny';
  label: string;
}[] = [
  { name: 'Overview', label: 'Overview' },
  { name: 'Finance', label: 'Finance' },
  { name: 'Trading', label: 'Trading' },
  { name: 'Planner', label: 'Plan' },
  { name: 'AskFinny', label: 'Finny' },
  { name: 'Settings', label: 'Settings' },
];
