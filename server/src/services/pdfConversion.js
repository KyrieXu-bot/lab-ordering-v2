const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(command)} 转换失败 (${code}): ${stderr || stdout}`));
    });
  });
}

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch (_) { return false; }
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function findSoffice() {
  const candidates = [
    process.env.SOFFICE_PATH,
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/opt/libreoffice/program/soffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
  ].filter(Boolean);
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return null;
}

async function convertWithLibreOffice(inputPath, outputPath) {
  const soffice = await findSoffice();
  if (!soffice) return false;
  const outputDir = path.dirname(outputPath);
  const profileDir = path.join(outputDir, `.lo-profile-${Date.now()}-${process.pid}`);
  await fs.mkdir(profileDir, { recursive: true });
  try {
    const profileUrl = `file:///${profileDir.replace(/\\/g, '/')}`;
    await run(soffice, [
      '--headless',
      `-env:UserInstallation=${profileUrl}`,
      '--convert-to', 'pdf',
      '--outdir', outputDir,
      inputPath
    ]);
    const generatedPath = path.join(outputDir, `${path.parse(inputPath).name}.pdf`);
    if (!(await exists(generatedPath))) throw new Error('LibreOffice 未生成 PDF 文件');
    if (generatedPath !== outputPath) await fs.rename(generatedPath, outputPath);
    return true;
  } finally {
    await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function convertWithWord(inputPath, outputPath, options = {}) {
  if (process.platform !== 'win32' || process.env.DISABLE_WORD_PDF === '1') return false;
  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'convert-docx-to-pdf.ps1');
  await run('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-InputPath', inputPath,
    '-OutputPath', outputPath
  ], { timeout: options.timeoutMs });
  return exists(outputPath);
}

async function convertWithRemoteService(inputPath, outputPath) {
  const serviceUrl = String(process.env.PDF_CONVERSION_SERVICE_URL || '').trim();
  if (!serviceUrl) return false;

  const apiKey = String(process.env.PDF_CONVERSION_SERVICE_KEY || '').trim();
  if (!apiKey) throw new Error('已配置 PDF_CONVERSION_SERVICE_URL，但缺少 PDF_CONVERSION_SERVICE_KEY');

  const timeoutMs = parsePositiveInteger(process.env.PDF_CONVERSION_SERVICE_TIMEOUT_MS, 120000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const source = await fs.readFile(inputPath);
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/convert`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'x-file-name': encodeURIComponent(path.basename(inputPath))
      },
      body: source,
      signal: controller.signal
    });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 1000);
      throw new Error(`远程 Word 转换服务返回 ${response.status}: ${details || response.statusText}`);
    }
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new Error('远程 Word 转换服务返回的内容不是有效 PDF');
    }
    await fs.writeFile(outputPath, pdfBuffer);
    return true;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`远程 Word 转换服务超时（${timeoutMs}ms）`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function convertDocxToPdf(inputPath, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const failures = [];
  try {
    if (await convertWithRemoteService(inputPath, outputPath)) return { engine: 'remote-microsoft-word' };
  } catch (error) {
    failures.push(error.message);
    if (process.env.PDF_CONVERSION_REMOTE_REQUIRED === '1') {
      throw Object.assign(new Error(`Windows PDF 转换节点不可用：${error.message}`), {
        code: 'PDF_REMOTE_ENGINE_UNAVAILABLE',
        status: 503
      });
    }
  }
  try {
    if (await convertWithLibreOffice(inputPath, outputPath)) return { engine: 'libreoffice' };
  } catch (error) { failures.push(error.message); }
  try {
    if (await convertWithWord(inputPath, outputPath)) return { engine: 'microsoft-word' };
  } catch (error) { failures.push(error.message); }
  throw Object.assign(
    new Error(`服务器无法将 Word 转换为 PDF。请安装 LibreOffice 并配置 SOFFICE_PATH。${failures.length ? ` 转换详情：${failures.join('；')}` : ''}`),
    { code: 'PDF_ENGINE_UNAVAILABLE', status: 503 }
  );
}

module.exports = { convertDocxToPdf, convertWithRemoteService, convertWithWord };
