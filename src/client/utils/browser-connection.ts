export interface BrowserConnection extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function getBrowserConnection(): BrowserConnection | undefined {
  return (navigator as Navigator & { connection?: BrowserConnection }).connection;
}

/** Preserve unavailable values rather than guessing Wi-Fi, 5G or measured speed. */
export function browserConnectionSnapshot() {
  const connection = getBrowserConnection();
  if (!connection) return null;
  return {
    type: connection.type ?? null,
    effectiveType: connection.effectiveType ?? null,
    downlink: connection.downlink ?? null,
    rtt: connection.rtt ?? null,
    saveData: connection.saveData ?? null,
  };
}

export function connectionTypeLabel(type: string | null | undefined): string {
  const labels: Record<string, string> = {
    wifi: 'Wi-Fi',
    ethernet: 'Ethernet',
    cellular: 'Cellular',
    bluetooth: 'Bluetooth',
    wimax: 'WiMAX',
    none: 'Offline',
    other: 'Other',
  };
  return type ? (labels[type] ?? 'Unavailable') : 'Unavailable';
}
