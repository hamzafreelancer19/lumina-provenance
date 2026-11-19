# Lumina Studio

Private studio for Etsy product work: remove AI watermarks in the browser, generate mockups, write listing SEO, and pull a main keyword from a product thumbnail.

Sign-in is required. Watermark removal stays on the device. Auto-rename, listing SEO, Keywords, and mockup photo reading use free Groq vision first (Cloudflare Qwen is backup). Mockups use Cloudflare Workers AI Flux — Klein by default to stay within the free neuron quota, with Flux 2 Dev on High when paid quota is available.

## Tools

| Tool | Path | What it does |
| --- | --- | --- |
| Watermark | `/` | Inspects C2PA Content Credentials, DALL·E provenance, EXIF, and XMP, then saves a metadata-free copy. The image is not uploaded. |
| Mockups | `/create` | Reads a product photo and generates 6 lifestyle mockups with Cloudflare Flux 2 Dev, keeping the product from the reference image. |
| SEO | `/seo` | Reads a clear product photo plus competitor titles, descriptions, and tags. Free Groq vision returns a title (121–139 characters), a description, and up to 13 tags (Cloudflare Qwen is backup). An optional shop name is written into the description. Start with one competitor and use **Add competitor** for more, up to 8. |
| Keywords | `/keywords` | Analyzes a product thumbnail with free Groq vision and returns the main search keyword plus related keywords (Cloudflare is backup). |
| Pricing | `/pricing` | Members can select a one-time credit pack, pay using the configured manual payment method, and submit a transaction ID or screenshot for admin review. |
| Profile | `/profile` | Members can update their display name and change their password. |
| Referrals | `/referrals` | Members can copy their invite link and track signup rewards from the profile dropdown. |
| Admin | `/admin` | Admins add and disable users, reset passwords, turn tools on or off, configure payment details, and review payment requests and studio activity. The account from `AUTH_USERNAME` is the first admin. |

## Setup

Node.js 18.18+ and npm.

Copy `.env.example` to `.env.local` and set:

```bash
AUTH_SECRET=
AUTH_USERNAME=
AUTH_PASSWORD=
GROQ_API_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

`AUTH_SECRET` should be a long random string. `GROQ_API_KEY` powers auto-rename, listing SEO, Keywords, and mockup photo reading via Groq vision (`qwen/qwen3.8-27b`); get keys from the [Groq console](https://console.groq.com/keys), or save keys in Admin → Settings. `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` power Flux mockups (and SEO/Keywords backup) via [Workers AI](https://developers.cloudflare.com/workers-ai/get-started/rest-api/). The free Workers AI plan is capped at **10,000 neurons/day** — upgrade to Workers Paid for heavier mockup use.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Credit payments

The pricing page offers one-time packs from **$0.55** to **$2.00**. Admins can create and edit plans, then activate or deactivate them under **Admin → Plans**; users only see active plans, and submitted payment requests use the active plan's current credit and price values. To enable payments, open **Admin → Settings → Manual payment method**, and enter the payment method name, recipient name, account/mobile number, and an optional HTTPS URL for the QR image. Users submit a transaction ID or a PNG/JPEG/WebP receipt image; credits are added only after an admin approves the request under **Admin → Payments**.

Payment requests, uploaded QR images, and receipt images use the app's local `data/` storage (or `/tmp` when `VERCEL` is set). `/tmp` is ephemeral and not shared across serverless instances, so this file-backed review workflow is suitable for local development or a host with persistent shared storage; a production serverless deployment needs a persistent database and file store before accepting real payments.

Referral links use a per-user code in `/register?ref=CODE`. When a new account is created through a valid link, both the new user and the inviter receive 300 bonus credits. Referral codes and rewards are stored in the same file-backed store, so production serverless deployments need persistent shared storage for reliable referrals.

Production:

```bash
npm run build
npm run start
```

## Stack

- Next.js 15 (App Router) and React 19
- Tailwind CSS v4
- `@contentauth/c2pa-web` for local C2PA inspection
- Groq (`qwen/qwen3.8-27b`) for auto filename, listing SEO, Keywords, and mockup photo reading
- Cloudflare Workers AI Qwen 3.8 27B as SEO/Keywords backup
- Cloudflare Workers AI Flux 2 Klein (default) / Flux 2 Dev (High) for product-reference mockups

## License

MIT
