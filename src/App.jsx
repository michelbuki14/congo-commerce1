import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
import RequireLogin from '@/components/RequireLogin';
import AdminOnly from '@/components/AdminOnly';
import { CartProvider } from '@/lib/cart';
import { CurrencyProvider } from '@/lib/currency';
import AppLayout from '@/components/layout/AppLayout';
import Backoffice from '@/pages/Backoffice';
import SalesIntelligence from '@/pages/admin/SalesIntelligence';

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
import Invoice from '@/pages/Invoice';
import Assistant from '@/pages/Assistant';
import MentionsLegales from '@/pages/legal/MentionsLegales';
import CGV from '@/pages/legal/CGV';
import Confidentialite from '@/pages/legal/Confidentialite';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Faq from '@/pages/Faq';
import HelpCenter from '@/pages/HelpCenter';
import ShippingInfo from '@/pages/ShippingInfo';
import BuyerProtection from '@/pages/BuyerProtection';
import SellWithUs from '@/pages/SellWithUs';
import PrivacySettings from '@/pages/PrivacySettings';
import OrderHistory from '@/pages/OrderHistory';
import MyWallet from '@/pages/MyWallet';
import ReferralProgram from '@/pages/ReferralProgram';
import CreatorShowcase from '@/pages/CreatorShowcase';
import PayoutRequests from '@/pages/PayoutRequests';
import MarketingAnalytics from '@/pages/MarketingAnalytics';
import OrderTracking from '@/pages/OrderTracking';
import DisputeCenter from '@/pages/DisputeCenter';
import SellerApplication from '@/pages/SellerApplication';
import ShippingCalculator from '@/pages/ShippingCalculator';
import PickupPoints from '@/pages/PickupPoints';
import TermsOfService from '@/pages/TermsOfService';
import SupportTickets from '@/pages/SupportTickets';
import PlatformGuidelines from '@/pages/PlatformGuidelines';
import CheckoutSuccess from '@/pages/CheckoutSuccess';
import Pricing from '@/pages/Pricing';
import TenantOnboarding from '@/pages/TenantOnboarding';
import TenantConsole from '@/pages/TenantConsole';
import DisputeResolution from '@/pages/DisputeResolution';
import OrderReturns from '@/pages/OrderReturns';
import PlatformAnalytics from '@/pages/PlatformAnalytics';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import PlatformHealth from '@/pages/PlatformHealth';
import ServiceLevelMonitor from '@/pages/ServiceLevelMonitor';
import LogisticsRates from '@/pages/admin/LogisticsRates';
import InventorySheets from '@/pages/admin/InventorySheets';
import ShippingConfig from '@/pages/ShippingConfig';
import CustomerLoyalty from '@/pages/CustomerLoyalty';
import VendorRatings from '@/pages/VendorRatings';
import BulkImport from '@/pages/BulkImport';
import NotificationSettings from '@/pages/NotificationSettings';
import NewsletterPreferences from '@/pages/NewsletterPreferences';
import SavedAddresses from '@/pages/SavedAddresses';
import ProductComparison from '@/pages/ProductComparison';
import PartnerDirectory from '@/pages/PartnerDirectory';
import ActivityFeed from '@/pages/ActivityFeed';
import IntegrationLogs from '@/pages/IntegrationLogs';
import CategoryManager from '@/pages/CategoryManager';
import UserProfile from '@/pages/UserProfile';
import DeliveryMap from '@/pages/DeliveryMap';
import CommandCenter from '@/pages/admin/CommandCenter';
import SupplierPortal from '@/pages/SupplierPortal';
import FraudAlerts from '@/pages/FraudAlerts';
import PaymentMethods from '@/pages/PaymentMethods';
import SellerReports from '@/pages/SellerReports';
import FinancePortal from '@/pages/FinancePortal';
import PickupManager from '@/pages/PickupManager';
import Messages from '@/pages/Messages';
import SellerMessages from '@/pages/seller/SellerMessages';
import SupportInbox from '@/pages/admin/SupportInbox';
import DeveloperPortal from '@/pages/DeveloperPortal';
import Warehouse from '@/pages/admin/Warehouse';
import ChinaWarehouse from '@/pages/admin/ChinaWarehouse';
import ShippingLabels from '@/pages/admin/ShippingLabels';
import AdvancedAnalytics from '@/pages/admin/AdvancedAnalytics';
import TicketAutomation from '@/pages/admin/TicketAutomation';

