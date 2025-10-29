export type UserRole = 'athlete' | 'manager' | 'admin';
export type ProductCategory =
  | 'accessories'
  | 'bindings'
  | 'boots'
  | 'goggles'
  | 'helmet'
  | 'ski'
  | 'snowboard'
  | 'snowboard_boots'
  | 'snowboard_accessories'
  | 'snowboard_bindings'
  | 'snowboard_boards';
export type OrderStatus = 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
export type UploadStatus = 'uploading' | 'processing' | 'completed' | 'failed';
export type FileType = 'image' | 'video' | 'document' | 'other';

export interface Profile {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'athlete';
  organization?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Equipment {
  id: string;
  user_id: string;
  product_category: ProductCategory;
  product_article: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type Product = {
  id: string;
  name: string;
  description: string;
  sku: string;
  vertical_number: string;
  category: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  available_lengths?: number[];
  image_url?: string;
};

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
  // Additional fields used in order processing
  product_article?: string;
  product_category?: ProductCategory;
  unit_price?: string;
  total_price?: string;
}

export interface ProductCategoryInfo {
  id: string;
  name: string;
  description?: string;
}
