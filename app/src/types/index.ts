export type UserRole = 'athlete' | 'manager' | 'admin' | 'superadmin';
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
  role: 'admin' | 'manager' | 'athlete' | 'superadmin';
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

export interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'athlete';
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
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

export type UploadSessionStatus = 'active' | 'archived' | 'deleted' | 'processing' | 'completed' | 'failed';

export interface UploadSession {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status?: UploadSessionStatus;
  created_at: string;
  updated_at?: string;
}

export interface UploadFile {
  id: string;
  session_id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  file_type: FileType;
  mime_type: string | null;
  thumbnail_path?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
  shipping_address?: Record<string, unknown> | null;
  notes?: string | null;
  total_amount?: string | number | null;
  items?: OrderItem[];
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

export type OrderRow = {
  product: any | null;
  length_cm: string;
  quantity: number;
  boot_size: string;
  binding_color: string;
};

export interface ProductCategoryInfo {
  id: string;
  name: string;
  description?: string;
}
