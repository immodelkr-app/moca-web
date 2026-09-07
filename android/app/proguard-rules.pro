# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor core + plugins are invoked reflectively from the WebView bridge;
# stripping/renaming them breaks plugin calls at runtime.
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
    @com.getcapacitor.PluginMethod <methods>;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Cordova plugins (capacitor-cordova-android-plugins) are also reflectively invoked.
-keep class org.apache.cordova.** { *; }

# Firebase Cloud Messaging (capacitor-push-notifications)
-keep class com.google.firebase.messaging.** { *; }
