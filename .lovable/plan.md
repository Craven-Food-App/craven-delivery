

# Fix: White Screen on Feeder Android App

## Problem
The error `Cannot set properties of undefined (setting 'Children')` means Ant Design's chunk (`vendor-antd`) is executing before React is ready. Ant Design internally does `React.Children = ...` but `React` is `undefined` at that point.

This is caused by the `manualChunks` configuration in `vite.config.ts` which splits `react-dom` into its own chunk (`vendor-react-dom`) but leaves `react` in the default chunk. On Android WebView, these chunks can load out of order, so Ant Design initializes before React is available.

## Solution
Update the `manualChunks` function in `vite.config.ts` to ensure React core is **never** separated from libraries that depend on it. Specifically:

1. **Bundle `react` and `react-dom` together** into a single `vendor-react` chunk so they always load as one unit.
2. This ensures React is initialized before any UI library chunk tries to access it.

## Technical Changes

### File: `vite.config.ts` (lines 128-139)

Update the `manualChunks` function to add a React rule **before** the other rules:

```text
manualChunks(id) {
  // React core must load first - keep react + react-dom together
  if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
  if (id.includes('node_modules/@mui')) return 'vendor-mui';
  if (id.includes('node_modules/@mantine')) return 'vendor-mantine';
  if (id.includes('node_modules/@chakra-ui') || id.includes('node_modules/@emotion')) return 'vendor-chakra';
  if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) return 'vendor-antd';
  if (id.includes('node_modules/monaco-editor') || id.includes('node_modules/@monaco-editor')) return 'vendor-monaco';
  if (id.includes('node_modules/mapbox-gl') || id.includes('node_modules/@mapbox')) return 'vendor-mapbox';
  if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'vendor-charts';
  if (id.includes('node_modules/framer-motion')) return 'vendor-framer';
  if (id.includes('node_modules/stripe') || id.includes('node_modules/@stripe')) return 'vendor-stripe';
},
```

Key change: Replace the separate `vendor-react-dom` chunk with a combined `vendor-react` chunk that includes both `react` and `react-dom`. The `react/` path (with trailing slash) ensures we match the `react` package without accidentally matching `react-dom`, `react-router`, etc.

## After Approval
After implementing, you will need to rebuild and resync:
```bash
npm run build
cd apps/feeder
npx cap sync android
npx cap run android
```

