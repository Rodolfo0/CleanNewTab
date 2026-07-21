import type { SearchEngineId } from "../model/searchEngines";

const suggestionOrigins: Partial<Record<SearchEngineId, string>> = {
  bing: "https://api.bing.com/*",
  brave: "https://search.brave.com/*",
  duckduckgo: "https://duckduckgo.com/*",
  ecosia: "https://ac.ecosia.org/*",
  google: "https://suggestqueries.google.com/*",
};

type BrowserPermissions = {
  request: (permissions: { origins: string[] }) => Promise<boolean>;
};

export async function requestSearchSuggestionPermission(
  engineId: SearchEngineId,
) {
  const origin = suggestionOrigins[engineId];
  if (!origin) {
    return false;
  }

  const browserApi = (
    globalThis as typeof globalThis & {
      browser?: { permissions?: BrowserPermissions };
    }
  ).browser;

  if (!browserApi?.permissions) {
    return false;
  }

  try {
    return browserApi.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}
