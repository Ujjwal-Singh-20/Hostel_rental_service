import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { qrcode } from 'vite-plugin-qrcode';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    qrcode() // Displays ASCII QR Code in terminal for instant phone scanning on campus Wi-Fi
  ],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for multi-phone LAN testing
    port: 5173,
    strictPort: false
  }
});
