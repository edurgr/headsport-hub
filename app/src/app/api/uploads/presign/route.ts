import { NextResponse } from 'next/server';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3Bucket, s3Client } from '@/lib/s3';
import { s3Endpoint, s3Region } from '@/lib/s3';

export async function POST(req: Request) {
  try {
    const { key, contentType } = await req.json();

    if (!key || !contentType) {
      return NextResponse.json({ error: 'key and contentType are required' }, { status: 400 });
    }

    const command = new PutObjectCommand({ Bucket: s3Bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });

    // Construct a public URL (works if bucket/object is publicly readable)
    const publicUrl = s3Endpoint
      ? `${s3Endpoint.replace(/\/$/, '')}/${s3Bucket}/${key}`
      : `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`;

    return NextResponse.json({ url, publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
