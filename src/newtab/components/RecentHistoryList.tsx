import { Button, Stack, Text } from "@mantine/core";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { BrandIcon } from "../icons/BrandIcon";
import {
  getBrandIconId,
  getPopularSiteByUrl,
} from "../icons/brandIconData";
import { useRecentHistory, type RecentHistoryItem } from "../hooks/useRecentHistory";
import { CollapsibleSection } from "./CollapsibleSection";

export function RecentHistoryList({
  onSelect,
}: {
  onSelect: (item: RecentHistoryItem, icon: string) => void;
}) {
  const { items, requestPermission, status } = useRecentHistory();

  return (
    <CollapsibleSection title="Recientes" onOpen={requestPermission}>
      <Stack gap={8}>
        {status === "permission-required" || status === "denied" ? (
          <Button
            variant="light"
            color="dark"
            size="compact-xs"
            onClick={requestPermission}
          >
            Mostrar recientes
          </Button>
        ) : null}

      {status === "loading" || status === "checking" ? (
        <Text size="xs" className="text-[#98a2b3]">Cargando...</Text>
      ) : null}
      {status === "unavailable" ? (
        <Text size="xs" className="text-[#98a2b3]">
          Disponible al instalar la extensión en Chrome.
        </Text>
      ) : null}
      {status === "error" ? (
        <Text size="xs" className="text-[#b42318]">No se pudo leer el historial.</Text>
      ) : null}
      {status === "denied" ? (
        <Text size="xs" className="text-[#98a2b3]">Permiso no concedido.</Text>
      ) : null}
      {status === "ready" && items.length === 0 ? (
        <Text size="xs" className="text-[#98a2b3]">Sin sitios recientes.</Text>
      ) : null}

      {items.length > 0 ? (
        <div className="max-h-48 overflow-auto rounded-md border border-[#eaecf0]">
          {items.map((item) => {
            const popularSite = getPopularSiteByUrl(item.url);
            const icon = popularSite
              ? getBrandIconId(popularSite.id)
              : "ClockCounterClockwiseIcon";

            return (
              <button
                key={`${item.id}-${item.url}`}
                type="button"
                className="flex w-full items-center gap-2 border-b border-[#eaecf0] px-2.5 py-2 text-left last:border-b-0 hover:bg-[#f9fafb]"
                onClick={() => onSelect(item, icon)}
              >
                {popularSite ? (
                  <BrandIcon name={icon} size={18} />
                ) : (
                  <ClockCounterClockwiseIcon size={18} className="shrink-0 text-[#667085]" />
                )}
                <span className="min-w-0 flex-1">
                  <Text size="xs" fw={600} className="truncate text-[#344054]">
                    {item.title}
                  </Text>
                  <Text size="xs" className="truncate text-[#98a2b3]">
                    {item.url}
                  </Text>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      </Stack>
    </CollapsibleSection>
  );
}
