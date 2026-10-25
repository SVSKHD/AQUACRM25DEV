import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { jobsService } from "../services/jobsService";
import { resolveStaffPermission } from "../utils/permissions";

export interface JobsAccess {
  /** undefined while still being resolved */
  canRead: boolean | undefined;
  canManage: boolean | undefined;
}

// Probes are cached per session token so the sidebar and the Jobs tab share them.
const probeCache = new Map<string, Promise<JobsAccess>>();

const resolveAccess = (user: unknown): Promise<JobsAccess> => {
  const token = localStorage.getItem("auth_token") || "";
  const cacheKey = `${token}:${JSON.stringify(user)}`;
  const cached = probeCache.get(cacheKey);
  if (cached) return cached;

  const knownRead = resolveStaffPermission(user, "jobs.read");
  const knownManage = resolveStaffPermission(user, "jobs.manage");

  const promise = (async (): Promise<JobsAccess> => {
    let canRead = knownRead;
    if (canRead === null) {
      const { status } = await jobsService.listActions();
      canRead = status !== 403;
    }
    let canManage = knownManage;
    if (canManage === null) {
      canManage = await jobsService.probeManage();
    }
    return { canRead, canManage };
  })();

  probeCache.set(cacheKey, promise);
  return promise;
};

export function useJobsAccess(): JobsAccess {
  const { user } = useAuth();
  const [access, setAccess] = useState<JobsAccess>(() => {
    const canRead = resolveStaffPermission(user, "jobs.read");
    const canManage = resolveStaffPermission(user, "jobs.manage");
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
