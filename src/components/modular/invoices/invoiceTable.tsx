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

  return (
    <div className="glass-card shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
              {heading}
            </h2>
            {subHeading && (
              <p className="text-sm text-slate-500 dark:text-white/60">
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
                className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-neutral-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 transition-all"
              />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed break-words">
          <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-4 text-left text-xs font-semibold text-black dark:text-white/60 uppercase"
                >
                  {col.header}
                </th>
              ))}
              {hasActions && (
                <th className="px-4 py-4 text-right text-xs font-semibold text-black dark:text-white/60 uppercase">
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
                          ? "hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                          : ""
                      }
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={`px-4 py-4 text-sm text-black dark:text-white/80 align-top leading-relaxed truncate ${
                            col.className ?? ""
                          }`}
                        >
                          {col.render
                            ? col.render(row, rowIndex)
                            : String(resolveValue(row, col.key) ?? "—")}
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
                            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-black dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-md transition-colors shadow-sm"
                          >
                            <span>{actionsLabel}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-500 dark:text-white/40" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white/40" />
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
                              <div className="px-4 py-3 border-t border-gray-400">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <div className="flex flex-wrap gap-2">
                                    {actions?.map((action) => (
                                      <button
                                        key={action.label}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          action.onClick(row);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 rounded-md border border-white/20 dark:border-white/10 transition-colors shadow-sm"
                                      >
                                        {action.icon && (
                                          <span className="w-4 h-4 flex items-center justify-center text-black dark:text-white/60">
                                            {action.icon}
                                          </span>
                                        )}
                                        <span>{action.label}</span>
                                      </button>
                                    ))}
                                  </div>
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
