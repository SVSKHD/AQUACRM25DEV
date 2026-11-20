import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import AquaGenericTable, {
  type AquaTableAction,
  type AquaTableColumn,
} from "../modular/invoices/invoiceTable";
import {
  LiquidBadge,
  LiquidButton,
  LiquidDropdown,
  LiquidIconButton,
  LiquidInput,
  LiquidPanel,
} from "../ui/liquid";
import PreInvoiceFormDialog from "../modular/preinvoices/PreInvoiceFormDialog";
import PreInvoiceDetailDialog from "../modular/preinvoices/PreInvoiceDetailDialog";
import {
  usePreInvoiceAccess,
  type PreInvoiceAccess,
} from "../../hooks/usePreInvoiceAccess";
import {
  preInvoicesService,
  type Pagination,
  type PreInvoiceWithLink,
} from "../../services/preInvoicesService";
import { paymentLinksService } from "../../services/paymentLinksService";
import {
  formatDocDate,
  formatInr,
  preInvoiceRowLinkAction,
  preInvoiceStatusTone,
  PRE_INVOICE_STATUSES,
  type PreInvoice,
} from "../../utils/preInvoice";
import {
  linkStatusSummary,
  paymentLinkErrorMessage,
  toneClass,
  type PaymentLinkState,
} from "../../utils/paymentLink";

// Pre-invoices: payable documents (AQPI|…) the customer pays online through a
// payment link; the backend creates the final invoice after payment.

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...PRE_INVOICE_STATUSES.map((status) => ({ value: status, label: status })),
];

/** undefined → still loading; null → no link. */
type LinkMap = Record<string, PaymentLinkState | null | undefined>;

export default function PreInvoicesTab({
  openId,
  onOpenHandled,
  onOpenQuotation,
}: {
  /** Pre-invoice to open on arrival (from ?preInvoice=…). */
  openId?: string | null;
  onOpenHandled?: () => void;
  onOpenQuotation: (quotationId: string) => void;
}) {
  const access = usePreInvoiceAccess();

  if (access.canRead === undefined)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  if (!access.canRead) return <PreInvoicesNoAccess />;
  return (
    <PreInvoicesList
      access={access}
      openId={openId}
      onOpenHandled={onOpenHandled}
      onOpenQuotation={onOpenQuotation}
    />
  );
}

export function PreInvoicesNoAccess() {
  return (
    <TabInnerContent title="Pre-invoices">
      <div className="glass-card mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
        <Lock className="h-8 w-8 text-slate-400" aria-hidden="true" />
        <p className="text-sm text-slate-600 dark:text-white/60">
          You need the <code className="font-mono">preinvoices.read</code>{" "}
          permission to view pre-invoices.
        </p>
      </div>
    </TabInnerContent>
  );
}

type FormState = {
  preInvoice: PreInvoice | null;
  link: PaymentLinkState | null;
} | null;

