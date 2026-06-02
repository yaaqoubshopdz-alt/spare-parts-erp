/**
 * Invoice Number Generator.
 * Format: {TYPE}-{BRANCH_CODE}-{YYYY}-{NNNN}
 */

export type InvoiceType = 'VNT' | 'ACH' | 'TMN' | 'PAY' | 'EXP';

/**
 * Generates the next invoice number.
 * In production, the sequence number comes from a DB query:
 *   SELECT MAX(CAST(SUBSTR(invoice_number, -4) AS INTEGER)) + 1
 *   FROM table WHERE invoice_number LIKE '{type}-{branch}-{year}-%'
 */
export function generateInvoiceNumber(
  type: InvoiceType,
  branchCode: string,
  year: number,
  sequence: number
): string {
  const paddedSeq = String(sequence).padStart(4, '0');
  if (type === 'TMN' || type === 'PAY' || type === 'EXP') {
    return `${type}-${year}-${paddedSeq}`;
  }
  return `${type}-${branchCode}-${year}-${paddedSeq}`;
}
