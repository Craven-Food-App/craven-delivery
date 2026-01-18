# Safe Area Implementation Guide

## Overview

The customer mobile app now properly handles device safe areas for both iOS and Android devices. This ensures content is never hidden behind:

- **Top Safe Area**: Status bar, camera notch, battery indicator
- **Bottom Safe Area**: Home indicator (iOS), navigation buttons (Android)
- **Left/Right Safe Areas**: Landscape mode safe areas

## Implementation Details

### 1. SafeAreaProvider Component

Located at `src/components/SafeAreaProvider.tsx`, this component:
- Detects if running in Capacitor native app
- Wraps the entire app with safe area spacers
- Automatically applies safe area insets using CSS environment variables

### 2. CSS Safe Area Handling

The `src/index.css` file includes comprehensive safe area utilities:

- `.safe-area-container`: Main wrapper with flex layout
- `.safe-area-top-spacer`: Spacer for top safe area (status bar, notch)
- `.safe-area-bottom-spacer`: Spacer for bottom safe area (home indicator, nav bar)
- `.safe-area-content`: Main content area with horizontal safe area padding

**Utility Classes:**
- `.safe-area-top`: Add top padding
- `.safe-area-bottom`: Add bottom padding
- `.safe-area-left`: Add left padding
- `.safe-area-right`: Add right padding
- `.safe-area-y`: Add vertical padding
- `.safe-area-x`: Add horizontal padding
- `.safe-area-all`: Add all padding

**Fixed Position Utilities:**
- `.safe-fixed`: For fixed top elements
- `.safe-fixed-bottom`: For fixed bottom elements
- `.safe-fixed-left`: For fixed left elements
- `.safe-fixed-right`: For fixed right elements

### 3. HTML Viewport Configuration

The `index.html` includes:
- `viewport-fit=cover`: Enables edge-to-edge display
- Proper safe area inset support in CSS

### 4. Capacitor Configuration

**iOS** (`capacitor.config.ts`):
```typescript
ios: {
  contentInset: 'automatic', // Automatically handles safe areas
  scrollEnabled: true,
}
```

**Android**: 
- Edge-to-edge display is handled automatically by Capacitor
- No additional configuration needed

## Usage Examples

### Basic Usage

The `SafeAreaProvider` is already integrated in `App.tsx` and wraps all routes automatically.

### Manual Safe Area Padding

If you need to add safe area padding to specific elements:

```tsx
<div className="safe-area-top">
  {/* Content with top safe area padding */}
</div>

<div className="safe-area-bottom">
  {/* Content with bottom safe area padding */}
</div>
```

### Fixed Position Elements

For fixed headers or footers:

```tsx
<header className="fixed top-0 left-0 right-0 safe-fixed">
  {/* Header content */}
</header>

<footer className="fixed bottom-0 left-0 right-0 safe-fixed-bottom">
  {/* Footer content */}
</footer>
```

### Mapbox Controls

Mapbox controls automatically respect safe areas when running in Capacitor native app.

## Testing

### iOS Testing
1. Test on devices with notch (iPhone X and later)
2. Test in portrait and landscape orientations
3. Verify status bar content is never hidden
4. Verify home indicator area is respected

### Android Testing
1. Test on devices with display cutouts
2. Test with gesture navigation enabled
3. Test with button navigation enabled
4. Verify status bar and navigation bar areas are respected

## Browser vs Native

- **Web Browser**: Safe area insets are 0px (no effect)
- **Capacitor Native**: Safe area insets are automatically calculated by the OS

The implementation automatically detects the platform and applies safe areas only when needed.

## Troubleshooting

### Content Hidden Behind Status Bar
- Ensure `SafeAreaProvider` wraps your content
- Check that `.safe-area-top-spacer` is rendering
- Verify `env(safe-area-inset-top)` is available in CSS

### Content Hidden Behind Navigation Bar
- Ensure `.safe-area-bottom-spacer` is rendering
- Check that `env(safe-area-inset-bottom)` is available in CSS
- Verify Android gesture navigation is working

### Safe Areas Not Working
1. Verify `viewport-fit=cover` is in the viewport meta tag
2. Check that Capacitor is properly synced: `npm run sync`
3. Ensure you're testing on a physical device (simulators may not show safe areas correctly)
4. Verify the app is built and running in native mode, not web view

## Platform-Specific Notes

### iOS
- Safe areas are automatically handled by `contentInset: 'automatic'`
- Status bar style can be customized via `StatusBar` plugin
- Home indicator is automatically respected
- Bottom safe area spacer is transparent (no background needed)

### Android
- Edge-to-edge display is enabled by default in Capacitor
- Navigation bar height varies by device and navigation mode
- Display cutouts are automatically handled
- **Bottom safe area spacer has white background** - Provides static white bar for navigation button area
- The white bar only appears on Android devices, not iOS

