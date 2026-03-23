import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SizeBreakdown } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateOrderNo(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}-${random}`;
}

export function generateDeliveryNo(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TES-${year}-${random}`;
}

export function calculatePaymentDueDate(orderDate: string | Date, termDays: number): string {
  const date = new Date(orderDate);
  date.setDate(date.getDate() + termDays);
  return date.toISOString().split('T')[0];
}

export function formatCurrency(amount: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function parseSizeBreakdownFromText(text: string): SizeBreakdown {
  const breakdown: SizeBreakdown = {};
  // Split by tabs, spaces, or commas
  const parts = text.split(/[\t\s,]+/).filter(Boolean);
  
  for (let i = 0; i < parts.length; i += 2) {
    const size = parts[i];
    const qty = parseInt(parts[i + 1], 10);
    if (size && !isNaN(qty)) {
      breakdown[size] = qty;
    }
  }
  
  return breakdown;
}
