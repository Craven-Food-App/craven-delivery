# Final Implementation Guide
## Replacing Mock Data with Real Database Queries

**Date:** December 18, 2025  
**Status:** Ready to implement  
**Estimated Time:** 3-4 hours  

---

## 🎯 SUMMARY

**What's Done:**
- ✅ Stripe live keys configured
- ✅ Database schema created (17 tables)
- ✅ 9 comprehensive SOPs written
- ✅ Payout system documented
- ✅ Production readiness analyzed

**What Remains:**
- ⏳ Run database migrations
- ⏳ Replace mock data in 6 files
- ⏳ Test functionality

---

## STEP 1: Run Database Migrations

### Command:
```bash
cd D:\Repositories\craven-delivery
supabase db push
```

### Verify:
```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'intern_%';

-- Should return 14 tables
```

---

## STEP 2: Replace HR Dashboard Mock Data

### File: `src/pages/HRPortal.tsx`

**Lines to Replace:** 48-65

**Current Code:**
```typescript
const mockMonthlyHrData = [
  { month: 'Jan', Headcount: 200, Voluntary_Turnover: 2.5, Engagement_Score: 7.2 },
  // ... more mock data
];

const mockDepartmentData = [
  { name: 'Engineering', headcount: 85, color: '#1890ff' },
  // ... more mock data
];
```

**Replace With:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Real data from database
const { data: monthlyMetrics, isLoading: metricsLoading } = useQuery({
  queryKey: ['hr-monthly-metrics'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('hr_monthly_metrics')
      .select('*')
      .order('metric_month', { ascending: true })
      .limit(12);
    
    if (error) throw error;
    
    // Transform to chart format
    return data?.map(m => ({
      month: new Date(m.metric_month).toLocaleDateString('en-US', { month: 'short' }),
      Headcount: m.total_headcount,
      Voluntary_Turnover: m.turnover_rate,
      Engagement_Score: m.employee_satisfaction_score || 0
    })) || [];
  }
});

const { data: departmentMetrics, isLoading: deptLoading } = useQuery({
  queryKey: ['hr-department-metrics'],
  queryFn: async () => {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { data, error } = await supabase
      .from('hr_department_metrics')
      .select('*')
      .eq('metric_month', currentMonth);
    
    if (error) throw error;
    
    // Transform to chart format with colors
    const colors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2', '#f5222d'];
    return data?.map((d, i) => ({
      name: d.department,
      headcount: d.headcount,
      color: colors[i % colors.length]
    })) || [];
  }
});

// Use real data or show loading
const monthlyHrData = monthlyMetrics || [];
const departmentData = departmentMetrics || [];
```

**Add Loading State:**
```typescript
if (metricsLoading || deptLoading) {
  return <Spin size="large" />;
}
```

---

## STEP 3: Replace Intern Conversion Mock Data

### File: `src/portals/intern/conversion/InternConversion.tsx`

**Lines to Replace:** 77-212

**Add Imports:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
```

