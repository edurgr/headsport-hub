// Tiny helpers for Edge runtime compatibility (avoid Node Buffer)

export function decodeBase64ToUtf8(base64Input: string): string {
  // Normalize URL-safe base64
  const normalized = base64Input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to length multiple of 4
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

export function decodeBase64ToBytes(base64Input: string): Uint8Array {
  const normalized = base64Input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const binString = atob(padded);
  const len = binString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binString.charCodeAt(i);
  return bytes;
}

export function encodeUtf8ToBase64(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}


