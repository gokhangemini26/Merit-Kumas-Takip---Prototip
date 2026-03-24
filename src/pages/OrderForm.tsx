import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  ClipboardPaste,
  Info
} from 'lucide-react';
import { 
  generateOrderNo, 
  calculatePaymentDueDate, 
  formatCurrency, 
  parseSizeBreakdownFromText,
  cn 
} from '@/lib/utils';
import type { OrderStatus, Supplier, FabricType } from '@/types';
import { supabase } from '@/lib/supabase';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Form Schema
const orderItemSchema = z.object({
  model_code: z.string().min(1, 'Model kodu zorunludur'),
  color_name: z.string().min(1, 'Renk adı zorunludur'),
  color_code: z.string().optional(),
  fabric_type_id: z.string().min(1, 'Kumaş tipi zorunludur'),
  fabric_detail: z.string().optional(),
  weight_gsm: z.number().min(0).optional().nullable(),
  width_cm: z.number().min(0).optional().nullable(),
  ordered_kg: z.number().min(0.01, 'Miktar zorunludur'),
  unit_price: z.number().min(0.01, 'Birim fiyat zorunludur'),
  currency: z.string().min(1),
  has_size_breakdown: z.boolean(),
  size_type_id: z.string().optional(),
  size_breakdown: z.record(z.string(), z.number()).optional(),
  sample_status: z.string().min(1),
});

