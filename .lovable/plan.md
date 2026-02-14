

# Fix: "Cannot set properties of undefined (setting 'Children')" White Screen Crash

## Root Cause

The `manualChunks` in `vite.config.ts` splits `react-dom` into its own chunk (`vendor-react-dom`) but **does not bundle `react` alongside it**. This creates a race condition where Ant Design's vendor chunk loads and tries to access `React.Children` before React itself has initialized.

## Fix (single file change)

**`vite.config.ts`** -- Update the `manualChunks` function to bundle `react` and `react-dom` together in a single `vendor-react` chunk, and ensure this check runs **before** the `react-dom`-only check so React is always available when any other vendor chunk needs it.

Change the manualChunks function (lines 128-139) to:

```typescript
manualChunks(id) {
  // React MUST be bundled together to prevent initialization race conditions
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

Key changes:
- Combines `react` + `react-dom` into one `vendor-react` chunk (prevents the race)
- Uses `node_modules/react/` (with trailing slash) to avoid matching `react-dom`, `react-router`, etc.
- Moves this check to the **top** so it's evaluated first

After deploying, users should clear service worker cache (Application tab > Storage > Clear site data) to stop serving the old broken chunks.

