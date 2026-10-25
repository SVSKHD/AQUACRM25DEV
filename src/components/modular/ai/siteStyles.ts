export const scoreTone = (score: number) =>
  score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";

export const filterClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white";

export const segmentClass = (active: boolean) =>
  `rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
    active
      ? "bg-white text-blue-700 shadow dark:bg-white/15 dark:text-white"
      : "text-slate-600 hover:text-black dark:text-white/60 dark:hover:text-white"
  }`;
