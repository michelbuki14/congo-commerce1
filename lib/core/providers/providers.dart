import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_constants.dart';
import '../models/cart_model.dart';
import '../models/product_model.dart';
import '../models/user_model.dart';
import '../services/api_client.dart';
import '../services/product_repository.dart';

// ─── Service providers ─────────────────────────────────────────────────────

/// API client provider
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

/// Product repository provider
final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(ref.watch(apiClientProvider));
});

// ─── Auth providers ─────────────────────────────────────────────────────────

/// Current user provider (null when signed out)
final currentUserProvider = StateProvider<UserModel?>((ref) => null);

/// Auth loading state
final authLoadingProvider = StateProvider<bool>((ref) => true);

/// Auth state provider
final authStateProvider = StateProvider<AuthState>((ref) => AuthState.unknown);

enum AuthState {
  unknown,
  authenticated,
  unauthenticated,
}

// ─── Locale & theme providers ───────────────────────────────────────────────

/// Selected locale
final localeProvider = StateProvider<Locale>((ref) => 
    const Locale(AppConstants.defaultLocale));

/// Theme mode
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.light);

// ─── Cart providers ─────────────────────────────────────────────────────────

/// Shopping cart provider
class CartNotifier extends StateNotifier<CartModel> {
  CartNotifier(this._ref) : super(const CartModel()) {
    _loadCart();
  }
  
  final Ref _ref;
  
  void _loadCart() {
    // Load cart from local storage
    // TODO: Implement persistence
  }
  
  void addItem(ProductModel product, {double quantity = 1, String? variantId}) {
    final item = CartItemModel(
      id: '${product.id}_${DateTime.now().millisecondsSinceEpoch}',
      productId: product.id,
      productName: product.title,
      productImage: product.primaryImage,
      unitPriceUsd: product.priceUsd,
      quantity: quantity,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      tenantId: product.tenantId,
      variantId: variantId,
    );
    state = state.addItem(item);
    _saveCart();
  }
  
  void removeItem(String productId) {
    state = state.removeItem(productId);
    _saveCart();
  }
  
  void updateQuantity(String productId, double quantity) {
    state = state.updateQuantity(productId, quantity);
    _saveCart();
  }
  
  void clear() {
    state = state.clear();
    _saveCart();
  }
  
  void _saveCart() {
    // Persist cart to local storage
    // TODO: Implement persistence
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartModel>((ref) {
  return CartNotifier(ref);
});

/// Cart item count (for badge display)
final cartItemCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider).totalQuantity;
});

// ─── Product providers ──────────────────────────────────────────────────────

/// Featured products
final featuredProductsProvider = FutureProvider<List<ProductModel>>((ref) {
  return ref.watch(productRepositoryProvider).fetchFeatured();
});

/// Flash sale products
final flashSaleProductsProvider = FutureProvider<List<ProductModel>>((ref) {
  return ref.watch(productRepositoryProvider).fetchFlashSales();
});

/// Trending products
final trendingProductsProvider = FutureProvider<List<ProductModel>>((ref) {
  return ref.watch(productRepositoryProvider).fetchTrending();
});

/// New arrivals
final newArrivalsProvider = FutureProvider<List<ProductModel>>((ref) {
  return ref.watch(productRepositoryProvider).fetchNewArrivals();
});

/// Product by ID
final productProvider = FutureProvider.family<ProductModel, String>((ref, productId) {
  return ref.watch(productRepositoryProvider).fetchProduct(productId);
});

/// Similar products
final similarProductsProvider = FutureProvider.family<List<ProductModel>, String>((ref, productId) {
  return ref.watch(productRepositoryProvider).fetchSimilar(productId);
});

/// Categories
final categoriesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(productRepositoryProvider).fetchCategories();
});

// ─── Search providers ───────────────────────────────────────────────────────

/// Search query state
final searchQueryProvider = StateProvider<String>((ref) => '');

/// Search filters state
class SearchFilters {
  final String? category;
  final double? minPrice;
  final double? maxPrice;
  final double? minRating;
  final bool inStockOnly;
  final String? origin;
  final String? sortBy;
  
  const SearchFilters({
    this.category,
    this.minPrice,
    this.maxPrice,
    this.minRating,
    this.inStockOnly = false,
    this.origin,
    this.sortBy = 'relevance',
  });
  
  SearchFilters copyWith({
    String? category,
    double? minPrice,
    double? maxPrice,
    double? minRating,
    bool? inStockOnly,
    String? origin,
    String? sortBy,
  }) {
    return SearchFilters(
      category: category ?? this.category,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      minRating: minRating ?? this.minRating,
      inStockOnly: inStockOnly ?? this.inStockOnly,
      origin: origin ?? this.origin,
      sortBy: sortBy ?? this.sortBy,
    );
  }
  
  bool get hasActiveFilters =>
      category != null ||
      minPrice != null ||
      maxPrice != null ||
      minRating != null ||
      inStockOnly ||
      origin != null;
  
  SearchFilters clear() => const SearchFilters();
}

final searchFiltersProvider = StateProvider<SearchFilters>((ref) => 
    const SearchFilters());

/// Search results
final searchResultsProvider = FutureProvider<List<ProductModel>>((ref) {
  final query = ref.watch(searchQueryProvider);
  final filters = ref.watch(searchFiltersProvider);
  
  if (query.isEmpty && !filters.hasActiveFilters) {
    return Future.value(const []);
  }
  
  return ref.watch(productRepositoryProvider).fetchProducts(
        searchQuery: query.isEmpty ? null : query,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
        inStockOnly: filters.inStockOnly ? true : null,
        origin: filters.origin,
        sortBy: filters.sortBy,
      );
});

// ─── Wishlist providers ─────────────────────────────────────────────────────

/// Wishlist product IDs
final wishlistProvider = StateProvider<Set<String>>((ref) => <String>{});

/// Add to wishlist
void toggleWishlist(WidgetRef ref, String productId) {
  final current = ref.read(wishlistProvider);
  final updated = Set<String>.from(current);
  if (updated.contains(productId)) {
    updated.remove(productId);
  } else {
    updated.add(productId);
  }
  ref.read(wishlistProvider.notifier).state = updated;
}

// ─── Wishlist count provider ───────────────────────────────────────────────

final wishlistCountProvider = Provider<int>((ref) {
  return ref.watch(wishlistProvider).length;
});