// Seller
import SellerDashboard from '@/pages/seller/SellerDashboard';
import SellerProducts from '@/pages/seller/SellerProducts';
import SellerOrders from '@/pages/seller/SellerOrders';
import SellerImport from '@/pages/seller/SellerImport';
import SellerWallet from '@/pages/seller/SellerWallet';
import SellerSettings from '@/pages/seller/SellerSettings';
import InventoryManagement from '@/pages/seller/InventoryManagement';
import SellerPortal from '@/pages/seller/SellerPortal';

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
import AdminCompliance from '@/pages/admin/AdminCompliance';
import AdminTenants from '@/pages/admin/AdminTenants';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminEvents from '@/pages/admin/AdminEvents';
import AdminWorkflows from '@/pages/admin/AdminWorkflows';
import AdminFraud from '@/pages/admin/AdminFraud';
import AdminDisputes from '@/pages/admin/AdminDisputes';
import ReturnsPortal from '@/pages/ReturnsPortal';
import PayoutHistory from '@/pages/PayoutHistory';
import PayoutSettings from '@/pages/PayoutSettings';
import DataExport from '@/pages/DataExport';

// Operations & partner consoles
import LogisticsHub from '@/pages/LogisticsHub';
import WorkflowMonitor from '@/pages/WorkflowMonitor';
import SecurityActivity from '@/pages/SecurityActivity';
import CoverageMap from '@/pages/CoverageMap';
import MerchantDisputes from '@/pages/MerchantDisputes';
import PayoutLedger from '@/pages/PayoutLedger';
import BulkOrders from '@/pages/BulkOrders';
import MarketTrends from '@/pages/MarketTrends';
import TaxReports from '@/pages/TaxReports';
import InventoryAlerts from '@/pages/InventoryAlerts';
import PartnerAiSettings from '@/pages/PartnerAiSettings';

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
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/store/:slug" element={<Store />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:number" element={<OrderConfirmation />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/returns-portal" element={<ReturnsPortal />} />
        <Route path="/order-returns" element={<OrderReturns />} />
        <Route path="/vendor-onboarding" element={<Navigate to="/seller-application" replace />} />
        <Route path="/seller-onboarding" element={<Navigate to="/seller-application" replace />} />
        <Route path="/customer-loyalty" element={<CustomerLoyalty />} />
        <Route path="/vendor-ratings" element={<VendorRatings />} />
        <Route path="/product-comparison" element={<ProductComparison />} />
        <Route path="/partner-directory" element={<PartnerDirectory />} />
        <Route path="/activity-feed" element={<ActivityFeed />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/support" element={<Support />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/invoice/:number" element={<Invoice />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/shipping-info" element={<ShippingInfo />} />
        <Route path="/buyer-protection" element={<BuyerProtection />} />
        <Route path="/sell-with-us" element={<SellWithUs />} />
        <Route path="/privacy-settings" element={<PrivacySettings />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/my-wallet" element={<MyWallet />} />
        <Route path="/referral-program" element={<ReferralProgram />} />
        <Route path="/creator-showcase" element={<CreatorShowcase />} />
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/dispute-center" element={<DisputeCenter />} />
        <Route path="/seller-application" element={<SellerApplication />} />
        <Route path="/shipping-calculator" element={<ShippingCalculator />} />
        <Route path="/pickup-points" element={<PickupPoints />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/support-tickets" element={<SupportTickets />} />
        <Route path="/platform-guidelines" element={<PlatformGuidelines />} />
        <Route path="/checkout-success" element={<CheckoutSuccess />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/developers" element={<DeveloperPortal />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/cgv" element={<CGV />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route element={<RequireLogin />}>
          <Route path="/messages" element={<Messages />} />
          <Route path="/payout-requests" element={<PayoutRequests />} />
          <Route path="/dispute-resolution" element={<DisputeResolution />} />
          <Route path="/subscription-plans" element={<SubscriptionPlans />} />
          <Route path="/payout-portal" element={<Navigate to="/payout-requests" replace />} />
          <Route path="/courier-dashboard" element={<Navigate to="/courier" replace />} />
          <Route path="/inventory-manager" element={<Navigate to="/inventory-management" replace />} />
          <Route path="/creator-revenue" element={<Navigate to="/creator" replace />} />
          <Route path="/tax-compliance" element={<Navigate to="/tax-reports" replace />} />
          <Route path="/bulk-import" element={<BulkImport />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/newsletter-signup" element={<NewsletterPreferences />} />
          <Route path="/saved-addresses" element={<SavedAddresses />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/payment-methods" element={<PaymentMethods />} />
          <Route path="/seller-reports" element={<SellerReports />} />
          <Route path="/account-activity" element={<Navigate to="/security-activity" replace />} />
          <Route path="/tax-documents" element={<Navigate to="/tax-reports" replace />} />
          <Route path="/creator" element={<CreatorDashboard />} />
          <Route path="/courier" element={<CourierConsole />} />

          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/import" element={<SellerImport />} />
          <Route path="/seller/wallet" element={<SellerWallet />} />
          <Route path="/seller/settings" element={<SellerSettings />} />
          <Route path="/seller-portal" element={<SellerPortal />} />
          <Route path="/seller/messages" element={<SellerMessages />} />
          <Route path="/payout-history" element={<PayoutHistory />} />
          <Route path="/payout-settings" element={<PayoutSettings />} />
          <Route path="/data-export" element={<DataExport />} />
          <Route path="/inventory-management" element={<InventoryManagement />} />
          <Route path="/partner-ai-settings" element={<PartnerAiSettings />} />
          <Route path="/security-activity" element={<SecurityActivity />} />
          <Route path="/merchant-disputes" element={<MerchantDisputes />} />
          <Route path="/payout-ledger" element={<PayoutLedger />} />
          <Route path="/coverage-map" element={<CoverageMap />} />
          <Route path="/bulk-orders" element={<BulkOrders />} />
          <Route path="/market-trends" element={<MarketTrends />} />
          <Route path="/tax-reports" element={<TaxReports />} />
          <Route path="/inventory-alerts" element={<InventoryAlerts />} />
          <Route path="/tenant" element={<TenantConsole />} />
          <Route path="/tenant-onboarding" element={<TenantOnboarding />} />

          <Route element={<AdminOnly />}>
            <Route path="/marketing-analytics" element={<MarketingAnalytics />} />
            <Route path="/platform-analytics" element={<PlatformAnalytics />} />
            <Route path="/marketplace-promos" element={<AdminPromotions />} />
            <Route path="/fraud-rules" element={<AdminFraud />} />
            <Route path="/supplier-integration" element={<AdminSuppliers />} />
            <Route path="/compliance-center" element={<AdminCompliance />} />
            <Route path="/platform-health" element={<PlatformHealth />} />
            <Route path="/service-level-monitor" element={<ServiceLevelMonitor />} />
            <Route path="/logistics-rates" element={<LogisticsRates />} />
            <Route path="/inventory-sheets" element={<InventorySheets />} />
            <Route path="/integration-logs" element={<IntegrationLogs />} />
            <Route path="/category-manager" element={<CategoryManager />} />
            <Route path="/delivery-map" element={<DeliveryMap />} />
            <Route path="/admin/command-center" element={<CommandCenter />} />
            <Route path="/supplier-portal" element={<SupplierPortal />} />
            <Route path="/fraud-alerts" element={<FraudAlerts />} />
            <Route path="/finance" element={<FinancePortal />} />
            <Route path="/pickup-manager" element={<PickupManager />} />
            <Route path="/warehouse" element={<Warehouse />} />
            <Route path="/china-warehouse" element={<ChinaWarehouse />} />
            <Route path="/shipping-labels" element={<ShippingLabels />} />
            <Route path="/analytics" element={<AdvancedAnalytics />} />
            <Route path="/ticket-automation" element={<TicketAutomation />} />
            <Route path="/support-inbox" element={<SupportInbox />} />
            <Route path="/shipping-config" element={<ShippingConfig />} />
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
            <Route path="/admin/compliance" element={<AdminCompliance />} />
            <Route path="/admin/tenants" element={<AdminTenants />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/workflows" element={<AdminWorkflows />} />
            <Route path="/admin/fraud" element={<AdminFraud />} />
            <Route path="/admin/billing" element={<AdminBilling />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/logistics-hub" element={<LogisticsHub />} />
            <Route path="/workflow-monitor" element={<WorkflowMonitor />} />
          </Route>
        </Route>
      </Route>
      <Route element={<RequireLogin />}>
        <Route element={<AdminOnly />}>
          <Route path="/backoffice" element={<Backoffice />} />
          <Route path="/backoffice/sales" element={<SalesIntelligence />} />
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
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