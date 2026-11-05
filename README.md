# Lumina Studio

Private studio for Etsy product work: remove AI watermarks in the browser, generate mockups, write listing SEO, and pull a main keyword from a product thumbnail.

Sign-in is required. Watermark removal stays on the device. Auto-rename and mockup photo reading use Groq vision. Listing SEO, Keywords, and mockups use Cloudflare Workers AI — Qwen 3.8 27B for vision text, and Flux 2 Dev for product-reference images.

## Tools

| Tool | Path | What it does |
| --- | --- | --- |
| Watermark | `/` | Inspects C2PA Content Credentials, DALL·E provenance, EXIF, and XMP, then saves a metadata-free copy. The image is not uploaded. |
| Mockups | `/create` | Reads a product photo and generates 6 lifestyle mockups with Cloudflare Flux 2 Dev, keeping the product from the reference image. |
| SEO | `/seo` | Reads a clear product photo plus competitor titles, descriptions, and tags. Cloudflare Qwen returns a title (121–139 characters), a description, and up to 13 tags. An optional shop name is written into the description. Start with one competitor and use **Add competitor** for more, up to 8. |
| Keywords | `/keywords` | Analyzes a product thumbnail only with Cloudflare Qwen and returns the main search keyword plus a few related keywords. |
| Admin | `/admin` | Admins add and disable users, reset passwords, turn tools on or off, and review sign-in and tool activity. The account from `AUTH_USERNAME` is the first admin. |

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

`AUTH_SECRET` should be a long random string. `GROQ_API_KEY` powers auto-rename and mockup photo reading via Groq vision (`qwen/qwen3.8-27b`); get keys from the [Groq console](https://console.groq.com/keys), or save keys in Admin → Settings. `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` power listing SEO, Keywords (`@cf/qwen/qwen3.8-27b`), and Flux mockups via [Workers AI](https://developers.cloudflare.com/workers-ai/get-started/rest-api/), or save them in Admin → Settings.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

Production:

```bash
npm run build
npm run start
```

## Stack

- Next.js 15 (App Router) and React 19
- Tailwind CSS v4
- `@contentauth/c2pa-web` for local C2PA inspection
- Groq (`qwen/qwen3.8-27b`) for auto filename and mockup photo reading
- Cloudflare Workers AI Qwen 3.8 27B for listing SEO and Keywords
- Cloudflare Workers AI Flux 2 Dev for product-reference mockup images

## License

MIT
