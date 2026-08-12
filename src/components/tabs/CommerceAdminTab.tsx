/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { useToast } from "../Toast";
import { commerceAdminService as service } from "../../services/commerceAdminService";
import TabInnerContent from "../Layout/tabInnerlayout";

export type CommerceAdminView =
  "roles" | "staff" | "coupons" | "referrals" | "payments" | "audit" | "seo";
type RecordItem = Record<string, any> & { _id?: string };

const unwrap = (response: any): RecordItem[] => response?.data?.data || [];
const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString("en-IN") : "—";
const withoutEmpty = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== "" && item !== undefined,
    ),
  );

function Status({ value }: { value: unknown }) {
  const label = String(value || "unknown");
  return (
    <span className={`commerce-status commerce-status-${label.toLowerCase()}`}>
      {label}
    </span>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="commerce-empty">
      {loading ? "Loading records…" : "No records found."}
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="commerce-panel">
      <div className="commerce-panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function CommerceAdminTab({
  view,
}: {
  view: CommerceAdminView;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [secondary, setSecondary] = useState<RecordItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const calls: Record<CommerceAdminView, () => Promise<any[]>> = {
      roles: async () => Promise.all([service.roles(), service.permissions()]),
      staff: async () => Promise.all([service.staff(), service.roles()]),
      coupons: async () => [await service.coupons(page)],
      referrals: async () =>
        Promise.all([
          service.campaigns(),
          service.referrals(),
          service.rewards(),
        ]),
      payments: async () =>
        Promise.all([service.payments(page), service.gateways()]),
      audit: async () => [await service.auditLogs()],
      seo: async () => [await service.seo(page, search)],
    };
    try {
      const result = await calls[view]();
      const failure = result.find((item: any) => item?.error);
      if (failure) throw new Error(failure.error);
      setRows(unwrap(result[0]));
      setSecondary(unwrap(result[1]));
      if (view === "roles")
        setPermissions((result[1]?.data?.data || []) as string[]);
      if (view === "referrals")
        setPermissions(unwrap(result[2]).map((item) => JSON.stringify(item)));
      setTotalPages(result[0]?.data?.pagination?.totalPages || 1);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to load administration data",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast, view]);

  useEffect(() => {
    setPage(1);
    setEditing(null);
    setFormOpen(false);
  }, [view]);
  useEffect(() => {
    void load();
  }, [load]);

  const done = async (request: Promise<any>, message: string) => {
    const response = await request;
    if (response.error) return showToast(response.error, "error");
    showToast(message, "success");
    setEditing(null);
    setFormOpen(false);
    await load();
  };

  const submitRole = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      name: data.get("name"),
      description: data.get("description"),
      permissions: data.getAll("permissions"),
    };
    void done(
      editing?._id
        ? service.updateRole(editing._id, body)
        : service.createRole(body),
      editing ? "Role updated" : "Role created",
    );
  };

  const submitStaff = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (!data.password) delete data.password;
    void done(
      editing?._id
        ? service.updateStaff(editing._id, withoutEmpty(data))
        : service.createStaff(withoutEmpty(data)),
      editing ? "Staff updated" : "Staff created",
    );
  };

  const submitCoupon = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = withoutEmpty({
      ...raw,
      discountValue: Number(raw.discountValue),
      minimumOrder: Number(raw.minimumOrder || 0),
      maxDiscount: raw.maxDiscount ? Number(raw.maxDiscount) : undefined,
      usageLimit: raw.usageLimit ? Number(raw.usageLimit) : undefined,
      perUserLimit: Number(raw.perUserLimit || 1),
      firstOrderOnly: raw.firstOrderOnly === "on",
      stackable: raw.stackable === "on",
    });
    void done(
      editing?._id
        ? service.updateCoupon(editing._id, body)
        : service.createCoupon(body),
      editing ? "Coupon updated" : "Coupon created",
    );
  };

  const submitCampaign = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      ...raw,
      referrerReward: Number(raw.referrerReward),
      referredReward: Number(raw.referredReward),
      minimumPaidOrder: Number(raw.minimumPaidOrder),
      rewardDelayDays: Number(raw.rewardDelayDays),
    };
    void done(
      editing?._id
        ? service.updateCampaign(editing._id, body)
        : service.createCampaign(body),
      editing ? "Campaign updated" : "Campaign created",
    );
  };

  const submitSeo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    let schemaJson = null;
    if (String(raw.schemaJson || "").trim()) {
      try {
        schemaJson = JSON.parse(String(raw.schemaJson));
      } catch {
        showToast("Schema JSON must contain valid JSON", "error");
        return;
      }
    }
    const body = {
      pageKey: String(raw.pageKey || "")
        .trim()
        .toLowerCase(),
      route: raw.route,
      title: raw.title,
      description: raw.description,
      keywords: String(raw.keywords || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      canonicalUrl: raw.canonicalUrl,
      robots: raw.robots,
      ogTitle: raw.ogTitle,
      ogDescription: raw.ogDescription,
      ogImage: raw.ogImage,
      twitterTitle: raw.twitterTitle,
      twitterDescription: raw.twitterDescription,
      twitterImage: raw.twitterImage,
      schemaJson,
      active: raw.active === "on",
    };
    void done(
      editing?._id
        ? service.updateSeo(editing._id, body)
        : service.createSeo(body),
      editing ? "SEO configuration updated" : "SEO configuration created",
    );
  };

  const pager = totalPages > 1 && (
    <div className="commerce-pager">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
        Next
      </button>
    </div>
  );
  const add = (label: string) => (
    <button
      className="commerce-primary"
      onClick={() => {
        setEditing(null);
        setFormOpen(true);
      }}
    >
      <Plus />
      {label}
    </button>
  );

  const roleView = (
    <>
      <Panel title="Roles" action={add("Create role")}>
        {!rows.length ? (
          <Empty loading={loading} />
        ) : (
          <div className="commerce-grid">
            {rows.map((role) => (
              <article className="commerce-card" key={role._id}>
                <div>
                  <h4>{role.name}</h4>
                  <p>{role.description || "No description"}</p>
                </div>
                <Status
                  value={role.isActive === false ? "archived" : "active"}
                />
                <small>{role.permissions?.length || 0} permissions</small>
                <div className="commerce-actions">
                  <button
                    disabled={role.isSystem}
                    onClick={() => {
                      setEditing(role);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil />
                    Edit
                  </button>
                  <button
                    disabled={role.isSystem}
                    onClick={() =>
                      role._id &&
                      void done(service.archiveRole(role._id), "Role archived")
                    }
                  >
                    <Trash2 />
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
      {formOpen && (
        <Panel title={editing ? "Edit role" : "New role"}>
          <form className="commerce-form" onSubmit={submitRole}>
            <label>
              Name
              <input name="name" required defaultValue={editing?.name} />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={editing?.description}
              />
            </label>
            <fieldset>
              <legend>Permissions</legend>
              <div className="permission-grid">
                {permissions.map((permission) => (
                  <label key={permission}>
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission}
                      defaultChecked={editing?.permissions?.includes(
                        permission,
                      )}
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="commerce-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="commerce-primary" type="submit">
                <Check />
                Save role
              </button>
            </div>
          </form>
        </Panel>
      )}
    </>
  );

  const staffView = (
    <>
      <Panel title="Staff" action={add("Create staff")}>
        {!rows.length ? (
          <Empty loading={loading} />
        ) : (
          <div className="commerce-table-wrap">
            <table className="commerce-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((staff) => (
                  <tr key={staff._id}>
                    <td>
                      <strong>
                        {[staff.firstName, staff.lastName]
                          .filter(Boolean)
                          .join(" ") || "Unnamed"}
                      </strong>
                      <small>{staff.email}</small>
                    </td>
                    <td>{staff.roleRef?.name || "Legacy admin"}</td>
                    <td>
                      <Status value={staff.status} />
                    </td>
                    <td>
                      <div className="commerce-actions">
                        <button
                          onClick={() => {
                            setEditing(staff);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil />
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            staff._id &&
                            void done(
                              service.setStaffStatus(
                                staff._id,
                                staff.status === "active"
                                  ? "disabled"
                                  : "active",
                              ),
                              "Staff status updated",
                            )
                          }
                        >
                          {staff.status === "active" ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {formOpen && (
        <Panel title={editing ? "Edit staff" : "New staff"}>
          <form
            className="commerce-form commerce-form-columns"
            onSubmit={submitStaff}
          >
            <label>
              First name
              <input
                name="firstName"
                required
                defaultValue={editing?.firstName}
              />
            </label>
            <label>
              Last name
              <input name="lastName" defaultValue={editing?.lastName} />
            </label>
            {!editing && (
              <label>
                Email
                <input name="email" type="email" required />
              </label>
            )}
            <label>
              {editing ? "New password (optional)" : "Temporary password"}
              <input
                name="password"
                type="password"
                required={!editing}
                minLength={8}
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                inputMode="numeric"
                defaultValue={editing?.phone}
              />
            </label>
            <label>
              Role
              <select
                name="roleId"
                required
                defaultValue={editing?.roleRef?._id || ""}
              >
                <option value="">Select role</option>
                {secondary
                  .filter((role) => role.isActive !== false)
                  .map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="commerce-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="commerce-primary" type="submit">
                Save staff
              </button>
            </div>
          </form>
        </Panel>
      )}
    </>
  );

  const couponView = (
    <>
      <Panel title="Coupons" action={add("Create coupon")}>
        {!rows.length ? (
          <Empty loading={loading} />
        ) : (
          <div className="commerce-table-wrap">
            <table className="commerce-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Window</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((coupon) => (
                  <tr key={coupon._id}>
                    <td>
                      <strong>{coupon.code}</strong>
                      <small>{coupon.description}</small>
                    </td>
                    <td>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : money(coupon.discountValue)}
                      <small>Min {money(coupon.minimumOrder)}</small>
                    </td>
                    <td>
                      {date(coupon.startsAt)} – {date(coupon.endsAt)}
                    </td>
                    <td>
                      {coupon.usageCount || 0} / {coupon.usageLimit || "∞"}
                    </td>
                    <td>
                      <Status value={coupon.status} />
                    </td>
                    <td>
                      <div className="commerce-actions">
                        <button
                          onClick={() => {
                            setEditing(coupon);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil />
                          Edit
                        </button>
                        <button
                          disabled={coupon.status === "archived"}
                          onClick={() =>
                            coupon._id &&
                            void done(
                              service.archiveCoupon(coupon._id),
                              "Coupon archived",
                            )
                          }
                        >
                          <Trash2 />
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pager}
      </Panel>
      {formOpen && (
        <Panel title={editing ? `Edit ${editing.code}` : "New coupon"}>
          <form
            className="commerce-form commerce-form-columns"
            onSubmit={submitCoupon}
          >
            <label>
              Code
              <input name="code" required defaultValue={editing?.code} />
            </label>
            <label>
              Description
              <input name="description" defaultValue={editing?.description} />
            </label>
            <label>
              Discount type
              <select
                name="discountType"
                defaultValue={editing?.discountType || "percentage"}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
            <label>
              Discount value
              <input
                name="discountValue"
                type="number"
                min="0"
                required
                defaultValue={editing?.discountValue}
              />
            </label>
            <label>
              Minimum order
              <input
                name="minimumOrder"
                type="number"
                min="0"
                defaultValue={editing?.minimumOrder || 0}
              />
            </label>
            <label>
              Maximum discount
              <input
                name="maxDiscount"
                type="number"
                min="0"
                defaultValue={editing?.maxDiscount}
              />
            </label>
            <label>
              Starts at
              <input
                name="startsAt"
                type="datetime-local"
                defaultValue={editing?.startsAt?.slice?.(0, 16)}
              />
            </label>
            <label>
              Ends at
              <input
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={editing?.endsAt?.slice?.(0, 16)}
              />
            </label>
            <label>
              Global limit
              <input
                name="usageLimit"
                type="number"
                min="1"
                defaultValue={editing?.usageLimit}
              />
            </label>
            <label>
              Per-user limit
              <input
                name="perUserLimit"
                type="number"
                min="1"
                defaultValue={editing?.perUserLimit || 1}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={editing?.status || "active"}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <div className="commerce-checks">
              <label>
                <input
                  type="checkbox"
                  name="firstOrderOnly"
                  defaultChecked={editing?.firstOrderOnly}
                />
                First order only
              </label>
              <label>
                <input
                  type="checkbox"
                  name="stackable"
                  defaultChecked={editing?.stackable}
                />
                Stackable
              </label>
            </div>
            <div className="commerce-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="commerce-primary" type="submit">
                Save coupon
              </button>
            </div>
          </form>
        </Panel>
      )}
    </>
  );

  const referralView = (
    <>
      <Panel title="Referral campaigns" action={add("Create campaign")}>
        {!rows.length ? (
          <Empty loading={loading} />
        ) : (
          <div className="commerce-grid">
            {rows.map((campaign) => (
              <article className="commerce-card" key={campaign._id}>
                <div>
                  <h4>{campaign.name}</h4>
                  <p>
                    Referrer {money(campaign.referrerReward)} · Friend{" "}
                    {money(campaign.referredReward)}
                  </p>
                </div>
                <Status value={campaign.status} />
                <small>
                  Minimum paid order {money(campaign.minimumPaidOrder)} ·{" "}
                  {campaign.rewardDelayDays || 0} day delay
                </small>
                <button
                  onClick={() => {
                    setEditing(campaign);
                    setFormOpen(true);
                  }}
                >
                  <Pencil />
                  Edit
                </button>
              </article>
            ))}
          </div>
        )}
      </Panel>
      {formOpen && (
        <Panel title={editing ? "Edit campaign" : "New campaign"}>
          <form
            className="commerce-form commerce-form-columns"
            onSubmit={submitCampaign}
          >
            <label>
              Name
              <input name="name" required defaultValue={editing?.name} />
            </label>
            <label>
              Referrer reward
              <input
                name="referrerReward"
                type="number"
                min="0"
                required
                defaultValue={editing?.referrerReward}
              />
            </label>
            <label>
              Referred reward
              <input
                name="referredReward"
                type="number"
                min="0"
                required
                defaultValue={editing?.referredReward}
              />
            </label>
            <label>
              Minimum paid order
              <input
                name="minimumPaidOrder"
                type="number"
                min="0"
                required
                defaultValue={editing?.minimumPaidOrder}
              />
            </label>
            <label>
              Reward delay (days)
              <input
                name="rewardDelayDays"
                type="number"
                min="0"
                defaultValue={editing?.rewardDelayDays || 0}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={editing?.status || "active"}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </label>
            <div className="commerce-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="commerce-primary" type="submit">
                Save campaign
              </button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title={`Referrals (${secondary.length})`}>
        <div className="commerce-list">
          {secondary.slice(0, 5).map((item) => (
            <div key={item._id}>
              <strong>{item.code}</strong>
              <Status value={item.status} />
              <small>{date(item.createdAt)}</small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Reward approvals">
        <div className="commerce-list">
          {permissions.slice(0, 5).map((raw) => {
            const reward = JSON.parse(raw);
            return (
              <div key={reward._id}>
                <strong>{money(reward.amount)}</strong>
                <Status value={reward.status} />
                <span className="commerce-actions">
                  {reward.status === "pending" && (
                    <>
                      <button
                        onClick={() =>
                          void done(
                            service.setRewardStatus(reward._id, "approved"),
                            "Reward approved",
                          )
                        }
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          void done(
                            service.setRewardStatus(
                              reward._id,
                              "rejected",
                              "Rejected by administrator",
                            ),
                            "Reward rejected",
                          )
                        }
                      >
                        Reject
                      </button>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );

  const paymentView = (
    <>
      <Panel
        title="Payment attempts"
        action={
          <button onClick={() => void load()}>
            <RefreshCw />
            Refresh
          </button>
        }
      >
        {!rows.length ? (
          <Empty loading={loading} />
        ) : (
          <div className="commerce-table-wrap">
            <table className="commerce-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Gateway</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => (
                  <tr key={payment._id}>
                    <td>
                      <strong>{payment.merchantTransactionId}</strong>
                      <small>{payment.orderId}</small>
                    </td>
                    <td>{payment.gateway}</td>
                    <td>{money(payment.amount)}</td>
                    <td>
                      <Status value={payment.status} />
                    </td>
                    <td>{date(payment.createdAt)}</td>
                    <td>
                      <button
                        onClick={() =>
                          payment._id &&
                          void done(
                            service.reconcilePayment(payment._id),
                            "Payment reconciled",
                          )
                        }
                      >
                        <RefreshCw />
                        Reconcile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pager}
      </Panel>
      <Panel title="Payment gateways">
        <div className="commerce-grid">
          {secondary.map((gateway) => (
            <article className="commerce-card" key={gateway.key}>
              <div>
                <h4>{gateway.displayName || gateway.key}</h4>
                <p>{gateway.methods?.join(", ") || "No public methods"}</p>
              </div>
              <Status value={gateway.enabled ? "enabled" : "disabled"} />
              <small>
                Priority {gateway.priority || 100} ·{" "}
                {gateway.config?.mode || "production"}
              </small>
              <button
                onClick={() =>
                  void done(
                    service.updateGateway(gateway.key, {
                      displayName: gateway.displayName,
                      enabled: !gateway.enabled,
                      priority: gateway.priority,
                      methods: gateway.methods,
                      config: gateway.config,
                    }),
                    `Gateway ${gateway.enabled ? "disabled" : "enabled"}`,
                  )
                }
              >
                {gateway.enabled ? "Disable" : "Enable"}
              </button>
            </article>
          ))}
        </div>
      </Panel>
    </>
  );

  const auditView = (
    <Panel title="Audit log" action={<Shield />}>
      {!rows.length ? (
        <Empty loading={loading} />
      ) : (
        <div className="commerce-table-wrap">
          <table className="commerce-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Resource</th>
                <th>Actor</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => (
                <tr key={log._id}>
                  <td>
                    <strong>{log.action}</strong>
                  </td>
                  <td>
                    {log.resourceType}
                    <small>{log.resourceId}</small>
                  </td>
                  <td>{log.actorEmail || log.userId || "System"}</td>
                  <td>{date(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );

  const seoView = (
    <>
      <Panel title="Page SEO" action={add("Create page SEO")}>
        <div className="seo-toolbar">
          <label>
            <span className="sr-only">Search SEO pages</span>
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search page key, route or title"
            />
          </label>
          <button onClick={() => void load()}>
            <RefreshCw /> Refresh
          </button>
        </div>
        {!rows.length ? (
          <Empty loading={loading} />
        ) : (
          <div className="commerce-table-wrap">
            <table className="commerce-table seo-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Search preview</th>
                  <th>Social</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((seo) => (
                  <tr key={seo._id}>
                    <td>
                      <strong>{seo.pageKey}</strong>
                      <small>{seo.route}</small>
                    </td>
                    <td>
                      <div className="seo-serp-preview">
                        <strong>{seo.title}</strong>
                        <small>{seo.canonicalUrl || seo.route}</small>
                        <p>{seo.description || "No description provided"}</p>
                      </div>
                    </td>
                    <td>
                      {seo.ogImage || seo.twitterImage
                        ? "Configured"
                        : "Default"}
                    </td>
                    <td>
                      <Status value={seo.active ? "active" : "disabled"} />
                    </td>
                    <td>
                      <div className="commerce-actions">
                        <button
                          onClick={() => {
                            setEditing(seo);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil /> Edit
                        </button>
                        <button
                          onClick={() =>
                            seo._id &&
                            void done(
                              service.updateSeo(seo._id, {
                                active: !seo.active,
                              }),
                              `SEO ${seo.active ? "disabled" : "enabled"}`,
                            )
                          }
                        >
                          {seo.active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pager}
      </Panel>
      {formOpen && (
        <Panel title={editing ? `Edit ${editing.pageKey}` : "New page SEO"}>
          <form
            className="commerce-form commerce-form-columns seo-form"
            onSubmit={submitSeo}
          >
            <label>
              Page key
              <input
                name="pageKey"
                required
                pattern="[a-z0-9._-]+"
                defaultValue={editing?.pageKey}
              />
            </label>
            <label>
              Route
              <input
                name="route"
                required
                placeholder="/shop"
                defaultValue={editing?.route}
              />
            </label>
            <label className="seo-wide">
              SEO title <small>{String(editing?.title || "").length}/120</small>
              <input
                name="title"
                required
                maxLength={120}
                defaultValue={editing?.title}
              />
            </label>
            <label className="seo-wide">
              Meta description{" "}
              <small>{String(editing?.description || "").length}/500</small>
              <textarea
                name="description"
                maxLength={500}
                rows={3}
                defaultValue={editing?.description}
              />
            </label>
            <label className="seo-wide">
              Keywords, comma separated
              <textarea
                name="keywords"
                rows={2}
                defaultValue={editing?.keywords?.join(", ")}
              />
            </label>
            <label className="seo-wide">
              Canonical URL
              <input
                name="canonicalUrl"
                type="url"
                placeholder="https://aquakart.co.in/shop"
                defaultValue={editing?.canonicalUrl}
              />
            </label>
            <label>
              Robots
              <input
                name="robots"
                defaultValue={editing?.robots || "index,follow"}
              />
            </label>
            <label>
              Open Graph image
              <input
                name="ogImage"
                type="url"
                defaultValue={editing?.ogImage}
              />
            </label>
            <label>
              Open Graph title
              <input
                name="ogTitle"
                maxLength={120}
                defaultValue={editing?.ogTitle}
              />
            </label>
            <label>
              Open Graph description
              <textarea
                name="ogDescription"
                maxLength={500}
                defaultValue={editing?.ogDescription}
              />
            </label>
            <label>
              Twitter title
              <input
                name="twitterTitle"
                maxLength={120}
                defaultValue={editing?.twitterTitle}
              />
            </label>
            <label>
              Twitter image
              <input
                name="twitterImage"
                type="url"
                defaultValue={editing?.twitterImage}
              />
            </label>
            <label className="seo-wide">
              Twitter description
              <textarea
                name="twitterDescription"
                maxLength={500}
                defaultValue={editing?.twitterDescription}
              />
            </label>
            <label className="seo-wide">
              JSON-LD schema
              <textarea
                name="schemaJson"
                rows={10}
                spellCheck={false}
                defaultValue={
                  editing?.schemaJson
                    ? JSON.stringify(editing.schemaJson, null, 2)
                    : ""
                }
              />
            </label>
            <label className="seo-active">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing?.active !== false}
              />{" "}
              Publish this SEO configuration
            </label>
            <div className="commerce-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="commerce-primary" type="submit">
                <Check /> Save SEO
              </button>
            </div>
          </form>
        </Panel>
      )}
    </>
  );

  const views = {
    roles: roleView,
    staff: staffView,
    coupons: couponView,
    referrals: referralView,
    payments: paymentView,
    audit: auditView,
    seo: seoView,
  };
  return (
    <TabInnerContent
      title="Commerce Admin"
      description="Manage access, promotions, referrals and secure payment operations"
    >
      <div className="commerce-admin">{views[view]}</div>
    </TabInnerContent>
  );
}
