import { ActionIcon, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
    BrowsersIcon, CaretLeftIcon, CaretRightIcon, CloudArrowDownIcon, CloudArrowUpIcon, CloudCheckIcon, DownloadSimpleIcon,
    FloppyDiskIcon, ImageSquareIcon, MoonIcon, PaletteIcon, PencilSimpleIcon, PlusIcon, SignOutIcon,
    SunIcon, UploadSimpleIcon, XIcon
} from "@phosphor-icons/react";

import type { DriveSyncState } from "../storage/driveSync";
import { useEdgeDrawer } from "../hooks/useEdgeDrawer";

type BoardToolbarProps = {
  colorScheme: "dark" | "light";
  isEditing: boolean;
  saveDisabled?: boolean;
  driveConnected: boolean;
  driveState: DriveSyncState;
  driveDetails: {
    boards: number;
    customWallpapers: number;
    lastCheckedAt: string | null;
    lastSavedAt: string | null;
  };
  onAdd: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDriveConnect: () => void;
  onDriveDisconnect: () => void;
  onDriveDownload: () => void;
  onDriveUpload: () => void;
  onExport: () => void;
  onImport: () => void;
  onSave: () => void;
  onTabIcon: () => void;
  onThemes: () => void;
  onToggleColorScheme: () => void;
  onWallpapers: () => void;
};

