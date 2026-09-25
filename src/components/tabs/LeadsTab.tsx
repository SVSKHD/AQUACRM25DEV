import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarClock,
  Droplets,
  Edit2,
  ExternalLink,
  Gauge,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { leadsService } from "../../services/apiService";
import { useToast } from "../Toast";
import TabInnerContent from "../Layout/tabInnerlayout";
import ResizableFloatingSidebar from "../ui/ResizableFloatingSidebar";
import {
  LiquidBadge,
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidPanel,
  LiquidTextarea,
} from "../ui/liquid";

export type PaymentFilter = "all" | "pending" | "cod" | "paid";

type LeadsTabProps = {
  paymentFilter: PaymentFilter;
};

type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "water_details"
  | "site_visit"
  | "recommended"
  | "quote_sent"
  | "follow_up"
  | "won"
  | "lost";

type LeadQualification = {
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

type FollowUp = {
  _id?: string;
  id?: string;
  scheduled_for: string;
  status: "scheduled" | "completed" | "cancelled" | "missed";
  note?: string;
  reminder_at?: string | null;
  reminder_status?: "pending" | "sent" | "skipped";
  completed_at?: string | null;
};

type IntakeEvent = {
  _id?: string;
  channel?: string;
  source?: string;
  page_url?: string;
  page_path?: string;
  message?: string;
  submitted_at?: string;
  product?: {
    product_id?: string;
    title?: string;
    slug?: string;
    url?: string;
    price?: number | null;
  };
  planner?: {
    residents?: string;
    coverage?: string;
    hardness?: string;
    required_capacity_liters?: number | null;
    recommendation_product_names?: string[];
  };
};

type StageHistory = {
  _id?: string;
  from?: string;
  to: string;
  changed_at?: string;
  note?: string;
};

interface Lead {
  id: string;
  _id?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  payment_status: string;
  created_at: string;
  updated_at?: string;
  score?: number;
  score_band?: "cold" | "warm" | "hot";
  score_breakdown?: Record<string, number>;
  score_updated_at?: string | null;
  qualification?: LeadQualification;
  next_follow_up?: string | null;
  follow_ups?: FollowUp[];
  stage_history?: StageHistory[];
  intake_events?: IntakeEvent[];
  last_intake_channel?: string;
  last_intake_at?: string | null;
  lost_reason?: {
    category?: string;
    details?: string;
    competitor?: string;
    lost_at?: string | null;
  };
}

type PipelineSummary = {
  by_status?: Record<string, number>;
  by_score_band?: Record<string, number>;
  lost_reasons?: Record<string, number>;
  follow_ups?: {
    overdue?: number;
    upcoming?: number;
  };
};

type LeadFormState = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  notes: string;
  payment_status: string;
  stage_note: string;
  lost_reason_category: string;
  lost_reason_details: string;
  lost_reason_competitor: string;
  qualification: {
    locality: string;
    pincode: string;
    water_source: string;
    hardness_ppm: string;
    hardness_level: string;
    bathrooms: string;
    residents: string;
    budget_min: string;
    budget_max: string;
    product_interest: string;
    urgency: string;
    water_problem: string;
    recommended_capacity_liters: string;
    recommended_product_name: string;
  };
};

const pipelineStatusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "water_details", label: "Water details" },
  { value: "site_visit", label: "Site visit" },
  { value: "recommended", label: "Product recommended" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "follow_up", label: "Follow-up" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const leadStatusOptions = [
  ...pipelineStatusOptions,
  { value: "qualified", label: "Qualified (legacy)" },
];

const scoreOptions = [
  { value: "all", label: "All scores" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

const followUpFilterOptions = [
  { value: "all", label: "All follow-ups" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No follow-up" },
];

const waterSourceOptions = [
  { value: "", label: "Not specified" },
  { value: "borewell", label: "Borewell" },
  { value: "municipal", label: "Municipal" },
  { value: "tanker", label: "Tanker" },
  { value: "mixed", label: "Mixed" },
  { value: "unknown", label: "Unknown" },
];

const hardnessOptions = [
  { value: "", label: "Not specified" },
  { value: "mild", label: "Mild" },
  { value: "hard", label: "Hard" },
  { value: "very_hard", label: "Very hard" },
  { value: "unknown", label: "Unknown" },
];

const interestOptions = [
  { value: "", label: "Not specified" },
  { value: "manual", label: "Manual softener" },
  { value: "automatic", label: "Automatic softener" },
  { value: "whole_house", label: "Whole house" },
  { value: "bathroom", label: "Bathroom" },
  { value: "unknown", label: "Unknown" },
];

const urgencyOptions = [
  { value: "", label: "Not specified" },
  { value: "immediate", label: "Immediate" },
  { value: "7_days", label: "Within 7 days" },
  { value: "30_days", label: "Within 30 days" },
  { value: "researching", label: "Researching" },
  { value: "unknown", label: "Unknown" },
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

const emptyForm = (): LeadFormState => ({
  company_name: "Individual",
  contact_name: "",
  email: "",
  phone: "",
  status: "new",
  source: "",
  notes: "",
  payment_status: "pending",
  stage_note: "",
  lost_reason_category: "",
  lost_reason_details: "",
  lost_reason_competitor: "",
  qualification: {
    locality: "",
    pincode: "",
    water_source: "",
    hardness_ppm: "",
    hardness_level: "",
    bathrooms: "",
    residents: "",
    budget_min: "",
    budget_max: "",
    product_interest: "",
    urgency: "",
    water_problem: "",
    recommended_capacity_liters: "",
    recommended_product_name: "",
  },
});

const normalizeLead = (item: any): Lead => ({
  ...item,
  id: item.id || item._id,
  _id: item._id || item.id,
  company_name: item.company_name || "Individual",
  contact_name: item.contact_name || "Unknown",
  email: item.email || "",
  phone: item.phone || "",
  status: item.status || "new",
  source: item.source || "",
  payment_status: item.payment_status || "pending",
  qualification: item.qualification || {},
  follow_ups: Array.isArray(item.follow_ups) ? item.follow_ups : [],
  stage_history: Array.isArray(item.stage_history) ? item.stage_history : [],
  intake_events: Array.isArray(item.intake_events) ? item.intake_events : [],
});

const unwrapList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const statusLabel = (value?: string) =>
  leadStatusOptions.find((option) => option.value === value)?.label ||
  value ||
  "Unknown";

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

const scoreBadgeClass = (band?: string) => {
  if (band === "hot")
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
  if (band === "warm")
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300";
};

const statusBadgeClass = (status?: string) => {
  if (status === "won")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (status === "lost")
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
  if (["quote_sent", "follow_up"].includes(status || ""))
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300";
};

const leadToForm = (lead: Lead): LeadFormState => ({
  company_name: lead.company_name || "Individual",
  contact_name: lead.contact_name || "",
  email: lead.email || "",
  phone: lead.phone || "",
  status: lead.status,
  source: lead.source || "",
  notes: lead.notes || "",
  payment_status: lead.payment_status || "pending",
  stage_note: "",
  lost_reason_category: lead.lost_reason?.category || "",
  lost_reason_details: lead.lost_reason?.details || "",
  lost_reason_competitor: lead.lost_reason?.competitor || "",
  qualification: {
    locality: lead.qualification?.locality || "",
    pincode: lead.qualification?.pincode || "",
    water_source: lead.qualification?.water_source || "",
    hardness_ppm: String(lead.qualification?.hardness_ppm ?? ""),
    hardness_level: lead.qualification?.hardness_level || "",
    bathrooms: String(lead.qualification?.bathrooms ?? ""),
    residents: String(lead.qualification?.residents ?? ""),
    budget_min: String(lead.qualification?.budget_min ?? ""),
    budget_max: String(lead.qualification?.budget_max ?? ""),
    product_interest: lead.qualification?.product_interest || "",
    urgency: lead.qualification?.urgency || "",
    water_problem: lead.qualification?.water_problem || "",
    recommended_capacity_liters: String(
      lead.qualification?.recommended_capacity_liters ?? "",
    ),
    recommended_product_name:
      lead.qualification?.recommended_product_name || "",
  },
});

const numberOrNull = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function LeadsTab({ paymentFilter }: LeadsTabProps) {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<PipelineSummary>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [sort, setSort] = useState<"score" | "follow_up">("score");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLead, setFormLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    scheduled_for: "",
    reminder_at: "",
    note: "",
  });

  const fetchSummary = async () => {
    const response = await leadsService.getPipelineSummary();
    if (!response.error) {
      setSummary((response.data as any)?.data || response.data || {});
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    const response = await leadsService.getAll({
      search: search || undefined,
      status: stageFilter === "all" ? undefined : stageFilter,
      score_band: scoreFilter === "all" ? undefined : scoreFilter,
      follow_up:
        followUpFilter === "all"
          ? undefined
          : (followUpFilter as "overdue" | "upcoming" | "today" | "none"),
      payment_status: paymentFilter === "all" ? undefined : paymentFilter,
      sort,
    });
    setLoading(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    setLeads(unwrapList(response.data).map(normalizeLead));
  };

  useEffect(() => {
    fetchSummary();
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter, scoreFilter, followUpFilter, paymentFilter, sort]);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const value = search.toLowerCase();
    return leads.filter((lead) =>
      [
        lead.contact_name,
        lead.company_name,
        lead.phone,
        lead.email,
        lead.source,
        lead.qualification?.locality,
        lead.qualification?.pincode,
        lead.qualification?.water_problem,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [leads, search]);

  const openCreate = () => {
    setFormLead(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setFormLead(lead);
    setForm(leadToForm(lead));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormLead(null);
    setForm(emptyForm());
  };

  const submitForm = async () => {
    if (!form.contact_name.trim()) {
      showToast("Contact name is required", "error");
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      showToast("Phone or email is required", "error");
      return;
    }
    if (form.status === "lost" && !form.lost_reason_category) {
      showToast("Select a lost reason", "error");
      return;
    }

    const payload = {
      company_name: form.company_name.trim() || "Individual",
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      source: form.source.trim(),
      notes: form.notes.trim(),
      payment_status: form.payment_status,
      stage_note: form.stage_note.trim(),
      qualification: {
        locality: form.qualification.locality.trim(),
        pincode: form.qualification.pincode.trim(),
        water_source: form.qualification.water_source,
        hardness_ppm: numberOrNull(form.qualification.hardness_ppm),
        hardness_level: form.qualification.hardness_level,
        bathrooms: numberOrNull(form.qualification.bathrooms),
        residents: numberOrNull(form.qualification.residents),
        budget_min: numberOrNull(form.qualification.budget_min),
        budget_max: numberOrNull(form.qualification.budget_max),
        product_interest: form.qualification.product_interest,
        urgency: form.qualification.urgency,
        water_problem: form.qualification.water_problem.trim(),
        recommended_capacity_liters: numberOrNull(
          form.qualification.recommended_capacity_liters,
        ),
        recommended_product_name:
          form.qualification.recommended_product_name.trim(),
      },
      ...(form.status === "lost"
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
    const response = formLead
      ? await leadsService.update(formLead.id, payload)
      : await leadsService.create(payload);
    setSaving(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast(formLead ? "Lead updated" : "Lead created", "success");
    closeForm();
    await Promise.all([fetchLeads(), fetchSummary()]);
  };

  const deleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete lead ${lead.contact_name}?`)) return;
    const response = await leadsService.delete(lead.id);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    if (selectedLead?.id === lead.id) setSelectedLead(null);
    showToast("Lead deleted", "success");
    await Promise.all([fetchLeads(), fetchSummary()]);
  };

  const refreshLead = async (lead: Lead) => {
    const response = await leadsService.getById(lead.id);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    const next = normalizeLead((response.data as any)?.data || response.data);
    setSelectedLead(next);
    setLeads((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );
  };

  const recalculateScore = async (lead: Lead) => {
    const response = await leadsService.recalculateScore(lead.id);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast("Lead score recalculated", "success");
    await Promise.all([refreshLead(lead), fetchSummary()]);
  };

  const scheduleFollowUp = async () => {
    if (!selectedLead || !followUpForm.scheduled_for) {
      showToast("Choose a follow-up date and time", "error");
      return;
    }

    const response = await leadsService.scheduleFollowUp(selectedLead.id, {
      scheduled_for: new Date(followUpForm.scheduled_for).toISOString(),
      reminder_at: followUpForm.reminder_at
        ? new Date(followUpForm.reminder_at).toISOString()
        : null,
      note: followUpForm.note.trim(),
    });

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    setFollowUpForm({ scheduled_for: "", reminder_at: "", note: "" });
    showToast("Follow-up scheduled", "success");
    await Promise.all([refreshLead(selectedLead), fetchSummary(), fetchLeads()]);
  };

  const updateFollowUpStatus = async (
    lead: Lead,
    followUp: FollowUp,
    status: "completed" | "cancelled" | "missed" | "scheduled",
  ) => {
    const followUpId = followUp._id || followUp.id;
    if (!followUpId) return;

    const response = await leadsService.updateFollowUp(
      lead.id,
      followUpId,
      { status },
    );

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast(`Follow-up marked ${status}`, "success");
    await Promise.all([refreshLead(lead), fetchSummary(), fetchLeads()]);
  };

  const statusCounts = summary.by_status || {};
  const scoreCounts = summary.by_score_band || {};

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Sales Pipeline"
        description="Aquakart leads from website, planner, WhatsApp and manual sales"
      >
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Active
              </p>
              <p className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">
                {Object.entries(statusCounts)
                  .filter(([status]) => !["won", "lost"].includes(status))
                  .reduce((sum, [, count]) => sum + Number(count || 0), 0)}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Hot leads
              </p>
              <p className="mt-1 text-2xl font-black text-rose-600">
                {scoreCounts.hot || 0}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Overdue follow-ups
              </p>
              <p className="mt-1 text-2xl font-black text-amber-600">
                {summary.follow_ups?.overdue || 0}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Won
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-600">
                {statusCounts.won || 0}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Lost
              </p>
              <p className="mt-1 text-2xl font-black text-rose-600">
                {statusCounts.lost || 0}
              </p>
            </LiquidPanel>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.4fr_.8fr_.7fr_.8fr_.65fr_auto]">
            <LiquidInput
              aria-label="Search leads"
              placeholder="Search name, phone, locality, PIN..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <LiquidDropdown
              value={stageFilter}
              options={[
                { value: "all", label: "All stages" },
                ...leadStatusOptions,
              ]}
              onChange={setStageFilter}
            />
            <LiquidDropdown
              value={scoreFilter}
              options={scoreOptions}
              onChange={setScoreFilter}
            />
            <LiquidDropdown
              value={followUpFilter}
              options={followUpFilterOptions}
              onChange={setFollowUpFilter}
            />
            <LiquidDropdown
              value={sort}
              options={[
                { value: "score", label: "Score ↓" },
                { value: "follow_up", label: "Follow-up ↑" },
              ]}
              onChange={(value) =>
                setSort(value as "score" | "follow_up")
              }
            />
            <div className="flex gap-2">
              <LiquidButton
                type="button"
                variant="soft"
                onClick={() => {
                  fetchLeads();
                  fetchSummary();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </LiquidButton>
              <LiquidButton type="button" variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add lead
              </LiquidButton>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading sales pipeline…
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredLeads.map((lead) => {
                const overdue =
                  Boolean(lead.next_follow_up) &&
                  new Date(lead.next_follow_up as string).getTime() < Date.now() &&
                  !["won", "lost"].includes(lead.status);

                return (
                  <LiquidPanel key={lead.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <h3 className="truncate text-lg font-black text-neutral-950 dark:text-white">
                          {lead.contact_name}
                        </h3>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-white/50">
                          {lead.company_name || "Individual"} · {lead.source || "manual"}
                        </p>
                      </button>
                      <div className="flex flex-col items-end gap-1">
                        <LiquidBadge className={scoreBadgeClass(lead.score_band)}>
                          {lead.score ?? 0} · {lead.score_band || "cold"}
                        </LiquidBadge>
                        <LiquidBadge className={statusBadgeClass(lead.status)}>
                          {statusLabel(lead.status)}
                        </LiquidBadge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-white/60">
                        <Phone className="h-4 w-4" />
                        <span className="truncate">{lead.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-white/60">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {lead.qualification?.locality || lead.qualification?.pincode || "No location"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-white/60">
                        <Droplets className="h-4 w-4" />
                        <span className="truncate">
                          {lead.qualification?.water_source || "Water source —"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-white/60">
                        <Gauge className="h-4 w-4" />
                        <span className="truncate">
                          {lead.qualification?.hardness_ppm
                            ? `${lead.qualification.hardness_ppm} ppm`
                            : lead.qualification?.hardness_level || "Hardness —"}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`mt-4 rounded-2xl border p-3 text-xs ${
                        overdue
                          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <CalendarClock className="h-4 w-4" />
                        {lead.next_follow_up
                          ? `${overdue ? "Overdue · " : ""}${formatDateTime(lead.next_follow_up)}`
                          : "No follow-up scheduled"}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <LiquidButton
                        type="button"
                        variant="soft"
                        className="flex-1"
                        onClick={() => setSelectedLead(lead)}
                      >
                        View
                      </LiquidButton>
                      <LiquidButton
                        type="button"
                        variant="soft"
                        onClick={() => openEdit(lead)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </LiquidButton>
                      <LiquidButton
                        type="button"
                        variant="danger"
                        onClick={() => deleteLead(lead)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </LiquidButton>
                    </div>
                  </LiquidPanel>
                );
              })}
            </div>
          )}

          {!loading && filteredLeads.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-500">
              No leads match this view.
            </div>
          )}
        </div>
      </TabInnerContent>

      {selectedLead && (
        <ResizableFloatingSidebar
          open
          onClose={() => setSelectedLead(null)}
          title={selectedLead.contact_name}
          subtitle={`${statusLabel(selectedLead.status)} · ${selectedLead.phone || selectedLead.email || "No contact"}`}
          widthStorageKey="aquacrm:lead-detail-width"
          initialWidth={700}
          minWidth={520}
          maxWidth={980}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <LiquidPanel className="p-4">
                <p className="text-xs uppercase text-slate-500">Score</p>
                <p className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">
                  {selectedLead.score ?? 0}
                </p>
                <LiquidBadge
                  className={scoreBadgeClass(selectedLead.score_band)}
                >
                  {selectedLead.score_band || "cold"}
                </LiquidBadge>
              </LiquidPanel>
              <LiquidPanel className="p-4">
                <p className="text-xs uppercase text-slate-500">Stage</p>
                <p className="mt-1 font-black text-neutral-950 dark:text-white">
                  {statusLabel(selectedLead.status)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {selectedLead.source || "Manual"}
                </p>
              </LiquidPanel>
              <LiquidPanel className="p-4">
                <p className="text-xs uppercase text-slate-500">Next follow-up</p>
                <p className="mt-1 text-sm font-black text-neutral-950 dark:text-white">
                  {formatDateTime(selectedLead.next_follow_up)}
                </p>
              </LiquidPanel>
            </div>

            <div className="flex flex-wrap gap-2">
              <LiquidButton
                type="button"
                variant="primary"
                onClick={() => {
                  openEdit(selectedLead);
                  setSelectedLead(null);
                }}
              >
                <Edit2 className="h-4 w-4" /> Edit lead
              </LiquidButton>
              <LiquidButton
                type="button"
                variant="soft"
                onClick={() => recalculateScore(selectedLead)}
              >
                <RefreshCw className="h-4 w-4" /> Recalculate score
              </LiquidButton>
              {selectedLead.phone && (
                <a
                  href={`https://wa.me/91${String(selectedLead.phone).replace(/\D/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="liquid-button liquid-button-soft"
                >
                  <ExternalLink className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>

            <LiquidPanel className="p-4">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Softener qualification
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Location", [selectedLead.qualification?.locality, selectedLead.qualification?.pincode].filter(Boolean).join(" · ")],
                  ["Water source", selectedLead.qualification?.water_source],
                  ["Hardness", selectedLead.qualification?.hardness_ppm ? `${selectedLead.qualification.hardness_ppm} ppm` : selectedLead.qualification?.hardness_level],
                  ["Household", selectedLead.qualification?.residents ? `${selectedLead.qualification.residents} residents` : selectedLead.qualification?.residents_range],
                  ["Bathrooms", selectedLead.qualification?.bathrooms],
                  ["Interest", selectedLead.qualification?.product_interest],
                  ["Urgency", selectedLead.qualification?.urgency],
                  ["Budget", selectedLead.qualification?.budget_max ? `₹${Number(selectedLead.qualification.budget_max).toLocaleString("en-IN")}` : ""],
                  ["Recommended capacity", selectedLead.qualification?.recommended_capacity_liters ? `${selectedLead.qualification.recommended_capacity_liters} L` : ""],
                  ["Recommended product", selectedLead.qualification?.recommended_product_name],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                  >
                    <p className="text-xs uppercase text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-950 dark:text-white">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>
              {selectedLead.qualification?.water_problem && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-white/70">
                  {selectedLead.qualification.water_problem}
                </div>
              )}
            </LiquidPanel>

            <LiquidPanel className="p-4">
              <div className="flex items-center gap-2">
                <AlarmClock className="h-5 w-5 text-amber-500" />
                <h3 className="font-black text-neutral-950 dark:text-white">
                  Schedule follow-up
                </h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LiquidInput
                  label="Follow-up date & time"
                  type="datetime-local"
                  value={followUpForm.scheduled_for}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      scheduled_for: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Reminder time"
                  type="datetime-local"
                  value={followUpForm.reminder_at}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      reminder_at: event.target.value,
                    }))
                  }
                />
                <LiquidTextarea
                  wrapperClassName="sm:col-span-2"
                  label="Note"
                  rows={2}
                  value={followUpForm.note}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </div>
              <LiquidButton
                type="button"
                variant="primary"
                className="mt-3"
                onClick={scheduleFollowUp}
              >
                <CalendarClock className="h-4 w-4" /> Schedule
              </LiquidButton>
            </LiquidPanel>

            <LiquidPanel className="p-4">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Follow-up history
              </h3>
              <div className="mt-3 space-y-2">
                {(selectedLead.follow_ups || [])
                  .slice()
                  .reverse()
                  .map((followUp) => (
                    <div
                      key={followUp._id || followUp.id || followUp.scheduled_for}
                      className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-neutral-950 dark:text-white">
                            {formatDateTime(followUp.scheduled_for)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {followUp.note || "No note"}
                          </p>
                        </div>
                        <LiquidBadge>
                          {followUp.status}
                        </LiquidBadge>
                      </div>
                      {followUp.status === "scheduled" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <LiquidButton
                            type="button"
                            variant="soft"
                            onClick={() =>
                              updateFollowUpStatus(
                                selectedLead,
                                followUp,
                                "completed",
                              )
                            }
                          >
                            Complete
                          </LiquidButton>
                          <LiquidButton
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              updateFollowUpStatus(
                                selectedLead,
                                followUp,
                                "cancelled",
                              )
                            }
                          >
                            Cancel
                          </LiquidButton>
                          <LiquidButton
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              updateFollowUpStatus(
                                selectedLead,
                                followUp,
                                "missed",
                              )
                            }
                          >
                            Missed
                          </LiquidButton>
                        </div>
                      )}
                    </div>
                  ))}
                {!selectedLead.follow_ups?.length && (
                  <p className="text-sm text-slate-500">No follow-ups yet.</p>
                )}
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-4">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Pipeline history
              </h3>
              <div className="mt-3 space-y-2">
                {(selectedLead.stage_history || [])
                  .slice()
                  .reverse()
                  .map((history) => (
                    <div
                      key={history._id || `${history.to}-${history.changed_at}`}
                      className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                    >
                      <p className="text-sm font-bold text-neutral-950 dark:text-white">
                        {history.from ? `${statusLabel(history.from)} → ` : ""}
                        {statusLabel(history.to)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(history.changed_at)}
                        {history.note ? ` · ${history.note}` : ""}
                      </p>
                    </div>
                  ))}
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-4">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Acquisition history
              </h3>
              <div className="mt-3 space-y-3">
                {(selectedLead.intake_events || [])
                  .slice()
                  .reverse()
                  .map((event) => (
                    <div
                      key={event._id || `${event.channel}-${event.submitted_at}`}
                      className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <LiquidBadge>{event.channel || "manual"}</LiquidBadge>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(event.submitted_at)}
                        </span>
                      </div>
                      {event.product?.title && (
                        <p className="mt-2 text-sm font-bold text-neutral-950 dark:text-white">
                          {event.product.title}
                        </p>
                      )}
                      {event.planner?.required_capacity_liters && (
                        <p className="mt-1 text-xs text-slate-500">
                          Planner: {event.planner.residents} · {event.planner.coverage} ·{" "}
                          {event.planner.hardness} · {event.planner.required_capacity_liters} L
                        </p>
                      )}
                      {event.message && (
                        <p className="mt-2 text-sm text-slate-700 dark:text-white/70">
                          {event.message}
                        </p>
                      )}
                    </div>
                  ))}
                {!selectedLead.intake_events?.length && (
                  <p className="text-sm text-slate-500">No intake history.</p>
                )}
              </div>
            </LiquidPanel>

            {selectedLead.status === "lost" && (
              <LiquidPanel className="border-rose-200 p-4 dark:border-rose-500/20">
                <div className="flex items-center gap-2 text-rose-600">
                  <XCircle className="h-5 w-5" />
                  <h3 className="font-black">Lost reason</h3>
                </div>
                <p className="mt-3 text-sm text-slate-700 dark:text-white/70">
                  {selectedLead.lost_reason?.category || "—"}
                  {selectedLead.lost_reason?.competitor
                    ? ` · ${selectedLead.lost_reason.competitor}`
                    : ""}
                </p>
                {selectedLead.lost_reason?.details && (
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedLead.lost_reason.details}
                  </p>
                )}
              </LiquidPanel>
            )}
          </div>
        </ResizableFloatingSidebar>
      )}

      {formOpen && (
        <ResizableFloatingSidebar
          open
          onClose={closeForm}
          title={formLead ? "Edit lead" : "New lead"}
          subtitle="Sales details, water qualification and pipeline stage"
          widthStorageKey="aquacrm:lead-form-width"
          initialWidth={760}
          minWidth={560}
          maxWidth={1000}
        >
          <div className="space-y-5">
            <LiquidPanel className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <LiquidInput
                  label="Contact name"
                  value={form.contact_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contact_name: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Company / home"
                  value={form.company_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      company_name: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
                <LiquidInput
                  label="Source"
                  value={form.source}
                  placeholder="website, planner, whatsapp, referral..."
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Payment status"
                  value={form.payment_status}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "cod", label: "COD" },
                    { value: "paid", label: "Paid" },
                  ]}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      payment_status: value,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Pipeline stage"
                  value={form.status}
                  options={leadStatusOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as LeadStatus,
                    }))
                  }
                />
                <LiquidInput
                  label="Stage note"
                  value={form.stage_note}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stage_note: event.target.value,
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
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-sky-500" />
                <h3 className="font-black text-neutral-950 dark:text-white">
                  Water & softener qualification
                </h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LiquidInput
                  label="Locality"
                  value={form.qualification.locality}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        locality: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="PIN code"
                  value={form.qualification.pincode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        pincode: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidDropdown
                  label="Water source"
                  value={form.qualification.water_source}
                  options={waterSourceOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        water_source: value,
                      },
                    }))
                  }
                />
                <LiquidDropdown
                  label="Hardness level"
                  value={form.qualification.hardness_level}
                  options={hardnessOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        hardness_level: value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="Hardness ppm"
                  type="number"
                  value={form.qualification.hardness_ppm}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        hardness_ppm: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="Residents"
                  type="number"
                  value={form.qualification.residents}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        residents: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="Bathrooms"
                  type="number"
                  value={form.qualification.bathrooms}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        bathrooms: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidDropdown
                  label="Product interest"
                  value={form.qualification.product_interest}
                  options={interestOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        product_interest: value,
                      },
                    }))
                  }
                />
                <LiquidDropdown
                  label="Urgency"
                  value={form.qualification.urgency}
                  options={urgencyOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        urgency: value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="Budget min"
                  type="number"
                  value={form.qualification.budget_min}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        budget_min: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="Budget max"
                  type="number"
                  value={form.qualification.budget_max}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        budget_max: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="Recommended capacity (L)"
                  type="number"
                  value={form.qualification.recommended_capacity_liters}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        recommended_capacity_liters: event.target.value,
                      },
                    }))
                  }
                />
                <LiquidInput
                  label="Recommended product"
                  value={form.qualification.recommended_product_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qualification: {
                        ...current.qualification,
                        recommended_product_name: event.target.value,
                      },
                    }))
                  }
                />
              </div>
              <LiquidTextarea
                wrapperClassName="mt-3"
                label="Water problem"
                rows={3}
                value={form.qualification.water_problem}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    qualification: {
                      ...current.qualification,
                      water_problem: event.target.value,
                    },
                  }))
                }
              />
            </LiquidPanel>

            {form.status === "lost" && (
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
                  onClick={submitForm}
                >
                  {saving ? "Saving…" : formLead ? "Update lead" : "Create lead"}
                </LiquidButton>
              </div>
            </div>
          </div>
        </ResizableFloatingSidebar>
      )}
    </div>
  );
}

