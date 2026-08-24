import type { ReactNode } from "react";
import { useState } from "react";
import {
  ActionIcon,
  CloseButton,
  ColorPicker,
  ColorSwatch,
  Divider,
  Group,
  NumberInput,
  Paper,
  Portal,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { useFloatingWindow } from "@mantine/hooks";
import { DotsSixVerticalIcon, PaletteIcon } from "@phosphor-icons/react";

import type { BoardItemStyle, TitleItem } from "../model/boardItems";
import {
  getItemFontSize,
  getItemStyle,
  getItemVariantCapabilities,
} from "../model/boardItems";

const fontOptions = [
  {
    value: "Inter, ui-sans-serif, system-ui, sans-serif",
    label: "Inter / Sistema",
  },
  {
    value: "Georgia, Cambria, serif",
    label: "Serif",
  },
  {
    value: "ui-monospace, SFMono-Regular, Menlo, monospace",
    label: "Monospace",
  },
  {
    value: "'Trebuchet MS', Arial, sans-serif",
    label: "Trebuchet",
  },
];

const colorSwatches = [
  "#171717",
  "#ffffff",
  "#228be6",
  "#12b886",
  "#fa5252",
  "#f59f00",
  "#7950f2",
  "#e64980",
];

function DesignSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack gap={8}>
      <Text size="xs" fw={700} className="text-[#344054]">
        {title}
      </Text>
      {children}
    </Stack>
  );
}

