import {
  CloseButton,
  Group,
  Paper,
  Portal,
  Stack,
  Text,
} from "@mantine/core";
import { useFloatingWindow } from "@mantine/hooks";
import {
  CalendarBlankIcon,
  DotsSixVerticalIcon,
  FolderSimpleIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  TextTIcon,
} from "@phosphor-icons/react";

import { getBrandIconId } from "../icons/brandIconData";
import type { BoardItemDisplay, BoardItemType } from "../model/boardItems";
import { PopularSitesList } from "./PopularSitesList";
import { RecentHistoryList } from "./RecentHistoryList";

const elementOptions = [
  { id: "link", value: "link", label: "Link", icon: LinkSimpleIcon },
  {
    id: "group-cards",
    value: "group",
    label: "Grupo de cards",
    icon: FolderSimpleIcon,
    display: { variant: "group-grid" },
  },
  {
    id: "group-icons",
    value: "group",
    label: "Grupo de íconos",
    icon: FolderSimpleIcon,
    display: { variant: "group-icons" },
  },
  { id: "title", value: "title", label: "Título", icon: TextTIcon },
  { id: "date", value: "date", label: "Fecha", icon: CalendarBlankIcon },
  { id: "search", value: "search", label: "Búsqueda", icon: MagnifyingGlassIcon },
] satisfies Array<{
  id: string;
  value: BoardItemType;
  label: string;
  icon: typeof LinkSimpleIcon;
  display?: Partial<BoardItemDisplay>;
}>;

type AddElementWindowProps = {
  opened: boolean;
  onAdd: (
    type: BoardItemType,
    values?: {
      display?: Partial<BoardItemDisplay>;
      title?: string;
      url?: string;
    },
  ) => void;
  onClose: () => void;
};

export function AddElementWindow({
  opened,
  onAdd,
  onClose,
}: AddElementWindowProps) {
  const { ref: setFloatingWindowRef } = useFloatingWindow<HTMLDivElement>({
    constrainToViewport: true,
    constrainOffset: 12,
    dragHandleSelector: "[data-add-element-drag-handle]",
    excludeDragHandleSelector: "button,[data-no-drag]",
    initialPosition: { right: 18, top: 72 },
  });

  if (!opened) {
    return null;
  }

  return (
    <Portal>
      <Paper
        ref={setFloatingWindowRef}
        withBorder
        radius="md"
        shadow="lg"
        className="w-115 overflow-hidden bg-white"
        style={{
          maxHeight: "calc(100vh - 24px)",
          position: "fixed",
          zIndex: 410,
        }}
      >
        <Group
          justify="space-between"
          wrap="nowrap"
          className="border-b border-[#eaecf0] bg-[#f9fafb] px-3 py-2"
          data-add-element-drag-handle
        >
          <Group gap={6} wrap="nowrap" className="min-w-0 cursor-move">
            <DotsSixVerticalIcon
              size={18}
              className="shrink-0 text-[#98a2b3]"
            />
            <Text size="xs" fw={700} className="truncate text-[#344054]">
              Agregar
            </Text>
          </Group>
          <CloseButton
            size="sm"
            aria-label="Cerrar elementos"
            data-no-drag
            onClick={onClose}
          />
        </Group>

        <Stack gap="md" className="max-h-[calc(100vh-78px)] overflow-auto p-3">
          <div className="grid grid-cols-3 gap-2">
            {elementOptions.map((option) => {
              const Icon = option.icon;

              return (
                <button
                  key={option.id}
                  type="button"
                  className="grid min-h-20 place-items-center gap-2 rounded-md border border-[#d0d5dd] bg-white px-2 py-2 text-center text-[#344054] transition-colors hover:bg-[#f9fafb]"
                  onClick={() =>
                    onAdd(option.value, { display: option.display })
                  }
                >
                  <Icon size={22} />
                  <Text size="xs" fw={700}>{option.label}</Text>
                </button>
              );
            })}
          </div>

          <PopularSitesList
            onSelect={(site) =>
              onAdd("link", {
                display: { linkIcon: getBrandIconId(site.id) },
                title: site.name,
                url: site.url,
              })
            }
          />

          <RecentHistoryList
            onSelect={(historyItem, icon) =>
              onAdd("link", {
                display: { linkIcon: icon },
                title: historyItem.title,
                url: historyItem.url,
              })
            }
          />
        </Stack>
      </Paper>
    </Portal>
  );
}
