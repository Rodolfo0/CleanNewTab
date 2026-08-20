import type { ChangeEvent } from "react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys, useViewportSize } from "@mantine/hooks";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { BoardItem } from "./components/BoardItem";
import { BoardToolbar } from "./components/BoardToolbar";
import type { DriveReconciliationChoice } from "./components/DriveReconciliationModal";
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
  isNavigableUrl,
  reanchorLayout,
  type BoardItem as BoardItemData,
  type BoardItemType,
  type BoardItemDisplay,
  type BoardItemStyle,
  type BoardLayout,
  type SearchEngineId,
} from "./model/boardItems";
import { useWallpapers, type WallpaperExportData } from "./hooks/useSessionWallpaper";
import { useToday } from "./hooks/useToday";
import {
  createBoardSpace,
  parseImportedBoard,
  parseImportedSyncedWorkspace,
  workspaceStorage,
  type BoardBackgroundMode,
  type BoardSpace,
  type BoardWorkspace,
} from "./storage/boardStorage";
import {
  sendDriveMessage,
  type DriveWallpaperBundle,
  type DriveSyncState,
  type DriveWorkspaceEnvelope,
} from "./storage/driveSync";
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
const DriveReconciliationModal = lazy(() =>
  import("./components/DriveReconciliationModal").then((module) => ({
    default: module.DriveReconciliationModal,
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
const driveDeviceIdKey = "clean-new-tab:drive-device-id:v1";
const driveSyncPausedKey = "clean-new-tab:drive-sync-paused:v1";

type PendingDriveReconciliation = {
  envelope: DriveWorkspaceEnvelope;
  remoteWorkspace: BoardWorkspace;
  wallpapers?: DriveWallpaperBundle;
  tabIcon?: string | null;
};

type DriveSaveWaiter = {
  reject: (error: unknown) => void;
  resolve: () => void;
};

type PendingDriveSave = {
  force: boolean;
  waiters: DriveSaveWaiter[];
};

function mergeWorkspaces(local: BoardWorkspace, remote: BoardWorkspace): BoardWorkspace {
  const localIds = new Set(local.spaces.map((space) => space.id));
  return {
    ...local,
    spaces: [
      ...local.spaces,
      ...remote.spaces.filter((space) => !localIds.has(space.id)),
    ],
  };
}

function loadDriveDeviceId() {
  try {
    const existing = window.localStorage.getItem(driveDeviceIdKey);
    if (existing) {
      return existing;
    }

    const deviceId = crypto.randomUUID();
    window.localStorage.setItem(driveDeviceIdKey, deviceId);
    return deviceId;
  } catch {
    return crypto.randomUUID();
  }
}

function isDriveSyncPaused() {
  try {
    return window.localStorage.getItem(driveSyncPausedKey) === "true";
  } catch {
    return false;
  }
}

function setDriveSyncPaused(paused: boolean) {
  try {
    if (paused) {
      window.localStorage.setItem(driveSyncPausedKey, "true");
    } else {
      window.localStorage.removeItem(driveSyncPausedKey);
    }
  } catch {
    // Drive remains usable for the current session when preferences cannot persist.
  }
}

function loadTabIcon() {
  try {
    return window.localStorage.getItem(tabIconStorageKey);
  } catch {
    return null;
  }
}

function saveTabIconLocally(iconSource: string | null) {
  try {
    if (iconSource !== null) {
      window.localStorage.setItem(tabIconStorageKey, iconSource);
    } else {
      window.localStorage.removeItem(tabIconStorageKey);
    }
    return true;
  } catch {
    return false;
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
  const [localSaveState, setLocalSaveState] = useState<"saved" | "pending" | "error">("saved");
  const [driveState, setDriveState] = useState<DriveSyncState>("checking");
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveLastSavedAt, setDriveLastSavedAt] = useState<string | null>(null);
  const [driveLastCheckedAt, setDriveLastCheckedAt] = useState<string | null>(null);
  const [pendingDriveReconciliation, setPendingDriveReconciliation] =
    useState<PendingDriveReconciliation | null>(null);
  const driveDeviceId = useRef(loadDriveDeviceId());
  const driveEnabled = useRef(false);
  const driveRevision = useRef<number | null>(null);
  const driveConflict = useRef<DriveWorkspaceEnvelope | null>(null);
  const driveSaveTimer = useRef<number | null>(null);
  const scheduleDriveSaveRef = useRef<(delay: number) => void>(() => undefined);
  const driveSaveRunning = useRef(false);
  const pendingDriveSave = useRef<PendingDriveSave | null>(null);
  const isApplyingRemoteWorkspace = useRef(false);
  const initialActiveSpaceId = useRef(workspace.activeSpaceId);
  const [tabIcon, setTabIcon] = useState<string | null>(loadTabIcon);
  const tabIconRef = useRef(tabIcon);
  const [tabTitle, setTabTitle] = useState(loadTabTitle);
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
  const today = useToday(dateFormatter);
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
  const exportWallpapersRef = useRef(exportWallpapers);
  const importWallpapersRef = useRef(importWallpapers);
  const syncedWorkspace = useMemo(
    () => ({ version: workspace.version, spaces: workspace.spaces }) as const,
    [workspace.spaces, workspace.version],
  );
  const syncedWorkspaceRef = useRef(syncedWorkspace);
  syncedWorkspaceRef.current = syncedWorkspace;
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
    const pendingTimeoutId = window.setTimeout(() => {
      setLocalSaveState("pending");
    }, 0);
    const timeoutId = window.setTimeout(() => {
      const result = workspaceStorage.save(workspace);
      setLocalSaveState(result.ok ? "saved" : "error");
    }, 400);

    return () => {
      window.clearTimeout(pendingTimeoutId);
      window.clearTimeout(timeoutId);
    };
  }, [workspace]);

  useEffect(() => {
    exportWallpapersRef.current = exportWallpapers;
    importWallpapersRef.current = importWallpapers;
  }, [exportWallpapers, importWallpapers]);

  useEffect(() => {
    let cancelled = false;

    void sendDriveMessage<{ connected: boolean; supported: boolean }>({
      type: "drive-status",
    })
      .then(async (status) => {
        if (cancelled) return;
        if (!status.supported) {
          setDriveState("unsupported");
          return;
        }
        if (!status.connected) {
          driveEnabled.current = false;
          setDriveConnected(false);
          setDriveState("disconnected");
          return;
        }

        driveEnabled.current = true;
        setDriveConnected(true);

        if (isDriveSyncPaused()) {
          driveEnabled.current = false;
          setDriveState("paused");
          return;
        }

        const result = await sendDriveMessage<{
          kind: "empty" | "remote";
          envelope?: DriveWorkspaceEnvelope;
          wallpapers?: DriveWallpaperBundle;
          tabIcon?: string | null;
        }>({ type: "drive-load" });
        if (cancelled) return;
        setDriveLastCheckedAt(new Date().toISOString());

        const remoteWorkspace = result.envelope
          ? parseImportedSyncedWorkspace(
              result.envelope.workspace,
              initialActiveSpaceId.current,
            )
          : null;
        if (result.kind === "remote" && result.envelope && remoteWorkspace) {
          if (result.wallpapers) {
            await importWallpapersRef.current(result.wallpapers);
          }
          if (result.tabIcon !== undefined) {
            if (saveTabIconLocally(result.tabIcon)) {
              tabIconRef.current = result.tabIcon;
              setTabIcon(result.tabIcon);
            }
          }
          driveRevision.current = result.envelope.revision;
          setDriveLastSavedAt(result.envelope.updatedAt);
          isApplyingRemoteWorkspace.current = true;
          setWorkspace(remoteWorkspace);
        }
        setDriveState("synced");
      })
      .catch(() => {
        if (!cancelled) {
          driveEnabled.current = false;
          setDriveConnected(false);
          setDriveState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isApplyingRemoteWorkspace.current) {
      isApplyingRemoteWorkspace.current = false;
      return;
    }
    if (driveRevision.current === null || !driveEnabled.current) {
      return;
    }

    scheduleDriveSaveRef.current(1500);
  }, [syncedWorkspace]);

  useEffect(() => () => {
    if (driveSaveTimer.current !== null) {
      window.clearTimeout(driveSaveTimer.current);
    }
  }, []);

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
        : tabIcon ?? "/logo.svg";
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

  async function performQueuedDriveSave(force: boolean) {
    const result = await sendDriveMessage<{
        kind: "saved" | "conflict";
        envelope: DriveWorkspaceEnvelope;
      }>({
        type: "drive-save",
        workspace: syncedWorkspaceRef.current,
        wallpapers: await exportWallpapersRef.current(),
        tabIcon: tabIconRef.current,
        deviceId: driveDeviceId.current,
        expectedRevision: driveRevision.current,
        force,
      });

    setDriveLastCheckedAt(new Date().toISOString());
    if (result.kind === "conflict") {
      driveConflict.current = result.envelope;
      setDriveLastSavedAt(result.envelope.updatedAt);
      setDriveState("conflict");
      throw new Error("Drive contiene cambios de otro dispositivo.");
    }

    driveRevision.current = result.envelope.revision;
    setDriveLastSavedAt(result.envelope.updatedAt);
    driveConflict.current = null;
    driveEnabled.current = true;
    setDriveConnected(true);
  }

  async function drainDriveSaveQueue() {
    if (driveSaveRunning.current) return;
    driveSaveRunning.current = true;
    let lastSaveFailed = false;

    while (pendingDriveSave.current) {
      const request = pendingDriveSave.current;
      pendingDriveSave.current = null;
      setDriveState("syncing");
      try {
        await performQueuedDriveSave(request.force);
        lastSaveFailed = false;
        request.waiters.forEach((waiter) => waiter.resolve());
      } catch (error) {
        lastSaveFailed = true;
        request.waiters.forEach((waiter) => waiter.reject(error));
        if (driveConflict.current) {
          const supersededRequest = pendingDriveSave.current as PendingDriveSave | null;
          pendingDriveSave.current = null;
          supersededRequest?.waiters.forEach((waiter) => waiter.reject(error));
          break;
        }
        setDriveState("error");
      }
    }

    driveSaveRunning.current = false;
    if (!driveConflict.current && !lastSaveFailed) setDriveState("synced");
  }

  function enqueueDriveSave(force = false) {
    return new Promise<void>((resolve, reject) => {
      const waiter = { reject, resolve };
      if (pendingDriveSave.current) {
        pendingDriveSave.current.force ||= force;
        pendingDriveSave.current.waiters.push(waiter);
      } else {
        pendingDriveSave.current = { force, waiters: [waiter] };
      }
      void drainDriveSaveQueue();
    });
  }

  function scheduleDriveSave(delay: number) {
    if (!driveEnabled.current) return;
    if (driveSaveTimer.current !== null) {
      window.clearTimeout(driveSaveTimer.current);
    }
    setDriveState("pending");
    driveSaveTimer.current = window.setTimeout(() => {
      driveSaveTimer.current = null;
      void enqueueDriveSave().catch(() => undefined);
    }, delay);
  }
  scheduleDriveSaveRef.current = scheduleDriveSave;

  async function saveWorkspaceToDrive(force = false) {
    if (driveSaveTimer.current !== null) {
      window.clearTimeout(driveSaveTimer.current);
      driveSaveTimer.current = null;
    }
    try {
      await enqueueDriveSave(force);
    } catch (error) {
      if (!driveConflict.current) {
        window.alert(error instanceof Error ? error.message : "No se pudo sincronizar con Drive.");
      }
    }
  }

  function scheduleWallpaperDriveSave() {
    if (!driveEnabled.current) {
      return;
    }

    scheduleDriveSave(500);
  }

  async function handleDriveSync() {
    if (driveState === "conflict" && driveConflict.current) {
      const useDrive = window.confirm(
        "Drive contiene cambios realizados en otro dispositivo. Pulsa Aceptar para usar la versión de Drive o Cancelar para reemplazarla con este dispositivo.",
      );
      if (useDrive) {
        const conflict = driveConflict.current;
        const remoteWorkspace = parseImportedSyncedWorkspace(
          conflict.workspace,
          workspace.activeSpaceId,
        );
        if (!remoteWorkspace) {
          setDriveState("error");
          window.alert("La configuración de Drive no es válida.");
          return;
        }
        if (conflict.resources) {
          const assetResult = await importWallpapersRef.current(
            conflict.resources.wallpapers,
          );
          if (!assetResult.ok) {
            setDriveState("error");
            window.alert(assetResult.message ?? "No se pudieron cargar los fondos de Drive.");
            return;
          }
          updateTabIcon(conflict.resources.tabIcon, false);
        }
        driveRevision.current = conflict.revision;
        driveConflict.current = null;
        isApplyingRemoteWorkspace.current = true;
        setWorkspace(remoteWorkspace);
        setDriveState("synced");
      } else {
        await saveWorkspaceToDrive(true);
      }
      return;
    }

    if (driveEnabled.current) {
      await saveWorkspaceToDrive();
      return;
    }

    setDriveState("syncing");
    try {
      const result = await sendDriveMessage<{
        kind: "created" | "remote";
        envelope: DriveWorkspaceEnvelope;
        wallpapers?: DriveWallpaperBundle;
        tabIcon?: string | null;
      }>({
        type: "drive-connect",
        workspace: syncedWorkspace,
        wallpapers: await exportWallpapersRef.current(),
        tabIcon: tabIconRef.current,
        deviceId: driveDeviceId.current,
      });
      setDriveConnected(true);
      driveRevision.current = result.envelope.revision;
      setDriveLastCheckedAt(new Date().toISOString());
      setDriveLastSavedAt(result.envelope.updatedAt);

      if (result.kind === "remote") {
        const remoteWorkspace = parseImportedSyncedWorkspace(
          result.envelope.workspace,
          workspace.activeSpaceId,
        );
        if (!remoteWorkspace) {
          throw new Error("La configuración guardada en Drive no es válida.");
        }
        driveEnabled.current = false;
        setPendingDriveReconciliation({
          envelope: result.envelope,
          remoteWorkspace,
          wallpapers: result.wallpapers,
          tabIcon: result.tabIcon,
        });
        setDriveState("paused");
        return;
      }
      driveEnabled.current = true;
      setDriveSyncPaused(false);
      setDriveState("synced");
    } catch (error) {
      driveEnabled.current = false;
      setDriveConnected(false);
      setDriveState("error");
      window.alert(error instanceof Error ? error.message : "No se pudo conectar con Drive.");
    }
  }

  async function applyRemoteAssets(pending: PendingDriveReconciliation) {
    if (pending.wallpapers) {
      const result = await importWallpapersRef.current(pending.wallpapers);
      if (!result.ok) {
        throw new Error(result.message ?? "No se pudieron cargar los fondos de Drive.");
      }
    }
    if (pending.tabIcon !== undefined) {
      updateTabIcon(pending.tabIcon, false);
    }
  }

  async function handleDriveReconciliation(choice: DriveReconciliationChoice) {
    const pending = pendingDriveReconciliation;
    if (!pending) return;

    setPendingDriveReconciliation(null);
    if (choice === "connect-only") {
      setDriveSyncPaused(true);
      driveEnabled.current = false;
      setDriveState("paused");
      return;
    }

    setDriveSyncPaused(false);
    driveEnabled.current = true;
    setDriveState("syncing");
    try {
      if (choice === "download") {
        await applyRemoteAssets(pending);
        isApplyingRemoteWorkspace.current = true;
        setWorkspace(pending.remoteWorkspace);
        setDriveState("synced");
        return;
      }

      if (choice === "merge") {
        await applyRemoteAssets(pending);
        const merged = mergeWorkspaces(workspace, pending.remoteWorkspace);
        isApplyingRemoteWorkspace.current = true;
        setWorkspace(merged);
        const result = await sendDriveMessage<{ kind: "saved"; envelope: DriveWorkspaceEnvelope }>({
          type: "drive-save",
          workspace: { version: merged.version, spaces: merged.spaces },
          wallpapers: await exportWallpapersRef.current(),
          tabIcon: tabIconRef.current,
          deviceId: driveDeviceId.current,
          expectedRevision: pending.envelope.revision,
          force: true,
        });
        driveRevision.current = result.envelope.revision;
        setDriveLastSavedAt(result.envelope.updatedAt);
        setDriveState("synced");
        return;
      }

      await saveWorkspaceToDrive(true);
    } catch (error) {
      setDriveState("error");
      window.alert(error instanceof Error ? error.message : "No se pudo completar la sincronización.");
    }
  }

  async function handleDriveDownload() {
    if (
      !window.confirm(
        "¿Cargar la copia de Drive? Los cambios locales que aún no se hayan sincronizado serán reemplazados.",
      )
    ) {
      return;
    }

    setDriveState("syncing");
    try {
      const result = await sendDriveMessage<{
        kind: "empty" | "remote";
        envelope?: DriveWorkspaceEnvelope;
        wallpapers?: DriveWallpaperBundle;
        tabIcon?: string | null;
      }>({ type: "drive-load" });
      setDriveLastCheckedAt(new Date().toISOString());

      if (result.kind !== "remote" || !result.envelope) {
        setDriveState("synced");
        window.alert("Drive todavía no contiene una configuración guardada.");
        return;
      }

      const remoteWorkspace = parseImportedSyncedWorkspace(
        result.envelope.workspace,
        workspace.activeSpaceId,
      );
      if (!remoteWorkspace) {
        throw new Error("La configuración guardada en Drive no es válida.");
      }

      if (result.wallpapers) {
        const wallpaperResult = await importWallpapersRef.current(result.wallpapers);
        if (!wallpaperResult.ok) {
          throw new Error(wallpaperResult.message ?? "No se pudieron cargar los fondos de Drive.");
        }
      }
      if (result.tabIcon !== undefined) {
        updateTabIcon(result.tabIcon, false);
      }

      driveRevision.current = result.envelope.revision;
      driveEnabled.current = true;
      setDriveSyncPaused(false);
      setDriveLastSavedAt(result.envelope.updatedAt);
      driveConflict.current = null;
      isApplyingRemoteWorkspace.current = true;
      setWorkspace(remoteWorkspace);
      setDriveState("synced");
    } catch (error) {
      setDriveState("error");
      window.alert(error instanceof Error ? error.message : "No se pudo cargar la copia de Drive.");
    }
  }

  async function handleDriveUpload() {
    if (driveConnected && !driveEnabled.current) {
      setDriveSyncPaused(false);
      driveEnabled.current = true;
      await saveWorkspaceToDrive(true);
      return;
    }

    await handleDriveSync();
  }

  async function handleDriveDisconnect() {
    if (
      !window.confirm(
        "¿Quitar la cuenta de Google de este dispositivo? Tus tableros locales y la copia guardada en Drive no se eliminarán.",
      )
    ) {
      return;
    }

    setDriveState("syncing");
    try {
      await sendDriveMessage<{ ok: true }>({ type: "drive-disconnect" });
      setDriveSyncPaused(false);
      driveEnabled.current = false;
      setDriveConnected(false);
      driveRevision.current = null;
      driveConflict.current = null;
      setDriveState("disconnected");
    } catch (error) {
      setDriveState("error");
      window.alert(error instanceof Error ? error.message : "No se pudo quitar la cuenta.");
    }
  }

  function startEditing() {
    setDraftBoard(copyBoard(activeSpace.board));
    setIsEditing(true);
    setSelectedItemId(null);
    setFloatingWindow(null);
  }

  function saveEditing() {
    const hasInvalidUrl = draftBoard.items.some((item) =>
      item.type === "link"
        ? !isNavigableUrl(item.url)
        : item.type === "group"
          ? item.links.some((link) => !isNavigableUrl(link.url))
          : false,
    );
    if (hasInvalidUrl) return;

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

  function updateTabIcon(iconSource: string | null, syncDrive = true) {
    if (!saveTabIconLocally(iconSource)) {
      return false;
    }
    tabIconRef.current = iconSource;
    setTabIcon(iconSource);
    if (syncDrive) {
      scheduleWallpaperDriveSave();
    }
    return true;
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
      scheduleWallpaperDriveSave();
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
    scheduleWallpaperDriveSave();

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
    <main className="h-screen w-full overflow-hidden bg-[#f7f8fa] text-[#171717]">
      <SpacesSidebar
        activeSpaceId={workspace.activeSpaceId}
        spaces={workspace.spaces}
        onAddSpace={addSpace}
        onDeleteSpace={deleteSpace}
        onSelectSpace={selectSpace}
        onUpdateSpace={updateSpace}
      />
      <section
        className="relative h-full w-full overflow-hidden overscroll-none"
        style={{
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
          driveConnected={driveConnected}
          driveDetails={{
            boards: workspace.spaces.length,
            customWallpapers: wallpapers.filter((item) => item.isCustom).length,
            lastCheckedAt: driveLastCheckedAt,
            lastSavedAt: driveLastSavedAt,
          }}
          driveState={driveState}
          isEditing={isEditing}
          localSaveState={localSaveState}
          saveDisabled={draftBoard.items.some((item) =>
            item.type === "link"
              ? !isNavigableUrl(item.url)
              : item.type === "group"
                ? item.links.some((link) => !isNavigableUrl(link.url))
                : false,
          )}
          onAdd={() =>
            setFloatingWindow((current) => (current === "add" ? null : "add"))
          }
          onCancel={cancelEditing}
          onEdit={startEditing}
          onDriveConnect={() => void handleDriveSync()}
          onDriveDisconnect={() => void handleDriveDisconnect()}
          onDriveDownload={() => void handleDriveDownload()}
          onDriveUpload={() => void handleDriveUpload()}
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
        <Suspense fallback={null}>
          {pendingDriveReconciliation ? (
            <DriveReconciliationModal
              opened
              localBoards={workspace.spaces.length}
              remoteBoards={pendingDriveReconciliation.remoteWorkspace.spaces.length}
              onChoose={(choice) => void handleDriveReconciliation(choice)}
              onClose={() => void handleDriveReconciliation("connect-only")}
            />
          ) : null}
        </Suspense>
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
