import { Stack, Switch, TextInput } from "@mantine/core";

import {
  AlignmentConfig,
  ConfigAccordion,
  LinkIconConfig,
  VariantConfig,
} from "../shared/configSections";

import type { ElementConfigProps } from "../shared/configTypes";
import {
  getItemDisplay,
  normalizeUrl,
  parseNavigableUrl,
  type LinkItem,
} from "../../model/boardItems";

export function LinkConfig({ item, onChange }: ElementConfigProps<LinkItem>) {
  const urlResult = parseNavigableUrl(item.url);
  const display = getItemDisplay(item);
  const isIconOnly =
    display.variant === "link-icon" ||
    display.variant === "link-icon-plain";

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
          onBlur={(event) => {
            const result = parseNavigableUrl(event.currentTarget.value);
            if (result.ok) onChange(item.id, { url: normalizeUrl(result.url) });
          }}
          error={urlResult.ok ? undefined : urlResult.error}
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
      <ConfigAccordion title="Apariencia del ícono" value="icon">
        {!isIconOnly ? (
          <Switch
            size="xs"
            label="Mostrar ícono"
            checked={display.showIcon}
            onChange={(event) =>
              onChange(item.id, {
                display: { ...display, showIcon: event.currentTarget.checked },
              })
            }
          />
        ) : null}
        {display.showIcon ? (
          <LinkIconConfig item={item} onChange={onChange} />
        ) : null}
      </ConfigAccordion>
      <AlignmentConfig item={item} onChange={onChange} />
    </Stack>
  );
}
