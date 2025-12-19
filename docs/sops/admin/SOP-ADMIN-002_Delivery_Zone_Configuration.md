---
title: "SOP-ADMIN-002: Delivery Zone Configuration & Management"
document_id: "SOP-ADMIN-ZONES-001"
version: "1.0"
effective_date: "2025-12-18"
department: "Operations"
category: "ADMIN"
process_owner: "COO"
review_frequency: "Quarterly"
---

# SOP-ADMIN-002: Delivery Zone Configuration & Management

**Document ID:** SOP-ADMIN-ZONES-001  
**Version:** 1.0  
**Effective Date:** December 18, 2025  
**Department:** Operations / Administration  
**Classification:** Internal Use

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Access Requirements](#3-access-requirements)
4. [System Overview](#4-system-overview)
5. [Zone Management Interface](#5-zone-management-interface)
6. [Creating a New Delivery Zone](#6-creating-a-new-delivery-zone)
7. [Editing Existing Zones](#7-editing-existing-zones)
8. [Zone Status Management](#8-zone-status-management)
9. [Deleting Zones](#9-deleting-zones)
10. [Map Features](#10-map-features)
11. [Driver Location Testing](#11-driver-location-testing)
12. [Best Practices](#12-best-practices)
13. [Troubleshooting](#13-troubleshooting)
14. [Database Reference](#14-database-reference)

---

## 1. Purpose

This Standard Operating Procedure establishes guidelines for managing delivery zones within the Craven Admin Portal. Delivery zones define the geographic areas where Craven provides delivery services, directly impacting which customers can place orders and which restaurants are served.

---

## 2. Scope

This SOP applies to:
- System Administrators
- Operations Managers
- Regional Managers
- Expansion Team Members

### Systems Covered
- Admin Portal Delivery Zones Tab
- Mapbox Interactive Map Interface
- Supabase `delivery_zones` Table
- PostGIS Spatial Functions

---

## 3. Access Requirements

### 3.1 Authentication
- Valid Craven administrator credentials
- Admin Portal access privileges
- Multi-factor authentication (MFA) if enabled

### 3.2 Authorization
| Role | Capabilities |
|------|--------------|
| Admin | Full CRUD access to all zones |
| Operations Manager | View, create, edit zones |
| Regional Manager | View zones in assigned region |

### 3.3 Access Path
```
Admin Portal (/admin) → Delivery Zones (sidebar menu)
```

---

## 4. System Overview

### 4.1 What Are Delivery Zones?

Delivery zones are geographic polygon boundaries that define where Craven operates. Each zone includes:

| Field | Description | Required |
|-------|-------------|----------|
| Name | Descriptive zone name (e.g., "Downtown Core") | Yes |
| City | City name | Yes |
| State | State abbreviation or full name | Yes |
| ZIP Code | Primary ZIP code for the zone | Yes |
| Geometry | Polygon coordinates defining the boundary | Yes |
| Active | Whether the zone is currently operational | Yes |

### 4.2 Key Features

- **Interactive Map:** Mapbox-powered map for visual zone management
- **Polygon Drawing:** Draw custom delivery boundaries
- **Zone Search:** Find zones by name, city, or ZIP
- **Status Toggle:** Activate/deactivate zones instantly
- **Demand Visualization:** See simulated demand levels per zone
- **Driver Testing:** Test if a location falls within a zone

---

## 5. Zone Management Interface

### 5.1 Layout Overview

The Delivery Zone Management page consists of:

1. **Header Section**
   - Title: "Delivery Zone Management"
   - "New Zone" button
   - "Delete Zone" button (when zone selected)

2. **Interactive Map**
   - Full-width Mapbox map
   - Displays all zones with color-coded polygons
   - Drawing tools for creating/editing boundaries
   - Driver marker for testing

3. **Zone Controls Panel** (Left side, 2/3 width)
   - Zone demand update button
   - Driver location change button
   - Status message display
   - Zone detail form (Name, City, State, ZIP)
   - Mode indicator (Create/Edit)
   - Active toggle switch
   - Save/Update button

4. **Zone List Panel** (Right side, 1/3 width)
   - Zone count badge
   - Search input
   - Scrollable zone list
   - Zone cards with status badges

### 5.2 Zone List Cards

Each zone card displays:
- Zone name (or "Untitled Zone" if none)
- City, State, and ZIP code
- Active/Inactive badge
- Creation date
- Simulated demand percentage

---

## 6. Creating a New Delivery Zone

### 6.1 Step-by-Step Process

**Step 1: Initiate Creation**
1. Click the **"New Zone"** button (orange, top-right)
2. Form clears and switches to "Create" mode
3. Status message: "Ready to create a new delivery zone. Draw the area on the map."

**Step 2: Draw the Zone Boundary**
1. Use the map drawing tools to create a polygon
2. Click points on the map to define the boundary vertices
3. Close the polygon by clicking the first point again
4. The polygon should encompass the delivery area

**Step 3: Enter Zone Details**
1. **Zone Name:** Enter a descriptive name
   - Example: "Downtown Core", "Airport District", "University Area"
   - Keep names unique and identifiable
   
2. **City:** Enter the primary city
   - Example: "Austin", "Dallas", "Houston"
   
3. **State:** Enter the state
   - Example: "TX", "Texas"
   
4. **ZIP Code:** Enter the primary ZIP code
   - Example: "78701"

**Step 4: Save the Zone**
1. Click **"Save Zone"** button
2. System validates all fields are complete
3. If valid, zone is created via edge function
4. Success message: "Delivery zone created successfully"
5. Zone appears in the list

### 6.2 Validation Requirements

| Field | Validation |
|-------|------------|
| Name | Required, non-empty |
| City | Required, non-empty |
| State | Required, non-empty |
| ZIP Code | Required, non-empty |
| Polygon | Required, must be drawn on map |

### 6.3 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Please fill out all zone details" | Missing required field | Complete all form fields |
| "Draw a delivery zone on the map before saving" | No polygon drawn | Use map tools to draw boundary |
| "Failed to create delivery zone" | Server error | Check connection, retry |

---

## 7. Editing Existing Zones

### 7.1 Selecting a Zone

**Method 1: Click on Map**
- Click on any zone polygon on the map
- Zone becomes selected and highlighted

**Method 2: Click in Zone List**
- Scroll through the zone list panel
- Click on the zone card you want to edit
- Selected zone shows orange border

### 7.2 Editing Zone Details

1. Select the zone (form auto-populates)
2. Mode switches to "Edit"
3. Status shows: "Editing zone created [date]"
4. Modify any fields:
   - Name
   - City
   - State
   - ZIP Code
5. Optionally redraw the polygon boundary
6. Click **"Update Zone"**

### 7.3 Editing Zone Boundary

1. Select the zone
2. Use map drawing tools to create new polygon
3. New polygon replaces the existing boundary
4. Click **"Update Zone"** to save

---

## 8. Zone Status Management

### 8.1 Active vs Inactive Zones

| Status | Effect |
|--------|--------|
| **Active** | Zone is operational; customers can order; drivers can deliver |
| **Inactive** | Zone is disabled; no orders accepted in this area |

### 8.2 Toggling Zone Status

1. Select the zone
2. Find the **Active/Inactive** toggle switch (bottom of form)
3. Click the switch to toggle status
4. Change takes effect immediately
5. Success message: "Zone activated" or "Zone deactivated"

### 8.3 Use Cases for Deactivation

- **Seasonal Closure:** Temporarily close a zone during slow periods
- **Weather Events:** Disable zones during severe weather
- **Capacity Issues:** Disable when driver coverage is insufficient
- **Market Testing:** Control expansion pace
- **Maintenance:** Temporarily disable for system updates

---

## 9. Deleting Zones

### 9.1 Deletion Process

1. Select the zone to delete
2. Click **"Delete Zone"** button (red, top-right)
3. Confirmation prompt appears: "Are you sure you want to delete this delivery zone?"
4. Click **OK** to confirm or **Cancel** to abort
5. Success message: "Delivery zone deleted"

### 9.2 Deletion Warnings

⚠️ **CAUTION:** Zone deletion is permanent and cannot be undone.

**Before Deleting, Consider:**
- Are there active orders in this zone?
- Are there drivers currently operating in this zone?
- Would deactivating (instead of deleting) be more appropriate?
- Do you have the zone details saved for potential recreation?

### 9.3 Recommended Approach

Instead of deleting, consider **deactivating** zones:
- Preserves historical data
- Allows easy reactivation
- Maintains audit trail
- Can be restored if needed

---

## 10. Map Features

### 10.1 Map Controls

| Control | Function |
|---------|----------|
| Zoom In/Out | +/- buttons or scroll wheel |
| Pan | Click and drag |
| Rotate | Right-click and drag |
| Tilt | Ctrl + drag |
| Reset | Click home button |

### 10.2 Zone Visualization

- **Zone Polygons:** Displayed as semi-transparent colored areas
- **Selected Zone:** Highlighted with orange border
- **Zone Labels:** Zone names displayed on hover
- **Demand Heatmap:** Colors indicate simulated demand levels

### 10.3 Drawing Tools

The map includes Mapbox GL Draw tools:
- **Polygon Tool:** Click points to define vertices
- **Edit Mode:** Drag vertices to adjust shape
- **Delete Mode:** Remove the current polygon

### 10.4 Coordinate System

All zones use:
- **Projection:** EPSG:4326 (WGS 84)
- **Format:** GeoJSON Polygon
- **Storage:** PostGIS geometry type

---

## 11. Driver Location Testing

### 11.1 Purpose

Test whether a specific location falls within a delivery zone to:
- Verify zone boundaries are correct
- Troubleshoot customer delivery issues
- Test edge cases and border areas

### 11.2 Using the Driver Marker

1. **View Driver Location:** Orange marker on map shows current test position
2. **Move Driver:** Click "Change Driver Location" to cycle through zone centroids
3. **Check Status:** Status message shows if driver is in a zone:
   - ✅ "Driver is currently in the [Zone Name] zone."
   - ⚠️ "Driver is outside all delivery zones."

### 11.3 Zone Demand Testing

Click **"Update Zone Demand"** to:
- Randomize demand levels across all zones
- Test demand-based visualizations
- Simulate busy/slow periods

---

## 12. Best Practices

### 12.1 Zone Naming Conventions

| Good | Bad |
|------|-----|
| "Downtown Austin" | "Zone 1" |
| "Airport District" | "New zone" |
| "University Area North" | "Test" |
| "Westlake Hills" | "Untitled" |

### 12.2 Zone Sizing Guidelines

| Zone Type | Recommended Size |
|-----------|-----------------|
| Dense Urban | 2-5 square miles |
| Suburban | 5-15 square miles |
| Rural | 15-30 square miles |

### 12.3 Boundary Drawing Tips

1. **Follow Natural Boundaries:** Use highways, rivers, and major streets
2. **Avoid Overlaps:** Zones should not overlap
3. **Include Landmarks:** Ensure key locations are inside boundaries
4. **Consider Driver Routes:** Think about efficient delivery paths
5. **Leave Buffer:** Don't cut boundaries too close to edges

### 12.4 Status Management

- Start new zones as **Inactive** for testing
- Activate only after verification
- Use deactivation for temporary closures
- Reserve deletion for permanent removal

### 12.5 Regular Maintenance

| Task | Frequency |
|------|-----------|
| Review zone boundaries | Monthly |
| Verify active status | Weekly |
| Update zone names | As needed |
| Clean up test zones | Quarterly |

---

## 13. Troubleshooting

### 13.1 Map Not Loading

**Symptoms:**
- Blank map area
- "Map failed to load" error

**Solutions:**
1. Check internet connection
2. Refresh the page
3. Clear browser cache
4. Verify Mapbox API key is valid
5. Check browser console for errors

### 13.2 Zone Not Saving

**Symptoms:**
- "Failed to create/update delivery zone" error
- Zone disappears after saving

**Solutions:**
1. Verify all required fields are filled
2. Ensure polygon is drawn on map
3. Check for duplicate zone names
4. Verify user has admin permissions
5. Check Supabase edge function logs

### 13.3 Zone Not Appearing on Map

**Symptoms:**
- Zone saved but not visible
- Zone shows in list but not on map

**Solutions:**
1. Refresh the zone list
2. Check if zone is active
3. Verify polygon geometry is valid
4. Check browser console for GeoJSON errors
5. Ensure map is zoomed to correct area

### 13.4 Driver Location Not Detecting Zone

**Symptoms:**
- Driver marker inside zone but shows "outside all zones"

**Solutions:**
1. Verify zone polygon is closed (first point = last point)
2. Check zone is active
3. Verify coordinate system (should be WGS 84)
4. Test with a point clearly inside the zone
5. Check PostGIS function is working

### 13.5 Search Not Finding Zones

**Symptoms:**
- Zones exist but search returns no results

**Solutions:**
1. Check search term spelling
2. Try partial matches
3. Search by city or ZIP instead of name
4. Clear search and browse list manually

---

## 14. Database Reference

### 14.1 Table: `delivery_zones`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(100) | Zone name |
| `city` | VARCHAR(100) | City name |
| `state` | VARCHAR(50) | State |
| `zip_code` | VARCHAR(10) | ZIP code |
| `geom` | GEOMETRY(POLYGON, 4326) | Zone boundary |
| `active` | BOOLEAN | Active status |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `created_by` | UUID | Creator user ID |

### 14.2 Edge Functions

| Function | Purpose |
|----------|---------|
| `create-delivery-zone` | Creates new zone with geometry |
| `update-delivery-zone` | Updates zone details and/or geometry |
| `delete-delivery-zone` | Permanently removes zone |

### 14.3 PostGIS Functions

| Function | Purpose |
|----------|---------|
| `check_point_in_zones(lat, lng)` | Returns zones containing a point |
| `ST_Contains()` | Checks if point is within polygon |
| `ST_GeomFromGeoJSON()` | Converts GeoJSON to geometry |

### 14.4 Indexes

| Index | Purpose |
|-------|---------|
| `idx_delivery_zones_geom` | Spatial queries (GIST) |
| `idx_delivery_zones_zip` | ZIP code lookups |
| `idx_delivery_zones_city` | City searches |
| `idx_delivery_zones_active` | Active zone filtering |

---

## Appendix

### A.1 Glossary

| Term | Definition |
|------|------------|
| Polygon | Closed shape defined by coordinate points |
| GeoJSON | JSON format for geographic data |
| PostGIS | PostgreSQL extension for spatial data |
| WGS 84 | World Geodetic System 1984 (coordinate system) |
| SRID | Spatial Reference System Identifier |
| Centroid | Center point of a polygon |

### A.2 Related Documents

- Driver Onboarding SOP
- Restaurant Onboarding SOP
- Order Management SOP
- Customer Support Procedures

### A.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 18, 2025 | Operations | Initial release |

---

**Document Approval:**

| Role | Name | Date |
|------|------|------|
| Operations Manager | _________________ | __________ |
| System Admin | _________________ | __________ |

---

*This document is confidential and intended for internal use only. Distribution outside of Craven requires written approval from Operations.*

