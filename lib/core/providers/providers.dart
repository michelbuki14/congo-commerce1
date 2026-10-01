import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_constants.dart';
import '../models/cart_model.dart';
import '../models/product_model.dart';
import '../models/user_model.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/cart_persistence.dart';
import '../services/product_repository.dart';
import '../services/token_storage.dart';

// ─── Service providers ─────────────────────────────────────────────────────

/// API client provider
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(tokens: ref.watch(tokenStorageProvider));
});

/// Auth service provider
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(tokens: ref.watch(tokenStorageProvider));
});

/// Token storage provider. Overridden in tests with [InMemoryTokenStorage].
final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return SecureTokenStorage();
});

/// Product repository provider
final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(ref.watch(apiClientProvider));
});

// ─── Auth providers ─────────────────────────────────────────────────────────

enum AuthState {
  unknown,
  authenticated,
  unauthenticated,
}

/// Current user provider (null when signed out)
final currentUserProvider = StateProvider<UserModel?>((ref) => null);

/// Auth notifier for managing auth state with real API calls
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._ref) : super(AuthState.unknown) {
    _initAuth();
  }

  final Ref _ref;

  Future<void> _initAuth() async {
      // Restore a stored session on cold start.
      final authService = _ref.read(authServiceProvider);
      final tokens = _ref.read(tokenStorageProvider);
    final hasSession =
        await tokens.getAccessToken() != null || await tokens.getRefreshToken() != null;

      if (!hasSession) {
        state = AuthState.unauthenticated;
        return;
      }

      try {
        final user = await authService.getCurrentUser();
        _ref.read(currentUserProvider.notifier).state = user;
        state = AuthState.authenticated;
      } catch (_) {
        // The stored access token may have expired; try the refresh token once.
        if (await authService.refreshToken()) {
          try {
            final user = await authService.getCurrentUser();
            _ref.read(currentUserProvider.notifier).state = user;
            state = AuthState.authenticated;
            return;
          } catch (_) {
            // Refresh succeeded but /me still failed — treat as signed out.
          }
        }
        await _ref.read(tokenStorageProvider).clearAll();
        _ref.read(currentUserProvider.notifier).state = null;
        state = AuthState.unauthenticated;
      }
    }

  Future<void> login({
      required String email,
      required String password,
      bool rememberMe = false,
    }) async {
      final authService = _ref.read(authServiceProvider);

      try {
        final user = await authService.login(
          email: email,
          password: password,
          rememberMe: rememberMe,
        );
        _ref.read(currentUserProvider.notifier).state = user;
        state = AuthState.authenticated;
      } catch (_) {
        // Stay on AuthState.unknown rather than flipping to unauthenticated: the
        // router redirects unknown away from /login, which would bounce the user
        // out of the form before they can read the error.
        state = AuthState.unauthenticated;
        rethrow;
      }
    }

  Future<void> register({
      required String email,
      required String password,
      required String firstName,
      required String lastName,
      String? phone,
    }) async {
      final authService = _ref.read(authServiceProvider);

      try {
        final user = await authService.register(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
          phone: phone,
        );
        _ref.read(currentUserProvider.notifier).state = user;
        state = AuthState.authenticated;
      } catch (_) {
        state = AuthState.unauthenticated;
        rethrow;
      }
    }

  Future<void> logout() async {
    try {
      final authService = _ref.read(authServiceProvider);
      await authService.logout();
    } finally {
      await _ref.read(tokenStorageProvider).clearAll();
      _ref.read(currentUserProvider.notifier).state = null;
      state = AuthState.unauthenticated;
    }
  }

  Future<void> refreshUser() async {
    try {
      final authService = _ref.read(authServiceProvider);
      final user = await authService.getCurrentUser();
      _ref.read(currentUserProvider.notifier).state = user;
      state = AuthState.authenticated;
    } catch (e) {
      state = AuthState.unauthenticated;
    }
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});

final authStateProvider = Provider<AuthState>((ref) {
  return ref.watch(authNotifierProvider);
});

// ─── Locale & theme providers ───────────────────────────────────────────────

/// Selected locale
final localeProvider = StateProvider<Locale>((ref) => 
    const Locale(AppConstants.defaultLocale));

/// Theme mode
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.light);

// ─── Cart providers ─────────────────────────────────────────────────────────

/// Cart persistence provider. Overridden in tests with
/// [InMemoryCartPersistence].
final cartPersistenceProvider = Provider<CartPersistence>((ref) {
  return SharedPrefsCartPersistence();
});

/// Shopping cart provider.
///
/// Restores any saved cart on construction and writes it back on every
/// mutation, so a restart no longer empties the cart.
class CartNotifier extends StateNotifier<CartModel> {
  CartNotifier(this._persistence) : super(const CartModel()) {
    _restore();
  }

  final CartPersistence _persistence;

  /// Tracks disposal explicitly rather than using StateNotifier.mounted: during
    /// the provider factory's first call `mounted` is still false, so guarding on
    /// it would skip the initial restore entirely. Assigning `state` after
    /// dispose throws, hence the flag.
    bool _disposed = false;

    /// Set by the first user mutation. The restore is async, so without this the
        /// load can resolve *after* an addItem and overwrite it, silently dropping
        /// whatever the shopper just added.
        bool _mutatedBeforeRestore = false;

        @override
        void dispose() {
          _disposed = true;
          super.dispose();
        }

        Future<void> _restore() async {
          CartModel loaded;
          try {
            loaded = await _persistence.load();
          } catch (_) {
            // A failed restore must not block the app from starting.
            loaded = const CartModel();
          }
          if (_disposed) return;

          if (_mutatedBeforeRestore) {
            // Merge rather than replace: the shopper's live edits win, and lines
            // from the saved cart they have not re-added still come back.
            var merged = state;
            for (final item in loaded.items) {
              if (merged.itemForProduct(item.productId) == null) {
                merged = merged.addItem(item);
              }
            }
            state = merged;
            _persist();
            return;
          }

          state = loaded;
        }

  void addItem(ProductModel product, {double quantity = 1, String? variantId}) {
    final item = CartItemModel(
      // Stable id: the product id alone, so a reload merges instead of
      // duplicating when the same item is added twice.
      id: variantId == null ? product.id : '${product.id}::$variantId',
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
    _mutatedBeforeRestore = true;
    state = state.addItem(item);
    _persist();
  }

  void removeItem(String productId) {
    _mutatedBeforeRestore = true;
    state = state.removeItem(productId);
    _persist();
  }

  void updateQuantity(String productId, double quantity) {
    _mutatedBeforeRestore = true;
    state = state.updateQuantity(productId, quantity);
    _persist();
  }

  void clear() {
    state = state.clear();
    _persist(clearStore: true);
  }

  void _persist({bool clearStore = false}) {
    final snapshot = state;
    unawaited(
      clearStore
          ? _persistence.clear()
          : _persistence.save(snapshot),
    );
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartModel>((ref) {
  return CartNotifier(ref.watch(cartPersistenceProvider));
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