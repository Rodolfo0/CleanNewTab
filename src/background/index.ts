import browser from "webextension-polyfill";

declare const __BROWSER__: "chrome" | "firefox";
declare const __OAUTH_BROKER_URL__: string;

const suggestionHosts = new Set([
  "ac.ecosia.org",
  "api.bing.com",
  "duckduckgo.com",
  "search.brave.com",
  "suggestqueries.google.com",
]);

const extensionApi = browser;
const driveFileName = "clean-new-tab-workspace-v1.json";
const driveWallpaperFileName = "clean-new-tab-wallpapers-v1.json";
const driveScope = "https://www.googleapis.com/auth/drive.appdata";
const driveStateKey = "clean-new-tab:drive-state:v1";
const googleAuthKey = "clean-new-tab:google-auth:v2";
const googleWebClientId =
  "413769723468-bd0fr5kit5iuelnlmf82or7dhbhc6i6i.apps.googleusercontent.com";
const oauthBrokerUrl = __OAUTH_BROKER_URL__;

type AuthState = {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
};

type GoogleTokenResponse = {
  access_token: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  refresh_token?: string;
};

type StoredDriveState = {
  connected: boolean;
  fileId?: string;
};

type DriveMessage = {
  type: string;
  deviceId?: string;
  expectedRevision?: number;
  force?: boolean;
  tabIcon?: string | null;
  url?: string;
  wallpapers?: unknown;
  workspace?: unknown;
};

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createRandomUrlSafeValue(size = 32) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function createCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

async function getGoogleAuthState(): Promise<AuthState | null> {
  const stored = await extensionApi.storage.local.get(googleAuthKey);
  const value: unknown = stored[googleAuthKey];
  if (
    !isRecord(value) ||
    typeof value.accessToken !== "string" ||
    typeof value.expiresAt !== "number" ||
    typeof value.refreshToken !== "string"
  ) {
    return null;
  }
  return value as AuthState;
}

async function setGoogleAuthState(value: AuthState) {
  await extensionApi.storage.local.set({ [googleAuthKey]: value });
}

async function clearGoogleAuthState() {
  await extensionApi.storage.local.remove(googleAuthKey);
}

function getOAuthRedirect() {
  const generatedRedirect = extensionApi.identity.getRedirectURL();
  if (__BROWSER__ === "chrome") {
    return generatedRedirect;
  }
  const subdomain = new URL(generatedRedirect).hostname.split(".")[0];
  if (!subdomain) {
    throw new Error("Firefox no pudo generar la URL de retorno de OAuth.");
  }
  return `http://127.0.0.1/mozoauth2/${subdomain}`;
}

function getOAuthBrokerTokenUrl() {
  return `${oauthBrokerUrl}/oauth/token`;
}

