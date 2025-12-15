import { defineConfig } from 'vite';

export default defineConfig({
    // Root directory is project root (where index.html lives)
    root: '.',

    // Public directory for static assets (audio files)
    publicDir: 'public',

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
