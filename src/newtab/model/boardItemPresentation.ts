import type {
  BoardItem,
  BoardItemDisplay,
  BoardItemStyle,
  BoardItemType,
  BoardItemVariant,
} from "./boardItemTypes";

export const defaultTitleStyle: BoardItemStyle = {
  backgroundColor: "transparent",
  borderColor: "#dee2e6",
  borderWidth: 0,
  borderRadius: 6,
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 36,
  fontSizeLocked: false,
  padding: 0,
  searchButtonBackgroundColor: "#171717",
  searchButtonTextColor: "#ffffff",
  searchInputBackgroundColor: "#ffffff",
  searchInputTextColor: "#1d2939",
  textColor: "#171717",
};

export const defaultItemStyle: BoardItemStyle = {
  backgroundColor: "#ffffff",
  borderColor: "#dee2e6",
  borderWidth: 1,
  borderRadius: 8,
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 18,
  fontSizeLocked: false,
  padding: 2,
  searchButtonBackgroundColor: "#171717",
  searchButtonTextColor: "#ffffff",
  searchInputBackgroundColor: "#ffffff",
  searchInputTextColor: "#1d2939",
  textColor: "#1d2939",
};

export const defaultItemDisplay: BoardItemDisplay = {
  align: "left",
  groupCardContentAlign: "left",
  groupCardContentDirection: "horizontal",
  groupCardContentPosition: "center",
  groupCardIconFrame: false,
  groupCardIconSize: 16,
  groupCardMinHeight: 52,
  groupCardMinWidth: 120,
  iconSize: 16,
  iconSizeLocked: false,
  iconStyle: "soft",
  linkIcon: "LinkSimpleIcon",
  showIcon: true,
  showSubtitle: true,
  showTitle: true,
  variant: "link-card",
};

const defaultVariantByType = {
  date: "date-card",
  group: "group-list-no-header",
  link: "link-card",
  note: "note-card",
  search: "search-bar",
  title: "title-heading",
} satisfies Record<BoardItemType, BoardItemDisplay["variant"]>;

const validVariantsByType = {
  date: ["date-card", "date-large", "date-minimal"],
  group: [
    "group-list-no-header",
    "group-grid",
    "group-grid-no-header",
    "group-grid-plain",
    "group-icons",
    "group-icons-plain",
  ],
  link: [
    "link-card",
    "link-card-plain",
    "link-icon",
    "link-icon-plain",
    "link-text",
    "link-strip",
    "link-tile",
  ],
  note: ["note-card"],
  search: ["search-bar", "search-input", "search-minimal"],
  title: ["title-heading", "title-label", "title-panel"],
} satisfies Record<BoardItemType, BoardItemDisplay["variant"][]>;

function getItemVariant(item: BoardItem, variant?: BoardItemVariant) {
  if (variant && validVariantsByType[item.type].includes(variant as never)) {
    return variant as BoardItemDisplay["variant"];
  }

  return defaultVariantByType[item.type];
}

export type BoardItemVariantCapabilities = {
  hasBackground: boolean;
  hasBorder: boolean;
  hasBorderRadius: boolean;
  hasIcon: boolean;
  hasIconStyle: boolean;
  hasPadding: boolean;
  hasSubtitle: boolean;
  hasTitle: boolean;
};

const surfaced = {
  hasBackground: true,
  hasBorder: true,
  hasBorderRadius: true,
  hasPadding: true,
};

const plain = {
  hasBackground: false,
  hasBorder: false,
  hasBorderRadius: false,
  hasPadding: true,
};

const variantCapabilities = {
  "date-card": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: true,
  },
  "date-large": {
    ...plain,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: true,
  },
  "date-minimal": {
    ...plain,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: false,
  },
  "group-grid": {
    ...surfaced,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: true,
    hasTitle: true,
  },
  "group-grid-no-header": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: false,
  },
  "group-grid-plain": {
    ...plain,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: true,
    hasTitle: true,
  },
  "group-icons": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: false,
  },
  "group-icons-plain": {
    ...plain,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: false,
  },
  "group-list-no-header": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: false,
  },
  "link-card": {
    ...surfaced,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: true,
    hasTitle: true,
  },
  "link-card-plain": {
    ...plain,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: true,
    hasTitle: true,
  },
  "link-icon": {
    ...surfaced,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: false,
    hasTitle: false,
  },
  "link-icon-plain": {
    ...plain,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: false,
    hasTitle: false,
  },
  "link-text": {
    ...plain,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: false,
    hasTitle: true,
  },
  "link-strip": {
    ...surfaced,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: false,
    hasTitle: true,
  },
  "link-tile": {
    ...surfaced,
    hasIcon: true,
    hasIconStyle: true,
    hasSubtitle: false,
    hasTitle: true,
  },
  "note-card": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: false,
    hasTitle: false,
  },
  "search-bar": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: false,
  },
  "search-input": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: false,
    hasTitle: false,
  },
  "search-minimal": {
    ...plain,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: true,
    hasTitle: false,
  },
  "title-heading": {
    ...plain,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: false,
    hasTitle: true,
  },
  "title-label": {
    ...plain,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: false,
    hasTitle: true,
  },
  "title-panel": {
    ...surfaced,
    hasIcon: false,
    hasIconStyle: false,
    hasSubtitle: false,
    hasTitle: true,
  },
} satisfies Record<BoardItemDisplay["variant"], BoardItemVariantCapabilities>;