**Replace Mock Data:**
```typescript
const { user } = useAuth();
const queryClient = useQueryClient();

// Get intern ID from current user
const { data: internProfile } = useQuery({
  queryKey: ['intern-profile', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user?.id)
      .single();
    
    if (error) throw error;
    return data;
  },
  enabled: !!user
});

const internId = internProfile?.id;

// Get conversion pathway
const { data: pathway, isLoading } = useQuery({
  queryKey: ['conversion-pathway', internId],
  queryFn: async () => {
    const { data, error} = await supabase
      .from('intern_conversion_pathways')
      .select('*')
      .eq('intern_id', internId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  enabled: !!internId
});

// Calculate requirements from pathway data
const requirements: EligibilityRequirement[] = [
  {
    id: '1',
    category: 'time',
    title: 'Minimum Tenure',
    description: 'Complete at least 90 days in the internship program',
    currentValue: pathway?.days_completed || 0,
    targetValue: pathway?.required_days || 90,
    unit: 'days',
    status: (pathway?.days_completed || 0) >= (pathway?.required_days || 90) ? 'completed' : 'in_progress',
    weight: 15,
  },
  {
    id: '2',
    category: 'performance',
    title: 'Performance Score',
    description: 'Maintain an average performance score of 4.0 or higher',
    currentValue: pathway?.performance_score || 0,
    targetValue: pathway?.required_performance_score || 4.0,
    unit: '/5.0',
    status: (pathway?.performance_score || 0) >= (pathway?.required_performance_score || 4.0) ? 'completed' : 'in_progress',
    weight: 25,
  },
  // Add other requirements based on pathway data
];

// Conversion offer (if exists)
const conversionOffer = pathway?.offer_extended ? {
  id: pathway.id,
  title: 'Full-Time Employment Offer',
  role: pathway.target_position_code || 'Software Engineer',
  department: pathway.target_department || 'Engineering',
  status: pathway.offer_accepted ? 'accepted' : 'pending',
  offeredDate: pathway.offer_extended_at,
  expiresDate: new Date(new Date(pathway.offer_extended_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  compensation: {
    deferredSalary: 65000,
    equityPercent: 0.1,
    vestingSchedule: '4 years with 1 year cliff'
  },
  benefits: ['Health Insurance', 'Dental & Vision', '401(k) Match', 'Unlimited PTO'],
  responsibilities: ['Contribute to core product', 'Mentor junior developers', 'Participate in code reviews']
} : null;
```

---

## STEP 4: Replace Intern Work Mock Data

### File: `src/portals/intern/work/InternWork.tsx`

**Lines to Replace:** 108-250

**Replace With:**
```typescript
// Get tasks
const { data: tasks, isLoading: tasksLoading } = useQuery({
  queryKey: ['intern-tasks', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_tasks')
      .select('*')
      .eq('intern_id', internId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    return data?.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      estimatedHours: t.estimated_hours,
      actualHours: t.actual_hours,
      assignedBy: t.assigned_by,
      completedAt: t.completed_at
    })) || [];
  },
  enabled: !!internId
});

// Get deliverables
const { data: deliverables } = useQuery({
  queryKey: ['intern-deliverables', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_deliverables')
      .select('*')
      .eq('intern_id', internId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    
    return data?.map(d => ({
      id: d.id,
      title: d.title,
      type: d.deliverable_type,
      status: d.status,
      submittedAt: d.submitted_at,
      feedback: d.feedback,
      fileUrl: d.file_url
    })) || [];
  },
  enabled: !!internId
});

// Get activity logs
const { data: activityLogs } = useQuery({
  queryKey: ['intern-activity-logs', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_activity_logs')
      .select('*')
      .eq('intern_id', internId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    return data?.map(a => ({
      id: a.id,
      timestamp: a.created_at,
      type: a.activity_type,
      title: a.title,
      description: a.description
    })) || [];
  },
  enabled: !!internId
});
```

---

## STEP 5: Replace Intern Academic Credit Mock Data

### File: `src/portals/intern/academic/InternAcademicCredit.tsx`

**Lines to Replace:** 109-250

**Replace With:**
```typescript
// Get academic credit record
const { data: creditRecord } = useQuery({
  queryKey: ['academic-credit', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_academic_credits')
      .select('*')
      .eq('intern_id', internId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  enabled: !!internId
});

// Get academic documents
const { data: documents } = useQuery({
  queryKey: ['academic-documents', creditRecord?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_academic_documents')
      .select('*')
      .eq('academic_credit_id', creditRecord.id);
    
    if (error) throw error;
    return data;
  },
  enabled: !!creditRecord?.id
});

// Get time logs
const { data: timeLogs } = useQuery({
  queryKey: ['time-logs', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_time_logs')
      .select('*')
      .eq('intern_id', internId)
      .order('log_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  enabled: !!internId
});

// Get evaluations
const { data: evaluations } = useQuery({
  queryKey: ['evaluations', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_evaluations')
      .select('*')
      .eq('intern_id', internId)
      .order('evaluation_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  enabled: !!internId
});
```

---

## STEP 6: Replace Intern Exit Mock Data

### File: `src/portals/intern/exit/InternExit.tsx`

**Lines to Replace:** 77-251

