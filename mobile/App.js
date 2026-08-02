import React, {useRef} from 'react';
import {View, Platform} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {WebView} from 'react-native-webview';
export default function App(){const ref=useRef(null);return <View style={{flex:1,backgroundColor:'#050709',paddingTop:Platform.OS==='android'?24:0}}><StatusBar style="light" backgroundColor="#050709"/><WebView ref={ref} source={{uri:'https://invergrow.vercel.app/'}} style={{flex:1}} javaScriptEnabled domStorageEnabled startInLoadingState sharedCookiesEnabled allowsBackForwardNavigationGestures/></View>}
