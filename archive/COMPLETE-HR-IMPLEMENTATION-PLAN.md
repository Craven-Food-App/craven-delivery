# Complete HR Document System Implementation

## ✅ What's Complete

1. ✅ **Database Migration** - `20250122000001_create_hr_document_system.sql`
   - `hr-documents` storage bucket
   - `employee_documents` table
   - Links to `employees`, `board_resolutions`, `exec_documents`
   - Helper functions

2. ✅ **PDF Generation** - `generate-hr-pdf/index.ts`
   - Generates HTML for all document types
   - Stores in bucket
   - Links to database

3. ✅ **Executive User Creation** - `create-executive-user/index.ts`
   - Creates real auth users
   - Links to exec_users
   - Returns temp password

---

## 🔧 What Needs Integration

### **Update PersonnelManager.tsx hire flow:**

**Before (Lines 329-626):**
- Inserts employee
- Creates board resolution
- Emails HTML documents only
- Creates exec_users with `user_id: null`

**After (New flow):**

```typescript
const handleHire = async (values: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Create employee record
    const { data, error } = await supabase.from('employees').insert([{...}]).select();
    
    // 2. If C-level, create executive auth user
    let authUserId = null;
    if (isCLevel) {
      const { data: execAuth, error: authError } = await supabase.functions.invoke('create-executive-user', {
        body: {
          firstName: values.first_name,
          lastName: values.last_name,
          email: values.email,
          position: values.position,
          department: dept?.name || 'Executive',
          role: execRole // 'ceo', 'cfo', etc.
        }
      });
      authUserId = execAuth.userId;
      
      // Update employee with auth user ID
      await supabase.from('employees')
        .update({ user_id: authUserId })
        .eq('id', data[0].id);
    }
    
    // 3. Create board resolution
    const resolutionNumber = `BR${new Date().getFullYear()}${Math.floor(Math.random() * 9000) + 1000}`;
    const { data: resolution } = await supabase.from('board_resolutions').insert([{
      resolution_number: resolutionNumber,
      resolution_type: 'appointment',
      subject_position: values.position,
      subject_person_name: `${values.first_name} ${values.last_name}`,
      subject_person_email: values.email,
      employee_id: data[0].id, // Link to employee
      // ... other fields
    }]).select().single();
    
    // 4. Generate and store PDFs
    // Board Resolution
    const { data: resolutionDoc } = await supabase.functions.invoke('generate-hr-pdf', {
      body: {
        documentType: 'board_resolution',
        employeeId: data[0].id,
        metadata: {
          employeeName: `${values.first_name} ${values.last_name}`,
          position: values.position,
          resolutionNumber,
          effectiveDate: values.hire_date,
          companyName: 'Crave\'n Inc',
          state: 'Ohio',
          boardMembers: [...],
          equityPercentage: values.equity,
          createdBy: user?.id
        },
        alsoEmail: true
      }
    });
    
    // Link resolution to document
    await supabase.from('board_resolutions')
      .update({ document_id: resolutionDoc.documentId })
      .eq('id', resolution.id);
    
    // Offer Letter
    const { data: offerDoc } = await supabase.functions.invoke('generate-hr-pdf', {
      body: {
        documentType: 'offer_letter',
        employeeId: data[0].id,
        metadata: {
          employeeName: `${values.first_name} ${values.last_name}`,
          employeeEmail: values.email,
          position: values.position,
          department: dept?.name,
          salary: values.salary,
          equity: values.equity,
          startDate: values.hire_date,
          reportingTo: 'CEO - Torrance Stroman',
          createdBy: user?.id
        },
        alsoEmail: true
      }
    });
    
    // Equity Agreement (if C-level)
    if (isCLevel && values.equity) {
      const { data: equityDoc } = await supabase.functions.invoke('generate-hr-pdf', {
        body: {
          documentType: 'equity_agreement',
          employeeId: data[0].id,
          metadata: {
            employeeName: `${values.first_name} ${values.last_name}`,
            employeeEmail: values.email,
            position: values.position,
            equityPercentage: values.equity,
            equityType: values.equity_type,
            vestingSchedule: values.vesting_schedule,
            strikePrice: values.strike_price,
            companyName: 'Crave\'n Inc',
            state: 'Ohio',
            createdBy: user?.id
          },
          alsoEmail: true
        }
      });
    }
    
    // 5. Add equity to employee_equity
    if (values.equity) {
      await supabase.from('employee_equity').insert([{
        employee_id: data[0].id,
        shares_percentage: values.equity,
        equity_type: normalizedEquityType,
        vesting_schedule: vestingJson,
        authorized_by: user?.id
      }]);
    }
    
    message.success(`✅ ${values.first_name} ${values.last_name} hired successfully! All documents generated and sent.`);
  } catch (error) {
    message.error('Failed to hire employee: ' + error.message);
  }
};
```

---

## 📋 Deployment Checklist

### **Phase 1: Deploy Infrastructure** ✅
- [x] Create migration SQL
- [x] Create `generate-hr-pdf` function
- [x] Create `create-executive-user` function

### **Phase 2: Run Migrations**
- [ ] Run `20250122000001_create_hr_document_system.sql` in Supabase SQL Editor
- [ ] Deploy `generate-hr-pdf` edge function
- [ ] Deploy `create-executive-user` edge function

### **Phase 3: Update PersonnelManager**
- [ ] Update `handleHire` to call `create-executive-user`
- [ ] Update `handleHire` to call `generate-hr-pdf` for each doc
- [ ] Link board_resolutions to documents
- [ ] Test hire flow end-to-end

### **Phase 4: Add Board Portal Viewer**
- [ ] Create `DocumentVault` component for Board Portal
- [ ] Show all employee documents
- [ ] Download/view functionality
- [ ] Link to employees table

### **Phase 5: Testing**
- [ ] Hire a test executive via Personnel Manager
- [ ] Verify auth user created
- [ ] Verify documents generated and stored
- [ ] Verify Board Portal shows executive
- [ ] Verify documents accessible

---

## 🎯 Success Criteria

When complete:
1. ✅ Board Portal Directory shows all C-suite members
2. ✅ All hire documents stored as PDFs in bucket
3. ✅ All executives can login to portals
4. ✅ Full audit trail of all documents
5. ✅ Documents viewable/downloadable from Board Portal

---

## 🚀 Quick Start

**To deploy now:**

1. Run migration in Supabase SQL Editor
2. Deploy edge functions:
   ```bash
   supabase functions deploy generate-hr-pdf
   supabase functions deploy create-executive-user
   ```
3. Update PersonnelManager.tsx (see above)
4. Test by hiring a CFO or CTO

**Time estimate**: 30-60 minutes  
**Risk**: Low - infrastructure is ready  
**Impact**: High - fixes critical Board Portal issue

---

**Status**: ✅ **Ready to deploy!**

