import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { aquaEnvService } from "../services/aquaEnvService";
import { resolveStaffPermission } from "../utils/permissions";

// settings.read / settings.manage, resolved like useJobsAccess: from the login
// user when possible, otherwise by asking the API (403 = no permission).

export interface SettingsAccess {
  /** undefined while still being resolved */
  canRead: boolean | undefined;
  canManage: boolean | undefined;
}

// Cached per session token so the sidebar and the Settings tab share probes.
const probeCache = new Map<string, Promise<SettingsAccess>>();

const resolveAccess = (user: unknown): Promise<SettingsAccess> => {
  const token = localStorage.getItem("auth_token") || "";
  const cacheKey = `${token}:${JSON.stringify(user)}`;
  const cached = probeCache.get(cacheKey);
  if (cached) return cached;

  const knownRead = resolveStaffPermission(user, "settings.read");
  const knownManage = resolveStaffPermission(user, "settings.manage");

  const promise = (async (): Promise<SettingsAccess> => {
    const canRead =
      knownRead === null ? await aquaEnvService.probeRead() : knownRead;
    const canManage =
      knownManage === null ? await aquaEnvService.probeManage() : knownManage;
    return { canRead, canManage };
  })();

  probeCache.set(cacheKey, promise);
  return promise;
};

export function useSettingsAccess(): SettingsAccess {
  const { user } = useAuth();
  const [access, setAccess] = useState<SettingsAccess>(() => {
    const canRead = resolveStaffPermission(user, "settings.read");
    const canManage = resolveStaffPermission(user, "settings.manage");
    return {
      canRead: canRead === null ? undefined : canRead,
      canManage: canManage === null ? undefined : canManage,
    };
  });

  useEffect(() => {
    if (!user) return;
    let active = true;
    resolveAccess(user).then((next) => {
      if (active) setAccess(next);
    });
    return () => {
      active = false;
    };
  }, [user]);

  return access;
}
