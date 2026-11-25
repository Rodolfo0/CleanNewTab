import { Stack, Switch, TextInput } from "@mantine/core";
import {
  AlignmentConfig,
  ConfigAccordion,
  VariantConfig,
} from "../shared/configSections";
import type { ElementConfigProps } from "../shared/configTypes";
import type { SearchItem } from "../../model/boardItems";

export function SearchConfig({
  item,
  onChange,
}: ElementConfigProps<SearchItem>) {
  return (
    <Stack gap="md">
      <TextInput
        label="Placeholder"
        size="xs"
        value={item.placeholder}
        onChange={(event) =>
          onChange(item.id, { placeholder: event.currentTarget.value })
        }
      />
      <VariantConfig
        item={item}
        onChange={onChange}
        options={[
          { label: "Barra", description: "Input y botón en línea.", value: "search-bar" },
          { label: "Sin botón", description: "Solo input.", value: "search-input" },
          { label: "Mínima", description: "Input y botón sin contenedor.", value: "search-minimal" },
        ]}
      />

      <ConfigAccordion title="Comportamiento" value="behavior">
        <Switch
          size="xs"
          label="Mostrar sugerencias"
          checked={item.suggestionsEnabled !== false}
          onChange={(event) =>
            onChange(item.id, {
              suggestionsEnabled: event.currentTarget.checked,
            })
          }
        />
      </ConfigAccordion>
      <AlignmentConfig item={item} onChange={onChange} />
    </Stack>
  );
}
