import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { preInvoicesService } from "../services/preInvoicesService";
import { paymentLinksService } from "../services/paymentLinksService";
import { resolveStaffPermission } from "../utils/permissions";

/** undefined while still being resolved. */
export interface PreInvoiceAccess {
  canRead: boolean | undefined;
  canManage: boolean | undefined;
  canManageLinks: boolean | undefined;
  /** No probe exists for payments.reconcile; unknown counts as false. */
  canReconcile: boolean;
}

type Probes = {
  read: () => Promise<boolean>;
  manage: () => Promise<boolean>;
  links: () => Promise<boolean>;
};

const defaultProbes: Probes = {
  read: () => preInvoicesService.probeRead(),
  manage: () => preInvoicesService.probeManage(),
  links: () => paymentLinksService.probeManage(),
};

/**
 * Permissions from the stored login user; asks the API (probes that never
 * write) only where the user's role isn't populated. Legacy role 1 and
 * super-admins get everything without a request.
 */
export const resolvePreInvoiceAccess = async (
  user: unknown,
  probes: Probes = defaultProbes,
): Promise<Omit<PreInvoiceAccess, "canReconcile">> => {
  const known = (permission: string) =>
    resolveStaffPermission(user, permission);
  const canRead = known("preinvoices.read") ?? (await probes.read());
  const canManage = known("preinvoices.manage") ?? (await probes.manage());
  const canManageLinks =
    known("payments.link.manage") ?? (await probes.links());
  return { canRead, canManage, canManageLinks };
};

// Cached per session token so the sidebar and both tabs share one probe.
const probeCache = new Map<
  string,
  Promise<Omit<PreInvoiceAccess, "canReconcile">>
>();

const cachedAccess = (user: unknown) => {
  const token = localStorage.getItem("auth_token") || "";
  const cacheKey = `${token}:${JSON.stringify(user)}`;
  let cached = probeCache.get(cacheKey);
  if (!cached) {
    cached = resolvePreInvoiceAccess(user);
    probeCache.set(cacheKey, cached);
  }
  return cached;
};

const initialAccess = (user: unknown): PreInvoiceAccess => {
  const known = (permission: string) => {
    const value = resolveStaffPermission(user, permission);
    return value === null ? undefined : value;
  };
  return {
    canRead: known("preinvoices.read"),
    canManage: known("preinvoices.manage"),
    canManageLinks: known("payments.link.manage"),
    canReconcile: resolveStaffPermission(user, "payments.reconcile") === true,
  };
};

export function usePreInvoiceAccess(): PreInvoiceAccess {
  const { user } = useAuth();
  const [access, setAccess] = useState<PreInvoiceAccess>(() =>
    initialAccess(user),
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    const canReconcile =
      resolveStaffPermission(user, "payments.reconcile") === true;
    cachedAccess(user).then((next) => {
      if (active) setAccess({ ...next, canReconcile });
    });
    return () => {
      active = false;
    };
  }, [user]);

  return access;
}
