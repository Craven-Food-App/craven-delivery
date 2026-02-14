

# Fix Out-of-Memory Build Crash

## Root Cause

The build process (`vite build --mode development`) runs out of memory because of two issues in `vite.config.ts`:

1. **Sourcemaps enabled during build** -- Line 121 sets `sourcemap: mode === "development"`, and since the Lovable build uses `--mode development`, it generates sourcemaps for all 27,000+ modules. This roughly doubles the memory needed.

2. **No code splitting** -- Line 128 sets `manualChunks: undefined`, forcing Rollup to bundle the entire app into a single chunk. Previously there was a chunking strategy that split large vendor libraries (MUI, Mantine, Chakra, Ant Design, Recharts, Framer Motion, Stripe, Mapbox, Monaco Editor) into separate chunks, reducing peak memory.

## Fix

### File: `vite.config.ts`

**Change 1 -- Disable sourcemaps in all builds** (line 121):
```
sourcemap: false
```

**Change 2 -- Restore manualChunks code-splitting** (line 128):
Replace `manualChunks: undefined` with a function that splits large vendor libraries into their own chunks:

```text
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react-dom'))       return 'vendor-react';
    if (id.includes('react/'))          return 'vendor-react';
    if (id.includes('@mui/'))           return 'vendor-mui';
    if (id.includes('@mantine/'))       return 'vendor-mantine';
    if (id.includes('@chakra-ui/'))     return 'vendor-chakra';
    if (id.includes('antd') || id.includes('@ant-design/')) return 'vendor-antd';
    if (id.includes('recharts'))        return 'vendor-recharts';
    if (id.includes('framer-motion'))   return 'vendor-framer';
    if (id.includes('@stripe/'))        return 'vendor-stripe';
    if (id.includes('mapbox'))          return 'vendor-mapbox';
    if (id.includes('monaco'))          return 'vendor-monaco';
    if (id.includes('@emotion/'))       return 'vendor-emotion';
    if (id.includes('@radix-ui/'))      return 'vendor-radix';
    if (id.includes('lucide'))          return 'vendor-icons';
  }
}
```

This splits the bundle so Rollup processes each vendor chunk independently, keeping peak memory well within limits.

## Why This Works

- Disabling sourcemaps eliminates the ~50% memory overhead of tracking source positions for 27,000 modules
- Code splitting means Rollup never has to hold the entire application graph in memory at once
- The `vendor-react` chunk bundles `react` and `react-dom` together (required for Capacitor/Android webviews per project memory notes)

