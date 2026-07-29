import type { SearchEngineId } from "../model/searchEngines";

const suggestionOrigins: Partial<Record<SearchEngineId, string>> = {
  bing: "https://api.bing.com/*",
  brave: "https://search.brave.com/*",
  duckduckgo: "https://duckduckgo.com/*",
  ecosia: "https://ac.ecosia.org/*",
  google: "https://suggestqueries.google.com/*",
};

type BrowserPermissions = {
  request: (
    permissions: {
      origins: string[];
      data_collection?: ["searchTerms"];
    },
    callback?: (granted: boolean) => void,
  ) => Promise<boolean> | void;
};

export async function requestSearchSuggestionPermission(
  engineId: SearchEngineId,
) {
  const origin = suggestionOrigins[engineId];
  if (!origin) {
    return false;
  }

  const extensionApi = (
    globalThis as typeof globalThis & {
      browser?: { permissions?: BrowserPermissions };
      chrome?: { permissions?: BrowserPermissions };
    }
  );
  const browserPermissions = extensionApi.browser?.permissions;
  const permissions = browserPermissions ?? extensionApi.chrome?.permissions;

  if (!permissions) {
    return false;
  }

  try {
    if (browserPermissions) {
      return await Promise.resolve(
        browserPermissions.request({
          origins: [origin],
          data_collection: ["searchTerms"],
        }),
      );
    }

    return await new Promise<boolean>((resolve, reject) => {
      try {
        permissions.request({ origins: [origin] }, resolve);
      } catch (error) {
        reject(error);
      }
    });
  } catch {
    return false;
  }
}
