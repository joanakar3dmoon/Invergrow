# ProGuard rules for InverGrow
-keepattributes *Annotation*
-keep public class * extends android.app.Activity
-keep public class * extends android.webkit.WebViewClient
-keep public class com.google.android.gms.** { *; }
