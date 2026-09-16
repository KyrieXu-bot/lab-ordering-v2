function extractIntegerQuantity(value) {
  const normalized = String(value ?? '').normalize('NFKC');
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const quantity = Math.trunc(Number(match[0]));
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

module.exports = { extractIntegerQuantity };
