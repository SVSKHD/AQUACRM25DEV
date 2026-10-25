import React, { ReactNode, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type CellRenderer<T> = (row: T, index: number) => ReactNode;

export interface AquaTableColumn<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: CellRenderer<T>;
  /** Text the filter box matches; needed when `render` returns JSX. */
  filterValue?: (row: T) => string;
  /** Makes the header clickable to sort by this value. */
  sortValue?: (row: T) => string | number;
  /** Lets the cell grow and wrap onto several lines instead of truncating at 240px. */
  wrap?: boolean;
  /** Classes for the header cell, e.g. a minimum width for a wrapping column. */
  headerClassName?: string;
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

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
  actionsBelowRow?: boolean;
  getRowId?: (row: T, rowIndex: number) => string | number;
  selectedRowIds?: ReadonlySet<string | number>;
  onSelectionChange?: (selectedRowIds: Set<string | number>) => void;
  /** Controls shown at the right of the heading (e.g. a "Select" mode toggle). */
  headerActions?: ReactNode;
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

const renderCellValue = <T,>(
  row: T,
  col: AquaTableColumn<T>,
  rowIndex: number,
) =>
  col.render
    ? col.render(row, rowIndex)
    : String(resolveValue(row, col.key) ?? "—");

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
  actionsBelowRow = false,
  getRowId,
  selectedRowIds,
  onSelectionChange,
  headerActions,
}: AquaGenericTableProps<T>) {
  const hasActions = Boolean(actions && actions.length > 0);
  const isSelectable = Boolean(selectedRowIds && onSelectionChange);
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);
  const [filterText, setFilterText] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const hasActionColumn = hasActions && !actionsBelowRow;
  const colSpan =
    columns.length + (isSelectable ? 1 : 0) + (hasActionColumn ? 1 : 0);

  const getRowKey = (row: T, rowIndex: number) =>
    getRowId?.(row, rowIndex) ??
    ((row as any)?.id as string | number | undefined) ??
    rowIndex;

  const toggleRow = (rowKey: string | number) => {
    setExpandedRow((prev) => (prev === rowKey ? null : rowKey));
  };

  const filteredData = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    const matched = !text
      ? data
      : data.filter((row) =>
          columns.some((col) => {
            const value = col.filterValue
              ? col.filterValue(row)
              : col.render
                ? col.render(row, 0)
                : resolveValue(row, col.key);
            const str =
              typeof value === "string"
                ? value
                : typeof value === "number"
                  ? value.toString()
                  : "";
            return str.toLowerCase().includes(text);
          }),
        );
    if (!sort) return matched;
    const sortColumn = columns.find((col) => String(col.key) === sort.key);
    if (!sortColumn?.sortValue) return matched;
    const getValue = sortColumn.sortValue;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      return (
        factor *
        (typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
            }))
      );
    });
  }, [data, columns, filterText, sort]);

  // Click cycles a column: descending → ascending → unsorted.
  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key !== key
        ? { key, direction: "desc" }
        : current.direction === "desc"
          ? { key, direction: "asc" }
          : null,
    );

  const visibleRowKeys = filteredData.map(getRowKey);
  const selectedVisibleCount = visibleRowKeys.filter((rowKey) =>
    selectedRowIds?.has(rowKey),
  ).length;
  const allVisibleSelected =
    visibleRowKeys.length > 0 && selectedVisibleCount === visibleRowKeys.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleSelection = (rowKey: string | number) => {
    if (!selectedRowIds || !onSelectionChange) return;
    const next = new Set(selectedRowIds);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    onSelectionChange(next);
  };

  const toggleAllVisible = () => {
    if (!selectedRowIds || !onSelectionChange) return;
    const next = new Set(selectedRowIds);
    visibleRowKeys.forEach((rowKey) => {
      if (allVisibleSelected) next.delete(rowKey);
      else next.add(rowKey);
    });
    onSelectionChange(next);
  };

  const renderActions = (row: T, compact = false) => (
    <div
      className={compact ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}
    >
      {actions?.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(row);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/70 px-3 py-2 text-xs font-bold text-black shadow-sm transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:text-sm"
        >
          {action.icon && (
            <span className="flex h-4 w-4 items-center justify-center text-black dark:text-white/70">
              {action.icon}
            </span>
          )}
          <span className="min-w-0 whitespace-normal break-words text-center">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );

  const renderMobileCards = () => {
    if (isLoading) {
      return (
        <div className="rounded-2xl border border-white/10 p-5 text-center text-sm text-slate-500 dark:text-white/50">
          Loading...
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 p-5 text-center text-sm text-slate-500 dark:text-white/50">
          {emptyMessage}
        </div>
      );
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
                {isSelectable && (
                  <input
                    type="checkbox"
                    checked={Boolean(selectedRowIds?.has(rowKey))}
                    onChange={() => toggleSelection(rowKey)}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-1 h-4 w-4 flex-shrink-0 rounded border-slate-300 accent-sky-500"
                    aria-label={`Select row ${rowIndex + 1}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500 dark:text-white/45">
                    {primary.header}
                  </p>
                  <div className="mt-1 truncate text-sm font-black text-neutral-950 dark:text-white">
                    {renderCellValue(row, primary, rowIndex)}
                  </div>
                  {secondary && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-white/60">
                      <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-white/35">
                        {secondary.header}:{" "}
                      </span>
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
                    {expandedRow === rowKey ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {remaining.map((col) => (
                  <div
                    key={String(col.key)}
                    className="rounded-xl bg-slate-100/70 px-3 py-2 dark:bg-white/5"
                  >
                    <p className="text-[0.62rem] font-black uppercase tracking-wide text-slate-500 dark:text-white/40">
                      {col.header}
                    </p>
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
          {headerActions && (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
            </div>
          )}
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

      <div className="block p-3 md:hidden">{renderMobileCards()}</div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[900px] w-full table-auto">
          <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
            <tr>
              {isSelectable && (
                <th className="w-12 px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 rounded border-slate-300 accent-sky-500"
                    aria-label="Select all visible rows"
                  />
                </th>
              )}
              {columns.map((col) => {
                const key = String(col.key);
                const direction = sort?.key === key ? sort.direction : null;
                return (
                  <th
                    key={key}
                    aria-sort={
                      direction === "asc"
                        ? "ascending"
                        : direction === "desc"
                          ? "descending"
                          : undefined
                    }
                    className={`whitespace-nowrap px-4 py-4 text-left text-xs font-semibold uppercase text-black dark:text-white/60 ${col.headerClassName ?? ""}`}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1 uppercase hover:text-blue-700 dark:hover:text-white"
                      >
                        {col.header}
                        {direction === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : direction === "desc" ? (
                          <ArrowDown
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowUpDown
                            className="h-3.5 w-3.5 opacity-40"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {hasActionColumn && (
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
                      {isSelectable && (
                        <td className="w-12 px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedRowIds?.has(rowKey))}
                            onChange={() => toggleSelection(rowKey)}
                            onClick={(event) => event.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 accent-sky-500"
                            aria-label={`Select row ${rowIndex + 1}`}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={`${col.wrap ? "" : "max-w-[240px]"} px-4 py-4 align-top text-sm leading-relaxed text-black dark:text-white/80 ${
                            col.className ?? ""
                          }`}
                        >
                          <div
                            className={
                              col.wrap
                                ? "min-w-0 break-words"
                                : "min-w-0 truncate"
                            }
                          >
                            {renderCellValue(row, col, rowIndex)}
                          </div>
                        </td>
                      ))}
                      {hasActionColumn && (
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
                    {hasActions && actionsBelowRow && (
                      <tr className="bg-slate-50/40 dark:bg-white/[0.03]">
                        <td colSpan={colSpan} className="px-4 py-2">
                          <div className="flex min-h-10 flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleRow(rowKey);
                              }}
                              className="sticky left-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-black shadow-sm transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                              aria-expanded={isExpanded}
                            >
                              <span>{actionsLabel}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -8 }}
                                  transition={{ duration: 0.16 }}
                                >
                                  {renderActions(row)}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </tr>
                    )}
                    <AnimatePresence>
                      {hasActionColumn && isExpanded && (
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
