const suggestionHosts = new Set([
  "ac.ecosia.org",
  "api.bing.com",
  "duckduckgo.com",
  "search.brave.com",
  "suggestqueries.google.com",
]);

const extensionApi = globalThis.browser ?? globalThis.chrome;
const driveFileName = "clean-new-tab-workspace-v1.json";
const driveWallpaperFileName = "clean-new-tab-wallpapers-v1.json";
const driveScope = "https://www.googleapis.com/auth/drive.appdata";
const driveStateKey = "clean-new-tab:drive-state:v1";
const firefoxGoogleAuthKey = "clean-new-tab:firefox-google-auth:v1";
const firefoxGoogleClientId =
  "413769723468-bd0fr5kit5iuelnlmf82or7dhbhc6i6i.apps.googleusercontent.com";
const firefoxOAuthBrokerUrl = "__FIREFOX_OAUTH_BROKER_URL__";

function encodeBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function createRandomUrlSafeValue(size = 32) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function createCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

async function getFirefoxAuthState() {
  const stored = await extensionApi.storage.local.get(firefoxGoogleAuthKey);
  return stored[firefoxGoogleAuthKey] ?? null;
}

async function setFirefoxAuthState(value) {
  await extensionApi.storage.local.set({ [firefoxGoogleAuthKey]: value });
}

async function clearFirefoxAuthState() {
  await extensionApi.storage.local.remove(firefoxGoogleAuthKey);
}

function getFirefoxLoopbackRedirect() {
  const generatedRedirect = extensionApi.identity.getRedirectURL();
  const subdomain = new URL(generatedRedirect).hostname.split(".")[0];
  if (!subdomain) {
    throw new Error("Firefox no pudo generar la URL de retorno de OAuth.");
  }
  return `http://127.0.0.1/mozoauth2/${subdomain}`;
}

function getFirefoxOAuthBrokerUrl() {
  if (firefoxOAuthBrokerUrl.startsWith("__")) {
    throw new Error("El servicio OAuth de Firefox no está configurado.");
  }
  return `${firefoxOAuthBrokerUrl}/oauth/token`;
}

async function requestFirefoxGoogleTokens(body) {
  const response = await fetch(getFirefoxOAuthBrokerUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok || typeof value.access_token !== "string") {
    throw new Error(
      value.error_description ??
        value.error ??
        "No se pudo completar la autorización de Google.",
    );
  }
  return value;
}

async function authorizeFirefoxDrive() {
  const redirectUri = getFirefoxLoopbackRedirect();
  const verifier = createRandomUrlSafeValue(64);
  const state = createRandomUrlSafeValue();
  const challenge = await createCodeChallenge(verifier);
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    access_type: "offline",
    client_id: firefoxGoogleClientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: driveScope,
    state,
  }).toString();

  const resultUrl = await extensionApi.identity.launchWebAuthFlow({
    interactive: true,
    url: authorizationUrl.toString(),
  });
  if (!resultUrl) {
    throw new Error("Google no devolvió el resultado de la autorización.");
  }

  const result = new URL(resultUrl);
  if (result.searchParams.get("state") !== state) {
    throw new Error("La respuesta OAuth no coincide con la solicitud original.");
  }
  const oauthError = result.searchParams.get("error");
  if (oauthError) {
    throw new Error(
      oauthError === "access_denied"
        ? "Se canceló el acceso a Google Drive."
        : `Google rechazó la autorización: ${oauthError}.`,
    );
  }
  const code = result.searchParams.get("code");
  if (!code) {
    throw new Error("Google no devolvió un código de autorización.");
  }

  const tokens = await requestFirefoxGoogleTokens({
    grantType: "authorization_code",
    code,
    codeVerifier: verifier,
    redirectUri,
  });
  if (typeof tokens.refresh_token !== "string") {
    throw new Error("Google no devolvió un permiso de acceso persistente.");
  }
  const authState = {
    accessToken: tokens.access_token,
    expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
    refreshToken: tokens.refresh_token,
  };
  await setFirefoxAuthState(authState);
  return authState.accessToken;
}

async function getFirefoxDriveToken(interactive) {
  const authState = await getFirefoxAuthState();
  if (
    authState?.accessToken &&
    typeof authState.expiresAt === "number" &&
    authState.expiresAt > Date.now() + 60_000
  ) {
    return authState.accessToken;
  }

  if (typeof authState?.refreshToken === "string") {
    try {
      const tokens = await requestFirefoxGoogleTokens({
        grantType: "refresh_token",
        refreshToken: authState.refreshToken,
      });
      await setFirefoxAuthState({
        accessToken: tokens.access_token,
        expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
        refreshToken: tokens.refresh_token ?? authState.refreshToken,
      });
      return tokens.access_token;
    } catch {
      await clearFirefoxAuthState();
      await setStoredDriveState({ connected: false });
    }
  }

  if (!interactive) {
    throw new Error("Vuelve a conectar Google Drive.");
  }
  return authorizeFirefoxDrive();
}

