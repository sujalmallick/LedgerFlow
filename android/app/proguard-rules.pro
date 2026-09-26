# React Native ProGuard Rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# ML Kit Text Recognition
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Screens & Safe Area
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native FS & Image Picker
-keep class com.rnfs.** { *; }
-keep class com.imagepicker.** { *; }

# Keep native methods
-keepclasseswithmembers class * {
    native <methods>;
}
