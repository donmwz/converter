import "server-only";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

const envelopeMagic = Buffer.from("CVLY1");

function masterKey() {
  const value = process.env.FILE_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error("FILE_ENCRYPTION_KEY tanımlanmadı.");
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("FILE_ENCRYPTION_KEY 32 bayt olmalıdır.");
  return key;
}

function userKey(userId: string) {
  return Buffer.from(hkdfSync("sha256", masterKey(), Buffer.from(userId), Buffer.from("convertly-file-v1"), 32));
}

function encrypt(body: Uint8Array, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", userKey(userId), iv);
  const ciphertext = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([envelopeMagic, iv, cipher.getAuthTag(), ciphertext]);
}

function decrypt(body: Uint8Array, userId: string) {
  const buffer = Buffer.from(body);
  if (!buffer.subarray(0, envelopeMagic.length).equals(envelopeMagic)) return buffer;
  const ivStart = envelopeMagic.length;
  const tagStart = ivStart + 12;
  const dataStart = tagStart + 16;
  const decipher = createDecipheriv("aes-256-gcm", userKey(userId), buffer.subarray(ivStart, tagStart));
  decipher.setAuthTag(buffer.subarray(tagStart, dataStart));
  return Buffer.concat([decipher.update(buffer.subarray(dataStart)), decipher.final()]);
}

const bucket = process.env.S3_BUCKET ?? "convertly-files";
const endpoint = process.env.S3_ENDPOINT;
const client = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: endpoint || undefined,
  forcePathStyle: Boolean(endpoint && !endpoint.includes("amazonaws.com")),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "convertly",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "convertly-local-secret",
  },
});

let bucketReady: Promise<void> | null = null;

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
      }
    })();
  }
  return bucketReady;
}

export async function storeResult(key: string, body: Uint8Array, contentType: string, userId: string) {
  await ensureBucket();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: encrypt(body, userId),
    ContentType: "application/octet-stream",
    Metadata: { "original-content-type": contentType },
  }));
}

export async function getStoredResult(key: string, userId: string) {
  await ensureBucket();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error("Dosya bulunamadı.");
  return {
    bytes: decrypt(await object.Body.transformToByteArray(), userId),
    contentType: object.Metadata?.["original-content-type"] ?? object.ContentType ?? "application/octet-stream",
  };
}

export async function deleteStoredResults(keys: string[]) {
  if (!keys.length) return;
  await ensureBucket();
  for (let index = 0; index < keys.length; index += 1000) {
    await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.slice(index, index + 1000).map((Key) => ({ Key })), Quiet: true },
    }));
  }
}
