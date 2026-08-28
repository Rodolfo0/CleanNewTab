import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type BoardHorizontalAnchor,
  type BoardItem,
  type BoardLayout,
  type BoardVerticalAnchor,
} from "./boardItemTypes";
import {
  getItemDisplay,
  getItemFontSize,
  getItemIconSize,
  getItemStyle,
} from "./boardItemPresentation";

const MIN_ITEM_WIDTH = 1;
const MIN_ITEM_HEIGHT = 1;

export function getLayoutAnchorX(layout: BoardLayout): BoardHorizontalAnchor {
  return layout.anchorX ?? "left";
}

export function getLayoutAnchorY(layout: BoardLayout): BoardVerticalAnchor {
  return layout.anchorY ?? "top";
}

export function getViewportLeft(layout: BoardLayout, viewportWidth: number) {
  const anchorX = getLayoutAnchorX(layout);
  if (anchorX === "right") return Math.round(viewportWidth - layout.width - layout.x);
  if (anchorX === "center") return Math.round(viewportWidth / 2 + layout.x - layout.width / 2);
  return Math.round(layout.x);
}

export function getViewportTop(layout: BoardLayout, viewportHeight: number) {
  const anchorY = getLayoutAnchorY(layout);
  if (anchorY === "bottom") return Math.round(viewportHeight - layout.height - layout.y);
  if (anchorY === "center") return Math.round(viewportHeight / 2 + layout.y - layout.height / 2);
  return Math.round(layout.y);
}

export function getAnchoredXFromLeft({
  anchorX,
  left,
  viewportWidth,
  width,
}: {
  anchorX: BoardHorizontalAnchor;
  left: number;
  viewportWidth: number;
  width: number;
}) {
  if (anchorX === "right") return viewportWidth - left - width;
  if (anchorX === "center") return left + width / 2 - viewportWidth / 2;
  return left;
}

export function getAnchoredYFromTop({
  anchorY,
  height,
  top,
  viewportHeight,
}: {
  anchorY: BoardVerticalAnchor;
  height: number;
  top: number;
  viewportHeight: number;
}) {
  if (anchorY === "bottom") return viewportHeight - top - height;
  if (anchorY === "center") return top + height / 2 - viewportHeight / 2;
  return top;
}

export function reanchorLayout(
  layout: BoardLayout,
  anchorX: BoardHorizontalAnchor,
  anchorY: BoardVerticalAnchor = getLayoutAnchorY(layout),
  viewportWidth: number = CANVAS_WIDTH,
  viewportHeight: number = CANVAS_HEIGHT,
): BoardLayout {
  const left = getViewportLeft(layout, viewportWidth);
  const top = getViewportTop(layout, viewportHeight);

  return clampLayout({
    ...layout,
    anchorX,
    anchorY,
    x: getAnchoredXFromLeft({ anchorX, left, viewportWidth, width: layout.width }),
    y: getAnchoredYFromTop({ anchorY, height: layout.height, top, viewportHeight }),
  });
}

export function clampLayout(layout: BoardLayout): BoardLayout {
  const anchorX = getLayoutAnchorX(layout);
  const anchorY = getLayoutAnchorY(layout);
  const x = Math.round(layout.x);
  const y = Math.round(layout.y);

  return {
    ...layout,
    anchorX,
    anchorY,
    x: anchorX === "center" ? x : Math.max(0, x),
    y: anchorY === "center" ? y : Math.max(0, y),
    width: Math.max(MIN_ITEM_WIDTH, Math.round(layout.width)),
    height: Math.max(MIN_ITEM_HEIGHT, Math.round(layout.height)),
  };
}

