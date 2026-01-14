/**
 * Cleanup Placeholder Entries from General Ledger
 * CFO Portal - General Ledger Module
 * 
 * This script deletes all placeholder, test, sample, and example entries
 * from the general ledger system, keeping only real/true entries.
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key tsx scripts/cleanup-general-ledger-placeholders.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface CleanupStats {
  journalEntries: number;
  journalEntryLines: number;
  invoices: number;
  expenseRequests: number;
  accountBalances: number;
}

async function cleanupPlaceholders(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    journalEntries: 0,
    journalEntryLines: 0,
    invoices: 0,
    expenseRequests: 0,
    accountBalances: 0,
  };

  console.log('🧹 Starting General Ledger placeholder cleanup...\n');

  try {
    // 1. Delete placeholder Journal Entries
    console.log('📝 Cleaning up placeholder Journal Entries...');
    const { data: journalEntries, error: jeError } = await supabase
      .from('journal_entries')
      .select('id')
      .or(`
        description.ilike.%placeholder%,
        description.ilike.%test%,
        description.ilike.%sample%,
        description.ilike.%example%,
        description.ilike.%demo%,
        description.ilike.%mock%,
        description.ilike.%dummy%,
        entry_number.ilike.%test%,
        entry_number.ilike.%sample%,
        entry_number.ilike.%placeholder%,
        reference_number.ilike.%test%,
        reference_number.ilike.%sample%,
        reference_number.ilike.%placeholder%,
        reference_number.ilike.%example%
      `);

    if (jeError && jeError.code !== 'PGRST116') {
      console.error('Error fetching journal entries:', jeError);
    } else if (journalEntries && journalEntries.length > 0) {
      const ids = journalEntries.map(je => je.id);
      const { error: deleteError } = await supabase
        .from('journal_entries')
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        console.error('Error deleting journal entries:', deleteError);
      } else {
        stats.journalEntries = ids.length;
        console.log(`   ✅ Deleted ${ids.length} placeholder journal entries`);
      }
    } else {
      console.log('   ℹ️  No placeholder journal entries found');
    }

    // 2. Delete orphaned Journal Entry Lines
    console.log('\n📋 Cleaning up orphaned Journal Entry Lines...');
    const { data: allEntries } = await supabase
      .from('journal_entries')
      .select('id');
    
    if (allEntries) {
      const validEntryIds = allEntries.map(e => e.id);
      const { data: allLines } = await supabase
        .from('journal_entry_lines')
        .select('id, journal_entry_id');
      
      if (allLines) {
        const orphanedLines = allLines.filter(
          line => !validEntryIds.includes(line.journal_entry_id)
        );
        
        if (orphanedLines.length > 0) {
          const { error: deleteError } = await supabase
            .from('journal_entry_lines')
            .delete()
            .in('id', orphanedLines.map(l => l.id));
          
          if (deleteError) {
            console.error('Error deleting orphaned lines:', deleteError);
          } else {
            stats.journalEntryLines = orphanedLines.length;
            console.log(`   ✅ Deleted ${orphanedLines.length} orphaned journal entry lines`);
          }
        } else {
          console.log('   ℹ️  No orphaned journal entry lines found');
        }
      }
    }

    // Also delete lines with placeholder descriptions
    const { data: placeholderLines, error: plError } = await supabase
      .from('journal_entry_lines')
      .select('id')
      .or(`
        description.ilike.%placeholder%,
        description.ilike.%test%,
        description.ilike.%sample%,
        description.ilike.%example%,
        description.ilike.%demo%,
        description.ilike.%mock%
      `);

    if (plError && plError.code !== 'PGRST116') {
      console.error('Error fetching placeholder lines:', plError);
    } else if (placeholderLines && placeholderLines.length > 0) {
      const { error: deleteError } = await supabase
        .from('journal_entry_lines')
        .delete()
        .in('id', placeholderLines.map(l => l.id));
      
      if (deleteError) {
        console.error('Error deleting placeholder lines:', deleteError);
      } else {
        stats.journalEntryLines += placeholderLines.length;
        console.log(`   ✅ Deleted ${placeholderLines.length} placeholder journal entry lines`);
      }
    }

    // 3. Delete placeholder Invoices
    console.log('\n🧾 Cleaning up placeholder Invoices...');
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('id')
      .or(`
        vendor_name.ilike.%test%,
        vendor_name.ilike.%sample%,
        vendor_name.ilike.%placeholder%,
        vendor_name.ilike.%example%,
        vendor_name.ilike.%demo%,
        vendor_name.ilike.%mock%,
        vendor_name.ilike.%dummy%,
        invoice_number.ilike.%test%,
        invoice_number.ilike.%sample%,
        invoice_number.ilike.%placeholder%,
        notes.ilike.%placeholder%,
        notes.ilike.%test%,
        notes.ilike.%sample%,
        notes.ilike.%example%,
        notes.ilike.%demo%,
        vendor_email.ilike.%@example.com%,
        vendor_email.ilike.%@test.com%,
        vendor_email.ilike.%@sample.com%,
        vendor_email.ilike.%test%@%,
        vendor_email.ilike.%placeholder%@%
      `);

    if (invError && invError.code !== 'PGRST116') {
      console.error('Error fetching invoices:', invError);
    } else if (invoices && invoices.length > 0) {
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .in('id', invoices.map(inv => inv.id));
      
      if (deleteError) {
        console.error('Error deleting invoices:', deleteError);
      } else {
        stats.invoices = invoices.length;
        console.log(`   ✅ Deleted ${invoices.length} placeholder invoices`);
      }
    } else {
      console.log('   ℹ️  No placeholder invoices found');
    }

    // 4. Delete placeholder Expense Requests
    console.log('\n💳 Cleaning up placeholder Expense Requests...');
    const { data: expenses, error: expError } = await supabase
      .from('expense_requests')
      .select('id')
      .or(`
        request_number.ilike.%test%,
        request_number.ilike.%sample%,
        request_number.ilike.%placeholder%,
        request_number.ilike.%example%,
        description.ilike.%placeholder%,
        description.ilike.%test%,
        description.ilike.%sample%,
        description.ilike.%example%,
        description.ilike.%demo%,
        description.ilike.%mock%,
        vendor_name.ilike.%test%,
        vendor_name.ilike.%sample%,
        vendor_name.ilike.%placeholder%,
        vendor_name.ilike.%example%,
        vendor_name.ilike.%demo%
      `);

    if (expError && expError.code !== 'PGRST116') {
      console.error('Error fetching expense requests:', expError);
    } else if (expenses && expenses.length > 0) {
      const { error: deleteError } = await supabase
        .from('expense_requests')
        .delete()
        .in('id', expenses.map(exp => exp.id));
      
      if (deleteError) {
        console.error('Error deleting expense requests:', deleteError);
      } else {
        stats.expenseRequests = expenses.length;
        console.log(`   ✅ Deleted ${expenses.length} placeholder expense requests`);
      }
    } else {
      console.log('   ℹ️  No placeholder expense requests found');
    }

    // 5. Clean up Account Balances for deleted accounts
    console.log('\n💰 Cleaning up orphaned Account Balances...');
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id');
    
    if (accounts) {
      const validAccountIds = accounts.map(a => a.id);
      const { data: allBalances } = await supabase
        .from('account_balances')
        .select('id, account_id');
      
      if (allBalances) {
        const orphanedBalances = allBalances.filter(
          balance => !validAccountIds.includes(balance.account_id)
        );
        
        if (orphanedBalances.length > 0) {
          const { error: deleteError } = await supabase
            .from('account_balances')
            .delete()
            .in('id', orphanedBalances.map(b => b.id));
          
          if (deleteError) {
            console.error('Error deleting orphaned balances:', deleteError);
          } else {
            stats.accountBalances = orphanedBalances.length;
            console.log(`   ✅ Deleted ${orphanedBalances.length} orphaned account balances`);
          }
        } else {
          console.log('   ℹ️  No orphaned account balances found');
        }
      }
    }

    console.log('\n✅ Cleanup complete!\n');
    console.log('📊 Summary:');
    console.log(`   Journal Entries: ${stats.journalEntries}`);
    console.log(`   Journal Entry Lines: ${stats.journalEntryLines}`);
    console.log(`   Invoices: ${stats.invoices}`);
    console.log(`   Expense Requests: ${stats.expenseRequests}`);
    console.log(`   Account Balances: ${stats.accountBalances}`);
    console.log(`   Total: ${stats.journalEntries + stats.journalEntryLines + stats.invoices + stats.expenseRequests + stats.accountBalances}`);

    return stats;
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupPlaceholders()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });


