import type {
  BoardItem,
  BoardItemDisplay,
  BoardItemStyle,
  BoardItemType,
  BoardLayout,
  CreateBoardItemValues,
  DateItem,
  GroupItem,
  LinkItem,
  SearchItem,
  TitleItem,
} from "./boardItemTypes";
import { defaultTitleStyle } from "./boardItemPresentation";
import type { SearchEngineId } from "./searchEngines";

const DEFAULT_ITEM_WIDTH = 280;
const DEFAULT_ITEM_HEIGHT = 76;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function cloneBoardItem(item: BoardItem): BoardItem {
  const clonedItem = JSON.parse(JSON.stringify(item)) as BoardItem;
  const createdAt = new Date().toISOString();

  if (clonedItem.type === "group") {
    return {
      ...clonedItem,
      id: createId(),
      createdAt,
      links: clonedItem.links.map((link) => ({
        ...link,
        id: createId(),
        createdAt,
      })),
    };
  }

  return {
    ...clonedItem,
    id: createId(),
    createdAt,
  };
}

export function normalizeUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function getDefaultSize(type: BoardItemType): Pick<BoardLayout, "width" | "height"> {
  if (type === "title") return { width: 520, height: 48 };
  if (type === "date") return { width: 280, height: 76 };
  if (type === "group") return { width: 320, height: 96 };
  if (type === "search") return { width: 560, height: 88 };
  return { width: DEFAULT_ITEM_WIDTH, height: DEFAULT_ITEM_HEIGHT };
}

export function getNextLayout(items: BoardItem[], type: BoardItemType): BoardLayout {
  const index = items.length;
  return {
    x: (index % 3) * 304,
    y: Math.floor(index / 3) * 212,
    ...getDefaultSize(type),
  };
}

export function createLink({
  display,
  title,
  url,
  layout,
}: {
  display?: Partial<BoardItemDisplay>;
  title: string;
  url: string;
  layout?: BoardLayout;
}): LinkItem {
  return {
    id: createId(),
    type: "link",
    title: title.trim(),
    url: normalizeUrl(url),
    layout: layout ?? { x: 0, y: 0, ...getDefaultSize("link") },
    display,
    createdAt: new Date().toISOString(),
  };
}

function createGroup(
  title: string,
  layout: BoardLayout,
  display?: Partial<BoardItemDisplay>,
  style?: Partial<BoardItemStyle>,
): GroupItem {
  return {
    id: createId(),
    type: "group",
    title: title.trim(),
    links: [],
    layout,
    display,
    style,
    createdAt: new Date().toISOString(),
  };
}

function createTitleElement(
  title: string,
  layout: BoardLayout,
  display?: Partial<BoardItemDisplay>,
  style?: Partial<BoardItemStyle>,
): TitleItem {
  return {
    id: createId(),
    type: "title",
    title: title.trim(),
    layout,
    display,
    style: { ...defaultTitleStyle, ...style },
    createdAt: new Date().toISOString(),
  };
}

function createDateElement(
  title: string,
  layout: BoardLayout,
  display?: Partial<BoardItemDisplay>,
  style?: Partial<BoardItemStyle>,
): DateItem {
  return {
    id: createId(),
    type: "date",
    title: title.trim(),
    layout,
    display,
    style,
    createdAt: new Date().toISOString(),
  };
}

function createSearchElement(
  title: string,
  layout: BoardLayout,
  placeholder?: string,
  display?: Partial<BoardItemDisplay>,
  style?: Partial<BoardItemStyle>,
  searchEngine?: SearchEngineId,
  suggestionsEnabled?: boolean,
): SearchItem {
  return {
    id: createId(),
    type: "search",
    title: title.trim(),
    placeholder: placeholder?.trim() || "Buscar en la web",
    searchEngine: searchEngine ?? "google",
    suggestionsEnabled: suggestionsEnabled ?? true,
    layout,
    display,
    style,
    createdAt: new Date().toISOString(),
  };
}

export function createBoardItem({
  type,
  title,
  url,
  placeholder,
  layout,
  style,
  display,
  searchEngine,
  suggestionsEnabled,
}: CreateBoardItemValues & { layout: BoardLayout }): BoardItem {
  if (type === "group") return createGroup(title, layout, display, style);
  if (type === "title") return createTitleElement(title, layout, display, style);
  if (type === "date") return createDateElement(title, layout, display, style);
  if (type === "search") {
    return createSearchElement(
      title,
      layout,
      placeholder,
      display,
      style,
      searchEngine,
      suggestionsEnabled,
    );
  }
  return { ...createLink({ title, url, layout }), display, style };
}
