# OAuth broker

This Cloudflare Worker keeps the Google OAuth web client secret outside the
published Chrome and Firefox extensions. It exchanges authorization codes and refreshes
access tokens; board data and wallpapers never pass through it.

## GitHub configuration

Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers Scripts edit access.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
- `FIREFOX_GOOGLE_CLIENT_ID`: Google OAuth web application client ID.
- `FIREFOX_GOOGLE_CLIENT_SECRET`: secret for that web application client.

The production Worker URL is committed as the build default. This optional
repository variable can override it without changing the source:

- `FIREFOX_OAUTH_BROKER_URL`: deployed origin without a trailing slash.

The same Google OAuth web client must authorize both exact redirect URIs:

```text
http://127.0.0.1/mozoauth2/e697e40c882940b0642dddbae923c59b0596f579
https://jannpabohegeiaechemkngjlhiabjjjn.chromiumapp.org/
```

The workflow deploys automatically when files under `worker/` change on `main`.
It can also be started manually from GitHub Actions.

## Local development

Create `worker/.dev.vars` (ignored by Git) with:

```dotenv
GOOGLE_CLIENT_ID=your-web-client-id
GOOGLE_CLIENT_SECRET=your-web-client-secret
```

Then run `npx wrangler dev --config worker/wrangler.toml`.
