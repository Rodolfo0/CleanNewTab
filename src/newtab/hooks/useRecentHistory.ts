import { useCallback, useEffect, useState } from "react";

export type RecentHistoryItem = {
  id: string;
  title: string;
  url: string;
};

type HistoryStatus =
  | "checking"
  | "permission-required"
  | "loading"
  | "ready"
  | "denied"
  | "unavailable"
  | "error";

type ChromeHistoryApi = {
  history?: {
    search: (
      query: { endTime: number; maxResults: number; startTime: number; text: string },
      callback: (items: Array<{ id: string; title?: string; url?: string }>) => void,
    ) => void;
  };
  permissions?: {
    contains: (
      permissions: { permissions: string[] },
      callback: (granted: boolean) => void,
    ) => void;
    request: (
      permissions: { permissions: string[] },
      callback: (granted: boolean) => void,
    ) => void;
  };
  runtime?: { lastError?: { message?: string } };
};

function getChromeApi() {
  return (globalThis as typeof globalThis & { chrome?: ChromeHistoryApi }).chrome;
}

export function useRecentHistory(limit = 10) {
  const [items, setItems] = useState<RecentHistoryItem[]>([]);
  const [status, setStatus] = useState<HistoryStatus>(() => {
    const chromeApi = getChromeApi();
    return chromeApi?.permissions && chromeApi.history ? "checking" : "unavailable";
  });

  const loadHistory = useCallback(() => {
    const chromeApi = getChromeApi();

    if (!chromeApi?.history) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");
    chromeApi.history.search(
      {
        text: "",
        startTime: Date.now() - 1000 * 60 * 60 * 24 * 30,
        endTime: Date.now(),
        maxResults: limit,
      },
      (historyItems) => {
        if (chromeApi.runtime?.lastError) {
          setStatus("error");
          return;
        }

        setItems(
          historyItems.flatMap((item) =>
            item.url && /^https?:\/\//i.test(item.url)
              ? [{ id: item.id, title: item.title?.trim() || item.url, url: item.url }]
              : [],
          ),
        );
        setStatus("ready");
      },
    );
  }, [limit]);

  useEffect(() => {
    const chromeApi = getChromeApi();

    if (!chromeApi?.permissions || !chromeApi.history) {
      return;
    }

    chromeApi.permissions.contains({ permissions: ["history"] }, (granted) => {
      if (chromeApi.runtime?.lastError) {
        setStatus("error");
      } else if (granted) {
        loadHistory();
      } else {
        setStatus("permission-required");
      }
    });
  }, [loadHistory]);

  const requestPermission = useCallback(() => {
    const chromeApi = getChromeApi();

    if (!chromeApi?.permissions) {
      setStatus("unavailable");
      return;
    }

    chromeApi.permissions.request({ permissions: ["history"] }, (granted) => {
      if (chromeApi.runtime?.lastError) {
        setStatus("error");
      } else if (granted) {
        loadHistory();
      } else {
        setStatus("denied");
      }
    });
  }, [loadHistory]);

  return { items, requestPermission, status };
}
