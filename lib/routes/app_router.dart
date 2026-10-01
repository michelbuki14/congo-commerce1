import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers/providers.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/register_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/home/screens/discover_screen.dart';
import '../features/products/screens/product_list_screen.dart';
import '../features/products/screens/product_detail_screen.dart';
import '../features/cart/screens/cart_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/search/screens/search_screen.dart';
import '../features/cart/screens/checkout_screen.dart';

// ─── App router provider ────────────────────────────────────────────────────

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/register';
      
      if (authState == AuthState.unknown) {
        return isAuthRoute ? null : '/login';
      }
      
      if (authState == AuthState.unauthenticated) {
        return isAuthRoute ? null : '/login';
      }
      
      if (authState == AuthState.authenticated && isAuthRoute) {
        return '/';
      }
      
      return null;
    },
    routes: [
      // ─── Auth routes ──────────────────────────────────────────────────────
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      
      // ─── Shell route with bottom navigation ──────────────────────────────
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/discover',
            builder: (context, state) => const DiscoverScreen(),
          ),
          GoRoute(
            path: '/products',
            builder: (context, state) => const ProductListScreen(),
          ),
          GoRoute(
            path: '/cart',
            builder: (context, state) => const CartScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      
      // ─── Detail routes (full screen) ──────────────────────────────────────
      GoRoute(
        path: '/product/:id',
        builder: (context, state) => ProductDetailScreen(
          productId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => const CheckoutScreen(),
      ),
    ],
  );
});

// ─── App shell with bottom navigation ───────────────────────────────────────

class AppShell extends ConsumerWidget {
  final Widget child;
  
  const AppShell({super.key, required this.child});
  
  static const _navItems = [
    (icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Accueil', path: '/'),
    (icon: Icons.explore_outlined, activeIcon: Icons.explore, label: 'Découvrir', path: '/discover'),
    (icon: Icons.grid_view_outlined, activeIcon: Icons.grid_view, label: 'Produits', path: '/products'),
    (icon: Icons.shopping_bag_outlined, activeIcon: Icons.shopping_bag, label: 'Panier', path: '/cart'),
    (icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profil', path: '/profile'),
  ];
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final cartCount = ref.watch(cartItemCountProvider);
    
    int currentIndex = 0;
    for (int i = 0; i < _navItems.length; i++) {
      if (_navItems[i].path == location) {
        currentIndex = i;
        break;
      }
    }
    
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          context.go(_navItems[index].path);
        },
        destinations: _navItems.map((item) {
          final isCart = item.path == '/cart';
          return NavigationDestination(
            icon: isCart && cartCount > 0
                ? Badge(
                    label: Text('$cartCount'),
                    child: Icon(item.icon),
                  )
                : Icon(item.icon),
            selectedIcon: Icon(item.activeIcon),
            label: item.label,
          );
        }).toList(),
      ),
    );
  }
}