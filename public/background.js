const suggestionHosts = new Set([
  "ac.ecosia.org",
  "api.bing.com",
  "duckduckgo.com",
  "search.brave.com",
  "suggestqueries.google.com",
]);

globalThis.browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "search-suggestions" || typeof message.url !== "string") {
    return undefined;
  }

  let suggestionUrl;

  try {
    suggestionUrl = new URL(message.url);
  } catch {
    return Promise.reject(new Error("URL de sugerencias invalida."));
  }

  if (
    suggestionUrl.protocol !== "https:" ||
    !suggestionHosts.has(suggestionUrl.hostname)
  ) {
    return Promise.reject(new Error("Proveedor de sugerencias no permitido."));
  }

  return fetch(suggestionUrl.toString(), { credentials: "omit" }).then(
    (response) => {
      if (!response.ok) {
        throw new Error(`El proveedor respondio con ${response.status}.`);
      }

      return response.json();
    },
  );
});
