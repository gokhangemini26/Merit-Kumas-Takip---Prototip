import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { OrderWithItems } from '@/types';

/**
 * Creates an Excel template for a specific order to be filled by the supplier
 */
export const exportDeliveryTemplate = (order: OrderWithItems) => {
  const data = order.items?.map(item => ({
    'Model Kodu': item.model_code,
    'Renk': item.color_name,
    'Kumaş Tipi': item.fabric_type_id,
    'Sipariş Kg': item.ordered_kg,
    'Gelen Kg': 0, // Supplier will fill this
    'Top Sayısı': 0, // Supplier will fill this
    'Notlar': '',
    '_order_item_id': item.id // Hidden ID for matching
  })) || [];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Teslimat Formu");

  // Adjust column widths
  const wscols = [
    { wch: 15 }, // Model
    { wch: 15 }, // Color
    { wch: 20 }, // Fabric
    { wch: 12 }, // Ordered Kg
    { wch: 12 }, // Delivered Kg
    { wch: 10 }, // Rolls
    { wch: 30 }, // Notes
    { wch: 0 }   // ID (Hidden)
  ];
  worksheet['!cols'] = wscols;

  // Generate filename
  const fileName = `Teslimat_Sablonu_${order.order_no}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  
  // Download file
  XLSX.writeFile(workbook, fileName);
};

/**
 * Parses the filled delivery Excel file
 */
export const parseDeliveryExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
