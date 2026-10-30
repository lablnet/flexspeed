import { browserConnectionSnapshot } from './browser-connection';

/** Capture available browser context, without requesting location permissions. */
export function clientMetadata(): Record<string, unknown> {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: [...navigator.languages],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: devicePixelRatio,
      colorDepth: screen.colorDepth,
    },
    connection: browserConnectionSnapshot(),
  };
}
