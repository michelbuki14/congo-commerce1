import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ErrorBoundary"
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
import { motion } from 'framer-motion';
import { Suspense, lazy } from 'react';
import LoadingFallback from '@/components/LoadingFallback';

// Customer - lazy load all page components for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Discover = lazy(() => import('@/pages/Discover'));
const Categories = lazy(() => import('@/pages/Categories'));
const Search = lazy(() => import('@/pages/Search'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Store = lazy(() => import('@/pages/Store'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const Wishlist = lazy(() => import('@/pages/Wishlist'));
const Profile = lazy(() => import('@/pages/Profile'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const Coupons = lazy(() => import('@/pages/Coupons'));
const Referral = lazy(() => import('@/pages/Referral'));
const Returns = lazy(() => import('@/pages/Returns'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Support = lazy(() => import('@/pages/Support'));
const Invoice = lazy(() => import('@/pages/Invoice'));
const Assistant = lazy(() => import('@/pages/Assistant'));
const MentionsLegales = lazy(() => import('@/pages/legal/MentionsLegales'));
const CGV = lazy(() => import('@/pages/legal/CGV'));
const Confidentialite = lazy(() => import('@/pages/legal/Confidentialite'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const Faq = lazy(() => import('@/pages/Faq'));
const HelpCenter = lazy(() => import('@/pages/HelpCenter'));
const ShippingInfo = lazy(() => import('@/pages/ShippingInfo'));
const BuyerProtection = lazy(() => import('@/pages/BuyerProtection'));
const SellWithUs = lazy(() => import('@/pages/SellWithUs'));
const PrivacySettings = lazy(() => import('@/pages/PrivacySettings'));
const OrderHistory = lazy(() => import('@/pages/OrderHistory'));
const ReferralProgram = lazy(() => import('@/pages/ReferralProgram'));
const CreatorShowcase = lazy(() => import('@/pages/CreatorShowcase'));
const PayoutRequests = lazy(() => import('@/pages/PayoutRequests'));
const MarketingAnalytics = lazy(() => import('@/pages/MarketingAnalytics'));
const OrderTracking = lazy(() => import('@/pages/OrderTracking'));
const SellerApplication = lazy(() => import('@/pages/SellerApplication'));
const ShippingCalculator = lazy(() => import('@/pages/ShippingCalculator'));
const PickupPoints = lazy(() => import('@/pages/PickupPoints'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const SupportTickets = lazy(() => import('@/pages/SupportTickets'));
const PlatformGuidelines = lazy(() => import('@/pages/PlatformGuidelines'));
const CheckoutSuccess = lazy(() => import('@/pages/CheckoutSuccess'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const TenantOnboarding = lazy(() => import('@/pages/TenantOnboarding'));
const TenantConsole = lazy(() => import('@/pages/TenantConsole'));
const DisputeResolution = lazy(() => import('@/pages/DisputeResolution'));
const DisputeCenter = lazy(() => import('@/pages/DisputeCenter'));
const PlatformAnalytics = lazy(() => import('@/pages/PlatformAnalytics'));
const SubscriptionPlans = lazy(() => import('@/pages/SubscriptionPlans'));
const PlatformHealth = lazy(() => import('@/pages/PlatformHealth'));
const ServiceLevelMonitor = lazy(() => import('@/pages/ServiceLevelMonitor'));
const LogisticsRates = lazy(() => import('@/pages/admin/LogisticsRates'));
const InventorySheets = lazy(() => import('@/pages/admin/InventorySheets'));
const ShippingConfig = lazy(() => import('@/pages/ShippingConfig'));
const CustomerLoyalty = lazy(() => import('@/pages/CustomerLoyalty'));
const VendorRatings = lazy(() => import('@/pages/VendorRatings'));
const BulkImport = lazy(() => import('@/pages/BulkImport'));
const NotificationSettings = lazy(() => import('@/pages/NotificationSettings'));
const NewsletterPreferences = lazy(() => import('@/pages/NewsletterPreferences'));
const SavedAddresses = lazy(() => import('@/pages/SavedAddresses'));
const ProductComparison = lazy(() => import('@/pages/ProductComparison'));
const PartnerDirectory = lazy(() => import('@/pages/PartnerDirectory'));
const ActivityFeed = lazy(() => import('@/pages/ActivityFeed'));
const IntegrationLogs = lazy(() => import('@/pages/IntegrationLogs'));
const CategoryManager = lazy(() => import('@/pages/CategoryManager'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const DeliveryMap = lazy(() => import('@/pages/DeliveryMap'));
const CommandCenter = lazy(() => import('@/pages/admin/CommandCenter'));
const SupplierPortal = lazy(() => import('@/pages/SupplierPortal'));
const FraudAlerts = lazy(() => import('@/pages/FraudAlerts'));
const PaymentMethods = lazy(() => import('@/pages/PaymentMethods'));
const SellerReports = lazy(() => import('@/pages/SellerReports'));
const FinancePortal = lazy(() => import('@/pages/FinancePortal'));
const PickupManager = lazy(() => import('@/pages/PickupManager'));
const Messages = lazy(() => import('@/pages/Messages'));
const SellerMessages = lazy(() => import('@/pages/seller/SellerMessages'));
const SupportInbox = lazy(() => import('@/pages/admin/SupportInbox'));
const DeveloperPortal = lazy(() => import('@/pages/DeveloperPortal'));
const Warehouse = lazy(() => import('@/pages/admin/Warehouse'));
const ChinaWarehouse = lazy(() => import('@/pages/admin/ChinaWarehouse'));
const ShippingLabels = lazy(() => import('@/pages/admin/ShippingLabels'));
const AdvancedAnalytics = lazy(() => import('@/pages/admin/AdvancedAnalytics'));
const TicketAutomation = lazy(() => import('@/pages/admin/TicketAutomation'));

// Seller
const SellerDashboard = lazy(() => import('@/pages/seller/SellerDashboard'));
const SellerProducts = lazy(() => import('@/pages/seller/SellerProducts'));
const SellerOrders = lazy(() => import('@/pages/seller/SellerOrders'));
const SellerImport = lazy(() => import('@/pages/seller/SellerImport'));
const SellerWallet = lazy(() => import('@/pages/seller/SellerWallet'));
const SellerSettings = lazy(() => import('@/pages/seller/SellerSettings'));
const InventoryManagement = lazy(() => import('@/pages/seller/InventoryManagement'));
const SellerPortal = lazy(() => import('@/pages/seller/SellerPortal'));

// Admin
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminSuppliers = lazy(() => import('@/pages/admin/AdminSuppliers'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'));
const AdminReturns = lazy(() => import('@/pages/admin/AdminReturns'));
const AdminPayouts = lazy(() => import('@/pages/admin/AdminPayouts'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminLogistics = lazy(() => import('@/pages/admin/AdminLogistics'));
const AdminPromotions = lazy(() => import('@/pages/admin/AdminPromotions'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminCompliance = lazy(() => import('@/pages/admin/AdminCompliance'));
const AdminTenants = lazy(() => import('@/pages/admin/AdminTenants'));
const AdminNotifications = lazy(() => import('@/pages/admin/AdminNotifications'));
const AdminEvents = lazy(() => import('@/pages/admin/AdminEvents'));
const AdminWorkflows = lazy(() => import('@/pages/admin/AdminWorkflows'));
const AdminFraud = lazy(() => import('@/pages/admin/AdminFraud'));
const AdminDisputes = lazy(() => import('@/pages/admin/AdminDisputes'));
const AdminBilling = lazy(() => import('@/pages/admin/AdminBilling'));
const PayoutHistory = lazy(() => import('@/pages/PayoutHistory'));
const PayoutSettings = lazy(() => import('@/pages/PayoutSettings'));
const DataExport = lazy(() => import('@/pages/DataExport'));

// Operations & partner consoles
const LogisticsHub = lazy(() => import('@/pages/LogisticsHub'));
const WorkflowMonitor = lazy(() => import('@/pages/WorkflowMonitor'));
const SecurityActivity = lazy(() => import('@/pages/SecurityActivity'));
const CoverageMap = lazy(() => import('@/pages/CoverageMap'));
const MerchantDisputes = lazy(() => import('@/pages/MerchantDisputes'));
const PayoutLedger = lazy(() => import('@/pages/PayoutLedger'));
const BulkOrders = lazy(() => import('@/pages/BulkOrders'));
const MarketTrends = lazy(() => import('@/pages/MarketTrends'));
const TaxReports = lazy(() => import('@/pages/TaxReports'));
const InventoryAlerts = lazy(() => import('@/pages/InventoryAlerts'));
const PartnerAiSettings = lazy(() => import('@/pages/PartnerAiSettings'));

// Creator
const CreatorDashboard = lazy(() => import('@/pages/CreatorDashboard'));

// Courier
const CourierConsole = lazy(() => import('@/pages/courier/CourierConsole'));

const PageWrapper = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
}

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
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <Routes>
        <Route element={<AppLayout />}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/discover" element={<PageWrapper><Discover /></PageWrapper>} />
        <Route path="/categories" element={<PageWrapper><Categories /></PageWrapper>} />
        <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
        <Route path="/product/:slug" element={<PageWrapper><ProductDetail /></PageWrapper>} />
        <Route path="/store/:slug" element={<PageWrapper><Store /></PageWrapper>} />
        <Route path="/cart" element={<PageWrapper><Cart /></PageWrapper>} />
        <Route path="/checkout" element={<PageWrapper><Checkout /></PageWrapper>} />
        <Route path="/order/:number" element={<PageWrapper><OrderConfirmation /></PageWrapper>} />
        <Route path="/track" element={<Navigate to={`/order-tracking${window.location.search}`} replace />} />
        <Route path="/wishlist" element={<PageWrapper><Wishlist /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
        <Route path="/wallet" element={<PageWrapper><Wallet /></PageWrapper>} />
        <Route path="/coupons" element={<PageWrapper><Coupons /></PageWrapper>} />
        <Route path="/referral" element={<PageWrapper><Referral /></PageWrapper>} />
        <Route path="/returns" element={<PageWrapper><Returns /></PageWrapper>} />
        <Route path="/returns-portal" element={<Navigate to="/returns" replace />} />
        <Route path="/order-returns" element={<Navigate to="/returns" replace />} />
        <Route path="/vendor-onboarding" element={<Navigate to="/seller-application" replace />} />
        <Route path="/seller-onboarding" element={<Navigate to="/seller-application" replace />} />
        <Route path="/customer-loyalty" element={<PageWrapper><CustomerLoyalty /></PageWrapper>} />
        <Route path="/vendor-ratings" element={<PageWrapper><VendorRatings /></PageWrapper>} />
        <Route path="/product-comparison" element={<PageWrapper><ProductComparison /></PageWrapper>} />
        <Route path="/partner-directory" element={<PageWrapper><PartnerDirectory /></PageWrapper>} />
        <Route path="/activity-feed" element={<PageWrapper><ActivityFeed /></PageWrapper>} />
        <Route path="/disputes" element={<Navigate to="/dispute-center" replace />} />
        <Route path="/notifications" element={<PageWrapper><Notifications /></PageWrapper>} />
        <Route path="/support" element={<PageWrapper><Support /></PageWrapper>} />
        <Route path="/assistant" element={<PageWrapper><Assistant /></PageWrapper>} />
        <Route path="/invoice/:number" element={<PageWrapper><Invoice /></PageWrapper>} />
        <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
        <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
        <Route path="/faq" element={<PageWrapper><Faq /></PageWrapper>} />
        <Route path="/help-center" element={<PageWrapper><HelpCenter /></PageWrapper>} />
        <Route path="/shipping-info" element={<PageWrapper><ShippingInfo /></PageWrapper>} />
        <Route path="/buyer-protection" element={<PageWrapper><BuyerProtection /></PageWrapper>} />
        <Route path="/sell-with-us" element={<PageWrapper><SellWithUs /></PageWrapper>} />
        <Route path="/privacy-settings" element={<PageWrapper><PrivacySettings /></PageWrapper>} />
        <Route path="/order-history" element={<PageWrapper><OrderHistory /></PageWrapper>} />
        <Route path="/my-wallet" element={<Navigate to="/wallet" replace />} />
        <Route path="/referral-program" element={<PageWrapper><ReferralProgram /></PageWrapper>} />
        <Route path="/creator-showcase" element={<PageWrapper><CreatorShowcase /></PageWrapper>} />
        <Route path="/order-tracking" element={<PageWrapper><OrderTracking /></PageWrapper>} />
        <Route path="/dispute-center" element={<PageWrapper><DisputeCenter /></PageWrapper>} />
        <Route path="/seller-application" element={<PageWrapper><SellerApplication /></PageWrapper>} />
        <Route path="/shipping-calculator" element={<PageWrapper><ShippingCalculator /></PageWrapper>} />
        <Route path="/pickup-points" element={<PageWrapper><PickupPoints /></PageWrapper>} />
        <Route path="/terms-of-service" element={<PageWrapper><TermsOfService /></PageWrapper>} />
        <Route path="/support-tickets" element={<PageWrapper><SupportTickets /></PageWrapper>} />
        <Route path="/platform-guidelines" element={<PageWrapper><PlatformGuidelines /></PageWrapper>} />
        <Route path="/checkout-success" element={<PageWrapper><CheckoutSuccess /></PageWrapper>} />
        <Route path="/pricing" element={<PageWrapper><Pricing /></PageWrapper>} />
        <Route path="/developers" element={<PageWrapper><DeveloperPortal /></PageWrapper>} />
        <Route path="/mentions-legales" element={<PageWrapper><MentionsLegales /></PageWrapper>} />
        <Route path="/cgv" element={<PageWrapper><CGV /></PageWrapper>} />
        <Route path="/confidentialite" element={<PageWrapper><Confidentialite /></PageWrapper>} />
        <Route element={<RequireLogin />}>
          <Route path="/messages" element={<PageWrapper><ErrorBoundary><Messages /></ErrorBoundary></PageWrapper>} />
          <Route path="/payout-requests" element={<PageWrapper><PayoutRequests /></PageWrapper>} />
          <Route path="/dispute-resolution" element={<PageWrapper><DisputeResolution /></PageWrapper>} />
          <Route path="/subscription-plans" element={<PageWrapper><SubscriptionPlans /></PageWrapper>} />
          <Route path="/payout-portal" element={<Navigate to="/payout-requests" replace />} />
          <Route path="/courier-dashboard" element={<Navigate to="/courier" replace />} />
          <Route path="/inventory-manager" element={<Navigate to="/inventory-management" replace />} />
          <Route path="/creator-revenue" element={<Navigate to="/creator" replace />} />
          <Route path="/tax-compliance" element={<Navigate to="/tax-reports" replace />} />
          <Route path="/bulk-import" element={<PageWrapper><BulkImport /></PageWrapper>} />
          <Route path="/notification-settings" element={<PageWrapper><NotificationSettings /></PageWrapper>} />
          <Route path="/newsletter-signup" element={<PageWrapper><NewsletterPreferences /></PageWrapper>} />
          <Route path="/saved-addresses" element={<PageWrapper><SavedAddresses /></PageWrapper>} />
          <Route path="/user-profile" element={<PageWrapper><UserProfile /></PageWrapper>} />
          <Route path="/payment-methods" element={<PageWrapper><PaymentMethods /></PageWrapper>} />
          <Route path="/seller-reports" element={<PageWrapper><SellerReports /></PageWrapper>} />
          <Route path="/account-activity" element={<Navigate to="/security-activity" replace />} />
          <Route path="/tax-documents" element={<Navigate to="/tax-reports" replace />} />
          <Route path="/creator" element={<PageWrapper><ErrorBoundary><CreatorDashboard /></ErrorBoundary></PageWrapper>} />
          <Route path="/courier" element={<PageWrapper><ErrorBoundary><CourierConsole /></ErrorBoundary></PageWrapper>} />

          <Route path="/seller" element={<PageWrapper><SellerDashboard /></PageWrapper>} />
          <Route path="/seller/products" element={<PageWrapper><SellerProducts /></PageWrapper>} />
          <Route path="/seller/orders" element={<PageWrapper><SellerOrders /></PageWrapper>} />
          <Route path="/seller/import" element={<PageWrapper><SellerImport /></PageWrapper>} />
          <Route path="/seller/wallet" element={<PageWrapper><SellerWallet /></PageWrapper>} />
          <Route path="/seller/settings" element={<PageWrapper><SellerSettings /></PageWrapper>} />
          <Route path="/seller-portal" element={<PageWrapper><SellerPortal /></PageWrapper>} />
          <Route path="/seller/messages" element={<PageWrapper><SellerMessages /></PageWrapper>} />
          <Route path="/payout-history" element={<PageWrapper><PayoutHistory /></PageWrapper>} />
          <Route path="/payout-settings" element={<PageWrapper><PayoutSettings /></PageWrapper>} />
          <Route path="/data-export" element={<PageWrapper><DataExport /></PageWrapper>} />
          <Route path="/inventory-management" element={<PageWrapper><InventoryManagement /></PageWrapper>} />
          <Route path="/partner-ai-settings" element={<PageWrapper><PartnerAiSettings /></PageWrapper>} />
          <Route path="/security-activity" element={<PageWrapper><SecurityActivity /></PageWrapper>} />
          <Route path="/merchant-disputes" element={<PageWrapper><MerchantDisputes /></PageWrapper>} />
          <Route path="/payout-ledger" element={<PageWrapper><PayoutLedger /></PageWrapper>} />
          <Route path="/coverage-map" element={<PageWrapper><CoverageMap /></PageWrapper>} />
          <Route path="/bulk-orders" element={<PageWrapper><BulkOrders /></PageWrapper>} />
          <Route path="/market-trends" element={<PageWrapper><MarketTrends /></PageWrapper>} />
          <Route path="/tax-reports" element={<PageWrapper><TaxReports /></PageWrapper>} />
          <Route path="/inventory-alerts" element={<PageWrapper><InventoryAlerts /></PageWrapper>} />
          <Route path="/tenant" element={<PageWrapper><TenantConsole /></PageWrapper>} />
          <Route path="/tenant-onboarding" element={<PageWrapper><TenantOnboarding /></PageWrapper>} />

          <Route element={<AdminOnly />}>
            <Route path="/marketing-analytics" element={<PageWrapper><MarketingAnalytics /></PageWrapper>} />
            <Route path="/platform-analytics" element={<PageWrapper><PlatformAnalytics /></PageWrapper>} />
            <Route path="/marketplace-promos" element={<PageWrapper><AdminPromotions /></PageWrapper>} />
            <Route path="/fraud-rules" element={<PageWrapper><AdminFraud /></PageWrapper>} />
            <Route path="/supplier-integration" element={<PageWrapper><AdminSuppliers /></PageWrapper>} />
            <Route path="/compliance-center" element={<PageWrapper><AdminCompliance /></PageWrapper>} />
            <Route path="/platform-health" element={<PageWrapper><PlatformHealth /></PageWrapper>} />
            <Route path="/service-level-monitor" element={<PageWrapper><ServiceLevelMonitor /></PageWrapper>} />
            <Route path="/logistics-rates" element={<PageWrapper><LogisticsRates /></PageWrapper>} />
            <Route path="/inventory-sheets" element={<PageWrapper><InventorySheets /></PageWrapper>} />
            <Route path="/integration-logs" element={<PageWrapper><IntegrationLogs /></PageWrapper>} />
            <Route path="/category-manager" element={<PageWrapper><CategoryManager /></PageWrapper>} />
            <Route path="/delivery-map" element={<PageWrapper><DeliveryMap /></PageWrapper>} />
            <Route path="/admin/command-center" element={<PageWrapper><CommandCenter /></PageWrapper>} />
            <Route path="/supplier-portal" element={<PageWrapper><SupplierPortal /></PageWrapper>} />
            <Route path="/fraud-alerts" element={<PageWrapper><FraudAlerts /></PageWrapper>} />
            <Route path="/finance" element={<PageWrapper><FinancePortal /></PageWrapper>} />
            <Route path="/pickup-manager" element={<PageWrapper><PickupManager /></PageWrapper>} />
            <Route path="/warehouse" element={<PageWrapper><Warehouse /></PageWrapper>} />
            <Route path="/china-warehouse" element={<PageWrapper><ChinaWarehouse /></PageWrapper>} />
            <Route path="/shipping-labels" element={<PageWrapper><ShippingLabels /></PageWrapper>} />
            <Route path="/analytics" element={<PageWrapper><AdvancedAnalytics /></PageWrapper>} />
            <Route path="/ticket-automation" element={<PageWrapper><TicketAutomation /></PageWrapper>} />
            <Route path="/support-inbox" element={<PageWrapper><SupportInbox /></PageWrapper>} />
            <Route path="/shipping-config" element={<PageWrapper><ShippingConfig /></PageWrapper>} />
            <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
            <Route path="/admin/products" element={<PageWrapper><AdminProducts /></PageWrapper>} />
            <Route path="/admin/suppliers" element={<PageWrapper><AdminSuppliers /></PageWrapper>} />
            <Route path="/admin/orders" element={<PageWrapper><AdminOrders /></PageWrapper>} />
            <Route path="/admin/returns" element={<PageWrapper><AdminReturns /></PageWrapper>} />
            <Route path="/admin/payouts" element={<PageWrapper><AdminPayouts /></PageWrapper>} />
            <Route path="/admin/users" element={<PageWrapper><AdminUsers /></PageWrapper>} />
            <Route path="/admin/logistics" element={<PageWrapper><AdminLogistics /></PageWrapper>} />
            <Route path="/admin/promotions" element={<PageWrapper><AdminPromotions /></PageWrapper>} />
            <Route path="/admin/settings" element={<PageWrapper><AdminSettings /></PageWrapper>} />
            <Route path="/admin/compliance" element={<PageWrapper><AdminCompliance /></PageWrapper>} />
            <Route path="/admin/tenants" element={<PageWrapper><AdminTenants /></PageWrapper>} />
            <Route path="/admin/notifications" element={<PageWrapper><AdminNotifications /></PageWrapper>} />
            <Route path="/admin/events" element={<PageWrapper><AdminEvents /></PageWrapper>} />
            <Route path="/admin/workflows" element={<PageWrapper><AdminWorkflows /></PageWrapper>} />
            <Route path="/admin/fraud" element={<PageWrapper><AdminFraud /></PageWrapper>} />
            <Route path="/admin/billing" element={<PageWrapper><AdminBilling /></PageWrapper>} />
            <Route path="/admin/disputes" element={<PageWrapper><AdminDisputes /></PageWrapper>} />
            <Route path="/logistics-hub" element={<PageWrapper><LogisticsHub /></PageWrapper>} />
            <Route path="/workflow-monitor" element={<PageWrapper><WorkflowMonitor /></PageWrapper>} />
          </Route>
        </Route>
      </Route>
      <Route element={<RequireLogin />}>
        <Route element={<AdminOnly />}>
          <Route path="/backoffice" element={<PageWrapper><Backoffice /></PageWrapper>} />
          <Route path="/backoffice/sales" element={<PageWrapper><SalesIntelligence /></PageWrapper>} />
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      <Route path="*" element={<PageNotFound />} />
      </Routes>
    </motion.div>
  );
};

function App() {

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}

export default App