export function getItemMaxHeight(item: BoardItem): number | undefined {
  if (item.type === "note") return undefined;
  const style = getItemStyle(item);
  const display = getItemDisplay(item);

  if (item.type === "group") {
    return undefined;
  }

  if (
    (item.type !== "search" || !style.fontSizeLocked) &&
    !style.fontSizeLocked &&
    !display.iconSizeLocked
  ) {
    return undefined;
  }

  const padding = style.padding * 2;
  const fontSize = getItemFontSize(item);
  const iconSize = getItemIconSize(item);
  const textLine = Math.ceil(fontSize * 1.25);
  const smallLine = 18;
  const iconFrame =
    display.iconStyle === "plain"
      ? iconSize
      : Math.max(iconSize + Math.min(12, style.padding), 30);

  if (item.type === "link") {
    if (display.variant === "link-icon" || display.variant === "link-icon-plain") {
      return Math.round(padding + iconFrame);
    }
    if (display.variant === "link-tile") {
      return Math.round(
        padding + iconFrame + 14 + Math.ceil(fontSize * 1.2) * 2 + 6 + smallLine,
      );
    }
    return Math.round(padding + Math.max(iconFrame, textLine + 4 + smallLine));
  }

  if (item.type === "title") {
    if (display.variant === "title-label") {
      return Math.round(padding + Math.max(14, Math.ceil(fontSize * 0.45 * 1.35)));
    }
    return Math.round(
      padding + Math.ceil(fontSize * (display.variant === "title-panel" ? 1.08 : 1)),
    );
  }

  if (item.type === "date") {
    const dateLine = Math.ceil(
      fontSize * (display.variant === "date-large" ? 1.25 : 1) * 1.2,
    );
    if (display.variant === "date-minimal") return Math.round(padding + dateLine);
    return Math.round(padding + 16 + (display.variant === "date-large" ? 8 : 6) + dateLine);
  }

  if (item.type === "search") {
    return Math.round(padding + Math.round(fontSize * 2.25));
  }

  return undefined;
}

export function clampItemLayout(item: BoardItem, layout: BoardLayout): BoardLayout {
  const clampedLayout = clampLayout(layout);
  const maxHeight = getItemMaxHeight(item);
  return maxHeight === undefined
    ? clampedLayout
    : { ...clampedLayout, height: Math.min(clampedLayout.height, maxHeight) };
}

export type ResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export function resizeItemLayout({
  deltaX,
  deltaY,
  fromCenter,
  item,
  keepAspectRatio,
  direction,
  startLayout,
  startLeft,
  startTop,
  viewportHeight,
  viewportWidth,
}: {
  deltaX: number;
  deltaY: number;
  fromCenter: boolean;
  item: BoardItem;
  keepAspectRatio: boolean;
  direction: ResizeDirection;
  startLayout: BoardLayout;
  startLeft: number;
  startTop: number;
  viewportHeight: number;
  viewportWidth: number;
}): BoardLayout {
  const changesLeft = direction.includes("w");
  const changesRight = direction.includes("e");
  const changesTop = direction.includes("n");
  const changesBottom = direction.includes("s");
  const changesWidth = changesLeft || changesRight;
  const changesHeight = changesTop || changesBottom;
  const isCorner = changesWidth && changesHeight;
  const resizeFactor = fromCenter && isCorner ? 2 : 1;
  const widthDelta = changesLeft ? -deltaX : changesRight ? deltaX : 0;
  const heightDelta = changesTop ? -deltaY : changesBottom ? deltaY : 0;
  const rawWidth = startLayout.width + widthDelta * resizeFactor;
  const rawHeight = startLayout.height + heightDelta * resizeFactor;
  const maxHeight = getItemMaxHeight(item);
  let width: number;
  let height: number;

  if (keepAspectRatio && isCorner) {
    const widthScale = rawWidth / startLayout.width;
    const heightScale = rawHeight / startLayout.height;
    const widthChange = Math.abs(widthScale - 1);
    const heightChange = Math.abs(heightScale - 1);
    const requestedScale = widthChange >= heightChange ? widthScale : heightScale;
    const minimumScale = Math.max(
      MIN_ITEM_WIDTH / startLayout.width,
      MIN_ITEM_HEIGHT / startLayout.height,
    );
    const maximumScale =
      maxHeight === undefined ? Number.POSITIVE_INFINITY : maxHeight / startLayout.height;
    const scale = Math.min(Math.max(requestedScale, minimumScale), maximumScale);

    width = startLayout.width * scale;
    height = startLayout.height * scale;
  } else {
    width = changesWidth ? Math.max(MIN_ITEM_WIDTH, rawWidth) : startLayout.width;
    height = changesHeight ? Math.max(MIN_ITEM_HEIGHT, rawHeight) : startLayout.height;

    if (maxHeight !== undefined) {
      height = Math.min(height, maxHeight);
    }
  }

  const left = fromCenter && isCorner
    ? startLeft + (startLayout.width - width) / 2
    : changesLeft
      ? startLeft + startLayout.width - width
      : startLeft;
  const top = fromCenter && isCorner
    ? startTop + (startLayout.height - height) / 2
    : changesTop
      ? startTop + startLayout.height - height
      : startTop;
  const anchorX = getLayoutAnchorX(startLayout);
  const anchorY = getLayoutAnchorY(startLayout);

  return clampItemLayout(item, {
    ...startLayout,
    height,
    width,
    x: getAnchoredXFromLeft({ anchorX, left, viewportWidth, width }),
    y: getAnchoredYFromTop({ anchorY, height, top, viewportHeight }),
  });
}
