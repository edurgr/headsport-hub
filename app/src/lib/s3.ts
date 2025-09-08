import { S3Client } from '@aws-sdk/client-s3';

export const s3Bucket = process.env.S3_BUCKET as string;
export const s3Region = (process.env.S3_REGION as string) || 'us-east-1';
export const s3Endpoint = process.env.S3_ENDPOINT as string | undefined;

export const s3Client = new S3Client({
  region: s3Region,
  endpoint: s3Endpoint,
  forcePathStyle: !!s3Endpoint,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  },
});
