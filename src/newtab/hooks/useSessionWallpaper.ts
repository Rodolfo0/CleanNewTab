import { useEffect, useMemo, useRef, useState } from "react";

import freeDownloadWallpaper from "../../assets/Free-download-Wallpaper-4K.jpg";
import pictureWallpaper from "../../assets/Free-download-Wallpaper-Picture-4K.jpg";
import wallpaper4k from "../../assets/Wallpaper-4K-Free-Download.jpg";

const WALLPAPER_STORAGE_KEY = "clean-new-tab:wallpapers:v1";
const WALLPAPER_DB_NAME = "clean-new-tab-wallpapers";
const WALLPAPER_DB_VERSION = 1;
const WALLPAPER_STORE_NAME = "wallpapers";

export type Wallpaper = {
  averageColor?: string;
  id: string;
  isCustom: boolean;
  loadState?: "error" | "loading" | "ready";
  name: string;
  source: string;
};

type CustomWallpaper = {
  averageColor?: string;
  id: string;
  isCustom: true;
  name: string;
};

type WallpaperSettings = {
  customWallpapers: CustomWallpaper[];
  selectedIds: string[];
  version: 1;
};

export type WallpaperExportData = {
  backgroundColor?: string;
  backgroundMode?: "color-fixed" | "image-fixed" | "image-rotating";
  customWallpapers: Array<{
    averageColor?: string;
    dataUrl: string;
    id: string;
    name: string;
  }>;
  selectedIds: string[];
  version: 1;
};

export type AddWallpaperResult = {
  message?: string;
  ok: boolean;
  wallpaperId?: string;
};

export type ImportWallpapersResult = {
  backgroundColor?: string;
  backgroundMode?: "color-fixed" | "image-fixed" | "image-rotating";
  message?: string;
  ok: boolean;
  selectedIds?: string[];
};

type StoredWallpaper = {
  blob: Blob;
  id: string;
};

type InitialWallpaperState = {
  legacySources: Record<string, string>;
  settings: WallpaperSettings;
};

const builtInWallpapers: Wallpaper[] = [
  {
    id: "landscape-blue",
    isCustom: false,
    name: "Paisaje azul",
    source: freeDownloadWallpaper,
  },
  {
    id: "landscape-dark",
    isCustom: false,
    name: "Paisaje",
    source: wallpaper4k,
  },
  {
    id: "landscape-light",
    isCustom: false,
    name: "Paisaje claro",
    source: pictureWallpaper,
  },
];

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultSettings(): WallpaperSettings {
  return {
    customWallpapers: [],
    selectedIds: builtInWallpapers.map((wallpaper) => wallpaper.id),
    version: 1,
  };
}

function isValidCustomWallpaper(
  value: unknown,
): value is CustomWallpaper | Wallpaper {
  if (!value || typeof value !== "object") {
    return false;
  }

  const wallpaper = value as Record<string, unknown>;

  return typeof wallpaper.id === "string" && typeof wallpaper.name === "string";
}

function isValidAverageColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

