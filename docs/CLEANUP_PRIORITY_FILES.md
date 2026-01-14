# Cleanup Priority Files

**Generated:** January 7, 2025  
**Purpose:** Quick reference for files requiring cleanup

---

## 🔴 High Priority (Start Here)

### 1. `src/pages/MainHub.tsx`
- **Issues:** 42 console statements
- **Action:** Remove all console.log statements
- **Estimated Time:** 30 minutes

### 2. `src/components/mobile/MobileDriverDashboard.tsx`
- **Issues:** 31 console statements, 1 TODO
- **Action:** Remove console.log, review console.error/warn, resolve TODO
- **Estimated Time:** 45 minutes

### 3. `src/components/mobile/CorporateEarningsDashboard.tsx`
- **Issues:** 7 console.log statements, 3 TODOs
- **Action:** Remove console.log (lines 121-127, 138-139), resolve TODOs
- **Estimated Time:** 30 minutes

### 4. `src/components/testing/TestOnFireGame.tsx`
- **Issues:** Testing component with console statements
- **Action:** Decide if needed in production, remove console.log if yes
- **Estimated Time:** 15 minutes

---

## 🟡 Medium Priority

### 5. `src/components/hr/ExecutiveDocumentSignatureTagger.tsx`
- **Issues:** @ts-nocheck at file header
- **Action:** Review and fix type issues, or document why suppression is needed
- **Estimated Time:** 1 hour

### 6. `src/components/ceo/PersonnelManager.tsx`
- **Issues:** 3 TypeScript suppressions
- **Action:** Review and fix type issues
- **Estimated Time:** 45 minutes

### 7. `src/components/mobile/CravenAppComm.tsx`
- **Issues:** 5 TypeScript suppressions
- **Action:** Review and fix type issues
- **Estimated Time:** 1 hour

### 8. `src/services/speedDetectionService.ts`
- **Issues:** 1 TODO comment
- **Action:** Review and resolve TODO
- **Estimated Time:** 15 minutes

---

## 🟢 Low Priority (Clean Up After High Priority)

Files with 1-5 console.log statements or single TODO comments. These can be cleaned up in batches.

**Examples:**
- `src/components/mobile/FeederAccountPage.tsx`
- `src/components/mobile/MobileFeederLogin.tsx`
- `src/hooks/useCravingWheel.ts`
- `src/components/mobile/FeederScheduleTab.tsx`

---

## 📊 Cleanup Progress Tracker

Use this to track your progress:

### High Priority
- [ ] `src/pages/MainHub.tsx`
- [ ] `src/components/mobile/MobileDriverDashboard.tsx`
- [ ] `src/components/mobile/CorporateEarningsDashboard.tsx`
- [ ] `src/components/testing/TestOnFireGame.tsx`

### Medium Priority
- [ ] `src/components/hr/ExecutiveDocumentSignatureTagger.tsx`
- [ ] `src/components/ceo/PersonnelManager.tsx`
- [ ] `src/components/mobile/CravenAppComm.tsx`
- [ ] `src/services/speedDetectionService.ts`

### Low Priority
- [ ] Review `CLEANUP_REPORT.txt` for remaining files
- [ ] Clean up in batches of 10-20 files

---

## 💡 Tips

1. **Start with high priority files** - These have the most impact
2. **Work file-by-file** - Complete one file before moving to the next
3. **Test after each file** - Verify functionality still works
4. **Commit frequently** - Commit after each major file cleanup
5. **Take breaks** - This is a large task, don't rush

---

**Total Estimated Time for High Priority:** ~2 hours  
**Total Estimated Time for Medium Priority:** ~3 hours  
**Total Estimated Time for Low Priority:** ~2-3 hours  
**Grand Total:** ~7-8 hours




