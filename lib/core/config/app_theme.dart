import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Application themes following Congo Commerce brand system
class AppTheme {
  // Brand colors from BRAND.md
  static const Color primary = Color(0xFF07110D);      // Congo green (near black)
  static const Color primaryForeground = Color(0xFFFFFFFF);
  static const Color secondary = Color(0xFF1a5c2a);      // Lighter green
  static const Color accent = Color(0xFFE8B923);          // Gold accent
  static const Color accentForeground = Color(0xFF07110D);
  
  static const Color background = Color(0xFFFAF9F6);
  static const Color foreground = Color(0xFF141614);
  static const Color card = Color(0xFFFFFFFF);
  static const Color cardForeground = Color(0xFF141614);
  
  static const Color muted = Color(0xFFF0EEE8);
  static const Color mutedForeground = Color(0xFF6B6B6B);
  
  static const Color border = Color(0xFFE5E2DA);
  static const Color input = Color(0xFFE5E2DA);
  static const Color ring = Color(0xFF1a5c2a);
  
  static const Color destructive = Color(0xFFDC2626);
  static const Color destructiveForeground = Color(0xFFFFFFFF);
  
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFD97706);
  static const Color info = Color(0xFF2563EB);

  /// Light theme
  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: secondary,
      primary: secondary,
      secondary: accent,
      surface: background,
      error: destructive,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: foreground,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.poppins(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: foreground,
        ),
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        displayLarge: GoogleFonts.poppins(fontSize: 36, fontWeight: FontWeight.bold, color: foreground),
        headlineLarge: GoogleFonts.poppins(fontSize: 30, fontWeight: FontWeight.bold, color: foreground),
        headlineMedium: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.w600, color: foreground),
        titleLarge: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w600, color: foreground),
        titleMedium: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600, color: foreground),
        titleSmall: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w500, color: foreground),
        bodyLarge: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.normal, color: foreground),
        bodyMedium: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.normal, color: foreground),
        bodySmall: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.normal, color: mutedForeground),
        labelLarge: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
        labelMedium: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500),
        labelSmall: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w500),
      ),
      
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: border),
        ),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: secondary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
          minimumSize: const Size(64, 48), // Touch target
        ),
      ),
      
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: secondary,
          side: BorderSide(color: secondary, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
          minimumSize: const Size(64, 48),
        ),
      ),
      
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: secondary,
          textStyle: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
          minimumSize: const Size(48, 44),
        ),
      ),
      
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: secondary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: destructive),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: destructive, width: 2),
        ),
        labelStyle: GoogleFonts.poppins(fontSize: 14, color: mutedForeground),
        hintStyle: GoogleFonts.poppins(fontSize: 14, color: mutedForeground.withValues(alpha: 0.7)),
      ),
      
      chipTheme: ChipThemeData(
        backgroundColor: muted,
        labelStyle: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: card,
        selectedItemColor: secondary,
        unselectedItemColor: mutedForeground,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w400),
      ),
      
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: card,
        indicatorColor: secondary.withValues(alpha: 0.12),
        elevation: 8,
        height: 64,
        labelTextStyle: WidgetStatePropertyAll(
          GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w500),
        ),
      ),
      
      dividerTheme: DividerThemeData(
        color: border,
        thickness: 1,
        space: 1,
      ),
      
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: secondary,
        linearTrackColor: muted,
        circularTrackColor: muted,
      ),
      
      snackBarTheme: SnackBarThemeData(
        backgroundColor: primary,
        contentTextStyle: GoogleFonts.poppins(fontSize: 14, color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: secondary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      
      dialogTheme: DialogThemeData(
        backgroundColor: card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        titleTextStyle: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600, color: foreground),
        contentTextStyle: GoogleFonts.poppins(fontSize: 14, color: foreground),
      ),
      
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) => 
          states.contains(WidgetState.selected) ? Colors.white : mutedForeground,
        ),
        trackColor: WidgetStateProperty.resolveWith((states) =>
          states.contains(WidgetState.selected) ? secondary : muted,
        ),
      ),
    );
  }

  /// Dark theme
  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: secondary,
      brightness: Brightness.dark,
      primary: Color(0xFF4CAF50),
      secondary: accent,
      surface: Color(0xFF1A1A1A),
      error: Color(0xFFFF6B6B),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Color(0xFF0D0D0D),
      
      appBarTheme: AppBarTheme(
        backgroundColor: Color(0xFF0D0D0D),
        foregroundColor: Colors.white,
        elevation: 0,
        titleTextStyle: GoogleFonts.poppins(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        bodyLarge: GoogleFonts.poppins(fontSize: 16, color: Colors.white),
        bodyMedium: GoogleFonts.poppins(fontSize: 14, color: Colors.white),
        bodySmall: GoogleFonts.poppins(fontSize: 12, color: Colors.white70),
        titleLarge: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white),
        titleMedium: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
      ),
      
      cardTheme: CardThemeData(
        color: Color(0xFF1A1A1A),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.white12),
        ),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Color(0xFF4CAF50),
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          minimumSize: const Size(64, 48),
        ),
      ),
      
      dividerTheme: DividerThemeData(color: Colors.white12),
      
      snackBarTheme: SnackBarThemeData(
        backgroundColor: Colors.white,
        contentTextStyle: GoogleFonts.poppins(fontSize: 14, color: Colors.black),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}