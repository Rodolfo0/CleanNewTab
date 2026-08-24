import { useMemo, useState } from "react";
import {
  Accordion,
  ActionIcon,
  ColorPicker,
  ColorSwatch,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import type {
  BoardItem,
  BoardItemAlign,
  BoardItemDisplay,
  BoardItemStyle,
} from "../../model/boardItems";
import {
  getItemDisplay,
  getItemFontSize,
  getItemIconSize,
  getItemStyle,
  getItemVariantCapabilities,
} from "../../model/boardItems";
import {
  normalizePhosphorIconName,
  PhosphorIcon,
  phosphorIconOptions,
} from "../../icons/phosphorIcons";
import { BrandIcon } from "../../icons/BrandIcon";
import {
  getBrandIconId,
  getPopularSiteByIcon,
  popularSites,
} from "../../icons/brandIconData";
import {
  getSiteFaviconIconId,
  getSiteFaviconPageUrl,
  requestSiteFaviconPermission,
} from "../../icons/siteFavicon";
import type { ItemConfigPatch } from "./configTypes";

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

export function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
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

export function ConfigAccordion({
  children,
  title,
  value,
}: {
  children: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Accordion variant="separated" radius="md">
      <Accordion.Item value={value}>
        <Accordion.Control>
          <Text size="xs" fw={700}>{title}</Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">{children}</Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function useItemMutators({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const display = getItemDisplay(item);
  const style = getItemStyle(item);

  function updateDisplay(nextDisplay: Partial<BoardItemDisplay>) {
    onChange(item.id, { display: { ...display, ...nextDisplay } });
  }

  function updateStyle(nextStyle: Partial<BoardItemStyle>) {
    onChange(item.id, { style: { ...style, ...nextStyle } });
  }

  return { display, style, updateDisplay, updateStyle };
}

export function PresentationConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const { display, updateDisplay } = useItemMutators({ item, onChange });

  return (
    <Section title="Alineación">
      <SegmentedControl
        fullWidth
        size="xs"
        value={display.align}
        data={[
          { value: "left", label: "Izq." },
          { value: "center", label: "Centro" },
          { value: "right", label: "Der." },
        ]}
        onChange={(value) => updateDisplay({ align: value as BoardItemAlign })}
      />
    </Section>
  );
}

export function AlignmentConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  return (
    <ConfigAccordion title="Alineación" value="alignment">
      <PresentationConfig item={item} onChange={onChange} />
    </ConfigAccordion>
  );
}

export type ItemVariantOption = {
  description: string;
  label: string;
  value: BoardItemDisplay["variant"];
};

export function VariantConfig({
  item,
  onChange,
  options,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
  options: ItemVariantOption[];
}) {
  const { display, updateDisplay } = useItemMutators({ item, onChange });

  return (
    <Section title="Variante">
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const isSelected = display.variant === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`rounded-md border p-2 text-left transition-colors ${
                isSelected
                  ? "border-[#171717] bg-[#171717] text-white"
                  : "border-[#d0d5dd] bg-white text-[#344054] hover:bg-[#f9fafb]"
              }`}
              onClick={() => updateDisplay({ variant: option.value })}
            >
              <Text size="xs" fw={700}>
                {option.label}
              </Text>
              <Text
                size="xs"
                className={isSelected ? "mt-1 text-white/75" : "mt-1 text-[#667085]"}
              >
                {option.description}
              </Text>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

export function IconSizeConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const { display, updateDisplay } = useItemMutators({ item, onChange });
  const effectiveIconSize = getItemIconSize(item);

  return (
    <Section title="Tamano de icono">
      <Group justify="space-between" wrap="nowrap">
        <Text size="xs" className="text-[#667085]">
          Icono: {effectiveIconSize}px
        </Text>
        <Switch
          size="xs"
          label="Bloquear"
          checked={display.iconSizeLocked}
          onChange={(event) =>
            updateDisplay({
              iconSize: effectiveIconSize,
              iconSizeLocked: event.currentTarget.checked,
            })
          }
        />
      </Group>
      <NumberInput
        label="Tamano"
        size="xs"
        min={10}
        value={display.iconSizeLocked ? display.iconSize : effectiveIconSize}
        disabled={!display.iconSizeLocked}
        onChange={(value) =>
          updateDisplay({
            iconSize: typeof value === "number" ? value : display.iconSize,
            iconSizeLocked: true,
          })
        }
      />
    </Section>
  );
}

