import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCheck,
  CircleDot,
  MessageCircleMore,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { whatsappCrmService } from "../../services/apiService";
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

type ConversationStatus = "open" | "closed" | "archived";

type ConversationLead = {
  _id?: string;
  id?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  status?: string;
  score?: number;
  score_band?: string;
  qualification?: {
    locality?: string;
    pincode?: string;
    product_interest?: string;
    water_source?: string;
    hardness_ppm?: number;
    recommended_product_name?: string;
  };
  next_follow_up?: string | null;
};

type Conversation = {
  _id: string;
  id?: string;
  phone_normalized: string;
  wa_id?: string;
  contact_name?: string;
  lead_id?: ConversationLead | string | null;
  customer_id?: string;
  customer_type?: string;
  status: ConversationStatus;
  unread_count?: number;
  last_message_at?: string | null;
  last_message_direction?: "inbound" | "outbound" | "";
  last_message_preview?: string;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  tags?: string[];
};

type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  provider?: string;
  provider_status?: string;
  phone_normalized?: string;
  message_type?: string;
  text?: string;
  template_id?: string;
  occurred_at?: string;
  status_history?: Array<{ status?: string; at?: string }>;
  quotation_id?: {
    _id?: string;
    quotationNo?: string;
    status?: string;
    totalAmount?: number;
  } | null;
};

const unwrapList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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

const leadFromConversation = (conversation?: Conversation | null) =>
  conversation &&
  conversation.lead_id &&
  typeof conversation.lead_id === "object"
    ? conversation.lead_id
    : null;

const statusClass = (status?: string) => {
  if (status === "read" || status === "delivered")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (status === "failed")
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
  return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70";
};

