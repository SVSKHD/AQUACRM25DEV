import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Droplets,
  Edit2,
  Gauge,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Users,
  Waves,
} from "lucide-react";
import { leadsService } from "../../services/apiService";
import { useToast } from "../Toast";
import TabInnerContent from "../Layout/tabInnerlayout";
import {
  LiquidBadge,
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidPanel,
  LiquidTextarea,
} from "../ui/liquid";
import ResizableFloatingSidebar from "../ui/ResizableFloatingSidebar";
import { extractArrayPayload } from "../../utils/apiPayload";

interface Lead {
  id: string;
  _id?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  payment_status: string;
  created_at: string;
  next_follow_up?: string | null;
  score?: number;
  score_band?: "cold" | "warm" | "hot";
  qualification?: {
    locality?: string;
    pincode?: string;
    water_source?: string;
    hardness_ppm?: number | null;
    hardness_level?: string;
    bathrooms?: number | null;
    residents?: number | null;
    residents_range?: string;
    coverage?: string;
    budget_min?: number | null;
    budget_max?: number | null;
    product_interest?: string;
    urgency?: string;
    water_problem?: string;
    recommended_capacity_liters?: number | null;
    recommended_product_id?: string;
    recommended_product_name?: string;
  };
  lost_reason?: {
    category?: string;
    details?: string;
    competitor?: string;
    lost_at?: string | null;
  };
  stage_history?: Array<{
    _id?: string;
    from?: string;
    to: string;
    changed_at?: string;
    note?: string;
  }>;
  follow_ups?: Array<{
    _id?: string;
    scheduled_for: string;
    status: string;
    note?: string;
    reminder_at?: string | null;
    reminder_status?: string;
    completed_at?: string | null;
  }>;
  last_intake_channel?: string;
  last_intake_at?: string | null;
}

export type PaymentFilter = "all" | "pending" | "cod" | "paid";

type LeadsTabProps = {
  paymentFilter: PaymentFilter;
};

const PIPELINE = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["water_details", "Water details"],
  ["site_visit", "Site visit"],
  ["recommended", "Recommended"],
  ["quote_sent", "Quote sent"],
  ["follow_up", "Follow-up"],
  ["won", "Won"],
  ["lost", "Lost"],
];

const WATER_SOURCES = [
  ["", "Not set"],
  ["borewell", "Borewell"],
  ["municipal", "Municipal"],
  ["tanker", "Tanker"],
  ["mixed", "Mixed"],
  ["unknown", "Unknown"],
];

const PRODUCT_INTERESTS = [
  ["", "Not set"],
  ["manual", "Manual softener"],
  ["automatic", "Automatic softener"],
  ["whole_house", "Whole-house"],
  ["bathroom", "Bathroom"],
  ["unknown", "Unknown"],
];

const URGENCY = [
  ["", "Not set"],
  ["immediate", "Immediate"],
  ["7_days", "Within 7 days"],
  ["30_days", "Within 30 days"],
  ["researching", "Researching"],
  ["unknown", "Unknown"],
];

const LOST_REASONS = [
  ["", "Choose reason"],
  ["price", "Price"],
  ["competitor", "Competitor"],
  ["no_response", "No response"],
  ["postponed", "Postponed"],
  ["unsuitable", "Unsuitable"],
  ["location", "Location"],
  ["budget", "Budget"],
  ["duplicate", "Duplicate"],
  ["other", "Other"],
];

const optionList = (items: string[][]) =>
  items.map(([value, label]) => ({ value, label }));

const initialForm = {
  company_name: "Individual",
  contact_name: "",
  email: "",
  phone: "",
  status: "new",
  source: "",
  notes: "",
  payment_status: "pending",
  qualification: {
    locality: "",
    pincode: "",
    water_source: "",
    hardness_ppm: "",
    hardness_level: "",
    bathrooms: "",
    residents: "",
    residents_range: "",
    coverage: "",
    budget_min: "",
    budget_max: "",
    product_interest: "",
    urgency: "",
    water_problem: "",
    recommended_capacity_liters: "",
    recommended_product_id: "",
    recommended_product_name: "",
  },
  lost_reason: {
    category: "",
    details: "",
    competitor: "",
  },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const formatMoney = (value?: number | string | null) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const scoreClass = (band?: string) => {
  if (band === "hot") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200";
  }
  if (band === "warm") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70";
};

