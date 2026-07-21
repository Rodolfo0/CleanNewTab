import type {
  BoardHorizontalAnchor,
  BoardItem,
  BoardItemDisplay,
  BoardItemStyle,
  BoardVerticalAnchor,
  SearchEngineId,
} from "../../model/boardItems";

export type ItemConfigPatch = {
  anchorX?: BoardHorizontalAnchor;
  anchorY?: BoardVerticalAnchor;
  display?: Partial<BoardItemDisplay>;
  height?: number;
  placeholder?: string;
  searchEngine?: SearchEngineId;
  suggestionsEnabled?: boolean;
  positionX?: number;
  positionY?: number;
  style?: Partial<BoardItemStyle>;
  title?: string;
  url?: string;
  width?: number;
};

export type ElementConfigProps<TItem extends BoardItem = BoardItem> = {
  item: TItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
};
