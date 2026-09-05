import { Alert, SegmentedControl, Stack, Switch, Text } from "@mantine/core";
import type { NoteItem } from "../../model/boardItems";
import type { ElementConfigProps } from "../shared/configTypes";
import { ConfigAccordion } from "../shared/configSections";

export function NoteConfig({ item, onChange }: ElementConfigProps<NoteItem>) {
  return (
    <Stack gap="md">
      <Alert color="gray" variant="light" title="Contenido">
        Edita el texto desde la nota con doble clic o con su botón de edición.
      </Alert>
      <Text size="xs" c="dimmed">
        {item.contentVersion === 1 ? "Formato de nota compatible." : "Formato de nota desconocido."}
      </Text>
      <ConfigAccordion title="Contador" value="counter">
        <Stack gap="xs">
          <Text size="xs" fw={700} className="text-[#344054]">
            Visibilidad
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            value={item.counter?.visibility ?? "editing"}
            data={[
              { value: "always", label: "Siempre" },
              { value: "editing", label: "Al editar" },
              { value: "never", label: "Nunca" },
            ]}
            onChange={(value) => onChange(item.id, {
              counter: { visibility: value as NonNullable<NoteItem["counter"]>["visibility"] },
            })}
          />
          <Switch
            size="xs"
            checked={item.counter?.showCharacters !== false}
            label="Mostrar caracteres"
            onChange={(event) => onChange(item.id, {
              counter: { showCharacters: event.currentTarget.checked },
            })}
          />
          <Switch
            size="xs"
            checked={item.counter?.showWords !== false}
            label="Mostrar palabras"
            onChange={(event) => onChange(item.id, {
              counter: { showWords: event.currentTarget.checked },
            })}
          />
        </Stack>
      </ConfigAccordion>
    </Stack>
  );
}
