import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import ProductsPage from "@/pages/ProductsPage";

// import { useLiveQuery } from "dexie-react-hooks";
// import { db } from "@/db/db";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import DashboardPage from "@/pages/DashboardPage";
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
    <HashRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
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
    </HashRouter>
  );
}

export default App;
