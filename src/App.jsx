import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import RequireLogin from '@/components/RequireLogin';
import AdminOnly from '@/components/AdminOnly';
import { CartProvider } from '@/lib/cart';
import { CurrencyProvider } from '@/lib/currency';
import AppLayout from '@/components/layout/AppLayout';

// Customer
import Home from '@/pages/Home';
import Discover from '@/pages/Discover';
import Categories from '@/pages/Categories';
import Search from '@/pages/Search';
import ProductDetail from '@/pages/ProductDetail';
import Store from '@/pages/Store';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import OrderConfirmation from '@/pages/OrderConfirmation';
import TrackOrder from '@/pages/TrackOrder';
import Wishlist from '@/pages/Wishlist';
import Profile from '@/pages/Profile';
import Wallet from '@/pages/Wallet';
import Coupons from '@/pages/Coupons';
import Referral from '@/pages/Referral';
import Returns from '@/pages/Returns';
import Disputes from '@/pages/Disputes';
import Notifications from '@/pages/Notifications';
import Support from '@/pages/Support';

// Seller
import SellerDashboard from '@/pages/seller/SellerDashboard';
import SellerProducts from '@/pages/seller/SellerProducts';
import SellerOrders from '@/pages/seller/SellerOrders';
import SellerImport from '@/pages/seller/SellerImport';
import SellerWallet from '@/pages/seller/SellerWallet';
import SellerSettings from '@/pages/seller/SellerSettings';

// Admin
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminSuppliers from '@/pages/admin/AdminSuppliers';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminReturns from '@/pages/admin/AdminReturns';
import AdminPayouts from '@/pages/admin/AdminPayouts';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminLogistics from '@/pages/admin/AdminLogistics';
import AdminPromotions from '@/pages/admin/AdminPromotions';
import AdminSettings from '@/pages/admin/AdminSettings';

// Creator
import CreatorDashboard from '@/pages/CreatorDashboard';

// Courier
import CourierConsole from '@/pages/courier/CourierConsole';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/search" element={<Search />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/store/:slug" element={<Store />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:id" element={<OrderConfirmation />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/support" element={<Support />} />
        <Route path="/creator" element={<CreatorDashboard />} />

        <Route element={<RequireLogin />}>
          <Route path="/courier" element={<CourierConsole />} />

          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/import" element={<SellerImport />} />
          <Route path="/seller/wallet" element={<SellerWallet />} />
          <Route path="/seller/settings" element={<SellerSettings />} />

          <Route element={<AdminOnly />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/suppliers" element={<AdminSuppliers />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/returns" element={<AdminReturns />} />
            <Route path="/admin/payouts" element={<AdminPayouts />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/logistics" element={<AdminLogistics />} />
            <Route path="/admin/promotions" element={<AdminPromotions />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <CartProvider>
            <CurrencyProvider>
              <AuthenticatedApp />
            </CurrencyProvider>
          </CartProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App