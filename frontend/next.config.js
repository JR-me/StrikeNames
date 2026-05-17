/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Suppress missing optional peer deps pulled in by wagmi/RainbowKit/WalletConnect
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }
    return config
  },
}

module.exports = nextConfig
