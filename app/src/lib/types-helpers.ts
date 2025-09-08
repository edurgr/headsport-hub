import { OrderItem, ProductCategory, UploadFile, UploadSession } from '@/types';

// Legacy UI mappers to canonical DB fields

// Map legacy product model to product_article/category pair
export function mapLegacyProductToArticleCategory(legacy: {
  sku?: string;
  vertical_number?: string;
  category?: string;
}): { product_article: string; product_category: ProductCategory } {
  const product_article = legacy.sku || legacy.vertical_number || '';
  const legacyCategory = (legacy.category || '').toLowerCase();
  const allowed: ProductCategory[] = [
    'accessories',
    'bindings',
    'boots',
    'goggles',
    'helmet',
    'ski',
    'snowboard_boots',
    'snowboard_accessories',
    'snowboard_bindings',
    'snowboard_boards',
  ];
  const product_category = (
    allowed.includes(legacyCategory as ProductCategory) ? legacyCategory : 'accessories'
  ) as ProductCategory;
  return { product_article, product_category };
}

// Map UI row to OrderItem insert payload
export function mapUiRowToOrderItem(row: {
  product: any;
  length_cm?: string;
  quantity: number;
  boot_size?: string;
  unit_price?: string | number;
}): Pick<
  OrderItem,
  'product_article' | 'product_category' | 'quantity' | 'unit_price' | 'total_price'
> {
  const { product_article, product_category } = mapLegacyProductToArticleCategory(
    row.product || {}
  );
  const unit =
    typeof row.unit_price === 'number' ? row.unit_price.toFixed(2) : row.unit_price || '0.00';
  const qty = Number(row.quantity || 0);
  const total = (qty * Number(unit || 0)).toFixed(2);
  return {
    product_article,
    product_category,
    quantity: qty,
    unit_price: unit || '0.00',
    total_price: total,
  };
}

// Map legacy upload file to canonical UploadFile insert
export function mapLegacyUploadFile(input: {
  path: string;
  mime?: string;
  size_bytes?: number;
}): Omit<UploadFile, 'id' | 'session_id' | 'created_at'> {
  const filename = input.path.split('/').pop() || input.path;
  return {
    filename,
    file_path: input.path,
    file_size: input.size_bytes ?? null,
    file_type: 'other',
    mime_type: input.mime ?? null,
  } as unknown as Omit<UploadFile, 'id' | 'session_id' | 'created_at'>;
}

// Map legacy upload session to canonical
export function mapLegacyUploadSession(input: {
  title?: string;
  notes?: string;
  tags?: string[];
}): Omit<UploadSession, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'> {
  return {
    title: input.title || 'Untitled',
    description: input.notes || null,
  } as Omit<UploadSession, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>;
}
