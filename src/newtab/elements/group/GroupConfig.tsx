import { Divider, Stack, TextInput } from "@mantine/core";
import {
  IconSizeConfig,
  PresentationConfig,
  VariantConfig,
} from "../shared/configSections";
import type { ElementConfigProps } from "../shared/configTypes";
import type { GroupItem } from "../../model/boardItems";

export function GroupConfig({ item, onChange }: ElementConfigProps<GroupItem>) {
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
          { label: "Lista card", description: "Lista con encabezado.", value: "group-list" },
          { label: "Lista limpia", description: "Lista sin contenedor.", value: "group-list-plain" },
          { label: "Lista sin header", description: "Lista sin encabezado.", value: "group-list-no-header" },
          { label: "Grid card", description: "Links en tarjetas internas.", value: "group-grid" },
          { label: "Grid sin header", description: "Tarjetas sin encabezado.", value: "group-grid-no-header" },
          { label: "Iconos card", description: "Accesos rapidos con contenedor.", value: "group-icons" },
          { label: "Iconos limpios", description: "Accesos rapidos sin contenedor.", value: "group-icons-plain" },
        ]}
      />
      <PresentationConfig item={item} onChange={onChange} />
      <Divider />
      <IconSizeConfig item={item} onChange={onChange} />
    </Stack>
  );
}
