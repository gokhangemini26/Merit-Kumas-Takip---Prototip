-- KUMAŞ SİPARİŞ YÖNETİM SİSTEMİ — VERİTABANI ŞEMASI

-- 1. Tedarikçiler
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kumaş Tipleri
CREATE TABLE fabric_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,       -- örn: "D.FACE", "OE.VISKON", "SUPREM"
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Beden Tipleri
CREATE TABLE size_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- örn: "Standart XS-5XL", "Bebek 50-86", "EU 36-50"
  sizes JSONB NOT NULL,            -- ["XS","S","M","L","XL","2XL","3XL","4XL","5XL"]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Siparişler (Ana Tablo)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,   -- Otomatik: ORD-2025-0001
  supplier_id UUID REFERENCES suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_due_date DATE,
  payment_term_days INTEGER DEFAULT 60,
  payment_due_date DATE,           -- order_date + payment_term_days
  status TEXT DEFAULT 'BEKLEMEDE' CHECK (status IN ('BEKLEMEDE','ÜRETİMDE','KISMİ_TESLİM','TAMAMLANDI','İPTAL')),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Sipariş Kalemleri
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  model_code TEXT NOT NULL,        -- örn: BCV8014-T
  color_name TEXT NOT NULL,        -- örn: SİYAH, BORDO
  color_code TEXT,                 -- Lab kodu varsa
  fabric_type_id UUID REFERENCES fabric_types(id),
  fabric_detail TEXT,              -- özl-emr d.face ea. 330 gr/m2
  weight_gsm INTEGER,              -- gr/m2
  width_cm INTEGER,                -- cm en
  ordered_kg NUMERIC(10,2),
  unit_price NUMERIC(10,2),
  currency TEXT DEFAULT 'TRY',
  has_size_breakdown BOOLEAN DEFAULT false,
  sample_status TEXT,              -- NUMUNE OK, BEKLENİYOR
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Beden Dökümü
CREATE TABLE order_item_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  size_type_id UUID REFERENCES size_types(id),
  size_breakdown JSONB NOT NULL,   -- {"XS":30,"S":120,"M":98,"L":30,"XL":21,"2XL":17}
  total_pieces INTEGER,
  calculated_kg NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Teslim Formları
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_no TEXT UNIQUE NOT NULL, -- TES-2025-0001
  supplier_id UUID REFERENCES suppliers(id),
  delivery_date DATE NOT NULL,
  waybill_no TEXT,                  -- İrsaliye no
  invoice_no TEXT,                  -- Fatura no
  status TEXT DEFAULT 'BEKLEMEDE' CHECK (status IN ('BEKLEMEDE','KONTROL','ONAYLANDI','SORUNLU')),
  raw_data JSONB,                   -- PDF/Excel'den çekilen ham veri
  source_type TEXT,                 -- 'MANUEL', 'EXCEL', 'PDF'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Teslim Kalemleri
CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id), -- Eşleştirme
  model_code TEXT NOT NULL,
  color_name TEXT NOT NULL,
  fabric_detail TEXT,
  delivered_kg NUMERIC(10,2) NOT NULL,
  roll_count INTEGER,
  quality_notes TEXT,               -- Tuşe, renk notları
  is_matched BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Ödemeler
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  payment_date DATE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  payment_type TEXT,                -- 'HAVALE', 'ÇEK', 'EFT'
  status TEXT DEFAULT 'BEKLEMEDE' CHECK (status IN ('BEKLEMEDE','ÖDENDI','GECIKTI')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggerlar: updated_at otomatik güncelle
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language plpgsql;

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
