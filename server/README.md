# lab-ordering-v2 Server

See root README for general setup.

## Environment configuration

Create the runtime files from the corresponding examples:

- `.env.local.example` -> `.env.local` for local development.
- `.env.prod.example` -> `.env.prod` for production.

The environment-specific `SAMPLE_FLOW_SCAN_URL` is loaded by the matching command:

- `npm run dev` or `npm run start:local`: `.env.local`
- `npm start` or `npm run start:prod`: `.env.prod`
