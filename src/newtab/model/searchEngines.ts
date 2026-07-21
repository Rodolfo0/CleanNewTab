export const searchEngineIds = [
  "google",
  "bing",
  "duckduckgo",
  "brave",
  "yahoo",
  "ecosia",
] as const;

export type SearchEngineId = (typeof searchEngineIds)[number];

type SearchEngine = {
  id: SearchEngineId;
  label: string;
  searchUrl: (query: string) => string;
  suggestionUrl?: (query: string) => string;
  parseSuggestions?: (value: unknown) => string[];
};

function createSearchUrl(baseUrl: string, parameter: string, query: string) {
  const url = new URL(baseUrl);
  url.searchParams.set(parameter, query);
  return url.toString();
}

function parseOpenSearchSuggestions(value: unknown) {
  if (!Array.isArray(value) || !Array.isArray(value[1])) {
    return [];
  }

  return value[1].filter((item): item is string => typeof item === "string");
}

function parseDuckDuckGoSuggestions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) =>
    typeof item === "object" && item !== null && "phrase" in item
      ? [String(item.phrase)]
      : [],
  );
}

export const searchEngines: SearchEngine[] = [
  {
    id: "google",
    label: "Google",
    searchUrl: (query) => createSearchUrl("https://www.google.com/search", "q", query),
    suggestionUrl: (query) =>
      createSearchUrl(
        "https://suggestqueries.google.com/complete/search?client=firefox",
        "q",
        query,
      ),
    parseSuggestions: parseOpenSearchSuggestions,
  },
  {
    id: "bing",
    label: "Bing",
    searchUrl: (query) => createSearchUrl("https://www.bing.com/search", "q", query),
    suggestionUrl: (query) =>
      createSearchUrl("https://api.bing.com/osjson.aspx", "query", query),
    parseSuggestions: parseOpenSearchSuggestions,
  },
  {
    id: "duckduckgo",
    label: "DuckDuckGo",
    searchUrl: (query) => createSearchUrl("https://duckduckgo.com/", "q", query),
    suggestionUrl: (query) => createSearchUrl("https://duckduckgo.com/ac/", "q", query),
    parseSuggestions: parseDuckDuckGoSuggestions,
  },
  {
    id: "brave",
    label: "Brave Search",
    searchUrl: (query) => createSearchUrl("https://search.brave.com/search", "q", query),
    suggestionUrl: (query) =>
      createSearchUrl("https://search.brave.com/api/suggest?source=web", "q", query),
    parseSuggestions: parseOpenSearchSuggestions,
  },
  {
    id: "yahoo",
    label: "Yahoo",
    searchUrl: (query) => createSearchUrl("https://search.yahoo.com/search", "p", query),
  },
  {
    id: "ecosia",
    label: "Ecosia",
    searchUrl: (query) => createSearchUrl("https://www.ecosia.org/search", "q", query),
    suggestionUrl: (query) =>
      createSearchUrl("https://ac.ecosia.org/autocomplete?type=list", "q", query),
    parseSuggestions: parseOpenSearchSuggestions,
  },
];

export const searchEngineOptions = searchEngines.map((engine) => ({
  label: engine.label,
  value: engine.id,
}));

export function isSearchEngineId(value: unknown): value is SearchEngineId {
  return searchEngineIds.includes(value as SearchEngineId);
}

export function getSearchEngine(value?: SearchEngineId) {
  return searchEngines.find((engine) => engine.id === value) ?? searchEngines[0];
}
