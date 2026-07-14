# Owner purchase alerts (ntfy.sh)

The API pushes **you** (the owner) a phone notification the moment a customer
places a new order — order number, total, items, customer name/phone, and
payment method — via [ntfy.sh](https://ntfy.sh), a free push-notification
service. No account, no API key, no server to run. Env-gated: with no topic
set, nothing is sent and nothing breaks.

Code: `apps/api/src/lib/ntfy.ts` (called once from order creation).

## One-time setup (~5 min)

1. **Pick a secret topic name.** ntfy.sh topics are public and unauthenticated
   — anyone who knows the name can subscribe or publish to it — so treat it
   like a password. This project uses `herencia-orders-x2026`.
2. **Install the ntfy app**: [iOS](https://apps.apple.com/app/ntfy/id1625396347),
   [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy), or
   just open `https://ntfy.sh/app` in a browser. A CLI (`ntfy subscribe <topic>`)
   also works.
3. **Subscribe** to your topic in the app (+ → "Subscribe to topic").
4. **Test it**: `curl -d "test" https://ntfy.sh/<your-topic>` — confirm the
   notification arrives before wiring up the env var.

## Environment variable (API — set in Vercel `herencia-api` + local `.env`)

| Var | Example | Meaning |
| --- | --- | --- |
| `NTFY_TOPIC` | `herencia-orders-x2026` | your secret topic; unset = feature disabled |
| `NTFY_SERVER` | `https://ntfy.sh` (default) | override only if you later self-host ntfy |

## Notification content

- **Title**: `New order HRC-XXXX — EGP 450`
- **Body**: customer name + phone, each line item (`Name ×qty (size)`),
  payment line (`Cash on delivery` / `InstaPay — payment pending`)
- **Priority**: high (alerts/buzzes rather than a silent badge)
- **Tap target**: opens `<CLIENT_ORIGIN>/admin/orders` (no per-order deep link
  exists yet — the newest order is at the top of the list)

## Scope

Fires once per new order only (COD confirmed or InstaPay pending) — not on
later admin status changes. That's a separate, still-deferred notification
(see `docs/18_WHATSAPP_NOTIFICATIONS.md` for the customer-facing equivalent).
