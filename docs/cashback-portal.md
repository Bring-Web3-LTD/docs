<!-- AUTO-GENERATED FILE. DO NOT EDIT. -->
<!-- Synced from: https://github.com/Bring-Web3-LTD/cashbackPortal -->
<!-- Source: https://raw.githubusercontent.com/Bring-Web3-LTD/cashbackPortal/main/README.md -->

<a href="https://bring.network/"><img width="150px" src="https://media.bringweb3.io/logos/logo_doc.png"/></a>

# Cashback Portal: Partner Integration Guide

This document explains how partners can integrate the Bring **Cashback Portal** into their product.

There are two supported integration modes:

1. [**Hosted by Bring**](#option-1-hosted-by-bring): we host the portal; you provide an SDK hook so we can detect/connect the wallet and request a signature.
2. [**Self-hosted iframe**](#option-2-self-hosted-iframe): you embed the portal in an iframe inside your own page.

Pick the option that best fits your product. Both modes give the end user the same Cashback Portal experience.

> **Branding & styling.** In both modes, the portal's visual style (colors, logos, typography, etc.) is defined with you during onboarding and implemented by the Bring team. The `theme` parameter only switches between the **dark** and **light** variants of that defined style. It does not let you change the design at runtime.

---

## Prerequisites

Depending on the integration mode you choose, you may need:

- **`apiKey`** *(self-hosted iframe mode only)*: your partner API key, issued by Bring. Sent as the `x-api-key` header on the bootstrap call. 
- **`extensionId`** *(only if you also use the [Bring Chrome extension kit](https://www.npmjs.com/package/@bringweb3/chrome-extension-kit))*: the ID of **your own** Chrome extension (the one in which you installed the kit). This is **not** issued by Bring. It is used to correlate portal sessions with extension activity.

The hosted mode (Option 1) does not require an API key on your side.

---

## Option 1: Hosted by Bring

In this mode, Bring hosts the Cashback Portal web app for you.

The portal can be served from either:

- **A Bring domain** (`your-brand.bringweb3.io`): quickest to set up, no DNS work required.
- **A dedicated domain you own** (e.g. `cashback.your-brand.com`): you point a DNS record to our infrastructure and we serve the portal from your branded domain. Recommended if you want the portal to live under your own brand.

Reach out during onboarding to choose between the two and to coordinate DNS / certificates if you go with a dedicated domain.

Regardless of which domain is used, you only need to provide:

### 1. A wallet SDK / bridge

We need to be able to:

- **Detect the connected wallet address** of the current user, and be **notified when it changes** (connect, disconnect, or switch to a different account).
- **Prompt a wallet connection** if no wallet is connected yet.
- **Request a signature** for a message we provide (used to authenticate the user for claim requests).

Expose these capabilities to us through the SDK / interface we agree on during onboarding.

### 2. Theme (optional)

If your product supports multiple themes, tell us which one is active so the portal matches your UI:

- `theme: 'dark' | 'light'`

If you only have a single theme, you can skip this and we will use the default.

### 3. `extensionId` (only if using the [Bring Chrome extension kit](https://www.npmjs.com/package/@bringweb3/chrome-extension-kit))

If you also ship the Bring Chrome extension kit inside your own Chrome extension, send us your **`extensionId`** (the ID of your extension) upfront, together with the SDK details. We need it to correlate portal sessions with extension activity.

That is everything required for the hosted mode. No embedding, routing, or API calls on your side.

---

## Option 2: Self-hosted iframe

In this mode you embed the Cashback Portal inside your own page using an iframe.

**You do not provide any SDK to Bring.** The portal talks to your page through a small `postMessage` protocol; you keep using whatever wallet stack you already have (Casper Wallet, MetaMask, viem, ethers, …) and only need to:

- Call our bootstrap endpoint to get the `portalUrl` + a JWT, and again whenever the wallet or theme changes, then push the fresh JWT to the iframe with a single `SESSION_UPDATE` message.
- Listen for the portal's `LOGIN` / `SIGN_MESSAGE` messages, call your wallet, and `postMessage` the result back.

That is the entire contract. Steps 1–5 below walk through it.

### 1. Add the iframe

Render an iframe that fills its container:

```html
<iframe
  id="bring-cashback-portal"
  src=""
  style="width: 100%; height: 100%; border: 0;"
></iframe>
```

The `src` is set dynamically from the response of the bootstrap call below.

### 2. Bootstrap call (on page load)

On page load, call our portal bootstrap endpoint to obtain the iframe URL and an auth token.

**Endpoint**

```
POST https://api.bringweb3.io/v1/extension/check/portal
```

**Headers**

| Header        | Value                       |
| ------------- | --------------------------- |
| `x-api-key`   | Your partner API key        |
| `Content-Type`| `application/json`          |

**Body**

| Field         | Type                  | Required | Description                                                  |
| ------------- | --------------------- | -------- | ------------------------------------------------------------ |
| `extensionId` | `string`              | No       | Required only if you also use the [Bring Chrome extension kit](https://www.npmjs.com/package/@bringweb3/chrome-extension-kit). The ID of your own Chrome extension (the one in which you installed the kit). |
| `walletAddress` | `string \| null`    | Yes      | Connected wallet address, or `null` if unknown / not connected. |
| `theme`       | `'dark' \| 'light'`   | No       | The current theme of your app. Omit if you only support a single theme. |

**Example request**

```ts
const res = await fetch('https://api.bringweb3.io/v1/extension/check/portal', {
  method: 'POST',
  headers: {
    'x-api-key': PARTNER_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    extensionId: 'your-extension-id',
    walletAddress: currentWalletAddress ?? null,
    theme: currentTheme, // 'dark' | 'light'
  }),
});

const { portalUrl, token } = await res.json();
```

**Response**

```json
{
  "portalUrl": "https://portal.bringweb3.io/...",
  "iframeUrl": "https://portal.bringweb3.io/...",
  "token": "<jwt-or-opaque-token>"
}
```

| Field        | Type     | Use                                                                                              |
| ------------ | -------- | ------------------------------------------------------------------------------------------------ |
| `portalUrl`  | `string` | **Use this.** The URL to set as the iframe `src`. Includes the initial `token` as a query param. |
| `iframeUrl`  | `string` | **Legacy. Do not use in new integrations.** Kept only for backward compatibility with existing partner sites; will not receive new behavior and may eventually be removed. |
| `token`      | `string` | The JWT to use when re-syncing via `postMessage` (see [step 4](#4-re-sync-on-parameter-changes)). The same token is also embedded in `portalUrl`'s query string, so no separate `postMessage` is needed for the first load. |

### 3. Load the iframe

Set the iframe `src` to the returned `portalUrl`. The initial `token` is already embedded in the URL's query string, so the portal authenticates itself on load. **No `postMessage` is required for the first render.**

```ts
const iframe = document.getElementById('bring-cashback-portal') as HTMLIFrameElement;
iframe.src = portalUrl;
```

### 4. Re-sync on parameter changes

Whenever any of the inputs change (the user **connects / disconnects / switches wallet**, or the **theme** changes), call the bootstrap endpoint again with the updated values to get a fresh, wallet-bound JWT, and post it to the iframe in a single `SESSION_UPDATE` message:

```ts
async function refreshPortal({ walletAddress, theme }) {
  const res = await fetch('https://api.bringweb3.io/v1/extension/check/portal', {
    method: 'POST',
    headers: {
      'x-api-key': PARTNER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      extensionId: 'your-extension-id',
      walletAddress: walletAddress ?? null,
      theme,
    }),
  });

  const { token } = await res.json();

  iframe.contentWindow?.postMessage(
    { to: 'bringweb3', action: 'SESSION_UPDATE', token },
    new URL(iframe.src).origin,
  );
}
```

The portal verifies the new token server-side and pulls the updated `walletAddress` (and any other session info) from the verify response. Do **not** change the iframe `src` again; just post the refreshed `token`.

> Always pass the explicit target origin to `postMessage` (do not use `'*'`).

### 5. Handle wallet messages from the portal

When the user clicks **Connect** or **Claim** inside the portal, the iframe posts a message **up** to your page asking the wallet to act. Your page is responsible for listening to those messages, calling into **your own** wallet (whatever SDK you already use, Bring is not involved), and posting the result back.

All messages from the portal carry `from: 'bringweb3'`. All messages your page sends back must carry `to: 'bringweb3'`.

**Messages from the portal → your page**

| `action`         | Payload                                                  | What it means                                                                                  |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `LOGIN`          | `{}`                                                     | The user clicked **Connect**. Trigger your wallet's connect flow.                              |
| `SIGN_MESSAGE`   | `{ messageToSign, amount, tokenSymbol }`                 | The user wants to claim. Ask the wallet to sign `messageToSign`.                               |
| `POPUP_CLOSED`   | `{}`                                                     | A modal inside the portal was dismissed. Informational; nothing required.                      |

**Messages from your page → the portal** (sent via `iframe.contentWindow.postMessage(..., portalOrigin)`)

| `action`                | Payload                              | When to send                                                                                       |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `SESSION_UPDATE`        | `{ token }`                          | After a successful connect, after a disconnect, or whenever the active wallet or theme changes. The `token` is the fresh JWT from a `check/portal` call made with the new values. The portal re-verifies the token and pulls the new `walletAddress` / `theme` / etc. from the verify response. Do **not** put `walletAddress` in the message. |
| `SIGNATURE`             | `{ signature, key, message }`        | After the wallet successfully signs a `SIGN_MESSAGE` request.                                      |
| `ABORT_SIGN_MESSAGE`    | `{}`                                 | If the user rejects the signature prompt or the signing flow fails.                                |

**Minimal listener**

```ts
const portalOrigin = new URL(iframe.src).origin;

window.addEventListener('message', async (event) => {
  if (event.data?.from !== 'bringweb3' || !event.data.action) return;

  switch (event.data.action) {
    case 'LOGIN': {
      const address = await wallet.connect(); // your wallet SDK
      // Refresh the JWT for the new wallet, then push it to the portal.
      const token = await refreshToken(address);
      iframe.contentWindow?.postMessage(
        { to: 'bringweb3', action: 'SESSION_UPDATE', token },
        portalOrigin,
      );
      break;
    }

    case 'SIGN_MESSAGE': {
      try {
        const { signature, key } = await wallet.signMessage(event.data.messageToSign);
        iframe.contentWindow?.postMessage(
          { to: 'bringweb3', action: 'SIGNATURE', signature, key, message: event.data.messageToSign },
          portalOrigin,
        );
      } catch {
        iframe.contentWindow?.postMessage(
          { to: 'bringweb3', action: 'ABORT_SIGN_MESSAGE' },
          portalOrigin,
        );
      }
      break;
    }
  }
});
```

> `refreshToken(address)` is the same `check/portal` call from [step 4](#4-re-sync-on-parameter-changes) called with the new wallet address; it returns the JWT to forward.

---

For any questions or to receive your API key, [contact us](https://bring.network/#contact)
