// Smoke tests for the Congo Commerce Flutter shell: cart state + model parsing.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:congo_commerce_flutter/core/config/app_constants.dart';
import 'package:congo_commerce_flutter/core/models/product_model.dart';
import 'package:congo_commerce_flutter/core/providers/providers.dart';
import 'package:congo_commerce_flutter/core/services/cart_persistence.dart';

ProductModel _product({
  required String id,
  required String title,
  required double priceUsd,
  String? sellerId,
}) =>
    ProductModel(
      id: id,
      title: title,
      priceUsd: priceUsd,
      sellerId: sellerId,
    );

void main() {
  group('CartNotifier', () {
    test('adds, updates, and removes items', () {
      final container = ProviderContainer(
        overrides: [cartPersistenceProvider.overrideWithValue(InMemoryCartPersistence())],
      );
      addTearDown(container.dispose);

      final notifier = container.read(cartProvider.notifier);
      expect(container.read(cartProvider).isEmpty, isTrue);

      notifier.addItem(
        _product(id: 'p1', title: 'Robe', priceUsd: 12.5),
        quantity: 2,
      );
      expect(container.read(cartProvider).itemCount, 1);
      expect(container.read(cartProvider).totalQuantity, 2);
      expect(container.read(cartProvider).subtotalUsd, 25.0);

      notifier.updateQuantity('p1', 3);
      expect(container.read(cartProvider).subtotalUsd, 37.5);

      notifier.removeItem('p1');
      expect(container.read(cartProvider).isEmpty, isTrue);
    });

    test('merges duplicate products into one row', () {
      final container = ProviderContainer(
        overrides: [cartPersistenceProvider.overrideWithValue(InMemoryCartPersistence())],
      );
      addTearDown(container.dispose);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'Sac', priceUsd: 10));
      notifier.addItem(_product(id: 'p1', title: 'Sac', priceUsd: 10));

      expect(container.read(cartProvider).itemCount, 1);
      expect(container.read(cartProvider).totalQuantity, 2);
    });

    test('counts distinct sellers for multi-vendor order splitting', () {
      final container = ProviderContainer(
        overrides: [cartPersistenceProvider.overrideWithValue(InMemoryCartPersistence())],
      );
      addTearDown(container.dispose);

      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_product(id: 'p1', title: 'A', priceUsd: 5, sellerId: 's1'));
      notifier.addItem(_product(id: 'p2', title: 'B', priceUsd: 7, sellerId: 's1'));
      notifier.addItem(_product(id: 'p3', title: 'C', priceUsd: 9, sellerId: 's2'));

      expect(container.read(cartProvider).sellerCount, 2);
      expect(container.read(cartProvider).subtotalUsd, 21.0);
    });
  });

  group('ProductModel', () {
    test('parses a Base44-shaped payload', () {
      final product = ProductModel.fromJson({
        'id': 'abc',
        'title': 'Montre connectée',
        'price_usd': 14.5,
        'compare_at_usd': 20.0,
        'stock': 90,
        'rating': 4.5,
        'reviews_count': 12,
        'images': ['https://example.com/a.jpg'],
        'source_type': 'international_supplier',
      });

      expect(product.id, 'abc');
      expect(product.title, 'Montre connectée');
      expect(product.priceUsd, 14.5);
      expect(product.hasDiscount, isTrue);
      expect(product.discountPercent, closeTo(27.5, 0.01));
      expect(product.isInternational, isTrue);
      expect(product.isInStock, isTrue);
      expect(product.primaryImage, 'https://example.com/a.jpg');
      expect(product.reviewsCount, 12);
    });

    test('defaults are safe when fields are absent', () {
      final product = ProductModel.fromJson({'id': 'x', 'title': 'y'});

      expect(product.currency, 'USD');
      expect(product.sourceType, 'local_seller');
      expect(product.status, 'published');
      expect(product.originCountry, 'CD');
      expect(product.priceUsd, 0);
      expect(product.stock, 0);
      expect(product.images, isEmpty);
      expect(product.primaryImage, '');
      expect(product.hasDiscount, isFalse);
      expect(product.isLocal, isTrue);
    });

    test('round-trips through toJson', () {
      final original = ProductModel.fromJson({
        'id': 'abc',
        'title': 'Sac à main',
        'price_usd': 9.9,
        'stock': 3,
        'seller_id': 's9',
        'images': ['a', 'b'],
      });
      final restored = ProductModel.fromJson(original.toJson());

      expect(restored.id, original.id);
      expect(restored.title, original.title);
      expect(restored.priceUsd, original.priceUsd);
      expect(restored.stock, original.stock);
      expect(restored.sellerId, original.sellerId);
      expect(restored.images, original.images);
    });
  });

  test('AppConstants exposes the marketplace identity', () {
    expect(AppConstants.appName, 'Congo Commerce');
    expect(AppConstants.supportedLocales, contains('fr'));
    expect(AppConstants.defaultLocale, 'fr');
  });
}
