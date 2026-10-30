import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import font from '../assets/inter.bin';
import { posterSvg } from './template';
import type { PublicResult } from '../../shared/results';

let initialized: Promise<void> | undefined;

export async function renderPoster(result: PublicResult): Promise<Uint8Array> {
  initialized ??= initWasm(wasm).catch((error) => {
    initialized = undefined;
    throw error;
  });
  await initialized;
  const renderer = new Resvg(posterSvg(result), {
    font: {
      fontBuffers: [new Uint8Array(font)],
      defaultFontFamily: 'Inter',
      loadSystemFonts: false,
    },
  });
  const image = renderer.render();
  try {
    return image.asPng().slice();
  } finally {
    image.free();
    renderer.free();
  }
}
