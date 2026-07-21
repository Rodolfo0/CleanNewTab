import { Anchor, Group, Stack, Text, Title } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";

import { BrandIcon } from "../../icons/BrandIcon";
import { PhosphorIcon } from "../../icons/phosphorIcons";
import {
  BoardItemStyle,
  getItemDisplay,
  getItemFontSize,
  getItemIconSize,
  getItemStyle,
  GroupItem,
} from "../../model/boardItems";
import { ItemIconFrame } from "../shared/ItemIconFrame";
import { getJustify } from "../shared/renderHelpers";

export function GroupRender({
  componentTheme,
  item,
  isEditing,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: GroupItem;
  isEditing: boolean;
}) {
  const display = {
    ...getItemDisplay(item),
    iconSize: getItemIconSize(item, componentTheme),
  };
  const style = {
    ...getItemStyle(item, componentTheme),
    fontSize: getItemFontSize(item, componentTheme),
  };
  const isIcons =
    display.variant === "group-icons" ||
    display.variant === "group-icons-plain";
  const isGrid =
    display.variant === "group-grid" ||
    display.variant === "group-grid-no-header";
  const isList =
    display.variant === "group-list" ||
    display.variant === "group-list-plain" ||
    display.variant === "group-list-no-header";
  const justify = getJustify(display.align);
  const textAlign =
    display.align === "center"
      ? "center"
      : display.align === "right"
        ? "right"
        : "left";
  const hasItemPadding = style.padding > 0;
  const contentGap = hasItemPadding ? (isIcons ? 8 : isGrid ? 14 : "md") : 0;

  return (
    <Stack
      gap={contentGap}
      className={`h-full min-h-0 ${isIcons ? "justify-center" : ""}`}
      style={{
        alignItems:
          display.align === "left"
            ? "stretch"
            : display.align === "right"
              ? "flex-end"
              : "center",
        textAlign,
      }}
    >
      {display.showTitle || display.showIcon ? (
        <Group
          gap={hasItemPadding ? 8 : 0}
          justify={isGrid ? "center" : justify}
          wrap="nowrap"
          className="min-w-0"
        >
          {display.showIcon ? (
            <ItemIconFrame display={display} itemPadding={style.padding}>
              <PlusIcon size={display.iconSize} />
            </ItemIconFrame>
          ) : null}
          {display.showTitle ? (
            <Title
              order={2}
              className="truncate font-semibold"
              style={{
                color: style.textColor,
                fontFamily: style.fontFamily,
                fontSize: isGrid
                  ? Math.round(style.fontSize * 1.1)
                  : style.fontSize,
                lineHeight: 1,
              }}
            >
              {item.title}
            </Title>
          ) : null}
        </Group>
      ) : null}

      {display.showSubtitle && item.links.length > 0 ? (
        <Stack
          gap={hasItemPadding ? (isList ? 2 : isGrid ? 8 : 6) : 0}
          className="min-h-0 flex-1 overflow-hidden"
          style={{ width: display.align === "center" ? "100%" : undefined }}
        >
          <div
            className={
              isIcons
                ? "flex flex-wrap items-center gap-2"
                : "contents"
            }
            style={{
              gap: hasItemPadding ? undefined : 0,
              justifyContent: isIcons ? justify : undefined,
            }}
          >
            {item.links.map((link) => (
              <Anchor
                key={link.id}
                href={link.url}
                target="_self"
                underline="never"
                className={`flex items-center gap-2 ${
                  isIcons
                    ? "shrink-0 justify-center rounded-md hover:opacity-80"
                    : isList
                      ? `min-w-0 truncate rounded text-sm hover:bg-black/4 ${
                          hasItemPadding ? "px-2 py-1" : "px-0 py-0"
                        }`
                      : isGrid
                        ? `min-w-0 truncate rounded-md border border-black/10 text-sm hover:bg-black/4 ${
                            hasItemPadding ? "px-2 py-2" : "px-0 py-0"
                          }`
                        : "min-w-0 truncate text-sm"
                }`}
                style={{
                  flex: isIcons ? "0 0 auto" : undefined,
                  height: isIcons ? display.iconSize : undefined,
                  justifyContent: getJustify(display.align),
                  lineHeight: 1,
                  textAlign,
                  width: isIcons ? display.iconSize : undefined,
                }}
                onClick={(event) => {
                  if (isEditing) {
                    event.preventDefault();
                  }
                }}
              >
                <BrandIcon
                  name={getItemDisplay(link).linkIcon}
                  size={display.iconSize}
                />
                {isIcons ? null : (
                  <span className="truncate">{link.title}</span>
                )}
              </Anchor>
            ))}
          </div>
        </Stack>
      ) : display.showSubtitle ? (
        <Text size="sm" className="text-[#98a2b3]">
          Sin links todavía
        </Text>
      ) : null}
    </Stack>
  );
}
