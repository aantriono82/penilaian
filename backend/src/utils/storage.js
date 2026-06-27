import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STORAGE_DIR = path.join(__dirname, '../../data/storage');

fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });

function trimTrailingSlash(value = '') {
  return value.replace(/\/+$/, '');
}

function getProvider() {
  return (process.env.FILE_STORAGE_DRIVER || 'local').toLowerCase();
}

function getRustFsClient() {
  const endpoint = process.env.RUSTFS_ENDPOINT;
  const region = process.env.RUSTFS_REGION || 'auto';
  const accessKeyId = process.env.RUSTFS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.RUSTFS_SECRET_ACCESS_KEY;
  const bucket = process.env.RUSTFS_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('Konfigurasi RustFS belum lengkap');
  }

  return new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }
  });
}

function getRustFsPublicUrl(key) {
  const publicBaseUrl = trimTrailingSlash(process.env.RUSTFS_PUBLIC_BASE_URL || '');
  if (publicBaseUrl) return `${publicBaseUrl}/${key}`;

  const endpoint = trimTrailingSlash(process.env.RUSTFS_ENDPOINT || '');
  const bucket = process.env.RUSTFS_BUCKET || '';
  if (!endpoint || !bucket) {
    throw new Error('Konfigurasi RustFS tidak lengkap: RUSTFS_ENDPOINT dan RUSTFS_BUCKET wajib diisi');
  }

  return `${endpoint}/${bucket}/${key}`;
}

function resolveExtension(mimeType, originalName = '') {
  const mimeExtensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg'
  };

  if (mimeExtensions[mimeType]) return mimeExtensions[mimeType];
  return path.extname(originalName || '').toLowerCase();
}

export function getStorageProvider() {
  return getProvider();
}

export function getLocalStorageDir() {
  return LOCAL_STORAGE_DIR;
}

export async function storeUploadedFile({ tempPath, mimeType, originalName }) {
  const provider = getProvider();
  const extension = resolveExtension(mimeType, originalName);

  if (provider === 'rustfs') {
    const objectKey = `stimuli/${new Date().toISOString().slice(0, 10)}/${uuidv4()}${extension}`;
    const buffer = fs.readFileSync(tempPath);

    await getRustFsClient().send(new PutObjectCommand({
      Bucket: process.env.RUSTFS_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType
    }));

    fs.unlinkSync(tempPath);

    return {
      storageProvider: 'rustfs',
      storageKey: objectKey,
      filename: path.basename(objectKey),
      url: getRustFsPublicUrl(objectKey)
    };
  }

  const filename = `${uuidv4()}${extension}`;
  const destination = path.join(LOCAL_STORAGE_DIR, filename);
  fs.renameSync(tempPath, destination);

  return {
    storageProvider: 'local',
    storageKey: filename,
    filename,
    url: `/api/uploads/${filename}`
  };
}

export async function deleteStoredFile(file) {
  const provider = (file?.storage_provider || 'local').toLowerCase();
  const storageKey = file?.storage_key || file?.filename;

  if (!storageKey) return;

  if (provider === 'rustfs') {
    await getRustFsClient().send(new DeleteObjectCommand({
      Bucket: process.env.RUSTFS_BUCKET,
      Key: storageKey
    }));
    return;
  }

  const targetPath = path.join(LOCAL_STORAGE_DIR, storageKey);
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
}
