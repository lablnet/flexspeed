/**
 * Calculates the percentile of a list of values.
 * @param values - The list of values.
 * @param p - The percentile to calculate.
 * @returns The percentile of the list of values.
 */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  // Sort the values in ascending order.
  const sorted = [...values].sort((a, b) => a - b);
  // Calculate the index of the percentile.
  const index = (sorted.length - 1) * p;
  // Get the lower and upper values.
  const lower = Math.floor(index);
  // Calculate the percentile.
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

/**
 * Calculates the jitter of a list of values.
 * Jitter is the average difference between consecutive values in the list.
 * @param values - The list of values.
 * @returns The jitter of the list of values.
 */
export function jitter(values: number[]): number | null {
  if (values.length < 2) return null;
  return (
    // Calculate the average difference between consecutive values.
    values.slice(1).reduce((sum, value, i) => sum + Math.abs(value - values[i]), 0) /
    (values.length - 1)
  );
}

/**
 * Calculates the MBPS of a list of values.
 * MBPS is the number of bytes per second.
 * @param bytes - The number of bytes.
 * @param milliseconds - The list of milliseconds.
 * @returns The MBPS of the list of values.
 */
export function mbps(bytes: number, milliseconds: number): number {
  return milliseconds > 0 ? (bytes * 8) / milliseconds / 1000 : 0;
}