async function getStoredDriveState() {
  const stored = await extensionApi.storage.local.get(driveStateKey);
  return stored[driveStateKey] ?? { connected: false };
}

async function setStoredDriveState(patch) {
  const current = await getStoredDriveState();
  const next = { ...current, ...patch };
  await extensionApi.storage.local.set({ [driveStateKey]: next });
  return next;
}

async function getDriveToken(interactive) {
  if (typeof extensionApi.identity?.getAuthToken !== "function") {
    if (typeof extensionApi.identity?.launchWebAuthFlow === "function") {
      const token = await getFirefoxDriveToken(interactive);
      await setStoredDriveState({ connected: true });
      return token;
    }
    throw new Error("La sincronización con Drive no está disponible en este navegador.");
  }

  const result = await extensionApi.identity.getAuthToken({
    interactive,
    scopes: [driveScope],
  });
  const token = typeof result === "string" ? result : result?.token;

  if (!token) {
    throw new Error("Google no devolvió un token de acceso.");
  }

  await setStoredDriveState({ connected: true });
  return token;
}

async function driveFetch(token, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (response.status === 401) {
    if (typeof extensionApi.identity?.removeCachedAuthToken === "function") {
      await extensionApi.identity.removeCachedAuthToken({ token });
    } else {
      await clearFirefoxAuthState();
    }
    await setStoredDriveState({ connected: false });
    throw new Error("La autorización de Drive expiró. Vuelve a conectar Drive.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error?.message ? ` ${body.error.message}` : "";
    } catch {
      // The status code is enough when Google does not return JSON.
    }
    throw new Error(`Google Drive respondió con ${response.status}.${detail}`);
  }

  return response;
}

async function findDriveFile(token, fileName = driveFileName) {
  const query = encodeURIComponent(`name = '${fileName}' and trashed = false`);
  const fields = encodeURIComponent("files(id,name,modifiedTime)");
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=${fields}&pageSize=10`,
  );
  const body = await response.json();
  const files = Array.isArray(body.files) ? body.files : [];

  return files.sort((left, right) =>
    String(right.modifiedTime).localeCompare(String(left.modifiedTime)),
  )[0] ?? null;
}

async function downloadDriveFile(token, fileId) {
  const value = await downloadJsonFile(token, fileId);

  if (
    value?.format !== "clean-new-tab-workspace" ||
    value?.formatVersion !== 1 ||
    !Number.isInteger(value?.revision) ||
    value.revision < 1 ||
    typeof value?.updatedAt !== "string" ||
    typeof value?.updatedBy !== "string" ||
    typeof value?.workspace !== "object" ||
    value.workspace === null
  ) {
    throw new Error("El archivo de Drive no tiene un formato válido.");
  }

  return value;
}

async function downloadJsonFile(token, fileId) {
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
  );
  return response.json();
}

async function createDriveFile(token, envelope, fileName = driveFileName) {
  const boundary = `clean-new-tab-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: fileName,
    parents: ["appDataFolder"],
    mimeType: "application/json",
  });
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    JSON.stringify(envelope),
    `--${boundary}--`,
  ].join("\r\n");
  const response = await driveFetch(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return response.json();
}

async function updateDriveFile(token, fileId, envelope) {
  await driveFetch(
    token,
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    },
  );
}

async function loadDriveWallpapers(token) {
  const file = await findDriveFile(token, driveWallpaperFileName);
  if (!file) {
    return null;
  }

  const value = await downloadJsonFile(token, file.id);
  if (
    value?.format !== "clean-new-tab-wallpapers" ||
    value?.formatVersion !== 1 ||
    typeof value?.wallpapers !== "object" ||
    value.wallpapers === null
  ) {
    throw new Error("El archivo de fondos de Drive no tiene un formato válido.");
  }
  return value.wallpapers;
}

async function saveDriveWallpapers(token, wallpapers) {
  const value = {
    format: "clean-new-tab-wallpapers",
    formatVersion: 1,
    updatedAt: new Date().toISOString(),
    wallpapers,
  };
  const file = await findDriveFile(token, driveWallpaperFileName);
  if (file) {
    await updateDriveFile(token, file.id, value);
  } else {
    await createDriveFile(token, value, driveWallpaperFileName);
  }
  return { ok: true };
}

