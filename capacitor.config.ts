import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.summit.app",
  appName: "Summit",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },

  plugins: {
    // Keyboard: {
    //   resize: KeyboardResize.Body,
    //   style: KeyboardStyle.Dark,
    //   resizeOnFullScreen: false,
    // },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    SplashScreen: {
      androidScaleType: "CENTER",
      backgroundColor: "#1d1d1d",
      launchAutoHide: true,
      launchShowDuration: 0,
      showSpinner: true,
    },
  },
};

export default config;
