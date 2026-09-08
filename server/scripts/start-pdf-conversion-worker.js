const { createPdfConversionWorker } = require('../src/pdfConversionWorker');

const host = String(process.env.PDF_WORKER_HOST || '127.0.0.1').trim();
const port = Number.parseInt(process.env.PDF_WORKER_PORT, 10) || 4317;
const app = createPdfConversionWorker();

app.listen(port, host, () => {
  console.log(`[pdf-worker] Microsoft Word conversion service listening on http://${host}:${port}`);
});
