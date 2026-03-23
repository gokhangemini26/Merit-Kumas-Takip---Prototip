import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CreditCard, 
  History, 
  Calendar, 
  User, 
  FileText,
  AlertCircle,
  Plus,
  FileDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { OrderWithItems, OrderStatus } from '@/types';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { exportDeliveryTemplate } from '@/lib/deliveryUtils';

const statusColors: Record<OrderStatus, string> = {
  'BEKLEMEDE': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'ÜRETİMDE': 'bg-blue-100 text-blue-700 border-blue-200',
  'KISMİ_TESLİM': 'bg-orange-100 text-orange-700 border-orange-200',
  'TAMAMLANDI': 'bg-green-100 text-green-700 border-green-200',
  'İPTAL': 'bg-red-100 text-red-700 border-red-200',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = React.useState<OrderWithItems | null>(null);
  const [deliveries, setDeliveries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(
              *,
              fabric_type:fabric_types(name),
              sizes:order_item_sizes(*)
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setOrder(data);

        // Fetch deliveries linked to this order's items
        if (data.items && data.items.length > 0) {
          const itemIds = data.items.map((i: any) => i.id);
          const { data: deliveryData } = await supabase
            .from('deliveries')
            .select('*, items:delivery_items(*)')
            .in('items.order_item_id', itemIds);
          
          // Filter out deliveries that have no matching items for this order (post-query filter as Supabase doesn't support nested filter for many-to-many joined tables in basic select easily)
          const filteredDeliveries = deliveryData?.filter(d => 
            d.items?.some((di: any) => itemIds.includes(di.order_item_id))
          ) || [];
          
          setDeliveries(filteredDeliveries);
        }
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError(err.message || 'Sipariş detayları yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchOrder();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  if (error || !order) return (
    <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
      <h2 className="text-xl font-bold">Hata Oluştu</h2>
      <p className="text-slate-500">{error || 'Sipariş bulunamadı.'}</p>
      <Button onClick={() => navigate('/siparisler')}>Listeye Geri Dön</Button>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/siparisler')} className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{order.order_no}</h1>
              <Badge variant="outline" className={cn("font-medium", statusColors[order.status])}>
                {order.status}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm mt-1">Oluşturulma: {formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 btn-animate bg-white" onClick={() => order && exportDeliveryTemplate(order)}>
            <FileDown size={16} /> Excel Şablon İndir
          </Button>
          <Button className="gap-2 bg-[#f97316] hover:bg-[#ea580c] btn-animate" onClick={() => navigate(`/teslimler/yeni?orderId=${order.id}`)}>
            <Truck size={16} /> Teslimat Yükle
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="genel" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 gap-1 h-auto">
          <TabsTrigger value="genel" className="gap-2 py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Package size={16} /> Genel Bilgiler
          </TabsTrigger>
          <TabsTrigger value="teslimatlar" className="gap-2 py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Truck size={16} /> Teslimatlar
          </TabsTrigger>
          <TabsTrigger value="odemeler" className="gap-2 py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CreditCard size={16} /> Ödeme Planı
          </TabsTrigger>
          <TabsTrigger value="gecmis" className="gap-2 py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <History size={16} /> İşlem Geçmişi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="genel" className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Sipariş Kalemleri</CardTitle>
                <CardDescription>Siparişe ait kumaş ve varyant detayları.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-y text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-3 text-left">Model / Renk</th>
                        <th className="px-6 py-3 text-left">Kumaş Tipi</th>
                        <th className="px-6 py-3 text-right">Miktar (Kg)</th>
                        <th className="px-6 py-3 text-right">Birim Fiyat</th>
                        <th className="px-6 py-3 text-right">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items?.map((item: any) => (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{item.model_code}</div>
                              <div className="text-slate-500 text-xs">{item.color_name}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.fabric_type?.name || '-'}</td>
                            <td className="px-6 py-4 text-right font-mono">{item.ordered_kg.toFixed(2)} kg</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                            <td className="px-6 py-4 text-right font-bold text-[#f97316]">
                              {formatCurrency(item.ordered_kg * item.unit_price)}
                            </td>
                          </tr>
                          {item.sizes && item.sizes.length > 0 && (
                            <tr className="bg-orange-50/30">
                              <td colSpan={5} className="px-6 py-2">
                                <div className="flex flex-wrap gap-4 text-xs">
                                  {item.sizes.map((sz: any) => (
                                    <div key={sz.id} className="flex flex-col">
                                      <span className="text-slate-400 font-bold">{sz.size_name}</span>
                                      <span className="font-semibold">{sz.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sipariş Özeti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><User size={14} /> Tedarikçi</span>
                    <span className="font-semibold">{order.supplier_id}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><Calendar size={14} /> Sipariş Tarihi</span>
                    <span className="font-semibold">{formatDate(order.order_date)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><Truck size={14} /> Vade Tarihi</span>
                    <span className="font-semibold">{order.delivery_due_date ? formatDate(order.delivery_due_date) : '-'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Toplam Kg</span>
                    <span className="font-bold">{order.items?.reduce((sum: number, item: any) => sum + item.ordered_kg, 0).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Genel Toplam</span>
                    <span className="text-xl font-bold text-[#f97316]">
                      {formatCurrency(order.items?.reduce((sum: number, item: any) => sum + (item.ordered_kg * item.unit_price), 0) || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {order.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><FileText size={14} /> Notlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 italic">"{order.notes}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="teslimatlar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teslimat Geçmişi</CardTitle>
              <CardDescription>Bu siparişe bağlı gerçekleşen tüm teslimat listesi.</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-y text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-3 text-left">Teslimat No</th>
                        <th className="px-6 py-3 text-left">İrsaliye</th>
                        <th className="px-6 py-3 text-left">Tarih</th>
                        <th className="px-6 py-3 text-right">Miktar (Kg)</th>
                        <th className="px-6 py-3 text-center">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deliveries.map((delivery) => {
                        const totalKg = delivery.items?.reduce((sum: number, item: any) => sum + item.delivered_kg, 0) || 0;
                        return (
                          <tr key={delivery.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/teslimler/${delivery.id}`)}>
                            <td className="px-6 py-4 font-bold text-blue-600">{delivery.delivery_no}</td>
                            <td className="px-6 py-4 text-slate-500">{delivery.waybill_no || '-'}</td>
                            <td className="px-6 py-4 text-slate-600">{formatDate(delivery.delivery_date)}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold">{totalKg.toFixed(2)} kg</td>
                            <td className="px-6 py-4 text-center">
                              <Badge variant="secondary" className="text-[10px]">{delivery.status}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Truck className="mx-auto h-12 w-12 opacity-20 mb-4" />
                  <p>Henüz bir teslimat kaydı bulunmamaktadır.</p>
                  <Button variant="outline" className="mt-4 gap-2 border-dashed" onClick={() => navigate(`/teslimler/yeni?orderId=${order?.id}`)}>
                    <Plus size={16} /> Teslimat Formu Yükle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="odemeler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Planı</CardTitle>
              <CardDescription>Vade ve gerçekleşen ödeme detayları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-slate-50 border space-y-2">
                  <p className="text-xs text-slate-500 font-bold uppercase">Ödeme Vadesi</p>
                  <p className="text-lg font-semibold">{order.payment_term_days} Gün</p>
                  <p className="text-sm text-slate-500">Son Ödeme: {order.payment_due_date ? formatDate(order.payment_due_date) : '-'}</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 space-y-2">
                  <p className="text-xs text-orange-600 font-bold uppercase">Kalan Bakiye</p>
                  <p className="text-lg font-bold text-orange-700">
                    {formatCurrency(order.items?.reduce((sum: number, item: any) => sum + (item.ordered_kg * item.unit_price), 0) || 0)}
                  </p>
                  <p className="text-xs text-orange-600/70 italic">Henüz ödeme yapılmadı.</p>
                </div>
              </div>
              
              <div className="text-center py-8 border rounded-lg border-dashed text-slate-400">
                Ödeme hareketleri modülü Adım 14'te aktif olacaktır.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gecmis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>İşlem Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-start md:space-x-10">
                  <div className="flex items-center space-x-4 md:space-x-10">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 shadow-sm z-10 shrink-0">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Sipariş Oluşturuldu</h4>
                      <p className="text-sm text-slate-500">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                </div>
                <div className="relative flex items-center justify-between md:justify-start md:space-x-10">
                  <div className="flex items-center space-x-4 md:space-x-10">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 shadow-sm z-10 shrink-0">
                      <History size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Durum Güncellendi: BEKLEMEDE</h4>
                      <p className="text-sm text-slate-500">Sistem tarafından otomatik atandı.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
