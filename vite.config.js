import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    // Root directory is project root (where index.html lives)
    root: '.',

    // Public directory for static assets (audio files)
    publicDir: 'public',

    // Plugins
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['audio/**/*'],
            manifest: {
                name: 'OSS Sample Player',
                short_name: 'SamplePlayer',
                description: 'Web-based audio sample player with dub effects',
                theme_color: '#1a1a1a',
                background_color: '#0a0a0a',
                display: 'standalone',
                orientation: 'landscape',
                start_url: '/',
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                // Don't cache audio files in service worker (too large)
                globIgnores: ['**/audio/**']
            }
        })
    ],

    // Build output
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true
    },

    // Dev server
    server: {
        port: 3000,
        open: true
    },

    // Preview server (for testing builds)
    preview: {
        port: 3000
    }
});
