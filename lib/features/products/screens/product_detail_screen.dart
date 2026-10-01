import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/product_model.dart';
import '../../../core/providers/providers.dart';
import '../../../core/utils/formatters.dart';
import '../../../ui/widgets/product_card.dart';

class ProductDetailScreen extends ConsumerWidget {
  final String productId;
  
  const ProductDetailScreen({super.key, required this.productId});
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(productProvider(productId));
    final wishlist = ref.watch(wishlistProvider);
    final isWishlisted = wishlist.contains(productId);
    
    return Scaffold(
      body: productAsync.when(
        data: (product) => _ProductDetail(product: product, isWishlisted: isWishlisted),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Scaffold(
          appBar: AppBar(),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 16),
                Text('Product not found: $e'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(productProvider(productId)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductDetail extends ConsumerWidget {
  final ProductModel product;
  final bool isWishlisted;
  
  const _ProductDetail({required this.product, required this.isWishlisted});
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final cart = ref.watch(cartProvider);
    final inCart = cart.itemForProduct(product.id);
    
    return CustomScrollView(
      slivers: [
        // App bar with wishlist
        SliverAppBar(
          expandedHeight: 300,
          pinned: true,
          actions: [
            IconButton(
              onPressed: () => toggleWishlist(ref, product.id),
              icon: Icon(isWishlisted ? Icons.favorite : Icons.favorite_border),
              tooltip: isWishlisted ? 'Remove from favorites' : 'Add to favorites',
            ),
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.share_outlined),
              tooltip: 'Share',
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            background: Hero(
              tag: 'product-${product.id}',
              child: product.primaryImage.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: product.primaryImage,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        color: theme.colorScheme.surfaceContainerHighest,
                        child: const Center(child: CircularProgressIndicator()),
                      ),
                      errorWidget: (_, __, ___) => Container(
                        color: theme.colorScheme.surfaceContainerHighest,
                        child: Icon(
                          Icons.image_not_supported_outlined,
                          color: theme.colorScheme.outline,
                          size: 48,
                        ),
                      ),
                    )
                  : Container(
                      color: theme.colorScheme.surfaceContainerHighest,
                      child: Icon(
                        Icons.image_outlined,
                        color: theme.colorScheme.outline,
                        size: 48,
                      ),
                    ),
            ),
          ),
        ),
        
        // Product info
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Badges
                Row(
                  children: [
                    if (product.isFlashSale)
                      _Badge(
                        label: 'Flash sale',
                        color: Colors.orange,
                        icon: Icons.local_fire_department,
                      ),
                    if (product.hasDiscount) ...[
                      const SizedBox(width: 8),
                      _Badge(
                        label: '-${product.discountPercent.round()}%',
                        color: Colors.red,
                      ),
                    ],
                    if (product.isInternational) ...[
                      const SizedBox(width: 8),
                      _Badge(
                        label: 'International',
                        color: theme.colorScheme.primary,
                        icon: Icons.public,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                
                // Title
                Text(
                  product.title,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                
                // Rating
                if (product.rating > 0)
                  Row(
                    children: [
                      ...List.generate(5, (i) {
                        return Icon(
                          i < product.rating.round()
                              ? Icons.star
                              : Icons.star_border,
                          size: 18,
                          color: Colors.amber.shade700,
                        );
                      }),
                      const SizedBox(width: 8),
                      Text(
                        '${formatRating(product.rating)} (${product.reviewsCount} reviews)',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                const SizedBox(height: 16),
                
                // Price
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      formatUSD(product.priceUsd),
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (product.hasDiscount) ...[
                      const SizedBox(width: 12),
                      Text(
                        formatUSD(product.compareAtUsd!),
                        style: theme.textTheme.titleMedium?.copyWith(
                          decoration: TextDecoration.lineThrough,
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                
                // Stock info
                Row(
                  children: [
                    Icon(
                      product.isInStock ? Icons.check_circle : Icons.cancel,
                      size: 18,
                      color: product.isInStock ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      product.isInStock
                          ? '${product.stock.round()} in stock'
                          : 'Out of stock',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: product.isInStock ? Colors.green : Colors.red,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Seller
                if (product.sellerName != null) ...[
                  Row(
                    children: [
                      Icon(Icons.store, size: 18, color: theme.colorScheme.outline),
                      const SizedBox(width: 8),
                      Text(
                        'Sold by ${product.sellerName}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
                
                // Delivery info
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.local_shipping, size: 20, color: theme.colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.isInternational ? 'International import' : 'Local delivery',
                              style: theme.textTheme.titleSmall,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              product.isInternational
                                  ? 'Ships in 12-25 days'
                                  : 'Delivery in 2-4 days',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                
                // Description
                Text(
                  'Description',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  product.description ?? 'No description available.',
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.6),
                ),
                const SizedBox(height: 24),
                
                // Quantity selector
                Text(
                  'Quantity',
                  style: theme.textTheme.titleSmall,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    IconButton.filledTonal(
                      onPressed: () {
                        if (inCart != null) {
                          ref.read(cartProvider.notifier).updateQuantity(product.id, inCart.quantity - 1);
                        }
                      },
                      icon: const Icon(Icons.remove),
                      style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        '${inCart?.quantity.round() ?? 1}',
                        style: theme.textTheme.titleLarge,
                      ),
                    ),
                    IconButton.filledTonal(
                      onPressed: () {
                        if (inCart != null) {
                          ref.read(cartProvider.notifier).updateQuantity(product.id, inCart.quantity + 1);
                        }
                      },
                      icon: const Icon(Icons.add),
                      style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Similar products
                Text(
                  'Similar items',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 220,
                  child: Consumer(
                    builder: (context, ref, _) {
                      final similarAsync = ref.watch(similarProductsProvider(product.id));
                      return similarAsync.when(
                        data: (products) => ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: products.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) => ProductCard(
                            product: products[index],
                            width: 150,
                          ),
                        ),
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (_, __) => const SizedBox.shrink(),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  
  const _Badge({required this.label, required this.color, this.icon});
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}