export function TitleDesignWindow({
  item,
  onClose,
  onOpen,
  onStyleChange,
  opened,
}: {
  item: TitleItem;
  onClose: () => void;
  onOpen: () => void;
  onStyleChange: (style: Partial<BoardItemStyle>) => void;
  opened: boolean;
}) {
  const [activeColorTarget, setActiveColorTarget] = useState<
    "text" | "background" | "border"
  >("text");
  const {
    ref: setFloatingWindowRef,
  } = useFloatingWindow<HTMLDivElement>({
    constrainToViewport: true,
    constrainOffset: 12,
    dragHandleSelector: "[data-title-design-drag-handle]",
    excludeDragHandleSelector:
      "button,input,textarea,select,[role='combobox'],[data-no-drag]",
    initialPosition: { right: 24, top: 88 },
  });
  const style = getItemStyle(item);
  const capabilities = getItemVariantCapabilities(item);
  const effectiveFontSize = getItemFontSize(item);
  const colorTargets = [
    { value: "text", label: "Texto" },
    ...(capabilities.hasBackground
      ? [{ value: "background", label: "Fondo" }]
      : []),
    ...(capabilities.hasBorder ? [{ value: "border", label: "Borde" }] : []),
  ];
  const resolvedColorTarget = colorTargets.some(
    (target) => target.value === activeColorTarget,
  )
    ? activeColorTarget
    : "text";
  const hasContainerControls =
    capabilities.hasPadding ||
    capabilities.hasBorderRadius ||
    capabilities.hasBorder;

  function updateStyle(nextStyle: Partial<BoardItemStyle>) {
    onStyleChange({ ...style, ...nextStyle });
  }

  const activeColor =
    resolvedColorTarget === "text"
      ? style.textColor
      : resolvedColorTarget === "background"
        ? style.backgroundColor
        : style.borderColor;

  function updateActiveColor(value: string) {
    if (resolvedColorTarget === "text") {
      updateStyle({ textColor: value });
      return;
    }

    if (resolvedColorTarget === "background") {
      updateStyle({ backgroundColor: value });
      return;
    }

    updateStyle({ borderColor: value });
  }

  return (
    <>
      <Tooltip label="Diseño">
        <ActionIcon
          variant={opened ? "filled" : "default"}
          color={opened ? "dark" : "gray"}
          aria-label={`Diseño de ${item.title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (opened) {
              onClose();
              return;
            }

            onOpen();
          }}
        >
          <PaletteIcon size={18} />
        </ActionIcon>
      </Tooltip>

      {opened ? (
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
              zIndex: 400,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Group
              justify="space-between"
              wrap="nowrap"
              className="border-b border-[#eaecf0] bg-[#f9fafb] px-3 py-2"
              data-title-design-drag-handle
            >
              <Group gap={6} wrap="nowrap" className="min-w-0 cursor-move">
                <DotsSixVerticalIcon size={18} className="shrink-0 text-[#98a2b3]" />
                <Text size="xs" fw={700} className="truncate text-[#344054]">
                  Diseño de título
                </Text>
              </Group>
              <CloseButton
                size="sm"
                aria-label="Cerrar diseño"
                data-no-drag
                onClick={onClose}
              />
            </Group>

            <Stack
              gap="md"
              className="max-h-[calc(100vh-78px)] overflow-auto p-3"
            >
              <div
                className="rounded-md border border-[#eaecf0] px-3 py-2"
                style={{
                  backgroundColor: style.backgroundColor,
                  borderColor: capabilities.hasBorder
                    ? style.borderColor
                    : "#eaecf0",
                  borderWidth: capabilities.hasBorder
                    ? Math.max(1, style.borderWidth)
                    : 1,
                  borderStyle: "solid",
                }}
              >
                <Text
                  size="sm"
                  fw={700}
                  className="truncate"
                  style={{
                    color: style.textColor,
                    fontFamily: style.fontFamily,
                  }}
                >
                  {item.title}
                </Text>
              </div>

              <Divider />

              <DesignSection title="Color">
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={resolvedColorTarget}
                  data={colorTargets}
                  onChange={(value) =>
                    setActiveColorTarget(value as "text" | "background" | "border")
                  }
                />

                <Group gap={6}>
                  {colorSwatches.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="rounded-full p-0.5 transition-transform hover:scale-105"
                      aria-label={`Usar color ${color}`}
                      onClick={() => updateActiveColor(color)}
                    >
                      <ColorSwatch
                        color={color}
                        size={22}
                        withShadow={false}
                        className="border border-[#d0d5dd]"
                      />
                    </button>
                  ))}
                </Group>

                <ColorPicker
                  format="hex"
                  fullWidth
                  size="xs"
                  value={activeColor}
                  onChange={updateActiveColor}
                />
              </DesignSection>

              <Divider />

              <DesignSection title="Texto">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="xs" className="text-[#667085]">
                    Texto: {effectiveFontSize}px
                  </Text>
                  <Switch
                    size="xs"
                    label="Bloquear"
                    checked={style.fontSizeLocked}
                    onChange={(event) =>
                      updateStyle({
                        fontSize: effectiveFontSize,
                        fontSizeLocked: event.currentTarget.checked,
                      })
                    }
                  />
                </Group>
                <Group grow align="end">
                  <NumberInput
                    label="Tamaño"
                    size="xs"
                    min={12}
                    max={96}
                    value={style.fontSizeLocked ? style.fontSize : effectiveFontSize}
                    disabled={!style.fontSizeLocked}
                    onChange={(value) =>
                      updateStyle({
                        fontSize:
                          typeof value === "number" ? value : style.fontSize,
                        fontSizeLocked: true,
                      })
                    }
                  />
                  <Select
                    label="Tipo de letra"
                    size="xs"
                    data={fontOptions}
                    value={style.fontFamily}
                    onChange={(value) => {
                      if (value) {
                        updateStyle({ fontFamily: value });
                      }
                    }}
                  />
                </Group>
              </DesignSection>

              {hasContainerControls ? (
                <>
                  <Divider />

                  <DesignSection title="Contenedor">
                    <Group grow align="end">
                      {capabilities.hasPadding ? (
                        <NumberInput
                          label="Padding"
                          size="xs"
                          min={0}
                          max={40}
                          value={style.padding}
                          onChange={(value) =>
                            updateStyle({
                              padding:
                                typeof value === "number"
                                  ? value
                                  : style.padding,
                            })
                          }
                        />
                      ) : null}
                      {capabilities.hasBorderRadius ? (
                        <NumberInput
                          label="Radio"
                          size="xs"
                          min={0}
                          max={40}
                          value={style.borderRadius}
                          onChange={(value) =>
                            updateStyle({
                              borderRadius:
                                typeof value === "number"
                                  ? value
                                  : style.borderRadius,
                            })
                          }
                        />
                      ) : null}
                      {capabilities.hasBorder ? (
                        <NumberInput
                          label="Borde"
                          size="xs"
                          min={0}
                          max={12}
                          value={style.borderWidth}
                          onChange={(value) =>
                            updateStyle({
                              borderWidth:
                                typeof value === "number"
                                  ? value
                                  : style.borderWidth,
                            })
                          }
                        />
                      ) : null}
                    </Group>
                  </DesignSection>
                </>
              ) : null}
            </Stack>
          </Paper>
        </Portal>
      ) : null}
    </>
  );
}
