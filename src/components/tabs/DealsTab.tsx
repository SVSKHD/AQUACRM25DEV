import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Edit2,
  Plus,
  RefreshCw,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { dealsService, leadsService } from "../../services/apiService";
import { useToast } from "../Toast";
import TabInnerContent from "../Layout/tabInnerlayout";
import { extractArrayPayload } from "../../utils/apiPayload";
import ResizableFloatingSidebar from "../ui/ResizableFloatingSidebar";
import {
  LiquidBadge,
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidPanel,
  LiquidTextarea,
} from "../ui/liquid";

type DealStage =
  | "prospecting"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

type LeadOption = {
  id: string;
  contact_name: string;
  phone?: string;
  status?: string;
};

interface Deal {
  id: string;
  _id?: string;
  title: string;
  amount: number;
  stage: DealStage;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  created_at?: string;
  lead_id?: LeadOption | string | null;
  customer_id?: string;
  customer_type?: string;
  quotation_id?: string | null;
  order_id?: string;
  order_type?: string;
  lost_reason?: {
    category?: string;
    details?: string;
    competitor?: string;
    lost_at?: string | null;
  };
}

type DealForm = {
  title: string;
  amount: string;
  stage: DealStage;
  probability: string;
  expected_close_date: string;
  notes: string;
  lead_id: string;
  customer_id: string;
  customer_type: string;
  quotation_id: string;
  order_id: string;
  order_type: string;
  lost_reason_category: string;
  lost_reason_details: string;
  lost_reason_competitor: string;
};

