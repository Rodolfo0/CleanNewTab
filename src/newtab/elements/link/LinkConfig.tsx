import { Stack, TextInput } from "@mantine/core";

import { LinkIconConfig, VariantConfig } from "../shared/configSections";

import type { ElementConfigProps } from "../shared/configTypes";
import type { LinkItem } from "../../model/boardItems";

export function LinkConfig({ item, onChange }: ElementConfigProps<LinkItem>) {
  return (
    <Stack gap="md">
      <Stack gap={8}>
        <TextInput
          label="Nombre"
          size="xs"
          value={item.title}
          onChange={(event) =>
            onChange(item.id, { title: event.currentTarget.value })
          }
        />
        <TextInput
          label="URL"
          size="xs"
          value={item.url}
          onChange={(event) =>
            onChange(item.id, { url: event.currentTarget.value })
          }
        />
      </Stack>

      <VariantConfig
        item={item}
        onChange={onChange}
        options={[
          {
            label: "Card completa",
            description: "Icono, nombre y URL.",
            value: "link-card",
          },
          {
            label: "Card limpia",
            description: "Icono, nombre y URL sin contenedor.",
            value: "link-card-plain",
          },
          {
            label: "Icono card",
            description: "Solo icono con contenedor.",
            value: "link-icon",
          },
          {
            label: "Icono limpio",
            description: "Solo icono sin contenedor.",
            value: "link-icon-plain",
          },
          {
            label: "Tile",
            description: "Icono y texto verticales.",
            value: "link-tile",
          },
        ]}
      />
      <LinkIconConfig item={item} onChange={onChange} />
    </Stack>
  );
}
