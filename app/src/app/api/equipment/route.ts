import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseServer } from '@/lib/supabase-server';


export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const category = url.searchParams.get('category') || undefined;
  const limit = Number(url.searchParams.get('limit') || 50);
  const offset = Number(url.searchParams.get('offset') || 0);

  // Use service role key for product queries to avoid RLS issues
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = serviceKey ? createClient(supabaseUrl!, serviceKey) : await supabaseServer();

  const items: any[] = [];
  const sources: Array<{ table: string; cat: string }> = [];
  if (!category || category === 'skis' || category === 'ski')
    sources.push({ table: 'ski', cat: 'skis' });
  if (!category || category === 'bindings') sources.push({ table: 'bindings', cat: 'bindings' });
  if (!category || category === 'accessories')
    sources.push({ table: 'accessories', cat: 'accessories' });
  if (!category || category === 'boots') sources.push({ table: 'boots', cat: 'boots' });
  if (!category || category === 'goggles') sources.push({ table: 'goggles', cat: 'goggles' });
  if (!category || category === 'helmet') sources.push({ table: 'helmet', cat: 'helmet' });
  // Using snowboard tables as per current schema; aggregate under 'snowboards'
  if (!category || category === 'snowboard' || category === 'snowboards') {
    sources.push({ table: 'snowboards_boards', cat: 'snowboards_boards' });
    sources.push({ table: 'snowboards_bindings', cat: 'snowboards_bindings' });
    sources.push({ table: 'snowboards_boots', cat: 'snowboards_boots' });
    sources.push({ table: 'snowboards_accessories', cat: 'snowboards_accessories' });
  }

  // Execute all queries in parallel for better performance
  const queries = sources.map(async (src) => {
    let query = sb
      .from(src.table)
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.or(`name.ilike.%${q}%,article.ilike.%${q}%`);
    }

    const { data, error } = (await query) as any;
    return { data: data || [], error, cat: src.cat };
  });

  const results = await Promise.all(queries);

  for (const result of results) {
    if (!result.error) {
      for (const product of result.data) {
        const lengths: number[] = [];
        if (result.cat === 'skis' && (product.length_list || product.length)) {
          for (const token of String(product.length_list || product.length).split(',')) {
            const n = Number(String(token).trim());
            if (!isNaN(n) && n > 0) lengths.push(n);
          }
        }
        const specs = {
          radius: product.radius || null,
          sidecut: product.sidecut || null,
          plate: product.plate || null,
          bindings: product.bindings || null,
          stand_height: product.stand_height || null,
          din: product.din || null,
          weight: product.weight || null,
        };
        items.push({
          id: product.article,
          name: product.name,
          sku: product.article,
          vertical_number: product.article,
          category: result.cat.startsWith('snowboards_') ? 'snowboards' : result.cat,
          brand: 'HEAD',
          price: null,
          notes: null,
          is_active: product.is_active,
          available_lengths:
            result.cat === 'skis' ? lengths.sort((a: number, b: number) => a - b) : [],
          brake_widths: [],
          sizes: [],
          specifications: specs,
          language: product.lang || 'EN',
        });
      }
    }
  }

  // Fallback to products if normalized tables empty or missing
  if (items.length === 0) {
    let query = sb
      .from('products')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);
    if (category) {
      if (category === 'skis' || category === 'ski') query = query.ilike('meta', '%TYPE:SKI.SKIS%');
      else if (category === 'bindings') query = query.ilike('meta', '%TYPE:SKI.BINDINGS%');
    }
    if (q) query = query.or(`name.ilike.%${q}%,article.ilike.%${q}%`);
    const { data: products, error } = (await query) as any;
    if (!error) {
      for (const product of products || []) {
        const lengths: number[] = [];
        if (product.length_list) {
          for (const token of String(product.length_list).split(',')) {
            const n = Number(String(token).trim());
            if (!isNaN(n) && n > 0) lengths.push(n);
          }
        }
        const cat = product.meta?.includes('TYPE:SKI.BINDINGS')
          ? 'bindings'
          : product.meta?.includes('TYPE:SKI.SKIS')
            ? 'skis'
            : 'other';
        items.push({
          id: product.article,
          name: product.name,
          sku: product.article,
          vertical_number: product.article,
          category: cat,
          brand: 'HEAD',
          price: null,
          notes: null,
          is_active: product.is_active,
          available_lengths: cat === 'skis' ? lengths.sort((a: number, b: number) => a - b) : [],
          brake_widths: [],
          sizes: [],
          specifications: {
            radius: product.radius || null,
            plate: product.plate || null,
            bindings: product.bindings || null,
            sidecut: product.sidecut || null,
            stand_height: product.stand_height || null,
            din: product.din || null,
            weight: product.weight || null,
          },
          language: product.lang || 'EN',
        });
      }
    }
  }

  return NextResponse.json({ items, count: items.length });
}
