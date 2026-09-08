# lab-ordering-v2 Server

See root README for general setup.

## Environment configuration

Create the runtime files from the corresponding examples:

- `.env.local.example` -> `.env.local` for local development.
- `.env.prod.example` -> `.env.prod` for production.

The environment-specific `SAMPLE_FLOW_SCAN_URL` is loaded by the matching command:

- `npm run dev` or `npm run start:local`: `.env.local`
- `npm start` or `npm run start:prod`: `.env.prod`

## PDF conversion in production

Automatic PDF generation requires a server-side Word-to-PDF engine. LibreOffice is recommended for production services because Microsoft Word automation may fail when Node.js runs as a Windows service or a non-interactive account.

Install LibreOffice, set `SOFFICE_PATH` in `.env.prod` to the absolute path of `soffice`/`soffice.exe`, and restart the server process. PDF generation errors are logged with the prefix `[commission][generate-pdf] failed`, including the order number, failed stage, error code, and conversion details.

### Use a LAN Windows computer for Word-compatible PDFs

When the standard DOCX template must keep Microsoft fonts and Word pagination, a Windows computer can run the bundled conversion worker while the Ubuntu application server calls it over the LAN.

On Windows:

1. Install Microsoft Word and confirm that opening and exporting the template to PDF works manually.
2. Copy `.env.pdf-worker.example` to `.env.pdf-worker`.
3. Set `PDF_WORKER_HOST=0.0.0.0` and replace `PDF_WORKER_API_KEY` with a long random secret.
4. Run `npm run start:pdf-worker` from the `server` directory.
5. Allow inbound TCP port `4317` only from the Ubuntu server's LAN IP. Do not expose this port to the public Internet.

On Ubuntu, set these values in `.env.prod` and restart the application server:

```env
PDF_CONVERSION_SERVICE_URL=http://WINDOWS_LAN_IP:4317
PDF_CONVERSION_SERVICE_KEY=the_same_long_random_secret
PDF_CONVERSION_SERVICE_TIMEOUT_MS=120000
PDF_CONVERSION_REMOTE_REQUIRED=1
```

The worker requires bearer authentication, accepts at most 20MB by default, converts one document at a time, deletes temporary files after every request, and exposes an authenticated `GET /health` endpoint. With `PDF_CONVERSION_REMOTE_REQUIRED=1`, a worker outage returns a clear PDF-generation error instead of silently falling back to LibreOffice and producing a differently paginated document. Omit it or set it to `0` to retain the existing local fallback.

Test connectivity from Ubuntu before generating an order:

```bash
curl -H "Authorization: Bearer YOUR_SECRET" http://WINDOWS_LAN_IP:4317/health
```

For unattended startup, run the worker under the same dedicated Windows user that can successfully start Word. Avoid running it as `SYSTEM`, and keep Word first-run dialogs, activation prompts, and protected-view prompts resolved for that user.
