import { useEffect, useState } from "react";

const KEY = "bar_name";

export function useUser() {
  const [name, setNameState] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setNameState(saved);
  }, []);

  function setName(value: string) {
    setNameState(value);

    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(KEY, trimmed);
    }
  }

  function clearName() {
    localStorage.removeItem(KEY);
    setNameState("");
  }

  return {
    name,
    setName,
    clearName,
    isKnown: Boolean(name),
  };
}
