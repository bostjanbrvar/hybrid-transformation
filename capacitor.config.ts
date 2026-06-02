import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'si.uplvl.hybrid',
  appName: 'HYBRID',
  // Next.js nima statičnega exporta — WebView naloži živo Vercel stran prek
  // server.url. webDir je obvezen, a se za nalaganje ne uporablja.
  webDir: 'public',
  server: {
    url: 'https://hybrid-transformation.vercel.app',
    cleartext: false,
  },
};

export default config;
