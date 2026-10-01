import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/providers.dart';
import '../../../core/utils/formatters.dart';

class CheckoutScreen extends ConsumerWidget {
  const CheckoutScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final theme = Theme.of(context);
    
    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: const Center(child: Text('Your cart is empty')),
      );
    }
    
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Order summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order summary',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...cart.items.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item.quantity.round()}x ${item.productName}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                        Text(
                          formatUSD(item.lineTotalUsd),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  )),
                  const Divider(),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        formatUSD(cart.subtotalUsd),
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Payment methods
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Payment method',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  RadioListTile<String>(
                    value: 'mpesa',
                    title: const Text('M-Pesa'),
                    subtitle: const Text('Mobile money'),
                    contentPadding: EdgeInsets.zero,
                  ),
                  RadioListTile<String>(
                    value: 'airtel',
                    title: const Text('Airtel Money'),
                    subtitle: const Text('Mobile money'),
                    contentPadding: EdgeInsets.zero,
                  ),
                  RadioListTile<String>(
                    value: 'orange',
                    title: const Text('Orange Money'),
                    subtitle: const Text('Mobile money'),
                    contentPadding: EdgeInsets.zero,
                  ),
                  RadioListTile<String>(
                    value: 'cod',
                    title: const Text('Cash on delivery'),
                    subtitle: const Text('Pay when you receive'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Place order
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: () {},
              child: Text('Pay ${formatUSD(cart.subtotalUsd)}'),
            ),
          ),
        ],
      ),
    );
  }
}