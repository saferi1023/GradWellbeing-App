// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add .cjs to assetExts to fix "idb" resolution issue
config.resolver.assetExts.push("cjs");

// Force resolution order to avoid pulling web files in native
config.resolver.sourceExts = [
  "ios.js",
  "android.js",
  "native.js",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json"
];

module.exports = config;
