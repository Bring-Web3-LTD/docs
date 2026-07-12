<a href="https://bring.network/"><img width="150px" src="https://media.bringweb3.io/logos/logo_doc.png"/></a>

# Demo Store - Testing the Extension Popup

This document explains how to use Bring's **demo store** to test the extension popup end-to-end:

```
https://test.bringweb3.io/
```

The demo store simulates a real retailer. It lets you verify the full flow (popup activation, purchase, and reward attribution) without spending real money on a live merchant site.

---

## Prerequisites

Before testing, make sure you have:

- **Your extension installed**, with the [Bring Chrome extension kit](https://www.npmjs.com/package/@bringweb3/chrome-extension-kit) integrated.
- **A checkout password**, pre-provided by Bring. Checkout on the demo store is blocked without it.
- **A test budget**, preset by Bring. Each checkout draws from this budget, so use it accordingly.

If you are missing a password or budget, [contact us](https://bring.network/#contact).

---

## Test flow

### 1. Activate the popup

Navigate to [https://test.bringweb3.io/](https://test.bringweb3.io/). The extension popup should appear on the page. Activate the cashback offer through the popup.

### 2. Add a product to the cart

Browse the demo store and add any product to your cart.

### 3. Check out

Proceed to checkout. The checkout page includes an **Access password** field. Enter the **password provided by Bring** and click **Place order**.

This is a demo checkout; no payment is collected.

### 4. Verify the reward

After checking out, it may take **up to 5 minutes** for the reward to appear. You can verify it in either of two places:

- The **Cashback Portal** (see the [Cashback Portal integration guide](./cashback-portal.md)).
- The **Claim API**: the reward will show up in the `/v1/platforms/cache` response (see the [Claim API specification](./claim-api.md)).

---

## Running another test

Each checkout is tied to a single activation. To make another test purchase, **start the flow again from step 1** and reactivate the popup on the demo store before adding a product and checking out. If you attempt to check out again without a fresh activation, the store shows a notification saying an activation is needed.

Note that unless refreshed manually with a command, the activation popup reappears **2 hours after the last activation**.

---

For any questions, or to receive your checkout password and test budget, [contact us](https://bring.network/#contact)
