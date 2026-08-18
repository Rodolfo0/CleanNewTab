export type NavigableUrlResult =
  | { ok: true; url: string }
  | { error: string; ok: false };

const EXPLICIT_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function parseNavigableUrl(value: string): NavigableUrlResult {
  const input = value.trim();

  if (!input) {
    return { error: "Ingresa una URL.", ok: false };
  }

  if (EXPLICIT_SCHEME.test(input)) {
    const protocol = input.slice(0, input.indexOf(":") + 1).toLowerCase();
    if (!ALLOWED_PROTOCOLS.has(protocol)) {
      return { error: "Solo se permiten URLs http o https.", ok: false };
    }
  }

  const candidate = input.startsWith("//")
    ? `https:${input}`
    : EXPLICIT_SCHEME.test(input)
      ? input
      : `https://${input}`;

  try {
    const parsed = new URL(candidate);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
      return { error: "Ingresa una URL http o https válida.", ok: false };
    }

    return { ok: true, url: parsed.toString() };
  } catch {
    return { error: "Ingresa una URL válida.", ok: false };
  }
}

export function isNavigableUrl(value: string) {
  return parseNavigableUrl(value).ok;
}

export function getNavigableUrlError(value: string) {
  const result = parseNavigableUrl(value);
  return result.ok ? undefined : result.error;
}
