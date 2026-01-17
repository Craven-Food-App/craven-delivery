export interface FlowExecutive {
  role: string;
  title?: string | null;
  full_name?: string | null;
  equity_percent?: string | number | null;
  equityPercent?: string | number | null;
  shares_issued?: string | number | null;
  sharesIssued?: string | number | null;
  share_count?: string | number | null;
  salary_status?: string | null;
  defer_salary?: boolean | null;
  funding_trigger?: string | number | null;
  fundingTrigger?: string | number | null;
  incorporation_status?: 'pre_incorporation' | 'incorporated';
}
