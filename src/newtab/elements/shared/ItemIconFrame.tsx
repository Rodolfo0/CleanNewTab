import type { ReactNode } from "react";
import type { BoardItemDisplay } from "../../model/boardItems";

export function ItemIconFrame({
  children,
  display,
  itemPadding,
}: {
  children: ReactNode;
  display: BoardItemDisplay;
  itemPadding: number;
}) {
  const frameInset =
    display.iconStyle === "plain" ? 0 : Math.min(12, itemPadding);
  const size = Math.max(display.iconSize + frameInset, display.iconSize);

  if (display.iconStyle === "plain") {
    return (
      <div
        className="grid shrink-0 place-items-center"
        style={{ height: display.iconSize, width: display.iconSize }}
      >
        {children}
      </div>
    );
  }

  if (display.iconStyle === "solid") {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-full text-white"
        style={{ height: size, width: size }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="grid shrink-0 place-items-center rounded-mdtext-current"
      style={{ height: size, width: size }}
    >
      {children}
    </div>
  );
}
