import { Stack, Text } from "@mantine/core";
import {
  getItemDisplay,
  getItemFontSize,
  getItemStyle,
  type BoardItemStyle,
  type DateItem,
} from "../../model/boardItems";
import { getTextAlign } from "../shared/renderHelpers";

export function DateRender({
  componentTheme,
  item,
  today,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: DateItem;
  today: string;
}) {
  const display = getItemDisplay(item);
  const style = { ...getItemStyle(item, componentTheme), fontSize: getItemFontSize(item, componentTheme) };
  const isLarge = display.variant === "date-large";
  const isMinimal = display.variant === "date-minimal";

  return (
    <Stack
      gap={isMinimal ? 2 : isLarge ? 8 : 6}
      className="h-full justify-center"
      style={{
        alignItems:
          display.align === "left"
            ? "flex-start"
            : display.align === "right"
              ? "flex-end"
              : "center",
        textAlign: getTextAlign(display.align),
      }}
    >
      {display.showTitle && !isMinimal ? (
        <Text
          className="text-xs font-medium uppercase tracking-[0.16em] opacity-70"
          lh={1}
        >
          {item.title}
        </Text>
      ) : null}
      <Text
        className="truncate font-semibold"
        style={{
          color: style.textColor,
          fontFamily: style.fontFamily,
          fontSize: isLarge
            ? Math.round(style.fontSize * 1.25)
            : style.fontSize,
          lineHeight: 1,
        }}
      >
        {today}
      </Text>
    </Stack>
  );
}
