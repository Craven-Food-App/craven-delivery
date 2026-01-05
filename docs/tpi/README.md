# TPI (Technology Platform Infrastructure) Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

The TPI system encompasses all technology-related admin portals and infrastructure management tools for Crave'n Inc. This documentation provides standards, patterns, and implementation guidance for building and maintaining these portals.

---

## Portal Mapping

### Technology Executive Dashboard
**Route:** `/cto` or `http://cto.cravenusa.com`  
**Component:** `CTOPortal.tsx`  
**Status:** ✅ Active (migrating to TPI UI/UX system)

The CTO Portal serves as the Technology Executive Dashboard, providing executive-level oversight of all technology operations, infrastructure, security, and engineering teams.

**Key Sections:**
- CTO Command Center (Dashboard)
- Advanced Infrastructure Management
- DevOps & CI/CD
- Security & Compliance
- Team & Resources
- Technology Roadmap
- Tech Cost Management
- Incident Management
- Asset Management

### Engineering Workspace
**Status:** 🚧 Planned  
**Purpose:** Engineering team collaboration, sprint management, code reviews

### Platform & Infrastructure Hub
**Status:** 🚧 Planned  
**Purpose:** Infrastructure monitoring, service health, deployment management

### Product Command Center
**Status:** 🚧 Planned  
**Purpose:** Product management, feature tracking, roadmap planning

### Quality & Release Portal
**Status:** 🚧 Planned  
**Purpose:** QA workflows, release management, testing coordination

### Internal IT Operations
**Status:** 🚧 Planned  
**Purpose:** IT help desk, asset management, internal tooling

---

## Documentation Structure

### UI/UX System
- [05-uiux/ADMIN_UIUX_SYSTEM.md](./05-uiux/ADMIN_UIUX_SYSTEM.md) - Core design system principles and standards
- [05-uiux/components/COMPONENT_INVENTORY.md](./05-uiux/components/COMPONENT_INVENTORY.md) - Shared component catalog
- [05-uiux/page-templates/PAGE_TEMPLATES.md](./05-uiux/page-templates/PAGE_TEMPLATES.md) - Standard page layouts

### Patterns
- [05-uiux/patterns/ENTERPRISE_TABLE_PATTERN.md](./05-uiux/patterns/ENTERPRISE_TABLE_PATTERN.md) - Data table standards
- [05-uiux/patterns/DRAWER_PATTERN.md](./05-uiux/patterns/DRAWER_PATTERN.md) - Drawer usage guidelines

### Content & Accessibility
- [05-uiux/content-style/CONTENT_STYLE_GUIDE.md](./05-uiux/content-style/CONTENT_STYLE_GUIDE.md) - Content standards
- [05-uiux/accessibility/ACCESSIBILITY_STANDARD.md](./05-uiux/accessibility/ACCESSIBILITY_STANDARD.md) - Accessibility requirements

---

## Migration Status

### CTO Portal → Technology Executive Dashboard
**Status:** 🚧 In Progress  
**Target:** Migrate from `ExecutivePortalLayout` to TPI `PortalLayout`  
**Timeline:** Q1 2025

**Migration Tasks:**
- [ ] Replace `ExecutivePortalLayout` with `PortalLayout`
- [ ] Migrate components to TPI component library
- [ ] Apply TPI page templates
- [ ] Update navigation to TPI standards
- [ ] Implement TPI table patterns
- [ ] Apply TPI drawer patterns
- [ ] Update content to TPI style guide
- [ ] Ensure accessibility compliance

---

## Quick Links

- [UI/UX System Overview](./05-uiux/ADMIN_UIUX_SYSTEM.md)
- [Component Inventory](./05-uiux/components/COMPONENT_INVENTORY.md)
- [Page Templates](./05-uiux/page-templates/PAGE_TEMPLATES.md)








