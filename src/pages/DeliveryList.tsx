import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Delivery } from '@/types';
import { formatDate, cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const statusConfig = {
  'BEKLEMEDE': { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Beklemede' },
  'KONTROL': { color: 'bg-blue-100 text-blue-700', icon: Search, label: 'Kontrol' },
  'ONAYLANDI': { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Onaylandı' },
  'SORUNLU': { color: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'Sorunlu' },
};

export default function DeliveryList() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = React.useState<Delivery[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    async function fetchDeliveries() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('deliveries')
          .select('*')
          .order('delivery_date', { ascending: false });

        if (error) throw error;
        setDeliveries(data || []);
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDeliveries();
  }, []);

  const filteredDeliveries = deliveries.filter(d => 
    d.delivery_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.waybill_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Teslimatlar</h1>
          <p className="text-slate-500 mt-1">Gelen kumaş formları ve depo girişleri.</p>
        </div>
        <Button onClick={() => navigate('/teslimler/yeni')} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 btn-animate">
          <Plus size={20} /> Yeni Teslimat Yükle
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <Input 
            placeholder="Teslimat no veya irsaliye no ile ara..." 
            className="pl-10 bg-white border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2 bg-white border-slate-200">
          <Filter size={18} /> Filtrele
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeliveries.map((delivery) => {
            const config = statusConfig[delivery.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;

            return (
              <Card key={delivery.id} className="glass-card group cursor-pointer hover:border-blue-200 transition-all duration-300" onClick={() => navigate(`/teslimler/${delivery.id}`)}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Truck size={24} />
                    </div>
                    <Badge variant="outline" className={cn("gap-1 font-medium", config.color)}>
                      <StatusIcon size={14} /> {config.label}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{delivery.delivery_no}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <FileDown size={14} /> {delivery.waybill_no || 'İrsaliye Yok'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-400 font-medium">TESLİM TARİHİ</div>
                    <div className="text-sm font-semibold text-slate-700">{formatDate(delivery.delivery_date)}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-medium">KAYNAK</div>
                    <Badge variant="secondary" className="text-[10px] font-bold">{delivery.source_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredDeliveries.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Truck size={48} className="mx-auto text-slate-200" />
              <div className="space-y-1">
                <p className="text-slate-900 font-bold text-lg">Teslimat Bulunamadı</p>
                <p className="text-slate-500">Arama kriterlerinize uygun teslimat kaydı yok.</p>
              </div>
              <Button variant="outline" onClick={() => setSearchTerm('')}>Tümünü Göster</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
