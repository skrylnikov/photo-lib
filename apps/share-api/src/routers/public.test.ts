import assert from 'node:assert/strict';
import test from 'node:test';

import { publicAlbumMediaWhere, toHomeAlbum, toPhoto } from './public';

test('public photo DTO contains no storage key or processing metadata', () => {
  const media = {
    id: 'media-1',
    originalName: 'portrait.jpg',
    width: 1200,
    height: 800,
    createdAt: new Date('2026-08-18T10:00:00.000Z'),
    capturedAt: new Date('2026-08-17T12:34:56.000Z'),
    status: 'ready',
    gps: { latitude: 55.75, longitude: 37.61 },
    exif: { CameraModel: 'private-camera' },
    derivatives: [{ format: 'jpeg', width: 640, height: 427, objectKey: 'derivatives/private-key' }],
  };
  const photo = toPhoto(media);
  assert.deepEqual(photo, {
    id: 'media-1',
    alt: 'portrait.jpg',
    width: 1200,
    height: 800,
    capturedAt: '2026-08-17T12:34:56.000Z',
    frameIndex: 0,
    derivatives: [{ format: 'jpeg', width: 640, height: 427, url: '/media/media-1/jpeg/640' }],
  });
  assert.equal('objectKey' in photo, false);
  assert.equal('status' in photo, false);
  assert.equal('objectKey' in photo.derivatives[0], false);
  assert.equal('createdAt' in photo, false);
  assert.equal('gps' in photo, false);
  assert.equal('exif' in photo, false);
});

test('public photo DTO falls back to createdAt and keeps the frame index', () => {
  const photo = toPhoto({
    id: 'media-2',
    originalName: 'fallback.jpg',
    width: 800,
    height: 600,
    createdAt: new Date('2026-08-18T10:00:00.000Z'),
    capturedAt: null,
    status: 'ready',
    derivatives: [],
  }, 3);
  assert.equal(photo.capturedAt, '2026-08-18T10:00:00.000Z');
  assert.equal(photo.frameIndex, 3);
});

test('home album exposes only its safe summary and public media count', () => {
  assert.deepEqual(publicAlbumMediaWhere, {
    media: { status: 'ready', derivatives: { some: {} } },
  });

  const source = {
    slug: 'winter-spb',
    title: 'Зимний Питер',
    description: null,
    privateKey: 'not-public',
  };
  const album = toHomeAlbum(source, [], 12);

  assert.deepEqual(album, {
    slug: 'winter-spb',
    title: 'Зимний Питер',
    description: null,
    photoCount: 12,
    photos: [],
  });
  assert.equal('privateKey' in album, false);
});
