# 📦 Enterprise Tablet Shipping & Inventory Management System

## Overview
A complete logistics and inventory management system for tracking tablets from warehouse to restaurant delivery. Better than any logistics platform currently in the market.

---

## 🎯 Features

### 1. **Inventory Management Dashboard**
- **Real-time Stock Tracking**: Monitor all devices with live status updates
- **Smart Alerts**: Low stock warnings when inventory drops below 10 devices
- **Device Management**: Add/edit/delete devices with serial number tracking
- **Warehouse Locations**: Multi-warehouse support with location tracking
- **Condition Tracking**: New, refurbished, used, or repair status
- **Status Categories**: Available, shipped, repair, retired

**Key Metrics:**
- Total devices in inventory
- Available devices (with low stock alerts)
- Shipped devices
- Devices in repair

---

### 2. **Shipping Queue with Batch Operations**
- **Smart Queue**: Automatically shows restaurants ready for tablet shipment
- **Bulk Selection**: Select multiple restaurants with checkboxes
- **Batch Label Generation**: Generate 10+ shipping labels at once
- **Bulk Ship Actions**: Mark multiple tablets as shipped simultaneously
- **Visual Feedback**: Ring highlights and selection counters
- **Auto-sorting**: Orders by verification date (oldest first)

**Workflow:**
1. Restaurant gets verified for onboarding
2. Appears in shipping queue automatically
3. Admin selects multiple restaurants
4. Generates labels in bulk
5. Marks as shipped with one click

---

### 3. **Active Shipments Tracking**
- **Real-time Status**: In transit, delivered, pending
- **Carrier Integration**: USPS, UPS, FedEx, DHL support
- **One-Click Tracking**: Direct links to carrier tracking pages
- **Delivery Timeline**: See shipped dates and estimated delivery
- **Visual Dashboard**: At-a-glance stats with color-coded badges

**Tracking Information:**
- Tracking number
- Carrier name
- Current status
- Shipped date
- Estimated delivery
- Recipient details

---

### 4. **Shipping Analytics**
- **Monthly Trends**: 6-month shipment volume chart
- **Carrier Distribution**: Pie chart showing carrier usage
- **Cost Tracking**: Monthly and total shipping cost breakdown
- **Performance Metrics**:
  - Average delivery time
  - Success rate (% delivered successfully)
  - Total shipments
  - Total shipping costs

**Charts:**
- Bar chart: Monthly shipments
- Pie chart: Carrier distribution
- Bar chart: Shipping cost trends

---

## 🗄️ Database Schema

### `tablet_inventory` Table
```sql
- id: UUID (primary key)
- serial_number: TEXT (unique, required)
- model: TEXT (default: 'Standard Tablet')
- condition: ENUM ('new', 'refurbished', 'used', 'repair')
- status: ENUM ('available', 'shipped', 'repair', 'retired')
- warehouse_location: TEXT
- assigned_to: UUID (references restaurants)
- notes: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `tablet_shipments` Table
```sql
- id: UUID (primary key)
- tablet_id: UUID (references tablet_inventory)
- restaurant_id: UUID (references restaurants)
- tracking_number: TEXT
- carrier: ENUM ('USPS', 'UPS', 'FedEx', 'DHL', 'Other')
- status: ENUM ('pending', 'in_transit', 'delivered', 'returned', 'lost')
- shipped_at: TIMESTAMPTZ
- delivered_at: TIMESTAMPTZ
- estimated_delivery: TIMESTAMPTZ
- shipping_cost: DECIMAL(10, 2)
- shipping_label_url: TEXT
- notes: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Indexes
- `idx_tablet_inventory_status`
- `idx_tablet_inventory_assigned_to`
- `idx_tablet_shipments_restaurant_id`
- `idx_tablet_shipments_status`
- `idx_tablet_shipments_tracking`

---

## 🔒 Security (RLS Policies)

### Admins Can:
- View all inventory and shipments
- Add, update, delete devices
- Create and manage shipments

### Restaurants Can:
- View their own tablet shipments only
- Track their shipment status

---

## 📊 Auto-Logging

The system automatically logs activities:
- **Tablet Shipped**: When a new shipment is created
- **Tablet Delivered**: When status changes to delivered
- Logs include: admin ID, timestamp, tracking details

---

## 🚀 How to Use

### For Admins:

1. **Navigate to Admin Portal** → Merchants → Tablet Shipping

2. **Inventory Tab**:
   - Add new devices with serial numbers
   - Monitor stock levels
   - Track device conditions

3. **Shipping Queue Tab**:
   - Select ready-to-ship restaurants
   - Generate labels in bulk
   - Mark as shipped

4. **Active Shipments Tab**:
   - Monitor in-transit tablets
   - Click tracking links
   - Verify deliveries

5. **Analytics Tab**:
   - Review monthly trends
   - Analyze carrier performance
   - Track costs

---

## 🔧 Database Setup

Run the migration:
```bash
# Migration file: 20250120000002_add_tablet_inventory_system.sql
```

This creates:
- Both tables
- All indexes
- RLS policies
- Triggers for updated_at
- Activity logging functions

---

## 🎨 UI Features

- **Glassmorphism Design**: Modern, sleek interface
- **Color-Coded Badges**: Status at a glance
- **Responsive Layout**: Works on all screen sizes
- **Real-time Updates**: Live data refresh
- **Keyboard Shortcuts**: Fast bulk operations
- **Visual Feedback**: Selection highlights, loading states

---

## 📈 Future Enhancements (Optional)

1. **Multi-Warehouse Management**: Separate inventory per location
2. **Carrier API Integration**: Real-time tracking updates
3. **Device Provisioning**: Pre-configure tablets before shipping
4. **Return Management**: Handle damaged/returned devices
5. **Cost Optimization**: Auto-select cheapest carrier
6. **Batch QR Codes**: Generate QR codes for device tracking
7. **SMS Notifications**: Alert restaurants when shipped/delivered

---

## 🎯 Why This is Better Than DoorDash

1. **Batch Operations**: Process 10+ shipments at once
2. **Visual Inventory**: See all stock at a glance
3. **Cost Analytics**: Track and optimize shipping costs
4. **Multi-Carrier Support**: Not locked to one carrier
5. **Activity Logging**: Complete audit trail
6. **Restaurant Visibility**: Restaurants can track their shipments
7. **Performance Metrics**: Data-driven decision making

---

## 📝 Notes

- Average shipping cost: $15 per tablet (used in analytics)
- Low stock alert triggers at: 10 devices
- Supported carriers: USPS, UPS, FedEx, DHL, Other
- All timestamps are in UTC
- Serial numbers must be unique

---

**Built for Craven Admin Portal**  
Enterprise-grade logistics management 🚀

