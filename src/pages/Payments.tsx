import * as React from 'react';
import { 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  DollarSign,
  Calendar,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPaymentsToExcel } from '@/lib/exportUtils';
import type { OrderWithItems, Payment } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Payments() {
  const [orders, setOrders] = React.useState<OrderWithItems[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Payment Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<OrderWithItems | null>(null);
  const [amount, setAmount] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      
      // Fetch orders with items to calculate total amounts
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('payment_due_date', { ascending: true });

      if (orderError) throw orderError;

      // Fetch all payments to calculate balances
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*');

      if (paymentError) throw paymentError;

      setOrders(orderData || []);
      setPayments(paymentData || []);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayment = async () => {
    if (!selectedOrder || !amount) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          order_id: selectedOrder.id,
          amount: parseFloat(amount),
          payment_date: paymentDate,
          payment_method: 'BANK_TRANSFER', // Default for now
          notes: notes
        });

      if (error) throw error;

      setIsDialogOpen(false);
      setAmount('');
      setNotes('');
      fetchData(); // Refresh data
    } catch (err: any) {
      alert('Ödeme kaydedilemedi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateOrderStats = (order: OrderWithItems) => {
    const totalAmount = order.items?.reduce((sum, item) => sum + (item.ordered_kg * item.unit_price), 0) || 0;
    const paidAmount = payments
      .filter(p => p.order_id === order.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = totalAmount - paidAmount;
    
    const isOverdue = new Date(order.payment_due_date || '') < new Date() && balance > 0;
    const isPaid = balance <= 0;

    return { totalAmount, paidAmount, balance, isOverdue, isPaid };
  };

  const filteredOrders = orders.filter(o => 
    o.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplier_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary Totals
  const totals = orders.reduce((acc, order) => {
    const { balance, isOverdue } = calculateOrderStats(order);
    acc.totalDebt += balance;
    if (isOverdue) acc.overdueDebt += balance;
    return acc;
  }, { totalDebt: 0, overdueDebt: 0 });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ödeme Takibi</h1>
          <p className="text-slate-500 mt-1">Sipariş vadeleri ve finansal durum yönetimi.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 bg-white border-slate-200"
            onClick={() => exportPaymentsToExcel(orders, payments)}
          >
            <Download size={18} /> Rapor İndir
          </Button>
          <Button variant="outline" className="gap-2 bg-white">
            <Filter size={18} /> Filtrelere Bak
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Toplam Borç</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.totalDebt)}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <DollarSign size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Vadesi Geçen</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.overdueDebt)}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-red-600">
                <AlertCircle size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Ödenen Toplam</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </h3>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-green-600">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Area */}
      <Card className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors" size={20} />
            <Input 
              placeholder="Sipariş no veya tedarikçi ara..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sipariş / Tedarikçi</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Toplam Tutar</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Kalan Bakiye</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vade Tarihi</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Durum</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => {
                const { totalAmount, balance, isOverdue, isPaid } = calculateOrderStats(order);
                
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{order.order_no}</div>
                      <div className="text-sm text-slate-500 uppercase">{order.supplier_id}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className={cn("text-sm font-medium", isOverdue ? "text-red-600" : "text-slate-600")}>
                          {order.payment_due_date ? formatDate(order.payment_due_date) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isPaid ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                          <CheckCircle2 size={12} /> Ödendi
                        </Badge>
                      ) : isOverdue ? (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1">
                          <AlertCircle size={12} /> Gecikti
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 gap-1">
                          <Clock size={12} /> Bekliyor
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isPaid && (
                        <Button 
                          size="sm" 
                          className="gap-1 bg-[#1a2744] hover:bg-[#2a3754] btn-animate"
                          onClick={() => {
                            setSelectedOrder(order);
                            setAmount(balance.toString());
                            setIsDialogOpen(true);
                          }}
                        >
                          <CreditCard size={14} /> Ödeme Gir
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ödeme Kaydı Ekle</DialogTitle>
            <DialogDescription>
              {selectedOrder?.order_no} numaralı sipariş için ödeme bilgisi girin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Ödeme Tutarı</Label>
              <Input 
                id="amount" 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Ödeme Tarihi</Label>
              <Input 
                id="date" 
                type="date" 
                value={paymentDate} 
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notlar</Label>
              <Input 
                id="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Havale / Eft detayları..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Vazgeç</Button>
            <Button 
              onClick={handlePayment} 
              disabled={submitting}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white"
            >
              {submitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
