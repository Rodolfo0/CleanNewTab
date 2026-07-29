import { useRef, useState } from "react";
import { ActionIcon, Button, Group, Modal, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import {
  ArrowCounterClockwiseIcon,
  BrowsersIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

const maxIconSize = 512 * 1024;

type TabIconWindowProps = {
  iconSource: string | null;
  onChange: (iconSource: string | null) => boolean;
  onClose: () => void;
  onTitleChange: (title: string) => boolean;
  opened: boolean;
  tabTitle: string;
};

export function TabIconWindow({
  iconSource,
  onChange,
  onClose,
  onTitleChange,
  opened,
  tabTitle,
}: TabIconWindowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function selectIcon(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNotice("Selecciona un archivo de imagen.");
      return;
    }

    if (file.size > maxIconSize) {
      setNotice("El ícono debe pesar menos de 512 KB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;

      if (!result || !onChange(result)) {
        setNotice("No se pudo guardar el ícono.");
        return;
      }

      setNotice(null);
    };
    reader.onerror = () => setNotice("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Ícono de pestaña" centered>
      <Stack gap="lg">
        <TextInput
          label="Texto de la pestaña"
          description="Este nombre aparecerá junto al ícono en el navegador."
          value={tabTitle}
          maxLength={80}
          rightSection={
            <Tooltip label="Restaurar texto">
              <ActionIcon
                variant="subtle"
                aria-label="Restaurar texto de la pestaña"
                disabled={tabTitle === "Nueva pestaña"}
                onClick={() => {
                  if (onTitleChange("Nueva pestaña")) {
                    setNotice(null);
                  }
                }}
              >
                <ArrowCounterClockwiseIcon size={16} />
              </ActionIcon>
            </Tooltip>
          }
          onChange={(event) => {
            if (!onTitleChange(event.currentTarget.value)) {
              setNotice("No se pudo guardar el texto.");
            } else {
              setNotice(null);
            }
          }}
        />

        <Group align="center" wrap="nowrap">
          <div className="grid size-20 shrink-0 place-items-center rounded-xl border border-[#d0d5dd] bg-white">
            {iconSource === "" ? (
              <BrowsersIcon
                size={36}
                className="text-[#98a2b3]"
                aria-label="Pestaña sin ícono"
              />
            ) : (
              <img
                src={iconSource ?? "/favicon.svg"}
                alt="Vista previa del ícono"
                className="size-12 object-contain"
              />
            )}
          </div>
          <Stack gap={4}>
            <Text fw={700}>Personaliza la pestaña</Text>
            <Text size="sm" className="text-[#667085]">
              Usa una imagen cuadrada en PNG, SVG, ICO, JPEG o WebP. Se recomienda
              un tamaño de 128 × 128 px o mayor.
            </Text>
          </Stack>
        </Group>

        {notice ? (
          <Text size="sm" className="text-[#c92a2a]">
            {notice}
          </Text>
        ) : null}

        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<ArrowCounterClockwiseIcon size={17} />}
              disabled={iconSource === null}
              onClick={() => {
                if (onChange(null)) {
                  setNotice(null);
                }
              }}
            >
              Restaurar
            </Button>
            <Button
              variant="subtle"
              color="red"
              leftSection={<TrashIcon size={17} />}
              disabled={iconSource === ""}
              onClick={() => {
                if (onChange("")) {
                  setNotice(null);
                }
              }}
            >
              Sin ícono
            </Button>
          </Group>
          <Button
            leftSection={<UploadSimpleIcon size={17} />}
            onClick={() => inputRef.current?.click()}
          >
            Subir ícono
          </Button>
        </Group>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            selectIcon(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </Stack>
    </Modal>
  );
}
