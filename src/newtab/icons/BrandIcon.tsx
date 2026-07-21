import {
  getPopularSiteByIcon,
  type PopularSite,
} from "./brandIconData";
import { PhosphorIcon } from "./phosphorIcons";
import { getSiteFaviconPageUrl } from "./siteFavicon";
import { useCachedSiteFavicon } from "./useCachedSiteFavicon";

export function BrandIcon({
  name,
  size,
}: {
  name?: string;
  size: number;
}) {
  const faviconPageUrl = getSiteFaviconPageUrl(name);
  const faviconImageUrl = useCachedSiteFavicon(name, size);
  const site: PopularSite | undefined = getPopularSiteByIcon(name);

  if (faviconPageUrl) {
    return (
      <span
        className="relative grid shrink-0 place-items-center"
        style={{ height: size, width: size }}
      >
        {faviconImageUrl ? (
          <img
            key={faviconImageUrl}
            src={faviconImageUrl}
            alt=""
            className="absolute inset-0 size-full object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
      </span>
    );
  }

  if (!site) {
    return <PhosphorIcon name={name} size={size} />;
  }

  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{ color: site.color, height: size, width: size }}
    >
      <PhosphorIcon name={site.icon} size={size} weight="fill" />
      <span className="sr-only">{site.name}</span>
    </span>
  );
}
