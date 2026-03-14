

# Internal Communications Hub — Plan

## Overview
A new **Internal Comms** portal for executives and managers, accessible from both a hub tile and a persistent header icon. It provides secure messaging with file attachments, company-wide announcements with read receipts, and in-conversation task assignments.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│  Hub Header: Bell/Message icon → opens comms    │
│  Hub Tile: "Internal Communications" portal     │
│         both route to /hub/internal-comms        │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  InternalCommsPortal.tsx (4 tabs)                │
│  ┌──────────┬──────────┬────────────┬─────────┐ │
│  │ Messages │ Announce │   Files    │  Tasks  │ │
│  └──────────┴──────────┴────────────┴─────────┘ │
│                                                   │
│  Messages: 1:1 and group threads with attachments │
│  Announcements: Broadcast + read receipts         │
│  Files: Shared file library with upload           │
│  Tasks: Action items assigned in conversations    │
└─────────────────────────────────────────────────┘
```

## Database (New Tables)

**`internal_messages`** — Core messaging
- `id`, `sender_id` (uuid, references auth.users), `subject`, `body`, `channel` (enum: direct, group, announcement), `parent_id` (self-ref for threads), `recipient_ids` (uuid[]), `read_by` (uuid[]), `created_at`
- RLS: authenticated users can read messages where they are sender or in recipient_ids

**`internal_message_attachments`** — File attachments per message
- `id`, `message_id` (FK), `file_name`, `file_url`, `file_size_bytes`, `file_type`, `uploaded_by`, `created_at`

**`internal_announcements`** — Company announcements with receipts
- `id`, `title`, `body`, `priority` (enum: normal, urgent, critical), `author_id`, `read_by` (uuid[]), `pinned` (boolean), `expires_at`, `created_at`
- RLS: any authenticated can read; only executives/managers can insert

**`internal_tasks`** — Task assignments from conversations
- `id`, `title`, `description`, `assigned_to` (uuid), `assigned_by` (uuid), `message_id` (FK, nullable), `status` (enum: pending, in_progress, completed), `due_date`, `priority`, `created_at`, `completed_at`

**Storage bucket**: `internal-comms-files` (private, RLS for authenticated users)

## Frontend Components

**New files under `src/portals/internal-comms/`:**

| File | Purpose |
|------|---------|
| `InternalCommsPortal.tsx` | Main portal with 4 Ant Design tabs |
| `tabs/MessagesTab.tsx` | Conversation list + thread view + compose with file upload |
| `tabs/AnnouncementsTab.tsx` | Create/view announcements, read receipt badges |
| `tabs/SharedFilesTab.tsx` | File library grid, upload, download, search |
| `tabs/TasksTab.tsx` | Task list with filters (assigned to me / by me), create/complete |

## Integration Points

1. **MainHub.tsx**: Add portal tile `id: "internal-comms"` in the Executive & Leadership section. Add `isPortalAllowed` case gating to executive/manager roles.
2. **MainHub header**: Add a message icon button next to the existing header controls that navigates to `/hub/internal-comms` (with unread badge count).
3. **App.tsx**: Add lazy-loaded route for `/hub/internal-comms`.
4. **Access**: Restricted to users with exec_users role OR employees with `position` containing manager/director/vp/chief keywords.

## Key Behaviors
- **Compose**: Select recipients from exec_users directory (like existing BusinessEmailSystem pattern). Attach files via file input (uploads to `internal-comms-files` bucket).
- **Announcements**: Author writes title + body + priority. All executives/managers see it. Read receipts tracked via `read_by` array. Urgent/critical announcements show a banner.
- **Tasks**: Create standalone or from within a message thread. Assignee sees in their task list. Status updates tracked.
- **Real-time**: Supabase realtime subscription on `internal_messages` and `internal_announcements` for live updates.

