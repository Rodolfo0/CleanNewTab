import { ActionIcon, Button, Group, Tooltip } from "@mantine/core";
import {
  DownloadSimpleIcon,
  FloppyDiskIcon,
  ImageSquareIcon,
  PaletteIcon,
  PencilSimpleIcon,
  PlusIcon,
  MoonIcon,
  SunIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

type BoardToolbarProps = {
  colorScheme: "dark" | "light";
  isEditing: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onExport: () => void;
  onImport: () => void;
  onSave: () => void;
  onThemes: () => void;
  onToggleColorScheme: () => void;
  onWallpapers: () => void;
};

export function BoardToolbar({
  colorScheme,
  isEditing,
  onAdd,
  onCancel,
  onEdit,
  onExport,
  onImport,
  onSave,
  onThemes,
  onToggleColorScheme,
  onWallpapers,
}: BoardToolbarProps) {
  return (
    <Group className="absolute right-4 top-4 z-20 rounded-md border border-[#d0d5dd] bg-white p-1 shadow-sm">
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
