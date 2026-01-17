# Governance System - Fortune 500 Style

This directory contains the Fortune 500-style governance and board management system for Crave'n Company Portal.

## Architecture

### File Structure

```
src/lib/
  templates/
    index.ts                    # Template registry and loader
    governanceContext.ts        # Context builders for template variables
    governance/
      *.html                    # HTML template files
  governance/
    flows.ts                    # Flow functions that trigger document generation
```

### Database Schema

The system uses these tables:
- `board_members` - Board of Directors members
- `board_documents` - Generated governance documents
- `appointments` - Executive/officer appointments
- `appointment_documents` - Links appointments to documents
- `trusts` - Trust entities (majority shareholders)
- `cap_tables` - Capitalization table snapshots
- `company_settings` - Company configuration (name, state, etc.)

### Flow Functions

#### `handleInitialBoardSetup(directorUserId: string)`
Called when the board is first initialized. Generates:
- Initial Action of Sole Director
- Organizational Minutes of Sole Director

#### `handleOfficerAppointment(appointmentId: string)`
Called when an officer is appointed. Generates:
- Officer Appointment Resolution
- Officer Acceptance
- CEO Appointment Resolution (if CEO role)

#### `handleEquitySetup()`
Called when equity is configured. Generates:
- Stock Issuance Resolution
- Capitalization Table Exhibit

#### `handleBankingSetup(officerUserId: string)`
Called when banking is configured. Generates:
- Corporate Banking Resolution

#### `handleRegisteredAgentSetup(directorUserId, agentName, agentAddress)`
Called when registered agent is configured. Generates:
- Registered Agent Resolution

### Template System

Templates are stored in two places:
1. **File System**: `src/lib/templates/governance/*.html` (for version control)
2. **Database**: `document_templates` table (for runtime, fallback)

The loader tries Supabase first, then falls back to file system.

### Usage Example

```typescript
import { handleInitialBoardSetup } from '@/lib/governance/flows';

// Initialize board
const documentIds = await handleInitialBoardSetup(userId);

// Navigate to signing flow
navigate('/executive/signing', { 
  state: { documentIds, source: 'board_initialization' } 
});
```

## Integration Points

- **BoardSetupModule**: Uses `handleInitialBoardSetup` when board is initialized
- **Appointment System**: Should call `handleOfficerAppointment` when appointments are made
- **Equity Setup**: Should call `handleEquitySetup` when cap table is configured
- **Banking Setup**: Should call `handleBankingSetup` when bank accounts are set up

## Next Steps

1. Integrate flow functions into appointment creation flows
2. Add UI for equity setup that triggers `handleEquitySetup`
3. Add UI for banking setup that triggers `handleBankingSetup`
4. Add UI for registered agent setup that triggers `handleRegisteredAgentSetup`
5. Ensure all placeholders in templates match context builder outputs

