import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_model.dart';

/// Persists the shopping cart across app restarts.
///
/// Uses SharedPreferences (plain JSON) rather than secure storage: a cart holds
/// product ids and quantities, not credentials. Abstracted so tests can
/// substitute an in-memory double — SharedPreferences has no test
/// implementation without calling setMockInitialValues.
abstract class CartPersistence {
  Future<CartModel> load();
  Future<void> save(CartModel cart);
  Future<void> clear();
}

class SharedPrefsCartPersistence implements CartPersistence {
  static const String cartKey = 'shopping_cart_v1';

  @override
  Future<CartModel> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(cartKey);
    if (raw == null || raw.isEmpty) return const CartModel();

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const CartModel();
      return CartModel.fromJson(decoded.cast<String, dynamic>());
    } on FormatException {
      // Corrupt payload: drop it rather than crash on every launch.
      await prefs.remove(cartKey);
      return const CartModel();
    }
  }

  @override
  Future<void> save(CartModel cart) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(cartKey, jsonEncode(cart.toJson()));
  }

  @override
  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(cartKey);
  }
}

class InMemoryCartPersistence implements CartPersistence {
  CartModel? _cart;

  @override
  Future<CartModel> load() async => _cart ?? const CartModel();

  @override
  Future<void> save(CartModel cart) async => _cart = cart;

  @override
  Future<void> clear() async => _cart = null;
}
