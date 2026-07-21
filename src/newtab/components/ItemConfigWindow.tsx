import {
  ActionIcon,
  CloseButton,
  Divider,
  Group,
  NumberInput,
  Paper,
  Portal,
  Stack,
  Text,
} from "@mantine/core";
import { useFloatingWindow } from "@mantine/hooks";
import { CircleIcon, DotsSixVerticalIcon } from "@phosphor-icons/react";

import { DateConfig } from "../elements/date/DateConfig";
import { GroupConfig } from "../elements/group/GroupConfig";
import { LinkConfig } from "../elements/link/LinkConfig";
import { SearchConfig } from "../elements/search/SearchConfig";
import { Section } from "../elements/shared/configSections";
import { TitleConfig } from "../elements/title/TitleConfig";
import { getItemMaxHeight } from "../model/boardItems";

import type { ItemConfigPatch } from "../elements/shared/configTypes";
import type {
  BoardHorizontalAnchor,
  BoardItem,
  BoardVerticalAnchor,
} from "../model/boardItems";
const anchorOptions = [
  { anchorX: "left", anchorY: "top", label: "Arriba izquierda" },
  { anchorX: "center", anchorY: "top", label: "Arriba centro" },
  { anchorX: "right", anchorY: "top", label: "Arriba derecha" },
  { anchorX: "left", anchorY: "center", label: "Centro izquierda" },
  { anchorX: "center", anchorY: "center", label: "Centro" },
  { anchorX: "right", anchorY: "center", label: "Centro derecha" },
  { anchorX: "left", anchorY: "bottom", label: "Abajo izquierda" },
  { anchorX: "center", anchorY: "bottom", label: "Abajo centro" },
  { anchorX: "right", anchorY: "bottom", label: "Abajo derecha" },
] satisfies Array<{
  anchorX: BoardHorizontalAnchor;
  anchorY: BoardVerticalAnchor;
  label: string;
}>;

type ItemConfigWindowProps = {
  item?: BoardItem;
  opened: boolean;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
  onClose: () => void;
};

function getAnchorLabel(item: BoardItem) {
  const anchorX = item.layout.anchorX ?? "left";
  const anchorY = item.layout.anchorY ?? "top";

  return (
    anchorOptions.find(
      (option) => option.anchorX === anchorX && option.anchorY === anchorY,
    )?.label ?? "Arriba izquierda"
  );
}

function ElementPropsConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  if (item.type === "link") {
    return <LinkConfig item={item} onChange={onChange} />;
  }

  if (item.type === "group") {
    return <GroupConfig item={item} onChange={onChange} />;
  }

  if (item.type === "search") {
    return <SearchConfig item={item} onChange={onChange} />;
  }

  if (item.type === "title") {
    return <TitleConfig item={item} onChange={onChange} />;
  }

  return <DateConfig item={item} onChange={onChange} />;
}

function LayoutConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const anchorX = item.layout.anchorX ?? "left";
  const anchorY = item.layout.anchorY ?? "top";
  const maxHeight = getItemMaxHeight(item);

  return (
    <>
      <Divider />

      <Section title="Tamano">
        <Group grow align="end">
          <NumberInput
            label="Ancho"
            size="xs"
            min={1}
            max={1600}
            value={item.layout.width}
            onChange={(value) =>
              onChange(item.id, {
                width: typeof value === "number" ? value : item.layout.width,
              })
            }
          />
          <NumberInput
            label="Alto"
            size="xs"
            min={1}
            max={maxHeight ?? 1200}
            value={item.layout.height}
            onChange={(value) =>
              onChange(item.id, {
                height: typeof value === "number" ? value : item.layout.height,
              })
            }
          />
        </Group>
      </Section>

      <Stack gap={6}>
        <Group justify="space-between">
          <Text size="xs" fw={700} className="text-[#344054]">
            Anclaje
          </Text>
          <Text size="xs" className="text-[#667085]">
            {getAnchorLabel(item)}
          </Text>
        </Group>
        <div className="grid w-fit grid-cols-3 gap-1 rounded-md border border-[#d0d5dd] bg-[#f9fafb] p-1">
          {anchorOptions.map((option) => {
            const isSelected =
              anchorX === option.anchorX && anchorY === option.anchorY;

            return (
              <ActionIcon
                key={`${option.anchorX}-${option.anchorY}`}
                type="button"
                variant={isSelected ? "filled" : "subtle"}
                color={isSelected ? "dark" : "gray"}
                size="sm"
                aria-label={option.label}
                title={option.label}
                onClick={() =>
                  onChange(item.id, {
                    anchorX: option.anchorX,
                    anchorY: option.anchorY,
                  })
                }
              >
                <CircleIcon
                  size={
                    option.anchorX === "center" && option.anchorY === "center"
                      ? 9
                      : 7
                  }
                  weight={isSelected ? "fill" : "regular"}
                />
              </ActionIcon>
            );
          })}
        </div>
        <Group grow align="end">
          <NumberInput
            label="X"
            size="xs"
            value={item.layout.x}
            onChange={(value) =>
              onChange(item.id, {
                positionX: typeof value === "number" ? value : item.layout.x,
              })
            }
          />
          <NumberInput
            label="Y"
            size="xs"
            value={item.layout.y}
            onChange={(value) =>
              onChange(item.id, {
                positionY: typeof value === "number" ? value : item.layout.y,
              })
            }
          />
        </Group>
      </Stack>
    </>
  );
}

export function ItemConfigWindow({
  item,
  opened,
  onChange,
  onClose,
}: ItemConfigWindowProps) {
  const { ref: setFloatingWindowRef } = useFloatingWindow<HTMLDivElement>({
    constrainToViewport: true,
    constrainOffset: 12,
    dragHandleSelector: "[data-item-config-drag-handle]",
    excludeDragHandleSelector: "button,input,textarea,select,[data-no-drag]",
    initialPosition: { right: 18, top: 126 },
  });

  if (!opened || !item) {
    return null;
  }

  return (
    <Portal>
      <Paper
        ref={setFloatingWindowRef}
        withBorder
        radius="md"
        shadow="lg"
        className="w-85 overflow-hidden bg-white"
        style={{
          maxHeight: "calc(100vh - 24px)",
          position: "fixed",
          zIndex: 405,
        }}
      >
        <Group
          justify="space-between"
          wrap="nowrap"
          className="border-b border-[#eaecf0] bg-[#f9fafb] px-3 py-2"
          data-item-config-drag-handle
        >
          <Group gap={6} wrap="nowrap" className="min-w-0 cursor-move">
            <DotsSixVerticalIcon
              size={18}
              className="shrink-0 text-[#98a2b3]"
            />
            <Text size="xs" fw={700} className="truncate text-[#344054]">
              Configurar elemento
            </Text>
          </Group>
          <CloseButton
            size="sm"
            aria-label="Cerrar configuracion"
            data-no-drag
            onClick={onClose}
          />
        </Group>

        <Stack gap="md" className="max-h-[calc(100vh-78px)] overflow-auto p-3">
          <ElementPropsConfig item={item} onChange={onChange} />
          <LayoutConfig item={item} onChange={onChange} />
        </Stack>
      </Paper>
    </Portal>
  );
}
