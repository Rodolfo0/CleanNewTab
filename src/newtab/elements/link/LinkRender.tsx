import { Stack, Text } from "@mantine/core";

import { BrandIcon } from "../../icons/BrandIcon";
import {
  BoardItemStyle,
  getItemDisplay,
  getItemFontSize,
  getItemIconSize,
  getItemStyle,
  LinkItem,
} from "../../model/boardItems";
import { ItemIconFrame } from "../shared/ItemIconFrame";
import { getJustify, getTextAlign } from "../shared/renderHelpers";

export function LinkRender({
  componentTheme,
  item,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: LinkItem;
}) {
  const display = {
    ...getItemDisplay(item),
    iconSize: getItemIconSize(item, componentTheme),
  };
  const style = {
    ...getItemStyle(item, componentTheme),
    fontSize: getItemFontSize(item, componentTheme),
  };
  const isIcon =
    display.variant === "link-icon" || display.variant === "link-icon-plain";
  const isTile = display.variant === "link-tile";
  const justify = getJustify(display.align);
  const textAlign = getTextAlign(display.align);
  const contentGap = style.padding === 0 ? 0 : isTile ? 14 : 10;
  const icon = (
    <ItemIconFrame
      display={{ ...display, iconStyle: isIcon ? "plain" : display.iconStyle }}
      itemPadding={style.padding}
    >
      <BrandIcon name={display.linkIcon} size={display.iconSize} />
    </ItemIconFrame>
  );

  return (
    <div
      className={`flex h-full min-w-0 ${
        isIcon || isTile ? "flex-col" : "flex-row"
      } items-center ${isIcon || isTile ? "justify-center" : ""}`}
      style={{
        gap: contentGap,
        justifyContent: isIcon || isTile ? "center" : justify,
        textAlign: isIcon ? "center" : textAlign,
      }}
    >
      {display.showIcon ? icon : null}
      <Stack
        gap={style.padding === 0 || isIcon ? 0 : isTile ? 6 : 4}
        className={`min-w-0 `}
      >
        {display.showTitle && !isIcon ? (
          <Text
            className={
              isTile ? "line-clamp-2 font-semibold" : "truncate font-semibold"
            }
            style={{
              color: style.textColor,
              fontFamily: style.fontFamily,
              fontSize: isTile
                ? Math.round(style.fontSize * 1.2)
                : style.fontSize,
              lineHeight: 1,
            }}
          >
            {item.title}
          </Text>
        ) : null}
        {display.showSubtitle && !isIcon ? (
          <Text size="xs" className="truncate opacity-70" lh={1}>
            {item.url}
          </Text>
        ) : null}
      </Stack>
    </div>
  );
}
