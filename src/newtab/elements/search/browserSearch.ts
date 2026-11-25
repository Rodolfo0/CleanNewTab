type SearchQueryInfo = {
  text: string;
  disposition?: "CURRENT_TAB" | "NEW_TAB" | "NEW_WINDOW";
};

type SearchApi = {
  query: (queryInfo: SearchQueryInfo) => Promise<void> | void;
};

/**
 * Runs a search with the engine the user chose in the browser settings.
 * Chrome Web Store policy requires a new tab search box to respect that
 * setting through the Search API instead of targeting a fixed provider.
 */
export async function searchWithDefaultEngine(text: string) {
  const extensionApi = globalThis as typeof globalThis & {
    browser?: { search?: SearchApi };
    chrome?: { search?: SearchApi };
  };
  const search = extensionApi.browser?.search ?? extensionApi.chrome?.search;

  if (!search?.query) {
    throw new Error("La API de búsqueda del navegador no está disponible.");
  }

  await search.query({ text, disposition: "CURRENT_TAB" });
}
