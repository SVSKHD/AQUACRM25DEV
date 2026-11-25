import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LiquidButton, LiquidIconButton, LiquidPanel } from "../../ui/liquid";
import { parseInvoiceDate } from "./mapInvoice";
import { formatINR } from "./invoiceFormat";
import { monthGrid, monthName, shiftMonth } from "../../../utils/invoicePeriod";

type CalendarInvoice = {
  id: string;
  date?: string | null;
  total_amount: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** ₹1.2L / ₹45K for the small day cells. */
const shortINR = (value: number) => {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (value >= 1e3) return `₹${Math.round(value / 1e3)}K`;
  return `₹${Math.round(value)}`;
};

/**
 * Month calendar for the invoices list: each day shows how many invoices were
 * made and their value; tapping a day narrows the list below to that day.
 */
export default function InvoiceCalendar({
  invoices,
  year,
  month,
  selectedDay,
  onSelectDay,
  onMonthChange,
}: {
  invoices: CalendarInvoice[];
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
  onMonthChange: (year: number, month: number) => void;
}) {
  const byDay = useMemo(() => {
    const days = new Map<number, { count: number; amount: number }>();
    invoices.forEach((invoice) => {
      const date = parseInvoiceDate(invoice.date);
      if (!date || date.getFullYear() !== year || date.getMonth() + 1 !== month)
        return;
      const entry = days.get(date.getDate()) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += Number(invoice.total_amount) || 0;
      days.set(date.getDate(), entry);
    });
    return days;
  }, [invoices, year, month]);

  const monthTotal = useMemo(() => {
    let count = 0;
    let amount = 0;
    byDay.forEach((entry) => {
      count += entry.count;
      amount += entry.amount;
    });
    return { count, amount };
  }, [byDay]);

  const today = new Date();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const go = (step: number) => {
    const next = shiftMonth(year, month, step);
    onMonthChange(next.year, next.month);
  };

  return (
    <LiquidPanel className="space-y-2 p-2 sm:p-3">
      <div className="flex items-center gap-2">
        <LiquidIconButton
          type="button"
          aria-label="Previous month"
          onClick={() => go(-1)}
          className="aqua-ctl"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </LiquidIconButton>
        <div className="min-w-0 flex-1 text-center">
          <p
            className="text-sm font-black text-neutral-950 dark:text-white"
            aria-live="polite"
          >
            {monthName(month)} {year}
          </p>
          <p className="text-xs text-slate-500 dark:text-white/50">
            {monthTotal.count} invoice{monthTotal.count === 1 ? "" : "s"} ·{" "}
            {formatINR(monthTotal.amount)}
          </p>
        </div>
        {!isThisMonth && (
          <LiquidButton
            type="button"
            variant="ghost"
            className="!min-h-0 !px-2 text-xs"
            onClick={() =>
              onMonthChange(today.getFullYear(), today.getMonth() + 1)
            }
          >
            Today
          </LiquidButton>
        )}
        <LiquidIconButton
          type="button"
          aria-label="Next month"
          onClick={() => go(1)}
          className="aqua-ctl"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </LiquidIconButton>
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Invoices in ${monthName(month)} ${year}`}
      >
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            role="columnheader"
            className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            {day.slice(0, 1)}
            <span className="hidden sm:inline">{day.slice(1)}</span>
          </div>
        ))}
        {monthGrid(year, month).map((day, index) => {
          if (!day) return <div key={`empty-${index}`} aria-hidden="true" />;
          const entry = byDay.get(day);
          const selected = selectedDay === day;
          const isToday = isThisMonth && today.getDate() === day;
          return (
            <LiquidButton
              key={day}
              type="button"
              variant="ghost"
              role="gridcell"
              aria-pressed={selected}
              aria-label={`${day} ${monthName(month)}: ${
                entry
                  ? `${entry.count} invoice${entry.count === 1 ? "" : "s"}, ${formatINR(entry.amount)}`
                  : "no invoices"
              }`}
              onClick={() => onSelectDay(selected ? null : day)}
              className={[
                "!flex !min-h-[3.25rem] !flex-col !items-center !justify-start !gap-0.5 !rounded-xl !px-0.5 !py-1 sm:!min-h-[4.5rem]",
                selected
                  ? "!bg-sky-500 !text-white ring-2 ring-sky-300"
                  : entry
                    ? "!bg-sky-500/10 text-neutral-950 dark:text-white"
                    : "text-slate-400 dark:text-white/35",
                isToday && !selected ? "ring-1 ring-sky-400" : "",
              ].join(" ")}
            >
              <span className="text-xs font-bold tabular-nums sm:text-sm">
                {day}
              </span>
              {entry && (
                <>
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-black leading-4 tabular-nums ${
                      selected
                        ? "bg-white/25"
                        : "bg-sky-500/20 text-sky-700 dark:text-sky-200"
                    }`}
                  >
                    {entry.count}
                  </span>
                  <span className="hidden text-[10px] font-semibold tabular-nums sm:block">
                    {shortINR(entry.amount)}
                  </span>
                </>
              )}
            </LiquidButton>
          );
        })}
      </div>
      <p className="px-1 text-xs text-slate-500 dark:text-white/50">
        {selectedDay
          ? `Showing ${selectedDay} ${monthName(month)} only. Tap the day again to see the whole month.`
          : "Tap a day to see its invoices."}
      </p>
    </LiquidPanel>
  );
}
