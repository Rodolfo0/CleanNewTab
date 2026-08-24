import {
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import {
  AlignmentConfig,
  ConfigAccordion,
  LinkIconConfig,
  VariantConfig,
} from "../shared/configSections";
import type { ElementConfigProps } from "../shared/configTypes";
import {
  getItemDisplay,
  getItemIconSize,
  type GroupItem,
} from "../../model/boardItems";

export function GroupConfig({ item, onChange }: ElementConfigProps<GroupItem>) {
  const display = getItemDisplay(item);
  const effectiveIconSize = getItemIconSize(item);
  const isIconGroup =
    display.variant === "group-icons" ||
    display.variant === "group-icons-plain";
  const isCardGrid =
    display.variant === "group-grid" ||
    display.variant === "group-grid-no-header" ||
    display.variant === "group-grid-plain";
  const hasHeader =
    display.variant === "group-grid" ||
    display.variant === "group-grid-plain";

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
        options={
          isIconGroup
            ? [
                { label: "Íconos card", description: "Íconos con contenedor.", value: "group-icons" },
                { label: "Íconos limpios", description: "Íconos sin contenedor.", value: "group-icons-plain" },
              ]
            : [
                { label: "Lista sin header", description: "Lista sin encabezado.", value: "group-list-no-header" },
                { label: "Grid card", description: "Cards con encabezado.", value: "group-grid" },
                { label: "Grid sin header", description: "Cards sin encabezado.", value: "group-grid-no-header" },
                { label: "Cards sin fondo", description: "Grupo transparente con cards visibles.", value: "group-grid-plain" },
              ]
        }
      />
      {hasHeader ? (
        <ConfigAccordion title="Header" value="header">
          <Group grow align="end">
            <Switch
              size="xs"
              label="Mostrar ícono en el header"
              checked={display.showIcon}
              onChange={(event) =>
                onChange(item.id, {
                  display: {
                    ...display,
                    showIcon: event.currentTarget.checked,
                  },
                })
              }
            />
            {display.showIcon ? (
              <NumberInput
                label="Tamaño del ícono"
                size="xs"
                min={10}
                max={96}
                value={effectiveIconSize}
                onChange={(value) =>
                  onChange(item.id, {
                    display: {
                      ...display,
                      iconSize:
                        typeof value === "number" ? value : effectiveIconSize,
                      iconSizeLocked: true,
                    },
                  })
                }
              />
            ) : null}
          </Group>
          {display.showIcon ? (
            <LinkIconConfig item={item} onChange={onChange} />
          ) : null}
        </ConfigAccordion>
      ) : null}
      {isIconGroup ? (
        <ConfigAccordion title="Íconos" value="icons">
          <NumberInput
            label="Tamaño de los íconos"
            size="xs"
            min={10}
            max={96}
            value={effectiveIconSize}
            onChange={(value) =>
              onChange(item.id, {
                display: {
                  ...display,
                  iconSize:
                    typeof value === "number" ? value : effectiveIconSize,
                  iconSizeLocked: true,
                },
              })
            }
          />
        </ConfigAccordion>
      ) : null}
      {isCardGrid ? (
        <ConfigAccordion title="Cards" value="cards">
          <Group grow align="end">
            <NumberInput
              label="Ancho de card"
              size="xs"
              min={80}
              max={400}
              value={display.groupCardMinWidth}
              onChange={(value) =>
                onChange(item.id, {
                  display: {
                    ...display,
                    groupCardMinWidth:
                      typeof value === "number"
                        ? value
                        : display.groupCardMinWidth,
                  },
                })
              }
            />
            <NumberInput
              label="Alto mínimo de card"
              size="xs"
              min={32}
              max={200}
              value={display.groupCardMinHeight}
              onChange={(value) =>
                onChange(item.id, {
                  display: {
                    ...display,
                    groupCardMinHeight:
                      typeof value === "number"
                        ? value
                        : display.groupCardMinHeight,
                  },
                })
              }
            />
          </Group>
          <NumberInput
            label="Tamaño base de íconos"
            description="Los links pueden usar otro tamaño."
            size="xs"
            min={10}
            max={96}
            value={display.groupCardIconSize}
            onChange={(value) =>
              onChange(item.id, {
                display: {
                  ...display,
                  groupCardIconSize:
                    typeof value === "number"
                      ? value
                      : display.groupCardIconSize,
                },
              })
            }
          />
          <Stack gap={6}>
            <Text size="xs" fw={700}>Orientación del contenido</Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={display.groupCardContentDirection}
              data={[
                { value: "horizontal", label: "Horizontal" },
                { value: "vertical", label: "Vertical" },
              ]}
              onChange={(value) =>
                onChange(item.id, {
                  display: {
                    ...display,
                    groupCardContentDirection: value as "horizontal" | "vertical",
                  },
                })
              }
            />
          </Stack>
          <Stack gap={6}>
            <Text size="xs" fw={700}>Alineación del contenido</Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={display.groupCardContentAlign}
              data={[
                { value: "left", label: "Izq." },
                { value: "center", label: "Centro" },
                { value: "right", label: "Der." },
              ]}
              onChange={(value) =>
                onChange(item.id, {
                  display: {
                    ...display,
                    groupCardContentAlign: value as "left" | "center" | "right",
                  },
                })
              }
            />
          </Stack>
          <Stack gap={6}>
            <Text size="xs" fw={700}>Posición vertical</Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={display.groupCardContentPosition}
              data={[
                { value: "top", label: "Arriba" },
                { value: "center", label: "Centro" },
                { value: "bottom", label: "Abajo" },
              ]}
              onChange={(value) =>
                onChange(item.id, {
                  display: {
                    ...display,
                    groupCardContentPosition: value as "bottom" | "center" | "top",
                  },
                })
              }
            />
          </Stack>
          <Switch
            size="xs"
            label="Contenedor alrededor del ícono"
            checked={display.groupCardIconFrame}
            onChange={(event) =>
              onChange(item.id, {
                display: {
                  ...display,
                  groupCardIconFrame: event.currentTarget.checked,
                },
              })
            }
          />
        </ConfigAccordion>
      ) : null}
      <AlignmentConfig item={item} onChange={onChange} />
    </Stack>
  );
}