function PreInvoicesList({
  access,
  openId,
  onOpenHandled,
  onOpenQuotation,
}: {
  access: PreInvoiceAccess;
  openId?: string | null;
  onOpenHandled?: () => void;
  onOpenQuotation: (quotationId: string) => void;
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState<PreInvoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkMap>({});
  const [form, setForm] = useState<FormState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState(0);
  // Rows with a WhatsApp send in flight (stops double clicks).
  const [sending, setSending] = useState<ReadonlySet<string>>(new Set());

  const canLinks = access.canManageLinks === true;

  const load = useCallback(async () => {
    setLoading(true);
    const response = await preInvoicesService.list({
      page,
      limit: PAGE_SIZE,
      status: status === "all" ? undefined : status,
      search: search.trim() || undefined,
    });
    setLoading(false);
    if (response.error || !response.data) {
      setLoadError(response.error || "Couldn't load pre-invoices.");
      return;
    }
    setLoadError(null);
    setItems(response.data.items);
    setPagination(response.data.pagination);
  }, [page, status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // Link state isn't in the list response: fetch it for this page only.
  useEffect(() => {
    if (!canLinks || !items.length) return;
    let active = true;
    setLinks(Object.fromEntries(items.map((item) => [item._id, undefined])));
    void Promise.all(
      items.map(async (item) => {
        const response = await paymentLinksService.get("pre_invoice", item._id);
        return [
          item._id,
          response.error ? null : (response.data ?? null),
        ] as const;
      }),
    ).then((entries) => {
      if (active) setLinks(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [items, canLinks]);

  useEffect(() => {
    if (!openId) return;
    setDetailId(openId);
    onOpenHandled?.();
  }, [openId, onOpenHandled]);

  const handleSaved = (result: PreInvoiceWithLink, created: boolean) => {
    setForm(null);
    showToast(
      `${result.preInvoice.preInvoiceNo} ${created ? "created" : "saved"}`,
      "success",
    );
    setDetailId(result.preInvoice._id);
    setDetailKey((key) => key + 1);
    void load();
  };

  const columns: AquaTableColumn<PreInvoice>[] = [
    {
      key: "preInvoiceNo",
      header: "Number",
      render: (row) => (
        <span className="font-mono text-[13px] font-semibold text-aqua-tx">
          {row.preInvoiceNo}
        </span>
      ),
      filterValue: (row) => row.preInvoiceNo,
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <span>
          <span className="font-semibold">{row.customerDetails.name}</span>
          {row.sourceQuotationNo && (
            <span className="block text-xs text-aqua-tx3">
              From {row.sourceQuotationNo}
            </span>
          )}
        </span>
      ),
      filterValue: (row) => row.customerDetails.name,
    },
    {
      key: "totalAmount",
      header: "Total",
      align: "right",
      render: (row) => (
        <span className="font-semibold tabular-nums">
          {formatInr(row.totalAmount)}
        </span>
      ),
      sortValue: (row) => row.totalAmount,
      filterValue: () => "",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <LiquidBadge className={preInvoiceStatusTone(row.status)}>
          {row.status}
        </LiquidBadge>
      ),
      filterValue: (row) => row.status,
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => (
        <LiquidBadge
          className={preInvoiceStatusTone(
            row.payment.status === "Paid" ? "Paid" : "Draft",
          )}
        >
          {row.payment.status}
        </LiquidBadge>
      ),
      filterValue: () => "",
    },
    {
      key: "link",
      header: "Link",
      render: (row) => {
        if (!canLinks) return <span className="text-aqua-tx3">—</span>;
        const link = links[row._id];
        if (link === undefined) return <span className="text-aqua-tx3">…</span>;
        const summary = linkStatusSummary(link);
        return (
          <LiquidBadge className={toneClass[summary.tone]}>
            {summary.label}
          </LiquidBadge>
        );
      },
      filterValue: () => "",
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => (
        <span className="tabular-nums">{formatDocDate(row.createdAt)}</span>
      ),
      sortValue: (row) => row.createdAt || "",
      filterValue: () => "",
    },
  ];

  // Row "Send link": WhatsApp payment-link template. Re-sends the active
  // link, or creates one (the backend sends a new link on creation).
  const sendLink = async (row: PreInvoice) => {
    const action = preInvoiceRowLinkAction(row, links[row._id]);
    if (!action || sending.has(row._id)) return;
    setSending((current) => new Set(current).add(row._id));
    const done = () =>
      setSending((current) => {
        const next = new Set(current);
        next.delete(row._id);
        return next;
      });
    if (action === "send") {
      const response = await paymentLinksService.send("pre_invoice", row._id);
      done();
      if (response.error) {
        showToast(paymentLinkErrorMessage(response), "error");
        return;
      }
      showToast(
        `Payment link for ${row.preInvoiceNo} sent to ${row.customerDetails.name} on WhatsApp`,
        "success",
      );
      if (response.data?.link)
        setLinks((current) => ({ ...current, [row._id]: response.data!.link }));
      return;
    }
    const response = await paymentLinksService.create("pre_invoice", row._id);
    done();
    if (response.error || !response.data) {
      showToast(paymentLinkErrorMessage(response), "error");
      return;
    }
    setLinks((current) => ({ ...current, [row._id]: response.data!.link }));
    if (response.data.customerNotification === "queued")
      showToast(
        `Payment link for ${row.preInvoiceNo} created and sent to ${row.customerDetails.name} on WhatsApp`,
        "success",
      );
    else
      showToast(
        `Payment link for ${row.preInvoiceNo} created, but it wasn't sent on WhatsApp${
          response.data.customerNotification === "not_configured"
            ? " (template not set up on the server)"
            : ""
        }. Open it to share the link.`,
        "info",
      );
  };

  const actions: AquaTableAction<PreInvoice>[] = [
    {
      label: "Open",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => {
        setDetailId(row._id);
        setDetailKey((key) => key + 1);
      },
    },
    {
      label: "Send link",
      icon: <Send className="h-4 w-4" />,
      onClick: (row) => void sendLink(row),
      hidden: (row) =>
        !canLinks || preInvoiceRowLinkAction(row, links[row._id]) !== "send",
    },
    {
      label: "Create & send link",
      icon: <Send className="h-4 w-4" />,
      onClick: (row) => void sendLink(row),
      hidden: (row) =>
        !canLinks || preInvoiceRowLinkAction(row, links[row._id]) !== "create",
    },
  ];

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Pre-invoices"
        description="Payable documents the customer pays online; the invoice is created after payment"
      >
        <div className="space-y-5 p-4 sm:p-5">
          <LiquidPanel className="p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
              <LiquidInput
                label="Search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
                placeholder="Pre-invoice no., customer or quotation no."
              />
              <LiquidDropdown
                label="Status"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(value) => {
                  setPage(1);
                  setStatus(value);
                }}
              />
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <LiquidButton
                  type="button"
                  variant="soft"
                  onClick={() => void load()}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="soft"
                  onClick={applySearch}
                >
                  <Search className="h-4 w-4" />
                  Search
                </LiquidButton>
                {access.canManage && (
                  <LiquidButton
                    type="button"
                    variant="primary"
                    onClick={() => setForm({ preInvoice: null, link: null })}
                  >
                    <Plus className="h-4 w-4" />
                    New pre-invoice
                  </LiquidButton>
                )}
              </div>
            </div>
          </LiquidPanel>

          {loadError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
            >
              {loadError}
            </p>
          )}

          <AquaGenericTable
            heading="Pre-invoices"
            subHeading={`${pagination.total} in total`}
            columns={columns}
            data={items}
            isLoading={loading}
            emptyMessage="No pre-invoices"
            emptyHint="Create one, or move a quotation to a pre-invoice."
            onRowClick={(row) => {
              setDetailId(row._id);
              setDetailKey((key) => key + 1);
            }}
            actions={actions}
            getRowId={(row) => row._id}
            pageSizeOptions={[PAGE_SIZE]}
          />

          <div className="flex items-center justify-end gap-2">
            <LiquidIconButton
              type="button"
              aria-label="Previous page"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </LiquidIconButton>
            <span className="min-w-20 text-center text-xs font-bold text-neutral-950 dark:text-white">
              {pagination.page} / {pagination.totalPages}
            </span>
            <LiquidIconButton
              type="button"
              aria-label="Next page"
              disabled={page >= pagination.totalPages || loading}
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1),
                )
              }
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </LiquidIconButton>
          </div>
        </div>
      </TabInnerContent>

      {detailId && (
        <PreInvoiceDetailDialog
          key={`${detailId}-${detailKey}`}
          preInvoiceId={detailId}
          access={access}
          onClose={() => setDetailId(null)}
          onEdit={(doc, link) => {
            setDetailId(null);
            setForm({ preInvoice: doc, link });
          }}
          onChanged={() => void load()}
          onOpenQuotation={(quotationId) => {
            setDetailId(null);
            onOpenQuotation(quotationId);
          }}
        />
      )}

      {access.canManage && form && (
        <PreInvoiceFormDialog
          preInvoice={form.preInvoice}
          activeLink={form.link}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
