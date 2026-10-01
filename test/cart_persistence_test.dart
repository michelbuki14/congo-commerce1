import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:congo_commerce_flutter/core/models/cart_model.dart';
import 'package:congo_commerce_flutter/core/models/product_model.dart';
import 'package:congo_commerce_flutter/core/providers/providers.dart';
import 'package:congo_commerce_flutter/core/services/cart_persistence.dart';

ProductModel _product({
  required String id,
  required String title,
  required double priceUsd,
  String? sellerId,
}) =>
    ProductModel(id: id, title: title, priceUsd: priceUsd, sellerId: sellerId);

ProviderContainer _container([CartPersistence? persistence]) {
  return ProviderContainer(
    overrides: [
      cartPersistenceProvider.overrideWithValue(
        persistence ?? InMemoryCartPersistence(),
      ),
    ],
  );
}

/// Ensures the CartNotifier exists then waits for its async restore.
Future<void> _settle(ProviderContainer container) async {
  container.read(cartProvider);
  await Future<void>.delayed(const Duration(milliseconds: 20));
}

void main() {
  group('CartNotifier arithmetic', () {
    test('adds, updates, and removes items', () async {
      final container = _container();
      addTearDown(container.dispose);
      await _settle(container);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'Robe', priceUsd: 12.5),
          quantity: 2);

      expect(container.read(cartProvider).itemCount, 1);
      expect(container.read(cartProvider).totalQuantity, 2);
      expect(container.read(cartProvider).subtotalUsd, 25.0);

      notifier.updateQuantity('p1', 3);
      expect(container.read(cartProvider).subtotalUsd, 37.5);

      notifier.removeItem('p1');
      expect(container.read(cartProvider).isEmpty, isTrue);
    });

    test('merges duplicate products into one row', () async {
      final container = _container();
      addTearDown(container.dispose);
      await _settle(container);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'Sac', priceUsd: 10));
      notifier.addItem(_product(id: 'p1', title: 'Sac', priceUsd: 10));

      expect(container.read(cartProvider).itemCount, 1);
      expect(container.read(cartProvider).totalQuantity, 2);
    });

    test('counts distinct sellers for multi-vendor order splitting', () async {
      final container = _container();
      addTearDown(container.dispose);
      await _settle(container);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'A', priceUsd: 5, sellerId: 's1'));
      notifier.addItem(_product(id: 'p2', title: 'B', priceUsd: 7, sellerId: 's1'));
      notifier.addItem(_product(id: 'p3', title: 'C', priceUsd: 9, sellerId: 's2'));

      expect(container.read(cartProvider).sellerCount, 2);
      expect(container.read(cartProvider).subtotalUsd, 21.0);
    });

    test('updating quantity to zero removes the line', () async {
      final container = _container();
      addTearDown(container.dispose);
      await _settle(container);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'X', priceUsd: 4));
      notifier.updateQuantity('p1', 0);

      expect(container.read(cartProvider).isEmpty, isTrue);
    });

    test('a negative quantity is treated as removal', () async {
      final container = _container();
      addTearDown(container.dispose);
      await _settle(container);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'X', priceUsd: 4));
      notifier.updateQuantity('p1', -3);

      expect(container.read(cartProvider).isEmpty, isTrue);
    });

    test('clear empties the cart', () async {
      final container = _container();
      addTearDown(container.dispose);
      await _settle(container);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'X', priceUsd: 4));
      expect(container.read(cartProvider).isNotEmpty, isTrue);

      notifier.clear();
      expect(container.read(cartProvider).isEmpty, isTrue);
    });
  });

  group('Cart persistence', () {
    test('a saved cart is restored by a fresh notifier', () async {
      final persistence = InMemoryCartPersistence();

      final first = _container(persistence);
      first.read(cartProvider.notifier)
          .addItem(_product(id: 'p1', title: 'Robe', priceUsd: 12.5), quantity: 3);
      await _settle(first);
      expect(first.read(cartProvider).totalQuantity, 3);
      first.dispose();

      // A new container against the same store must see the cart again.
      final second = _container(persistence);
      addTearDown(second.dispose);
      await _settle(second);

      expect(second.read(cartProvider).itemCount, 1);
      expect(second.read(cartProvider).totalQuantity, 3);
      expect(second.read(cartProvider).subtotalUsd, 37.5);
    });

    test('clear wipes the persisted cart', () async {
      final persistence = InMemoryCartPersistence();

      final first = _container(persistence);
      first.read(cartProvider.notifier)
          .addItem(_product(id: 'p1', title: 'X', priceUsd: 4));
      await _settle(first);
      first.read(cartProvider.notifier).clear();
      await _settle(first);
      first.dispose();

      final second = _container(persistence);
      addTearDown(second.dispose);
      await _settle(second);

      expect(second.read(cartProvider).isEmpty, isTrue);
    });

    test('cart count badge reflects total quantity', () async {
      final container = _container();
      addTearDown(container.dispose);
      await _settle(container);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'A', priceUsd: 5), quantity: 2);
      notifier.addItem(_product(id: 'p2', title: 'B', priceUsd: 7), quantity: 1);

      expect(container.read(cartItemCountProvider), 3);
    });
  });

  group('SharedPrefsCartPersistence', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('round-trips a cart through SharedPreferences', () async {
      final persistence = SharedPrefsCartPersistence();

      await persistence.save(const CartModel(items: [
        CartItemModel(
          id: 'p1',
          productId: 'p1',
          productName: 'Sac',
          unitPriceUsd: 9.5,
          quantity: 2,
        ),
      ]));

      final restored = await persistence.load();
      expect(restored.itemCount, 1);
      expect(restored.subtotalUsd, 19.0);
      expect(restored.items.first.productName, 'Sac');
    });

    test('returns an empty cart when nothing was stored', () async {
      final restored = await SharedPrefsCartPersistence().load();
      expect(restored.isEmpty, isTrue);
    });

    test('drops a corrupt payload instead of throwing', () async {
      SharedPreferences.setMockInitialValues({
        SharedPrefsCartPersistence.cartKey: 'not-json{',
      });

      final restored = await SharedPrefsCartPersistence().load();
      expect(restored.isEmpty, isTrue);
    });
  });
}