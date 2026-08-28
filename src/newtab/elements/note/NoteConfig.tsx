import { Alert, Stack, Text } from "@mantine/core";
import type { NoteItem } from "../../model/boardItems";
import type { ElementConfigProps } from "../shared/configTypes";

export function NoteConfig({ item }: ElementConfigProps<NoteItem>) {
  return (
    <Stack gap="md">
      <Alert color="gray" variant="light" title="Contenido">
        Edita el texto desde la nota con doble clic o con su botón de edición.
      </Alert>
      <Text size="xs" c="dimmed">
        {item.contentVersion === 1 ? "Formato de nota compatible." : "Formato de nota desconocido."}
      </Text>
    </Stack>
  );
}
