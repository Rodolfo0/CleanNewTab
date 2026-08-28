import { useEffect, useRef } from "react";
import { Modal, Text } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react";
import {
  componentThemePresets,
  getComponentTheme,
  type ComponentThemeId,
  type ComponentThemePreset,
} from "../themes/componentThemes";

type ComponentThemeWindowProps = {
  onChange: (themeId: ComponentThemeId) => void;
  onClose: () => void;
  opened: boolean;
  themeId: ComponentThemeId;
};

const themeGroups = [
  {
    name: "Esenciales",
    ids: ["clean", "glass", "dark", "slate", "graphite"],
  },
  {
    name: "Colores",
    ids: ["sky", "indigo", "ocean", "violet", "mint", "emerald", "rose", "amber", "warm"],
  },
  {
    name: "Acabados",
    ids: ["blue-matte", "blue-pastel", "pastel-peach", "blue-metallic", "metallic-rose"],
  },
  {
    name: "Degradados",
    ids: [
      "gradient-aurora",
      "gradient-sunset",
      "gradient-ocean",
      "gradient-aurora-transparent",
      "gradient-sunset-transparent",
      "gradient-ocean-transparent",
    ],
  },
  {
    name: "Daily",
    ids: ["daily-purple", "daily-lime", "daily-coral"],
  },
] satisfies Array<{ ids: ComponentThemeId[]; name: string }>;

const presetById = new Map<ComponentThemeId, ComponentThemePreset>(
  componentThemePresets.map((preset) => [preset.id, preset]),
);

export function ComponentThemeWindow({
  onChange,
  onClose,
  opened,
  themeId,
}: ComponentThemeWindowProps) {
  const presetRefs = useRef<Partial<Record<ComponentThemeId, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (!opened) {
      return;
    }

    window.requestAnimationFrame(() => {
      presetRefs.current[themeId]?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    });
  }, [opened, themeId]);

  return (
    <Modal opened={opened} onClose={onClose} title="Tema de componentes" size={820} centered>
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex w-max items-start gap-5">
          {themeGroups.map((group) => (
            <section key={group.name} className="shrink-0">
              <Text size="xs" fw={800} className="mb-2 uppercase text-[#667085]">
                {group.name}
              </Text>
              <div className="grid grid-flow-col grid-rows-3 gap-3">
                {group.ids.map((presetId) => {
                  const preset = presetById.get(presetId);

                  if (!preset) {
                    return null;
                  }

                  const lightTheme = getComponentTheme(preset.id, "light");
                  const darkTheme = getComponentTheme(preset.id, "dark");
                  const isSelected = preset.id === themeId;

                  return (
                    <div
                      key={preset.id}
                      ref={(node) => {
                        presetRefs.current[preset.id] = node;
                      }}
                      className="w-40 overflow-hidden rounded-md border border-[#d0d5dd] bg-white"
                    >
                      <button
                        type="button"
                        className="relative block aspect-video w-full overflow-hidden"
                        onClick={() => onChange(preset.id)}
                        aria-label={`Seleccionar tema ${preset.name}`}
                      >
                        <span
                          className="absolute inset-0"
                          style={{
                            backgroundColor: lightTheme.style.backgroundColor,
                            backgroundImage: lightTheme.style.backgroundImage,
                          }}
                        />
                        <span
                          className="absolute inset-0"
                          style={{
                            backgroundColor: darkTheme.style.backgroundColor,
                            backgroundImage: darkTheme.style.backgroundImage,
                            clipPath: "polygon(58% 0, 100% 0, 100% 100%, 38% 100%)",
                          }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute left-[48%] top-[-12%] h-[124%] w-px bg-white/50"
                          style={{ transform: "rotate(12deg)" }}
                        />
                        <span
                          className="absolute bottom-3 left-3 right-3 rounded border px-2 py-1 text-left text-[10px] font-semibold shadow-sm"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.84)",
                            borderColor: lightTheme.style.borderColor,
                            color: lightTheme.style.searchInputTextColor,
                          }}
                        >
                          Aa
                        </span>
                        {isSelected ? (
                          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#12b886] text-white shadow-sm">
                            <CheckIcon size={15} weight="bold" />
                          </span>
                        ) : null}
                      </button>
                      <Text
                        size="xs"
                        fw={700}
                        className="truncate px-2 py-1.5 text-[#344054]"
                      >
                        {preset.name}
                      </Text>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
