# ChatGPT Image Watermark Remover — TraceClear Studio

<p align="center">
  <strong>Private, browser-based tool to inspect and remove invisible ChatGPT / DALL-E 3 C2PA Content Credentials, AI provenance metadata, and EXIF tags locally with zero server uploads.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/WebAssembly-C2PA-6366f1?style=flat-square&logo=webassembly" alt="WebAssembly C2PA" />
  <img src="https://img.shields.io/badge/Privacy-100%25_Client--Side-10b981?style=flat-square" alt="100% Client-Side" />
</p>

---

## ⚡ Highlights

- **🔒 100% Private & Client-Side**: All file parsing, C2PA cryptographic signature verification, and canvas re-encoding execute locally in your browser. Zero image bytes or metadata ever touch a remote server.
- **🔍 Deep AI Provenance & Metadata Inspection**:
  - **C2PA Content Credentials**: Reads and validates cryptographic manifests via official WebAssembly engine (`@contentauth/c2pa-web`).
  - **DALL-E 3 & OpenAI Provenance**: Detects invisible AI watermarks and generator tags.
  - **EXIF & IPTC**: Parses camera metadata, device info, dates, and software tags.
  - **Adobe XMP & PNG Text Chunks**: Inspects editing history and embedded text tags.
- **✨ Clean Derivative Generation**: Generates a sanitized, metadata-free derivative raster image (JPEG, PNG, WebP) while keeping your original source file completely untouched.
- **🌗 Dark & Light Mode**: Built-in sleek dark and light themes with system preference detection and instant switching.
- **🔤 Modern Typography**: Inter, Plus Jakarta Sans, and JetBrains Mono for clean data readouts and high legibility.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.18+ or 20+ recommended)
- `npm` (or `pnpm` / `yarn`)

### 1. Clone & Install

```bash
git clone https://github.com/Mudassirdbs/chatgpt-image-watermark-remover.git
cd chatgpt-image-watermark-remover
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm run start
```

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **C2PA / Provenance Engine**: [@contentauth/c2pa-web](https://github.com/contentauth/c2pa-js) (Official C2PA WebAssembly SDK)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Typography**: Google Fonts (`Inter`, `Plus Jakarta Sans`, `JetBrains Mono`)

---

## 📄 License

MIT License — free for personal and commercial use.
