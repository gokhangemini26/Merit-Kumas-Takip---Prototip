import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  ArrowLeft, 
  Check, 
  AlertCircle,
  Search,
  Truck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseDeliveryExcel } from '@/lib/deliveryUtils';
import { generateDeliveryNo } from '@/lib/utils';
import type { OrderWithItems } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function DeliveryForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [deliveryNo] = React.useState(generateDeliveryNo());
  const [deliveryDate, setDeliveryDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [waybillNo, setWaybillNo] = React.useState('');
  
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<any[]>([]);
  const [orderInfo, setOrderInfo] = React.useState<OrderWithItems | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Fetch order info if orderId is provided
  React.useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId)
        .single();
      setOrderInfo(data);
    }
    fetchOrder();
  }, [orderId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    try {
      const data = await parseDeliveryExcel(selectedFile);
      setParsedData(data);
    } catch (err) {
      alert('Dosya okunurken hata oluştu!');
      console.error(err);
    } finally {
    }
  };

  const handleSave = async () => {
    if (!file || parsedData.length === 0) return;

    setUploading(true);
    try {
      // 1. Create Delivery Record
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          delivery_no: deliveryNo,
          delivery_date: deliveryDate,
          waybill_no: waybillNo,
          source_type: file.name.endsWith('.pdf') ? 'PDF' : 'EXCEL',
          status: 'KONTROL'
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // 2. Create Delivery Items (Simplified for now - auto matching by Model Code)
      const deliveryItems = parsedData.map(row => {
        // Try to find matching order item if orderInfo is available
        const matchedItem = orderInfo?.items?.find(oi => 
          oi.model_code === (row['Model Kodu'] || row['Model'])
        );

        return {
          delivery_id: delivery.id,
          order_item_id: matchedItem?.id || null,
          model_code: row['Model Kodu'] || row['Model'] || 'Bilinmiyor',
          color_name: row['Renk'] || row['Color'] || 'Bilinmiyor',
          delivered_kg: Number(row['Gelen Kg'] || row['Kg'] || 0),
          roll_count: Number(row['Top Sayısı'] || row['Rolls'] || 0),
          is_matched: !!matchedItem
        };
      });

      const { error: itemsError } = await supabase
        .from('delivery_items')
        .insert(deliveryItems);

      if (itemsError) throw itemsError;

      alert('Teslimat başarıyla yüklendi ve KONTROL durumuna alındı.');
      navigate('/teslimler');
    } catch (err: any) {
      alert('Kaydedilirken hata: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yeni Teslimat Yükle</h1>
          <p className="text-slate-500 text-sm">Excel veya PDF formatındaki teslimat formunu sisteme işleyin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Form Details */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Truck size={16} className="text-blue-600" /> Teslimat Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Teslimat No</Label>
                <Input value={deliveryNo} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label>İrsaliye No</Label>
                <Input value={waybillNo} onChange={(e) => setWaybillNo(e.target.value)} placeholder="IRS-2024-001" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Teslim Tarihi</Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="bg-white" />
              </div>
            </CardContent>
          </Card>

          {orderInfo && (
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">İlgili Sipariş</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-bold">{orderInfo.order_no}</p>
                <p className="text-xs text-slate-500">{orderInfo.supplier_id}</p>
                <Badge variant="secondary" className="text-[10px]">{orderInfo.status}</Badge>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Upload area */}
        <div className="md:col-span-2 space-y-6">
          {!file ? (
            <Card className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all group">
              <CardContent className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="text-blue-600" size={32} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">Dosyayı Seçin veya Sürükleyin</p>
                  <p className="text-sm text-slate-500">Excel (.xlsx) veya PDF (.pdf) formatında teslimat formu.</p>
                </div>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".xlsx, .pdf"
                  onChange={handleFileUpload}
                />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer gap-2">
                    Dosya Gözat <Search size={16} />
                  </label>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {file.name.endsWith('.pdf') ? <FileText className="text-red-500" /> : <FileSpreadsheet className="text-green-600" />}
                    {file.name}
                  </CardTitle>
                  <CardDescription>{parsedData.length} satır veri bulundu.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setParsedData([]); }} className="text-red-500 hover:text-red-600 hover:bg-red-50">Değiştir</Button>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                      <tr>
                        <th className="px-4 py-2 text-left">Model/Renk</th>
                        <th className="px-4 py-2 text-right">Miktar (Kg)</th>
                        <th className="px-4 py-2 text-center">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <div className="font-medium">{row['Model Kodu'] || row['Model'] || '???'}</div>
                            <div className="text-xs text-slate-400">{row['Renk'] || row['Color'] || '???'}</div>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold">
                            {row['Gelen Kg'] || row['Kg'] || 0} kg
                          </td>
                          <td className="px-4 py-2 text-center">
                            {orderInfo?.items?.some(oi => oi.model_code === (row['Model Kodu'] || row['Model'])) ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Eşleşti</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200">Yeni Kalem</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {parsedData.length > 5 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-center text-slate-400 text-xs italic">
                            + {parsedData.length - 5} satır daha...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => navigate(-1)}>Vazgeç</Button>
                  <Button onClick={handleSave} disabled={uploading} className="bg-green-600 hover:bg-green-700 min-w-[120px] btn-animate">
                    {uploading ? 'Kaydediliyor...' : 'Teslimatı Tamamla'} <Check size={18} className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-sm text-blue-700">
            <AlertCircle size={20} className="shrink-0" />
            <p>
              <strong>İpucu:</strong> Eğer sistemde karşılığı olmayan kalemler yüklenirse, bunlar sistemde yeni kalem olarak işaretlenir. 
              Doğru eşleşme için Model Kodu'nun siparişteki ile aynı olması gerekir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
