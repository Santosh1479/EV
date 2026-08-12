module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Enable polyfill for `import.meta` which Hermes doesn't support natively.
          // This fixes the "import.meta is not supported in Hermes" error coming
          // from third-party packages like react-router.
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
