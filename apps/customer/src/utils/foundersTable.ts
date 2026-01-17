import { getExecutiveData, formatExecutiveForDocuments } from '@/utils/getExecutiveData';
import { supabase } from '@/integrations/supabase/client';

export interface FoundersTableTarget {
  role: string;
  name: string;
  title?: string | null;
  equityPercent?: string | number | null;
  shares?: string | number | null;
  vesting?: string | null;
}

const ROLE_ORDER = ['ceo', 'cfo', 'cxo'];
const ROLE_TITLES: Record<string, string> = {
  ceo: 'Chief Executive Officer (CEO)',
  cfo: 'Chief Financial Officer (CFO)',
  cxo: 'Chief Experience Officer (CXO)',
};

const parseNumeric = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatPercent = (value: string | number | null | undefined): string => {
  if (value == null) return '0%';
  const str = value.toString().trim();
  if (!str) return '0%';
  if (str.includes('%')) return str.replace(/\s+/g, '');
  const num = parseFloat(str);
  if (Number.isNaN(num)) return str;
  const rounded = Number(num.toFixed(2));
  const base = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toString();
  return `${base.replace(/\.0+$/, '')}%`;
};

const formatShares = (value: string | number | null | undefined): string => {
  const num = parseNumeric(value);
  return num ? num.toLocaleString() : '0';
};

const formatVesting = (value: string | null | undefined): string => {
  const text = value?.trim();
  if (!text) return 'Immediate';
  return text;
};

interface RowData {
  role: string;
  name: string;
  title: string;
  equity: string;
  shares: string;
  vesting: string;
}

const buildRowData = (role: string, data?: { full_name?: string; title?: string; equity_percent?: string; shares_issued?: string; vesting_schedule?: string }): RowData => {
  const defaultTitle = ROLE_TITLES[role] || role.toUpperCase();
  return {
    role,
    name: data?.full_name || '—',
    title: data?.title || defaultTitle,
    equity: formatPercent(data?.equity_percent),
    shares: formatShares(data?.shares_issued),
    vesting: formatVesting(data?.vesting_schedule),
  };
};

const findRow = (rows: RowData[], role: string): RowData => {
  return rows.find((row) => row.role === role) ?? {
    role,
    name: '—',
    title: ROLE_TITLES[role] || role.toUpperCase(),
    equity: '0%',
    shares: '0',
    vesting: 'Immediate',
  };
};

export interface FoundersTableResult {
  tableHtml: string;
  signatureHtml: string;
  addressed: RowData;
  ceo: RowData;
  cfo: RowData;
  cxo: RowData;
  rows: RowData[];
}

export const buildFoundersTableHtml = async (target: FoundersTableTarget): Promise<FoundersTableResult> => {
  // Founders Agreement: ONLY Torrance Stroman (the sole founder)
  const FOUNDER_NAME = 'Torrance Stroman';
  
  // Get Torrance's executive data
  const allExecutives = await getExecutiveData();
  const torrance = allExecutives.find(exec => 
    exec.full_name?.toLowerCase().includes('torrance') || 
    exec.role === 'ceo'
  );
  
  const formatted = torrance ? [formatExecutiveForDocuments(torrance)] : [];
  
  const rows: RowData[] = [];
  
  // Only add Torrance Stroman as the founder
  if (formatted.length > 0) {
    const founder = formatted[0];
    rows.push({
      role: 'founder',
      name: founder.full_name || FOUNDER_NAME,
      title: 'Founder & Chief Executive Officer',
      equity: formatPercent(founder.equity_percent),
      shares: formatShares(founder.shares_issued),
      vesting: formatVesting(founder.vesting_schedule),
    });
  } else {
    // Fallback if Torrance not found - use target data
    rows.push({
      role: 'founder',
      name: target.name || FOUNDER_NAME,
      title: target.title || 'Founder & Chief Executive Officer',
      equity: formatPercent(target.equityPercent),
      shares: formatShares(target.shares),
      vesting: formatVesting(target.vesting),
    });
  }

  const tableHtml = rows
    .map(
      (row) =>
        `<tr><td>${row.name}</td><td>${row.title}</td><td>${row.equity}</td><td>${row.shares}</td><td>${row.vesting}</td></tr>`
    )
    .join('');

  const signatureHtml = rows
    .map(
      (row) => `
        <table class="signature">
          <tr>
            <td>
              <span class="sig-line"></span>
              <div class="sig-label">Signature of ${row.name}</div>
            </td>
            <td style="width:40px;"></td>
            <td>
              <span class="sig-line"></span>
              <div class="sig-label">Date</div>
            </td>
          </tr>
        </table>
      `
    )
    .join('');

  const founderRow = rows[0] || {
    role: 'founder',
    name: FOUNDER_NAME,
    title: 'Founder & Chief Executive Officer',
    equity: '0%',
    shares: '0',
    vesting: 'Immediate',
  };

  return {
    tableHtml,
    signatureHtml,
    addressed: founderRow,
    ceo: founderRow, // Torrance is CEO
    cfo: findRow(rows, 'cfo'),
    cxo: findRow(rows, 'cxo'),
    rows,
  };
};