export function BoardToolbar({
  colorScheme,
  driveConnected,
  driveDetails,
  driveState,
  isEditing,
  saveDisabled = false,
  onAdd,
  onCancel,
  onEdit,
  onDriveConnect,
  onDriveDisconnect,
  onDriveDownload,
  onDriveUpload,
  onExport,
  onImport,
  onSave,
  onTabIcon,
  onThemes,
  onToggleColorScheme,
  onWallpapers,
}: BoardToolbarProps) {
  const drawer = useEdgeDrawer();
  const driveLabel = {
    checking: "Comprobando Google Drive…",
    conflict: "Conflicto con Google Drive",
    disconnected: "Sincronizar mi configuración con Drive",
    error: "Reintentar sincronización con Drive",
    pending: "Cambios pendientes de sincronizar",
    synced: "Configuración sincronizada con Drive",
    syncing: "Sincronizando con Google Drive…",
    unsupported: "Google Drive no está disponible en este navegador",
  }[driveState];
  const isDriveBusy = driveState === "checking" || driveState === "syncing";
  const formatDriveDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("es-MX", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value))
      : "Aún no disponible";

  return (
    <div
      className={`edge-drawer edge-drawer-right fixed right-0 top-4 z-30 flex items-start ${
        drawer.isOpen ? "edge-drawer-open" : ""
      }`}
      onMouseEnter={drawer.open}
      onMouseLeave={drawer.closeAfterDelay}
      onFocusCapture={drawer.open}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          drawer.closeAfterDelay();
        }
      }}
    >
      <button
        type="button"
        className="mr-5.5 mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-[#d0d5dd] bg-white/94 text-[#475467] shadow-sm backdrop-blur transition-colors hover:bg-[#f9fafb]"
        aria-label={drawer.isOpen ? "Ocultar controles" : "Mostrar controles"}
        title={drawer.isOpen ? "Ocultar controles" : "Mostrar controles"}
      >
        {drawer.isOpen ? (
          <CaretRightIcon size={16} weight="bold" />
        ) : (
          <CaretLeftIcon size={16} weight="bold" />
        )}
      </button>
      <Group className="rounded-l-xl border border-r-0 border-[#d0d5dd] bg-white/94 p-1 shadow-sm backdrop-blur">
        <Menu position="bottom-end" width={260} shadow="md" withinPortal>
          <Menu.Target>
            <Tooltip label={driveLabel}>
              <ActionIcon
                size="lg"
                variant={driveState === "synced" ? "light" : "default"}
                color={
                  driveState === "conflict" || driveState === "error"
                    ? "red"
                    : "blue"
                }
                radius="md"
                loading={isDriveBusy}
                disabled={driveState === "unsupported"}
                aria-label="Abrir menú de Google Drive"
              >
                {driveState === "synced" ? (
                  <CloudCheckIcon size={20} />
                ) : (
                  <CloudArrowUpIcon size={20} />
                )}
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Google Drive</Menu.Label>
            <Text size="xs" c="dimmed" px="sm" pb="xs">
              {driveLabel}
            </Text>
            {driveConnected ? (
              <>
                <Menu.Divider />
                <Menu.Label>Datos guardados</Menu.Label>
                <Text size="sm" px="sm">
                  {driveDetails.boards} tableros
                </Text>
                <Text size="sm" px="sm" pb="xs">
                  {driveDetails.customWallpapers} fondos personalizados
                </Text>
                <Menu.Label>Última actualización</Menu.Label>
                <Text size="xs" px="sm">
                  Cambios guardados: {formatDriveDate(driveDetails.lastSavedAt)}
                </Text>
                <Text size="xs" px="sm" pb="xs">
                  Revisión de Drive:{" "}
                  {formatDriveDate(driveDetails.lastCheckedAt)}
                </Text>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<CloudArrowUpIcon size={17} />}
                  disabled={isDriveBusy}
                  onClick={onDriveUpload}
                >
                  Guardar cambios en Drive
                </Menu.Item>
                <Menu.Item
                  leftSection={<CloudArrowDownIcon size={17} />}
                  disabled={isDriveBusy}
                  onClick={onDriveDownload}
                >
                  Cargar cambios desde Drive
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<SignOutIcon size={17} />}
                  disabled={isDriveBusy}
                  onClick={onDriveDisconnect}
                >
                  Quitar cuenta de este dispositivo
                </Menu.Item>
              </>
            ) : (
              <Menu.Item
                leftSection={<CloudArrowUpIcon size={17} />}
                disabled={isDriveBusy}
                onClick={onDriveConnect}
              >
                Conectar con Google Drive
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
        <Tooltip label={colorScheme === "dark" ? "Modo claro" : "Modo oscuro"}>
          <ActionIcon
            size="lg"
            variant="default"
            radius="md"
            aria-label={
              colorScheme === "dark"
                ? "Activar modo claro"
                : "Activar modo oscuro"
            }
            onClick={onToggleColorScheme}
          >
            {colorScheme === "dark" ? (
              <SunIcon size={20} />
            ) : (
              <MoonIcon size={20} />
            )}
          </ActionIcon>
        </Tooltip>
        {isEditing ? (
          <Button
            color="dark"
            radius="md"
            size="sm"
            leftSection={<PlusIcon size={18} />}
            onClick={onAdd}
          >
            Agregar elemento
          </Button>
        ) : null}
        {isEditing ? (
          <>
            <Tooltip label="Fondos de pantalla">
              <ActionIcon
                size="lg"
                variant="default"
                radius="md"
                aria-label="Fondos de pantalla"
                onClick={onWallpapers}
              >
                <ImageSquareIcon size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Tema de componentes">
              <ActionIcon
                size="lg"
                variant="default"
                radius="md"
                aria-label="Tema de componentes"
                onClick={onThemes}
              >
                <PaletteIcon size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Ícono de pestaña">
              <ActionIcon
                size="lg"
                variant="default"
                radius="md"
                aria-label="Personalizar ícono de pestaña"
                onClick={onTabIcon}
              >
                <BrowsersIcon size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Importar tablero">
              <ActionIcon
                size="lg"
                variant="default"
                radius="md"
                aria-label="Importar tablero"
                onClick={onImport}
              >
                <UploadSimpleIcon size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Exportar tablero">
              <ActionIcon
                size="lg"
                variant="default"
                radius="md"
                aria-label="Exportar tablero"
                onClick={onExport}
              >
                <DownloadSimpleIcon size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Cancelar cambios">
              <ActionIcon
                size="lg"
                variant="default"
                radius="md"
                aria-label="Cancelar cambios"
                onClick={onCancel}
              >
                <XIcon size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip
              label={
                saveDisabled ? "Corrige las URLs inválidas" : "Guardar cambios"
              }
            >
              <ActionIcon
                size="lg"
                color="teal"
                variant="filled"
                radius="md"
                aria-label="Guardar cambios"
                disabled={saveDisabled}
                onClick={onSave}
              >
                <FloppyDiskIcon size={21} />
              </ActionIcon>
            </Tooltip>
          </>
        ) : (
          <Tooltip label="Editar tablero">
            <ActionIcon
              size="lg"
              variant="default"
              radius="md"
              aria-label="Editar tablero"
              onClick={onEdit}
            >
              <PencilSimpleIcon size={20} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </div>
  );
}
