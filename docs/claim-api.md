<a href="https://bring.network/"><img width="150px" src="https://media.bringweb3.io/logos/logo_doc.png"/></a>
# Claim API - Partner Integration Specification

This document describes how partner platforms integrate with Bring's **Claim API** to allow end users to withdraw (claim) their accumulated token balance to a destination wallet.

The claim flow is a **two-step process**, preceded by a balance lookup:

0. **`/cache`** - Fetch the user's currently claimable balances to display in the UI.
1. **`/claim-init`** - Server prepares a message that the user must sign with their wallet. Funds are verified to be available.
2. **`/claim-submit`** - Partner submits the signed message; server validates the signature, locks the funds, executes the on-chain (or exchange) transfer, and records the claim.

All endpoints live under the `platforms` API.

---

## Base URL & Authentication

```
POST https://api.bringweb3.io/v1/platforms/cache
POST https://api.bringweb3.io/v1/platforms/claim-init
POST https://api.bringweb3.io/v1/platforms/claim-submit
```

> **Server-to-server only.** All endpoints in this document MUST be called from the partner's backend, never directly from a browser or mobile client. Partner credentials authenticate the platform, not the end user, and must never be exposed to user-side code. The partner backend is expected to:
>
> - Authenticate the end user against its own session/account system.
> - Resolve the user's `walletAddress` server-side.
> - Proxy the request to Bring, attaching the partner credentials.
> - Forward only the `messageToSign` and the final response back to the client.
>
> CORS is not enabled for these endpoints; direct browser calls will be rejected.

All requests must include the `x-api-key` header with the API key issued to your platform. The server derives `platformId` and `platformName` from this credential - they must **not** be sent in the request body.

Content type: `application/json`.

---

## Displaying claimable balances - `POST /v1/platforms/cache`

Before initiating a claim, partners call `/cache` to show the user their **currently claimable balance** (`eligible`), pending rewards still maturing (`totalPendings`), and historical activity (`movements`). This is the first request in the claim flow.

The values returned in `eligible[].tokenSymbol` and `eligible[].tokenAmount` are exactly what should be passed as `tokenSymbol` / `tokenAmount` to `/claim-init`.

### Request body

| Field            | Type     | Required | Description                                                                          |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------------------ |
| `walletAddress`  | `string` | yes      | The user's wallet address.                                                           |
| `dateFormat`     | `string` | no       | Locale/format hint used when rendering `movements[].history[].description`.          |
| `currencyFormat` | `string` | no       | Currency hint used when rendering monetary parts of `description`.                   |

### Example request

```http
POST /v1/platforms/cache HTTP/1.1
Host: api.bringweb3.io
Content-Type: application/json
x-api-key: <partner-api-key>

{
  "walletAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "dateFormat": "en-US",
  "currencyFormat": "USD"
}
```

### Success response - `200 OK`

```json
{
  "tokenIconBasePath": "https://media.bringweb3.io/tkns/1",
  "retailerIconBasePath": "https://media.bringweb3.io/retailers",
  "data": {
    "eligible": [
      {
        "tokenSymbol": "USDC",
        "tokenName": "USD Coin",
        "tokenAmount": 12.5,
        "minimumClaimThreshold": 1,
        "tokenIconPath": "/usdc.png",
        "tokenInUsd": 1.0,
        "totalEstimatedUsd": 12.5
      }
    ],
    "totalPendings": [
      {
        "tokenSymbol": "USDC",
        "tokenAmount": 3.2,
        "minimumClaimThreshold": 1,
        "tokenIconPath": "/usdc.png",
        "tokenInUsd": 1.0,
        "totalEstimatedUsd": 3.2
      }
    ],
    "movements": {
      "claims": [
        {
          "tokenSymbol": "USDC",
          "tokenAmount": 8.0,
          "targetWalletAddress": "0xA0b8...eB48",
          "txId": "0x9a8c...77ef",
          "createdAt": "2026-04-12T10:15:30.000Z"
        }
      ],
      "deals": [
        {
          "tokenSymbol": "USDC",
          "tokenAmount": 1.25,
          "status": "pending",
          "tokenIconPath": "/usdc.png",
          "tokenInUsd": 1.0,
          "totalEstimatedUsd": 1.25,
          "eligibleDate": "2026-05-25T00:00:00.000Z",
          "history": [
            {
              "date": "2026-04-30",
              "action": "PURCHASE",
              "description": "Purchase at Retailer X for $25.00",
              "correctedParams": []
            }
          ]
        }
      ]
    }
  }
}
```

