import { ActionIcon, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
  BrowsersIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  CloudCheckIcon,
  DownloadSimpleIcon,
  FloppyDiskIcon,
  ImageSquareIcon,
  PaletteIcon,
  PencilSimpleIcon,
  PlusIcon,
  MoonIcon,
  SunIcon,
  SignOutIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { DriveSyncState } from "../storage/driveSync";

type BoardToolbarProps = {
  colorScheme: "dark" | "light";
  isEditing: boolean;
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
    <Group className="absolute right-4 top-4 z-20 rounded-md border border-[#d0d5dd] bg-white p-1 shadow-sm">
      <Menu position="bottom-end" width={260} shadow="md" withinPortal>
        <Menu.Target>
          <Tooltip label={driveLabel}>
            <ActionIcon
              size="lg"
              variant={driveState === "synced" ? "light" : "default"}
              color={driveState === "conflict" || driveState === "error" ? "red" : "blue"}
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
              <Text size="sm" px="sm">{driveDetails.boards} tableros</Text>
              <Text size="sm" px="sm" pb="xs">
                {driveDetails.customWallpapers} fondos personalizados
              </Text>
              <Menu.Label>Última actualización</Menu.Label>
              <Text size="xs" px="sm">
                Cambios guardados: {formatDriveDate(driveDetails.lastSavedAt)}
              </Text>
              <Text size="xs" px="sm" pb="xs">
                Revisión de Drive: {formatDriveDate(driveDetails.lastCheckedAt)}
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
          aria-label={colorScheme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          onClick={onToggleColorScheme}
        >
          {colorScheme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
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
          <Tooltip label="Guardar cambios">
            <ActionIcon
              size="lg"
              color="teal"
              variant="filled"
              radius="md"
              aria-label="Guardar cambios"
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
  );
}
