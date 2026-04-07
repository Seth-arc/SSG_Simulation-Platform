import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

function normalizeBasePath(basePath = '/') {
    const trimmedBasePath = String(basePath || '').trim();

    if (!trimmedBasePath || trimmedBasePath === '.' || trimmedBasePath === './') {
        return '/';
    }

    const withoutOrigin = trimmedBasePath.replace(/^[a-z]+:\/\/[^/]+/i, '');
    const withLeadingSlash = withoutOrigin.startsWith('/') ? withoutOrigin : `/${withoutOrigin}`;
    const withoutDuplicateSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');

    return withoutDuplicateSlashes.endsWith('/')
        ? withoutDuplicateSlashes
        : `${withoutDuplicateSlashes}/`;
}

function resolveAppBasePath(env) {
    const explicitBasePath = env.VITE_PUBLIC_BASE_PATH || env.PUBLIC_BASE_PATH;

    if (explicitBasePath) {
        return normalizeBasePath(explicitBasePath);
    }

    const isGitHubActionsBuild = (env.GITHUB_ACTIONS || process.env.GITHUB_ACTIONS) === 'true';
    const repositorySlug = (env.GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || '').split('/')[1];

    if (isGitHubActionsBuild && repositorySlug) {
        return normalizeBasePath(`/${repositorySlug}/`);
    }

    return '/';
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const appBasePath = resolveAppBasePath(env);

    return {
        appType: 'mpa',
        root: '.',
        base: appBasePath,
        publicDir: 'public',

        build: {
            outDir: 'dist',
            emptyOutDir: true,
            sourcemap: true,
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                    master: resolve(__dirname, 'master.html'),
                    blueFacilitator: resolve(__dirname, 'teams/blue/facilitator.html'),
                    blueNotetaker: resolve(__dirname, 'teams/blue/notetaker.html'),
                    blueWhitecell: resolve(__dirname, 'teams/blue/whitecell.html'),
                    redFacilitator: resolve(__dirname, 'teams/red/facilitator.html'),
                    redNotetaker: resolve(__dirname, 'teams/red/notetaker.html'),
                    redWhitecell: resolve(__dirname, 'teams/red/whitecell.html'),
                    greenFacilitator: resolve(__dirname, 'teams/green/facilitator.html'),
                    greenNotetaker: resolve(__dirname, 'teams/green/notetaker.html'),
                    greenWhitecell: resolve(__dirname, 'teams/green/whitecell.html')
                },
                output: {
                    manualChunks: {
                        supabase: ['@supabase/supabase-js'],
                        export: ['xlsx', 'jspdf', 'jspdf-autotable', 'jszip']
                    }
                }
            }
        },

        server: {
            port: 3000,
            open: true,
            cors: true
        },

        preview: {
            port: 4173
        },

        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@core': resolve(__dirname, 'src/core'),
                '@services': resolve(__dirname, 'src/services'),
                '@stores': resolve(__dirname, 'src/stores'),
                '@features': resolve(__dirname, 'src/features'),
                '@components': resolve(__dirname, 'src/components'),
                '@utils': resolve(__dirname, 'src/utils'),
                '@styles': resolve(__dirname, 'styles')
            }
        },

        define: {
            __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
        }
    };
});
