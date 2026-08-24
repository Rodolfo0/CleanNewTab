import { Stack, TextInput } from "@mantine/core";
import {
  AlignmentConfig,
  VariantConfig,
} from "../shared/configSections";
import type { ElementConfigProps } from "../shared/configTypes";
import type { TitleItem } from "../../model/boardItems";

export function TitleConfig({ item, onChange }: ElementConfigProps<TitleItem>) {
  return (
    <Stack gap="md">
      <TextInput
        label="Nombre"
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
          { label: "Titulo limpio", description: "Texto principal sin contenedor.", value: "title-heading" },
          { label: "Etiqueta", description: "Texto pequeno sin contenedor.", value: "title-label" },
          { label: "Panel", description: "Texto con contenedor.", value: "title-panel" },
        ]}
      />
      <AlignmentConfig item={item} onChange={onChange} />
    </Stack>
  );
}
