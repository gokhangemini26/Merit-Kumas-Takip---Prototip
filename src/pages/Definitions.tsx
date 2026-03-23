import * as React from 'react';
import { 
  Maximize2, 
  Plus, 
  Trash2, 
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { Building2, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Supplier, FabricType, SizeType } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Definitions() {
  const [activeTab, setActiveTab] = React.useState('suppliers');
  
  // Data States
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [fabrics, setFabrics] = React.useState<FabricType[]>([]);
  const [sizes, setSizes] = React.useState<SizeType[]>([]);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<any>({});
  const [submitting, setSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      const [sRes, fRes, siRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('fabric_types').select('*').order('name'),
        supabase.from('size_types').select('*').order('name')
      ]);

      setSuppliers(sRes.data || []);
      setFabrics(fRes.data || []);
      setSizes(siRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const table = activeTab === 'suppliers' ? 'suppliers' : activeTab === 'fabrics' ? 'fabric_types' : 'size_types';
      let payload = { ...formData };
      
      // Sanitize payload based on tab to avoid extra field errors
      if (activeTab === 'fabrics') {
        payload = { name: formData.name, code: formData.code };
      } else if (activeTab === 'suppliers') {
        payload = { 
          name: formData.name, 
          phone: formData.phone, 
          email: formData.email, 
          address: formData.address 
        };
      } else if (activeTab === 'sizes') {
        payload = { name: formData.name, sizes: formData.sizes };
      }

      const { error } = await supabase
        .from(table)
        .insert(payload);

      if (error) throw error;

      setIsDialogOpen(false);
      setFormData({});
      fetchData();
    } catch (err: any) {
      alert('Kaydedilemedi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    
    try {
      const table = activeTab === 'suppliers' ? 'suppliers' : activeTab === 'fabrics' ? 'fabric_types' : 'size_types';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Silinemedi: ' + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tanımlamalar</h1>
          <p className="text-slate-500 mt-1">Sistem genelinde kullanılan parametrelerin yönetimi.</p>
        </div>
        <Button 
          className="gap-2 bg-[#f97316] hover:bg-[#ea580c] shadow-lg shadow-orange-500/20 btn-animate"
          onClick={() => {
            setFormData({});
            setIsDialogOpen(true);
          }}
        >
          <Plus size={20} /> Yeni Ekle
        </Button>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="suppliers" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building2 size={16} /> Tedarikçiler
          </TabsTrigger>
          <TabsTrigger value="fabrics" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Layers size={16} /> Kumaş Tipleri
          </TabsTrigger>
          <TabsTrigger value="sizes" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Maximize2 size={16} /> Beden Tipleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map(s => (
              <Card key={s.id} className="glass-card group overflow-hidden border-slate-200">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-slate-900">{s.name}</CardTitle>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => handleDelete(s.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone size={14} className="text-slate-400" /> {s.phone || '-'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={14} className="text-slate-400" /> {s.email || '-'}
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                    <MapPin size={14} className="text-slate-400 mt-1 shrink-0" /> {s.address || 'Adres bilgisi yok.'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fabrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fabrics.map(f => (
              <Card key={f.id} className="glass-card group hover:border-orange-200 transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-bold text-slate-800">[{f.code}] {f.name}</span>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all" onClick={() => handleDelete(f.id)}>
                    <Trash2 size={16} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sizes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sizes.map(sz => (
              <Card key={sz.id} className="glass-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold text-slate-900">{sz.name}</CardTitle>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => handleDelete(sz.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <CardDescription>Beden Seti</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sz.sizes.map((s, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-600 font-bold">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Yeni {activeTab === 'suppliers' ? 'Tedarikçi' : activeTab === 'fabrics' ? 'Kumaş Tipi' : 'Beden Seti'} Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {activeTab === 'suppliers' ? (
              <>
                <div className="grid gap-2">
                  <Label>Tedarikçi Adı</Label>
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Örn: ABC Tekstil" />
                </div>
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0212..." />
                </div>
                <div className="grid gap-2">
                  <Label>E-posta</Label>
                  <Input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="info@company.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Adres</Label>
                  <Input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="İl / İlçe / Mahalle..." />
                </div>
              </>
            ) : activeTab === 'fabrics' ? (
              <>
                <div className="grid gap-2">
                  <Label>Kumaş Kodu</Label>
                  <Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Örn: D.FACE" />
                </div>
                <div className="grid gap-2">
                  <Label>Kumaş Adı</Label>
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Örn: %100 Pamuk Süprem" />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Beden Seti Adı</Label>
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Örn: Standart S-XXL" />
                </div>
                <div className="grid gap-2">
                  <Label>Bedenler (Virgülle Ayırın)</Label>
                  <Input 
                    value={formData.sizes?.join(', ') || ''} 
                    onChange={e => setFormData({...formData, sizes: e.target.value.split(',').map((s: string) => s.trim())})} 
                    placeholder="S, M, L, XL, XXL" 
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Vazgeç</Button>
            <Button className="bg-[#f97316] hover:bg-[#ea580c]" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
