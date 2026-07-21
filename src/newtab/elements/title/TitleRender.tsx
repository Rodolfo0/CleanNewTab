import { Title } from "@mantine/core";
import {
  getItemDisplay,
  getItemFontSize,
  getItemStyle,
  type BoardItemStyle,
  type TitleItem,
} from "../../model/boardItems";
import { getTextAlign } from "../shared/renderHelpers";

export function TitleRender({
  componentTheme,
  item,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: TitleItem;
}) {
  const display = getItemDisplay(item);
  const style = { ...getItemStyle(item, componentTheme), fontSize: getItemFontSize(item, componentTheme) };
  const isLabel = display.variant === "title-label";
  const isPanel = display.variant === "title-panel";

  return (
    <div
      className={`h-full min-h-0 overflow-hidden ${
        isPanel ? "flex items-center" : ""
      }`}
    >
      <Title
        order={isLabel ? 3 : 1}
        className={`m-0 truncate font-semibold ${
          isLabel ? "uppercase tracking-[0.18em]" : "leading-none"
        }`}
        style={{
          color: style.textColor,
          fontFamily: style.fontFamily,
          fontSize: isLabel
            ? Math.max(11, Math.round(style.fontSize * 0.45))
            : isPanel
              ? Math.round(style.fontSize * 1.08)
              : style.fontSize,
          lineHeight: 1,
          textAlign: getTextAlign(display.align),
          width: "100%",
        }}
      >
        {item.title}
      </Title>
    </div>
  );
}
