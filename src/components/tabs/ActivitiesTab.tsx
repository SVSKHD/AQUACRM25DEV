import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Edit2,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import {
  activitiesService,
  customersService,
  dealsService,
  leadsService,
} from "../../services/apiService";
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

type ActivityType = "task" | "call" | "email" | "meeting" | "note";
type ActivityStatus = "pending" | "completed";
type RelatedType = "lead" | "customer" | "deal";

interface Activity {
  id: string;
  _id?: string;
  related_to: RelatedType;
  related_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  status: ActivityStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at?: string;
}

type RelatedOption = {
  value: string;
  label: string;
  type: RelatedType;
};

type FormState = {
  related_to: RelatedType;
  related_id: string;
  type: ActivityType;
  title: string;
  description: string;
  status: ActivityStatus;
  due_date: string;
};

const emptyForm = (): FormState => ({
  related_to: "lead",
  related_id: "",
  type: "task",
  title: "",
  description: "",
  status: "pending",
  due_date: "",
});

const unwrapList = (data: any): any[] => extractArrayPayload<any>(data);

const activityTypeOptions = [
  { value: "task", label: "Task" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
];

const relatedTypeOptions = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "deal", label: "Deal" },
];

const activityIcon = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
  note: MessageSquareText,
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

export default function ActivitiesTab() {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [relatedOptions, setRelatedOptions] = useState<RelatedOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ActivityType>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchRelatedOptions = async () => {
    const [leadResponse, dealResponse, customerResponse] = await Promise.all([
      leadsService.getAll({ sort: "score" }),
      dealsService.getAll(),
      customersService.getAll({ page: 1, limit: 100 }),
    ]);

    const options: RelatedOption[] = [];

    if (!leadResponse.error) {
      unwrapList(leadResponse.data).forEach((lead: any) => {
        options.push({
          type: "lead",
          value: lead.id || lead._id,
          label: `${lead.contact_name || "Lead"}${lead.phone ? ` · ${lead.phone}` : ""}`,
        });
      });
    }

    if (!dealResponse.error) {
      unwrapList(dealResponse.data).forEach((deal: any) => {
        options.push({
          type: "deal",
          value: deal.id || deal._id,
          label: `${deal.title || "Deal"} · ₹${Number(deal.amount || 0).toLocaleString("en-IN")}`,
        });
      });
    }

    if (!customerResponse.error) {
      const payload: any = customerResponse.data;
      const customers = extractArrayPayload<any>(payload);
      customers.forEach((customer: any) => {
        const id = customer.id || customer._id || customer.profileId;
        if (!id) return;
        options.push({
          type: "customer",
          value: String(id),
          label:
            customer.name ||
            [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
            customer.email ||
            customer.phone ||
            "Customer",
        });
      });
    }

    setRelatedOptions(options);
  };

  const fetchActivities = async () => {
    setLoading(true);
    const response = await activitiesService.getAll({
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
    });
    setLoading(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    setActivities(
      unwrapList(response.data).map((item: any) => ({
        ...item,
        id: item.id || item._id,
        _id: item._id || item.id,
      })),
    );
  };

  useEffect(() => {
    fetchRelatedOptions();
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const relationOptions = useMemo(
    () => [
      { value: "", label: `Select ${form.related_to}` },
      ...relatedOptions
        .filter((option) => option.type === form.related_to)
        .map((option) => ({ value: option.value, label: option.label })),
    ],
    [form.related_to, relatedOptions],
  );

  const relatedLabel = (activity: Activity) =>
    relatedOptions.find(
      (option) =>
        option.type === activity.related_to &&
        option.value === String(activity.related_id),
    )?.label || activity.related_id;

  const openCreate = () => {
    setEditingActivity(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setForm({
      related_to: activity.related_to,
      related_id: activity.related_id,
      type: activity.type,
      title: activity.title,
      description: activity.description || "",
      status: activity.status,
      due_date: activity.due_date
        ? new Date(activity.due_date).toISOString().slice(0, 16)
        : "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingActivity(null);
    setForm(emptyForm());
  };

  const saveActivity = async () => {
    if (!form.title.trim() || !form.related_id) {
      showToast("Title and related record are required", "error");
      return;
    }

    const payload = {
      related_to: form.related_to,
      related_id: form.related_id,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      due_date: form.due_date
        ? new Date(form.due_date).toISOString()
        : null,
    };

    setSaving(true);
    const response = editingActivity
      ? await activitiesService.update(editingActivity.id, payload)
      : await activitiesService.create(payload);
    setSaving(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast(
      editingActivity ? "Activity updated" : "Activity created",
      "success",
    );
    closeForm();
    fetchActivities();
  };

  const toggleStatus = async (activity: Activity) => {
    const nextStatus: ActivityStatus =
      activity.status === "completed" ? "pending" : "completed";
    const response = await activitiesService.update(activity.id, {
      status: nextStatus,
    });
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast(`Activity marked ${nextStatus}`, "success");
    fetchActivities();
  };

  const deleteActivity = async (activity: Activity) => {
    if (!window.confirm(`Delete activity ${activity.title}?`)) return;
    const response = await activitiesService.delete(activity.id);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast("Activity deleted", "success");
    fetchActivities();
  };

  const overdueCount = activities.filter(
    (activity) =>
      activity.status === "pending" &&
      activity.due_date &&
      new Date(activity.due_date).getTime() < Date.now(),
  ).length;

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Sales Activities"
        description="Calls, emails, meetings, tasks and notes linked to CRM records"
      >
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Pending
              </p>
              <p className="mt-1 text-2xl font-black text-blue-600">
                {activities.filter((activity) => activity.status === "pending").length}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Overdue
              </p>
              <p className="mt-1 text-2xl font-black text-rose-600">
                {overdueCount}
              </p>
            </LiquidPanel>
            <LiquidPanel className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Completed
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-600">
                {activities.filter((activity) => activity.status === "completed").length}
              </p>
            </LiquidPanel>
          </div>

          <div className="grid gap-3 md:grid-cols-[.6fr_.6fr_auto]">
            <LiquidDropdown
              value={statusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "completed", label: "Completed" },
              ]}
              onChange={(value) =>
                setStatusFilter(value as "all" | ActivityStatus)
              }
            />
            <LiquidDropdown
              value={typeFilter}
              options={[
                { value: "all", label: "All activity types" },
                ...activityTypeOptions,
              ]}
              onChange={(value) =>
                setTypeFilter(value as "all" | ActivityType)
              }
            />
            <div className="flex gap-2">
              <LiquidButton type="button" variant="soft" onClick={fetchActivities}>
                <RefreshCw className="h-4 w-4" />
              </LiquidButton>
              <LiquidButton type="button" variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add activity
              </LiquidButton>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading activities…
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = activityIcon[activity.type] || CheckCircle2;
                const overdue =
                  activity.status === "pending" &&
                  Boolean(activity.due_date) &&
                  new Date(activity.due_date as string).getTime() < Date.now();

                return (
                  <LiquidPanel
                    key={activity.id}
                    className={`p-4 ${activity.status === "completed" ? "opacity-70" : ""}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <button
                        type="button"
                        onClick={() => toggleStatus(activity)}
                        className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                          activity.status === "completed"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5"
                        }`}
                        aria-label={
                          activity.status === "completed"
                            ? "Reopen activity"
                            : "Complete activity"
                        }
                      >
                        <Icon className="h-4 w-4" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3
                              className={`font-black text-neutral-950 dark:text-white ${
                                activity.status === "completed" ? "line-through" : ""
                              }`}
                            >
                              {activity.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {activity.type} · {activity.related_to} ·{" "}
                              {relatedLabel(activity)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {overdue && (
                              <LiquidBadge className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                Overdue
                              </LiquidBadge>
                            )}
                            <LiquidBadge>{activity.status}</LiquidBadge>
                          </div>
                        </div>

                        {activity.description && (
                          <p className="mt-3 text-sm text-slate-600 dark:text-white/60">
                            {activity.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="h-4 w-4" />
                            Due {formatDateTime(activity.due_date)}
                          </p>
                          <div className="flex gap-2">
                            <LiquidButton
                              type="button"
                              variant="soft"
                              onClick={() => openEdit(activity)}
                            >
                              <Edit2 className="h-4 w-4" /> Edit
                            </LiquidButton>
                            <LiquidButton
                              type="button"
                              variant="danger"
                              onClick={() => deleteActivity(activity)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </LiquidButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </LiquidPanel>
                );
              })}
            </div>
          )}
        </div>
      </TabInnerContent>

      {formOpen && (
        <ResizableFloatingSidebar
          open
          onClose={closeForm}
          title={editingActivity ? "Edit activity" : "New activity"}
          subtitle="Link every sales action to a lead, customer or deal"
          widthStorageKey="aquacrm:activity-form-width"
          initialWidth={620}
          minWidth={480}
          maxWidth={860}
        >
          <div className="space-y-5">
            <LiquidPanel className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <LiquidInput
                  wrapperClassName="sm:col-span-2"
                  label="Title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Activity type"
                  value={form.type}
                  options={activityTypeOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      type: value as ActivityType,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Status"
                  value={form.status}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "completed", label: "Completed" },
                  ]}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as ActivityStatus,
                    }))
                  }
                />
                <LiquidDropdown
                  label="Related to"
                  value={form.related_to}
                  options={relatedTypeOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      related_to: value as RelatedType,
                      related_id: "",
                    }))
                  }
                />
                <LiquidDropdown
                  label="Related record"
                  value={form.related_id}
                  options={relationOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      related_id: value,
                    }))
                  }
                />
                <LiquidInput
                  wrapperClassName="sm:col-span-2"
                  label="Due date & time"
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      due_date: event.target.value,
                    }))
                  }
                />
              </div>
              <LiquidTextarea
                wrapperClassName="mt-3"
                label="Description"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </LiquidPanel>

            <div className="sticky bottom-0 -mx-5 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
              <div className="flex justify-end gap-2">
                <LiquidButton type="button" variant="ghost" onClick={closeForm}>
                  Cancel
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="primary"
                  disabled={saving}
                  onClick={saveActivity}
                >
                  {saving
                    ? "Saving…"
                    : editingActivity
                      ? "Update activity"
                      : "Create activity"}
                </LiquidButton>
              </div>
            </div>
          </div>
        </ResizableFloatingSidebar>
      )}
    </div>
  );
}
