/// Shopping cart item
class CartItemModel {
  final String id;
  final String productId;
  final String productName;
  final String? productImage;
  final double unitPriceUsd;
  final double quantity;
  final String? sellerId;
  final String? sellerName;
  final String? tenantId;
  final String? variantId;

  const CartItemModel({
    required this.id,
    required this.productId,
    required this.productName,
    this.productImage,
    required this.unitPriceUsd,
    this.quantity = 1,
    this.sellerId,
    this.sellerName,
    this.tenantId,
    this.variantId,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) => CartItemModel(
        id: json['id']?.toString() ?? '',
        productId: json['product_id']?.toString() ?? '',
        productName: json['product_name'] as String? ?? '',
        productImage: json['product_image'] as String?,
        unitPriceUsd: json['unit_price_usd'] == null
            ? 0
            : (json['unit_price_usd'] as num).toDouble(),
        quantity: json['quantity'] == null ? 1 : (json['quantity'] as num).toDouble(),
        sellerId: json['seller_id'] as String?,
        sellerName: json['seller_name'] as String?,
        tenantId: json['tenant_id'] as String?,
        variantId: json['variant_id'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'product_id': productId,
        'product_name': productName,
        'product_image': productImage,
        'unit_price_usd': unitPriceUsd,
        'quantity': quantity,
        'seller_id': sellerId,
        'seller_name': sellerName,
        'tenant_id': tenantId,
        'variant_id': variantId,
      };

  double get lineTotalUsd => unitPriceUsd * quantity;

  CartItemModel copyWith({
    String? productName,
    String? productImage,
    double? unitPriceUsd,
    double? quantity,
    String? variantId,
  }) => CartItemModel(
        id: id,
        productId: productId,
        productName: productName ?? this.productName,
        productImage: productImage ?? this.productImage,
        unitPriceUsd: unitPriceUsd ?? this.unitPriceUsd,
        quantity: quantity ?? this.quantity,
        sellerId: sellerId,
        sellerName: sellerName,
        tenantId: tenantId,
        variantId: variantId ?? this.variantId,
      );
}

/// Shopping cart
class CartModel {
  final List<CartItemModel> items;

  const CartModel({this.items = const []});

  factory CartModel.fromJson(Map<String, dynamic> json) => CartModel(
        items: (json['items'] as List?)
                ?.map((e) => CartItemModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );

  Map<String, dynamic> toJson() => {'items': items.map((i) => i.toJson()).toList()};

  int get itemCount => items.length;

  int get totalQuantity =>
      items.fold(0, (sum, item) => sum + item.quantity.round());

  double get subtotalUsd =>
      items.fold(0.0, (sum, item) => sum + item.lineTotalUsd);

  bool get isEmpty => items.isEmpty;

  bool get isNotEmpty => items.isNotEmpty;

  /// Distinct sellers, used for multi-vendor order splitting at checkout.
  int get sellerCount =>
      items.map((i) => i.sellerId).whereType<String>().toSet().length;

  CartItemModel? itemForProduct(String productId) {
    for (final item in items) {
      if (item.productId == productId) return item;
    }
    return null;
  }

  CartModel addItem(CartItemModel item) {
    final existing = itemForProduct(item.productId);
    if (existing != null) {
      final updated = existing.copyWith(quantity: existing.quantity + item.quantity);
      return CartModel(
        items: [
          for (final i in items)
            if (i.productId == item.productId) updated else i,
        ],
      );
    }
    return CartModel(items: [...items, item]);
  }

  CartModel removeItem(String productId) =>
      CartModel(items: items.where((i) => i.productId != productId).toList());

  CartModel updateQuantity(String productId, double quantity) {
    if (quantity <= 0) return removeItem(productId);
    return CartModel(
      items: [
        for (final i in items)
          if (i.productId == productId) i.copyWith(quantity: quantity) else i,
      ],
    );
  }

  CartModel clear() => const CartModel();
}