const statusClass = (status?: string) => {
  if (status === "won") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200";
  }
  if (status === "lost") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200";
  }
  if (["quote_sent", "follow_up", "recommended"].includes(status || "")) {
    return "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200";
  }
  return "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200";
};

const toPayload = (form: typeof initialForm) => ({
  company_name: form.company_name.trim() || "Individual",
  contact_name: form.contact_name.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  status: form.status,
  source: form.source.trim(),
  notes: form.notes.trim(),
  payment_status: form.payment_status,
  qualification: {
    locality: form.qualification.locality.trim(),
    pincode: form.qualification.pincode.trim(),
    water_source: form.qualification.water_source,
    hardness_ppm:
      form.qualification.hardness_ppm === ""
        ? null
        : Number(form.qualification.hardness_ppm),
    hardness_level: form.qualification.hardness_level,
    bathrooms:
      form.qualification.bathrooms === ""
        ? null
        : Number(form.qualification.bathrooms),
    residents:
      form.qualification.residents === ""
        ? null
        : Number(form.qualification.residents),
    residents_range: form.qualification.residents_range.trim(),
    coverage: form.qualification.coverage,
    budget_min:
      form.qualification.budget_min === ""
        ? null
        : Number(form.qualification.budget_min),
    budget_max:
      form.qualification.budget_max === ""
        ? null
        : Number(form.qualification.budget_max),
    product_interest: form.qualification.product_interest,
    urgency: form.qualification.urgency,
    water_problem: form.qualification.water_problem.trim(),
    recommended_capacity_liters:
      form.qualification.recommended_capacity_liters === ""
        ? null
        : Number(form.qualification.recommended_capacity_liters),
    recommended_product_id:
      form.qualification.recommended_product_id.trim(),
    recommended_product_name:
      form.qualification.recommended_product_name.trim(),
  },
  ...(form.status === "lost"
    ? {
        lost_reason: {
          category: form.lost_reason.category,
          details: form.lost_reason.details.trim(),
          competitor: form.lost_reason.competitor.trim(),
        },
      }
    : {}),
});

