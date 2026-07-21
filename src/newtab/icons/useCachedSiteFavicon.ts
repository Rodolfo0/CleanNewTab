import { useEffect, useState } from "react";
import { getCachedFavicon, saveCachedFavicon } from "./siteFaviconCache";
import { getSiteFaviconImageUrl, getSiteFaviconPageUrl } from "./siteFavicon";

function getRequestedSize(size: number) {
  const requestedSize = Math.max(16, Math.ceil(size));
  const buckets = [16, 32, 64, 128, 256, 512];
  return buckets.find((bucket) => bucket >= requestedSize) ?? requestedSize;
}

const sessionFaviconSources = new Map<
  string,
  { size: number; source: string }
>();

export function useCachedSiteFavicon(iconName: string | undefined, size: number) {
  const pageUrl = getSiteFaviconPageUrl(iconName);
  const requestedSize = getRequestedSize(size);
  const [cachedSource, setCachedSource] = useState<
    { pageUrl: string; source: string } | undefined
  >(() => {
    const sessionSource = pageUrl ? sessionFaviconSources.get(pageUrl) : undefined;

    return sessionSource && pageUrl
      ? { pageUrl, source: sessionSource.source }
      : undefined;
  });

  useEffect(() => {
    if (!pageUrl) {
      return;
    }

    const requestedPageUrl = pageUrl;
    let active = true;

    function showBlob(blob: Blob, resolvedSize: number) {
      const nextObjectUrl = URL.createObjectURL(blob);

      if (!active) {
        URL.revokeObjectURL(nextObjectUrl);
        return;
      }

      const sessionSource = sessionFaviconSources.get(requestedPageUrl);

      if (sessionSource && sessionSource.size >= resolvedSize) {
        URL.revokeObjectURL(nextObjectUrl);
        setCachedSource({ pageUrl: requestedPageUrl, source: sessionSource.source });
        return;
      }

      sessionFaviconSources.set(requestedPageUrl, {
        size: resolvedSize,
        source: nextObjectUrl,
      });
      setCachedSource({ pageUrl: requestedPageUrl, source: nextObjectUrl });
    }

    void (async () => {
      const sessionSource = sessionFaviconSources.get(requestedPageUrl);

      if (sessionSource) {
        setCachedSource({ pageUrl: requestedPageUrl, source: sessionSource.source });
        if (sessionSource.size >= requestedSize) {
          return;
        }
      }

      let cachedFavicon;

      try {
        cachedFavicon = await getCachedFavicon(requestedPageUrl);
        if (cachedFavicon?.blob.size) {
          showBlob(cachedFavicon.blob, cachedFavicon.size);
        }
      } catch {
        // The favicon can still be used for this session if IndexedDB is unavailable.
      }

      if (cachedFavicon && cachedFavicon.size >= requestedSize) {
        return;
      }

      const faviconUrl = getSiteFaviconImageUrl(iconName, requestedSize);
      if (!faviconUrl) {
        return;
      }

      try {
        const response = await fetch(faviconUrl);
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        if (!blob.size || !blob.type.startsWith("image/")) {
          return;
        }

        showBlob(blob, requestedSize);
        await saveCachedFavicon({
          blob,
          pageUrl: requestedPageUrl,
          size: requestedSize,
          updatedAt: Date.now(),
        });
      } catch {
        // Keep the cached favicon or the stable fallback while offline.
      }
    })();

    return () => {
      active = false;
    };
  }, [iconName, pageUrl, requestedSize]);

  return cachedSource?.pageUrl === pageUrl ? cachedSource?.source : undefined;
}
