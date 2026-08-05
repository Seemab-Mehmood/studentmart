# Student Mart (SMart)

Campus marketplace app — Explore Marketplace, Digital Shop (Merchant Portal), and Admin & Commission Control, built with Next.js 14 + Tailwind CSS + lucide-react. Currently runs on mock data (see `app/page.js`); wire it up to Supabase/Stripe using `SMart-Architecture-Spec.md` when you're ready to go live.

## Deploy to Render

**Option A — Blueprint (fastest)**
1. Push this folder to a GitHub repo.
2. In Render: **New → Blueprint**, connect the repo. Render will read `render.yaml` and configure the service automatically.
3. Click **Apply** — first deploy takes ~2–3 minutes.

**Option B — Manual Web Service**
1. Push this folder to a GitHub repo (or use Render's "Public Git repository" option).
2. In Render: **New → Web Service** → connect the repo.
3. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Node version:** 18.18+ (set `NODE_VERSION=20.11.1` under Environment if needed)
4. Click **Create Web Service**.

Render sets `$PORT` automatically — `npm run start` already binds to it (`next start -p $PORT`).

## Local development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Project structure

```
app/
  layout.js       root layout, loads global styles + fonts
  page.js         the full 3-tab SMart app (client component)
  globals.css     Tailwind + font imports + design tokens
tailwind.config.js
postcss.config.js
next.config.js
render.yaml       Render Blueprint config
```

## Next steps toward production
See `SMart-Architecture-Spec.md` for the full Supabase schema, RLS policies, Stripe Connect fee flow, and API route plan referenced by this UI.
