import { useEffect, useMemo, useState } from "react";
import { getSearchEngine, type SearchEngineId } from "../model/searchEngines";

const SEARCH_HISTORY_KEY = "clean-new-tab:search-history:v1";
const MAX_SUGGESTIONS = 8;

type BrowserRuntime = {
  lastError?: { message?: string };
  sendMessage: (
    message: unknown,
    callback?: (response: unknown) => void,
  ) => Promise<unknown> | void;
};

function requestRemoteSuggestions(url: string) {
  const extensionApi = (
    globalThis as typeof globalThis & {
      browser?: { runtime?: BrowserRuntime };
      chrome?: { runtime?: BrowserRuntime };
    }
  );
  const browserRuntime = extensionApi.browser?.runtime;
  const runtime = browserRuntime ?? extensionApi.chrome?.runtime;

  if (!runtime?.sendMessage) {
    return Promise.reject(new Error("Runtime de extension no disponible."));
  }

  const message = { type: "search-suggestions", url };
  if (browserRuntime) {
    return Promise.resolve(browserRuntime.sendMessage(message));
  }

  return new Promise<unknown>((resolve, reject) => {
    runtime.sendMessage(message, (response) => {
      if (runtime.lastError) {
        reject(new Error(runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

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
  engineId,
  query,
  remoteEnabled,
}: {
  enabled: boolean;
  engineId: SearchEngineId;
  query: string;
  remoteEnabled: boolean;
}) {
  const suggestionKey = `${engineId}:${query.trim().toLocaleLowerCase()}`;
  const [remoteResult, setRemoteResult] = useState<{
    key: string;
    suggestions: string[];
  }>({ key: "", suggestions: [] });
  const localSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!enabled || !normalizedQuery) {
      return [];
    }

    return readSearchHistory().filter((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [enabled, query]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const engine = getSearchEngine(engineId);

    if (
      !enabled ||
      !remoteEnabled ||
      normalizedQuery.length < 2 ||
      !engine.suggestionUrl ||
      !engine.parseSuggestions
    ) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      const suggestionUrl = engine.suggestionUrl?.(normalizedQuery);
      if (!suggestionUrl) {
        return;
      }

      void requestRemoteSuggestions(suggestionUrl)
        .then((value) => {
          if (!controller.signal.aborted && value !== undefined) {
            setRemoteResult({
              key: suggestionKey,
              suggestions: engine.parseSuggestions?.(value) ?? [],
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setRemoteResult({ key: suggestionKey, suggestions: [] });
          }
        });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [enabled, engineId, query, remoteEnabled, suggestionKey]);

  const remoteSuggestions =
    enabled && remoteEnabled && remoteResult.key === suggestionKey
      ? remoteResult.suggestions
      : [];

  return uniqueSuggestions([...localSuggestions, ...remoteSuggestions]).slice(
    0,
    MAX_SUGGESTIONS,
  );
}
