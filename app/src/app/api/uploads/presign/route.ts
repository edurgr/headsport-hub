import { NextResponse } from 'next/server';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { requireAuth } from '@/lib/admin-auth-secure';
import { s3Bucket, s3Client } from '@/lib/s3';
import { s3Endpoint, s3Region } from '@/lib/s3';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export async function POST(req: Request) {
  const authResult = await requireAuth(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { key, contentType, fileSize } = await req.json();

    if (!key || !contentType) {
      return NextResponse.json({ error: 'key and contentType are required' }, { status: 400 });
    }

    // Reject path traversal attempts
    if (key.includes('..') || key.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    // Whitelist MIME types
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Validate file size if provided
    if (typeof fileSize === 'number' && fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 500 MB)' }, { status: 400 });
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
