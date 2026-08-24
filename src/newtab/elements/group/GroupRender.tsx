import { Anchor, Group, Stack, Text, Title } from "@mantine/core";

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
    display.variant === "group-grid-no-header" ||
    display.variant === "group-grid-plain";
  const isList = display.variant === "group-list-no-header";
  const justify = getJustify(display.align);
  const cardContentJustify =
    display.groupCardContentAlign === "left"
      ? "start"
      : display.groupCardContentAlign === "right"
        ? "end"
        : "center";
  const cardTextAlign =
    display.groupCardContentAlign === "center"
      ? "center"
      : display.groupCardContentAlign === "right"
        ? "right"
        : "left";
  const cardContentAlign =
    display.groupCardContentPosition === "top"
      ? "start"
      : display.groupCardContentPosition === "bottom"
        ? "end"
        : "center";
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
          justify={justify}
          wrap="nowrap"
          className="min-w-0"
          style={{ width: isGrid ? "100%" : undefined }}
        >
          {display.showIcon ? (
            <ItemIconFrame display={display} itemPadding={style.padding}>
              <BrandIcon name={display.linkIcon} size={display.iconSize} />
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
          style={{
            width:
              isGrid || display.align === "center" ? "100%" : undefined,
          }}
        >
          <div
            className={
              isIcons
                ? "flex flex-wrap items-center gap-2"
                : isGrid
                  ? "grid content-start gap-2"
                  : "contents"
            }
            style={{
              gap: isGrid || hasItemPadding ? undefined : 0,
              gridTemplateColumns: isGrid
                ? `repeat(auto-fit, minmax(min(100%, ${display.groupCardMinWidth}px), ${display.groupCardMinWidth}px))`
                : undefined,
              justifyContent: isIcons || isGrid ? justify : undefined,
            }}
          >
            {item.links.map((link) => {
              const linkDisplay = getItemDisplay(link);

              return (
                <Anchor
                key={link.id}
                href={link.url}
                target={link.openInNewTab ? "_blank" : "_self"}
                rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                underline="never"
                className={`${isGrid ? "grid" : "flex items-center"} ${
                  isIcons
                    ? "shrink-0 justify-center rounded-md hover:opacity-80"
                    : isList
                      ? `min-w-0 truncate rounded text-sm hover:bg-black/4 ${
                          hasItemPadding ? "px-2 py-1" : "px-0 py-0"
                        }`
                      : isGrid
                        ? "min-w-0 truncate rounded-md border border-[#d0d5dd] bg-white px-2 py-2 text-sm shadow-sm hover:bg-[#f9fafb]"
                        : "min-w-0 truncate text-sm"
                }`}
                style={{
                  alignContent: isGrid ? cardContentAlign : undefined,
                  alignItems: isGrid ? undefined : "center",
                  color: style.textColor,
                  flex: isIcons ? "0 0 auto" : undefined,
                  height: isIcons ? display.iconSize : undefined,
                  justifyContent: isGrid
                    ? undefined
                    : getJustify(display.align),
                  justifyItems: isGrid ? cardContentJustify : undefined,
                  lineHeight: 1,
                  minHeight: isGrid
                    ? display.groupCardMinHeight
                    : undefined,
                  textAlign: isGrid ? cardTextAlign : textAlign,
                  width: isIcons ? display.iconSize : undefined,
                }}
                onClick={(event) => {
                  if (isEditing) {
                    event.preventDefault();
                  }
                }}
              >
                <span
                  className={`flex min-w-0 items-center ${isIcons ? "" : "gap-2"}`}
                  style={{
                    alignItems:
                      isGrid && display.groupCardContentDirection === "vertical"
                        ? getJustify(display.groupCardContentAlign)
                        : "center",
                    flexDirection:
                      isGrid && display.groupCardContentDirection === "vertical"
                        ? "column"
                        : "row",
                    maxWidth: "100%",
                  }}
                >
                  {isIcons || linkDisplay.showIcon ? (
                    <span
                      className={
                        isGrid && display.groupCardIconFrame
                          ? "grid shrink-0 place-items-center rounded-md bg-[#f2f4f7] p-1.5"
                          : "grid shrink-0 place-items-center"
                      }
                    >
                      <BrandIcon
                        name={linkDisplay.linkIcon}
                        size={
                          isIcons
                            ? display.iconSize
                            : link.display?.iconSize ?? display.groupCardIconSize
                        }
                      />
                    </span>
                  ) : null}
                  {isIcons ? null : (
                    <span className="truncate">{link.title}</span>
                  )}
                </span>
                </Anchor>
              );
            })}
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
