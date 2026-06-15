import React, { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";


type CellRenderer<T> = (row: T, index: number) => ReactNode;

export interface AquaTableColumn<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: CellRenderer<T>;
}

export interface AquaTableAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: ReactNode;
}

export interface AquaGenericTableProps<T> {
  heading: string;
  subHeading?: string;
  columns: AquaTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  actionsLabel?: string;
  actions?: AquaTableAction<T>[];
  enableFilter?: boolean;
  filterPlaceholder?: string;
}

const resolveValue = <T,>(row: T, key: AquaTableColumn<T>["key"]) => {
  if (!key) return undefined;
  if (typeof key === "string" && key.includes(".")) {
    return key
      .split(".")
      .reduce(
        (value: any, part) => (value ? value[part] : undefined),
        row as any,
      );
  }
  return (row as any)?.[key as keyof T];
};

const renderCellValue = <T,>(row: T, col: AquaTableColumn<T>, rowIndex: number) =>
  col.render ? col.render(row, rowIndex) : String(resolveValue(row, col.key) ?? "—");

export function AquaGenericTable<T>({
  heading,
  subHeading,
  columns,
  data,
  isLoading = false,
  emptyMessage = "No records found",
  onRowClick,
  actionsLabel = "Actions",
  actions,
  enableFilter = false,
  filterPlaceholder,
}: AquaGenericTableProps<T>) {
  const hasActions = Boolean(actions && actions.length > 0);
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);
  const [filterText, setFilterText] = useState("");
  const colSpan = columns.length + (hasActions ? 1 : 0);

  const getRowKey = (row: T, rowIndex: number) =>
    ((row as any)?.id as string | number | undefined) ?? rowIndex;

  const toggleRow = (rowKey: string | number) => {
    setExpandedRow((prev) => (prev === rowKey ? null : rowKey));
  };

  const filteredData =
    filterText.trim().length === 0
      ? data
      : data.filter((row) => {
          const text = filterText.toLowerCase();
          return columns.some((col) => {
            const value = col.render
              ? col.render(row, 0)
              : resolveValue(row, col.key);
            const str =
              typeof value === "string"
                ? value
                : typeof value === "number"
                  ? value.toString()
                  : "";
            return str.toLowerCase().includes(text);
          });
        });

  const renderActions = (row: T, compact = false) => (
    <div className={compact ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
      {actions?.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(row);
          }}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/70 px-3 py-2 text-xs font-bold text-black shadow-sm transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:text-sm"
        >
          {action.icon && (
            <span className="flex h-4 w-4 items-center justify-center text-black dark:text-white/70">
              {action.icon}
            </span>
          )}
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );

  const renderMobileCards = () => {
    if (isLoading) {
      return <div className="rounded-2xl border border-white/10 p-5 text-center text-sm text-slate-500 dark:text-white/50">Loading...</div>;
    }

    if (filteredData.length === 0) {
      return <div className="rounded-2xl border border-white/10 p-5 text-center text-sm text-slate-500 dark:text-white/50">{emptyMessage}</div>;
    }

    return (
      <div className="space-y-3">
        {filteredData.map((row, rowIndex) => {
          const rowKey = getRowKey(row, rowIndex);
          const primary = columns[0];
          const secondary = columns[1];
          const remaining = columns.slice(2);

          return (
            <div
              key={rowKey}
              role={onRowClick ? "button" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`rounded-2xl border border-white/15 bg-white/45 p-3 shadow-sm backdrop-blur-xl dark:bg-white/5 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500 dark:text-white/45">
                    {primary.header}
                  </p>
                  <div className="mt-1 truncate text-sm font-black text-neutral-950 dark:text-white">
                    {renderCellValue(row, primary, rowIndex)}
                  </div>
                  {secondary && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-white/60">
                      <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-white/35">{secondary.header}: </span>
                      <span>{renderCellValue(row, secondary, rowIndex)}</span>
                    </div>
                  )}
                </div>
                {hasActions && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(rowKey);
                    }}
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm dark:bg-white/10 dark:text-white"
                    aria-label={`${actionsLabel} menu`}
                  >
                    {expandedRow === rowKey ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {remaining.map((col) => (
                  <div key={String(col.key)} className="rounded-xl bg-slate-100/70 px-3 py-2 dark:bg-white/5">
                    <p className="text-[0.62rem] font-black uppercase tracking-wide text-slate-500 dark:text-white/40">{col.header}</p>
                    <div className="mt-1 min-w-0 truncate text-xs font-bold text-neutral-950 dark:text-white/80">
                      {renderCellValue(row, col, rowIndex)}
                    </div>
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {hasActions && expandedRow === rowKey && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-white/10">
                      {renderActions(row, true)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="glass-card overflow-hidden rounded-xl border border-slate-200 shadow-xl dark:border-white/10">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-neutral-950 dark:text-white">
              {heading}
            </h2>
            {subHeading && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-white/60 sm:text-sm">
                {subHeading}
              </p>
            )}
          </div>
          {enableFilter && (
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={filterText}
                onChange={(e) => {
                  setExpandedRow(null);
                  setFilterText(e.target.value);
                }}
                placeholder={filterPlaceholder || "Filter rows"}
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-neutral-950 outline-none transition-all placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
              />
            </div>
          )}
        </div>
      </div>

      <div className="block p-3 md:hidden">
        {renderMobileCards()}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[900px] w-full table-auto">
          <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="whitespace-nowrap px-4 py-4 text-left text-xs font-semibold uppercase text-black dark:text-white/60"
                >
                  {col.header}
                </th>
              ))}
              {hasActions && (
                <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                  {actionsLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {isLoading ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => {
                const rowKey = getRowKey(row, rowIndex);
                const isExpanded = expandedRow === rowKey;

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={
                        onRowClick
                          ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                          : ""
                      }
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={`max-w-[240px] px-4 py-4 align-top text-sm leading-relaxed text-black dark:text-white/80 ${
                            col.className ?? ""
                          }`}
                        >
                          <div className="min-w-0 truncate">
                            {renderCellValue(row, col, rowIndex)}
                          </div>
                        </td>
                      ))}
                      {hasActions && (
                        <td className="px-4 py-4 text-right align-top">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(rowKey);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                          >
                            <span>{actionsLabel}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-500 dark:text-white/40" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500 dark:text-white/40" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                    <AnimatePresence>
                      {hasActions && isExpanded && (
                        <tr className="bg-slate-50/30 dark:bg-white/5">
                          <td colSpan={colSpan} className="px-0 py-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-gray-400 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {renderActions(row)}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AquaGenericTable;
