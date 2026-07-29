import type { ChangeEvent } from "react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys, useViewportSize } from "@mantine/hooks";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { BoardItem } from "./components/BoardItem";
import { BoardToolbar } from "./components/BoardToolbar";
import { EmptyBoard } from "./components/EmptyBoard";
import { SpacesSidebar } from "./components/SpacesSidebar";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clampItemLayout,
  clampLayout,
  cloneBoardItem,
  copyBoard,
  createBoardItem,
  createLink,
  getItemMaxHeight,
  getItemStyle,
  getAnchoredXFromLeft,
  getAnchoredYFromTop,
  getLayoutAnchorX,
  getLayoutAnchorY,
  getNextLayout,
  getViewportLeft,
  getViewportTop,
  reanchorLayout,
  type BoardItem as BoardItemData,
  type BoardItemType,
  type BoardItemDisplay,
  type BoardItemStyle,
  type BoardLayout,
  type SearchEngineId,
} from "./model/boardItems";
import { useWallpapers, type WallpaperExportData } from "./hooks/useSessionWallpaper";
import {
  createBoardSpace,
  parseImportedBoard,
  workspaceStorage,
  type BoardBackgroundMode,
  type BoardSpace,
} from "./storage/boardStorage";
import {
  getComponentTheme,
  isComponentThemeId,
  type ComponentThemeId,
} from "./themes/componentThemes";

const AddElementWindow = lazy(() =>
  import("./components/AddElementWindow").then((module) => ({
    default: module.AddElementWindow,
  })),
);
const ComponentThemeWindow = lazy(() =>
  import("./components/ComponentThemeWindow").then((module) => ({
    default: module.ComponentThemeWindow,
  })),
);
const GroupLinksWindow = lazy(() =>
  import("./components/GroupLinksWindow").then((module) => ({
    default: module.GroupLinksWindow,
  })),
);
const ItemConfigWindow = lazy(() =>
  import("./components/ItemConfigWindow").then((module) => ({
    default: module.ItemConfigWindow,
  })),
);
const WallpaperWindow = lazy(() =>
  import("./components/WallpaperWindow").then((module) => ({
    default: module.WallpaperWindow,
  })),
);
const TabIconWindow = lazy(() =>
  import("./components/TabIconWindow").then((module) => ({
    default: module.TabIconWindow,
  })),
);

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const defaultElementValues = {
  date: { title: "Hoy", url: "" },
  group: { title: "Grupo", url: "" },
  link: { title: "Nuevo link", url: "https://example.com" },
  search: { title: "Buscar", url: "", placeholder: "Buscar en la web" },
  title: { title: "Título", url: "" },
} satisfies Record<
  BoardItemType,
  { placeholder?: string; title: string; url: string }
>;

type FloatingWindowState =
  | "add"
  | "config"
  | "group-links"
  | "themes"
  | "tab-icon"
  | "title-design"
  | "wallpapers"
  | null;

type BoardImportPayload = {
  board: unknown;
  componentTheme?: {
    themeId?: unknown;
  };
  wallpapers?: WallpaperExportData;
};

const defaultBackgroundColor = "#f1f3f5";
const defaultBackgroundMode: BoardBackgroundMode = "image-rotating";
const tabIconStorageKey = "clean-new-tab:tab-icon:v1";
const tabTitleStorageKey = "clean-new-tab:tab-title:v1";
const defaultTabTitle = "Nueva pestaña";

function loadTabIcon() {
  try {
    return window.localStorage.getItem(tabIconStorageKey);
  } catch {
    return null;
  }
}

function loadTabTitle() {
  try {
    return window.localStorage.getItem(tabTitleStorageKey) ?? defaultTabTitle;
  } catch {
    return defaultTabTitle;
  }
}

function shouldFitHeightForStyleChange(
  item: BoardItemData,
  stylePatch: Partial<BoardItemStyle>,
) {
  const currentStyle = getItemStyle(item);
  const nextStyle = { ...currentStyle, ...stylePatch };
  const changedKeys = (Object.keys(nextStyle) as Array<keyof BoardItemStyle>).filter(
    (key) => currentStyle[key] !== nextStyle[key],
  );

  if (changedKeys.length === 0) {
    return false;
  }

  const isOnlyFontSizeLockChange =
    currentStyle.fontSizeLocked !== nextStyle.fontSizeLocked &&
    changedKeys.every((key) => key === "fontSize" || key === "fontSizeLocked");

  return !isOnlyFontSizeLockChange;
}

