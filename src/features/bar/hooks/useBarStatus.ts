import { useCallback, useEffect, useState } from "react";
import { getBarStatus, setBarStatus } from "../services/barService";

export function useBarStatus() {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    getBarStatus()
      .then((status) => setIsOpen(status.isOpen))
      .catch(() => {
        // keep the initial null state on failure
      });
  }, []);

  const toggle = useCallback(async () => {
    if (isOpen === null) return;
    const next = !isOpen;
    setIsOpen(next);
    try {
      await setBarStatus(next);
    } catch {
      setIsOpen(!next);
    }
  }, [isOpen]);

  return { isOpen, toggle };
}
