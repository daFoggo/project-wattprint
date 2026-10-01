const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force single instance of core packages to prevent Hermes duplicate initialization
const DEDUPED_PACKAGES = ['react', 'react-native', 'react-dom', 'react-native-web'];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of DEDUPED_PACKAGES) {
    if (moduleName === pkg) {
      return context.resolveRequest(context, path.resolve(__dirname, 'node_modules', pkg), platform);
    }
    if (moduleName.startsWith(pkg + '/')) {
      return context.resolveRequest(context, path.resolve(__dirname, 'node_modules', moduleName), platform);
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});