export function NewTab() {
  const { setColorScheme } = useMantineColorScheme({ keepTransitions: true });
  const colorScheme = useComputedColorScheme("light");
  const [workspace, setWorkspace] = useState(() => workspaceStorage.load());
  const [tabIcon, setTabIcon] = useState<string | null>(loadTabIcon);
  const [tabTitle, setTabTitle] = useState(loadTabTitle);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const activeSpace =
    workspace.spaces.find((space) => space.id === workspace.activeSpaceId) ??
    workspace.spaces[0];
  const [draftBoard, setDraftBoard] = useState(() =>
    copyBoard(activeSpace.board),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [floatingWindow, setFloatingWindow] =
    useState<FloatingWindowState>(null);
  const [currentWallpaperBySpace, setCurrentWallpaperBySpace] = useState<
    Record<string, string | null>
  >(() => {
    const selectedIds = activeSpace.wallpaperIds ?? [];
    const selectedId =
      activeSpace.backgroundMode === "image-fixed"
        ? selectedIds[0]
        : selectedIds[Math.floor(Math.random() * selectedIds.length)];

    return { [activeSpace.id]: selectedId ?? null };
  });
  const importInputRef = useRef<HTMLInputElement>(null);
  const copiedItemRef = useRef<BoardItemData | null>(null);
  const today = useMemo(() => dateFormatter.format(new Date()), []);
  const currentPriorityWallpaperId = currentWallpaperBySpace[activeSpace.id];
  const priorityWallpaperIds = currentPriorityWallpaperId
    ? [currentPriorityWallpaperId]
    : activeSpace.wallpaperIds?.slice(0, 1);
  const {
    addWallpaper,
    defaultSelectedIds,
    exportWallpapers,
    getWallpaperSource,
    importWallpapers,
    pickWallpaperId,
    removeWallpaper,
    wallpapers,
  } = useWallpapers(
    priorityWallpaperIds,
    floatingWindow === "wallpapers",
  );
  const viewport = useViewportSize();
  const activeBoard = isEditing ? draftBoard : activeSpace.board;
  const componentThemeId = activeSpace.componentThemeId ?? "clean";
  const componentTheme = useMemo(
    () => getComponentTheme(componentThemeId, colorScheme),
    [colorScheme, componentThemeId],
  );
  const backgroundMode = activeSpace.backgroundMode ?? defaultBackgroundMode;
  const backgroundColor = activeSpace.backgroundColor ?? defaultBackgroundColor;
  const selectedWallpaperIds = activeSpace.wallpaperIds ?? defaultSelectedIds;
  const currentWallpaperId = currentWallpaperBySpace[activeSpace.id] ?? null;
  const targetWallpaperId =
    backgroundMode === "image-rotating"
      ? currentWallpaperId
      : selectedWallpaperIds[0];
  const wallpaperAverageColor = wallpapers.find(
    (item) => item.id === targetWallpaperId,
  )?.averageColor;
  const wallpaper = getWallpaperSource(
    selectedWallpaperIds,
    targetWallpaperId,
  );

  useEffect(() => {
    workspaceStorage.save(workspace);
  }, [workspace]);

  useEffect(() => {
    let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.rel = "icon";
      document.head.append(iconLink);
    }

    iconLink.href =
      tabIcon === ""
        ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
        : tabIcon ?? "/favicon.svg";
  }, [tabIcon]);

  useEffect(() => {
    document.title = tabTitle.trim() || defaultTabTitle;
  }, [tabTitle]);

  useEffect(() => {
    const root = document.documentElement;
    const style = componentTheme.style;
    const themeVariables = {
      "--ui-accent": style.searchButtonBackgroundColor,
      "--ui-accent-text": style.searchButtonTextColor,
      "--ui-border": style.borderColor,
      "--ui-surface": style.backgroundColor,
      "--ui-surface-image": style.backgroundImage ?? "none",
      "--ui-surface-muted": style.searchInputBackgroundColor,
      "--ui-text": style.textColor,
      "--ui-text-strong": style.textColor,
    } as const;

    root.dataset.componentTheme = componentTheme.id;
    Object.entries(themeVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    return () => {
      delete root.dataset.componentTheme;
      Object.keys(themeVariables).forEach((property) => {
        root.style.removeProperty(property);
      });
    };
  }, [componentTheme]);

  const selectedConfigItem =
    selectedItemId != null
      ? activeBoard.items.find((item) => item.id === selectedItemId)
      : undefined;
  const selectedGroupItem =
    selectedConfigItem?.type === "group" ? selectedConfigItem : undefined;

  const viewportWidth = viewport.width || CANVAS_WIDTH;
  const viewportHeight = viewport.height || CANVAS_HEIGHT;
  const canvasHeight = Math.max(
    CANVAS_HEIGHT,
    ...activeBoard.items.map(
      (item) => getViewportTop(item.layout, viewportHeight) + item.layout.height + 32,
    ),
  );

  function startEditing() {
    setDraftBoard(copyBoard(activeSpace.board));
    setIsEditing(true);
    setSelectedItemId(null);
    setFloatingWindow(null);
  }

  function saveEditing() {
    const nextBoard = copyBoard(draftBoard);

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      spaces: currentWorkspace.spaces.map((space) =>
        space.id === currentWorkspace.activeSpaceId
          ? { ...space, board: nextBoard }
          : space,
      ),
    }));
    setIsEditing(false);
    setSelectedItemId(null);
    setFloatingWindow(null);
  }

  function cancelEditing() {
    setDraftBoard(copyBoard(activeSpace.board));
    setIsEditing(false);
    setSelectedItemId(null);
    setFloatingWindow(null);
  }

  function closeEditingState() {
    setIsEditing(false);
    setSelectedItemId(null);
    setFloatingWindow(null);
  }

  function selectSpace(spaceId: string) {
    if (spaceId === workspace.activeSpaceId) {
      return;
    }

    if (
      isEditing &&
      !window.confirm("Hay cambios sin guardar. ¿Cambiar de espacio y descartarlos?")
    ) {
      return;
    }

    const nextSpace = workspace.spaces.find((space) => space.id === spaceId);

    if (!nextSpace) {
      return;
    }

    setCurrentWallpaperBySpace((currentValue) => {
      const nextSelectedIds = nextSpace.wallpaperIds ?? defaultSelectedIds;

      if (
        currentValue[nextSpace.id] &&
        nextSelectedIds.includes(currentValue[nextSpace.id] ?? "")
      ) {
        return currentValue;
      }

      return {
        ...currentValue,
        [nextSpace.id]: pickWallpaperId(nextSelectedIds),
      };
    });
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      activeSpaceId: spaceId,
    }));
    setDraftBoard(copyBoard(nextSpace.board));
    closeEditingState();
  }

  function addSpace() {
    if (
      isEditing &&
      !window.confirm("Hay cambios sin guardar. ¿Crear un espacio y descartarlos?")
    ) {
      return;
    }

    const spaceNumber = workspace.spaces.length + 1;
    const nextSpace = createBoardSpace({
      name: `Espacio ${spaceNumber}`,
      icon: "SquaresFourIcon",
      color: "#12b886",
      backgroundColor: defaultBackgroundColor,
      backgroundMode: defaultBackgroundMode,
      wallpaperIds: defaultSelectedIds,
    });

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      activeSpaceId: nextSpace.id,
      spaces: [...currentWorkspace.spaces, nextSpace],
    }));
    setCurrentWallpaperBySpace((currentValue) => ({
      ...currentValue,
      [nextSpace.id]: pickWallpaperId(nextSpace.wallpaperIds),
    }));
    setDraftBoard(copyBoard(nextSpace.board));
    closeEditingState();
  }

  function updateSpace(
    spaceId: string,
    patch: Pick<Partial<BoardSpace>, "color" | "icon" | "name">,
  ) {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      spaces: currentWorkspace.spaces.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              color:
                patch.color !== undefined
                  ? patch.color.trim() || space.color
                  : space.color,
              icon:
                patch.icon !== undefined
                  ? patch.icon.trim() || space.icon
                  : space.icon,
              name: patch.name !== undefined ? patch.name : space.name,
            }
          : space,
      ),
    }));
  }

  function deleteSpace(spaceId: string) {
    if (workspace.spaces.length <= 1) {
      window.alert("Debe quedar al menos un espacio.");
      return;
    }

    const space = workspace.spaces.find((currentSpace) => currentSpace.id === spaceId);

    if (!space) {
      return;
    }

    if (!window.confirm(`¿Eliminar "${space.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setWorkspace((currentWorkspace) => {
      const nextSpaces = currentWorkspace.spaces.filter(
        (currentSpace) => currentSpace.id !== spaceId,
      );
      const activeSpaceId =
        currentWorkspace.activeSpaceId === spaceId
          ? nextSpaces[0].id
          : currentWorkspace.activeSpaceId;
      const nextActiveSpace =
        nextSpaces.find((currentSpace) => currentSpace.id === activeSpaceId) ??
        nextSpaces[0];

      setDraftBoard(copyBoard(nextActiveSpace.board));

      return {
        ...currentWorkspace,
        activeSpaceId,
        spaces: nextSpaces,
      };
    });
    closeEditingState();
  }

  function updateActiveSpaceWallpaperIds(nextWallpaperIds: string[]) {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      spaces: currentWorkspace.spaces.map((space) =>
        space.id === currentWorkspace.activeSpaceId
          ? { ...space, wallpaperIds: nextWallpaperIds }
          : space,
      ),
    }));
  }

  function updateActiveSpaceBackground(
    patch: Pick<Partial<BoardSpace>, "backgroundColor" | "backgroundMode" | "wallpaperIds">,
  ) {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      spaces: currentWorkspace.spaces.map((space) =>
        space.id === currentWorkspace.activeSpaceId
          ? {
              ...space,
              backgroundColor:
                patch.backgroundColor !== undefined
                  ? patch.backgroundColor.trim() || defaultBackgroundColor
                  : space.backgroundColor,
              backgroundMode: patch.backgroundMode ?? space.backgroundMode,
              wallpaperIds: patch.wallpaperIds ?? space.wallpaperIds,
            }
          : space,
      ),
    }));
  }

  function updateActiveSpaceComponentTheme(themeId: ComponentThemeId) {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      spaces: currentWorkspace.spaces.map((space) =>
        space.id === currentWorkspace.activeSpaceId
          ? {
              ...space,
              componentThemeId: themeId,
            }
          : space,
      ),
    }));
  }

  function updateTabIcon(iconSource: string | null) {
    try {
      if (iconSource !== null) {
        window.localStorage.setItem(tabIconStorageKey, iconSource);
      } else {
        window.localStorage.removeItem(tabIconStorageKey);
      }

      setTabIcon(iconSource);
      return true;
    } catch {
      return false;
    }
  }

  function updateTabTitle(title: string) {
    try {
      if (title.trim() && title !== defaultTabTitle) {
        window.localStorage.setItem(tabTitleStorageKey, title);
      } else {
        window.localStorage.removeItem(tabTitleStorageKey);
      }

      setTabTitle(title);
      return true;
    } catch {
      return false;
    }
  }

  async function addWallpaperToActiveSpace(file: File) {
    const result = await addWallpaper(file);

    if (result.ok && result.wallpaperId) {
      const nextWallpaperIds = Array.from(
        new Set(
          backgroundMode === "image-fixed"
            ? [result.wallpaperId]
            : [...selectedWallpaperIds, result.wallpaperId],
        ),
      );

      updateActiveSpaceBackground({
        backgroundMode: backgroundMode === "color-fixed" ? "image-fixed" : backgroundMode,
        wallpaperIds: nextWallpaperIds,
      });
      setCurrentWallpaperBySpace((currentValue) => ({
        ...currentValue,
        [activeSpace.id]: result.wallpaperId ?? null,
      }));
    }

    return result;
  }

  function toggleActiveSpaceWallpaper(wallpaperId: string) {
    if (backgroundMode === "image-fixed") {
      updateActiveSpaceWallpaperIds([wallpaperId]);
      setCurrentWallpaperBySpace((currentValue) => ({
        ...currentValue,
        [activeSpace.id]: wallpaperId,
      }));
      return true;
    }

    const isSelected = selectedWallpaperIds.includes(wallpaperId);

    if (isSelected && selectedWallpaperIds.length === 1) {
      return false;
    }

    const nextWallpaperIds = isSelected
      ? selectedWallpaperIds.filter((id) => id !== wallpaperId)
      : [...selectedWallpaperIds, wallpaperId];

    updateActiveSpaceWallpaperIds(nextWallpaperIds);

    if (isSelected && currentWallpaperId === wallpaperId) {
      setCurrentWallpaperBySpace((currentValue) => ({
        ...currentValue,
        [activeSpace.id]: pickWallpaperId(nextWallpaperIds),
      }));
    }

    return true;
  }

  function updateActiveSpaceBackgroundMode(nextMode: BoardBackgroundMode) {
    const firstWallpaperId = selectedWallpaperIds[0] ?? defaultSelectedIds[0];
    const nextWallpaperIds =
      nextMode === "image-fixed" ? [firstWallpaperId] : selectedWallpaperIds;

    updateActiveSpaceBackground({
      backgroundMode: nextMode,
      wallpaperIds: nextWallpaperIds,
    });

    if (nextMode === "image-fixed") {
      setCurrentWallpaperBySpace((currentValue) => ({
        ...currentValue,
        [activeSpace.id]: firstWallpaperId,
      }));
    }

    if (nextMode === "image-rotating") {
      setCurrentWallpaperBySpace((currentValue) => ({
        ...currentValue,
        [activeSpace.id]: pickWallpaperId(nextWallpaperIds),
      }));
    }
  }

  function removeWallpaperFromLibrary(wallpaperId: string) {
    if (!removeWallpaper(wallpaperId)) {
      return false;
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      spaces: currentWorkspace.spaces.map((space) => {
        if (!space.wallpaperIds?.includes(wallpaperId)) {
          return space;
        }

        const nextWallpaperIds = space.wallpaperIds.filter((id) => id !== wallpaperId);

        return {
          ...space,
          wallpaperIds: nextWallpaperIds.length > 0 ? nextWallpaperIds : defaultSelectedIds,
        };
      }),
    }));
    setCurrentWallpaperBySpace((currentValue) => {
      const nextValue = { ...currentValue };

      Object.entries(nextValue).forEach(([spaceId, selectedWallpaperId]) => {
        if (selectedWallpaperId === wallpaperId) {
          nextValue[spaceId] = null;
        }
      });

      return nextValue;
    });

    return true;
  }

  async function exportBoard() {
    const boardToExport = copyBoard(activeBoard);
    const exportData = {
      board: boardToExport,
      componentTheme: {
        themeId: componentThemeId,
      },
      version: 2,
      wallpapers: await exportWallpapers(selectedWallpaperIds, {
        backgroundColor,
        backgroundMode,
      }),
    };
    const file = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `new-tab-board-${date}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function requestImportBoard() {
    importInputRef.current?.click();
  }

  function importBoard(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      void (async () => {
        const rawImport = String(reader.result ?? "");
        let importedComponentTheme: BoardImportPayload["componentTheme"];
        let importedWallpapers: unknown;
        let importedBoard = parseImportedBoard(rawImport);

        if (!importedBoard) {
          try {
            const payload = JSON.parse(rawImport) as Partial<BoardImportPayload>;

            if (payload && typeof payload === "object" && "board" in payload) {
              importedBoard = parseImportedBoard(JSON.stringify(payload.board));
              importedComponentTheme = payload.componentTheme;
              importedWallpapers = payload.wallpapers;
            }
          } catch {
            importedBoard = null;
          }
        }

        if (!importedBoard) {
          window.alert("No se pudo importar el tablero. Revisa que sea un JSON válido.");
          return;
        }

        const wallpaperImportResult = await importWallpapers(importedWallpapers);

        if (!wallpaperImportResult.ok) {
          window.alert(wallpaperImportResult.message ?? "No se pudieron importar los fondos.");
          return;
        }

        const nextBoard = copyBoard(importedBoard);

        setWorkspace((currentWorkspace) => ({
          ...currentWorkspace,
          spaces: currentWorkspace.spaces.map((space) =>
            space.id === currentWorkspace.activeSpaceId
              ? {
                  ...space,
                  backgroundColor:
                    wallpaperImportResult.backgroundColor ?? space.backgroundColor,
                  backgroundMode:
                    wallpaperImportResult.backgroundMode ?? space.backgroundMode,
                  board: nextBoard,
                  componentThemeId:
                    isComponentThemeId(importedComponentTheme?.themeId)
                      ? importedComponentTheme.themeId
                      : space.componentThemeId,
                  wallpaperIds: wallpaperImportResult.selectedIds ?? space.wallpaperIds,
                }
              : space,
          ),
        }));
        if (wallpaperImportResult.selectedIds) {
          setCurrentWallpaperBySpace((currentValue) => ({
            ...currentValue,
            [activeSpace.id]: pickWallpaperId(wallpaperImportResult.selectedIds),
          }));
        }
        setDraftBoard(copyBoard(nextBoard));
        setIsEditing(false);
        setSelectedItemId(null);
        setFloatingWindow(null);
      })();
    };

    reader.readAsText(file);
  }

  function addItem(
    type: BoardItemType,
    values?: {
      display?: Partial<BoardItemDisplay>;
      title?: string;
      url?: string;
    },
  ) {
    let nextItemId: string | null = null;

    setDraftBoard((currentBoard) => {
      const defaultLayout = getNextLayout(currentBoard.items, type);
      const layout = {
        ...defaultLayout,
        anchorX: "center" as const,
        anchorY: "center" as const,
        x: 0,
        y: 0,
      };
      const item = createBoardItem({
        type,
        layout,
        ...defaultElementValues[type],
        display: values?.display,
        title: values?.title ?? defaultElementValues[type].title,
        url: values?.url ?? defaultElementValues[type].url,
      });
      const clampedItem = {
        ...item,
        layout: clampItemLayout(item, item.layout),
      };
      nextItemId = item.id;

      return {
        ...currentBoard,
        items: [...currentBoard.items, clampedItem],
      };
    });

    if (nextItemId) {
      setSelectedItemId(nextItemId);
      setFloatingWindow("config");
    }
  }

  function updateItemLayout(itemId: string, layout: BoardLayout) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.map((item) =>
        item.id === itemId ? { ...item, layout: clampItemLayout(item, layout) } : item,
      ),
    }));
  }

  function updateItemStyle(itemId: string, style: Partial<BoardItemStyle>) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const nextItem = { ...item, style };
        const maxHeight = getItemMaxHeight(nextItem);
        const shouldFitHeight = shouldFitHeightForStyleChange(item, style);

        return {
          ...nextItem,
          layout: clampItemLayout(nextItem, {
            ...nextItem.layout,
            height:
              shouldFitHeight && maxHeight !== undefined
                ? maxHeight
                : nextItem.layout.height,
          }),
        };
      }),
    }));
  }

  function updateItemConfig(
    itemId: string,
    patch: {
      anchorX?: BoardLayout["anchorX"];
      anchorY?: BoardLayout["anchorY"];
      display?: Partial<BoardItemDisplay>;
      height?: number;
      placeholder?: string;
      searchEngine?: SearchEngineId;
      suggestionsEnabled?: boolean;
      positionX?: number;
      positionY?: number;
      style?: Partial<BoardItemStyle>;
      title?: string;
      url?: string;
      width?: number;
    },
  ) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const patchedItem = {
          ...item,
          display: patch.display ?? item.display,
          style: patch.style ?? item.style,
          title: patch.title ?? item.title,
        };
        const shouldFitHeight =
          patch.height === undefined &&
          (Boolean(patch.display) ||
            (patch.style
              ? shouldFitHeightForStyleChange(item, patch.style)
              : false));
        const requestedLayout = {
          ...item.layout,
          height: patch.height ?? item.layout.height,
          width: patch.width ?? item.layout.width,
        };
        const positionedLayout = clampLayout({
          ...requestedLayout,
          x: patch.positionX ?? requestedLayout.x,
          y: patch.positionY ?? requestedLayout.y,
        });
        const anchoredLayout = patch.anchorX
          ? reanchorLayout(
              positionedLayout,
              patch.anchorX,
              patch.anchorY ?? item.layout.anchorY ?? "top",
              viewportWidth,
              viewportHeight,
            )
          : positionedLayout;

        if (item.type === "link") {
          const nextItem = {
            ...patchedItem,
            url: patch.url !== undefined ? patch.url : item.url,
          };
          const maxHeight = getItemMaxHeight(nextItem);

          return {
            ...nextItem,
            layout: clampItemLayout(nextItem, {
              ...anchoredLayout,
              height:
                shouldFitHeight && maxHeight !== undefined
                  ? maxHeight
                  : anchoredLayout.height,
            }),
          };
        }

        if (item.type === "title") {
          const maxHeight = getItemMaxHeight(patchedItem);

          return {
            ...patchedItem,
            layout: clampItemLayout(patchedItem, {
              ...anchoredLayout,
              height:
                shouldFitHeight && maxHeight !== undefined
                  ? maxHeight
                  : anchoredLayout.height,
            }),
          };
        }

        if (item.type === "search") {
          const nextItem = {
            ...patchedItem,
            placeholder:
              patch.placeholder !== undefined
                ? patch.placeholder
                : item.placeholder,
            searchEngine:
              patch.searchEngine !== undefined
                ? patch.searchEngine
                : item.searchEngine,
            suggestionsEnabled:
              patch.suggestionsEnabled !== undefined
                ? patch.suggestionsEnabled
                : item.suggestionsEnabled,
          };
          const maxHeight = getItemMaxHeight(nextItem);

          return {
            ...nextItem,
            layout: clampItemLayout(nextItem, {
              ...anchoredLayout,
              height:
                shouldFitHeight && maxHeight !== undefined
                  ? maxHeight
                  : anchoredLayout.height,
            }),
          };
        }

        const maxHeight = getItemMaxHeight(patchedItem);

        return {
          ...patchedItem,
          layout: clampItemLayout(patchedItem, {
            ...anchoredLayout,
            height:
              shouldFitHeight && maxHeight !== undefined
                ? maxHeight
                : anchoredLayout.height,
          }),
        };
      }),
    }));
  }

  function addLinkToGroup(
    groupId: string,
    values: { linkIcon?: string; title: string; url: string },
  ) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.map((item) =>
        item.id === groupId && item.type === "group"
          ? {
              ...item,
              links: [
                ...item.links,
                createLink({
                  display: values.linkIcon
                    ? { linkIcon: values.linkIcon }
                    : undefined,
                  title: values.title,
                  url: values.url,
                }),
              ],
            }
          : item,
      ),
    }));
  }

  function updateGroupLinkIcon(groupId: string, linkId: string, linkIcon: string) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.map((item) =>
        item.id === groupId && item.type === "group"
          ? {
              ...item,
              links: item.links.map((link) =>
                link.id === linkId
                  ? {
                      ...link,
                      display: {
                        ...link.display,
                        linkIcon,
                      },
                    }
                  : link,
              ),
            }
          : item,
      ),
    }));
  }

  function updateGroupLink(
    groupId: string,
    linkId: string,
    patch: { title?: string; url?: string },
  ) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.map((item) =>
        item.id === groupId && item.type === "group"
          ? {
              ...item,
              links: item.links.map((link) =>
                link.id === linkId ? { ...link, ...patch } : link,
              ),
            }
          : item,
      ),
    }));
  }

  function removeLinkFromGroup(groupId: string, linkId: string) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.map((item) =>
        item.id === groupId && item.type === "group"
          ? {
              ...item,
              links: item.links.filter((link) => link.id !== linkId),
            }
          : item,
      ),
    }));
  }

  function removeItem(itemId: string) {
    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: currentBoard.items.filter((item) => item.id !== itemId),
    }));
    setSelectedItemId(null);
    setFloatingWindow(null);
  }

  function copySelectedItem() {
    if (!isEditing || !selectedConfigItem) {
      return;
    }

    copiedItemRef.current = copyBoard({
      version: 1,
      items: [selectedConfigItem],
    }).items[0];
  }

  function insertItemCopy(sourceItem: BoardItemData) {
    const nextItem = cloneBoardItem(sourceItem);
    const layout = nextItem.layout;
    const left = getViewportLeft(layout, viewportWidth) + 24;
    const top = getViewportTop(layout, viewportHeight) + 24;
    const nextLayout = clampItemLayout(nextItem, {
      ...layout,
      x: getAnchoredXFromLeft({
        anchorX: getLayoutAnchorX(layout),
        left,
        viewportWidth,
        width: layout.width,
      }),
      y: getAnchoredYFromTop({
        anchorY: getLayoutAnchorY(layout),
        height: layout.height,
        top,
        viewportHeight,
      }),
    });
    const positionedItem = { ...nextItem, layout: nextLayout };

    setDraftBoard((currentBoard) => ({
      ...currentBoard,
      items: [...currentBoard.items, positionedItem],
    }));
    setSelectedItemId(positionedItem.id);
    setFloatingWindow(null);
    copiedItemRef.current = copyBoard({
      version: 1,
      items: [positionedItem],
    }).items[0];
  }

  function pasteCopiedItem() {
    if (!isEditing || !copiedItemRef.current) {
      return;
    }

    insertItemCopy(copiedItemRef.current);
  }

  function duplicateSelectedItem() {
    if (!isEditing || !selectedConfigItem) {
      return;
    }

    insertItemCopy(selectedConfigItem);
  }

  function selectItem(itemId: string, itemType: BoardItemType) {
    setSelectedItemId(itemId);

    if (floatingWindow === "add") {
      setFloatingWindow(null);
      return;
    }

    if (floatingWindow === "title-design" && itemType !== "title") {
      setFloatingWindow("config");
    }

    if (floatingWindow === "group-links" && itemType !== "group") {
      setFloatingWindow("config");
    }
  }

  function nudgeSelectedItem(deltaX: number, deltaY: number) {
    if (!isEditing || !selectedConfigItem) {
      return;
    }

    const layout = selectedConfigItem.layout;
    const left = getViewportLeft(layout, viewportWidth) + deltaX;
    const top = getViewportTop(layout, viewportHeight) + deltaY;

    updateItemLayout(
      selectedConfigItem.id,
      clampLayout({
        ...layout,
        x: getAnchoredXFromLeft({
          anchorX: getLayoutAnchorX(layout),
          left,
          viewportWidth,
          width: layout.width,
        }),
        y: getAnchoredYFromTop({
          anchorY: getLayoutAnchorY(layout),
          height: layout.height,
          top,
          viewportHeight,
        }),
      }),
    );
  }

  useHotkeys([
    [
      "mod+E",
      () => {
        if (!isEditing) {
          startEditing();
        }
      },
    ],
    [
      "mod+S",
      () => {
        if (isEditing) {
          saveEditing();
        }
      },
    ],
    ["mod+C", copySelectedItem],
    ["mod+V", pasteCopiedItem],
    ["mod+D", duplicateSelectedItem],
    [
      "Escape",
      () => {
        if (floatingWindow) {
          setFloatingWindow(null);
          return;
        }

        if (selectedItemId) {
          setSelectedItemId(null);
          return;
        }

        if (isEditing) {
          cancelEditing();
        }
      },
    ],
    [
      "A",
      () => {
        if (isEditing) {
          setFloatingWindow("add");
        }
      },
    ],
    [
      "mod+,",
      () => {
        if (isEditing && selectedConfigItem) {
          setFloatingWindow("config");
        }
      },
    ],
    [
      "mod+shift+D",
      () => {
        if (isEditing && selectedConfigItem?.type === "title") {
          setFloatingWindow("title-design");
        }
      },
    ],
    [
      "Delete",
      () => {
        if (isEditing && selectedItemId) {
          removeItem(selectedItemId);
        }
      },
    ],
    [
      "Backspace",
      () => {
        if (isEditing && selectedItemId) {
          removeItem(selectedItemId);
        }
      },
    ],
    ["ArrowUp", () => nudgeSelectedItem(0, -1)],
    ["ArrowDown", () => nudgeSelectedItem(0, 1)],
    ["ArrowLeft", () => nudgeSelectedItem(-1, 0)],
    ["ArrowRight", () => nudgeSelectedItem(1, 0)],
    ["shift+ArrowUp", () => nudgeSelectedItem(0, -10)],
    ["shift+ArrowDown", () => nudgeSelectedItem(0, 10)],
    ["shift+ArrowLeft", () => nudgeSelectedItem(-10, 0)],
    ["shift+ArrowRight", () => nudgeSelectedItem(10, 0)],
  ]);

  return (
    <main className="min-h-screen w-screen bg-[#f7f8fa] text-[#171717]">
      <SpacesSidebar
        activeSpaceId={workspace.activeSpaceId}
        isCollapsed={isSidebarCollapsed}
        spaces={workspace.spaces}
        onAddSpace={addSpace}
        onDeleteSpace={deleteSpace}
        onSelectSpace={selectSpace}
        onToggleCollapsed={() =>
          setIsSidebarCollapsed((currentValue) => !currentValue)
        }
        onUpdateSpace={updateSpace}
      />
      <section
        className="relative min-h-screen w-screen overflow-auto"
        style={{
          minHeight: "100vh",
          height: `max(100vh, ${canvasHeight}px)`,
          backgroundColor:
            backgroundMode === "color-fixed"
              ? backgroundColor
              : wallpaperAverageColor ?? backgroundColor,
        }}
        onPointerDown={(event) => {
          if (isEditing && event.target === event.currentTarget) {
            setSelectedItemId(null);
            setFloatingWindow(null);
          }
        }}
      >
        {backgroundMode !== "color-fixed" && wallpaper ? (
          <div
            key={wallpaper}
            aria-hidden="true"
            className="wallpaper-fade-in pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${wallpaper})` }}
          />
        ) : null}
        <BoardToolbar
          colorScheme={colorScheme}
          isEditing={isEditing}
          onAdd={() =>
            setFloatingWindow((current) => (current === "add" ? null : "add"))
          }
          onCancel={cancelEditing}
          onEdit={startEditing}
          onExport={() => void exportBoard()}
          onImport={requestImportBoard}
          onSave={saveEditing}
          onTabIcon={() => setFloatingWindow("tab-icon")}
          onThemes={() => setFloatingWindow("themes")}
          onToggleColorScheme={() =>
            setColorScheme(colorScheme === "dark" ? "light" : "dark")
          }
          onWallpapers={() => setFloatingWindow("wallpapers")}
        />
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={importBoard}
        />
        <Suspense fallback={null}>
          {floatingWindow === "wallpapers" ? (
            <WallpaperWindow
              backgroundColor={backgroundColor}
              backgroundMode={backgroundMode}
              opened
              wallpapers={wallpapers}
              selectedIds={selectedWallpaperIds}
              onAdd={addWallpaperToActiveSpace}
              onBackgroundColorChange={(nextColor) =>
                updateActiveSpaceBackground({ backgroundColor: nextColor })
              }
              onBackgroundModeChange={updateActiveSpaceBackgroundMode}
              onRemove={removeWallpaperFromLibrary}
              onToggle={toggleActiveSpaceWallpaper}
              onClose={() => setFloatingWindow(null)}
            />
          ) : null}
          {floatingWindow === "themes" ? (
            <ComponentThemeWindow
              opened
              themeId={componentThemeId}
              onChange={updateActiveSpaceComponentTheme}
              onClose={() => setFloatingWindow(null)}
            />
          ) : null}
          {floatingWindow === "tab-icon" ? (
            <TabIconWindow
              iconSource={tabIcon}
              opened
              tabTitle={tabTitle}
              onChange={updateTabIcon}
              onClose={() => setFloatingWindow(null)}
              onTitleChange={updateTabTitle}
            />
          ) : null}
          {isEditing && floatingWindow === "add" ? (
            <AddElementWindow
              opened
              onAdd={addItem}
              onClose={() => setFloatingWindow(null)}
            />
          ) : null}
          {isEditing && floatingWindow === "config" && selectedConfigItem ? (
            <ItemConfigWindow
              item={selectedConfigItem}
              opened
              onChange={updateItemConfig}
              onClose={() => setFloatingWindow(null)}
            />
          ) : null}
          {isEditing && floatingWindow === "group-links" && selectedGroupItem ? (
            <GroupLinksWindow
              item={selectedGroupItem}
              opened
              onAddGroupLink={addLinkToGroup}
              onClose={() => setFloatingWindow(null)}
              onRemoveGroupLink={removeLinkFromGroup}
              onUpdateGroupLink={updateGroupLink}
              onUpdateGroupLinkIcon={updateGroupLinkIcon}
            />
          ) : null}
        </Suspense>

        {activeBoard.items.length === 0 ? (
          <div className="grid min-h-screen place-items-center px-5">
            <EmptyBoard
              isEditing={isEditing}
              onEdit={startEditing}
              onAdd={() => setFloatingWindow("add")}
            />
          </div>
        ) : (
          activeBoard.items.map((item) => (
            <BoardItem
              key={item.id}
              componentTheme={componentTheme.style}
              item={item}
              items={activeBoard.items}
              viewportHeight={viewportHeight}
              viewportWidth={viewportWidth}
              isEditing={isEditing}
              isSelected={selectedItemId === item.id}
              isTitleDesignOpen={
                floatingWindow === "title-design" &&
                selectedItemId === item.id
              }
              today={today}
              onSelect={() => selectItem(item.id, item.type)}
              onMove={updateItemLayout}
              onResize={updateItemLayout}
              onStyleChange={updateItemStyle}
              onConfigure={() => {
                setSelectedItemId(item.id);
                setFloatingWindow("config");
              }}
              onCloseTitleDesign={() => setFloatingWindow(null)}
              onRemove={() => removeItem(item.id)}
              onAddLink={() => {
                setSelectedItemId(item.id);
                setFloatingWindow("group-links");
              }}
              onOpenTitleDesign={() => {
                setSelectedItemId(item.id);
                setFloatingWindow("title-design");
              }}
            />
          ))
        )}
      </section>
    </main>
  );
}
