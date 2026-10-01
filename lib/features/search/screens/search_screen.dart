import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/providers.dart';
import '../../../ui/widgets/product_card.dart';

class SearchScreen extends ConsumerWidget {
  const SearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final query = ref.watch(searchQueryProvider);
    final filters = ref.watch(searchFiltersProvider);
    final resultsAsync = ref.watch(searchResultsProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Search products...',
            border: InputBorder.none,
            filled: false,
            suffixIcon: query.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () => ref.read(searchQueryProvider.notifier).state = '',
                  )
                : null,
          ),
          onChanged: (value) => ref.read(searchQueryProvider.notifier).state = value,
        ),
      ),
      body: Column(
        children: [
          // Filters row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                FilterChip(
                  label: Text('All'),
                  selected: !filters.hasActiveFilters,
                  onSelected: (_) => ref.read(searchFiltersProvider.notifier).state = const SearchFilters(),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Local'),
                  selected: filters.origin == 'local',
                  onSelected: (selected) => ref.read(searchFiltersProvider.notifier).state =
                      selected ? filters.copyWith(origin: 'local') : filters.copyWith(origin: null),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('International'),
                  selected: filters.origin == 'international',
                  onSelected: (selected) => ref.read(searchFiltersProvider.notifier).state =
                      selected ? filters.copyWith(origin: 'international') : filters.copyWith(origin: null),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('In stock'),
                  selected: filters.inStockOnly,
                  onSelected: (selected) => ref.read(searchFiltersProvider.notifier).state =
                      filters.copyWith(inStockOnly: selected),
                ),
              ],
            ),
          ),
          
          // Results
          Expanded(
            child: resultsAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 64,
                          color: theme.colorScheme.outline,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No results found',
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        const Text('Try a different keyword'),
                      ],
                    ),
                  );
                }
                
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.68,
                  ),
                  itemCount: products.length,
                  itemBuilder: (context, index) => ProductCard(
                    product: products[index],
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}