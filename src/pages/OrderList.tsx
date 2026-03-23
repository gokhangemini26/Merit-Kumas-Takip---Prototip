import * as React from 'react';
import type { 
  SortingState
} from '@tanstack/react-table';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { OrderWithItems, OrderStatus } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { exportOrdersToExcel } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const columnHelper = createColumnHelper<OrderWithItems>();

const statusColors: Record<OrderStatus, string> = {
  'BEKLEMEDE': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'ÜRETİMDE': 'bg-blue-100 text-blue-700 border-blue-200',
  'KISMİ_TESLİM': 'bg-orange-100 text-orange-700 border-orange-200',
  'TAMAMLANDI': 'bg-green-100 text-green-700 border-green-200',
  'İPTAL': 'bg-red-100 text-red-700 border-red-200',
};

export default function OrderList() {
  const navigate = useNavigate();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [orders, setOrders] = React.useState<OrderWithItems[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const columns = [
    columnHelper.accessor('order_no', {
      header: 'Sipariş No',
      cell: info => <span className="font-bold text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('supplier_id', {
      header: 'Tedarikçi',
      cell: info => <span className="uppercase">{info.getValue()}</span>,
    }),
    columnHelper.accessor('order_date', {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="p-0 hover:bg-transparent">
          Tarih <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: info => formatDate(info.getValue()),
    }),
    columnHelper.accessor('payment_due_date', {
      header: 'Vade Tarihi',
      cell: info => info.getValue() ? formatDate(info.getValue()!) : '-',
    }),
    columnHelper.accessor('status', {
      header: 'Durum',
      cell: info => (
        <Badge variant="outline" className={cn("font-medium px-2.5 py-0.5", statusColors[info.getValue()])}>
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'İşlemler',
      cell: info => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              navigate(`/siparisler/${info.row.original.id}`);
            }}>
              Detayı Görüntüle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Düzenle</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>Siparişi İptal Et</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sipariş Takibi</h1>
          <p className="text-slate-500 mt-1">Tüm kumaş siparişlerinizi buradan yönetin.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="btn-animate gap-2 bg-white border-slate-200"
            onClick={() => exportOrdersToExcel(orders)}
          >
            <FileSpreadsheet size={18} /> Excel İndir
          </Button>
          <Button onClick={() => navigate('/siparisler/yeni')} className="btn-animate gap-2 bg-[#f97316] hover:bg-[#ea580c] shadow-lg shadow-orange-500/20">
            <Plus size={20} /> Yeni Sipariş
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Sipariş no veya tedarikçi ara..." 
              className="pl-10 bg-white"
              value={globalFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter size={16} /> Filtrele
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                    Siparişler yükleniyor...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                    Henüz sipariş bulunmuyor.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/siparisler/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 text-sm text-slate-600">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-medium text-slate-500">
            Toplam {orders.length} siparişten {table.getRowModel().rows.length} tanesi gösteriliyor.
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); table.previousPage(); }} 
              disabled={!table.getCanPreviousPage()}
              className="bg-white h-8 px-3"
            >
              Geri
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); table.nextPage(); }} 
              disabled={!table.getCanNextPage()}
              className="bg-white h-8 px-3"
            >
              İleri
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
