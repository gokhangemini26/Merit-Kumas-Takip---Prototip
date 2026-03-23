import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Truck, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Calendar,
  Plus,
  Clock
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Order } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    activeOrders: 0,
    monthlyKg: 0,
    pendingPayments: 0,
    completionRate: 0
  });
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [recentOrders, setRecentOrders] = React.useState<Order[]>([]);

  React.useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Fetch Orders
        const { data: orders } = await supabase.from('orders').select('*');
        
        // 2. Fetch Deliveries (Last 30 days)
        const { data: deliveries } = await supabase.from('deliveries').select('*');
        
        // 3. Fetch Payments
        await supabase.from('payments').select('*');

        // Calculate Stats
        const active = orders?.filter(o => o.status !== 'TAMAMLANDI').length || 0;
        const totalKg = deliveries?.reduce((sum, d) => sum + (d.total_kg || 0), 0) || 0;
        
        // Simplified chart data (Last 6 months)
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'];
        const mockChartData = months.map(m => ({
          name: m,
          siparis: Math.floor(Math.random() * 50) + 10,
          teslimat: Math.floor(Math.random() * 40) + 5,
        }));

        setStats({
          activeOrders: active,
          monthlyKg: totalKg,
          pendingPayments: 125400, // Mock for now
          completionRate: 78
        });
        setChartData(mockChartData);
        setRecentOrders(orders?.slice(0, 5) || []);

    } finally {
    }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hoş Geldiniz, Gökhan 👋</h1>
          <p className="text-slate-500 mt-1">İşte bugün sistemdeki genel durumunuz.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white gap-2 shadow-sm">
            <Calendar size={18} /> Son 30 Gün
          </Button>
          <Button className="bg-[#f97316] hover:bg-[#ea580c] gap-2 shadow-lg shadow-orange-500/20 btn-animate" onClick={() => navigate('/siparisler/yeni')}>
            <Plus size={20} /> Yeni Sipariş
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIItem 
          title="Aktif Siparişler" 
          value={stats.activeOrders.toString()} 
          icon={ShoppingCart} 
          trend="+12%" 
          trendUp={true}
          color="blue"
          onClick={() => navigate('/siparisler')}
        />
        <KPIItem 
          title="Aylık Teslimat" 
          value={`${stats.monthlyKg} kg`} 
          icon={Truck} 
          trend="+5.4%" 
          trendUp={true}
          color="orange"
          onClick={() => navigate('/teslimatlar')}
        />
        <KPIItem 
          title="Bekleyen Ödemeler" 
          value={formatCurrency(stats.pendingPayments)} 
          icon={CreditCard} 
          trend="-2.1%" 
          trendUp={false}
          color="red"
          onClick={() => navigate('/odemeler')}
        />
        <KPIItem 
          title="Tamamlanma Oranı" 
          value={`%${stats.completionRate}`} 
          icon={TrendingUp} 
          trend="+8%" 
          trendUp={true}
          color="green"
          onClick={() => navigate('/siparisler')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Operasyonel Trend</CardTitle>
                <CardDescription>Aylık sipariş ve teslimat performansı.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <div className="w-3 h-3 rounded-full bg-orange-500" /> Sipariş
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <div className="w-3 h-3 rounded-full bg-blue-500" /> Teslimat
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="siparis" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSip)" />
                <Area type="monotone" dataKey="teslimat" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTes)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Sipariş Durumları</CardTitle>
            <CardDescription>Mevcut siparişlerin dağılımı.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Beklemede', value: 40 },
                    { name: 'Üretimde', value: 30 },
                    { name: 'Teslim Edildi', value: 30 },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs text-slate-500">Beklemede</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-500">Üretimde</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-slate-500">Tamamlandı</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Son Siparişler</CardTitle>
              <CardDescription>Sisteme son eklenen 5 sipariş.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600" onClick={() => navigate('/siparisler')}>Tümünü Gör</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{order.order_no}</p>
                      <p className="text-xs text-slate-500 uppercase">{order.supplier_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{order.status}</Badge>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(order.order_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Alerts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Önemli Hatırlatıcılar</CardTitle>
            <CardDescription>Dikkat etmeniz gereken kritik noktalar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertItem 
              icon={AlertCircle} 
              title="Vadesi Geçen Ödemeler" 
              desc="3 adet siparişin vade tarihi geçti." 
              color="red"
              onClick={() => navigate('/odemeler')}
            />
            <AlertItem 
              icon={Clock} 
              title="Bekleyen Teslimatlar" 
              desc="Onay bekleyen 5 yeni teslimat formu var." 
              color="blue"
              onClick={() => navigate('/teslimatlar')}
            />
            <AlertItem 
              icon={CheckCircle2} 
              title="Tamamlanan Kalemler" 
              desc="Bugün 12 kalem ürün sorunsuz kapatıldı." 
              color="green"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPIItem({ title, value, icon: Icon, trend, trendUp, color, onClick }: any) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100'
  };

  return (
    <Card 
      className="glass-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl border", colorMap[color as keyof typeof colorMap])}>
            <Icon size={22} />
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-bold", trendUp ? "text-green-600" : "text-red-600")}>
            {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
        <p className="text-sm font-semibold text-slate-400 mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

function AlertItem({ icon: Icon, title, desc, color, onClick }: any) {
  const colors = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600'
  };

  return (
    <div 
      className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className={cn("p-2 rounded-lg shrink-0", colors[color as keyof typeof colors])}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-wider">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
    </div>
  );
}
