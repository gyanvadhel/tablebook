import { describe, it, expect } from 'vitest';
import {
  UPLOAD_KINDS,
  UPLOAD_MAX_BYTES,
  detectImageFormat,
  isUploadKind,
  parseUploadId,
  sanitizeFilename,
  uploadUrl,
} from '@/lib/uploads';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const gif = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(8)]);
const webp = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4), Buffer.from('WEBP', 'latin1'), Buffer.alloc(8)]);

describe('detectImageFormat', () => {
  it.each([
    ['png', png, 'image/png', '.png'],
    ['jpeg', jpeg, 'image/jpeg', '.jpg'],
    ['gif', gif, 'image/gif', '.gif'],
    ['webp', webp, 'image/webp', '.webp'],
  ])('identifies %s by its magic bytes', (key, bytes, mime, ext) => {
    expect(detectImageFormat(bytes as Buffer)).toEqual({ key, mime, ext });
  });

  /**
   * The security property this whole function exists for: an attacker naming
   * a script "plan.png" must not get it stored and served back from our origin.
   */
  it('refuses an SVG even though it is an image format', () => {
    expect(detectImageFormat(Buffer.from('<svg onload="alert(1)"></svg>'))).toBeNull();
  });

  it('refuses HTML, scripts and other non-images', () => {
    expect(detectImageFormat(Buffer.from('<!DOCTYPE html><script>alert(1)</script>'))).toBeNull();
    expect(detectImageFormat(Buffer.from('#!/bin/sh\nrm -rf /'))).toBeNull();
  });

  it('refuses truncated headers rather than reading past the end', () => {
    expect(detectImageFormat(Buffer.from([0x89, 0x50]))).toBeNull();
    expect(detectImageFormat(Buffer.alloc(0))).toBeNull();
    expect(detectImageFormat(Buffer.from('RIFF'))).toBeNull();
  });

  it('does not mistake a RIFF container that is not WEBP', () => {
    const wav = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4), Buffer.from('WAVE', 'latin1'), Buffer.alloc(8)]);
    expect(detectImageFormat(wav)).toBeNull();
  });
});

describe('sanitizeFilename', () => {
  it('strips any directory component', () => {
    expect(sanitizeFilename('../../etc/passwd', '.png')).toBe('passwd');
    expect(sanitizeFilename('C:\\Users\\me\\plan.png', '.png')).toBe('plan.png');
  });

  it('removes characters that have meaning elsewhere', () => {
    expect(sanitizeFilename('a"b;c<d>.png', '.png')).toBe('a_b_c_d_.png');
  });

  it('never produces a dotfile', () => {
    expect(sanitizeFilename('...hidden', '.png')).toBe('hidden');
  });

  it('falls back when nothing usable survives', () => {
    expect(sanitizeFilename('', '.png')).toBe('blueprint.png');
    expect(sanitizeFilename(undefined, '.jpg')).toBe('blueprint.jpg');
  });

  it('caps the length', () => {
    expect(sanitizeFilename('a'.repeat(500), '.png').length).toBeLessThanOrEqual(80);
  });
});

describe('parseUploadId', () => {
  it('reads the id out of a decorated filename', () => {
    expect(parseUploadId('12.jpg')).toBe(12);
    expect(parseUploadId('7')).toBe(7);
  });

  it('rejects anything not starting with a positive integer', () => {
    expect(parseUploadId('abc.jpg')).toBeNull();
    expect(parseUploadId('')).toBeNull();
    expect(parseUploadId(undefined)).toBeNull();
    expect(parseUploadId('0')).toBeNull();
    expect(parseUploadId('-3')).toBeNull();
    expect(parseUploadId('../../secret')).toBeNull();
  });
});

describe('uploadUrl', () => {
  it('builds a site-relative URL', () => {
    expect(uploadUrl(12, '.jpg')).toBe('/api/uploads/12.jpg');
  });
});

describe('upload kinds', () => {
  it('accepts only the known kinds', () => {
    for (const k of UPLOAD_KINDS) expect(isUploadKind(k)).toBe(true);
    expect(isUploadKind('avatar')).toBe(false);
    expect(isUploadKind('')).toBe(false);
    expect(isUploadKind(null)).toBe(false);
  });
});

describe('limits', () => {
  it('caps uploads at 10 MB', () => {
    expect(UPLOAD_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
