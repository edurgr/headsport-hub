import { NextResponse } from 'next/server';

// Ensure Node runtime and disable static optimization/caching for correctness
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Always expose the full, normalized category list so the UI can offer all options
  // The products endpoint will handle empty results gracefully when a table has no data.
  const categories = [
    'skis',
    'bindings',
    'accessories',
    'boots',
    'goggles',
    'helmet',
    'snowboards', // aggregated snowboards category (boards/bindings/boots/accessories)
  ];
  return NextResponse.json(
    { categories, total: categories.length },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
