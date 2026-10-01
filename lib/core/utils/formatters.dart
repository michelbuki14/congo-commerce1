import 'package:intl/intl.dart';

/// Currency formatters
String formatUSD(double amount) {
  return NumberFormat.currency(
    locale: 'en_US',
    symbol: '\$',
    decimalDigits: 2,
  ).format(amount);
}

String formatCDF(double amount) {
  return NumberFormat.currency(
    locale: 'fr_FR',
    symbol: 'CDF ',
    decimalDigits: 0,
  ).format(amount);
}

String formatCurrency(double amount, String currency) {
  return currency == 'CDF' ? formatCDF(amount) : formatUSD(amount);
}

/// Date formatters
String formatDate(DateTime? date) {
  if (date == null) return '';
  return DateFormat('d MMM yyyy', 'fr').format(date);
}

String formatDateTime(DateTime? date) {
  if (date == null) return '';
  return DateFormat('d MMM yyyy HH:mm', 'fr').format(date);
}

/// Number formatters
String formatNumber(num value) {
  return NumberFormat.decimalPattern('fr').format(value);
}

String formatCompactNumber(num value) {
  if (value >= 1000000) {
    return '${(value / 1000000).toStringAsFixed(1)}M';
  }
  if (value >= 1000) {
    return '${(value / 1000).toStringAsFixed(1)}k';
  }
  return value.toString();
}

/// Rating formatter
String formatRating(double rating) {
  return rating.toStringAsFixed(1);
}

/// Percentage formatter
String formatPercent(double value, {int decimals = 0}) {
  return '${value.toStringAsFixed(decimals)}%';
}