export function getItemVariantCapabilities(item: BoardItem) {
  return variantCapabilities[getItemVariant(item, item.display?.variant)];
}

export function getItemStyle(
  item: BoardItem,
  themeStyle?: Partial<BoardItemStyle>,
): BoardItemStyle {
  const capabilities = getItemVariantCapabilities(item);
  const baseStyle =
    item.type === "title"
      ? { ...defaultTitleStyle, ...themeStyle }
      : { ...defaultItemStyle, ...themeStyle };
  const style =
    item.type === "title"
      ? {
          ...baseStyle,
          backgroundColor: "transparent",
          borderWidth: 0,
          padding: 0,
          ...item.style,
        }
      : { ...baseStyle, ...item.style };

  return {
    ...style,
    backgroundColor: capabilities.hasBackground
      ? style.backgroundColor
      : "transparent",
    backgroundImage: capabilities.hasBackground
      ? style.backgroundImage
      : "none",
    borderRadius: capabilities.hasBorderRadius ? style.borderRadius : 0,
    borderWidth: capabilities.hasBorder ? style.borderWidth : 0,
  };
}

export function getItemDisplay(item: BoardItem): BoardItemDisplay {
  const display = { ...defaultItemDisplay, ...item.display };
  const variant = getItemVariant(item, display.variant);
  const capabilities = variantCapabilities[variant];
  const requiresIcon =
    item.type === "link" &&
    (variant === "link-icon" || variant === "link-icon-plain");

  return {
    ...display,
    showIcon: capabilities.hasIcon && (requiresIcon || display.showIcon),
    showSubtitle: capabilities.hasSubtitle,
    showTitle: capabilities.hasTitle,
    variant,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getItemFontSize(
  item: BoardItem,
  themeStyle?: Partial<BoardItemStyle>,
) {
  const style = getItemStyle(item, themeStyle);
  if (style.fontSizeLocked) return style.fontSize;

  const availableHeight = Math.max(1, item.layout.height - style.padding * 2);
  const availableWidth = Math.max(1, item.layout.width - style.padding * 2);
  const display = getItemDisplay(item);
  let heightRatio = 0.34;
  let min = 10;
  let max = 56;

  if (item.type === "title") {
    heightRatio = display.variant === "title-label" ? 0.55 : 0.78;
    min = 12;
    max = 96;
  } else if (item.type === "date") {
    heightRatio = display.variant === "date-large" ? 0.52 : 0.42;
    max = 64;
  } else if (item.type === "link") {
    heightRatio = display.variant === "link-tile" ? 0.18 : 0.34;
    max = 42;
  } else if (item.type === "group") {
    heightRatio =
      display.variant === "group-grid" ||
      display.variant === "group-grid-no-header" ||
      display.variant === "group-grid-plain"
        ? 0.22
        : display.variant === "group-icons" ||
            display.variant === "group-icons-plain"
          ? 1
          : 0.28;
    max = 36;
  } else if (item.type === "search") {
    heightRatio = 0.42;
    max = 56;
  }

  const widthBound = Math.max(min, availableWidth / 5);
  return Math.round(
    clampNumber(availableHeight * heightRatio, min, Math.min(max, widthBound)),
  );
}

export function getItemIconSize(
  item: BoardItem,
  themeStyle?: Partial<BoardItemStyle>,
) {
  const display = getItemDisplay(item);
  if (display.iconSizeLocked) return display.iconSize;

  const style = getItemStyle(item, themeStyle);
  const availableHeight = Math.max(1, item.layout.height - style.padding * 2);

  if (item.type === "group") {
    const isIconGrid =
      display.variant === "group-icons" ||
      display.variant === "group-icons-plain";

    if (isIconGrid) {
      const gap = style.padding > 0 ? 8 : 0;
      const availableWidth = Math.max(1, item.layout.width - style.padding * 2);
      const linkCount = Math.max(1, item.links.length);
      const maxColumns = Math.max(
        1,
        Math.floor((availableWidth + gap) / (36 + gap)),
      );
      const columns = Math.min(linkCount, maxColumns);
      const rows = Math.max(1, Math.ceil(linkCount / columns));
      const cellWidth = (availableWidth - (columns - 1) * gap) / columns;
      const cellHeight = (availableHeight - (rows - 1) * gap) / rows;

      return Math.max(
        1,
        Math.round(Math.min(cellWidth, cellHeight)),
      );
    }

    return display.iconSize;
  }

  return Math.round(availableHeight);
}