export function LinkIconConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const [iconQuery, setIconQuery] = useState("");
  const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false);
  const [visibleIconCount, setVisibleIconCount] = useState(60);
  const { display, updateDisplay } = useItemMutators({ item, onChange });
  const selectedFaviconUrl = getSiteFaviconPageUrl(display.linkIcon);
  const selectedPopularSite = getPopularSiteByIcon(display.linkIcon);
  const selectedIconName = selectedFaviconUrl
    ? display.linkIcon
    : selectedPopularSite
      ? getBrandIconId(selectedPopularSite.id)
      : normalizePhosphorIconName(display.linkIcon);
  const selectedIconLabel =
    selectedFaviconUrl
      ? "Icono del sitio"
      : selectedPopularSite?.name ??
        phosphorIconOptions.find((option) => option.value === selectedIconName)
          ?.label ?? selectedIconName;
  const itemUrl = item.type === "link" ? item.url : "";
  const matchingIconOptions = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();

    if (!query) {
      return phosphorIconOptions;
    }

    return phosphorIconOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query),
    );
  }, [iconQuery]);
  const visibleIconOptions = matchingIconOptions.slice(0, visibleIconCount);

  function updateIconQuery(value: string) {
    setIconQuery(value);
    setVisibleIconCount(60);
  }

  function loadMoreIcons(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const isNearBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 32;

    if (isNearBottom) {
      setVisibleIconCount((current) =>
        Math.min(current + 60, matchingIconOptions.length),
      );
    }
  }

  return (
    <Section title="Icono">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[#d0d5dd] bg-white px-2.5 py-2 text-left text-xs text-[#344054] transition-colors hover:bg-[#f9fafb]"
        onClick={() => setIsIconSelectorOpen((value) => !value)}
      >
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#f2f4f7] text-[#1d2939]">
              <BrandIcon name={selectedIconName} size={18} />
          </span>
          <span className="truncate">{selectedIconLabel}</span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-[#667085]">
          {isIconSelectorOpen ? "Cerrar" : "Cambiar"}
        </span>
      </button>

      {isIconSelectorOpen ? (
        <Stack gap={6}>
          <button
            type="button"
            disabled={!itemUrl.trim()}
            className="flex w-full items-center gap-2 rounded-md border border-[#d0d5dd] bg-white px-2.5 py-2 text-left text-xs font-semibold text-[#344054] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => {
              void requestSiteFaviconPermission().then((granted) => {
                if (granted) {
                  updateDisplay({ linkIcon: getSiteFaviconIconId(itemUrl) });
                  setIsIconSelectorOpen(false);
                }
              });
            }}
          >
            <BrandIcon
              name={itemUrl ? getSiteFaviconIconId(itemUrl) : undefined}
              size={18}
            />
            Usar icono del sitio
          </button>
          <div className="grid grid-cols-4 gap-1 rounded-md border border-[#d0d5dd] bg-[#f9fafb] p-1">
            {popularSites.map((site) => {
              const brandIconId = getBrandIconId(site.id);
              const isSelected = selectedIconName === brandIconId;

              return (
                <ActionIcon
                  key={site.id}
                  variant={isSelected ? "filled" : "subtle"}
                  color={isSelected ? "dark" : "gray"}
                  size="lg"
                  radius="md"
                  aria-label={site.name}
                  title={site.name}
                  onClick={() => {
                    updateDisplay({ linkIcon: brandIconId });
                    setIsIconSelectorOpen(false);
                  }}
                >
                  <BrandIcon name={brandIconId} size={18} />
                </ActionIcon>
              );
            })}
          </div>
          <TextInput
            size="xs"
            placeholder="Buscar icono"
            value={iconQuery}
            onChange={(event) => updateIconQuery(event.currentTarget.value)}
          />
          <div
            className="max-h-52 overflow-auto rounded-md border border-[#d0d5dd] bg-[#f9fafb] p-1"
            onScroll={loadMoreIcons}
          >
            <div className="grid grid-cols-5 gap-1">
              {visibleIconOptions.map((option) => {
                const isSelected = selectedIconName === option.value;

                return (
                  <ActionIcon
                    key={option.value}
                    variant={isSelected ? "filled" : "subtle"}
                    color={isSelected ? "dark" : "gray"}
                    size="lg"
                    radius="md"
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => {
                      updateDisplay({ linkIcon: option.value });
                      setIsIconSelectorOpen(false);
                    }}
                  >
                    <PhosphorIcon name={option.value} size={18} />
                  </ActionIcon>
                );
              })}
            </div>

            {matchingIconOptions.length === 0 ? (
              <Text size="xs" className="px-2 py-3 text-center text-[#98a2b3]">
                Sin resultados
              </Text>
            ) : null}

            {visibleIconOptions.length < matchingIconOptions.length ? (
              <Text size="xs" className="px-2 py-2 text-center text-[#98a2b3]">
                Baja para cargar mas
              </Text>
            ) : null}
          </div>
        </Stack>
      ) : null}
    </Section>
  );
}