### Response fields

Top level:

| Field                  | Type     | Description                                                                                |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `tokenIconBasePath`    | `string` | Base URL for token icons. Concatenate with `eligible[].tokenIconPath` to get the full URL. |
| `retailerIconBasePath` | `string` | Base URL for retailer icons.                                                               |
| `data.eligible`        | `array`  | Tokens the user **can claim right now**. Use these to populate the claim UI.               |
| `data.totalPendings`   | `array`  | Sum of pending (not-yet-eligible) rewards, grouped by `tokenSymbol`.                       |
| `data.movements.claims` | `array` | Past claim transactions performed by this wallet.                                          |
| `data.movements.deals`  | `array` | Per-purchase reward records, including `pending`, `completed`, and `cancelled`.            |

`eligible[]` item fields:

| Field                   | Type      | Description                                                                  |
| ----------------------- | --------- | ---------------------------------------------------------------------------- |
| `tokenSymbol`           | `string`  | Token ticker. Pass to `/claim-init` as `tokenSymbol`.                        |
| `tokenName`             | `string`  | Human-readable token name (e.g. `"USD Coin"`).                               |
| `tokenAmount`           | `number`  | Claimable balance in human units. Pass to `/claim-init` as `tokenAmount`.    |
| `minimumClaimThreshold` | `number`  | Minimum amount the user must accumulate before the claim button is enabled.  |
| `tokenIconPath`         | `string`  | **Deprecated.** Append to `tokenIconBasePath` for the icon URL. Will be removed in a future version - construct the icon URL from `tokenSymbol` instead. |
| `tokenInUsd`            | `number \| null` | Spot price of 1 token in USD (or `null` if rate unavailable).         |
| `totalEstimatedUsd`     | `number \| null` | `tokenAmount * tokenInUsd`, for convenience.                          |

`totalPendings[]` item fields - same shape as `eligible[]` except `tokenName` is not included.

`movements.deals[].status` values: `"pending"`, `"completed"`, `"cancelled"`.

### Error responses

| Status | `error`                | When                                |
| ------ | ---------------------- | ----------------------------------- |
| 400    | `Missing walletAddress` | `walletAddress` is missing.        |
| 400    | (raw error)            | Database / processing failure.     |

```json
{
  "status": 400,
  "error": "Missing walletAddress",
  "message": "The walletAddress value is missing. Please check your request body."
}
```

### Typical UI flow

1. Call `/cache` with the connected wallet.
2. For each entry in `data.eligible`, render a row with `tokenAmount` and `totalEstimatedUsd`. Enable the **Claim** button only when `tokenAmount >= minimumClaimThreshold`.
3. When the user clicks Claim, pass that row's `tokenSymbol` and `tokenAmount` directly into `/claim-init`.
4. After a successful `/claim-submit`, re-fetch `/cache` to refresh balances and append the new entry to `movements.claims`.

---

## Step 1 - `POST /v1/platforms/claim-init`

Validates that the wallet has sufficient claimable balance and returns the canonical **message-to-sign**. The exact returned string (including its random nonce) must be presented to the user's wallet for signing and echoed back verbatim in `claim-submit`.

### Request body

| Field                 | Type     | Required | Description                                                                 |
| --------------------- | -------- | -------- | --------------------------------------------------------------------------- |
| `walletAddress`       | `string` | yes      | The user's wallet address - the source of funds and signer.                 |
| `targetWalletAddress` | `string` | yes      | Destination wallet address for the transfer (usually equal to `walletAddress`). |
| `tokenSymbol`         | `string` | yes      | Token ticker (e.g. `USDC`, `ADA`). Case-insensitive; normalized to upper case. |
| `tokenAmount`         | `number` | yes      | Amount the user wants to claim, in the token's standard (human) units.      |

### Example request

