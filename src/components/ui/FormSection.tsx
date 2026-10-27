import type { ReactNode } from "react";

/** Titled group of fields inside a side-panel form (panels use a dark surface). */
export default function FormSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wide text-sky-200/90">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-white/55">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