async function connectDrive(workspace, deviceId, localWallpapers) {
  const token = await getDriveToken(true);
  const file = await findDriveFile(token);
  const remoteWallpapers = await loadDriveWallpapers(token);

  if (file) {
    const envelope = await downloadDriveFile(token, file.id);
    await setStoredDriveState({ connected: true, fileId: file.id });
    if (!remoteWallpapers && localWallpapers) {
      await saveDriveWallpapers(token, localWallpapers);
    }
    return {
      ok: true,
      kind: "remote",
      envelope,
      wallpapers: remoteWallpapers ?? undefined,
    };
  }

  const envelope = {
    format: "clean-new-tab-workspace",
    formatVersion: 1,
    revision: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: deviceId,
    workspace,
  };
  const created = await createDriveFile(token, envelope);
  if (localWallpapers) {
    await saveDriveWallpapers(token, localWallpapers);
  }
  await setStoredDriveState({ connected: true, fileId: created.id });
  return { ok: true, kind: "created", envelope };
}

async function loadDrive() {
  const token = await getDriveToken(false);
  const file = await findDriveFile(token);
  if (!file) {
    return { ok: true, kind: "empty" };
  }
  const envelope = await downloadDriveFile(token, file.id);
  const wallpapers = await loadDriveWallpapers(token);
  await setStoredDriveState({ connected: true, fileId: file.id });
  return {
    ok: true,
    kind: "remote",
    envelope,
    wallpapers: wallpapers ?? undefined,
  };
}

async function saveDrive(workspace, deviceId, expectedRevision, force) {
  const token = await getDriveToken(false);
  const file = await findDriveFile(token);

  if (!file) {
    const envelope = {
      format: "clean-new-tab-workspace",
      formatVersion: 1,
      revision: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: deviceId,
      workspace,
    };
    const created = await createDriveFile(token, envelope);
    await setStoredDriveState({ connected: true, fileId: created.id });
    return { ok: true, kind: "saved", envelope };
  }

  const current = await downloadDriveFile(token, file.id);
  if (!force && current.revision !== expectedRevision) {
    return { ok: true, kind: "conflict", envelope: current };
  }

  const envelope = {
    format: "clean-new-tab-workspace",
    formatVersion: 1,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: deviceId,
    workspace,
  };
  await updateDriveFile(token, file.id, envelope);
  await setStoredDriveState({ connected: true, fileId: file.id });
  return { ok: true, kind: "saved", envelope };
}

async function disconnectDrive() {
  if (typeof extensionApi.identity?.clearAllCachedAuthTokens === "function") {
    await extensionApi.identity.clearAllCachedAuthTokens();
  } else {
    await clearFirefoxAuthState();
  }
  await setStoredDriveState({ connected: false, fileId: undefined });
  return { ok: true };
}

async function handleDriveMessage(message) {
  if (message.type === "drive-status") {
    const supported =
      typeof extensionApi.identity?.getAuthToken === "function" ||
      typeof extensionApi.identity?.launchWebAuthFlow === "function";
    if (!supported) {
      return { ok: true, connected: false, supported: false };
    }
    const state = await getStoredDriveState();
    return {
      ok: true,
      connected: state.connected === true,
      supported,
    };
  }

  if (message.type === "drive-connect") {
    return connectDrive(message.workspace, message.deviceId, message.wallpapers);
  }

  if (message.type === "drive-load") {
    return loadDrive();
  }

  if (message.type === "drive-save") {
    return saveDrive(
      message.workspace,
      message.deviceId,
      message.expectedRevision,
      message.force === true,
    );
  }

  if (message.type === "drive-save-wallpapers") {
    const token = await getDriveToken(false);
    return saveDriveWallpapers(token, message.wallpapers);
  }

  if (message.type === "drive-disconnect") {
    return disconnectDrive();
  }

  return undefined;
}

async function handleSearchSuggestions(message) {
  let suggestionUrl;
  try {
    suggestionUrl = new URL(message.url);
  } catch {
    throw new Error("URL de sugerencias invalida.");
  }

  if (
    suggestionUrl.protocol !== "https:" ||
    !suggestionHosts.has(suggestionUrl.hostname)
  ) {
    throw new Error("Proveedor de sugerencias no permitido.");
  }

  const response = await fetch(suggestionUrl.toString(), { credentials: "omit" });
  if (!response.ok) {
    throw new Error(`El proveedor respondio con ${response.status}.`);
  }
  return response.json();
}

extensionApi.runtime.onMessage.addListener((message) => {
  const task = message?.type?.startsWith("drive-")
    ? handleDriveMessage(message)
    : message?.type === "search-suggestions" && typeof message.url === "string"
      ? handleSearchSuggestions(message)
      : undefined;

  if (!task) {
    return undefined;
  }

  return Promise.resolve(task).catch((error) => ({
    error: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
  }));
});
