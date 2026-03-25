import { NextResponse } from 'next/server';

import {
  addSecurityHeaders,
  createSecureErrorResponse,
  sanitizeOrderItem,
  sanitizeShippingAddress,
  schemas,
  validateRequest,
} from '@/lib/security';
import { requireAuth } from '@/lib/admin-auth-secure';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

interface OrderItem {
  product: {
    id: string;
    name: string;
    sku: string;
    vertical_number: string;
    category?: string;
  } | null;
  length_cm: string;
  quantity: number;
  boot_size: string;
  binding_color?: string;
}

export async function POST(req: Request) {
  // Require authenticated session — unauthenticated users cannot place orders
  const authResult = await requireAuth(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { rows, athleteEmail, shippingAddress } = body;

    // Basic validation
    if (!Array.isArray(rows) || rows.length === 0) {
      return addSecurityHeaders(createSecureErrorResponse('Empty order', 400));
    }

    if (!athleteEmail) {
      return addSecurityHeaders(createSecureErrorResponse('Athlete email is required', 400));
    }

    if (!shippingAddress) {
      return addSecurityHeaders(createSecureErrorResponse('Shipping address is required', 400));
    }

    // Validate athlete email
    const emailValidation = validateRequest(schemas.email, athleteEmail);
    if (!emailValidation.success) {
      return addSecurityHeaders(createSecureErrorResponse('Invalid athlete email', 400));
    }

    // Validate shipping address
    const sanitizedAddress = sanitizeShippingAddress(shippingAddress);
    const addressValidation = validateRequest(schemas.shippingAddress, sanitizedAddress);
    if (!addressValidation.success) {
      return addSecurityHeaders(createSecureErrorResponse('Invalid shipping address', 400));
    }

    // Sanitize and validate each order item
    const validationErrors: string[] = [];
    rows
      .map((row: any, index: number) => {
        try {
          const sanitized = sanitizeOrderItem(row);

          // Category-specific validation
          if (sanitized.product.category === 'skis') {
            if (!sanitized.length_cm || sanitized.length_cm === '') {
              validationErrors.push(`Item ${index + 1}: Length is required for skis`);
            }
          }

          if (sanitized.product.category === 'boots') {
            if (!sanitized.boot_size || sanitized.boot_size === '') {
              validationErrors.push(`Item ${index + 1}: Boot size is required for boots`);
            }
          }

          return sanitized;
        } catch {
          validationErrors.push(`Item ${index + 1}: Invalid data format`);
          return null;
        }
      })
      .filter(Boolean);

    if (validationErrors.length > 0) {
      return addSecurityHeaders(
        createSecureErrorResponse(`Validation failed: ${validationErrors.join(', ')}`, 400),
      );
    }
    // Use service role if available to bypass RLS on server-side order creation
    const sb = supabaseAdmin || (await supabaseServer());

    // Try to get athlete profile by email; if not found, proceed with fallback
    const { data: athlete } = await sb
      .from('profiles')
      .select('id, name, role')
      .eq('email', athleteEmail)
      .single();

    const isAthlete =
      athlete &&
      (athlete.role === 'athlete' || athlete.role === 'manager' || athlete.role === 'admin');

    // Create the order with pending_approval status
    const { data: order, error: orderError } = await sb
      .from('orders')
      .insert({
        athlete_id: isAthlete ? athlete!.id : null,
        athlete_email: athleteEmail,
        athlete_name: (athlete && athlete.name) || athleteEmail.split('@')[0],
        status: 'pending_approval', // Changed from 'pending' to 'pending_approval'
        shipping_address: sanitizedAddress,
        notes: `Order with ${rows.length} items - Pending manager approval`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json(
        { error: 'Failed to create HEAD Sport Hub order: ' + orderError.message },
        { status: 500 },
      );
    }

    // Create order items with enriched data
    const orderItems = rows.map((row: OrderItem) => ({
      order_id: order.id,
      product_id: row.product!.id,
      product_name: row.product!.name,
      product_sku: row.product!.sku,
      product_category: row.product!.category,
      length_cm: row.product!.category === 'skis' ? Number(row.length_cm) : null,
      quantity: row.quantity,
      boot_size: row.product!.category === 'boots' ? row.boot_size : null,
      binding_color: row.product!.category === 'bindings' ? row.binding_color || null : null,
      unit_price: 0, // Will be set by manager
      total_price: 0, // Will be calculated by manager
    }));

    const { error: itemsError } = await sb.from('order_items').insert(orderItems);

    if (itemsError) {
      // Rollback order creation if items fail
      await sb.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create HEAD Sport Hub order items: ' + itemsError.message },
        { status: 500 },
      );
    }

    // Send notification to managers (you can implement email notification here)

    // Enrich response with product details
    const enrichedRows = rows.map((row: OrderItem) => ({
      product: {
        name: row.product!.name,
        sku: row.product!.sku,
        category: row.product!.category,
      },
      length_cm: row.length_cm,
      quantity: row.quantity,
      boot_size: row.boot_size,
      binding_color: row.binding_color,
    }));

    return NextResponse.json({
      success: true,
      message: 'Order created successfully and sent for manager approval',
      order: {
        id: order.id,
        status: order.status,
        athlete_email: athleteEmail,
        items: enrichedRows,
        shipping_address: shippingAddress,
        created_at: order.created_at,
      },
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
