import { NextRequest, NextResponse } from 'next/server';

import { verifyAdminAccess } from '@/lib/admin-auth-secure';
import { validateProductData, validateRequest } from '@/lib/input-validator';
import { checkRateLimit } from '@/lib/rate-limiter';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(req, true);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: rateLimitResult.status,
          headers: rateLimitResult.headers as Record<string, string>,
        },
      );
    }

    // Validate request parameters
    const validationResult = validateRequest(req);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    // Check admin access
    const adminResult = await verifyAdminAccess(req);
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    const supabase = await supabaseServer();

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Get products from specific category or all categories efficiently
    const categories = [
      'accessories',
      'bindings',
      'boots',
      'goggles',
      'helmet',
      'ski',
      'snowboards_boards',
      'snowboards_bindings',
      'snowboards_boots',
      'snowboards_accessories',
    ];
    
    let allProducts: any[] = [];
    
    // If filtering by specific category, only query that table
    if (category && category !== 'all') {
      const query = supabase.from(category).select('*');
      const searchQuery = search 
        ? query.or(`name.ilike.%${search}%,article.ilike.%${search}%`)
        : query;
      
      const { data, error } = await searchQuery;
      if (!error && data) {
        allProducts = data.map((item: any) => ({
          ...item,
          table_name: category,
          category: category,
        }));
      }
    } else {
      // Only query all categories if no specific category filter
      for (const cat of categories) {
        let query = supabase.from(cat).select('*');
        
        if (search) {
          query = query.or(`name.ilike.%${search}%,article.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (!error && data) {
          allProducts = allProducts.concat(
            data.map((item: any) => ({
              ...item,
              table_name: cat,
              category: cat,
            })),
          );
        }
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedProducts = allProducts.slice(from, to);

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total: allProducts.length,
        totalPages: Math.ceil(allProducts.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(req, true);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: rateLimitResult.status,
          headers: rateLimitResult.headers as Record<string, string>,
        },
      );
    }

    // Check admin access
    const adminResult = await verifyAdminAccess(req);
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    const supabase = await supabaseServer();

    const body = await req.json();
    const { category, productData } = body;

    if (!category || !productData) {
      return NextResponse.json({ error: 'Category and product data required' }, { status: 400 });
    }

    // Validate product data
    const validationResult = validateProductData(productData);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const validCategories = [
      'accessories',
      'bindings',
      'boots',
      'goggles',
      'helmet',
      'ski',
      'snowboards_boards',
      'snowboards_bindings',
      'snowboards_boots',
      'snowboards_accessories',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Add required fields
    const productToInsert = {
      ...productData,
      category,
      is_active: productData.is_active !== undefined ? productData.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from(category).insert(productToInsert).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    // const requestInfo = getRequestInfo(req);
    // await AuditLogger.logAction(
    //   'product_created',
    //   'product',
    //   data.id,
    //   { category, product_name: data.name, article: data.article },
    //   user.id,
    //   user.email
    // );

    return NextResponse.json({ product: data });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check admin access
    const adminResult = await verifyAdminAccess(req);
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    const supabase = await supabaseServer();

    const body = await req.json();
    const { category, productId, productData } = body;

    if (!category || !productId || !productData) {
      return NextResponse.json(
        { error: 'Category, product ID and product data required' },
        { status: 400 },
      );
    }

    const validCategories = [
      'accessories',
      'bindings',
      'boots',
      'goggles',
      'helmet',
      'ski',
      'snowboards_boards',
      'snowboards_bindings',
      'snowboards_boots',
      'snowboards_accessories',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Get current product for audit
    // const { data: currentProduct } = await supabase
    //   .from(category)
    //   .select('*')
    //   .eq('id', productId)
    //   .single();

    // Update product
    const productToUpdate = {
      ...productData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(category)
      .update(productToUpdate)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    // const requestInfo = getRequestInfo(req);
    // await AuditLogger.logAction(
    //   'product_updated',
    //   'product',
    //   productId,
    //   {
    //     category,
    //     product_name: data.name,
    //     article: data.article,
    //     changes: Object.keys(productData)
    //   },
    //   user.id,
    //   user.email
    // );

    return NextResponse.json({ product: data });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const productId = url.searchParams.get('id');

    if (!category || !productId) {
      return NextResponse.json({ error: 'Category and product ID required' }, { status: 400 });
    }

    const validCategories = [
      'accessories',
      'bindings',
      'boots',
      'goggles',
      'helmet',
      'ski',
      'snowboard',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Get product info before deletion for audit
    const { data: productToDelete } = await supabase
      .from(category)
      .select('*')
      .eq('id', productId)
      .single();

    if (!productToDelete) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete product
    const { error } = await supabase.from(category).delete().eq('id', productId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    // const requestInfo = getRequestInfo(req);
    // await AuditLogger.logAction(
    //   'product_deleted',
    //   'product',
    //   productId,
    //   {
    //     category,
    //     product_name: productToDelete.name,
    //     article: productToDelete.article
    //   },
    //   user.id,
    //   user.email
    // );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const runtime = 'edge';
