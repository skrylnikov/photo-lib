import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import sharp, { type Sharp } from 'sharp';

import { boundedSharpInputOptions } from './formats';

const execFileAsync = promisify(execFile);

export const requiredCodecCapabilities = [
  'input:hevc',
  'output:hevc',
  'input:avif',
  'output:avif',
  'output:jxl',
  'output:webp',
  'output:jpeg',
] as const;

export type CodecCapability = (typeof requiredCodecCapabilities)[number];
export type CodecCapabilities = Record<CodecCapability, boolean>;

const decodePixels = async (value: Uint8Array): Promise<void> => {
  await sharp(value, boundedSharpInputOptions()).resize({ width: 2, height: 2, fit: 'inside' }).raw().toBuffer();
};

const attempt = async (capability: CodecCapability, operation: () => Promise<void>): Promise<boolean> => {
  try {
    await operation();
    return true;
  } catch (error) {
    if (process.env.CODEC_PROBE_DEBUG === '1') {
      console.warn(JSON.stringify({
        capability,
        error: error instanceof Error ? error.message.split('\n', 1)[0] : 'unknown_codec_error',
      }));
    }
    return false;
  }
};

export const probeCodecCapabilities = async (
  fixtures: { hevc: Uint8Array; avif: Uint8Array },
): Promise<CodecCapabilities> => {
  const directory = await mkdtemp(join(tmpdir(), 'photo-library-codec-probe-'));
  try {
    const source = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#4f46e5' } })
      .png()
      .toBuffer();
    const capabilities = Object.fromEntries(
      requiredCodecCapabilities.map((capability) => [capability, false]),
    ) as CodecCapabilities;

    capabilities['input:hevc'] = await attempt('input:hevc', () => decodePixels(fixtures.hevc));
    capabilities['input:avif'] = await attempt('input:avif', () => decodePixels(fixtures.avif));

    capabilities['output:hevc'] = await attempt('output:hevc', async () => {
      const target = join(directory, 'probe.heic');
      const candidates = [
        { compression: 'hevc' as const, quality: 50, effort: 4, chromaSubsampling: '4:2:0' as const },
        { compression: 'hevc' as const, quality: 50, effort: 4 },
        { compression: 'hevc' as const, quality: 50 },
        { compression: 'hevc' as const },
      ];
      let lastError: unknown;
      for (const options of candidates) {
        try {
          await sharp(source).heif(options).toFile(target);
          await readFile(target);
          if (process.env.CODEC_PROBE_DEBUG === '1') {
            console.warn(JSON.stringify({ capability: 'output:hevc', options }));
          }
          return;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError instanceof Error ? lastError : new Error('hevc_encoder_failed');
    });
    capabilities['output:avif'] = await attempt('output:avif', async () => {
      const target = join(directory, 'probe.avif');
      await sharp(source).avif({ quality: 50, effort: 4, tune: 'psnr' }).toFile(target);
      await readFile(target);
    });
    capabilities['output:webp'] = await attempt('output:webp', async () => {
      await sharp(source).webp().toBuffer();
    });
    capabilities['output:jpeg'] = await attempt('output:jpeg', async () => {
      await sharp(source).jpeg().toBuffer();
    });
    capabilities['output:jxl'] = await attempt('output:jxl', async () => {
      await (sharp(source) as unknown as { jxl: () => Sharp }).jxl().toBuffer();
    });

    return capabilities;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

export const probeInstalledCodecRuntime = async (hevc: Uint8Array): Promise<CodecCapabilities> => {
  const directory = await mkdtemp(join(tmpdir(), 'photo-library-avif-input-'));
  try {
    const source = join(directory, 'source.png');
    const avifPath = join(directory, 'input.avif');
    await sharp({ create: { width: 32, height: 24, channels: 3, background: '#0ea5e9' } })
      .png()
      .toFile(source);
    await execFileAsync('heif-enc', ['--avif', '--quality', '50', '--output', avifPath, source]);
    return await probeCodecCapabilities({ hevc, avif: await readFile(avifPath) });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

const commandOutput = async (command: string, args: string[]): Promise<string> => {
  try {
    const { stdout, stderr } = await execFileAsync(command, args);
    return `${stdout}${stderr}`.trim();
  } catch {
    return 'unavailable';
  }
};

const descriptor = (output: string, marker: string): string =>
  output.split('\n').find((line) => line.toLowerCase().includes(marker))?.trim() ?? 'unavailable';

export const codecVersionDiagnostics = async (): Promise<Record<string, string>> => {
  const [libheif, decoders, encoders] = await Promise.all([
    commandOutput('heif-info', ['--version']),
    commandOutput('heif-dec', ['--list-decoders']),
    commandOutput('heif-enc', ['--list-encoders']),
  ]);
  const libheifVersion = /libheif:\s*([^\s]+)/i.exec(libheif)?.[1] ?? 'unavailable';
  return {
    sharp: sharp.versions.sharp,
    libvips: sharp.versions.vips,
    libheif: sharp.versions.heif ?? libheifVersion,
    libde265: descriptor(decoders, 'libde265'),
    x265: descriptor(encoders, 'x265'),
  };
};
