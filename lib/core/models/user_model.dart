/// User model matching the Base44 User entity.
class UserModel {
  final String id;
  final String email;
  final String? phone;
  final String? firstName;
  final String? lastName;
  final String role;
  final bool isActive;
  final bool isVerified;
  final String? avatarUrl;
  final DateTime? createdDate;

  const UserModel({
    required this.id,
    required this.email,
    this.phone,
    this.firstName,
    this.lastName,
    this.role = 'CUSTOMER',
    this.isActive = true,
    this.isVerified = false,
    this.avatarUrl,
    this.createdDate,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id']?.toString() ?? '',
        email: json['email'] as String? ?? '',
        phone: json['phone_number'] as String? ?? json['phone'] as String?,
        firstName: json['first_name'] as String?,
        lastName: json['last_name'] as String?,
        role: json['role'] as String? ?? 'CUSTOMER',
        isActive: json['is_active'] as bool? ?? true,
        isVerified: json['is_verified'] as bool? ?? false,
        avatarUrl: json['avatar_url'] as String?,
        createdDate: json['created_date'] == null
            ? null
            : DateTime.tryParse(json['created_date'].toString()),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'phone_number': phone,
        'first_name': firstName,
        'last_name': lastName,
        'role': role,
        'is_active': isActive,
        'is_verified': isVerified,
        'avatar_url': avatarUrl,
      };

  String get fullName {
    final first = firstName ?? '';
    final last = lastName ?? '';
    if (first.isEmpty && last.isEmpty) return email.split('@').first;
    return '$first $last'.trim();
  }

  String get initials {
    final name = fullName;
    if (name.isEmpty) return '?';
    final parts = name.split(' ');
    if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  bool get isAdmin => role == 'ADMIN' || role == 'SUPER_ADMIN';

  bool get isSeller => role == 'SELLER';

  bool get isCourier => role == 'COURIER';

  bool get isCreator => role == 'CREATOR';

  bool get isCustomer => role == 'CUSTOMER';

  UserModel copyWith({
    String? email,
    String? phone,
    String? firstName,
    String? lastName,
    String? role,
    bool? isActive,
    bool? isVerified,
    String? avatarUrl,
  }) => UserModel(
        id: id,
        email: email ?? this.email,
        phone: phone ?? this.phone,
        firstName: firstName ?? this.firstName,
        lastName: lastName ?? this.lastName,
        role: role ?? this.role,
        isActive: isActive ?? this.isActive,
        isVerified: isVerified ?? this.isVerified,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        createdDate: createdDate,
      );
}
