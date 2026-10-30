export const format = (value: number | null, decimals = 1): string =>
  value === null ? '—' : value.toFixed(decimals);

export const dataSize = (bytes: number): string =>
  bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
