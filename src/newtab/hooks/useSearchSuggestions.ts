import { useMemo } from "react";

const SEARCH_HISTORY_KEY = "clean-new-tab:search-history:v1";
const MAX_SUGGESTIONS = 8;

function readSearchHistory() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function uniqueSuggestions(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = value.trim().toLocaleLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

export function rememberSearchQuery(query: string) {
  const value = query.trim();
  if (!value) {
    return;
  }

  try {
    const history = uniqueSuggestions([value, ...readSearchHistory()]).slice(0, 50);
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Search still works when localStorage is unavailable.
  }
}

export function useSearchSuggestions({
  enabled,
  query,
}: {
  enabled: boolean;
  query: string;
}) {
  return useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!enabled || !normalizedQuery) {
      return [];
    }

    return uniqueSuggestions(
      readSearchHistory().filter((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      ),
    ).slice(0, MAX_SUGGESTIONS);
  }, [enabled, query]);
}
