import React, { ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Inbox,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidIconButton,
  LiquidInput,
  LiquidSelect,
} from "../../ui/liquid";

type CellRenderer<T> = (row: T, index: number) => ReactNode;

export interface AquaTableColumn<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: CellRenderer<T>;
  /** Text the filter box matches; needed when `render` returns JSX. */
  filterValue?: (row: T) => string;
  /** Makes the header a sort control for this value. */
  sortValue?: (row: T) => string | number;
  /** Lets the cell grow and wrap onto several lines instead of truncating at 240px. */
  wrap?: boolean;
  /** Classes for the header cell, e.g. a minimum width for a wrapping column. */
  headerClassName?: string;
  /** Right-align numbers and money (header and cell). */
  align?: "left" | "right";
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

export interface AquaTableAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: ReactNode;
  /** "danger" styles destructive actions such as Delete. */
  tone?: "danger";
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
  pageSizeOptions?: number[];
  /** Controls shown next to the record count (e.g. a "Select" mode toggle). */
  headerActions?: ReactNode;
  /** Existing filter controls (dropdowns) placed in the header, before the search box. */
  headerFilters?: ReactNode;
  /** Second line of the empty state; defaults to a search hint while filtering. */
  emptyHint?: string;
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
  pageSizeOptions = [10, 25, 50],
  headerActions,
  headerFilters,
  emptyHint,
}: AquaGenericTableProps<T>) {
  const hasActions = Boolean(actions && actions.length > 0);
  const isSelectable = Boolean(selectedRowIds && onSelectionChange);
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);
  const [filterText, setFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] || 10);
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
    // Sorting happens before pagination so every page follows the same order.
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

  // Clicking a sortable header cycles descending → ascending → unsorted.
  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key !== key
        ? { key, direction: "desc" }
        : current.direction === "desc"
          ? { key, direction: "asc" }
          : null,
    );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(
    () =>
      filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredData, pageSize],
  );
  const firstResult = filteredData.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const lastResult = Math.min(currentPage * pageSize, filteredData.length);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedRow(null);
  }, [filterText, pageSize, data, sort]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const visibleRowKeys = paginatedData.map(getRowKey);
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
      className={
        compact ? "grid grid-cols-2 gap-2" : "flex flex-wrap justify-end gap-2"
      }
    >
      {actions?.map((action) => (
        <LiquidButton
          key={action.label}
          type="button"
          variant="soft"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(row);
          }}
          className={`aqua-ctl ${action.tone === "danger" ? "aqua-ctl-danger" : ""} ${
            compact
              ? "!min-h-11 !justify-start !px-3 !py-0 text-xs"
              : "!min-h-[34px] !px-3 !py-0 text-xs"
          }`}
        >
          {action.icon && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {action.icon}
            </span>
          )}
          <span className="truncate">{action.label}</span>
        </LiquidButton>
      ))}
    </div>
  );

  const hint =
    emptyHint ?? (filterText ? "Try another filter, or clear the search." : "");
  const renderEmpty = (compact = false) => (
    <div
      className={`flex flex-col items-center gap-2.5 text-center ${compact ? "rounded-[18px] border border-dashed border-aqua-line2 px-4 py-12" : "px-5 py-14"}`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-aqua-accsoft text-aqua-acctx">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-aqua-tx">{emptyMessage}</p>
      {hint && <p className="text-xs text-aqua-tx3">{hint}</p>}
    </div>
  );

  const renderMobileCards = () => {
    if (isLoading) {
      return (
        <div className="space-y-2.5" aria-busy="true">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex h-[118px] flex-col gap-2.5 rounded-[18px] border border-aqua-cardbd bg-aqua-card p-4"
            >
              <span className="aqua-skeleton h-3 w-1/2" />
              <span className="aqua-skeleton h-2.5 w-2/3" />
              <span className="aqua-skeleton h-[22px] w-2/5 !rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    if (filteredData.length === 0) return renderEmpty(true);

    return (
      <div className="space-y-2.5">
        {paginatedData.map((row, rowIndex) => {
          const rowKey = getRowKey(row, rowIndex);
          const primary = columns[0];
          const secondary = columns[1];
          const remaining = columns.slice(2);
          const isExpanded = expandedRow === rowKey;

          return (
            <div
              key={rowKey}
              role={onRowClick ? "button" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`overflow-hidden rounded-[18px] border bg-aqua-card shadow-aqua-card ${
                isExpanded ? "border-aqua-accsoft2" : "border-aqua-cardbd"
              } ${onRowClick ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-start gap-2.5 py-3.5 pl-4 pr-2.5">
                {isSelectable && (
                  <LiquidCheckbox
                    checked={Boolean(selectedRowIds?.has(rowKey))}
                    onChange={() => toggleSelection(rowKey)}
                    onClick={(event) => event.stopPropagation()}
                    wrapperClassName="mt-1 flex-shrink-0"
                    ariaLabel={`Select row ${rowIndex + 1}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-aqua-tx3">
                    {primary.header}
                  </p>
                  <div className="mt-0.5 truncate text-[13px] font-bold tabular-nums text-aqua-tx">
                    {renderCellValue(row, primary, rowIndex)}
                  </div>
                  {secondary && (
                    <div className="mt-1.5 min-w-0 text-xs text-aqua-tx2">
                      <span className="font-semibold uppercase tracking-[0.06em] text-aqua-tx3">
                        {secondary.header}:{" "}
                      </span>
                      <span>{renderCellValue(row, secondary, rowIndex)}</span>
                    </div>
                  )}
                </div>
                {hasActions && (
                  <LiquidIconButton
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(rowKey);
                    }}
                    className="aqua-ctl h-11 w-11 flex-shrink-0 text-aqua-tx2"
                    aria-label={`${actionsLabel} menu`}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </LiquidIconButton>
                )}
              </div>

              {remaining.length > 0 && (
                <div className="grid grid-cols-2 gap-2 px-4 pb-3.5">
                  {remaining.map((col) => (
                    <div
                      key={String(col.key)}
                      className="min-w-0 rounded-xl bg-aqua-sunk px-3 py-2"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-aqua-tx3">
                        {col.header}
                      </p>
                      <div className="mt-1 min-w-0 truncate text-xs font-semibold tabular-nums text-aqua-tx">
                        {renderCellValue(row, col, rowIndex)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {hasActions && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-aqua-line bg-aqua-sunk px-4 pb-4 pt-3">
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

  const headerCell =
    "px-4 py-2.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-aqua-tx3";

  return (
    <div className="aqua-table-card">
      <div className="border-b border-aqua-line px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:flex-1">
            <h2 className="truncate text-base font-bold leading-[22px] text-aqua-tx">
              {heading}
            </h2>
            {subHeading && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-aqua-tx3">
                {subHeading}
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
            {headerFilters}
            {enableFilter && (
              <div className="relative min-w-0 flex-1 lg:w-60 lg:flex-none">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-aqua-tx3"
                  aria-hidden="true"
                />
                <LiquidInput
                  type="text"
                  value={filterText}
                  onChange={(e) => {
                    setExpandedRow(null);
                    setFilterText(e.target.value);
                  }}
                  placeholder={filterPlaceholder || "Filter rows"}
                  aria-label={filterPlaceholder || "Filter rows"}
                  className="w-full text-sm"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </div>
            )}
            <span className="ml-auto whitespace-nowrap rounded-full bg-aqua-accsoft px-3 py-1.5 text-xs font-semibold tabular-nums text-aqua-acctx">
              {filteredData.length.toLocaleString("en-IN")} records
            </span>
            {headerActions}
          </div>
        </div>
      </div>

      <div className="block p-3 md:hidden">{renderMobileCards()}</div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] table-auto border-collapse">
          <thead className="border-b border-aqua-line bg-aqua-sunk">
            <tr>
              {isSelectable && (
                <th className="w-12 py-2.5 pl-5 pr-0 text-left">
                  <LiquidCheckbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={toggleAllVisible}
                    ariaLabel="Select all visible rows"
                  />
                </th>
              )}
              {columns.map((col) => {
                const key = String(col.key);
                const direction = sort?.key === key ? sort.direction : null;
                const right = col.align === "right";
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
                    className={`whitespace-nowrap ${headerCell} ${right ? "text-right" : "text-left"} ${col.headerClassName ?? ""}`}
                  >
                    {col.sortValue ? (
                      <LiquidButton
                        type="button"
                        variant="ghost"
                        onClick={() => toggleSort(key)}
                        className={`!-mx-1 !min-h-0 !gap-1 !rounded-md !border-transparent !bg-transparent !px-1 !py-0.5 !text-[11px] !font-semibold uppercase !tracking-[0.08em] !shadow-none hover:!translate-y-0 hover:!scale-100 hover:!bg-aqua-ctlhov ${
                          direction
                            ? "!text-aqua-acctx"
                            : "!text-aqua-tx3 hover:!text-aqua-tx"
                        }`}
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
                            className="h-3.5 w-3.5 opacity-45"
                            aria-hidden="true"
                          />
                        )}
                      </LiquidButton>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {hasActionColumn && (
                <th
                  className={`whitespace-nowrap ${headerCell} !pr-5 text-right`}
                >
                  {actionsLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [0, 1, 2, 3, 4, 5].map((item) => (
                <tr
                  key={item}
                  aria-busy="true"
                  className="border-t border-aqua-line first:border-t-0"
                >
                  {isSelectable && (
                    <td className="py-3.5 pl-5">
                      <span className="aqua-skeleton h-[18px] w-[18px]" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3.5">
                      <span className="aqua-skeleton h-2.5 w-[70%]" />
                      <span className="aqua-skeleton mt-1.5 h-2 w-[45%]" />
                    </td>
                  ))}
                  {hasActionColumn && (
                    <td className="py-3.5 pr-5">
                      <span className="aqua-skeleton ml-auto h-7 w-[84px] !rounded-[10px]" />
                    </td>
                  )}
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>{renderEmpty()}</td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowKey = getRowKey(row, rowIndex);
                const isExpanded = expandedRow === rowKey;
                const isSelected = Boolean(selectedRowIds?.has(rowKey));

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      aria-selected={isSelectable ? isSelected : undefined}
                      className={`aqua-row border-t border-aqua-line first:border-t-0 ${
                        onRowClick ? "aqua-row-clickable cursor-pointer" : ""
                      }`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {isSelectable && (
                        <td className="w-12 py-3.5 pl-5 pr-0 align-top">
                          <LiquidCheckbox
                            checked={isSelected}
                            onChange={() => toggleSelection(rowKey)}
                            onClick={(event) => event.stopPropagation()}
                            ariaLabel={`Select row ${rowIndex + 1}`}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={`${col.wrap ? "" : "max-w-[240px]"} px-4 py-3.5 align-top text-[13px] leading-[18px] tabular-nums text-aqua-tx ${
                            col.align === "right" ? "text-right" : ""
                          } ${col.className ?? ""}`}
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
                        <td className="py-3.5 pl-4 pr-5 text-right align-top">
                          <LiquidButton
                            type="button"
                            variant="soft"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(rowKey);
                            }}
                            aria-expanded={isExpanded}
                            className="aqua-ctl !min-h-8 !gap-1.5 !py-0 !pl-3 !pr-2.5 text-xs"
                          >
                            <span>{actionsLabel}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </LiquidButton>
                        </td>
                      )}
                    </tr>
                    {hasActions && actionsBelowRow && (
                      <tr className="bg-aqua-sunk">
                        <td colSpan={colSpan} className="px-5 py-2">
                          <div className="flex min-h-10 flex-wrap items-center gap-2">
                            <LiquidButton
                              type="button"
                              variant="soft"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleRow(rowKey);
                              }}
                              className="aqua-ctl sticky left-4 !min-h-8 !py-0 !pl-3 !pr-2.5 text-xs"
                              aria-expanded={isExpanded}
                            >
                              <span>{actionsLabel}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </LiquidButton>
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
                        <tr className="bg-aqua-sunk">
                          <td colSpan={colSpan} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-dashed border-aqua-line px-5 pb-3 pt-2.5">
                                {renderActions(row)}
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
      {!isLoading && filteredData.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-aqua-line px-4 py-3 text-xs sm:flex-row sm:items-center sm:px-5">
          <p className="font-semibold tabular-nums text-aqua-tx3">
            Showing {firstResult}–{lastResult} of{" "}
            {filteredData.length.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-between gap-2 sm:ml-auto sm:justify-end">
            <label className="flex items-center gap-2 font-semibold text-aqua-tx3">
              Rows
              <LiquidSelect
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="min-w-20 py-1.5"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </LiquidSelect>
            </label>
            <LiquidIconButton
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="aqua-ctl sm:!h-8 sm:!w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </LiquidIconButton>
            <span className="min-w-12 text-center font-bold tabular-nums text-aqua-tx">
              {currentPage} / {totalPages}
            </span>
            <LiquidIconButton
              type="button"
              aria-label="Next page"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="aqua-ctl sm:!h-8 sm:!w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </LiquidIconButton>
          </div>
        </div>
      )}
    </div>
  );
}

export default AquaGenericTable;
