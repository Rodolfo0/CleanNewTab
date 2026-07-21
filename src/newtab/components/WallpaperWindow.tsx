import { useRef, useState } from "react";
import {
  ActionIcon,
  Button,
  ColorInput,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { CheckIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import type { Wallpaper } from "../hooks/useSessionWallpaper";
import type { BoardBackgroundMode } from "../storage/boardStorage";

const colorPresets = [
  { color: "#f1f3f5", name: "Claro" },
  { color: "#fafafa", name: "Blanco" },
  { color: "#111827", name: "Grafito" },
  { color: "#0f172a", name: "Nocturno" },
  { color: "#0e1217", name: "Daily negro" },
  { color: "#1c1f26", name: "Daily carbón" },
  { color: "#ce3df3", name: "Daily morado" },
  { color: "#c9ff3d", name: "Daily lima" },
  { color: "#ff6f61", name: "Daily coral" },
  { color: "#fff7ed", name: "Cálido" },
  { color: "#ecfdf5", name: "Menta" },
  { color: "#eff6ff", name: "Azul" },
  { color: "#fdf2f8", name: "Rosa" },
  { color: "#fefce8", name: "Luz" },
] as const;

type WallpaperWindowProps = {
  backgroundColor: string;
  backgroundMode: BoardBackgroundMode;
  onAdd: (file: File) => Promise<{ message?: string; ok: boolean }>;
  onBackgroundColorChange: (color: string) => void;
  onBackgroundModeChange: (mode: BoardBackgroundMode) => void;
  onClose: () => void;
  onRemove: (wallpaperId: string) => boolean;
  onToggle: (wallpaperId: string) => boolean;
  opened: boolean;
  selectedIds: string[];
  wallpapers: Wallpaper[];
};

export function WallpaperWindow({
  backgroundColor,
  backgroundMode,
  onAdd,
  onBackgroundColorChange,
  onBackgroundModeChange,
  onClose,
  onRemove,
  onToggle,
  opened,
  selectedIds,
  wallpapers,
}: WallpaperWindowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const selectedIdSet = new Set(selectedIds);
  const usesImages = backgroundMode !== "color-fixed";
  const normalizedBackgroundColor = backgroundColor.toLowerCase();

  async function addWallpaper(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsAdding(true);

    try {
      const result = await onAdd(file);
      setNotice(result.ok ? null : result.message ?? "No se pudo guardar la imagen.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Fondos de pantalla" size={760} centered>
      <Stack gap="md" style={{ height: "min(640px, calc(100vh - 160px))" }}>
        <SegmentedControl
          fullWidth
          value={backgroundMode}
          data={[
            { label: "Fijo", value: "image-fixed" },
            { label: "Cambiante", value: "image-rotating" },
            { label: "Color", value: "color-fixed" },
          ]}
          onChange={(value) => {
            onBackgroundModeChange(value as BoardBackgroundMode);
            setNotice(null);
          }}
        />

        <Group justify="space-between" align="center">
          <Text size="sm" className="text-[#667085]">
            {backgroundMode === "image-fixed"
              ? "Selecciona un fondo fijo para este espacio."
              : backgroundMode === "image-rotating"
                ? "Selecciona los fondos que rotarán al abrir este espacio."
                : "Selecciona un color fijo para este espacio."}
          </Text>
          {usesImages ? (
            <Button
              size="sm"
              loading={isAdding}
              leftSection={<UploadSimpleIcon size={17} />}
              onClick={() => inputRef.current?.click()}
            >
              Subir imagen
            </Button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void addWallpaper(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </Group>

        {notice ? <Text size="sm" className="text-[#c92a2a]">{notice}</Text> : null}

        {backgroundMode === "color-fixed" ? (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <Stack gap="md">
              <ColorInput
                label="Color personalizado"
                value={backgroundColor}
                format="hex"
                swatches={colorPresets.map((preset) => preset.color)}
                onChange={onBackgroundColorChange}
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {colorPresets.map((preset) => {
                  const isSelected = normalizedBackgroundColor === preset.color;

                  return (
                    <div key={preset.color} className="group relative overflow-hidden rounded-md border border-[#d0d5dd] bg-white">
                      <button
                        type="button"
                        className="relative block aspect-video w-full transition-opacity"
                        style={{ backgroundColor: preset.color }}
                        onClick={() => {
                          onBackgroundColorChange(preset.color);
                          setNotice(null);
                        }}
                        aria-label={`Seleccionar color ${preset.name}`}
                      >
                        {isSelected ? (
                          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#12b886] text-white shadow-sm">
                            <CheckIcon size={15} weight="bold" />
                          </span>
                        ) : null}
                      </button>
                      <Group justify="space-between" wrap="nowrap" gap={6} className="min-w-0 px-2 py-1.5">
                        <Text size="xs" fw={700} className="truncate text-[#344054]">
                          {preset.name}
                        </Text>
                        <Text size="xs" className="shrink-0 text-[#667085]">
                          {preset.color}
                        </Text>
                      </Group>
                    </div>
                  );
                })}
              </div>
            </Stack>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
            {wallpapers.map((wallpaper) => {
              const isSelected = selectedIdSet.has(wallpaper.id);

              return (
                <div key={wallpaper.id} className="group relative overflow-hidden rounded-md border border-[#d0d5dd] bg-white">
                  <button
                    type="button"
                    className={`relative block aspect-video w-full bg-cover bg-center transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-45"
                    }`}
                    style={{
                      backgroundColor: wallpaper.averageColor,
                      backgroundImage: wallpaper.source
                        ? `url(${wallpaper.source})`
                        : "none",
                    }}
                    onClick={() => {
                      if (!onToggle(wallpaper.id)) {
                        setNotice("Debe quedar al menos un fondo seleccionado.");
                      } else {
                        setNotice(null);
                      }
                    }}
                    aria-label={`${isSelected ? "Quitar" : "Seleccionar"} ${wallpaper.name}`}
                  >
                    {wallpaper.loadState === "loading" ? (
                      <span className="absolute inset-0 grid place-items-center bg-white/50">
                        <Loader size={20} color="gray" />
                      </span>
                    ) : null}
                    {wallpaper.loadState === "error" ? (
                      <span className="absolute inset-0 grid place-items-center bg-white/50 px-3 text-center">
                        <Text size="xs" fw={700} className="text-[#667085]">
                          No disponible
                        </Text>
                      </span>
                    ) : null}
                    {isSelected ? (
                      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#12b886] text-white shadow-sm">
                        <CheckIcon size={15} weight="bold" />
                      </span>
                    ) : null}
                  </button>
                  <Group justify="space-between" wrap="nowrap" gap={6} className="min-w-0 px-2 py-1.5">
                    <Text size="xs" fw={700} className="truncate text-[#344054]">
                      {wallpaper.name}
                    </Text>
                    {wallpaper.isCustom ? (
                      <Tooltip label="Eliminar fondo">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          aria-label={`Eliminar ${wallpaper.name}`}
                          onClick={() => {
                            if (!onRemove(wallpaper.id)) {
                              setNotice("No se pudo eliminar el fondo.");
                            } else {
                              setNotice(null);
                            }
                          }}
                        >
                          <TrashIcon size={15} />
                        </ActionIcon>
                      </Tooltip>
                    ) : null}
                  </Group>
                </div>
              );
            })}
          </div>
        )}
      </Stack>
    </Modal>
  );
}
