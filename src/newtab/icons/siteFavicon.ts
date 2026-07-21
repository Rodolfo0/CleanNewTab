export const siteFaviconPrefix = "favicon:";

export function getSiteFaviconIconId(url: string) {
  const trimmedUrl = url.trim();
  const pageUrl = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return `${siteFaviconPrefix}${pageUrl}`;
}

export function getSiteFaviconPageUrl(iconName?: string) {
  return iconName?.startsWith(siteFaviconPrefix)
    ? iconName.slice(siteFaviconPrefix.length)
    : undefined;
}

export function getSiteFaviconImageUrl(iconName: string | undefined, size: number) {
  const pageUrl = getSiteFaviconPageUrl(iconName);

  if (!pageUrl) {
    return undefined;
  }

  try {
    const hostname = new URL(pageUrl).hostname;
    const faviconUrl = new URL("https://geticon.dev/");
    faviconUrl.searchParams.set("url", hostname);
    faviconUrl.searchParams.set("size", String(Math.max(16, Math.round(size))));

    return faviconUrl.toString();
  } catch {
    return undefined;
  }
}

export async function requestSiteFaviconPermission() {
  return true;
}
