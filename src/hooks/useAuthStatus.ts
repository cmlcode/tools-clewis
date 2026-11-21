// src/hooks/useAuthStatus.ts
// For pages that are public but change what they show when someone is logged in
// (launcher, bar). `loggedIn` is null while the first status check is in flight.
import { useCallback, useEffect, useState } from "react";
import { fetchStatus, logout as apiLogout, type AuthStatus, type Role } from "@/lib/auth";

export function useAuthStatus(): {
  loggedIn: boolean | null;
  email: string | undefined;
  role: Role | undefined;
  logout: () => Promise<void>;
} {
  const [status, setStatus] = useState<AuthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setStatus({ loggedIn: false });
  }, []);

  return {
    loggedIn: status === null ? null : status.loggedIn,
    email: status?.email,
    role: status?.role,
    logout,
  };
}
