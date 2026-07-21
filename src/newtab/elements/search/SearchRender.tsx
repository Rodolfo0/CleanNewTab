import { useState, type FormEvent } from "react";
import { Autocomplete, Button, Stack } from "@mantine/core";
import {
  getItemDisplay,
  getItemFontSize,
  getItemStyle,
  type BoardItemStyle,
  type SearchItem,
  getSearchEngine,
} from "../../model/boardItems";
import {
  rememberSearchQuery,
  useSearchSuggestions,
} from "../../hooks/useSearchSuggestions";
import { getTextAlign } from "../shared/renderHelpers";
import { requestSearchSuggestionPermission } from "../../icons/searchSuggestionPermissions";

export function SearchRender({
  componentTheme,
  item,
  isEditing,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: SearchItem;
  isEditing: boolean;
}) {
  const display = getItemDisplay(item);
  const style = { ...getItemStyle(item, componentTheme), fontSize: getItemFontSize(item, componentTheme) };
  const controlHeight = Math.round(style.fontSize * 2.25);
  const engineId = item.searchEngine ?? "google";
  const engine = getSearchEngine(engineId);
  const suggestionsEnabled = item.suggestionsEnabled !== false;
  const [query, setQuery] = useState("");
  const [permittedEngineId, setPermittedEngineId] = useState<string>();
  const remoteSuggestionsEnabled = permittedEngineId === engineId;
  const suggestions = useSearchSuggestions({
    enabled: suggestionsEnabled && !isEditing,
    engineId,
    query,
    remoteEnabled: remoteSuggestionsEnabled,
  });

  function enableRemoteSuggestions() {
    if (!suggestionsEnabled || isEditing || remoteSuggestionsEnabled) {
      return;
    }

    void requestSearchSuggestionPermission(engineId).then((granted) => {
      if (granted) {
        setPermittedEngineId(engineId);
      }
    });
  }

  function runSearch(value: string) {
    const searchQuery = value.trim();

    if (!searchQuery || isEditing) {
      return;
    }

    rememberSearchQuery(searchQuery);
    window.location.href = engine.searchUrl(searchQuery);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(query);
  }

  return (
    <Stack
      gap={8}
      className="h-full justify-center"
      style={{
        alignItems:
          display.align === "left"
            ? "stretch"
            : display.align === "right"
              ? "flex-end"
              : "center",
        textAlign: getTextAlign(display.align),
      }}
    >
      <form
        onSubmit={handleSubmit}
        className={`flex w-full items-center gap-2 ${
          isEditing ? "pointer-events-none" : ""
        }`}
      >
        <Autocomplete
          name="query"
          aria-label={item.title}
          placeholder={item.placeholder}
          size="lg"
          radius="md"
          className="min-w-0 flex-1"
          autoComplete="off"
          disabled={isEditing}
          data={suggestions}
          value={query}
          onChange={setQuery}
          onOptionSubmit={runSearch}
          onFocus={enableRemoteSuggestions}
          openOnFocus={suggestions.length > 0}
          limit={8}
          styles={{
            input: {
              backgroundColor: style.searchInputBackgroundColor,
              color: style.searchInputTextColor,
              fontSize: style.fontSize,
              height: controlHeight,
              minHeight: 0,
            },
            dropdown: {
              backgroundColor: style.searchInputBackgroundColor,
              color: style.searchInputTextColor,
            },
            option: {
              color: style.searchInputTextColor,
              fontSize: Math.max(12, style.fontSize * 0.85),
            },
          }}
        />
        {display.showSubtitle ? (
          <Button
            type="submit"
            size="lg"
            radius="md"
            color="dark"
            disabled={isEditing}
            style={{
              backgroundColor: style.searchButtonBackgroundColor,
              color: style.searchButtonTextColor,
              flexShrink: 0,
              height: controlHeight,
              minHeight: 0,
            }}
            styles={{
              label: {
                fontSize: style.fontSize,
                lineHeight: 1,
              },
            }}
          >
            Buscar
          </Button>
        ) : null}
      </form>
    </Stack>
  );
}