const stageOptions = [
  { value: "prospecting", label: "Prospecting" },
  { value: "qualification", label: "Qualification" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed won" },
  { value: "closed_lost", label: "Closed lost" },
];

const lostReasonOptions = [
  { value: "", label: "Select reason" },
  { value: "price", label: "Price" },
  { value: "competitor", label: "Competitor" },
  { value: "no_response", label: "No response" },
  { value: "postponed", label: "Postponed" },
  { value: "unsuitable", label: "Unsuitable" },
  { value: "location", label: "Location" },
  { value: "budget", label: "Budget" },
  { value: "duplicate", label: "Duplicate" },
  { value: "other", label: "Other" },
];

const emptyForm = (): DealForm => ({
  title: "",
  amount: "",
  stage: "prospecting",
  probability: "0",
  expected_close_date: "",
  notes: "",
  lead_id: "",
  customer_id: "",
  customer_type: "",
  quotation_id: "",
  order_id: "",
  order_type: "",
  lost_reason_category: "",
  lost_reason_details: "",
  lost_reason_competitor: "",
});

const unwrapList = (data: any): any[] => extractArrayPayload<any>(data);

const normalizeDeal = (item: any): Deal => ({
  ...item,
  id: item.id || item._id,
  _id: item._id || item.id,
  amount: Number(item.amount) || 0,
  probability: Number(item.probability) || 0,
});

const leadIdOf = (value: Deal["lead_id"]) =>
  typeof value === "string" ? value : value?.id || (value as any)?._id || "";

const leadLabel = (value: Deal["lead_id"]) => {
  if (!value) return "No linked lead";
  if (typeof value === "string") return value;
  return `${value.contact_name || "Lead"}${value.phone ? ` · ${value.phone}` : ""}`;
};

const stageClass = (stage: DealStage) => {
  if (stage === "closed_won")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (stage === "closed_lost")
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
  if (stage === "proposal" || stage === "negotiation")
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300";
};

const formFromDeal = (deal: Deal): DealForm => ({
  title: deal.title || "",
  amount: String(deal.amount || ""),
  stage: deal.stage || "prospecting",
  probability: String(deal.probability ?? 0),
  expected_close_date: deal.expected_close_date
    ? deal.expected_close_date.slice(0, 10)
    : "",
  notes: deal.notes || "",
  lead_id: leadIdOf(deal.lead_id),
  customer_id: deal.customer_id || "",
  customer_type: deal.customer_type || "",
  quotation_id:
    typeof deal.quotation_id === "string"
      ? deal.quotation_id
      : (deal.quotation_id as any)?._id || "",
  order_id: deal.order_id || "",
  order_type: deal.order_type || "",
  lost_reason_category: deal.lost_reason?.category || "",
  lost_reason_details: deal.lost_reason?.details || "",
  lost_reason_competitor: deal.lost_reason?.competitor || "",
});

export default function DealsTab() {
  const { showToast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchDeals = async () => {
    setLoading(true);
    const response = await dealsService.getAll({
      stage: stageFilter === "all" ? undefined : stageFilter,
      search: search || undefined,
    });
    setLoading(false);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    setDeals(unwrapList(response.data).map(normalizeDeal));
  };

  const fetchLeads = async () => {
    const response = await leadsService.getAll({ sort: "score" });
    if (response.error) return;
    setLeadOptions(
      unwrapList(response.data).map((lead: any) => ({
        id: lead.id || lead._id,
        contact_name: lead.contact_name || "Lead",
        phone: lead.phone || "",
        status: lead.status || "",
      })),
    );
  };

  useEffect(() => {
    fetchLeads();
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter]);

  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals;
    const value = search.toLowerCase();
    return deals.filter((deal) =>
      [
        deal.title,
        deal.notes,
        leadLabel(deal.lead_id),
        deal.customer_id,
        deal.quotation_id,
        deal.order_id,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [deals, search]);

  const totalPipeline = deals
    .filter((deal) => !["closed_won", "closed_lost"].includes(deal.stage))
    .reduce((sum, deal) => sum + deal.amount, 0);
  const weightedPipeline = deals
    .filter((deal) => !["closed_won", "closed_lost"].includes(deal.stage))
    .reduce((sum, deal) => sum + deal.amount * (deal.probability / 100), 0);

  const openCreate = () => {
    setEditingDeal(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setForm(formFromDeal(deal));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingDeal(null);
    setForm(emptyForm());
  };

  const saveDeal = async () => {
    if (!form.title.trim()) {
      showToast("Deal title is required", "error");
      return;
    }
    if (form.stage === "closed_lost" && !form.lost_reason_category) {
      showToast("Lost reason is required", "error");
      return;
    }

    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount) || 0,
      stage: form.stage,
      probability: Math.min(100, Math.max(0, Number(form.probability) || 0)),
      expected_close_date: form.expected_close_date || null,
      notes: form.notes.trim(),
      lead_id: form.lead_id || null,
      customer_id: form.customer_id.trim(),
      customer_type: form.customer_type,
      quotation_id: form.quotation_id || null,
      order_id: form.order_id.trim(),
      order_type: form.order_type,
      ...(form.stage === "closed_lost"
        ? {
            lost_reason: {
              category: form.lost_reason_category,
              details: form.lost_reason_details.trim(),
              competitor: form.lost_reason_competitor.trim(),
            },
          }
        : {}),
    };

    setSaving(true);
    const response = editingDeal
      ? await dealsService.update(editingDeal.id, payload)
      : await dealsService.create(payload);
    setSaving(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast(editingDeal ? "Deal updated" : "Deal created", "success");
    closeForm();
    fetchDeals();
  };

  const deleteDeal = async (deal: Deal) => {
    if (!window.confirm(`Delete deal ${deal.title}?`)) return;
    const response = await dealsService.delete(deal.id);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast("Deal deleted", "success");
    fetchDeals();
  };

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Deals"
        description="Lead-linked Aquakart opportunities, quotations and closing outcomes"
      >
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Open pipeline
              </p>
              <p className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">
                ₹{totalPipeline.toLocaleString("en-IN")}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Weighted value
              </p>
              <p className="mt-1 text-2xl font-black text-blue-600">
                ₹{Math.round(weightedPipeline).toLocaleString("en-IN")}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Won
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-600">
                {deals.filter((deal) => deal.stage === "closed_won").length}
              </p>
            </LiquidPanel>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_.55fr_auto]">
            <LiquidInput
              aria-label="Search deals"
              placeholder="Search deal, lead, customer, quote..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <LiquidDropdown
              value={stageFilter}
              options={[
                { value: "all", label: "All stages" },
                ...stageOptions,
              ]}
              onChange={setStageFilter}
            />
            <div className="flex gap-2">
              <LiquidButton type="button" variant="soft" onClick={fetchDeals}>
                <RefreshCw className="h-4 w-4" />
              </LiquidButton>
              <LiquidButton type="button" variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add deal
              </LiquidButton>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading deals…
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredDeals.map((deal) => (
                <LiquidPanel key={deal.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                        <h3 className="truncate text-lg font-black text-neutral-950 dark:text-white">
                          {deal.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-2xl font-black text-emerald-600">
                        ₹{deal.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <LiquidBadge className={stageClass(deal.stage)}>
                      {stageOptions.find((option) => option.value === deal.stage)
                        ?.label || deal.stage}
                    </LiquidBadge>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Probability</span>
                      <span className="font-bold text-neutral-950 dark:text-white">
                        {deal.probability}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-white/60">
                    <p>{leadLabel(deal.lead_id)}</p>
                    {deal.expected_close_date && (
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(deal.expected_close_date).toLocaleDateString(
                          "en-IN",
                        )}
                      </p>
                    )}
                    {deal.quotation_id && (
                      <p className="truncate text-xs">
                        Quote:{" "}
                        {typeof deal.quotation_id === "string"
                          ? deal.quotation_id
                          : (deal.quotation_id as any)?.quotationNo || "Linked"}
                      </p>
                    )}
                  </div>

                  {deal.notes && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                      {deal.notes}
                    </p>
                  )}

                  {deal.stage === "closed_lost" && (
                    <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                      Lost: {deal.lost_reason?.category || "—"}
                      {deal.lost_reason?.competitor
                        ? ` · ${deal.lost_reason.competitor}`
                        : ""}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <LiquidButton
                      type="button"
                      variant="soft"
                      className="flex-1"
                      onClick={() => openEdit(deal)}
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </LiquidButton>
                    <LiquidButton
                      type="button"
                      variant="danger"
                      onClick={() => deleteDeal(deal)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </LiquidButton>
                  </div>
                </LiquidPanel>
              ))}
            </div>
          )}
        </div>
      </TabInnerContent>

      {formOpen && (
        <ResizableFloatingSidebar
          open
          onClose={closeForm}
          title={editingDeal ? "Edit deal" : "New deal"}
          subtitle="Link the opportunity to a CRM lead and downstream sale records"
          widthStorageKey="aquacrm:deal-form-width"
          initialWidth={700}
          minWidth={520}
          maxWidth={920}
        >
          <div className="space-y-5">
            <LiquidPanel className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <LiquidInput
                  wrapperClassName="sm:col-span-2"
                  label="Deal title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Amount"
                  type="number"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Probability %"
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      probability: event.target.value,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Stage"
                  value={form.stage}
                  options={stageOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      stage: value as DealStage,
                    }))
                  }
                />
                <LiquidInput
                  label="Expected close"
                  type="date"
                  value={form.expected_close_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expected_close_date: event.target.value,
                    }))
                  }
                />
              </div>
              <LiquidTextarea
                wrapperClassName="mt-3"
                label="Notes"
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </LiquidPanel>

            <LiquidPanel className="p-4">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Relationships
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LiquidDropdown
                  wrapperClassName="sm:col-span-2"
                  label="Lead"
                  value={form.lead_id}
                  options={[
                    { value: "", label: "No linked lead" },
                    ...leadOptions.map((lead) => ({
                      value: lead.id,
                      label: `${lead.contact_name}${lead.phone ? ` · ${lead.phone}` : ""}`,
                    })),
                  ]}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, lead_id: value }))
                  }
                />
                <LiquidInput
                  label="Customer ID"
                  value={form.customer_id}
                  placeholder="online ID or offline:..."
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customer_id: event.target.value,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Customer type"
                  value={form.customer_type}
                  options={[
                    { value: "", label: "Not specified" },
                    { value: "online", label: "Online" },
                    { value: "offline", label: "Offline" },
                  ]}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      customer_type: value,
                    }))
                  }
                />
                <LiquidInput
                  label="Quotation ID"
                  value={form.quotation_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quotation_id: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Order ID"
                  value={form.order_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      order_id: event.target.value,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Order type"
                  value={form.order_type}
                  options={[
                    { value: "", label: "Not specified" },
                    { value: "crm", label: "CRM order" },
                    { value: "ecommerce", label: "Ecommerce order" },
                  ]}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      order_type: value,
                    }))
                  }
                />
              </div>
            </LiquidPanel>

            {form.stage === "closed_lost" && (
              <LiquidPanel className="border-rose-200 p-4 dark:border-rose-500/20">
                <h3 className="font-black text-rose-600">Lost reason</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <LiquidDropdown
                    label="Reason"
                    value={form.lost_reason_category}
                    options={lostReasonOptions}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        lost_reason_category: value,
                      }))
                    }
                  />
                  <LiquidInput
                    label="Competitor"
                    value={form.lost_reason_competitor}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lost_reason_competitor: event.target.value,
                      }))
                    }
                  />
                </div>
                <LiquidTextarea
                  wrapperClassName="mt-3"
                  label="Details"
                  rows={2}
                  value={form.lost_reason_details}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lost_reason_details: event.target.value,
                    }))
                  }
                />
              </LiquidPanel>
            )}

            <div className="sticky bottom-0 -mx-5 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
              <div className="flex justify-end gap-2">
                <LiquidButton type="button" variant="ghost" onClick={closeForm}>
                  Cancel
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="primary"
                  disabled={saving}
                  onClick={saveDeal}
                >
                  {saving ? "Saving…" : editingDeal ? "Update deal" : "Create deal"}
                </LiquidButton>
              </div>
            </div>
          </div>
        </ResizableFloatingSidebar>
      )}
    </div>
  );
}
