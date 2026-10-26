const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const old = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(old) ? old : old ? [old] : []),
  /[/\\]\.npm-cache[/\\].*/,
  /[/\\]\.server-cache[/\\].*/,
  /[/\\]tmp[/\\].*/,
  /[/\\]docs[/\\]evidence[/\\].*/,
];
config.maxWorkers = 2;
module.exports = config;
