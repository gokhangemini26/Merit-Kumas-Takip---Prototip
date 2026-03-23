import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/shared/Layout';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import OrderForm from './pages/OrderForm';
import OrderDetail from './pages/OrderDetail';
import DeliveryList from './pages/DeliveryList';
import DeliveryForm from './pages/DeliveryForm';
import Payments from './pages/Payments';
import Definitions from './pages/Definitions';

// Placeholder Pages
const DeliveryDetail = () => <div className="p-8"><h1>Teslim Detayı</h1></div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="siparisler" element={<OrderList />} />
          <Route path="siparisler/yeni" element={<OrderForm />} />
          <Route path="siparisler/:id" element={<OrderDetail />} />
          <Route path="teslimler" element={<DeliveryList />} />
          <Route path="teslimler/yeni" element={<DeliveryForm />} />
          <Route path="teslimler/:id" element={<DeliveryDetail />} />
          <Route path="odemeler" element={<Payments />} />
          <Route path="tanimlar" element={<Definitions />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
