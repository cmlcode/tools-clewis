// src/features/recipes/hooks/useLoad.ts
import { useEffect, useState } from "react";

/** Runs a loader and gives back { data, error, loading }. Re-runs when `key` changes. */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (e: unknown) =>
        live && setState({ data: null, error: e instanceof Error ? e.message : "Something went wrong", loading: false })
    );
    return () => {
      live = false;
    };
    // `load` is a fresh closure every render; `key` is what decides when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
