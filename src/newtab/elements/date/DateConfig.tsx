import { Stack, TextInput } from "@mantine/core";
import { PresentationConfig, VariantConfig } from "../shared/configSections";
import type { ElementConfigProps } from "../shared/configTypes";
import type { DateItem } from "../../model/boardItems";

export function DateConfig({ item, onChange }: ElementConfigProps<DateItem>) {
  return (
    <Stack gap="md">
      <TextInput
        label="Etiqueta"
        size="xs"
        value={item.title}
        onChange={(event) =>
          onChange(item.id, { title: event.currentTarget.value })
        }
      />

      <VariantConfig
        item={item}
        onChange={onChange}
        options={[
          { label: "Card", description: "Fecha con etiqueta.", value: "date-card" },
          { label: "Grande limpia", description: "Fecha grande sin contenedor.", value: "date-large" },
          { label: "Minima", description: "Solo fecha sin etiqueta.", value: "date-minimal" },
        ]}
      />
      <PresentationConfig item={item} onChange={onChange} />
    </Stack>
  );
}
