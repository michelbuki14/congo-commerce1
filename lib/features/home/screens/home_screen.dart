import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_constants.dart';
import '../../../core/models/product_model.dart';
import '../../../core/providers/providers.dart';
import '../../../ui/widgets/product_card.dart';
import '../../../ui/widgets/section_header.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.storefront, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 8),
            Text(AppConstants.appName),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(featuredProductsProvider);
          ref.invalidate(trendingProductsProvider);
          ref.invalidate(newArrivalsProvider);
        },
        child: CustomScrollView(
          slivers: [
            // Search bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: _SearchBar(),
              ),
            ),
            
            // Hero banner
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _HeroBanner(),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
            
            // Categories quick access
            SliverToBoxAdapter(
              child: _CategoryStrip(),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
            
            // Flash sale
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Flash sales',
                subtitle: 'Limited time',
                actionLabel: 'See all',
                onAction: () => context.go('/products'),
                icon: Icons.local_fire_department,
                iconColor: Colors.orange,
              ),
            ),
            _FlashSaleStrip(ref),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
            
            // Featured
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Congo Commerce picks',
                subtitle: 'Curated for you',
                actionLabel: 'See all',
                onAction: () => context.go('/products'),
                icon: Icons.star_outline,
              ),
            ),
            _ProductGrid(ref, featuredProductsProvider),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
            
            // Trending
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Trending',
                subtitle: 'Most ordered items',
                actionLabel: 'See all',
                onAction: () => context.go('/products'),
                icon: Icons.trending_up,
              ),
            ),
            _ProductGrid(ref, trendingProductsProvider),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
            
            // New arrivals
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'New arrivals',
                subtitle: 'Fresh on the platform',
                actionLabel: 'See all',
                onAction: () => context.go('/products'),
                icon: Icons.auto_awesome,
              ),
            ),
            _ProductGrid(ref, newArrivalsProvider),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }
}

class _SearchBar extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return TextField(
      readOnly: true,
      onTap: () => context.go('/search'),
      decoration: InputDecoration(
        hintText: AppConstants.appName.isEmpty ? 'Search...' : 'Search products, shops…',
        prefixIcon: const Icon(Icons.search),
        suffixIcon: IconButton(
          icon: const Icon(Icons.tune),
          onPressed: () => context.go('/search'),
        ),
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      // Intrinsic height, not a fixed 160: the fixed box left 112px after
      // padding for content needing ~140px, which overflowed by 28px at the
      // narrow test viewport. Min-height keeps the visual weight on wide
      // screens while letting the column grow when the text needs it to.
      constraints: const BoxConstraints(minHeight: 160),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.primary.withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            bottom: -20,
            child: Icon(
              Icons.shopping_bag,
              size: 120,
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'The best of Congo\nand the world',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Kinshasa delivery in 2-4 days',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ElevatedButton(
                    onPressed: () => context.go('/products'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                    ),
                    child: const Text('Shop now'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryStrip extends StatelessWidget {
  final categories = const [
    (icon: Icons.checkroom, label: 'Fashion'),
    (icon: Icons.face, label: 'Beauty'),
    (icon: Icons.home, label: 'Home'),
    (icon: Icons.devices, label: 'Electronics'),
    (icon: Icons.directions_run, label: 'Sports'),
    (icon: Icons.restaurant, label: 'Food'),
    (icon: Icons.toys, label: 'Kids'),
    (icon: Icons.more_horiz, label: 'More'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final category = categories[index];
          return GestureDetector(
            onTap: () => context.go('/products'),
            child: Column(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    category.icon,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  category.label,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _FlashSaleStrip extends ConsumerWidget {
  final WidgetRef ref;
  
  const _FlashSaleStrip(this.ref);
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(flashSaleProductsProvider);
    
    return productsAsync.when(
      data: (products) {
        if (products.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
        return SliverToBoxAdapter(
          child: SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) => ProductCard(
                product: products[index],
                width: 160,
              ),
            ),
          ),
        );
      },
      loading: () => const SliverToBoxAdapter(
        child: SizedBox(height: 220, child: Center(child: CircularProgressIndicator())),
      ),
      error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
    );
  }
}

class _ProductGrid extends ConsumerWidget {
  final WidgetRef ref;
  final FutureProvider<List<ProductModel>> provider;
  
  const _ProductGrid(this.ref, this.provider);
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(provider);
    
    return productsAsync.when(
      data: (products) {
        if (products.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
        return SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverGrid(
            delegate: SliverChildBuilderDelegate(
              (context, index) => ProductCard(
                product: products[index],
              ),
              childCount: products.length,
            ),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.68,
            ),
          ),
        );
      },
      loading: () => const SliverToBoxAdapter(
        child: SizedBox(height: 200, child: Center(child: CircularProgressIndicator())),
      ),
      error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
    );
  }
}