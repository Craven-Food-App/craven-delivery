# Exit Workflows - Access Guide

## ✅ **PRIMARY LOCATION**

### Company Portal → Governance Admin → Exit Workflows Tab

**Direct URL:**
```
http://localhost:8080/company/governance-admin?tab=exit-workflows
```

**How to Access:**
1. Navigate to `/company` (Company Portal)
2. Click **"Governance Admin"** in the sidebar
3. Click **"Exit Workflows"** in the submenu
4. OR directly navigate to: `/company/governance-admin?tab=exit-workflows`

---

## 🎯 **Quick Access Methods**

### Method 1: Sidebar Navigation
1. Go to `/company`
2. Click **"Governance Admin"** (shield icon)
3. Click **"Exit Workflows"** in the dropdown

### Method 2: Direct URL
```
/company/governance-admin?tab=exit-workflows
```

### Method 3: From Personnel Manager
1. Go to `/ceo` → "Manage People"
2. Click "Terminate" on an executive
3. System redirects to Company Portal Exit Workflows

---

## 🔍 **Verification Steps**

If you don't see Exit Workflows:

1. **Check URL**: Make sure you're at `/company/governance-admin?tab=exit-workflows`
2. **Check Permissions**: You need `CRAVEN_FOUNDER` or `CRAVEN_CORPORATE_SECRETARY` role
3. **Check Sidebar**: Governance Admin should be visible in Company Portal sidebar
4. **Check Tab**: The "Exit Workflows" tab should appear in the Governance Admin Dashboard

---

## 🚨 **Troubleshooting**

### Tab Not Showing?
- Verify you're logged in as a user with governance admin permissions
- Check browser console for errors
- Try refreshing the page
- Navigate directly to: `/company/governance-admin?tab=exit-workflows`

### Component Not Loading?
- Check browser console for import errors
- Verify `ExitWorkflowManager` component exists
- Check network tab for failed requests

### Permission Denied?
- You need one of these roles:
  - `CRAVEN_FOUNDER`
  - `CRAVEN_CORPORATE_SECRETARY`
- Or email: `tstroman.ceo@cravenusa.com` (has universal access)

---

## 📋 **What You Should See**

When you access Exit Workflows, you should see:

1. **Table of Active Workflows** (if any exist)
2. **"Initiate Exit Process"** button (top right)
3. **Workflow Status Filters** (All, Pending, In Progress, Completed)
4. **Action Buttons** (View Details, Continue Process)

---

## ✅ **Expected Behavior**

- Tab appears in Governance Admin Dashboard
- Component loads without errors
- "Initiate Exit Process" button is clickable
- Can select employees from dropdown
- Can create new exit workflows

---

**If you still see "NOTHING", please check:**
1. Browser console for errors
2. Network tab for failed requests
3. That you're at the correct URL with `?tab=exit-workflows`
4. That you have the correct permissions






