```http
POST /v1/platforms/claim-init HTTP/1.1
Host: api.bringweb3.io
Content-Type: application/json
x-api-key: <partner-api-key>

{
  "walletAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "targetWalletAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "tokenSymbol": "USDC",
  "tokenAmount": 12.5
}
```

### Success response - `200 OK`

```json
{
  "messageToSign": "k3Jd9aQpVcLm1xN0yZbF7eRtUiHsGqWv\n\nSend 12.5 USDC to wallet address:\n0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
}
```

- `messageToSign` - the **exact** string to pass to the user's wallet (`personal_sign` / `eth_signTypedData` for EVM, equivalent for other chains). It begins with a 32-character random nonce followed by `\n\n` and the human-readable claim statement.

> **Important:** Do not modify, trim, or re-construct this string. The server hashes it as-is to look up the request. Any whitespace or character change will cause `claim-submit` to fail.

### Error responses

| Status | `error`                      | When                                                            |
| ------ | ---------------------------- | --------------------------------------------------------------- |
| 400    | `Missing values`             | One or more required fields are missing.                        |
| 422    | `Insufficient funds`         | Wallet's claimable balance is less than `tokenAmount`. Body also includes `requiredPayment` and `currentBalance`. Typically caused by the user (or another partner session) having claimed in parallel between the time the UI was loaded and this call. |
| 409    | `Conflict: duplicate requestId` | An identical pending request already exists.                 |
| 500    | `Internal Server Error`      | Unexpected server failure.                                      |

Insufficient-funds example:

```json
{
  "status": 422,
  "error": "Insufficient funds",
  "message": "The user does not have enough funds to complete the transfer",
  "requiredPayment": 12.5,
  "currentBalance": 4.27
}
```

> **Note on `Insufficient funds`:** the balance shown in `/cache` is a snapshot. If the same user has another tab/session open, or if a previous claim was already submitted from another partner integration, the funds may have been spent or locked by the time `/claim-init` runs. The server re-checks availability at init time and returns `422` with the **current** `currentBalance`. The partner UI should treat this as a recoverable state: re-call `/cache` to refresh the displayed balance and let the user retry with the updated amount.

---

## Step 2 - User signs the message

The partner frontend must request a signature from the user's wallet over the **exact** `messageToSign` string returned in step 1.

EVM (ethers.js) example:

```ts
const signature = await signer.signMessage(messageToSign);
```

---

## Step 3 - `POST /v1/platforms/claim-submit`

Submits the signed message. The server:

1. Hashes `message` and looks up the pending request created in `claim-init`.
2. Verifies the signature against `walletAddress`.
3. Atomically validates availability and **locks** the funds.
4. Executes the transfer (on-chain or exchange).
5. Records the claim and clears the lock.

### Request body

| Field                 | Type     | Required | Description                                                                 |
| --------------------- | -------- | -------- | --------------------------------------------------------------------------- |
| `message`             | `string` | yes      | The exact `messageToSign` returned by `claim-init`.                         |
| `signature`           | `string` | yes      | The user's signature over `message`.                                        |
| `walletAddress`       | `string` | yes      | Same value sent in `claim-init`. Must match the signer.                     |
| `targetWalletAddress` | `string` | yes      | Same value sent in `claim-init`.                                            |
| `tokenSymbol`         | `string` | yes      | Same value sent in `claim-init`.                                            |
| `tokenAmount`         | `number` | yes      | Same value sent in `claim-init`.                                            |
| `key`                 | `string` | conditional | Required only for certain chains. Send it when the user's wallet/chain needs it for the transfer (see chain-specific notes); omit otherwise. |

### Example request

```http
POST /v1/platforms/claim-submit HTTP/1.1
Host: api.bringweb3.io
Content-Type: application/json
x-api-key: <partner-api-key>

{
  "message": "k3Jd9aQpVcLm1xN0yZbF7eRtUiHsGqWv\n\nSend 12.5 USDC to wallet address:\n0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "signature": "0x7d3f...c91b",
  "walletAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "targetWalletAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "tokenSymbol": "USDC",
  "tokenAmount": 12.5,
  "key": "9f1b0e54-7c2a-4f7e-a3d2-7b9a1e2c4d56"
}
```

### Success response - `202 Accepted`

