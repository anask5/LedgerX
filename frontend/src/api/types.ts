// API types matching backend schemas
// All types are designed to be expandable when backend is connected

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export type ReceiptStatus = 'processing' | 'ready' | 'failed';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'net_banking' | 'wallet' | 'other';
export type ItemStatus = 'active' | 'expiring_soon' | 'expired' | 'returned' | 'none';

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  serial_number: string | null;
  brand_warranty_months: number | null;
  brand_warranty_expiry: string | null;
  extended_warranty_months: number | null;
  extended_warranty_expiry: string | null;
  return_deadline: string | null;
  status: ItemStatus;
}

export interface Receipt {
  id: string;
  user_id: string;
  store_name: string;
  store_address: string | null;
  store_phone: string | null;
  purchase_date: string;
  total_amount: number;
  currency: string;
  payment_mode: PaymentMode;
  receipt_number: string | null;
  subtotal: number | null;
  tax: number | null;
  category: string;
  image_url: string;
  thumbnail_url: string | null;
  status: ReceiptStatus;
  ocr_confidence: number | null;
  needs_review: string[];
  items: ReceiptItem[];
  folder_id: string | null;
  tags: string[];
  is_favorite: boolean;
  is_archived: boolean;
  return_deadline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptListResponse {
  data: Receipt[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReceiptCreateResponse {
  data: {
    id: string;
    status: ReceiptStatus;
    duplicate?: boolean;
    existing_id?: string;
  };
}

export interface ReceiptFilters {
  q?: string;
  category?: string;
  folder_id?: string;
  tag?: string;
  is_favorite?: boolean;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  sort?: 'newest' | 'oldest' | 'highest_amount' | 'expiring_soonest';
  page?: number;
  page_size?: number;
}

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  color: string;
  receipt_count: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  receipt_count: number;
}

export interface ShareLink {
  id: string;
  receipt_id: string;
  token: string;
  url: string;
  expires_at: string;
  hide_payment: boolean;
  hide_phone: boolean;
  view_count: number;
  created_at: string;
}

export interface CreateShareLinkRequest {
  expiry: '24h' | '7d' | '30d';
  hide_payment: boolean;
  hide_phone: boolean;
}

export interface Reminder {
  id: string;
  receipt_id: string;
  receipt_item_id: string | null;
  type: 'return_deadline' | 'brand_warranty_expiry' | 'extended_warranty_expiry';
  item_name: string;
  store_name: string;
  deadline: string;
  days_left: number;
  status: 'upcoming' | 'expiring_soon' | 'expired';
  snoozed_until: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiError {
  message: string;
  code: string;
  field?: string;
}
