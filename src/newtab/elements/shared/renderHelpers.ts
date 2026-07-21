import type { BoardItemDisplay } from "../../model/boardItems";

export function getTextAlign(align: BoardItemDisplay["align"]) {
  if (align === "center") {
    return "center";
  }

  if (align === "right") {
    return "right";
  }

  return "left";
}

export function getJustify(align: BoardItemDisplay["align"]) {
  if (align === "center") {
    return "center";
  }

  if (align === "right") {
    return "flex-end";
  }

  return "flex-start";
}
