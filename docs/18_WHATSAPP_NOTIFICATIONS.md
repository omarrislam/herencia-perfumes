# WhatsApp order notifications (official Cloud API)

The API sends customers a WhatsApp **receipt when they place an order** and an
**update whenever the order status changes**, using Meta's official WhatsApp
Business Cloud API. Everything is env-gated: with no env vars set, nothing is
sent and nothing breaks.

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
