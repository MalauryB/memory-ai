import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuration pour améliorer la stabilité sur WSL + optimisations
  webpack: (config, { dev, isServer }) => {
    // ⚡ OPTIMISATION : Code splitting pour réduire le bundle initial
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Séparer Radix UI dans son propre chunk
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui/,
              name: 'radix-ui',
              priority: 10,
            },
            // Séparer Recharts dans son propre chunk
            recharts: {
              test: /[\\/]node_modules[\\/]recharts/,
              name: 'recharts',
              priority: 10,
            },
            // Séparer les utilitaires (date-fns, etc.)
            utilities: {
              test: /[\\/]node_modules[\\/](date-fns|clsx|tailwind-merge)/,
              name: 'utilities',
              priority: 10,
            },
            // Chunk commun pour les autres librairies
            commons: {
              test: /[\\/]node_modules[\\/]/,
              name: 'commons',
              priority: 5,
              minChunks: 2,
            },
          },
        },
      }
    }

    if (dev) {
      // Améliorer le polling pour WSL
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  // Activer le cache pour de meilleures performances
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default withNextIntl(nextConfig)
