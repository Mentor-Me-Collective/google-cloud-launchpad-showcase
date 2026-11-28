const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Import .svg files as React components (react-native-svg-transformer). The app's
// character illustrations are SVGs; this turns them into <Svg> trees we can animate.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
// Sound effects include OGG files. Expo's default asset list covers WAV but not
// OGG, so add it explicitly or Metro treats the files as unresolved modules.
if (!config.resolver.assetExts.includes('ogg')) config.resolver.assetExts.push('ogg');
config.resolver.sourceExts.push('svg');

// The lesson content pack lives in the repo-level `content/` directory so it
// stays the single source of truth for every app. Metro only serves files under
// its watch folders, so add it explicitly now that the app sits in apps/mobile.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../../content'),
];

// Web swaps for native-only modules. react-native-pulsar reads
// `TurboModuleRegistry.getEnforcing('RNPulsar')` at module scope, and
// react-native-web has no TurboModuleRegistry, so importing it on web threw
// before the app rendered. Redirected here rather than at each import site
// because new screens import the package directly.
const WEB_MODULE_SHIMS = {
  'react-native-pulsar': path.resolve(__dirname, 'shims/react-native-pulsar.web.ts'),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const shim = platform === 'web' ? WEB_MODULE_SHIMS[moduleName] : undefined;
  if (shim) return { type: 'sourceFile', filePath: shim };
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