export default function LeadsTab({ paymentFilter }: LeadsTabProps) {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [stageFilter, setStageFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await leadsService.getAll({
      payment_status: paymentFilter === "all" ? undefined : paymentFilter,
      status: stageFilter === "all" ? undefined : stageFilter,
      score_band: scoreFilter === "all" ? undefined : scoreFilter,
      search: search.trim() || undefined,
      sort: "score",
    });

    if (error) {
      showToast(error, "error");
    } else {
      setLeads(extractArrayPayload<Lead>(data));
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentFilter, stageFilter, scoreFilter]);

  const stats = useMemo(
    () => ({
      total: leads.length,
      hot: leads.filter((lead) => lead.score_band === "hot").length,
      followUps: leads.filter((lead) => Boolean(lead.next_follow_up)).length,
      won: leads.filter((lead) => lead.status === "won").length,
    }),
    [leads],
  );

  const openCreate = () => {
    setEditingLead(null);
    setFormData(initialForm);
    setIsFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    const q = lead.qualification || {};
    setEditingLead(lead);
    setFormData({
      company_name: lead.company_name || "Individual",
      contact_name: lead.contact_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status || "new",
      source: lead.source || "",
      notes: lead.notes || "",
      payment_status: lead.payment_status || "pending",
      qualification: {
        locality: q.locality || "",
        pincode: q.pincode || "",
        water_source: q.water_source || "",
        hardness_ppm:
          q.hardness_ppm === null || q.hardness_ppm === undefined
            ? ""
            : String(q.hardness_ppm),
        hardness_level: q.hardness_level || "",
        bathrooms:
          q.bathrooms === null || q.bathrooms === undefined
            ? ""
            : String(q.bathrooms),
        residents:
          q.residents === null || q.residents === undefined
            ? ""
            : String(q.residents),
        residents_range: q.residents_range || "",
        coverage: q.coverage || "",
        budget_min:
          q.budget_min === null || q.budget_min === undefined
            ? ""
            : String(q.budget_min),
        budget_max:
          q.budget_max === null || q.budget_max === undefined
            ? ""
            : String(q.budget_max),
        product_interest: q.product_interest || "",
        urgency: q.urgency || "",
        water_problem: q.water_problem || "",
        recommended_capacity_liters:
          q.recommended_capacity_liters === null ||
          q.recommended_capacity_liters === undefined
            ? ""
            : String(q.recommended_capacity_liters),
        recommended_product_id: q.recommended_product_id || "",
        recommended_product_name: q.recommended_product_name || "",
      },
      lost_reason: {
        category: lead.lost_reason?.category || "",
        details: lead.lost_reason?.details || "",
        competitor: lead.lost_reason?.competitor || "",
      },
    });
    setIsFormOpen(true);
  };

  const saveLead = async () => {
    const payload = toPayload(formData);
    if (!payload.contact_name || (!payload.phone && !payload.email)) {
      showToast("Contact name and phone or email are required", "error");
      return;
    }
    if (payload.status === "lost" && !formData.lost_reason.category) {
      showToast("Choose a lost reason before marking this lead lost", "error");
      return;
    }

    setSaving(true);
    const response = editingLead
      ? await leadsService.update(editingLead.id, payload)
      : await leadsService.create(payload);

    if (response.error) {
      showToast(response.error, "error");
    } else {
      showToast(
        editingLead ? "Lead updated successfully" : "Lead created successfully",
        "success",
      );
      setIsFormOpen(false);
      setEditingLead(null);
      await fetchLeads();
    }
    setSaving(false);
  };

  const deleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete lead ${lead.contact_name}?`)) return;
    const response = await leadsService.delete(lead.id);
    if (response.error) showToast(response.error, "error");
    else {
      showToast("Lead deleted", "success");
      if (selected?.id === lead.id) setSelected(null);
      await fetchLeads();
    }
  };

  const scheduleFollowUp = async () => {
    if (!selected || !followUpAt) {
      showToast("Choose a follow-up date and time", "error");
      return;
    }

    const response = await leadsService.scheduleFollowUp(selected.id, {
      scheduled_for: new Date(followUpAt).toISOString(),
      note: followUpNote.trim(),
      reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
    });

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast("Follow-up scheduled", "success");
    setFollowUpAt("");
    setFollowUpNote("");
    setReminderAt("");

    const refreshed = await leadsService.getById(selected.id);
    const payload: any = refreshed.data;
    if (!refreshed.error && payload?.data) setSelected(payload.data);
    await fetchLeads();
  };

  const completeFollowUp = async (followUpId?: string) => {
    if (!selected || !followUpId) return;
    const response = await leadsService.updateFollowUp(
      selected.id,
      followUpId,
      { status: "completed" },
    );
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast("Follow-up completed", "success");
    const refreshed = await leadsService.getById(selected.id);
    const payload: any = refreshed.data;
    if (!refreshed.error && payload?.data) setSelected(payload.data);
    await fetchLeads();
  };

  const recalculate = async (lead: Lead) => {
    const response = await leadsService.recalculateScore(lead.id);
    if (response.error) showToast(response.error, "error");
    else {
      showToast("Lead score recalculated", "success");
      await fetchLeads();
    }
  };

  return (
    <TabInnerContent
      title="Sales Leads"
      description="Aquakart lead pipeline, qualification, score and follow-ups"
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total leads", stats.total],
          ["Hot leads", stats.hot],
          ["Follow-ups", stats.followUps],
          ["Won", stats.won],
        ].map(([label, value]) => (
          <LiquidPanel key={String(label)} className="p-4">
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">
              {value}
            </p>
          </LiquidPanel>
        ))}
      </div>

      <div className="mb-5 grid gap-3 xl:grid-cols-[1fr_180px_160px_auto_auto]">
        <LiquidInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void fetchLeads();
          }}
          placeholder="Search name, phone, locality, PIN or water problem"
        />
        <LiquidDropdown
          value={stageFilter}
          onChange={setStageFilter}
          options={[
            { value: "all", label: "All stages" },
            ...optionList(PIPELINE),
          ]}
        />
        <LiquidDropdown
          value={scoreFilter}
          onChange={setScoreFilter}
          options={[
            { value: "all", label: "All scores" },
            { value: "hot", label: "Hot" },
            { value: "warm", label: "Warm" },
            { value: "cold", label: "Cold" },
          ]}
        />
        <LiquidButton type="button" variant="soft" onClick={fetchLeads}>
          <RefreshCw className="h-4 w-4" />
          Search
        </LiquidButton>
        <LiquidButton type="button" variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add lead
        </LiquidButton>
      </div>

      {loading ? (
        <div className="py-14 text-center text-sm text-slate-500">
          Loading sales leads…
        </div>
      ) : leads.length === 0 ? (
        <LiquidPanel className="p-10 text-center">
          <Droplets className="mx-auto h-10 w-10 text-sky-500" />
          <h3 className="mt-3 font-black text-neutral-950 dark:text-white">
            No leads match this view
          </h3>
        </LiquidPanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <LiquidPanel key={lead.id} className="p-5">
              <button
                type="button"
                onClick={() => setSelected(lead)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-black text-neutral-950 dark:text-white">
                      {lead.contact_name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-white/45">
                      {lead.company_name || "Individual"} ·{" "}
                      {lead.source || "manual"}
                    </p>
                  </div>
                  <LiquidBadge className={scoreClass(lead.score_band)}>
                    {lead.score_band || "cold"} · {lead.score ?? 0}
                  </LiquidBadge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <LiquidBadge className={statusClass(lead.status)}>
                    {PIPELINE.find(([value]) => value === lead.status)?.[1] ||
                      lead.status}
                  </LiquidBadge>
                  {lead.last_intake_channel && (
                    <LiquidBadge>{lead.last_intake_channel}</LiquidBadge>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-white/60">
                  {lead.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {lead.phone}
                    </p>
                  )}
                  {lead.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-4 w-4 shrink-0" /> {lead.email}
                    </p>
                  )}
                  {(lead.qualification?.locality ||
                    lead.qualification?.pincode) && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {lead.qualification?.locality || "—"}{" "}
                      {lead.qualification?.pincode || ""}
                    </p>
                  )}
                  {lead.next_follow_up && (
                    <p className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                      <CalendarClock className="h-4 w-4" />
                      {formatDateTime(lead.next_follow_up)}
                    </p>
                  )}
                </div>
              </button>

              <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                <LiquidButton
                  type="button"
                  variant="soft"
                  onClick={() => openEdit(lead)}
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="ghost"
                  onClick={() => void recalculate(lead)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Score
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="danger"
                  onClick={() => void deleteLead(lead)}
                >
                  <Trash2 className="h-4 w-4" />
                </LiquidButton>
              </div>
            </LiquidPanel>
          ))}
        </div>
      )}

      <ResizableFloatingSidebar
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingLead ? "Edit Aquakart lead" : "Create Aquakart lead"}
        subtitle="Contact, pipeline, water qualification and product fit"
        widthStorageKey="aquacrm:lead-form-width"
        initialWidth={760}
        minWidth={500}
        maxWidth={1080}
      >
        <div className="space-y-5">
          <LiquidPanel className="p-5">
            <h3 className="mb-4 font-black text-neutral-950 dark:text-white">
              Customer
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <LiquidInput
                label="Contact name"
                value={formData.contact_name}
                onChange={(event) =>
                  setFormData({ ...formData, contact_name: event.target.value })
                }
              />
              <LiquidInput
                label="Company / household"
                value={formData.company_name}
                onChange={(event) =>
                  setFormData({ ...formData, company_name: event.target.value })
                }
              />
              <LiquidInput
                label="Phone"
                value={formData.phone}
                onChange={(event) =>
                  setFormData({ ...formData, phone: event.target.value })
                }
              />
              <LiquidInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData({ ...formData, email: event.target.value })
                }
              />
              <LiquidInput
                label="Source"
                value={formData.source}
                onChange={(event) =>
                  setFormData({ ...formData, source: event.target.value })
                }
                placeholder="planner / website / whatsapp / referral"
              />
              <LiquidDropdown
                label="Payment"
                value={formData.payment_status}
                onChange={(value) =>
                  setFormData({ ...formData, payment_status: value })
                }
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "cod", label: "COD" },
                  { value: "paid", label: "Paid" },
                ]}
              />
            </div>
            <LiquidTextarea
              wrapperClassName="mt-4"
              label="Notes"
              rows={3}
              value={formData.notes}
              onChange={(event) =>
                setFormData({ ...formData, notes: event.target.value })
              }
            />
          </LiquidPanel>

          <LiquidPanel className="p-5">
            <h3 className="mb-4 font-black text-neutral-950 dark:text-white">
              Sales pipeline
            </h3>
            <LiquidDropdown
              label="Stage"
              value={formData.status}
              onChange={(value) =>
                setFormData({ ...formData, status: value })
              }
              options={optionList(PIPELINE)}
            />
            {formData.status === "lost" && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <LiquidDropdown
                  label="Lost reason"
                  value={formData.lost_reason.category}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      lost_reason: {
                        ...formData.lost_reason,
                        category: value,
                      },
                    })
                  }
                  options={optionList(LOST_REASONS)}
                />
                <LiquidInput
                  label="Competitor"
                  value={formData.lost_reason.competitor}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      lost_reason: {
                        ...formData.lost_reason,
                        competitor: event.target.value,
                      },
                    })
                  }
                />
                <LiquidTextarea
                  wrapperClassName="md:col-span-2"
                  label="Loss details"
                  value={formData.lost_reason.details}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      lost_reason: {
                        ...formData.lost_reason,
                        details: event.target.value,
                      },
                    })
                  }
                />
              </div>
            )}
          </LiquidPanel>

          <LiquidPanel className="p-5">
            <h3 className="mb-4 font-black text-neutral-950 dark:text-white">
              Water & softener qualification
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <LiquidInput
                label="Locality"
                value={formData.qualification.locality}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      locality: event.target.value,
                    },
                  })
                }
              />
              <LiquidInput
                label="PIN"
                value={formData.qualification.pincode}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      pincode: event.target.value,
                    },
                  })
                }
              />
              <LiquidDropdown
                label="Water source"
                value={formData.qualification.water_source}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      water_source: value,
                    },
                  })
                }
                options={optionList(WATER_SOURCES)}
              />
              <LiquidInput
                label="Hardness ppm"
                type="number"
                value={formData.qualification.hardness_ppm}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      hardness_ppm: event.target.value,
                    },
                  })
                }
              />
              <LiquidInput
                label="Residents"
                type="number"
                value={formData.qualification.residents}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      residents: event.target.value,
                    },
                  })
                }
              />
              <LiquidInput
                label="Bathrooms"
                type="number"
                value={formData.qualification.bathrooms}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      bathrooms: event.target.value,
                    },
                  })
                }
              />
              <LiquidDropdown
                label="Product interest"
                value={formData.qualification.product_interest}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      product_interest: value,
                    },
                  })
                }
                options={optionList(PRODUCT_INTERESTS)}
              />
              <LiquidDropdown
                label="Urgency"
                value={formData.qualification.urgency}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      urgency: value,
                    },
                  })
                }
                options={optionList(URGENCY)}
              />
              <LiquidInput
                label="Budget from"
                type="number"
                value={formData.qualification.budget_min}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      budget_min: event.target.value,
                    },
                  })
                }
              />
              <LiquidInput
                label="Budget to"
                type="number"
                value={formData.qualification.budget_max}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      budget_max: event.target.value,
                    },
                  })
                }
              />
              <LiquidInput
                label="Recommended capacity (L)"
                type="number"
                value={formData.qualification.recommended_capacity_liters}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      recommended_capacity_liters: event.target.value,
                    },
                  })
                }
              />
              <LiquidInput
                label="Recommended product"
                value={formData.qualification.recommended_product_name}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: {
                      ...formData.qualification,
                      recommended_product_name: event.target.value,
                    },
                  })
                }
              />
            </div>
            <LiquidTextarea
              wrapperClassName="mt-4"
              label="Water problem"
              rows={3}
              value={formData.qualification.water_problem}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  qualification: {
                    ...formData.qualification,
                    water_problem: event.target.value,
                  },
                })
              }
            />
          </LiquidPanel>

          <div className="sticky bottom-0 -mx-5 flex justify-end gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4">
            <LiquidButton
              type="button"
              variant="ghost"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="primary"
              onClick={() => void saveLead()}
              disabled={saving}
            >
              {saving ? "Saving…" : editingLead ? "Update lead" : "Create lead"}
            </LiquidButton>
          </div>
        </div>
      </ResizableFloatingSidebar>

      <ResizableFloatingSidebar
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.contact_name || "Lead"}
        subtitle={
          selected
            ? `${selected.status} · ${selected.score_band || "cold"} ${selected.score ?? 0}/100`
            : ""
        }
        widthStorageKey="aquacrm:lead-details-width"
        initialWidth={700}
        minWidth={500}
        maxWidth={1000}
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <LiquidPanel className="p-4">
                <Gauge className="h-5 w-5 text-rose-500" />
                <p className="mt-2 text-xs uppercase text-slate-400">Score</p>
                <p className="text-xl font-black text-neutral-950 dark:text-white">
                  {selected.score ?? 0}/100
                </p>
              </LiquidPanel>
              <LiquidPanel className="p-4">
                <Waves className="h-5 w-5 text-sky-500" />
                <p className="mt-2 text-xs uppercase text-slate-400">Hardness</p>
                <p className="text-xl font-black text-neutral-950 dark:text-white">
                  {selected.qualification?.hardness_ppm
                    ? `${selected.qualification.hardness_ppm} ppm`
                    : selected.qualification?.hardness_level || "—"}
                </p>
              </LiquidPanel>
              <LiquidPanel className="p-4">
                <Users className="h-5 w-5 text-emerald-500" />
                <p className="mt-2 text-xs uppercase text-slate-400">Household</p>
                <p className="text-xl font-black text-neutral-950 dark:text-white">
                  {selected.qualification?.residents ||
                    selected.qualification?.residents_range ||
                    "—"}
                </p>
              </LiquidPanel>
            </div>

            <LiquidPanel className="p-5">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Qualification snapshot
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <p>
                  <span className="text-slate-400">Location:</span>{" "}
                  {selected.qualification?.locality || "—"}{" "}
                  {selected.qualification?.pincode || ""}
                </p>
                <p>
                  <span className="text-slate-400">Water:</span>{" "}
                  {selected.qualification?.water_source || "—"}
                </p>
                <p>
                  <span className="text-slate-400">Bathrooms:</span>{" "}
                  {selected.qualification?.bathrooms ?? "—"}
                </p>
                <p>
                  <span className="text-slate-400">Interest:</span>{" "}
                  {selected.qualification?.product_interest || "—"}
                </p>
                <p>
                  <span className="text-slate-400">Budget:</span>{" "}
                  {formatMoney(selected.qualification?.budget_min)} –{" "}
                  {formatMoney(selected.qualification?.budget_max)}
                </p>
                <p>
                  <span className="text-slate-400">Recommended:</span>{" "}
                  {selected.qualification?.recommended_product_name || "—"}
                </p>
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-5">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Schedule follow-up
              </h3>
              <div className="mt-4 grid gap-3">
                <LiquidInput
                  label="Follow-up date/time"
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(event) => setFollowUpAt(event.target.value)}
                />
                <LiquidInput
                  label="Reminder date/time"
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(event) => setReminderAt(event.target.value)}
                />
                <LiquidTextarea
                  label="Follow-up note"
                  value={followUpNote}
                  onChange={(event) => setFollowUpNote(event.target.value)}
                />
                <LiquidButton
                  type="button"
                  variant="primary"
                  onClick={() => void scheduleFollowUp()}
                >
                  <CalendarClock className="h-4 w-4" />
                  Schedule
                </LiquidButton>
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-5">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Follow-up history
              </h3>
              <div className="mt-4 space-y-3">
                {(selected.follow_ups || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No follow-ups yet.</p>
                ) : (
                  [...(selected.follow_ups || [])]
                    .reverse()
                    .map((followUp) => (
                      <div
                        key={followUp._id || followUp.scheduled_for}
                        className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-950 dark:text-white">
                              {formatDateTime(followUp.scheduled_for)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {followUp.note || "No note"} · {followUp.status}
                            </p>
                          </div>
                          {followUp.status === "scheduled" && (
                            <LiquidButton
                              type="button"
                              variant="soft"
                              onClick={() =>
                                void completeFollowUp(followUp._id)
                              }
                            >
                              Complete
                            </LiquidButton>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-5">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Pipeline history
              </h3>
              <div className="mt-4 space-y-3">
                {(selected.stage_history || []).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No stage history available.
                  </p>
                ) : (
                  [...(selected.stage_history || [])]
                    .reverse()
                    .map((entry) => (
                      <div
                        key={entry._id || `${entry.to}-${entry.changed_at}`}
                        className="flex gap-3"
                      >
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                        <div>
                          <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                            {entry.from || "Created"} → {entry.to}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(entry.changed_at)}{" "}
                            {entry.note ? `· ${entry.note}` : ""}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </LiquidPanel>
          </div>
        )}
      </ResizableFloatingSidebar>
    </TabInnerContent>
  );
}