async function getAverageImageColor(blob: Blob) {
  const bitmap = await createImageBitmap(blob, {
    resizeHeight: 24,
    resizeQuality: "low",
    resizeWidth: 24,
  });
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    bitmap.close();
    throw new Error("Canvas no disponible.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let alphaTotal = 0;
  let red = 0;
  let green = 0;
  let blue = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    alphaTotal += alpha;
    red += pixels[index] * alpha;
    green += pixels[index + 1] * alpha;
    blue += pixels[index + 2] * alpha;
  }

  if (alphaTotal === 0) {
    return "#f1f3f5";
  }

  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(channel / alphaTotal)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function loadInitialState(): InitialWallpaperState {
  if (!canUseLocalStorage()) {
    return { legacySources: {}, settings: defaultSettings() };
  }

  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(WALLPAPER_STORAGE_KEY) ?? "null",
    );

    if (!stored || typeof stored !== "object") {
      return { legacySources: {}, settings: defaultSettings() };
    }

    const settings = stored as Record<string, unknown>;
    const legacySources: Record<string, string> = {};
    const customWallpapers = Array.isArray(settings.customWallpapers)
      ? settings.customWallpapers
          .filter(isValidCustomWallpaper)
          .map((wallpaper) => ({
            averageColor: isValidAverageColor(wallpaper.averageColor)
              ? wallpaper.averageColor
              : undefined,
            id: wallpaper.id,
            isCustom: true as const,
            name: wallpaper.name,
          }))
      : [];

    if (Array.isArray(settings.customWallpapers)) {
      settings.customWallpapers.forEach((wallpaper) => {
        if (
          wallpaper &&
          typeof wallpaper === "object" &&
          "id" in wallpaper &&
          "source" in wallpaper &&
          typeof wallpaper.id === "string" &&
          typeof wallpaper.source === "string" &&
          wallpaper.source.startsWith("data:image/")
        ) {
          legacySources[wallpaper.id] = wallpaper.source;
        }
      });
    }

    const availableIds = new Set([
      ...builtInWallpapers.map((wallpaper) => wallpaper.id),
      ...customWallpapers.map((wallpaper) => wallpaper.id),
    ]);
    const selectedIds = Array.isArray(settings.selectedIds)
      ? settings.selectedIds.filter(
          (id): id is string => typeof id === "string" && availableIds.has(id),
        )
      : [];

    return {
      legacySources,
      settings: {
        customWallpapers,
        selectedIds:
          selectedIds.length > 0
            ? selectedIds
            : builtInWallpapers.map((wallpaper) => wallpaper.id),
        version: 1,
      },
    };
  } catch {
    return { legacySources: {}, settings: defaultSettings() };
  }
}

function saveSettings(settings: WallpaperSettings) {
  if (!canUseLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(
      WALLPAPER_STORAGE_KEY,
      JSON.stringify(settings),
    );
    return true;
  } catch {
    return false;
  }
}

function pickRandomWallpaper(wallpapers: Wallpaper[]) {
  return wallpapers[Math.floor(Math.random() * wallpapers.length)]?.id ?? null;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);

  return response.blob();
}

function canUseIndexedDb() {
  return (
    typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
  );
}

let wallpaperDbPromise: Promise<IDBDatabase> | null = null;

function openWallpaperDb() {
  if (wallpaperDbPromise) {
    return wallpaperDbPromise;
  }

  wallpaperDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      wallpaperDbPromise = null;
      reject(new Error("IndexedDB no está disponible."));
      return;
    }

    const request = window.indexedDB.open(
      WALLPAPER_DB_NAME,
      WALLPAPER_DB_VERSION,
    );

    request.onerror = () => {
      wallpaperDbPromise = null;
      reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
    };
    request.onblocked = () => {
      wallpaperDbPromise = null;
      reject(new Error("IndexedDB está bloqueada."));
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        wallpaperDbPromise = null;
      };
      resolve(db);
    };
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(WALLPAPER_STORE_NAME)) {
        db.createObjectStore(WALLPAPER_STORE_NAME, { keyPath: "id" });
      }
    };
  });

  return wallpaperDbPromise;
}

function runWallpaperTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return new Promise<T>((resolve, reject) => {
    void openWallpaperDb()
      .then((db) => {
        const transaction = db.transaction(WALLPAPER_STORE_NAME, mode);
        const store = transaction.objectStore(WALLPAPER_STORE_NAME);
        const request = callback(store);
        let result: T;
        let isFinished = false;
        const timeoutId = window.setTimeout(
          () => {
            transaction.abort();
          },
          mode === "readonly" ? 5_000 : 60_000,
        );

        function finishTransaction() {
          if (isFinished) {
            return;
          }

          isFinished = true;
          window.clearTimeout(timeoutId);
        }

        request.onerror = () => {
          finishTransaction();
          reject(request.error ?? new Error("IndexedDB falló."));
        };
        request.onsuccess = () => {
          result = request.result;
        };
        transaction.oncomplete = () => {
          finishTransaction();
          resolve(result);
        };
        transaction.onabort = () => {
          finishTransaction();
          reject(
            transaction.error ?? new Error("IndexedDB canceló la operación."),
          );
        };
        transaction.onerror = () => {
          finishTransaction();
          reject(transaction.error ?? new Error("IndexedDB falló."));
        };
      })
      .catch(reject);
  });
}

