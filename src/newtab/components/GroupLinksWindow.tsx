import { useMemo, useState } from "react";
import {
  ActionIcon,
  Button,
  CloseButton,
  Group,
  Paper,
  Portal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useFloatingWindow } from "@mantine/hooks";
import {
  CheckIcon,
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { BrandIcon } from "../icons/BrandIcon";
import {
  getBrandIconId,
  getPopularSiteByIcon,
  popularSites,
} from "../icons/brandIconData";

import type { GroupItem, LinkItem } from "../model/boardItems";
import {
  getItemDisplay,
  getNavigableUrlError,
  normalizeUrl,
  parseNavigableUrl,
} from "../model/boardItems";
import {
  normalizePhosphorIconName,
  PhosphorIcon,
  phosphorIconOptions,
} from "../icons/phosphorIcons";
import {
  getSiteFaviconIconId,
  getSiteFaviconPageUrl,
  requestSiteFaviconPermission,
} from "../icons/siteFavicon";
import { RecentHistoryList } from "./RecentHistoryList";
import { PopularSitesList } from "./PopularSitesList";

type GroupLinksWindowProps = {
  item?: GroupItem;
  opened: boolean;
  onAddGroupLink: (
    groupId: string,
    values: { linkIcon?: string; title: string; url: string },
  ) => void;
  onClose: () => void;
  onRemoveGroupLink: (groupId: string, linkId: string) => void;
  onUpdateGroupLink: (
    groupId: string,
    linkId: string,
    patch: { title?: string; url?: string },
  ) => void;
  onUpdateGroupLinkIcon: (
    groupId: string,
    linkId: string,
    linkIcon: string,
  ) => void;
};

export function GroupLinksWindow({
  item,
  opened,
  onAddGroupLink,
  onClose,
  onRemoveGroupLink,
  onUpdateGroupLink,
  onUpdateGroupLinkIcon,
}: GroupLinksWindowProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [newLinkIcon, setNewLinkIcon] = useState("LinkSimpleIcon");
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [openIconSelectorId, setOpenIconSelectorId] = useState<string | null>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [visibleIconCount, setVisibleIconCount] = useState(60);
  const { ref: setFloatingWindowRef } = useFloatingWindow<HTMLDivElement>({
    constrainToViewport: true,
    constrainOffset: 12,
    dragHandleSelector: "[data-group-links-drag-handle]",
    excludeDragHandleSelector: "button,input,textarea,select,[data-no-drag]",
    initialPosition: { right: 372, top: 126 },
  });

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

  if (!opened || !item) {
    return null;
  }

  function addLink() {
    const nextTitle = title.trim();
    const parsedUrl = parseNavigableUrl(url);

    if (!item || !nextTitle || !parsedUrl.ok) {
      return;
    }

    onAddGroupLink(item.id, {
      linkIcon: newLinkIcon,
      title: nextTitle,
      url: parsedUrl.url,
    });
    setTitle("");
    setUrl("");
  }

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

  function renderIconSelector({
    currentIcon,
    id,
    onSelect,
    siteUrl,
  }: {
    currentIcon: string;
    id: string;
    onSelect: (icon: string) => void;
    siteUrl: string;
  }) {
    const selectedFaviconUrl = getSiteFaviconPageUrl(currentIcon);
    const selectedPopularSite = getPopularSiteByIcon(currentIcon);
    const normalizedIcon = selectedFaviconUrl
      ? currentIcon
      : selectedPopularSite
        ? getBrandIconId(selectedPopularSite.id)
        : normalizePhosphorIconName(currentIcon);
    const selectedLabel =
      selectedFaviconUrl
        ? "Icono del sitio"
        : selectedPopularSite?.name ??
          phosphorIconOptions.find((option) => option.value === normalizedIcon)
            ?.label ?? normalizedIcon;
    const isOpen = openIconSelectorId === id;

    return (
      <Stack gap={6}>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-[#d0d5dd] bg-white px-2.5 py-2 text-left text-xs text-[#344054] transition-colors hover:bg-[#f9fafb]"
          onClick={() => {
            setIconQuery("");
            setVisibleIconCount(60);
            setOpenIconSelectorId((current) => (current === id ? null : id));
          }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#f2f4f7] text-[#1d2939]">
              <BrandIcon name={normalizedIcon} size={18} />
            </span>
            <span className="truncate">{selectedLabel}</span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-[#667085]">
            {isOpen ? "Cerrar" : "Cambiar"}
          </span>
        </button>

        {isOpen ? (
          <Stack gap={6}>
            <button
              type="button"
              disabled={!siteUrl.trim()}
              className="flex w-full items-center gap-2 rounded-md border border-[#d0d5dd] bg-white px-2.5 py-2 text-left text-xs font-semibold text-[#344054] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                void requestSiteFaviconPermission().then((granted) => {
                  if (granted) {
                    onSelect(getSiteFaviconIconId(siteUrl));
                    setOpenIconSelectorId(null);
                  }
                });
              }}
            >
              <BrandIcon
                name={siteUrl ? getSiteFaviconIconId(siteUrl) : undefined}
                size={18}
              />
              Usar icono del sitio
            </button>
            <div className="grid grid-cols-4 gap-1 rounded-md border border-[#d0d5dd] bg-[#f9fafb] p-1">
              {popularSites.map((site) => {
                const brandIconId = getBrandIconId(site.id);
                const isSelected = normalizedIcon === brandIconId;

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
                      onSelect(brandIconId);
                      setOpenIconSelectorId(null);
                    }}
                  >
                    <BrandIcon name={brandIconId} size={18} />
                  </ActionIcon>
                );
              })}
            </div>
            <TextInput
              size="xs"
              placeholder="Buscar ícono"
              value={iconQuery}
              onChange={(event) => updateIconQuery(event.currentTarget.value)}
            />
            <div
              className="max-h-44 overflow-auto rounded-md border border-[#d0d5dd] bg-[#f9fafb] p-1"
              onScroll={loadMoreIcons}
            >
              <div className="grid grid-cols-5 gap-1">
                {visibleIconOptions.map((option) => {
                  const isSelected = normalizedIcon === option.value;

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
                        onSelect(option.value);
                        setOpenIconSelectorId(null);
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
    );
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
          data-group-links-drag-handle
        >
          <Group gap={6} wrap="nowrap" className="min-w-0 cursor-move">
            <DotsSixVerticalIcon size={18} className="shrink-0 text-[#98a2b3]" />
            <Text size="xs" fw={700} className="truncate text-[#344054]">
              Links de {item.title}
            </Text>
          </Group>
          <CloseButton
            size="sm"
            aria-label="Cerrar links del grupo"
            data-no-drag
            onClick={onClose}
          />
        </Group>

        <Stack gap="md" className="max-h-[calc(100vh-78px)] overflow-auto p-3">
          {item.links.length > 0 ? (
            <Stack gap={6}>
              {item.links.map((link: LinkItem) => (
                <Stack
                  key={link.id}
                  gap={6}
                  className="rounded-md border border-[#eaecf0] p-2"
                >
                  <Group gap={6} wrap="nowrap" align="flex-start">
                    <ActionIcon variant="light" color="gray" size="sm" radius="md">
                      <BrandIcon
                        name={getItemDisplay(link).linkIcon}
                        size={14}
                      />
                    </ActionIcon>
                    {editingLinkId === link.id ? (
                      <Stack gap={6} className="min-w-0 flex-1">
                        <TextInput
                          label="Nombre"
                          size="xs"
                          value={link.title}
                          onChange={(event) =>
                            onUpdateGroupLink(item.id, link.id, {
                              title: event.currentTarget.value,
                            })
                          }
                        />
                        <TextInput
                          label="URL"
                          size="xs"
                          value={link.url}
                          onChange={(event) =>
                            onUpdateGroupLink(item.id, link.id, {
                              url: event.currentTarget.value,
                            })
                          }
                          onBlur={(event) =>
                            parseNavigableUrl(event.currentTarget.value).ok
                              ? onUpdateGroupLink(item.id, link.id, {
                                  url: normalizeUrl(event.currentTarget.value),
                                })
                              : undefined
                          }
                          error={getNavigableUrlError(link.url)}
                        />
                      </Stack>
                    ) : (
                      <Stack gap={1} className="min-w-0 flex-1 py-0.5">
                        <Text size="xs" fw={700} className="truncate text-[#344054]">
                          {link.title || "Sin nombre"}
                        </Text>
                        <Text size="xs" className="truncate text-[#98a2b3]">
                          {link.url || "Sin URL"}
                        </Text>
                      </Stack>
                    )}
                    <ActionIcon
                      variant={editingLinkId === link.id ? "light" : "subtle"}
                      color="gray"
                      size="sm"
                      radius="md"
                      aria-label={
                        editingLinkId === link.id
                          ? `Terminar de editar ${link.title}`
                          : `Editar ${link.title}`
                      }
                      title={editingLinkId === link.id ? "Terminar" : "Editar"}
                      onClick={() => {
                        setOpenIconSelectorId(null);
                        setEditingLinkId((current) =>
                          current === link.id ? null : link.id,
                        );
                      }}
                    >
                      {editingLinkId === link.id ? (
                        <CheckIcon size={14} />
                      ) : (
                        <PencilSimpleIcon size={14} />
                      )}
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      radius="md"
                      aria-label={`Eliminar ${link.title}`}
                      onClick={() => {
                        if (editingLinkId === link.id) {
                          setEditingLinkId(null);
                          setOpenIconSelectorId(null);
                        }
                        onRemoveGroupLink(item.id, link.id);
                      }}
                    >
                      <TrashIcon size={14} />
                    </ActionIcon>
                  </Group>
                  {editingLinkId === link.id
                    ? renderIconSelector({
                        currentIcon: getItemDisplay(link).linkIcon,
                        id: link.id,
                        siteUrl: link.url,
                        onSelect: (icon) =>
                          onUpdateGroupLinkIcon(item.id, link.id, icon),
                      })
                    : null}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Text size="xs" className="text-[#98a2b3]">
              Sin links todavía
            </Text>
          )}

          <Stack gap={8}>
            <Group grow align="end">
              <TextInput
                label="Nombre"
                size="xs"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
              <TextInput
                label="URL"
                size="xs"
                value={url}
                onChange={(event) => setUrl(event.currentTarget.value)}
                onBlur={(event) => {
                  const result = parseNavigableUrl(event.currentTarget.value);
                  if (result.ok) setUrl(result.url);
                }}
                error={
                  url ? getNavigableUrlError(url) : undefined
                }
              />
            </Group>
            <PopularSitesList
              onSelect={(site) =>
                onAddGroupLink(item.id, {
                  linkIcon: getBrandIconId(site.id),
                  title: site.name,
                  url: site.url,
                })
              }
            />
            <RecentHistoryList
              onSelect={(historyItem, icon) =>
                onAddGroupLink(item.id, {
                  linkIcon: icon,
                  title: historyItem.title,
                  url: historyItem.url,
                })
              }
            />
            {renderIconSelector({
              currentIcon: newLinkIcon,
              id: "new-link",
              siteUrl: url,
              onSelect: setNewLinkIcon,
            })}
            <Button
              color="dark"
              size="xs"
              leftSection={<PlusIcon size={14} />}
              disabled={!title.trim() || !parseNavigableUrl(url).ok}
              onClick={addLink}
            >
              Agregar link
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Portal>
  );
}
