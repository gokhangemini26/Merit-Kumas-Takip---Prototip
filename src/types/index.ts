export type OrderStatus = 'BEKLEMEDE' | 'ÜRETİMDE' | 'KISMİ_TESLİM' | 'TAMAMLANDI' | 'İPTAL';
export type PaymentStatus = 'BEKLEMEDE' | 'ÖDENDI' | 'GECIKTI';
export type DeliveryStatus = 'BEKLEMEDE' | 'KONTROL' | 'ONAYLANDI' | 'SORUNLU';
export type SizeBreakdown = Record<string, number>;

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface FabricType {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface SizeType {
  id: string;
  name: string;
  sizes: string[]; // JSONB: ["XS", "S", ...]
  created_at: string;
}

export interface Order {
  id: string;
  order_no: string;
  supplier_id: string;
  order_date: string;
  delivery_due_date?: string;
  payment_term_days: number;
  payment_due_date?: string;
  status: OrderStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  model_code: string;
  color_name: string;
  color_code?: string;
  fabric_type_id: string;
  fabric_detail?: string;
  weight_gsm?: number | null;
  width_cm?: number | null;
  ordered_kg: number;
  unit_price: number;
  currency: string;
  has_size_breakdown: boolean;
  sample_status: string;
  notes?: string;
  created_at: string;
}

export interface OrderItemSize {
  id: string;
  order_item_id: string;
  size_name: string;
  quantity: number;
  created_at: string;
}

export interface Delivery {
  id: string;
  delivery_no: string;
  supplier_id?: string;
  delivery_date: string;
  waybill_no?: string;
  invoice_no?: string;
  status: DeliveryStatus;
  raw_data?: any;
  source_type: 'MANUEL' | 'EXCEL' | 'PDF';
  notes?: string;
  created_at: string;
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  order_item_id?: string;
  model_code: string;
  color_name: string;
  fabric_detail?: string;
  delivered_kg: number;
  roll_count?: number;
  quality_notes?: string;
  is_matched: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  payment_date?: string;
  amount: number;
  currency: string;
  payment_type?: string;
  status: PaymentStatus;
  notes?: string;
  created_at: string;
}

// Helper types for joins
export type OrderItemWithSizes = OrderItem & { 
  sizes?: OrderItemSize[] 
};

export type OrderWithItems = Order & { 
  items?: OrderItemWithSizes[] 
};
