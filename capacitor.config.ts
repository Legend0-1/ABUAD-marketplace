import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps your live site in a native WKWebView shell for the App Store.
// server.url points at your deployed site — the app always loads the live version,
// same as the Android TWA. There is no separate iOS codebase to maintain.
const config: CapacitorConfig = {
  appId: 'app.unimart.marketplace',
  appName: 'UNI MART',
  webDir: 'public', // unused when server.url is set, but required by the CLI
  server: {
    // Replace with your real deployed domain before building.
    url: 'https://your-app.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#153B3D',
  },
};

export default config;