async function requestGoogleTokens(body: JsonObject): Promise<GoogleTokenResponse> {
  const response = await fetch(getOAuthBrokerTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value: unknown = await response.json().catch(() => ({}));
  if (!isRecord(value) || !response.ok || typeof value.access_token !== "string") {
    throw new Error(
      (isRecord(value) && typeof value.error_description === "string"
        ? value.error_description
        : undefined) ??
        (isRecord(value) && typeof value.error === "string"
          ? value.error
          : undefined) ??
        "No se pudo completar la autorización de Google.",
    );
  }
  return value as GoogleTokenResponse;
}

async function authorizeDrive() {
  const redirectUri = getOAuthRedirect();
  const verifier = createRandomUrlSafeValue(64);
  const state = createRandomUrlSafeValue();
  const challenge = await createCodeChallenge(verifier);
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    access_type: "offline",
    client_id: googleWebClientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    prompt: "consent select_account",
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

  const tokens = await requestGoogleTokens({
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
  await setGoogleAuthState(authState);
  return authState.accessToken;
}

async function getDriveToken(interactive: boolean) {
  const authState = await getGoogleAuthState();
  if (
    authState?.accessToken &&
    typeof authState.expiresAt === "number" &&
    authState.expiresAt > Date.now() + 60_000
  ) {
    return authState.accessToken;
  }

  if (typeof authState?.refreshToken === "string") {
    try {
      const tokens = await requestGoogleTokens({
        grantType: "refresh_token",
        refreshToken: authState.refreshToken,
      });
      await setGoogleAuthState({
        accessToken: tokens.access_token,
        expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
        refreshToken: tokens.refresh_token ?? authState.refreshToken,
      });
      return tokens.access_token;
    } catch {
      await clearGoogleAuthState();
      await setStoredDriveState({ connected: false });
    }
  }

  if (!interactive) {
    throw new Error("Vuelve a conectar Google Drive.");
  }
  const token = await authorizeDrive();
  await setStoredDriveState({ connected: true });
  return token;
}

async function getStoredDriveState(): Promise<StoredDriveState> {
  const stored = await extensionApi.storage.local.get(driveStateKey);
  const value: unknown = stored[driveStateKey];
  return isRecord(value) && typeof value.connected === "boolean"
    ? (value as StoredDriveState)
    : { connected: false };
}

async function setStoredDriveState(patch: Partial<StoredDriveState>) {
  const current = await getStoredDriveState();
  const next = { ...current, ...patch };
  await extensionApi.storage.local.set({ [driveStateKey]: next });
  return next;
}

async function driveFetch(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (response.status === 401) {
    await clearGoogleAuthState();
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

type DriveFile = {
  id: string;
  modifiedTime?: string;
  name?: string;
};

type DriveWorkspaceEnvelope = {
  format: "clean-new-tab-workspace";
  formatVersion: 1;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  workspace: unknown;
};

async function findDriveFile(token: string, fileName = driveFileName) {
  const query = encodeURIComponent(`name = '${fileName}' and trashed = false`);
  const fields = encodeURIComponent("files(id,name,modifiedTime)");
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=${fields}&pageSize=10`,
  );
  const body: unknown = await response.json();
  const files: DriveFile[] =
    isRecord(body) && Array.isArray(body.files)
      ? body.files.filter(
          (file): file is DriveFile =>
            isRecord(file) && typeof file.id === "string",
        )
      : [];

  return files.sort((left, right) =>
    String(right.modifiedTime).localeCompare(String(left.modifiedTime)),
  )[0] ?? null;
}

async function downloadDriveFile(
  token: string,
  fileId: string,
): Promise<DriveWorkspaceEnvelope> {
  const value = await downloadJsonFile(token, fileId);

  if (
    !isRecord(value) ||
    value.format !== "clean-new-tab-workspace" ||
    value.formatVersion !== 1 ||
    typeof value.revision !== "number" ||
    !Number.isInteger(value.revision) ||
    value.revision < 1 ||
    typeof value?.updatedAt !== "string" ||
    typeof value?.updatedBy !== "string" ||
    typeof value?.workspace !== "object" ||
    value.workspace === null
  ) {
    throw new Error("El archivo de Drive no tiene un formato válido.");
  }

  return value as DriveWorkspaceEnvelope;
}

async function downloadJsonFile(token: string, fileId: string): Promise<unknown> {
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
  );
  return response.json();
}

async function createDriveFile(
  token: string,
  envelope: unknown,
  fileName = driveFileName,
) {
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
  const value: unknown = await response.json();
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("Google Drive no devolvió el identificador del archivo.");
  }
  return { id: value.id };
}

async function updateDriveFile(token: string, fileId: string, envelope: unknown) {
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

async function loadDriveWallpapers(token: string) {
  const file = await findDriveFile(token, driveWallpaperFileName);
  if (!file) {
    return null;
  }

  const value = await downloadJsonFile(token, file.id);
  if (
    !isRecord(value) ||
    value.format !== "clean-new-tab-wallpapers" ||
    value.formatVersion !== 1 ||
    typeof value.wallpapers !== "object" ||
    value.wallpapers === null ||
    !(
      value.tabIcon === undefined ||
      value.tabIcon === null ||
      (typeof value.tabIcon === "string" &&
        value.tabIcon.length <= 700_000 &&
        (value.tabIcon === "" || value.tabIcon.startsWith("data:image/")))
    )
  ) {
    throw new Error("El archivo de recursos de Drive no tiene un formato válido.");
  }
  return {
    wallpapers: value.wallpapers,
    tabIcon: value.tabIcon,
  };
}

async function saveDriveWallpapers(
  token: string,
  wallpapers: unknown,
  tabIcon: string | null | undefined,
) {
  const value = {
    format: "clean-new-tab-wallpapers",
    formatVersion: 1,
    updatedAt: new Date().toISOString(),
    wallpapers,
    tabIcon: tabIcon ?? null,
  };
  const file = await findDriveFile(token, driveWallpaperFileName);
  if (file) {
    await updateDriveFile(token, file.id, value);
  } else {
    await createDriveFile(token, value, driveWallpaperFileName);
  }
  return { ok: true };
}

async function connectDrive(
  workspace: unknown,
  deviceId: string,
  localWallpapers: unknown,
  localTabIcon: string | null | undefined,
) {
  const token = await getDriveToken(true);
  const file = await findDriveFile(token);
  const remoteAssets = await loadDriveWallpapers(token);

  if (file) {
    const envelope = await downloadDriveFile(token, file.id);
    await setStoredDriveState({ connected: true, fileId: file.id });
    if (!remoteAssets && localWallpapers) {
      await saveDriveWallpapers(token, localWallpapers, localTabIcon);
    }
    return {
      ok: true,
      kind: "remote",
      envelope,
      wallpapers: remoteAssets?.wallpapers,
      tabIcon: remoteAssets?.tabIcon,
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
    await saveDriveWallpapers(token, localWallpapers, localTabIcon);
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
  const assets = await loadDriveWallpapers(token);
  await setStoredDriveState({ connected: true, fileId: file.id });
  return {
    ok: true,
    kind: "remote",
    envelope,
    wallpapers: assets?.wallpapers,
    tabIcon: assets?.tabIcon,
  };
}

async function saveDrive(
  workspace: unknown,
  deviceId: string,
  expectedRevision: number | undefined,
  force: boolean,
) {
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
  await clearGoogleAuthState();
  await setStoredDriveState({ connected: false, fileId: undefined });
  return { ok: true };
}

async function handleDriveMessage(message: DriveMessage) {
  if (message.type === "drive-status") {
    const state = await getStoredDriveState();
    return {
      ok: true,
      connected: state.connected === true,
      supported: true,
    };
  }

  if (message.type === "drive-connect") {
    return connectDrive(
      message.workspace,
      message.deviceId ?? "unknown-device",
      message.wallpapers,
      message.tabIcon,
    );
  }

  if (message.type === "drive-load") {
    return loadDrive();
  }

  if (message.type === "drive-save") {
    return saveDrive(
      message.workspace,
      message.deviceId ?? "unknown-device",
      message.expectedRevision,
      message.force === true,
    );
  }

  if (message.type === "drive-save-wallpapers") {
    const token = await getDriveToken(false);
    return saveDriveWallpapers(token, message.wallpapers, message.tabIcon);
  }

  if (message.type === "drive-disconnect") {
    return disconnectDrive();
  }

  return undefined;
}

async function handleSearchSuggestions(message: DriveMessage) {
  let suggestionUrl;
  try {
    suggestionUrl = new URL(message.url ?? "");
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

extensionApi.runtime.onMessage.addListener((rawMessage: unknown) => {
  if (!isRecord(rawMessage) || typeof rawMessage.type !== "string") {
    return undefined;
  }
  const message = rawMessage as DriveMessage;
  const task = message.type.startsWith("drive-")
    ? handleDriveMessage(message)
    : message.type === "search-suggestions" && typeof message.url === "string"
      ? handleSearchSuggestions(message)
      : undefined;

  if (!task) {
    return undefined;
  }

  return Promise.resolve(task).catch((error) => ({
    error: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
  }));
});
