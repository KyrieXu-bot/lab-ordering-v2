const path = require('path');
const fs = require('fs').promises;

const signaturesDirectory = path.resolve(__dirname, '..', '..', 'assets', 'electronic-signatures');

function normalizeUserId(userId) {
  const normalized = String(userId || '').trim();
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(normalized)) return null;
  return normalized;
}

function signaturePathForUser(userId) {
  const normalized = normalizeUserId(userId);
  return normalized ? path.join(signaturesDirectory, `${normalized}.png`) : null;
}

async function signatureExists(userId) {
  const signaturePath = signaturePathForUser(userId);
  if (!signaturePath) return false;
  try {
    await fs.access(signaturePath);
    return true;
  } catch (_) {
    return false;
  }
}

async function getSalespersonByPayer(queryable, payerId) {
  if (!payerId) return null;
  const [[row]] = await queryable.query(
    `SELECT u.user_id, u.account, u.name, u.email, u.phone
     FROM payers p
     JOIN users u ON u.user_id = p.owner_user_id
     WHERE p.payer_id = ? AND p.is_active = 1 AND u.is_active = 1
     LIMIT 1`,
    [payerId]
  );
  if (!row) return null;
  return { ...row, signature_available: await signatureExists(row.user_id) };
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function syncRequestSalesperson(queryable, requestPayload, options = {}) {
  const paymentId = requestPayload?.commissionData?.paymentId;
  const salesperson = await getSalespersonByPayer(queryable, paymentId);
  if (!salesperson) return null;

  const templateData = requestPayload.templateData || (requestPayload.templateData = {});
  const snapshot = requestPayload.formSnapshot || (requestPayload.formSnapshot = {});
  const signatureDate = options.refreshSignatureDate || !templateData.sales_signature_date
    ? formatLocalDate()
    : templateData.sales_signature_date;

  Object.assign(templateData, {
    sales_user_id: salesperson.user_id,
    sales_name: salesperson.name || '',
    sales_email: salesperson.email || '',
    sales_phone: salesperson.phone || '',
    sales_signature_date: signatureDate
  });
  Object.assign(snapshot, {
    salesUserId: salesperson.user_id,
    salesName: salesperson.name || '',
    salesEmail: salesperson.email || '',
    salesPhone: salesperson.phone || ''
  });
  if (snapshot.formData) {
    snapshot.formData.salesPerson = salesperson.account || '';
  }

  return salesperson;
}

module.exports = {
  signaturesDirectory,
  normalizeUserId,
  signaturePathForUser,
  signatureExists,
  getSalespersonByPayer,
  formatLocalDate,
  syncRequestSalesperson
};
