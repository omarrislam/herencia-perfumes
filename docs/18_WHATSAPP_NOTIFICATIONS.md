# WhatsApp order notifications

> ## ⛔ Cloud API is BLOCKED — do not retry this setup (2026-07-17)
>
> Business portfolio `1401383105229630` ("Herencia") was hit with a **Business
> restriction** on 11 Jul 2026 — *"prohibited from advertising, including app
> sharing"*. The review request came back **final**. App sharing is what links a
> developer app to a portfolio, and a WABA can only live under a portfolio, so
> the Cloud API can never be provisioned here. This is not a config problem and
> there is nothing to fix in the dashboard.
>
> A second, unrestricted portfolio (`1647810982950230`) exists, but rebuilding
> the same business's WhatsApp under it right after a permanent restriction is
> the pattern Meta enforces as circumvention — it risks that portfolio and the
> personal account too. **Don't.**
>
> Unofficial libraries (Baileys, whatsapp-web.js) were considered and rejected:
> they need an always-on process with persistent session storage, which the
> Vercel-deployed API cannot host, and they risk a ban on the store's actual
> phone number.
>
> **The live solution is the wa.me deep link** — see "Current approach" below.
> `waCloud.ts` and the rest of this doc are kept only in case the account
> situation ever changes.

## Current approach: wa.me deep links (live)

Admin → Orders → expand an order gives two links: **WhatsApp receipt** and
**WhatsApp "<status>" update**. Each opens WhatsApp with the message pre-filled
and addressed to the customer; the owner taps send. Free, no Meta approval, no
platform risk, reaches every customer (phone is required at checkout). The cost
is one tap per order — accepted deliberately at current volume, since wa.me
cannot auto-send by design.

Code: `apps/web/src/features/admin/whatsappMessage.ts` (+ tests). The message
copy mirrors the Cloud API templates below so the two can't drift.

If automation ever matters more than the channel, the escalation is email
(only reaches customers who supplied one — `email` is optional on orders) or an
Egyptian SMS gateway (reaches everyone, costs per message). Neither needs Meta.

## Dormant: official Cloud API

The API can send customers a WhatsApp **receipt on order** and an **update on
status change** via Meta's Cloud API. Env-gated: with no env vars set, nothing
is sent and nothing breaks — which is the permanent state today.

Code: `apps/api/src/lib/waCloud.ts` (called from order creation and the admin
status route).

## One-time Meta setup (~30 min)

1. **Meta Business Portfolio** — create one at business.facebook.com if you
   don't have it.
2. **Developer app** — developers.facebook.com → Create App → type "Business" →
   add the **WhatsApp** product.
3. **Phone number** — in WhatsApp → API Setup, add/verify the store's number.
   ⚠ The number must NOT be registered on the regular WhatsApp/Business app
   (delete the account there first, or use a new SIM). Copy the
   **Phone number ID** (not the number itself).
4. **Permanent access token** — Business Settings → Users → System users →
   create a system user (admin), assign the app + WhatsApp account, generate a
   token with `whatsapp_business_messaging` permission. (The API-Setup token
   expires in 24h — use a system-user token for production.)
5. **Register the two templates** below under WhatsApp Manager → Message
   templates (category **Utility**, language **English**). Approval is usually
   minutes.
6. **Business verification** (Business Settings → Security Centre) lifts the
   250-conversations/day starter limit — do it when volume grows.

## Templates to register (must match exactly 5 / 3 body variables)

**`order_receipt`** (Utility · en):

```
Thank you {{1}}! Your HERENCIA order {{2}} has been received.

Items: {{3}}
Total: {{4}} EGP
Payment: {{5}}

We'll keep you posted here.
```

**`order_status`** (Utility · en):

```
Hi {{1}}, an update on your HERENCIA order {{2}}: it {{3}}.
```

## Environment variables (API — set in Vercel `herencia-api` + local `.env`)

| Var | Example | Meaning |
| --- | --- | --- |
| `WA_PHONE_NUMBER_ID` | `123456789012345` | from WhatsApp → API Setup |
| `WA_ACCESS_TOKEN` | `EAAG…` | permanent system-user token |
| `WA_TEMPLATE_LANG` | `en` (default) | template language code |
| `WA_RECEIPT_TEMPLATE` | `order_receipt` (default) | override template name |
| `WA_STATUS_TEMPLATE` | `order_status` (default) | override template name |

## Cost

Utility template messages in Egypt ≈ **$0.0036 (~0.18 EGP)** each; messages sent
within 24h of the customer's last WhatsApp message to you are **free**. No
monthly fee. Billing is configured on the Meta app (add a payment method under
WhatsApp → Payment settings).