export default function WhatsAppTab() {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ConversationStatus>(
    "open",
  );
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [variablesText, setVariablesText] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    setLoadingList(true);
    const response = await whatsappCrmService.getConversations({
      page: 1,
      limit: 100,
      status: statusFilter === "all" ? undefined : statusFilter,
      unread: unreadOnly || undefined,
      search: search || undefined,
    });
    setLoadingList(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    const payload: any = response.data;
    const list = unwrapList(payload?.data ?? payload);
    setConversations(
      list.map((item: any) => ({
        ...item,
        _id: item._id || item.id,
      })),
    );
  };

  const fetchMessages = async (conversation: Conversation) => {
    setLoadingMessages(true);
    const [messageResponse, detailResponse] = await Promise.all([
      whatsappCrmService.getMessages(conversation._id, {
        page: 1,
        limit: 200,
      }),
      whatsappCrmService.getConversation(conversation._id),
    ]);
    setLoadingMessages(false);

    if (messageResponse.error) {
      showToast(messageResponse.error, "error");
      return;
    }

    const messagePayload: any = messageResponse.data;
    setMessages(unwrapList(messagePayload?.data ?? messagePayload));

    if (!detailResponse.error) {
      const detail: any =
        (detailResponse.data as any)?.data || detailResponse.data;
      if (detail) {
        setSelected({ ...detail, _id: detail._id || detail.id });
      }
    }

    if ((conversation.unread_count || 0) > 0) {
      await whatsappCrmService.updateConversation(conversation._id, {
        mark_read: true,
      });
      fetchConversations();
    }
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, unreadOnly]);

  const selectConversation = (conversation: Conversation) => {
    setSelected(conversation);
    setMessages([]);
    fetchMessages(conversation);
  };

  const selectedLead = leadFromConversation(selected);

  const variables = useMemo(
    () =>
      variablesText
        .split(/
|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    [variablesText],
  );

  const sendTemplate = async () => {
    if (!selected) return;
    if (!templateId.trim()) {
      showToast("Approved WhatsApp template ID is required", "error");
      return;
    }

    setSending(true);
    const response = await whatsappCrmService.sendTemplate(selected._id, {
      messageId: templateId.trim(),
      variables,
      previewText: previewText.trim(),
    });
    setSending(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    setPreviewText("");
    showToast("WhatsApp template sent", "success");
    await Promise.all([fetchMessages(selected), fetchConversations()]);
  };

  const updateStatus = async (status: ConversationStatus) => {
    if (!selected) return;
    const response = await whatsappCrmService.updateConversation(selected._id, {
      status,
    });
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast(`Conversation ${status}`, "success");
    const updated: any = (response.data as any)?.data || response.data;
    if (updated) setSelected({ ...updated, _id: updated._id || updated.id });
    fetchConversations();
  };

  const visibleConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const value = search.toLowerCase();
    return conversations.filter((conversation) =>
      [
        conversation.contact_name,
        conversation.phone_normalized,
        conversation.last_message_preview,
        leadFromConversation(conversation)?.qualification?.locality,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [conversations, search]);

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="WhatsApp Inbox"
        description="Persistent customer conversations linked to CRM leads and quotations"
      >
        <div className="grid min-h-[70vh] gap-4 p-4 lg:grid-cols-[360px_1fr] sm:p-5">
          <LiquidPanel className="flex min-h-0 flex-col overflow-hidden">
            <div className="border-b border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <MessageCircleMore className="h-5 w-5 text-emerald-500" />
                <h3 className="font-black text-neutral-950 dark:text-white">
                  Conversations
                </h3>
                <LiquidBadge className="ml-auto">
                  {conversations.reduce(
                    (sum, conversation) =>
                      sum + Number(conversation.unread_count || 0),
                    0,
                  )}{" "}
                  unread
                </LiquidBadge>
              </div>
              <div className="mt-4 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <LiquidInput
                    aria-label="Search conversations"
                    className="pl-9"
                    placeholder="Search name, phone, locality..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") fetchConversations();
                    }}
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <LiquidDropdown
                    value={statusFilter}
                    options={[
                      { value: "all", label: "All" },
                      { value: "open", label: "Open" },
                      { value: "closed", label: "Closed" },
                      { value: "archived", label: "Archived" },
                    ]}
                    onChange={(value) =>
                      setStatusFilter(value as "all" | ConversationStatus)
                    }
                  />
                  <LiquidButton
                    type="button"
                    variant={unreadOnly ? "primary" : "soft"}
                    onClick={() => setUnreadOnly((current) => !current)}
                    title="Unread only"
                  >
                    <CircleDot className="h-4 w-4" />
                  </LiquidButton>
                  <LiquidButton
                    type="button"
                    variant="soft"
                    onClick={fetchConversations}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </LiquidButton>
                </div>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
              {loadingList ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  Loading conversations…
                </p>
              ) : (
                visibleConversations.map((conversation) => {
                  const lead = leadFromConversation(conversation);
                  const active = selected?._id === conversation._id;
                  return (
                    <button
                      key={conversation._id}
                      type="button"
                      onClick={() => selectConversation(conversation)}
                      className={`w-full border-b border-slate-100 p-4 text-left transition dark:border-white/5 ${
                        active
                          ? "bg-emerald-50 dark:bg-emerald-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-bold text-neutral-950 dark:text-white">
                              {conversation.contact_name ||
                                lead?.contact_name ||
                                conversation.phone_normalized}
                            </p>
                            {(conversation.unread_count || 0) > 0 && (
                              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-black text-white">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {conversation.last_message_preview || "No messages"}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                            <span>
                              {lead?.score !== undefined
                                ? `${lead.score} · ${lead.score_band || "cold"}`
                                : lead?.status || "No lead"}
                            </span>
                            <span>{formatDateTime(conversation.last_message_at)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}

              {!loadingList && visibleConversations.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">
                  No conversations found.
                </p>
              )}
            </div>
          </LiquidPanel>

          <LiquidPanel className="flex min-h-[620px] flex-col overflow-hidden">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <MessageCircleMore className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-black text-neutral-950 dark:text-white">
                    Select a conversation
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Incoming WhatsApp messages will appear here and stay linked
                    to the same CRM lead.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 p-4 dark:border-white/10">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-neutral-950 dark:text-white">
                        {selected.contact_name ||
                          selectedLead?.contact_name ||
                          selected.phone_normalized}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        +91 {selected.phone_normalized}
                        {selectedLead?.qualification?.locality
                          ? ` · ${selectedLead.qualification.locality}`
                          : ""}
                      </p>
                      {selectedLead && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <LiquidBadge>
                            {selectedLead.status || "lead"}
                          </LiquidBadge>
                          <LiquidBadge>
                            {selectedLead.score ?? 0} ·{" "}
                            {selectedLead.score_band || "cold"}
                          </LiquidBadge>
                          {selectedLead.qualification?.product_interest && (
                            <LiquidBadge>
                              {selectedLead.qualification.product_interest}
                            </LiquidBadge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <LiquidButton
                        type="button"
                        variant="soft"
                        onClick={() => updateStatus("open")}
                      >
                        Open
                      </LiquidButton>
                      <LiquidButton
                        type="button"
                        variant="soft"
                        onClick={() => updateStatus("closed")}
                      >
                        <CheckCheck className="h-4 w-4" /> Close
                      </LiquidButton>
                      <LiquidButton
                        type="button"
                        variant="ghost"
                        onClick={() => updateStatus("archived")}
                      >
                        <Archive className="h-4 w-4" /> Archive
                      </LiquidButton>
                    </div>
                  </div>
                </div>

                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 dark:bg-slate-950/20">
                  {loadingMessages ? (
                    <p className="py-10 text-center text-sm text-slate-500">
                      Loading messages…
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const outbound = message.direction === "outbound";
                        return (
                          <div
                            key={message._id}
                            className={`flex ${
                              outbound ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
                                outbound
                                  ? "bg-emerald-600 text-white"
                                  : "border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-white"
                              }`}
                            >
                              <p className="whitespace-pre-wrap text-sm">
                                {message.text ||
                                  (message.template_id
                                    ? `Template ${message.template_id}`
                                    : message.message_type || "WhatsApp message")}
                              </p>
                              {message.quotation_id?.quotationNo && (
                                <p
                                  className={`mt-2 text-xs ${
                                    outbound
                                      ? "text-white/70"
                                      : "text-slate-500"
                                  }`}
                                >
                                  Quote {message.quotation_id.quotationNo}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <span
                                  className={`text-[10px] ${
                                    outbound
                                      ? "text-white/65"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {formatDateTime(message.occurred_at)}
                                </span>
                                {outbound && (
                                  <LiquidBadge
                                    className={statusClass(
                                      message.provider_status,
                                    )}
                                  >
                                    {message.provider_status || "sent"}
                                  </LiquidBadge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {messages.length === 0 && (
                        <p className="py-10 text-center text-sm text-slate-500">
                          No stored messages yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 p-4 dark:border-white/10">
                  <div className="grid gap-3 xl:grid-cols-[.65fr_1fr]">
                    <LiquidInput
                      label="Approved template ID"
                      value={templateId}
                      placeholder="Fast2SMS message ID"
                      onChange={(event) => setTemplateId(event.target.value)}
                    />
                    <LiquidInput
                      label="Template variables"
                      value={variablesText}
                      placeholder="Name, Product, Link — comma or new line separated"
                      onChange={(event) => setVariablesText(event.target.value)}
                    />
                  </div>
                  <LiquidTextarea
                    wrapperClassName="mt-3"
                    label="CRM preview text"
                    rows={2}
                    value={previewText}
                    placeholder="Optional readable preview saved in conversation history"
                    onChange={(event) => setPreviewText(event.target.value)}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      WhatsApp requires an approved template ID for outbound
                      messages.
                    </p>
                    <LiquidButton
                      type="button"
                      variant="primary"
                      disabled={sending || !templateId.trim()}
                      onClick={sendTemplate}
                    >
                      <Send className="h-4 w-4" />
                      {sending ? "Sending…" : "Send template"}
                    </LiquidButton>
                  </div>
                </div>
              </>
            )}
          </LiquidPanel>
        </div>
      </TabInnerContent>
    </div>
  );
}
