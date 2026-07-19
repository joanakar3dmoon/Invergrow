package com.r3dm.invergrow;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.widget.LinearLayout;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.FullScreenContentCallback;

// AdMob IDs - InverGrow
// App ID: ca-app-pub-4903263409458961~1005307516
// Banner: ca-app-pub-4903263409458961/9076841407
// Intersticial: ca-app-pub-4903263409458961/4992723799

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private AdView bannerAdView;
    private InterstitialAd interstitialAd;
    private int pageLoadCount = 0;
    private static final String APP_URL = "https://invergrow.vercel.app";
    private static final String BANNER_AD_ID = "ca-app-pub-4903263409458961/9076841407";
    private static final String INTERSTITIAL_AD_ID = "ca-app-pub-4903263409458961/4992723799";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        MobileAds.initialize(this, initializationStatus -> {});

        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                pageLoadCount++;
                if (pageLoadCount % 3 == 0 && interstitialAd != null) {
                    interstitialAd.show(MainActivity.this);
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(APP_URL);

        LinearLayout adContainer = findViewById(R.id.ad_container);
        bannerAdView = new AdView(this);
        bannerAdView.setAdSize(AdSize.BANNER);
        bannerAdView.setAdUnitId(BANNER_AD_ID);
        adContainer.addView(bannerAdView);
        bannerAdView.loadAd(new AdRequest.Builder().build());

        loadInterstitial();
    }

    private void loadInterstitial() {
        InterstitialAd.load(this, INTERSTITIAL_AD_ID, new AdRequest.Builder().build(),
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(InterstitialAd ad) {
                    interstitialAd = ad;
                    interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            loadInterstitial();
                        }
                    });
                }
                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    interstitialAd = null;
                }
            });
    }

    @Override protected void onPause() { if (bannerAdView != null) bannerAdView.pause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (bannerAdView != null) bannerAdView.resume(); }
    @Override protected void onDestroy() { if (bannerAdView != null) bannerAdView.destroy(); super.onDestroy(); }
    @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
}
