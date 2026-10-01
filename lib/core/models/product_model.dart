/// Product model matching the Base44 Product entity.
/// Hand-written serialization (no code generation) so the build never
/// depends on build_runner/analyzer version alignment.
class ProductModel {
  final String id;
  final String title;
  final String? description;
  final String? slug;
  final String? categoryId;
  final String? categoryName;
  final String? brand;
  final List<String> images;
  final String? videoUrl;
  final String? model3dUrl;
  final String? sellerId;
  final String? sellerName;
  final String? supplierId;
  final String? supplierName;
  final String? externalProductId;
  final String sourceType;
  final double? supplierPrice;
  final String currency;
  final double priceUsd;
  final double? compareAtUsd;
  final double? markupPercent;
  final double stock;
  final double? weightKg;
  final String originCountry;
  final String status;
  final bool isFeatured;
  final bool isFlashSale;
  final double rating;
  final int reviewsCount;
  final int soldCount;
  final DateTime? createdDate;
  final DateTime? updatedDate;
  final String? tenantId;

  const ProductModel({
    required this.id,
    required this.title,
    this.description,
    this.slug,
    this.categoryId,
    this.categoryName,
    this.brand,
    this.images = const [],
    this.videoUrl,
    this.model3dUrl,
    this.sellerId,
    this.sellerName,
    this.supplierId,
    this.supplierName,
    this.externalProductId,
    this.sourceType = 'local_seller',
    this.supplierPrice,
    this.currency = 'USD',
    required this.priceUsd,
    this.compareAtUsd,
    this.markupPercent,
    this.stock = 0,
    this.weightKg,
    this.originCountry = 'CD',
    this.status = 'published',
    this.isFeatured = false,
    this.isFlashSale = false,
    this.rating = 0,
    this.reviewsCount = 0,
    this.soldCount = 0,
    this.createdDate,
    this.updatedDate,
    this.tenantId,
  });

  static double _d(Map<String, dynamic> j, String k, [double fallback = 0]) =>
      j[k] == null ? fallback : (j[k] as num).toDouble();

  static int _i(Map<String, dynamic> j, String k, [int fallback = 0]) =>
      j[k] == null ? fallback : (j[k] as num).toInt();

  static DateTime? _date(Map<String, dynamic> j, String k) =>
      j[k] == null ? null : DateTime.tryParse(j[k].toString());

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
        id: json['id']?.toString() ?? '',
        title: json['title'] as String? ?? '',
        description: json['description'] as String?,
        slug: json['slug'] as String?,
        categoryId: json['category_id'] as String?,
        categoryName: json['category_name'] as String?,
        brand: json['brand'] as String?,
        images: (json['images'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        videoUrl: json['video_url'] as String?,
        model3dUrl: json['model_3d_url'] as String?,
        sellerId: json['seller_id'] as String?,
        sellerName: json['seller_name'] as String?,
        supplierId: json['supplier_id'] as String?,
        supplierName: json['supplier_name'] as String?,
        externalProductId: json['external_product_id'] as String?,
        sourceType: json['source_type'] as String? ?? 'local_seller',
        supplierPrice: json['supplier_price'] == null ? null : _d(json, 'supplier_price'),
        currency: json['currency'] as String? ?? 'USD',
        priceUsd: _d(json, 'price_usd'),
        compareAtUsd: json['compare_at_usd'] == null ? null : _d(json, 'compare_at_usd'),
        markupPercent: json['markup_percent'] == null ? null : _d(json, 'markup_percent'),
        stock: _d(json, 'stock'),
        weightKg: json['weight_kg'] == null ? null : _d(json, 'weight_kg'),
        originCountry: json['origin_country'] as String? ?? 'CD',
        status: json['status'] as String? ?? 'published',
        isFeatured: json['is_featured'] as bool? ?? false,
        isFlashSale: json['is_flash_sale'] as bool? ?? false,
        rating: _d(json, 'rating'),
        reviewsCount: _i(json, 'reviews_count'),
        soldCount: _i(json, 'sold_count'),
        createdDate: _date(json, 'created_date'),
        updatedDate: _date(json, 'updated_date'),
        tenantId: json['tenant_id'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'slug': slug,
        'category_id': categoryId,
        'category_name': categoryName,
        'brand': brand,
        'images': images,
        'video_url': videoUrl,
        'model_3d_url': model3dUrl,
        'seller_id': sellerId,
        'seller_name': sellerName,
        'supplier_id': supplierId,
        'supplier_name': supplierName,
        'external_product_id': externalProductId,
        'source_type': sourceType,
        'supplier_price': supplierPrice,
        'currency': currency,
        'price_usd': priceUsd,
        'compare_at_usd': compareAtUsd,
        'markup_percent': markupPercent,
        'stock': stock,
        'weight_kg': weightKg,
        'origin_country': originCountry,
        'status': status,
        'is_featured': isFeatured,
        'is_flash_sale': isFlashSale,
        'rating': rating,
        'reviews_count': reviewsCount,
        'sold_count': soldCount,
        'tenant_id': tenantId,
      };

  bool get isInStock => stock > 0;

  bool get isLocal => sourceType == 'local_seller' || sourceType == 'local_warehouse';

  bool get isInternational => sourceType == 'international_supplier';

  bool get hasDiscount => compareAtUsd != null && compareAtUsd! > priceUsd;

  double get discountPercent =>
      hasDiscount ? ((compareAtUsd! - priceUsd) / compareAtUsd! * 100) : 0;

  String get primaryImage => images.isNotEmpty ? images.first : '';

  ProductModel copyWith({
    String? title,
    String? description,
    double? priceUsd,
    double? compareAtUsd,
    double? stock,
    String? status,
    bool? isFeatured,
    bool? isFlashSale,
  }) =>
      ProductModel(
        id: id,
        title: title ?? this.title,
        description: description ?? this.description,
        slug: slug,
        categoryId: categoryId,
        categoryName: categoryName,
        brand: brand,
        images: images,
        videoUrl: videoUrl,
        model3dUrl: model3dUrl,
        sellerId: sellerId,
        sellerName: sellerName,
        supplierId: supplierId,
        supplierName: supplierName,
        externalProductId: externalProductId,
        sourceType: sourceType,
        supplierPrice: supplierPrice,
        currency: currency,
        priceUsd: priceUsd ?? this.priceUsd,
        compareAtUsd: compareAtUsd ?? this.compareAtUsd,
        markupPercent: markupPercent,
        stock: stock ?? this.stock,
        weightKg: weightKg,
        originCountry: originCountry,
        status: status ?? this.status,
        isFeatured: isFeatured ?? this.isFeatured,
        isFlashSale: isFlashSale ?? this.isFlashSale,
        rating: rating,
        reviewsCount: reviewsCount,
        soldCount: soldCount,
        createdDate: createdDate,
        updatedDate: updatedDate,
        tenantId: tenantId,
      );
}
