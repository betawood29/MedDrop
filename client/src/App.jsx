// App — root component with routing

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/common/Navbar';
import BottomNav from './components/common/BottomNav';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import OrderNotifications from './components/common/OrderNotifications';
import AnnouncementBar from './components/common/AnnouncementBar';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ShopPage from './pages/ShopPage';
import CategoryPage from './pages/CategoryPage';
import PrintStorePage from './pages/PrintStorePage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PrintOrderDetailPage from './pages/PrintOrderDetailPage';
import ProfilePage from './pages/ProfilePage';
import ProductPage from './pages/ProductPage';
import SubCategoryPage from './pages/SubCategoryPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import SuggestionsPage from './pages/SuggestionsPage';
import PrescriptionPage from './pages/PrescriptionPage';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminUpload from './pages/admin/AdminUpload';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBanner from './pages/admin/AdminBanner';
import AdminPrescriptions from './pages/admin/AdminPrescriptions';

const App = () => {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          <OrderNotifications />

          <Routes>
            {/* Admin routes — separate layout, no bottom nav */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="upload" element={<AdminUpload />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="banner" element={<AdminBanner />} />
              <Route path="prescriptions" element={<AdminPrescriptions />} />
            </Route>

            {/* Customer routes */}
            <Route path="*" element={<CustomerLayout />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

// Customer layout — has navbar + bottom nav
const CustomerLayout = () => {
  return (
    <>
      <Navbar />
      <AnnouncementBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ShopPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/category/:slug/sub" element={<SubCategoryPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/print-store" element={<PrintStorePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={
            <ProtectedRoute><CheckoutPage /></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><OrdersPage /></ProtectedRoute>
          } />
          <Route path="/orders/print/:id" element={
            <ProtectedRoute><PrintOrderDetailPage /></ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/suggestions" element={
            <ProtectedRoute><SuggestionsPage /></ProtectedRoute>
          } />
          <Route path="/prescription" element={
            <ProtectedRoute><PrescriptionPage /></ProtectedRoute>
          } />
          <Route path="*" element={
            <div className="page-container"><div className="empty-state">
              <span className="empty-icon">🤷</span>
              <h3>Page not found</h3>
              <p>The page you're looking for doesn't exist</p>
            </div></div>
          } />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
};

export default App;
