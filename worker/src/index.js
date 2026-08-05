const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const maxRequestSize = 16_384;

function jsonResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isNonEmptyString(value, maximumLength = 8_192) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength
  );
}

function createGoogleTokenParameters(body, env) {
  if (body.grantType === "authorization_code") {
    const allowedRedirectUris = new Set([
      env.GOOGLE_CHROME_REDIRECT_URI,
      env.GOOGLE_FIREFOX_REDIRECT_URI,
    ]);
    if (
      !isNonEmptyString(body.code) ||
      !isNonEmptyString(body.codeVerifier) ||
      !isNonEmptyString(body.redirectUri) ||
      !allowedRedirectUris.has(body.redirectUri)
    ) {
      throw new Error("invalid_authorization_request");
    }
    return {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code: body.code,
      code_verifier: body.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: body.redirectUri,
    };
  }

  if (body.grantType === "refresh_token") {
    if (!isNonEmptyString(body.refreshToken)) {
      throw new Error("invalid_refresh_request");
    }
    return {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    };
  }

  throw new Error("unsupported_grant_type");
}

function sanitizeTokenResponse(body) {
  return {
    access_token: body.access_token,
    expires_in: body.expires_in,
    refresh_token: body.refresh_token,
    scope: body.scope,
    token_type: body.token_type,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return jsonResponse({}, 204);
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true });
    }
    if (request.method !== "POST" || url.pathname !== "/oauth/token") {
      return jsonResponse({ error: "not_found" }, 404);
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return jsonResponse({ error: "server_not_configured" }, 503);
    }

    const contentLength = Number(request.headers.get("Content-Length") ?? 0);
    if (contentLength > maxRequestSize) {
      return jsonResponse({ error: "request_too_large" }, 413);
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }

    let parameters;
    try {
      parameters = createGoogleTokenParameters(requestBody, env);
    } catch (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    let googleResponse;
    try {
      googleResponse = await fetch(googleTokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(parameters),
      });
    } catch {
      return jsonResponse({ error: "google_unavailable" }, 502);
    }

    const googleBody = await googleResponse.json().catch(() => ({}));
    if (!googleResponse.ok || !isNonEmptyString(googleBody.access_token)) {
      return jsonResponse(
        {
          error: googleBody.error ?? "token_exchange_failed",
          error_description:
            googleBody.error_description ?? "Google did not issue an access token.",
        },
        googleResponse.status >= 400 && googleResponse.status < 500 ? 400 : 502,
      );
    }

    return jsonResponse(sanitizeTokenResponse(googleBody));
  },
};
