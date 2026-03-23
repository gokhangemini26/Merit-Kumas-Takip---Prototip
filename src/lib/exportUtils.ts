import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatCurrency, formatDate } from './utils';
import type { OrderWithItems, Payment } from '@/types';

/**
 * Sipariş listesini Excel formatında dışa aktarır.
 */
export const exportOrdersToExcel = (orders: OrderWithItems[]) => {
  const data = orders.map(order => ({
    'Sipariş No': order.order_no,
    'Tedarikçi': order.supplier_id.toUpperCase(),
    'Sipariş Tarihi': formatDate(order.order_date),
    'Vade Tarihi': order.payment_due_date ? formatDate(order.payment_due_date) : '-',
    'Ödeme Günü': order.payment_term_days + ' Gün',
    'Durum': order.status,
    'Kalem Sayısı': order.items?.length || 0,
    'Toplam Sipariş (Kg)': order.items?.reduce((sum, item) => sum + item.ordered_kg, 0).toFixed(2),
    'Notlar': order.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Siparişler');

  // Dosya adı oluştur: siparisler_2023-10-27.xlsx
  const fileName = `siparisler_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Ödeme listesini ve borç durumunu Excel formatında dışa aktarır.
 */
export const exportPaymentsToExcel = (orders: OrderWithItems[], payments: Payment[]) => {
  const data = orders.map(order => {
    const totalAmount = order.items?.reduce((sum, item) => sum + (item.ordered_kg * item.unit_price), 0) || 0;
    const paidAmount = payments
      .filter(p => p.order_id === order.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = totalAmount - paidAmount;
    
    return {
      'Sipariş No': order.order_no,
      'Tedarikçi': order.supplier_id.toUpperCase(),
      'Sipariş Tutarı': formatCurrency(totalAmount),
      'Ödenen': formatCurrency(paidAmount),
      'Kalan Bakiye': formatCurrency(balance),
      'Vade Tarihi': order.payment_due_date ? formatDate(order.payment_due_date) : '-',
      'Durum': balance <= 0 ? 'ÖDENDİ' : (new Date(order.payment_due_date || '') < new Date() ? 'GECİKTİ' : 'BEKLİYOR')
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ödeme Raporu');

  const fileName = `odeme_raporu_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
