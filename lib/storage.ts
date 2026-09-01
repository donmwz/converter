import "server-only";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET ?? "convertly-files";
const client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  forcePathStyle: true,
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

export async function storeResult(key: string, body: Uint8Array, contentType: string) {
  await ensureBucket();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getStoredResult(key: string) {
  await ensureBucket();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