```json
{
  "status": 202,
  "message": "Accepted",
  "txId": "0x9a8c...77ef"
}
```

| Field     | Type     | Notes                                                                       |
| --------- | -------- | --------------------------------------------------------------------------- |
| `status`  | `number` | Always `202` for accepted claims.                                           |
| `message` | `string` | Always `"Accepted"`.                                                        |
| `txId`    | `string` | On-chain transaction hash, if the transfer was on-chain. May be omitted.    |
| `txCbor`  | `string` | Present only for chains that return a CBOR-encoded tx.       |

A `202` means the transfer has been **accepted and dispatched**. Final on-chain inclusion should still be monitored via `txId`.

### Error responses

| Status | `error` / `reason`             | When                                                                                          |
| ------ | ------------------------------ | --------------------------------------------------------------------------------------------- |
| 401    | `Unauthorized` (`wallet_address_mismatch`) | The signing wallet does not match the wallet on the original `claim-init` request. |
| 409    | `duplicate request`            | This `message` has already been submitted and processed.                                       |
| 422    | `insufficient_funds`           | Balance dropped below `tokenAmount` between init and submit. Includes `requiredPayment`, `currentBalance`. |
| 422    | other availability `reason`    | E.g. request not found, request expired, mismatch on token / amount / target.                 |
| 500    | `Server Error` / `Internal Server Error` | Transfer or persistence failed. Locked funds are automatically released.            |

Example mismatch error:

```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Unauthorized",
  "detail": "wallet_address_mismatch"
}
```

Example insufficient funds error at submit time:

```json
{
  "status": 422,
  "error": "insufficient_funds",
  "message": "Insufficient funds",
  "requiredPayment": 12.5,
  "currentBalance": 4.27
}
```

---

## End-to-end example (TypeScript)

```ts
async function claim(signer, params) {
  const base = "https://api.bringweb3.io/v1/platforms";
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": PARTNER_API_KEY,
  };

  // 1. Init
  const initRes = await fetch(`${base}/claim-init`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      walletAddress: params.walletAddress,
      targetWalletAddress: params.targetWalletAddress,
      tokenSymbol: params.tokenSymbol,
      tokenAmount: params.tokenAmount,
    }),
  }).then(r => r.json());

  if (!initRes.messageToSign) throw new Error(JSON.stringify(initRes));

  // 2. Sign (EVM example)
  const signature = await signer.signMessage(initRes.messageToSign);

  // 3. Submit
  const submitRes = await fetch(`${base}/claim-submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: initRes.messageToSign,
      signature,
      walletAddress: params.walletAddress,
      targetWalletAddress: params.targetWalletAddress,
      tokenSymbol: params.tokenSymbol,
      tokenAmount: params.tokenAmount,
      key: params.key,
    }),
  }).then(r => r.json());

  return submitRes; // { status: 202, message: "Accepted", txId: "..." }
}
```

---

## Operational notes & best practices

- **Pass `messageToSign` byte-for-byte.** The server identifies the request by hashing this string.
- **Send `tokenAmount` as a number, not a string**, and use the same value in init and submit. Mismatches are rejected.
- **`tokenSymbol` is case-insensitive** (normalized to upper case server-side). Use `USDC`, `usdc`, etc.
- **Retries:** if `claim-submit` returns `5xx` or network-fails *after* the server may have started the transfer, do **not** silently retry with a new `claim-init`. Re-submit the same `message` + `signature`; the server is idempotent and will return `409 duplicate request` if it already processed it.
- **Concurrent claims for the same wallet + token** are not supported - funds are locked during processing. Submit serially.
- **Timeouts:** allow at least 30s for `claim-submit`, as it waits for transfer dispatch.

---

## Status code summary

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| 200  | `claim-init` succeeded - `messageToSign` returned.                      |
| 202  | `claim-submit` accepted - transfer dispatched.                          |
| 400  | Missing or malformed request fields.                                    |
| 401  | Signature / wallet mismatch on submit.                                  |
| 409  | Duplicate request (same hashed message already exists / processed).     |
| 422  | Business validation failed (insufficient funds, mismatch, etc.).        |
| 500  | Unexpected server error. Locked funds are released automatically.       |
