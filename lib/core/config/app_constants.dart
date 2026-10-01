/// Application constants and configuration
class AppConstants {
  static const String appName = 'Congo Commerce';
  static const String appTagline = 'The DRC Marketplace for Local & Global Trade';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String baseUrl = 'https://api.congocommerce.com/v1';
  static const String websocketUrl = 'wss://ws.congocommerce.com';
  
  // Timeout values
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Cache durations
  static const Duration cacheExpiration = Duration(hours: 1);
  static const Duration imageCacheExpiration = Duration(days: 7);
  
  // Feature flags
  static const bool enableAnalytics = true;
  static const bool enableCrashlytics = true;
  static const bool enablePushNotifications = true;
  
  // Supported locales
  static const List<String> supportedLocales = ['en', 'fr', 'ln', 'sw'];
  static const String defaultLocale = 'fr';
  
  // Currency
  static const String defaultCurrency = 'USD';
  static const String localCurrency = 'CDF';
  static const double usdToCdfRate = 2800.0;
  
  // Storage keys
  static const String userTokenKey = 'user_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userPreferencesKey = 'user_preferences';
  static const String cartKey = 'shopping_cart';
  static const String localeKey = 'selected_locale';
  static const String themeModeKey = 'theme_mode';
  
  // Deep links
  static const String deepLinkScheme = 'congocommerce';
  static const String deepLinkHost = 'app';
  
  // Social
  static const String websiteUrl = 'https://congocommerce.com';
  static const String facebookUrl = 'https://facebook.com/congocommerce';
  static const String twitterUrl = 'https://twitter.com/congocommerce';
  static const String instagramUrl = 'https://instagram.com/congocommerce';
  
  // Support
  static const String supportEmail = 'support@congocommerce.com';
  static const String supportPhone = '+243 81 000 0000';
}