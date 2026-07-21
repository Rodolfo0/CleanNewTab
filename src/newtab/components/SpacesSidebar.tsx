import { useMemo, useState } from "react";
import {
  ActionIcon,
  ColorSwatch,
  Divider,
  Group,
  Menu,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  CaretLeftIcon,
  CaretRightIcon,
  DotsThreeVerticalIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { BoardSpace } from "../storage/boardStorage";
import {
  normalizePhosphorIconName,
  PhosphorIcon,
  phosphorIconOptions,
} from "../icons/phosphorIcons";

const spaceColors = [
  "#228be6",
  "#12b886",
  "#f59f00",
  "#fa5252",
  "#7950f2",
  "#e64980",
  "#344054",
  "#ffffff",
  "#0e1217",
  "#a8b3cf",
  "#ce3df3",
  "#c9ff3d",
  "#ff6f61",
];

type SpacesSidebarProps = {
  activeSpaceId: string;
  isCollapsed: boolean;
  spaces: BoardSpace[];
  onAddSpace: () => void;
  onDeleteSpace: (spaceId: string) => void;
  onSelectSpace: (spaceId: string) => void;
  onToggleCollapsed: () => void;
  onUpdateSpace: (
    spaceId: string,
    patch: Pick<Partial<BoardSpace>, "color" | "icon" | "name">,
  ) => void;
};

function SpaceMenuContent({
  onDelete,
  onUpdate,
  space,
}: {
  onDelete: () => void;
  onUpdate: (patch: Pick<Partial<BoardSpace>, "color" | "icon" | "name">) => void;
  space: BoardSpace;
}) {
  const [iconQuery, setIconQuery] = useState("");
  const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false);
  const [visibleIconCount, setVisibleIconCount] = useState(60);
  const selectedIconName = normalizePhosphorIconName(space.icon);
  const selectedIconLabel =
    phosphorIconOptions.find((option) => option.value === selectedIconName)
      ?.label ?? selectedIconName;
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
    const element = event.currentTarget;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    if (distanceFromBottom < 48) {
      setVisibleIconCount((currentCount) =>
        Math.min(currentCount + 60, matchingIconOptions.length),
      );
    }
  }

  return (
    <Stack gap={10} className="p-2">
      <TextInput
        size="xs"
        label="Nombre"
        value={space.name}
        onChange={(event) =>
          onUpdate({
            name: event.currentTarget.value,
          })
        }
      />

      <Stack gap={6}>
        <Text size="xs" fw={700} className="text-[#344054]">
          Icono
        </Text>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-[#d0d5dd] bg-white px-2.5 py-2 text-left text-xs text-[#344054] transition-colors hover:bg-[#f9fafb]"
          onClick={() => setIsIconSelectorOpen((value) => !value)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="grid size-7 shrink-0 place-items-center rounded-md"
              style={{
                backgroundColor: `${space.color}1f`,
                color: space.color === "#ffffff" ? "#344054" : space.color,
              }}
            >
              <PhosphorIcon name={selectedIconName} size={18} />
            </span>
            <span className="truncate">{selectedIconLabel}</span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-[#667085]">
            {isIconSelectorOpen ? "Cerrar" : "Cambiar"}
          </span>
        </button>

        {isIconSelectorOpen ? (
          <Stack gap={6}>
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
                        onUpdate({ icon: option.value });
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
                  Baja para cargar más
                </Text>
              ) : null}
            </div>
          </Stack>
        ) : null}
      </Stack>

      <Stack gap={6}>
        <Text size="xs" fw={700} className="text-[#344054]">
          Color
        </Text>
        <Group gap={6}>
          {spaceColors.map((color) => (
            <button
              key={color}
              type="button"
              className="rounded-full p-0.5 transition-transform hover:scale-105"
              onClick={() => onUpdate({ color })}
              aria-label={`Color ${color}`}
            >
              <ColorSwatch
                color={color}
                size={20}
                className="border border-[#d0d5dd]"
              />
            </button>
          ))}
        </Group>
      </Stack>

      <Divider />
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-[#c92a2a] transition-colors hover:bg-[#fff5f5]"
        onClick={onDelete}
      >
        <TrashIcon size={16} />
        Eliminar espacio
      </button>
    </Stack>
  );
}

export function SpacesSidebar({
  activeSpaceId,
  isCollapsed,
  spaces,
  onAddSpace,
  onDeleteSpace,
  onSelectSpace,
  onToggleCollapsed,
  onUpdateSpace,
}: SpacesSidebarProps) {
  return (
    <aside
      className={`fixed left-4 top-4 z-30 flex max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-md border border-[#d0d5dd] bg-white/94 shadow-sm backdrop-blur transition-[width] duration-200 ${
        isCollapsed ? "w-14" : "w-72"
      }`}
    >
      <Group
        justify={isCollapsed ? "center" : "space-between"}
        gap={6}
        wrap="nowrap"
        className="border-b border-[#eaecf0] px-2 py-2"
      >
        {isCollapsed ? null : (
          <Text size="xs" fw={800} className="truncate uppercase text-[#475467]">
            Espacios
          </Text>
        )}
        <Tooltip label={isCollapsed ? "Expandir espacios" : "Colapsar espacios"}>
          <ActionIcon
            size="lg"
            radius="md"
            variant="subtle"
            color="gray"
            aria-label={isCollapsed ? "Expandir espacios" : "Colapsar espacios"}
            onClick={onToggleCollapsed}
          >
            {isCollapsed ? (
              <CaretRightIcon size={18} />
            ) : (
              <CaretLeftIcon size={18} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>

      <Stack
        gap={4}
        className={`min-h-0 flex-1 p-2 ${isCollapsed ? "overflow-hidden" : "overflow-auto"}`}
      >
        {spaces.map((space) => {
          const isActive = space.id === activeSpaceId;
          const icon = (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-md border"
              style={{
                backgroundColor: `${space.color}1f`,
                borderColor: isActive ? space.color : "#eaecf0",
                color: space.color === "#ffffff" ? "#344054" : space.color,
              }}
            >
              <PhosphorIcon name={space.icon} size={18} weight="duotone" />
            </span>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={space.id} label={space.name} position="right">
                <button
                  type="button"
                  className={`grid h-10 w-10 place-items-center rounded-md transition-colors ${
                    isActive ? "bg-[#f2f4f7]" : "hover:bg-[#f9fafb]"
                  }`}
                  onClick={() => onSelectSpace(space.id)}
                  aria-label={space.name}
                >
                  {icon}
                </button>
              </Tooltip>
            );
          }

          return (
            <div
              key={space.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                isActive ? "bg-[#f2f4f7]" : "hover:bg-[#f9fafb]"
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => onSelectSpace(space.id)}
              >
                {icon}
                <span className="min-w-0">
                  <Text size="sm" fw={700} className="truncate text-[#1d2939]">
                    {space.name}
                  </Text>
                  <Text size="xs" className="truncate text-[#667085]">
                    {space.board.items.length} elementos
                  </Text>
                </span>
              </button>

              <Menu
                width={252}
                position="right-start"
                shadow="md"
                closeOnItemClick={false}
              >
                <Menu.Target>
                  <ActionIcon
                    size="md"
                    radius="md"
                    variant="subtle"
                    color="gray"
                    aria-label={`Configurar ${space.name}`}
                  >
                    <DotsThreeVerticalIcon size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <SpaceMenuContent
                    space={space}
                    onDelete={() => onDeleteSpace(space.id)}
                    onUpdate={(patch) => onUpdateSpace(space.id, patch)}
                  />
                </Menu.Dropdown>
              </Menu>
            </div>
          );
        })}
      </Stack>

      <div className="border-t border-[#eaecf0] p-2">
        <Tooltip label="Agregar espacio" position={isCollapsed ? "right" : "top"}>
          <button
            type="button"
            className={`flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#cfd4dc] text-sm font-semibold text-[#344054] transition-colors hover:bg-[#f9fafb] ${
              isCollapsed ? "px-0" : "px-3"
            }`}
            onClick={onAddSpace}
          >
            <PlusIcon size={18} />
            {isCollapsed ? null : <span>Nuevo espacio</span>}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
