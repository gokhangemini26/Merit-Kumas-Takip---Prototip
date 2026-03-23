import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  FileText,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Package
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    async function fetchDelivery() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            *,
            supplier:suppliers(name),
            items:delivery_items(
              *,
              order_item:order_items(
                *,
                order:orders(order_no)
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setDelivery(data);
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError(err.message || 'Teslimat detayları yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchDelivery();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Bu teslimat kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('Teslimat başarıyla silindi.');
      navigate('/teslimler');
    } catch (err: any) {
      alert('Silinirken hata oluştu: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  if (error || !delivery) return (
    <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
      <h2 className="text-xl font-bold">Hata Oluştu</h2>
      <p className="text-slate-500">{error || 'Teslimat bulunamadı.'}</p>
      <Button onClick={() => navigate('/teslimler')}>Listeye Geri Dön</Button>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teslimler')} className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{delivery.delivery_no}</h1>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                {delivery.status}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm mt-1">Giriş Kaydı: {formatDate(delivery.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 gap-2" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={16} /> {deleting ? 'Siliniyor...' : 'Teslimatı Sil'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package size={18} className="text-[#f97316]" /> Teslimat Kalemleri
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 text-left">Sipariş / Model</th>
                    <th className="px-6 py-3 text-left">Renk</th>
                    <th className="px-6 py-3 text-right">Miktar (Kg)</th>
                    <th className="px-6 py-3 text-right">Top</th>
                    <th className="px-6 py-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {delivery.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{item.order_item?.order?.order_no || 'Bağımsız'}</div>
                        <div className="text-slate-500 text-xs">{item.model_code}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{item.color_name}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold">{item.delivered_kg?.toFixed(2)} kg</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">{item.roll_count || 0} top</td>
                      <td className="px-6 py-4 text-center">
                        {item.is_matched ? (
                          <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                        ) : (
                          <AlertCircle size={16} className="text-slate-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Belge Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Tedarikçi</Label>
                <div className="font-bold text-slate-900">{delivery.supplier?.name || delivery.supplier_id || '-'}</div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">İrsaliye No</Label>
                  <div className="font-semibold flex items-center gap-2"><FileText size={14} className="text-blue-500" /> {delivery.waybill_no || '-'}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Teslim Tarihi</Label>
                  <div className="font-semibold flex items-center gap-2"><Calendar size={14} className="text-[#f97316]" /> {formatDate(delivery.delivery_date)}</div>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Veri Kaynağı</Label>
                <Badge variant="outline" className="font-medium">{delivery.source_type}</Badge>
              </div>
            </CardContent>
          </Card>

          {delivery.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText size={14} /> Notlar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 italic">"{delivery.notes}"</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline Label component since it might not be exported
const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("text-xs font-semibold text-slate-500 uppercase tracking-wider", className)}>
    {children}
  </span>
);
