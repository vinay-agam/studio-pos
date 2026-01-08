import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import ProductsPage from "@/pages/ProductsPage";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";

function Dashboard() {
  const stats = useLiveQuery(async () => {
    const today = new Date().toISOString().split("T")[0];
    const orders = await db.orders.toArray();
    const products = await db.products.toArray();

    // Calculate sales for today
    const todaysOrders = orders.filter(o => o.createdAt.startsWith(today));
    const totalSales = todaysOrders.reduce((sum, o) => sum + o.total, 0);

    // Active orders (just an example, maybe status != completed)
    const activeOrders = orders.filter(o => o.status !== "completed").length;

    // Low stock
    const lowStock = products.filter(p => p.inventory < 5).length;

    return { totalSales, activeOrders, lowStock };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Welcome back!</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-lg">Total Sales (Today)</h3>
          <p className="text-3xl font-bold mt-2">${stats?.totalSales.toFixed(2) || "0.00"}</p>
        </div>
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-lg">Active Orders</h3>
          <p className="text-3xl font-bold mt-2">{stats?.activeOrders || 0}</p>
        </div>
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-lg">Low Stock</h3>
          <p className="text-3xl font-bold mt-2">{stats?.lowStock || 0}</p>
        </div>
      </div>
      <div className="mt-8">
        {/* Placeholder for recent activity or chart */}
      </div>
    </div>
  )
}

import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import POSPage from "@/pages/POSPage";
import SettingsPage from "@/pages/SettingsPage";
import CustomersPage from "@/pages/CustomersPage";
import OrdersPage from "@/pages/OrdersPage";
import LoginPage from "@/pages/LoginPage";
import { RoleGuard } from "@/components/RoleGuard";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="products/*" element={<ProductsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="settings" element={
                <RoleGuard allowedRoles={['admin', 'manager']}>
                  <SettingsPage />
                </RoleGuard>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
