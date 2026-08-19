import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  hasPermission as checkPermission,
  getAdminTier,
  type Permission,
} from "@/lib/permissions";

export type Role = "admin" | "employee" | "it_personnel";
export type Department = "HR" | "IT" | "Finance" | "Operations" | null;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [department, setDepartment] = useState<Department>(null);
  // True once role + profile have actually been fetched for the current
  // session (or once we know there is no session). Permission checks MUST
  // wait for this — `department === null` is also the initial state.
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession((prev) => {
        if (prev?.user?.id !== s?.user?.id) {
          // Identity changed: profile-derived state is stale again.
          setProfileLoaded(false);
          setRole(null);
          setFullName(null);
          setDepartment(null);
        }
        return s;
      });
      if (!s) setProfileLoaded(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setProfileLoaded(true);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        supabase
          .from("profiles")
          .select("full_name, department")
          .eq("id", session.user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setRole((roles?.[0]?.role as Role) ?? "employee");
      setFullName(profile?.full_name ?? null);
      setDepartment((profile?.department as Department) ?? null);
      setProfileLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const ready = !loading && profileLoaded;

  const can = useCallback(
    (permission: Permission) => checkPermission(ready, role, department, permission),
    [ready, role, department],
  );

  const isSuperAdmin = useMemo(
    () => ready && role === "admin" && getAdminTier(department) === "super_admin",
    [ready, role, department],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    loading,
    ready,
    role,
    fullName,
    department,
    isSuperAdmin,
    can,
    signOut,
  };
}
