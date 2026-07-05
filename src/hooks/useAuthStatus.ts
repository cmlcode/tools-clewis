import { useCallback, useEffect, useState } from 'react';

interface AuthResponse {
  loggedIn: boolean;
  error?: string;
}

export function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/auth/status');
    const data = (await res.json()) as AuthResponse;
    setLoggedIn(data.loggedIn);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setLoggedIn(false);
  }, []);

  return { loggedIn, logout };
}
