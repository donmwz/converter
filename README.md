# Convertly

Convertly is a modern file conversion and document AI application built with Next.js. It converts documents, images, audio, video, archives, and HTML files; signed-in users can securely store and download their results again.

## Features

- Document, image, audio, video, ZIP, and HTML conversion
- Batch conversion for up to 20 same-format files with one ZIP result
- ZIP creation plus ZIP, RAR, and 7Z extraction through the isolated conversion worker
- PDF to DOCX, HTML, image, and text workflows
- DOCX, PowerPoint, Excel, CSV, and HTML to PDF through a conversion worker
- Document AI summaries, translations, table analysis, and document-scoped Q&A
- Six-digit registration verification and optional email two-factor login with Brevo
- User accounts, conversion history, data export, and account deletion
- AES-256-GCM encrypted result files in private S3 storage
- Optional browser-local privacy mode for supported conversions

## Architecture

- **Web application:** Next.js 16 and React 19
- **Database:** PostgreSQL/Supabase through Drizzle ORM
- **Object storage:** Private AWS S3 or an S3-compatible service
- **Document processing:** Railway-hosted LibreOffice, Poppler, OCR, and PDF analysis worker
- **AI:** OpenRouter; source files are parsed by Convertly and only extracted content is sent to the configured model
- **Transactional email:** Brevo API

## Local setup

Requirements: Node.js 20 or newer, npm, PostgreSQL, and optionally MinIO for local object storage.

```powershell
npm install
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

The application runs at [http://localhost:3001](http://localhost:3001).

## Environment variables

Use [.env.example](./.env.example) as the safe template. Never commit `.env.local` or real credentials.

- `DATABASE_URL`: pooled PostgreSQL connection string
- `S3_ENDPOINT`: optional custom endpoint; leave empty for AWS S3
- `S3_REGION`, `S3_BUCKET`: private bucket location
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`: least-privilege S3 credentials
- `FILE_ENCRYPTION_KEY`: 32-byte key encoded as 64 hexadecimal characters or Base64
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`: Document AI primary model settings
- `OPENROUTER_FALLBACK_MODELS`: comma-separated fallback models; defaults to OpenRouter's free router
- `BREVO_API_KEY`: Brevo API key, normally beginning with `xkeysib-`
- `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`: verified transactional sender
- `NEXT_PUBLIC_APP_URL`: public application URL
- `CONVERSION_SERVICE_URL`, `CONVERSION_SERVICE_TOKEN`: private conversion-worker endpoint and shared token

Generate a file-encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment

### Vercel

Deploy the Next.js application and add all required production environment variables as secrets. `CONVERSION_SERVICE_URL` must point to the Railway worker because Vercel does not provide LibreOffice or long-running document-processing binaries.

### Railway conversion worker

Deploy the same repository with its Dockerfile. Configure `CONVERSION_SERVICE_TOKEN` with the same secret used by Vercel. The worker contains the native tools required for Office, PDF, HTML, and OCR operations.

### Supabase

Use the pooled PostgreSQL connection string for serverless deployments and apply migrations before accepting registrations or conversion-history writes:

```bash
npm run db:migrate
```

### AWS S3

Use a private bucket with public access blocked. The IAM user should only have the object permissions required for that bucket. Convertly encrypts result bytes before upload and validates the authenticated owner before download.

### Brevo

Create an API key from **SMTP & API → API Keys**, verify the sender address, and set `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`. SMTP keys beginning with `xsmtpsib-` are not API keys.

## Security notes

- Passwords are hashed with bcrypt and never stored as plain text.
- Session tokens are hashed in the database and delivered through HTTP-only cookies.
- Users can enable email two-factor authentication; the session is created only after the six-digit, ten-minute login code is verified.
- Stored result files are encrypted separately for each user.
- Temporary source files are removed after server-side conversion.
- Environment files, Vercel metadata, generated runtimes, and build output are excluded from Git.
- Rotate any credential pasted into chat, logs, issues, or commit history.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
```

## License

No open-source license has been selected. All rights are reserved unless a license file is added.
