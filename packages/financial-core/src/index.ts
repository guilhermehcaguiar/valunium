/** Storage contract matching PostgreSQL NUMERIC(38,12). No arithmetic or I/O. */
export const DECIMAL_SCALE = 12;
export const DECIMAL_PRECISION = 38;

export function normalizeDecimal(value: string): string {
  if (typeof value !== 'string' || !/^-?(0|[1-9]\d*)(\.\d{1,12})?$/.test(value)) {
    throw new TypeError('Expected a decimal string with at most 12 fractional digits');
  }
  const negative = value.startsWith('-');
  const [integer = '', fraction = ''] = (negative ? value.slice(1) : value).split('.');
  if (integer.length > DECIMAL_PRECISION - DECIMAL_SCALE) {
    throw new RangeError('Decimal exceeds NUMERIC(38,12)');
  }
  const digits = `${integer}.${fraction.padEnd(DECIMAL_SCALE, '0')}`;
  return negative && /[1-9]/.test(digits) ? `-${digits}` : digits;
}
