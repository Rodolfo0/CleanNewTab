import { Text } from "@mantine/core";
import { BrandIcon } from "../icons/BrandIcon";
import {
  getBrandIconId,
  popularSites,
  type PopularSite,
} from "../icons/brandIconData";
import { CollapsibleSection } from "./CollapsibleSection";

export function PopularSitesList({
  onSelect,
}: {
  onSelect: (site: PopularSite) => void;
}) {
  return (
    <CollapsibleSection title="Sitios populares">
      <div className="grid grid-cols-4 gap-2">
        {popularSites.slice(0, 12).map((site) => (
          <button
            key={site.id}
            type="button"
            className="grid min-h-16 place-items-center gap-1 rounded-md border border-[#d0d5dd] bg-white px-2 py-2 text-center transition-colors hover:bg-[#f9fafb]"
            onClick={() => onSelect(site)}
          >
            <BrandIcon name={getBrandIconId(site.id)} size={20} />
            <Text size="xs" fw={700} className="w-full truncate text-[#344054]">
              {site.name}
            </Text>
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
}
