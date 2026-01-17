# Mobile Apps Structure

This project contains **completely separate** mobile apps organized in the `apps/` directory:

```
apps/
├── feeder/          # Driver/Feeder app
│   ├── capacitor.config.ts
│   ├── android/
│   └── ios/
└── customer/        # Customer ordering app (COMPLETELY SEPARATE)
    ├── capacitor.config.ts
    ├── vite.config.ts
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   └── App.tsx
    ├── dist/        # Separate build output
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

### Customer App (Separate Build)
```bash
# Development server (runs on port 8081)
npm run customer:dev

# Build customer app (creates apps/customer/dist/)
npm run customer:build

# Sync Capacitor with built app
npm run customer:sync

# Build and sync in one command
npm run customer:build:sync

# Open in Android Studio
npm run customer:open:android

# Open in Xcode
npm run customer:open:ios
```

## App IDs

- **Feeder App**: `com.craven.delivery.feeder`
- **Customer App**: `com.craven.delivery.customer`

## Architecture

### Customer App (Completely Separate)
- **Source**: `apps/customer/src/` - Customer-only source code
- **Build Output**: `apps/customer/dist/` - Separate from main app
- **Entry Point**: `apps/customer/src/main.tsx`
- **Routing**: Customer-only routes (no driver/feeder routes)
- **Dependencies**: Own `package.json` with required dependencies
- **Vite Config**: Separate build configuration

### Feeder App (Shared Build)
- **Source**: Root `src/` directory
- **Build Output**: Root `dist/` directory (shared)
- **Entry Point**: Root `src/main.tsx`
- **Routing**: All routes including driver/feeder routes

## Customer App Routes

The customer app includes only customer-facing routes:
- `/` - Homepage
- `/auth` - Customer authentication
- `/restaurants` - Browse restaurants
- `/favorites` - Saved restaurants
- `/restaurant/:id` - Restaurant details
- `/restaurant/:id/menu` - Restaurant menu
- `/checkout` - Checkout flow
- `/track-order/:orderId` - Order tracking
- `/order-history` - Order history
- `/account` - Customer account
- `/crave-more` - Membership program

## Notes

- **Customer app is completely separate** with its own build process
- **Feeder app shares** the main `src/` and `dist/` directories
- Each app has its own Android/iOS native projects
- Capacitor configs are stored in each app's folder
- The root `capacitor.config.ts` is the default (feeder) config

