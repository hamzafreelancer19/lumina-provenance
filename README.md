# Lumina Studio

Private studio for Etsy product work: remove AI watermarks in the browser, generate mockups with Grok, and write listing SEO from a product photo and competitor listings.

Sign-in is required. Watermark removal stays on the device. Mockups and listing SEO call the xAI Grok API and are billed to that account.

## Tools

| Tool | Path | What it does |
| --- | --- | --- |
| Watermark | `/` | Inspects C2PA Content Credentials, DALL·E provenance, EXIF, and XMP, then saves a metadata-free copy. The image is not uploaded. |
| Mockups | `/create` | Places a product photo into 1–6 background photos and generates 6 Etsy mockups with Grok Imagine. |
| SEO | `/seo` | Reads a clear product photo plus competitor titles, descriptions, and tags. Grok returns a title (121–139 characters), a description, and up to 13 tags. An optional shop name is written into the description. Start with one competitor and use **Add competitor** for more, up to 8. |

## Setup

Node.js 18.18+ and npm.

Copy `.env.example` to `.env.local` and set:

```bash
AUTH_SECRET=
AUTH_USERNAME=
AUTH_PASSWORD=
XAI_API_KEY=
```

`AUTH_SECRET` should be a long random string. `XAI_API_KEY` is required for Mockups and SEO. Get it from the [xAI console](https://console.x.ai/).

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
- Grok (`grok-4`) for listing SEO and mockup planning
- Grok Imagine for mockup images

## License

MIT
