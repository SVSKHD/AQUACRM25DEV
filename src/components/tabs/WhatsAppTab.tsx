import { useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import {
  LiquidBadge,
  LiquidButton,
  LiquidInput,
  LiquidPanel,
} from "../ui/liquid";
import ResizableFloatingSidebar from "../ui/ResizableFloatingSidebar";
import { whatsappCrmService } from "../../services/apiService";

type Conversation = {
  _id: string;
  id?: string;
  phone_normalized: string;
  contact_name?: string;
  unread_count?: number;
  status?: "open" | "closed" | "archived";
  last_message_at?: string;
  last_message_direction?: "inbound" | "outbound" | "";
  last_message_preview?: string;
  lead_id?: {
    _id?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    status?: string;
    score?: number;
    score_band?: string;
    qualification?: Record<string, any>;
    next_follow_up?: string | null;
  } | null;
};

type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  provider: "meta" | "fast2sms";
  provider_status: string;
  message_type: string;
  text?: string;
  template_id?: string;
  occurred_at?: string;
  quotation_id?: {
    quotationNo?: string;
    status?: string;
    totalAmount?: number;
  } | null;
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
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

export default function WhatsAppTab() {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [messageId, setMessageId] = useState("");
  const [variables, setVariables] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    const { data, error } = await whatsappCrmService.getConversations({
      search: search.trim() || undefined,
      unread: unreadOnly ? "true" : undefined,
      limit: 100,
    });

    if (error) {
      showToast(error, "error");
    } else {
      const payload: any = data;
      setConversations(
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [],
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  const unreadTotal = useMemo(
    () =>
      conversations.reduce(
        (total, item) => total + Number(item.unread_count || 0),
        0,
      ),
    [conversations],
  );

  const openConversation = async (conversation: Conversation) => {
    setSelected(conversation);
    setThreadLoading(true);

    const [conversationResponse, messageResponse] = await Promise.all([
      whatsappCrmService.getConversation(conversation._id),
      whatsappCrmService.getMessages(conversation._id, { limit: 200 }),
    ]);

    if (conversationResponse.error) {
      showToast(conversationResponse.error, "error");
    } else {
      const payload: any = conversationResponse.data;
      setSelected(payload?.data || payload || conversation);
    }

    if (messageResponse.error) {
      showToast(messageResponse.error, "error");
      setMessages([]);
    } else {
      const payload: any = messageResponse.data;
      setMessages(
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [],
      );
    }

    if (Number(conversation.unread_count || 0) > 0) {
      await whatsappCrmService.updateConversation(conversation._id, {
        mark_read: true,
      });
      setConversations((current) =>
        current.map((item) =>
          item._id === conversation._id ? { ...item, unread_count: 0 } : item,
        ),
      );
    }

    setThreadLoading(false);
  };

  const sendTemplate = async () => {
    if (!selected || !messageId.trim()) {
      showToast("Enter an approved WhatsApp message ID", "error");
      return;
    }

    setSending(true);
    const response = await whatsappCrmService.sendTemplate(selected._id, {
      messageId: messageId.trim(),
      variables: variables
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
      previewText: previewText.trim(),
    });

    if (response.error) {
      showToast(response.error, "error");
    } else {
      showToast("WhatsApp template sent", "success");
      setPreviewText("");
      const messageResponse = await whatsappCrmService.getMessages(selected._id, {
        limit: 200,
      });
      const payload: any = messageResponse.data;
      if (!messageResponse.error) {
        setMessages(
          Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [],
        );
      }
      void fetchConversations();
    }
    setSending(false);
  };

  return (
    <TabInnerContent
      title="WhatsApp Inbox"
      description="Incoming customer conversations linked directly to CRM leads"
    >
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <LiquidInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void fetchConversations();
          }}
          placeholder="Search customer name or phone"
        />
        <LiquidButton
          type="button"
          variant={unreadOnly ? "primary" : "soft"}
          onClick={() => setUnreadOnly((current) => !current)}
        >
          Unread only {unreadTotal > 0 ? `(${unreadTotal})` : ""}
        </LiquidButton>
        <LiquidButton type="button" variant="soft" onClick={fetchConversations}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </LiquidButton>
      </div>

      {loading ? (
        <div className="py-14 text-center text-sm text-slate-500">
          Loading WhatsApp conversations…
        </div>
      ) : conversations.length === 0 ? (
        <LiquidPanel className="p-10 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-4 font-bold text-neutral-950 dark:text-white">
            No conversations yet
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-white/50">
            Incoming Meta WhatsApp messages will appear here after backend PR #54
            is deployed.
          </p>
        </LiquidPanel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {conversations.map((conversation) => (
            <button
              key={conversation._id}
              type="button"
              onClick={() => void openConversation(conversation)}
              className="glass-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-neutral-950 dark:text-white">
                      {conversation.contact_name ||
                        conversation.lead_id?.contact_name ||
                        conversation.phone_normalized}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white/45">
                      +91 {conversation.phone_normalized}
                    </p>
                  </div>
                </div>
                {Number(conversation.unread_count || 0) > 0 && (
                  <span className="grid min-h-6 min-w-6 place-items-center rounded-full bg-emerald-600 px-1.5 text-xs font-black text-white">
                    {conversation.unread_count}
                  </span>
                )}
              </div>

              <p className="mt-4 line-clamp-2 min-h-10 text-sm text-slate-600 dark:text-white/60">
                {conversation.last_message_preview || "No preview available"}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <LiquidBadge className={scoreClass(conversation.lead_id?.score_band)}>
                  {conversation.lead_id?.score_band || "unscored"} ·{" "}
                  {conversation.lead_id?.score ?? 0}
                </LiquidBadge>
                <LiquidBadge>{conversation.lead_id?.status || "no lead stage"}</LiquidBadge>
              </div>

              <p className="mt-3 text-[11px] text-slate-400">
                {formatDateTime(conversation.last_message_at)}
              </p>
            </button>
          ))}
        </div>
      )}

      <ResizableFloatingSidebar
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setMessages([]);
        }}
        title={
          selected?.contact_name ||
          selected?.lead_id?.contact_name ||
          "WhatsApp conversation"
        }
        subtitle={selected ? `+91 ${selected.phone_normalized}` : ""}
        widthStorageKey="aquacrm:whatsapp-conversation-width"
        initialWidth={680}
        minWidth={460}
        maxWidth={1000}
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <LiquidPanel className="p-4">
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  Lead stage
                </p>
                <p className="mt-1 font-bold text-neutral-950 dark:text-white">
                  {selected.lead_id?.status || "—"}
                </p>
              </LiquidPanel>
              <LiquidPanel className="p-4">
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  Lead score
                </p>
                <p className="mt-1 font-bold text-neutral-950 dark:text-white">
                  {selected.lead_id?.score ?? 0} ·{" "}
                  {selected.lead_id?.score_band || "cold"}
                </p>
              </LiquidPanel>
              <LiquidPanel className="p-4">
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  Next follow-up
                </p>
                <p className="mt-1 text-sm font-bold text-neutral-950 dark:text-white">
                  {formatDateTime(selected.lead_id?.next_follow_up || undefined)}
                </p>
              </LiquidPanel>
            </div>

            <LiquidPanel className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-black text-neutral-950 dark:text-white">
                  Conversation
                </h3>
                <LiquidButton
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    void whatsappCrmService.updateConversation(selected._id, {
                      mark_read: true,
                    })
                  }
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark read
                </LiquidButton>
              </div>

              <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                {threadLoading ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    Loading messages…
                  </p>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No stored messages.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={
                        message.direction === "outbound"
                          ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 p-3 text-white"
                          : "mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 p-3 text-slate-900 dark:bg-white/10 dark:text-white"
                      }
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.text ||
                          (message.template_id
                            ? `Template ${message.template_id}`
                            : message.message_type)}
                      </p>
                      {message.quotation_id?.quotationNo && (
                        <p className="mt-2 text-xs opacity-70">
                          {message.quotation_id.quotationNo}
                        </p>
                      )}
                      <p className="mt-2 text-[10px] opacity-60">
                        {formatDateTime(message.occurred_at)} ·{" "}
                        {message.provider_status}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-4">
              <h3 className="font-black text-neutral-950 dark:text-white">
                Send approved template
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-white/45">
                Fast2SMS/WhatsApp requires an approved template message ID.
              </p>
              <div className="mt-4 space-y-3">
                <LiquidInput
                  label="Message ID"
                  value={messageId}
                  onChange={(event) => setMessageId(event.target.value)}
                  placeholder="Approved template ID"
                />
                <LiquidInput
                  label="Variables"
                  value={variables}
                  onChange={(event) => setVariables(event.target.value)}
                  placeholder="Name|Product|Link"
                />
                <LiquidInput
                  label="CRM preview text"
                  value={previewText}
                  onChange={(event) => setPreviewText(event.target.value)}
                  placeholder="Optional readable preview stored in CRM"
                />
                <LiquidButton
                  type="button"
                  variant="primary"
                  onClick={() => void sendTemplate()}
                  disabled={sending}
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : "Send WhatsApp"}
                </LiquidButton>
              </div>
            </LiquidPanel>
          </div>
        )}
      </ResizableFloatingSidebar>
    </TabInnerContent>
  );
}