const orderSchema = z.object({
  order_no: z.string().min(1, 'Sipariş no zorunludur'),
  supplier_id: z.string().min(1, 'Tedarikçi seçimi zorunludur'),
  order_date: z.string().min(1, 'Sipariş tarihi zorunludur'),
  delivery_due_date: z.string().optional(),
  payment_term_days: z.number().min(0),
  payment_due_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'En az bir kalem eklemelisiniz'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrderForm() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(1);
  const [bulkPasteValue, setBulkPasteValue] = React.useState('');
  const [activeItemIndex, setActiveItemIndex] = React.useState<number | null>(null);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [fabricTypes, setFabricTypes] = React.useState<FabricType[]>([]);

  React.useEffect(() => {
    const loadMetadata = async () => {
      const [sRes, fRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('fabric_types').select('*').order('name')
      ]);
      if (sRes.data) setSuppliers(sRes.data);
      if (fRes.data) setFabricTypes(fRes.data);
    };
    loadMetadata();
  }, []);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      order_no: generateOrderNo(),
      order_date: new Date().toISOString().split('T')[0],
      payment_term_days: 60,
      items: [
        { 
          model_code: '', 
          color_name: '', 
          fabric_type_id: '', 
          ordered_kg: 0, 
          unit_price: 0, 
          currency: 'TRY',
          has_size_breakdown: false,
          sample_status: 'BEKLENİYOR'
        }
      ],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const orderDate = watch('order_date');
  const paymentTermDays = watch('payment_term_days');
  const items = watch('items');
  const supplierId = watch('supplier_id');
  const deliveryDueDate = watch('delivery_due_date');

  // Auto-calculate payment due date based on delivery_due_date (Tahmini Teslim Tarihi)
  React.useEffect(() => {
    const baseDate = deliveryDueDate || orderDate;
    if (baseDate && paymentTermDays !== undefined) {
      setValue('payment_due_date', calculatePaymentDueDate(baseDate, paymentTermDays));
    }
  }, [orderDate, deliveryDueDate, paymentTermDays, setValue]);

  const onSubmit = async (data: OrderFormValues) => {
    try {
      // 1. Insert Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_no: data.order_no,
          supplier_id: data.supplier_id,
          order_date: data.order_date,
          delivery_due_date: data.delivery_due_date || null,
          payment_term_days: data.payment_term_days,
          payment_due_date: data.payment_due_date || null,
          notes: data.notes || null,
          status: 'BEKLEMEDE' as OrderStatus
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert Order Items
      for (const item of data.items) {
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            model_code: item.model_code,
            color_name: item.color_name,
            fabric_type_id: item.fabric_type_id,
            ordered_kg: item.ordered_kg,
            unit_price: item.unit_price,
            currency: item.currency,
            sample_status: item.sample_status
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // 3. Insert Sizes if applicable
        if (item.has_size_breakdown && item.size_breakdown) {
          const sizeEntries = Object.entries(item.size_breakdown)
            .filter(([_, qty]) => qty > 0)
            .map(([size, quantity]) => ({
              order_item_id: orderItem.id,
              size_name: size,
              quantity: quantity
            }));

          if (sizeEntries.length > 0) {
            const { error: sizesError } = await supabase
              .from('order_item_sizes')
              .insert(sizeEntries);
            
            if (sizesError) throw sizesError;
          }
        }
      }

      alert('Sipariş başarıyla kaydedildi!');
      navigate('/siparisler');
    } catch (error: any) {
      console.error('Save Error:', error);
      alert('Sipariş kaydedilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const handleBulkPaste = () => {
    if (activeItemIndex !== null && bulkPasteValue) {
      const breakdown = parseSizeBreakdownFromText(bulkPasteValue);
      setValue(`items.${activeItemIndex}.size_breakdown`, breakdown);
      setBulkPasteValue('');
      setActiveItemIndex(null);
    }
  };

  const calculateTotalKg = () => items.reduce((sum, item) => sum + (Number(item.ordered_kg) || 0), 0);
  const calculateTotalPrice = () => items.reduce((sum, item) => sum + (Number(item.ordered_kg) * Number(item.unit_price) || 0), 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2",
              step >= s ? "bg-[#f97316] border-[#f97316] text-white shadow-lg shadow-orange-500/20" : "bg-white border-slate-200 text-slate-400"
            )}>
              {step > s ? <Check size={20} /> : s}
            </div>
            {s < 3 && <div className={cn("h-1 w-20 rounded-full", step > s ? "bg-[#f97316]" : "bg-slate-200")} />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* STEP 1: Sipariş Başlığı */}
        {step === 1 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Sipariş Başlık Bilgileri</CardTitle>
              <CardDescription>Tedarikçi, tarih ve ödeme detaylarını girin.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Sipariş No</Label>
                <Input {...register('order_no')} />
                {errors.order_no && <p className="text-red-500 text-xs">{errors.order_no.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Tedarikçi</Label>
                <Select onValueChange={(val) => setValue('supplier_id', val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Tedarikçi seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    {suppliers.length === 0 && <SelectItem value="none" disabled>Henüz tedarikçi yok</SelectItem>}
                  </SelectContent>
                </Select>
                {errors.supplier_id && <p className="text-red-500 text-xs">{errors.supplier_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Sipariş Tarihi</Label>
                <Input type="date" {...register('order_date')} className="bg-white" />
              </div>

              <div className="space-y-2">
                <Label>Tahmini Teslim Tarihi</Label>
                <Input type="date" {...register('delivery_due_date')} className="bg-white" />
              </div>

              <div className="space-y-2">
                <Label>Ödeme Vadesi (Gün)</Label>
                <Input type="number" {...register('payment_term_days', { valueAsNumber: true })} className="bg-white" />
              </div>

              <div className="space-y-2">
                <Label>Vade Tarihi (Otomatik)</Label>
                <Input type="date" {...register('payment_due_date')} disabled className="bg-slate-50 opacity-100" />
              </div>

              <div className="col-span-full space-y-2">
                <Label>Notlar</Label>
                <Textarea {...register('notes')} placeholder="Siparişle ilgili genel notlar..." className="bg-white" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Sipariş Kalemleri */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Sipariş Kalemleri</h2>
              <Button type="button" onClick={() => append({ 
                model_code: '', 
                color_name: '', 
                fabric_type_id: '', 
                ordered_kg: 0, 
                unit_price: 0, 
                currency: 'TRY',
                has_size_breakdown: false,
                sample_status: 'BEKLENİYOR'
              })} className="gap-2 bg-blue-600 hover:bg-blue-700 btn-animate">
                <Plus size={18} /> Kalem Ekle
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="relative group overflow-visible border-l-4 border-l-blue-500">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => remove(index)}
                  className="absolute -top-3 -right-3 h-8 w-8 bg-white border border-slate-200 text-red-500 hover:bg-red-50 transition-all shadow-sm rounded-full z-10"
                >
                  <Trash2 size={16} />
                </Button>
                
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Model Kodu</Label>
                      <Input {...register(`items.${index}.model_code`)} placeholder="BCV8014-T" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Renk Adı</Label>
                      <Input {...register(`items.${index}.color_name`)} placeholder="SİYAH" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Kumaş Tipi</Label>
                      <Select onValueChange={(val) => setValue(`items.${index}.fabric_type_id`, val)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fabricTypes.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                          {fabricTypes.length === 0 && <SelectItem value="none" disabled>Kumaş tipi yok</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Miktar (Kg)</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.ordered_kg`, { valueAsNumber: true })} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Birim Fiyat</Label>
                      <div className="relative">
                        <Input type="number" step="0.01" {...register(`items.${index}.unit_price`, { valueAsNumber: true })} className="bg-white pr-12" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">TL</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Toplam</Label>
                      <Input value={formatCurrency((watch(`items.${index}.ordered_kg`) || 0) * (watch(`items.${index}.unit_price`) || 0))} disabled className="bg-slate-50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Numune Durumu</Label>
                      <Select onValueChange={(val) => setValue(`items.${index}.sample_status`, val)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEKLENİYOR">BEKLENİYOR</SelectItem>
                          <SelectItem value="GÖNDERİLDİ">GÖNDERİLDİ</SelectItem>
                          <SelectItem value="NUMUNE OK">NUMUNE OK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Beden Dökümü Section */}
                  <div className={cn(
                    "mt-4 p-4 rounded-lg transition-all",
                    watch(`items.${index}.has_size_breakdown`) ? "bg-orange-50 border border-orange-100" : "bg-slate-50"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`size-toggle-${index}`}
                          {...register(`items.${index}.has_size_breakdown`)}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <label htmlFor={`size-toggle-${index}`} className="text-sm font-semibold text-slate-700 cursor-pointer">
                          Beden Dökümü Ekle
                        </label>
                      </div>

                      {watch(`items.${index}.has_size_breakdown`) && (
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button type="button" size="sm" variant="outline" className="gap-2 bg-white btn-animate" onClick={() => setActiveItemIndex(index)}>
                                <ClipboardPaste size={14} /> Toplu Yapıştır
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Beden Dökümü Yapıştır</DialogTitle>
                                <DialogDescription>
                                  Excel'den kopyaladığınız veriyi buraya yapıştırın. Format: "XS 30 S 120 M 98..."
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea 
                                className="min-h-[150px]" 
                                placeholder="Örn: XS 30 S 120 ..."
                                value={bulkPasteValue}
                                onChange={(e) => setBulkPasteValue(e.target.value)}
                              />
                              <DialogFooter>
                                <Button type="button" onClick={handleBulkPaste} className="bg-orange-500 hover:bg-orange-600">Parse Et ve Doldur</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>

                    {watch(`items.${index}.has_size_breakdown`) && (
                      <div className="flex flex-wrap gap-4">
                        {/* Mock sizes for indicator. In real app, this depends on selected size_type */}
                        {['XS', 'S', 'M', 'L', 'XL', '2XL'].map(sz => (
                          <div key={sz} className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold">{sz}</Label>
                            <Input 
                              type="number" 
                              className="w-16 h-8 text-center bg-white" 
                              value={watch(`items.${index}.size_breakdown`)?.[sz] || ''}
                              onChange={(e) => {
                                const current = watch(`items.${index}.size_breakdown`) || {};
                                setValue(`items.${index}.size_breakdown`, { ...current, [sz]: parseInt(e.target.value, 10) || 0 });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* STEP 3: Özet ve Onay */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="border-t-4 border-t-green-500">
              <CardHeader>
                <CardTitle>Sipariş Özeti</CardTitle>
                <CardDescription>Bilgileri kontrol edip siparişi onaylayın.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Tedarikçi</p>
                    <p className="font-semibold uppercase">{suppliers.find(s => s.id === supplierId)?.name || 'Seçilmedi'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Tarih</p>
                    <p className="font-semibold">{watch('order_date')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Teslimat</p>
                    <p className="font-semibold">{deliveryDueDate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Vade</p>
                    <p className="font-semibold">{watch('payment_due_date')} ({watch('payment_term_days')} gün)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Durum</p>
                    <Badge className="bg-yellow-100 text-yellow-700">BEKLEMEDE</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-700">Sipariş Kalemleri ({items.length})</p>
                  <div className="border rounded-lg overflow-hidden invisible md:visible">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr className="text-slate-500 font-medium">
                          <th className="px-4 py-2 text-left">Model / Renk</th>
                          <th className="px-4 py-2 text-right">Miktar (Kg)</th>
                          <th className="px-4 py-2 text-right">Birim Fiyat</th>
                          <th className="px-4 py-2 text-right">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 font-medium">{it.model_code} - {it.color_name}</td>
                            <td className="px-4 py-2 text-right">{it.ordered_kg} kg</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(it.unit_price)}</td>
                            <td className="px-4 py-2 text-right font-bold">{formatCurrency(it.ordered_kg * it.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#1a2744] text-white p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">Toplam Kg</p>
                      <p className="text-2xl font-bold font-mono">{calculateTotalKg().toFixed(2)} kg</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">Toplam Tutar</p>
                      <p className="text-2xl font-bold font-mono text-orange-400">{formatCurrency(calculateTotalPrice())}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <Info size={16} className="text-blue-400" />
                    <span>Bu sipariş kaydedildikten sonra tedarikçiye bilgi maili gidecektir.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/siparisler')}
            className="gap-2 btn-animate"
          >
            <ChevronLeft size={20} /> {step === 1 ? 'Vazgeç' : 'Geri Dön'}
          </Button>

          {step < 3 ? (
            <Button 
              type="button" 
              onClick={() => setStep(step + 1)} 
              className="gap-2 bg-[#f97316] hover:bg-[#ea580c] btn-animate"
            >
              İleri <ChevronRight size={20} />
            </Button>
          ) : (
            <Button 
              type="submit" 
              className="gap-2 bg-green-600 hover:bg-green-700 px-8 btn-animate shadow-green-500/20 shadow-lg"
            >
              Siparişi Onayla ve Kaydet <Check size={20} />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