// Shareholders Agreement: All shareholders EXCEPT Torrance Stroman
export const buildShareholdersTableHtml = async (target?: FoundersTableTarget): Promise<FoundersTableResult> => {
  const FOUNDER_NAME = 'Torrance Stroman';
  
  // Fetch ALL shareholders from employee_equity table (including non-employee entities)
  const { data: equityData, error: equityError } = await supabase
    .from('employee_equity')
    .select(`
      id,
      shares_total,
      shares_percentage,
      vesting_schedule,
      grant_date,
      shareholder_name,
      shareholder_type,
      is_majority_shareholder,
      employees (
        id,
        first_name,
        last_name,
        position,
        email
      )
    `)
    .order('shares_percentage', { ascending: false });

  if (equityError) {
    console.error('Error fetching shareholders:', equityError);
  }

  // Get executives for role mapping
  const allExecutives = await getExecutiveData();
  const formatted = allExecutives.map((exec) => formatExecutiveForDocuments(exec));

  // Create a map of employee_id -> executive role
  const employeeToRoleMap = new Map<string, string>();
  allExecutives.forEach(exec => {
    if (exec.employee_id) {
      employeeToRoleMap.set(exec.employee_id, exec.role);
    }
  });

  const rows: RowData[] = [];

  // Process all shareholders from employee_equity (EXCLUDE Torrance Stroman)
  if (equityData && equityData.length > 0) {
    equityData.forEach((eq: any) => {
      // Handle non-employee shareholders (trusts, entities like Invero Business Trust)
      if (eq.shareholder_name && !eq.employees) {
        const role = eq.is_majority_shareholder ? 'majority_shareholder' : 'shareholder';
        const title = eq.shareholder_type === 'trust' 
          ? 'Majority Shareholder (Trust)' 
          : eq.shareholder_type === 'entity'
          ? 'Shareholder (Entity)'
          : 'Shareholder';

        let vestingText = formatVesting(eq.vesting_schedule);
        if (eq.vesting_schedule && typeof eq.vesting_schedule === 'object') {
          const vs = eq.vesting_schedule;
          if (vs.type === 'immediate') {
            vestingText = 'Immediate';
          } else if (vs.duration_months && vs.cliff_months) {
            const years = Math.floor(vs.duration_months / 12);
            const cliffYears = Math.floor(vs.cliff_months / 12);
            vestingText = cliffYears > 0 
              ? `${years} years with ${cliffYears} year cliff`
              : `${years} years`;
          }
        }

        rows.push({
          role: role,
          name: eq.shareholder_name,
          title: title,
          equity: formatPercent(eq.shares_percentage),
          shares: formatShares(eq.shares_total),
          vesting: vestingText,
        });
        return;
      }

      // Handle employee shareholders (EXCLUDE Torrance Stroman)
      const employee = eq.employees;
      if (!employee) return;

      const fullName = `${employee.first_name} ${employee.last_name}`.trim();
      
      // Skip Torrance Stroman - he's only on Founders Agreement
      if (fullName.toLowerCase().includes('torrance')) {
        return;
      }

      const employeeId = employee.id;
      const role = employeeToRoleMap.get(employeeId)?.toLowerCase() || 'shareholder';
      const title = employee.position || ROLE_TITLES[role] || role.toUpperCase();

      let vestingText = formatVesting(eq.vesting_schedule);
      if (eq.vesting_schedule && typeof eq.vesting_schedule === 'object') {
        const vs = eq.vesting_schedule;
        if (vs.type === 'immediate') {
          vestingText = 'Immediate';
        } else if (vs.duration_months && vs.cliff_months) {
          const years = Math.floor(vs.duration_months / 12);
          const cliffYears = Math.floor(vs.cliff_months / 12);
          vestingText = cliffYears > 0 
            ? `${years} years with ${cliffYears} year cliff`
            : `${years} years`;
        }
      }

      rows.push({
        role: role,
        name: fullName,
        title: title,
        equity: formatPercent(eq.shares_percentage),
        shares: formatShares(eq.shares_total),
        vesting: vestingText,
      });
    });
  }

  // Sort: Majority shareholders first, then by equity percentage
  rows.sort((a, b) => {
    if (a.role === 'majority_shareholder' && b.role !== 'majority_shareholder') return -1;
    if (b.role === 'majority_shareholder' && a.role !== 'majority_shareholder') return 1;
    
    const aEquity = parseNumeric(a.equity);
    const bEquity = parseNumeric(b.equity);
    return bEquity - aEquity;
  });

  const tableHtml = rows
    .map(
      (row) =>
        `<tr><td>${row.name}</td><td>${row.title}</td><td>${row.equity}</td><td>${row.shares}</td><td>${row.vesting}</td></tr>`
    )
    .join('');

  const signatureHtml = rows
    .map(
      (row) => `
        <table class="signature">
          <tr>
            <td>
              <span class="sig-line"></span>
              <div class="sig-label">Signature of ${row.name}</div>
            </td>
            <td style="width:40px;"></td>
            <td>
              <span class="sig-line"></span>
              <div class="sig-label">Date</div>
            </td>
          </tr>
        </table>
      `
    )
    .join('');

  // For shareholders agreement, we don't need CEO/CFO/CXO specific fields
  // but we'll provide them for template compatibility
  const ceoRow = findRow(rows, 'ceo');
  const cfoRow = findRow(rows, 'cfo');
  const cxoRow = findRow(rows, 'cxo');

  return {
    tableHtml,
    signatureHtml,
    addressed: rows[0] || findRow(rows, 'shareholder'),
    ceo: ceoRow,
    cfo: cfoRow,
    cxo: cxoRow,
    rows,
  };
};
