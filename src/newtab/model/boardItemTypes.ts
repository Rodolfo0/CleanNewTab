import type { SearchEngineId } from "./searchEngines";

export const CANVAS_HEIGHT = 720;
export const CANVAS_WIDTH = 1280;

export type BoardItemType = "link" | "group" | "title" | "date" | "search";

export type BoardHorizontalAnchor = "left" | "center" | "right";
export type BoardVerticalAnchor = "top" | "center" | "bottom";

export type BoardLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX?: BoardHorizontalAnchor;
  anchorY?: BoardVerticalAnchor;
};

export type BoardItemStyle = {
  backgroundColor: string;
  backgroundImage?: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  fontFamily: string;
  fontSize: number;
  fontSizeLocked: boolean;
  padding: number;
  searchButtonBackgroundColor: string;
  searchButtonTextColor: string;
  searchInputBackgroundColor: string;
  searchInputTextColor: string;
  textColor: string;
};

export type BoardItemAlign = "left" | "center" | "right";
export type BoardItemIconStyle = "plain" | "soft" | "solid";
export type LinkItemVariant =
  | "link-card"
  | "link-card-plain"
  | "link-icon"
  | "link-icon-plain"
  | "link-text"
  | "link-strip"
  | "link-tile";
export type GroupItemVariant =
  | "group-grid"
  | "group-grid-no-header"
  | "group-list-plain"
  | "group-icons"
  | "group-icons-plain"
  | "group-list"
  | "group-list-no-header";
export type TitleItemVariant = "title-heading" | "title-label" | "title-panel";
export type DateItemVariant = "date-card" | "date-large" | "date-minimal";
export type SearchItemVariant = "search-bar" | "search-input" | "search-minimal";
export type LegacyBoardItemVariant =
  | "card"
  | "group-compact"
  | "group-compact-no-header"
  | "hero"
  | "list"
  | "minimal"
  | "pill";
export type BoardItemVariant =
  | DateItemVariant
  | GroupItemVariant
  | LegacyBoardItemVariant
  | LinkItemVariant
  | SearchItemVariant
  | TitleItemVariant;

export type BoardItemDisplay = {
  align: BoardItemAlign;
  iconSize: number;
  iconSizeLocked: boolean;
  iconStyle: BoardItemIconStyle;
  linkIcon: string;
  showIcon: boolean;
  showSubtitle: boolean;
  showTitle: boolean;
  variant:
    | DateItemVariant
    | GroupItemVariant
    | LinkItemVariant
    | SearchItemVariant
    | TitleItemVariant;
};

export type BaseBoardItem = {
  id: string;
  type: BoardItemType;
  title: string;
  layout: BoardLayout;
  style?: Partial<BoardItemStyle>;
  display?: Partial<BoardItemDisplay>;
  createdAt: string;
};

export type LinkItem = BaseBoardItem & { type: "link"; url: string };
export type GroupItem = BaseBoardItem & { type: "group"; links: LinkItem[] };
export type TitleItem = BaseBoardItem & { type: "title" };
export type DateItem = BaseBoardItem & { type: "date" };
export type SearchItem = BaseBoardItem & {
  type: "search";
  placeholder: string;
  searchEngine?: SearchEngineId;
  suggestionsEnabled?: boolean;
};

export type BoardItem = LinkItem | GroupItem | TitleItem | DateItem | SearchItem;

export type Board = {
  version: 1;
  items: BoardItem[];
};

export type CreateBoardItemValues = {
  type: BoardItemType;
  title: string;
  url: string;
  anchorX?: BoardHorizontalAnchor;
  anchorY?: BoardVerticalAnchor;
  placeholder?: string;
  searchEngine?: SearchEngineId;
  suggestionsEnabled?: boolean;
  style?: Partial<BoardItemStyle>;
  display?: Partial<BoardItemDisplay>;
};