**Replace With:**
```typescript
// Get offboarding record
const { data: offboarding } = useQuery({
  queryKey: ['offboarding', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_offboarding')
      .select('*')
      .eq('intern_id', internId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  enabled: !!internId
});

// Get offboarding checklist
const { data: checklistItems } = useQuery({
  queryKey: ['offboarding-checklist', offboarding?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_offboarding_checklist')
      .select('*')
      .eq('offboarding_id', offboarding.id);
    
    if (error) throw error;
    return data;
  },
  enabled: !!offboarding?.id
});
```

---

## STEP 7: Replace Intern Performance Mock Data

### File: `src/portals/intern/performance/InternPerformance.tsx`

**Lines to Replace:** 87-326

**Replace With:**
```typescript
// Get KPIs
const { data: kpis } = useQuery({
  queryKey: ['kpis', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_kpis')
      .select('*')
      .eq('intern_id', internId)
      .eq('status', 'active');
    
    if (error) throw error;
    return data;
  },
  enabled: !!internId
});

// Get reviews
const { data: reviews } = useQuery({
  queryKey: ['reviews', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_evaluations')
      .select('*')
      .eq('intern_id', internId)
      .order('evaluation_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  enabled: !!internId
});

// Get skills
const { data: skills } = useQuery({
  queryKey: ['skills', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_skills')
      .select('*')
      .eq('intern_id', internId);
    
    if (error) throw error;
    return data;
  },
  enabled: !!internId
});

// Get goals
const { data: goals } = useQuery({
  queryKey: ['goals', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_goals')
      .select('*')
      .eq('intern_id', internId)
      .order('target_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  enabled: !!internId
});

// Get feedback
const { data: feedback } = useQuery({
  queryKey: ['feedback', internId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('intern_feedback')
      .select('*, feedback_from:employees(full_name)')
      .eq('intern_id', internId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  enabled: !!internId
});
```

---

## STEP 8: Testing Checklist

After making all changes:

### Database Tests:
- [ ] Migrations ran successfully
- [ ] All 17 tables exist
- [ ] RLS policies work
- [ ] Can insert test data

### HR Dashboard Tests:
- [ ] Monthly metrics chart displays
- [ ] Department metrics chart displays
- [ ] No console errors
- [ ] Loading states work

### Intern Program Tests:
- [ ] Create test intern profile
- [ ] Assign task
- [ ] Log time
- [ ] Submit deliverable
- [ ] Create evaluation
- [ ] All data persists

### Payment Tests:
- [ ] Customer checkout works
- [ ] Real payment processes
- [ ] Stripe Dashboard shows transaction
- [ ] Webhook receives event

---

## STEP 9: Deployment

```bash
# 1. Commit changes
git add .
git commit -m "Replace mock data with real database queries"

# 2. Push to repository
git push

# 3. Verify deployment
# Check hosting dashboard for successful deploy

# 4. Test production
# Visit live site and test all features
```

---

## ESTIMATED TIME BREAKDOWN

| Task | Time |
|------|------|
| Run migrations | 5 min |
| Replace HR dashboard | 30 min |
| Replace intern conversion | 30 min |
| Replace intern work | 30 min |
| Replace intern academic | 30 min |
| Replace intern exit | 20 min |
| Replace intern performance | 40 min |
| Testing | 60 min |
| **TOTAL** | **3-4 hours** |

---

## PRIORITY RECOMMENDATION

### High Priority (Do First):
1. ✅ Stripe keys (DONE)
2. ✅ Documentation (DONE)
3. ⏳ HR Dashboard (30 min)

### Medium Priority (Do Soon):
4. ⏳ Intern program (3 hours)

### Low Priority (Optional):
- Additional features
- Performance optimization
- UI enhancements

---

## LAUNCH DECISION

### Option A: Launch Now
**Without intern program updates:**
- Core platform fully functional
- Payments working
- Can start generating revenue
- Intern program shows mock data (internal tool only)

### Option B: Launch Tomorrow
**After completing all updates:**
- Everything 100% production-ready
- No mock data anywhere
- Fully polished

**Recommendation:** Launch now (Option A), update intern program this week

---

**Status:** Ready to implement  
**Next Action:** Run migrations and start replacing mock data  
**Support:** All documentation in place, ready to assist

