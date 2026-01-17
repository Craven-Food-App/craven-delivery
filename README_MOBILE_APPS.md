# Mobile Apps Structure

This project contains separate mobile apps organized in the `apps/` directory:

```
apps/
├── feeder/          # Driver/Feeder app
│   ├── capacitor.config.ts
│   ├── android/
│   └── ios/
└── customer/        # Customer app
    ├── capacitor.config.ts
    ├── android/
    └── ios/
```

## Building Apps

### Feeder App (Driver)
```bash
# Build web app first
npm run build

# Sync Capacitor
npm run feeder:sync

# Open in Android Studio
npm run feeder:open:android

# Open in Xcode
npm run feeder:open:ios
```

### Customer App
```bash
# Build web app first
npm run build

# Sync Capacitor
npm run customer:sync

# Open in Android Studio
npm run customer:open:android

# Open in Xcode
npm run customer:open:ios
```

## App IDs

- **Feeder App**: `com.craven.delivery.feeder`
- **Customer App**: `com.craven.delivery.customer`

## Notes

- Both apps share the same `src/` and `dist/` directories
- Each app has its own Android/iOS native projects
- Capacitor configs are stored in each app's folder
- The root `capacitor.config.ts` is the default (feeder) config