function getStoredWallpaper(id: string) {
  return runWallpaperTransaction<StoredWallpaper | undefined>(
    "readonly",
    (store) => store.get(id),
  );
}

function putStoredWallpaper(record: StoredWallpaper) {
  return runWallpaperTransaction<IDBValidKey>("readwrite", (store) =>
    store.put(record),
  );
}

function deleteStoredWallpaper(id: string) {
  return runWallpaperTransaction<undefined>("readwrite", (store) =>
    store.delete(id),
  );
}

function createObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

export function useWallpapers(
  priorityWallpaperIds: string[] = [],
  hydrateWallpaperLibrary = false,
) {
  const [{ legacySources, settings }, setState] = useState(loadInitialState);
  const [sourceById, setSourceById] = useState<Record<string, string>>({});
  const [failedWallpaperIds, setFailedWallpaperIds] = useState<Set<string>>(
    () => new Set(),
  );
  const objectUrlByIdRef = useRef<Record<string, string>>({});
  const hydratedWallpaperIdsRef = useRef<Set<string>>(new Set());
  const priorityWallpaperKey = priorityWallpaperIds.join("\u0000");
  const stablePriorityWallpaperIds = useMemo(
    () => (priorityWallpaperKey ? priorityWallpaperKey.split("\u0000") : []),
    [priorityWallpaperKey],
  );
  const wallpapers = useMemo(
    () => [
      ...builtInWallpapers,
      ...settings.customWallpapers.map((wallpaper) => ({
        ...wallpaper,
        loadState: sourceById[wallpaper.id]
          ? ("ready" as const)
          : failedWallpaperIds.has(wallpaper.id)
            ? ("error" as const)
            : ("loading" as const),
        source: sourceById[wallpaper.id] ?? "",
      })),
    ],
    [failedWallpaperIds, settings.customWallpapers, sourceById],
  );

  function registerWallpaperSource(wallpaperId: string, blob: Blob) {
    const objectUrl = createObjectUrl(blob);
    const previousObjectUrl = objectUrlByIdRef.current[wallpaperId];

    objectUrlByIdRef.current[wallpaperId] = objectUrl;
    hydratedWallpaperIdsRef.current.add(wallpaperId);
    setSourceById((currentSources) => ({
      ...currentSources,
      [wallpaperId]: objectUrl,
    }));
    setFailedWallpaperIds((currentIds) => {
      if (!currentIds.has(wallpaperId)) {
        return currentIds;
      }

      const nextIds = new Set(currentIds);
      nextIds.delete(wallpaperId);
      return nextIds;
    });

    if (previousObjectUrl && previousObjectUrl !== objectUrl) {
      window.requestAnimationFrame(() => {
        URL.revokeObjectURL(previousObjectUrl);
      });
    }

    return objectUrl;
  }

  function markWallpaperAsFailed(wallpaperId: string) {
    setFailedWallpaperIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(wallpaperId);
      return nextIds;
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateCustomWallpapers() {
      let didMigrateLegacySources = false;
      const calculatedAverageColors: Record<string, string> = {};
      const priorityIdSet = new Set(stablePriorityWallpaperIds);
      const priorityWallpapers = settings.customWallpapers.filter((wallpaper) =>
        priorityIdSet.has(wallpaper.id),
      );
      const remainingWallpapers = hydrateWallpaperLibrary
        ? settings.customWallpapers.filter(
            (wallpaper) => !priorityIdSet.has(wallpaper.id),
          )
        : [];

      async function hydrateWallpaper(wallpaper: CustomWallpaper) {
        if (hydratedWallpaperIdsRef.current.has(wallpaper.id)) {
          return;
        }

        try {
          const legacySource = legacySources[wallpaper.id];
          let storedWallpaper: StoredWallpaper | undefined;

          if (legacySource) {
            const blob = await dataUrlToBlob(legacySource);
            await putStoredWallpaper({ blob, id: wallpaper.id });
            storedWallpaper = { blob, id: wallpaper.id };
            didMigrateLegacySources = true;
          } else {
            storedWallpaper = await getStoredWallpaper(wallpaper.id);
          }

          if (storedWallpaper?.blob) {
            if (!isMounted) {
              return;
            }

            registerWallpaperSource(wallpaper.id, storedWallpaper.blob);

            if (!wallpaper.averageColor) {
              try {
                calculatedAverageColors[wallpaper.id] =
                  await getAverageImageColor(storedWallpaper.blob);
              } catch {
                // The wallpaper remains usable if color extraction is unsupported.
              }
            }
          } else if (isMounted) {
            markWallpaperAsFailed(wallpaper.id);
          }
        } catch {
          if (isMounted) {
            markWallpaperAsFailed(wallpaper.id);
          }
        }
      }

      await Promise.all(priorityWallpapers.map(hydrateWallpaper));
      await Promise.all(remainingWallpapers.map(hydrateWallpaper));

      if (
        isMounted &&
        (didMigrateLegacySources ||
          Object.keys(calculatedAverageColors).length > 0)
      ) {
        const nextSettings = {
          ...settings,
          customWallpapers: settings.customWallpapers.map((wallpaper) => ({
            ...wallpaper,
            averageColor:
              wallpaper.averageColor ?? calculatedAverageColors[wallpaper.id],
          })),
        };
        saveSettings(nextSettings);
        setState({ legacySources: {}, settings: nextSettings });
      }
    }

    void hydrateCustomWallpapers();

    return () => {
      isMounted = false;
    };
  }, [
    hydrateWallpaperLibrary,
    legacySources,
    settings,
    stablePriorityWallpaperIds,
  ]);

  function commit(nextSettings: WallpaperSettings) {
    if (!saveSettings(nextSettings)) {
      return false;
    }

    setState({ legacySources: {}, settings: nextSettings });
    return true;
  }

  function getAvailableSelectedIds(selectedIds?: string[]) {
    const availableIds = new Set(wallpapers.map((wallpaper) => wallpaper.id));
    const nextSelectedIds =
      selectedIds?.filter((id) => availableIds.has(id)) ?? [];

    return nextSelectedIds.length > 0 ? nextSelectedIds : settings.selectedIds;
  }

  function getWallpaperSource(
    selectedIds?: string[],
    currentWallpaperId?: string | null,
  ) {
    const selectedIdSet = new Set(getAvailableSelectedIds(selectedIds));
    const selectedWallpapers = wallpapers.filter((wallpaper) =>
      selectedIdSet.has(wallpaper.id),
    );
    const currentWallpaper = selectedWallpapers.find(
      (item) => item.id === currentWallpaperId,
    );

    if (currentWallpaper) {
      return currentWallpaper.source || undefined;
    }

    if (selectedWallpapers[0]) {
      return selectedWallpapers[0].source || undefined;
    }

    return builtInWallpapers[0].source;
  }

  function pickWallpaperId(selectedIds?: string[]) {
    const selectedIdSet = new Set(getAvailableSelectedIds(selectedIds));
    return pickRandomWallpaper(
      wallpapers.filter((wallpaper) => selectedIdSet.has(wallpaper.id)),
    );
  }

  async function addWallpaper(file: File): Promise<AddWallpaperResult> {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "Selecciona un archivo de imagen." };
    }

    try {
      const wallpaper: CustomWallpaper = {
        id: `custom-${createId()}`,
        isCustom: true,
        name: file.name.replace(/\.[^.]+$/, "") || "Fondo personalizado",
      };
      await putStoredWallpaper({ blob: file, id: wallpaper.id });
      const objectUrl = registerWallpaperSource(wallpaper.id, file);

      const nextSettings = {
        ...settings,
        customWallpapers: [...settings.customWallpapers, wallpaper],
        selectedIds: [...settings.selectedIds, wallpaper.id],
      };

      if (!commit(nextSettings)) {
        await deleteStoredWallpaper(wallpaper.id);
        URL.revokeObjectURL(objectUrl);
        delete objectUrlByIdRef.current[wallpaper.id];
        hydratedWallpaperIdsRef.current.delete(wallpaper.id);
        setSourceById((currentSources) => {
          const nextSources = { ...currentSources };
          delete nextSources[wallpaper.id];
          return nextSources;
        });
        return {
          ok: false,
          message: "No se pudo guardar la configuración de la imagen.",
        };
      }

      void getAverageImageColor(file)
        .then((averageColor) => {
          setState((currentState) => {
            if (
              !currentState.settings.customWallpapers.some(
                (item) => item.id === wallpaper.id,
              )
            ) {
              return currentState;
            }

            const updatedSettings = {
              ...currentState.settings,
              customWallpapers: currentState.settings.customWallpapers.map(
                (item) =>
                  item.id === wallpaper.id ? { ...item, averageColor } : item,
              ),
            };
            saveSettings(updatedSettings);
            return {
              legacySources: currentState.legacySources,
              settings: updatedSettings,
            };
          });
        })
        .catch(() => undefined);

      return { ok: true, wallpaperId: wallpaper.id };
    } catch {
      return { ok: false, message: "No se pudo cargar la imagen." };
    }
  }

  function removeWallpaper(wallpaperId: string) {
    const wallpaper = settings.customWallpapers.find(
      (item) => item.id === wallpaperId,
    );

    if (!wallpaper) {
      return false;
    }

    const nextSelectedIds = settings.selectedIds.filter(
      (id) => id !== wallpaperId,
    );
    const remainingIds = wallpapers
      .filter((item) => item.id !== wallpaperId)
      .map((item) => item.id);

    const didCommit = commit({
      ...settings,
      customWallpapers: settings.customWallpapers.filter(
        (item) => item.id !== wallpaperId,
      ),
      selectedIds:
        nextSelectedIds.length > 0 ? nextSelectedIds : [remainingIds[0]],
    });

    if (didCommit) {
      void deleteStoredWallpaper(wallpaperId);
      setSourceById((currentSources) => {
        const nextSources = { ...currentSources };
        const source = nextSources[wallpaperId];

        if (source?.startsWith("blob:")) {
          URL.revokeObjectURL(source);
        }

        delete objectUrlByIdRef.current[wallpaperId];
        hydratedWallpaperIdsRef.current.delete(wallpaperId);
        delete nextSources[wallpaperId];
        return nextSources;
      });
    }

    return didCommit;
  }

  async function exportWallpapers(
    selectedIds = settings.selectedIds,
    options?: {
      backgroundColor?: string;
      backgroundMode?: WallpaperExportData["backgroundMode"];
    },
  ): Promise<WallpaperExportData> {
    const customWallpapers = await Promise.all(
      settings.customWallpapers.map(async (wallpaper) => {
        const storedWallpaper = await getStoredWallpaper(wallpaper.id);

        if (!storedWallpaper?.blob) {
          return null;
        }

        return {
          averageColor: wallpaper.averageColor,
          dataUrl: await readBlobAsDataUrl(storedWallpaper.blob),
          id: wallpaper.id,
          name: wallpaper.name,
        };
      }),
    );

    return {
      backgroundColor: options?.backgroundColor,
      backgroundMode: options?.backgroundMode,
      customWallpapers: customWallpapers.filter(
        (wallpaper) => wallpaper !== null,
      ),
      selectedIds: getAvailableSelectedIds(selectedIds),
      version: 1,
    };
  }

  async function importWallpapers(
    data: unknown,
  ): Promise<ImportWallpapersResult> {
    if (!data || typeof data !== "object") {
      return { ok: true };
    }

    const bundle = data as Partial<WallpaperExportData>;

    if (
      !Array.isArray(bundle.customWallpapers) &&
      !Array.isArray(bundle.selectedIds)
    ) {
      return { ok: true };
    }

    try {
      const importedCustomWallpapers: CustomWallpaper[] = [];
      const importedWallpaperBlobs = new Map<string, Blob>();

      if (Array.isArray(bundle.customWallpapers)) {
        for (const wallpaper of bundle.customWallpapers) {
          if (
            !wallpaper ||
            typeof wallpaper !== "object" ||
            typeof wallpaper.id !== "string" ||
            typeof wallpaper.name !== "string" ||
            typeof wallpaper.dataUrl !== "string" ||
            !wallpaper.dataUrl.startsWith("data:image/")
          ) {
            continue;
          }

          const blob = await dataUrlToBlob(wallpaper.dataUrl);
          const averageColor = isValidAverageColor(wallpaper.averageColor)
            ? wallpaper.averageColor
            : await getAverageImageColor(blob).catch(() => undefined);

          await putStoredWallpaper({ blob, id: wallpaper.id });
          importedWallpaperBlobs.set(wallpaper.id, blob);
          importedCustomWallpapers.push({
            averageColor,
            id: wallpaper.id,
            isCustom: true,
            name: wallpaper.name,
          });
        }
      }

      const customWallpaperMap = new Map(
        settings.customWallpapers.map((wallpaper) => [wallpaper.id, wallpaper]),
      );

      importedCustomWallpapers.forEach((wallpaper) => {
        customWallpaperMap.set(wallpaper.id, wallpaper);
      });

      const customWallpapers = Array.from(customWallpaperMap.values());
      const availableIds = new Set([
        ...builtInWallpapers.map((wallpaper) => wallpaper.id),
        ...customWallpapers.map((wallpaper) => wallpaper.id),
      ]);
      const selectedIds = Array.isArray(bundle.selectedIds)
        ? bundle.selectedIds.filter(
            (id): id is string =>
              typeof id === "string" && availableIds.has(id),
          )
        : settings.selectedIds;
      const nextSettings = {
        customWallpapers,
        selectedIds:
          selectedIds.length > 0 ? selectedIds : settings.selectedIds,
        version: 1 as const,
      };

      if (!commit(nextSettings)) {
        return {
          ok: false,
          message: "No se pudo guardar la configuración de fondos.",
        };
      }

      importedWallpaperBlobs.forEach((blob, wallpaperId) => {
        registerWallpaperSource(wallpaperId, blob);
      });

      return {
        backgroundColor:
          typeof bundle.backgroundColor === "string"
            ? bundle.backgroundColor
            : undefined,
        backgroundMode:
          bundle.backgroundMode === "color-fixed" ||
          bundle.backgroundMode === "image-fixed" ||
          bundle.backgroundMode === "image-rotating"
            ? bundle.backgroundMode
            : undefined,
        ok: true,
        selectedIds: nextSettings.selectedIds,
      };
    } catch {
      return { ok: false, message: "No se pudieron importar los fondos." };
    }
  }

  return {
    addWallpaper,
    defaultSelectedIds: settings.selectedIds,
    exportWallpapers,
    getWallpaperSource,
    importWallpapers,
    pickWallpaperId,
    removeWallpaper,
    wallpapers,
  };
}
