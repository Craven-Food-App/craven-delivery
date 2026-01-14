/**
 * Pre-Release Code Cleanup Script
 * 
 * This script helps clean up the codebase before final release:
 * - Removes console.log statements (keeps console.error for critical errors)
 * - Identifies TODO/FIXME comments for manual review
 * - Identifies commented code blocks
 * - Reports TypeScript suppressions
 * 
 * Usage: tsx scripts/cleanup-codebase.ts
 * 
 * WARNING: This script reports issues. Manual review required before removing code.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface CleanupReport {
  file: string;
  consoleLogs: number;
  consoleErrors: number;
  consoleWarns: number;
  todos: string[];
  commentedBlocks: number;
  tsSuppressions: number;
  issues: string[];
}

const srcDir = join(process.cwd(), 'src');
const reports: CleanupReport[] = [];

// Files to skip
const skipFiles = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '*.test.ts',
  '*.test.tsx',
  '*.spec.ts',
  '*.spec.tsx'
];

function shouldSkipFile(filePath: string): boolean {
  return skipFiles.some(skip => filePath.includes(skip));
}

function scanFile(filePath: string): CleanupReport | null {
  if (shouldSkipFile(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const report: CleanupReport = {
      file: filePath.replace(process.cwd(), ''),
      consoleLogs: 0,
      consoleErrors: 0,
      consoleWarns: 0,
      todos: [],
      commentedBlocks: 0,
      tsSuppressions: 0,
      issues: []
    };

    let inCommentBlock = false;
    let commentBlockStart = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Count console statements
      if (trimmed.includes('console.log(')) {
        report.consoleLogs++;
        report.issues.push(`Line ${index + 1}: console.log found`);
      }
      if (trimmed.includes('console.error(')) {
        report.consoleErrors++;
      }
      if (trimmed.includes('console.warn(')) {
        report.consoleWarns++;
      }

      // Find TODO/FIXME comments
      if (trimmed.match(/\/\/\s*(TODO|FIXME|XXX|HACK|BUG)/i) || 
          trimmed.match(/\/\*\s*(TODO|FIXME|XXX|HACK|BUG)/i)) {
        report.todos.push(`Line ${index + 1}: ${trimmed.substring(0, 80)}`);
      }

      // Detect commented code blocks (lines that look like code but are commented)
      if (trimmed.startsWith('//') && trimmed.length > 3) {
        const codePart = trimmed.substring(2).trim();
        // Heuristic: if it looks like code (has brackets, parens, etc.)
        if (codePart.match(/[{}();=<>[\]]/) && !codePart.startsWith('http')) {
          report.commentedBlocks++;
        }
      }

      // Detect TypeScript suppressions
      if (trimmed.includes('@ts-ignore') || 
          trimmed.includes('@ts-nocheck') || 
          trimmed.includes('eslint-disable')) {
        report.tsSuppressions++;
        report.issues.push(`Line ${index + 1}: TypeScript/ESLint suppression found`);
      }
    });

    // Only add to report if there are issues
    if (report.consoleLogs > 0 || 
        report.todos.length > 0 || 
        report.commentedBlocks > 5 || 
        report.tsSuppressions > 0) {
      return report;
    }

    return null;
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error);
    return null;
  }
}

function scanDirectory(dir: string): void {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    
    if (shouldSkipFile(fullPath)) continue;

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && 
               (entry.endsWith('.ts') || 
                entry.endsWith('.tsx') || 
                entry.endsWith('.js') || 
                entry.endsWith('.jsx'))) {
      const report = scanFile(fullPath);
      if (report) {
        reports.push(report);
      }
    }
  }
}

function generateReport(): void {
  console.log('\n📊 CODE CLEANUP REPORT\n');
  console.log('='.repeat(80));

  // Summary
  const totalConsoleLogs = reports.reduce((sum, r) => sum + r.consoleLogs, 0);
  const totalConsoleErrors = reports.reduce((sum, r) => sum + r.consoleErrors, 0);
  const totalConsoleWarns = reports.reduce((sum, r) => sum + r.consoleWarns, 0);
  const totalTodos = reports.reduce((sum, r) => sum + r.todos.length, 0);
  const totalCommented = reports.reduce((sum, r) => sum + r.commentedBlocks, 0);
  const totalSuppressions = reports.reduce((sum, r) => sum + r.tsSuppressions, 0);

  console.log('\n📈 SUMMARY:');
  console.log(`  Files with issues: ${reports.length}`);
  console.log(`  console.log statements: ${totalConsoleLogs}`);
  console.log(`  console.error statements: ${totalConsoleErrors} (review - may be needed)`);
  console.log(`  console.warn statements: ${totalConsoleWarns} (review - may be needed)`);
  console.log(`  TODO/FIXME comments: ${totalTodos}`);
  console.log(`  Commented code blocks: ${totalCommented}`);
  console.log(`  TypeScript suppressions: ${totalSuppressions}`);

  // Top files with most issues
  console.log('\n🔴 TOP 20 FILES WITH MOST ISSUES:');
  const sorted = [...reports].sort((a, b) => {
    const aTotal = a.consoleLogs + a.todos.length + a.commentedBlocks + a.tsSuppressions;
    const bTotal = b.consoleLogs + b.todos.length + b.commentedBlocks + b.tsSuppressions;
    return bTotal - aTotal;
  });

  sorted.slice(0, 20).forEach((report, idx) => {
    const total = report.consoleLogs + report.todos.length + report.commentedBlocks + report.tsSuppressions;
    console.log(`  ${idx + 1}. ${report.file}`);
    console.log(`     Issues: ${total} (logs: ${report.consoleLogs}, todos: ${report.todos.length}, comments: ${report.commentedBlocks}, suppressions: ${report.tsSuppressions})`);
  });

  // Files with console.log
  const filesWithLogs = reports.filter(r => r.consoleLogs > 0);
  if (filesWithLogs.length > 0) {
    console.log(`\n📝 FILES WITH console.log (${filesWithLogs.length} files):`);
    filesWithLogs.slice(0, 30).forEach(report => {
      console.log(`  - ${report.file}: ${report.consoleLogs} console.log statements`);
    });
    if (filesWithLogs.length > 30) {
      console.log(`  ... and ${filesWithLogs.length - 30} more files`);
    }
  }

  // Files with TODOs
  const filesWithTodos = reports.filter(r => r.todos.length > 0);
  if (filesWithTodos.length > 0) {
    console.log(`\n⚠️  FILES WITH TODO/FIXME (${filesWithTodos.length} files):`);
    filesWithTodos.slice(0, 20).forEach(report => {
      console.log(`  - ${report.file}: ${report.todos.length} TODO/FIXME comments`);
      report.todos.slice(0, 3).forEach(todo => {
        console.log(`    ${todo}`);
      });
    });
  }

  // Files with TypeScript suppressions
  const filesWithSuppressions = reports.filter(r => r.tsSuppressions > 0);
  if (filesWithSuppressions.length > 0) {
    console.log(`\n🔧 FILES WITH TYPE SUPPRESSIONS (${filesWithSuppressions.length} files):`);
    filesWithSuppressions.slice(0, 20).forEach(report => {
      console.log(`  - ${report.file}: ${report.tsSuppressions} suppressions`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Report complete. Review the issues above before making changes.');
  console.log('💡 Recommendation: Fix issues file-by-file, starting with highest priority files.\n');
}

// Main execution
console.log('🔍 Scanning codebase for cleanup issues...\n');
scanDirectory(srcDir);
generateReport();

// Write detailed report to file
const reportPath = join(process.cwd(), 'CLEANUP_REPORT.txt');
const reportContent = reports.map(r => {
  const lines = [
    `\n${'='.repeat(80)}`,
    `FILE: ${r.file}`,
    `  console.log: ${r.consoleLogs}`,
    `  console.error: ${r.consoleErrors}`,
    `  console.warn: ${r.consoleWarns}`,
    `  TODO/FIXME: ${r.todos.length}`,
    `  Commented blocks: ${r.commentedBlocks}`,
    `  TS suppressions: ${r.tsSuppressions}`,
  ];
  if (r.todos.length > 0) {
    lines.push('  TODOs:');
    r.todos.forEach(todo => lines.push(`    ${todo}`));
  }
  return lines.join('\n');
}).join('\n');

writeFileSync(reportPath, reportContent);
console.log(`\n📄 Detailed report saved to: ${reportPath}`);




