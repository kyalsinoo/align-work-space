import { useCallback, useEffect, useState } from "react";

export interface SavedInsight {
  id: string;
  text: string;
  savedAt: string;
}

// Saved AI insights are stored locally and scoped to the individual user.
// Keyed by user id so no other staff or admin can ever read another person's
// collection — nothing is sent to the database.
const KEY_PREFIX = "ofm_saved_insights_";
const EVENT = "ofm-saved-insights-changed";

function storageKey(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

function read(userId: string): SavedInsight[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as SavedInsight[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, items: SavedInsight[]) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { userId } }));
}

export function useSavedInsights(userId: string | undefined) {
  const [items, setItems] = useState<SavedInsight[]>(() => read(userId ?? ""));

  useEffect(() => {
    setItems(read(userId ?? ""));
    if (!userId) return;
    const onChange = () => setItems(read(userId));
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [userId]);

  const save = useCallback(
    (text: string) => {
      if (!userId) return;
      const current = read(userId);
      if (current.some((i) => i.text === text)) return; // avoid duplicates
      write(userId, [
        { id: crypto.randomUUID(), text, savedAt: new Date().toISOString() },
        ...current,
      ]);
    },
    [userId],
  );

  const remove = useCallback(
    (id: string) => {
      if (!userId) return;
      write(userId, read(userId).filter((i) => i.id !== id));
    },
    [userId],
  );

  return { items, save, remove };
}
