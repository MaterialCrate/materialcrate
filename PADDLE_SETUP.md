# Paddle setup for `materialcrate`

This repo is wired for **Paddle Billing** using:

- **Paddle.js overlay checkout** on the `web` app
- **server-side webhook verification** on the `server` app
- **Paddle customer portal** for payment method changes, invoices, and cancellations

Card details never touch your app server.

---

## 1) Environment variables to fill in

### `web/.env.local` for local development

```env
APP_BASE_URL=http://localhost:3000
GRAPHQL_ENDPOINT=http://localhost:4000/graphql

NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_PRO_PRICE_ID=
NEXT_PUBLIC_PADDLE_PREMIUM_PRICE_ID=
```

### Backend env (`server/.env` or Render service envs)

```env
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_PRO_PRICE_ID=
PADDLE_PREMIUM_PRICE_ID=
PADDLE_DEFAULT_CURRENCY=USD
```

> Keep `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` **server-only**.

---

## 2) What to create in Paddle

Use the **Sandbox** account first.

1. Create a **Pro** product
2. Create a **Premium** product
3. Create one recurring **monthly price** for each product
4. Copy the resulting `pri_...` price IDs into:
   - `NEXT_PUBLIC_PADDLE_PRO_PRICE_ID`
   - `NEXT_PUBLIC_PADDLE_PREMIUM_PRICE_ID`
   - `PADDLE_PRO_PRICE_ID`
   - `PADDLE_PREMIUM_PRICE_ID`
5. Create a **client-side token** and put it in:
   - `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
6. Create an **API key** with access to:
   - customers
   - subscriptions
   - transactions
   - customer portal sessions
   Put it in:
   - `PADDLE_API_KEY`
7. Create a **notification destination** for webhooks and subscribe at minimum to:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.activated`
   - `subscription.canceled`
   - `transaction.completed`
8. Copy the webhook endpoint secret key into:
   - `PADDLE_WEBHOOK_SECRET`

---

## 3) Webhook URLs

### Local dev

Paddle needs a public URL to hit your local backend webhook.

Use a tunnel such as **ngrok** or **Cloudflare Tunnel** to expose port `4000`.

Example with ngrok:

```bash
ngrok http 4000
```

Then set your Paddle sandbox webhook URL to:

```text
https://YOUR-NGROK-URL.ngrok-free.app/billing/paddle/webhook
```

### Production

Set the live webhook URL to:

```text
https://materialcrate-api.onrender.com/billing/paddle/webhook
```

---

## 4) Local testing flow

1. Start backend: `pnpm dev` in `server/`
2. Start web app: `pnpm dev` in `web/`
3. Open `http://localhost:3000/plans`
4. Log in to a test account
5. Click **Upgrade to Pro** or **Upgrade to Premium**
6. Complete checkout with Paddle sandbox test card:
   - Card number: `4242 4242 4242 4242`
   - Any future expiry date
   - Any valid CVC / ZIP
7. Watch the backend logs for webhook delivery
8. After webhook success, the user account should update to `pro` or `premium`

You can also use Paddle's **webhook simulator** to test without completing a full payment.

---

## 5) Production checklist

1. Swap all sandbox values for live values
2. Set `NEXT_PUBLIC_PADDLE_ENVIRONMENT=production`
3. Make sure your default payment link / domain is approved in Paddle
4. Set the live webhook URL
5. Redeploy `materialcrate-api`
6. Redeploy `materialcrate-web`

---

## 6) Billing behavior in this repo

- Plan selection happens on `/plans`
- Paid provisioning is done **only after verified Paddle webhooks**
- Billing management opens Paddle's hosted customer portal
- Subscription changes in Paddle sync back to the `User` record

This gives you strong control over access while keeping payment collection handled securely by Paddle.