export function ColorConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const [activeColorTarget, setActiveColorTarget] = useState<
    "text" | "background" | "border"
  >("background");
  const capabilities = getItemVariantCapabilities(item);
  const { style, updateStyle } = useItemMutators({ item, onChange });
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
      updateStyle({ backgroundColor: value, backgroundImage: "none" });
      return;
    }

    updateStyle({ borderColor: value });
  }

  return (
    <Section title="Color">
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
    </Section>
  );
}

export function SearchColorConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const [searchColorTarget, setSearchColorTarget] = useState<
    | "searchButtonBackgroundColor"
    | "searchButtonTextColor"
    | "searchInputBackgroundColor"
    | "searchInputTextColor"
  >("searchInputBackgroundColor");
  const { style, updateStyle } = useItemMutators({ item, onChange });
  const searchColorOptions = [
    { value: "searchInputBackgroundColor", label: "Barra fondo" },
    { value: "searchInputTextColor", label: "Barra texto" },
    { value: "searchButtonBackgroundColor", label: "Boton fondo" },
    { value: "searchButtonTextColor", label: "Boton texto" },
  ];

  return (
    <Section title="Busqueda">
      <SegmentedControl
        fullWidth
        size="xs"
        value={searchColorTarget}
        data={searchColorOptions}
        onChange={(value) =>
          setSearchColorTarget(
            value as
              | "searchButtonBackgroundColor"
              | "searchButtonTextColor"
              | "searchInputBackgroundColor"
              | "searchInputTextColor",
          )
        }
      />
      <Group gap={6}>
        {colorSwatches.map((color) => (
          <button
            key={color}
            type="button"
            className="rounded-full p-0.5 transition-transform hover:scale-105"
            aria-label={`Usar color ${color}`}
            onClick={() => updateStyle({ [searchColorTarget]: color })}
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
        value={style[searchColorTarget]}
        onChange={(value) => updateStyle({ [searchColorTarget]: value })}
      />
    </Section>
  );
}

export function ContainerConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const capabilities = getItemVariantCapabilities(item);
  const { style, updateStyle } = useItemMutators({ item, onChange });

  return (
    <Section title="Contenedor">
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
                padding: typeof value === "number" ? value : style.padding,
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
                  typeof value === "number" ? value : style.borderRadius,
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
                  typeof value === "number" ? value : style.borderWidth,
              })
            }
          />
        ) : null}
      </Group>
    </Section>
  );
}

export function TextConfig({
  item,
  onChange,
}: {
  item: BoardItem;
  onChange: (itemId: string, patch: ItemConfigPatch) => void;
}) {
  const { style, updateStyle } = useItemMutators({ item, onChange });
  const effectiveFontSize = getItemFontSize(item);

  return (
    <Section title="Texto">
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
          label="Tamano"
          size="xs"
          min={10}
          max={96}
          value={style.fontSizeLocked ? style.fontSize : effectiveFontSize}
          disabled={!style.fontSizeLocked}
          onChange={(value) =>
            updateStyle({
              fontSize: typeof value === "number" ? value : style.fontSize,
              fontSizeLocked: true,
            })
          }
        />
        <Select
          label="Tipo"
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
    </Section>
  );
}
