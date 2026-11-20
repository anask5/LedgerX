/**
 * Format a number in Indian Rupee format.
 * formatINR(123456.78) → "₹1,23,456.78"
 */
export function formatINR(amount: number): string {
  const [whole, decimal] = Math.abs(amount).toFixed(2).split('.');

  // Indian number system: last 3, then groups of 2
  let result = '';
  const len = whole.length;

  if (len <= 3) {
    result = whole;
  } else {
    result = whole.slice(-3);
    let remaining = whole.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
  }

  const prefix = amount < 0 ? '-₹' : '₹';
  return `${prefix}${result}.${decimal}`;
}
