const path = require('path');
const fs = require('fs').promises;

const commissionerSignaturesDirectory = path.resolve(
  __dirname,
  '..',
  '..',
  'assets',
  'commissioner-signatures'
);

function normalizeCommissionerId(value) {
  const normalized = String(value || '').trim();
  return /^[1-9]\d{0,19}$/.test(normalized) ? normalized : null;
}

function commissionerSignaturePath(commissionerId) {
  const normalized = normalizeCommissionerId(commissionerId);
  return normalized ? path.join(commissionerSignaturesDirectory, `${normalized}.png`) : null;
}

function isPngBuffer(buffer) {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.isBuffer(buffer) && buffer.length >= 24 && buffer.subarray(0, 8).equals(pngHeader);
}

async function commissionerSignatureExists(commissionerId) {
  const signaturePath = commissionerSignaturePath(commissionerId);
  if (!signaturePath) return false;
  try {
    await fs.access(signaturePath);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  commissionerSignaturesDirectory,
  normalizeCommissionerId,
  commissionerSignaturePath,
  commissionerSignatureExists,
  isPngBuffer
};
