import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final cart = ref.watch(cartProvider);
    final wishlist = ref.watch(wishlistProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: theme.colorScheme.primary,
                    child: Text(
                      user?.initials ?? '?',
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.fullName ?? 'Guest',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (user?.email != null)
                          Text(
                            user!.email,
                            style: theme.textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          // Stats
          Row(
            children: [
              Expanded(
                child: _StatTile(
                  icon: Icons.shopping_bag_outlined,
                  label: 'Cart',
                  value: '${cart.totalQuantity}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatTile(
                  icon: Icons.favorite_outline,
                  label: 'Favorites',
                  value: '${wishlist.length}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatTile(
                  icon: Icons.receipt_long_outlined,
                  label: 'Orders',
                  value: '0',
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Menu items
          _MenuSection(
            title: 'Shopping',
            items: [
              (Icons.receipt_long_outlined, 'My orders', () {}),
              (Icons.favorite_outline, 'My favorites', () {}),
              (Icons.account_balance_wallet_outlined, 'My wallet', () {}),
              (Icons.local_offer_outlined, 'Promo codes', () {}),
              (Icons.card_giftcard_outlined, 'Loyalty & rewards', () {}),
            ],
          ),
          const SizedBox(height: 16),
          
          _MenuSection(
            title: 'Account',
            items: [
              (Icons.location_on_outlined, 'Saved addresses', () {}),
              (Icons.notifications_outlined, 'Notification settings', () {}),
              (Icons.shield_outlined, 'Privacy settings', () {}),
              (Icons.help_outline, 'Help center', () {}),
              (Icons.language, 'Language', () {}),
            ],
          ),
          const SizedBox(height: 16),
          
          // Seller space
          Card(
            child: ListTile(
              leading: Icon(Icons.storefront, color: theme.colorScheme.primary),
              title: const Text('Seller space'),
              subtitle: const Text('Manage your shop'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 8),
          
          Card(
            child: ListTile(
              leading: Icon(Icons.people_outline, color: theme.colorScheme.primary),
              title: const Text('Creator space'),
              subtitle: const Text('Affiliation & content'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 24),
          
          // Sign out
          OutlinedButton.icon(
            onPressed: () async {
            await ref.read(authNotifierProvider.notifier).logout();
            if (context.mounted) context.go('/login');
          },
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
            style: OutlinedButton.styleFrom(
              foregroundColor: theme.colorScheme.error,
              side: BorderSide(color: theme.colorScheme.error),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  
  const _StatTile({required this.icon, required this.label, required this.value});
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: theme.colorScheme.primary, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  final String title;
  final List<(IconData, String, VoidCallback)> items;
  
  const _MenuSection({required this.title, required this.items});
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: theme.textTheme.labelLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        Card(
          child: Column(
            children: [
              ...items.asMap().entries.map((entry) {
                final item = entry.value;
                return Column(
                  children: [
                    ListTile(
                      leading: Icon(item.$1, color: theme.colorScheme.outline),
                      title: Text(item.$2),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: item.$3,
                    ),
                    if (entry.key < items.length - 1)
                      const Divider(height: 1, indent: 56),
                  ],
                );
              }),
            ],
          ),
        ),
      ],
    );
  }
}