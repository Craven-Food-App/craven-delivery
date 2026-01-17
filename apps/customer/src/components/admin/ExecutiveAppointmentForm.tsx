import React, { useState } from 'react';
import { appointExecutive, AppointExecutivePayload } from '@/utils/appointExecutive';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import DOMPurify from 'dompurify';

// Simple HTML builders for PDFs (kept minimal and dependency-free)
function buildEquityOfferHtml(v: any): string {
  const deferred = v.salary_status === 'deferred' ? `
    <h3>Deferred Salary Clause</h3>
    <p>
      The Executive acknowledges that Crave’n Inc. is in an early, pre-revenue stage and will initially serve on an equity-only basis.<br/>
      Upon the Company achieving a Funding Event—defined as closing a capital raise of at least $${v.funding_trigger || '500000'} USD or achieving positive cash flow for three consecutive months—the Executive shall begin receiving a base annual salary of $${v.annual_salary} USD, payable according to standard payroll practices.<br/>
      No back pay or retroactive wages shall accrue prior to the Funding Event.
    </p>
  ` : '';

  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
      <h2 style="margin-top:0;">Equity Offer Agreement</h2>
      <p>This Equity Offer Agreement (the "Agreement") is entered into by and between Crave’n Inc. (the "Company") and <strong>${v.executive_name}</strong> (the "Executive").</p>
      <h3>1. Appointment and Role</h3>
      <ul>
        <li>Title: ${v.executive_title}</li>
        <li>Start Date: ${v.start_date}</li>
      </ul>
      <h3>2. Equity Grant</h3>
      <ul>
        <li>Equity Percent: ${v.equity_percent}%</li>
        <li>Shares Issued: ${v.shares_issued} shares</li>
        <li>Equity Type: ${v.equity_type}</li>
        <li>Vesting Schedule: ${v.vesting_schedule}</li>
        <li>Strike Price: ${v.strike_price}</li>
      </ul>
      <h3>3. Compensation</h3>
      <ul>
        <li>Salary Status: ${v.salary_status}</li>
        <li>Annual Salary (if active): $${v.annual_salary} USD/year</li>
      </ul>
      ${deferred}
      <h3>4. Governing Law</h3>
      <p>This Agreement shall be governed by and construed in accordance with the laws of ${v.governing_law}.</p>
      <p style="margin-top:24px; font-style: italic;">Disclaimer: This agreement reflects an equity-only officer appointment until such time as Crave’n Inc. achieves a qualifying funding event.</p>
    </div>
  `;
}

function buildDeferredCompHtml(v: any): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
      <h2 style="margin-top:0;">Deferred Compensation Agreement</h2>
      <p>This Deferred Compensation Agreement (the "Agreement") is entered into by and between Crave’n Inc. (the "Company") and <strong>${v.executive_name}</strong> (the "Executive").</p>
      <h3>1. Appointment and Role</h3>
      <ul>
        <li>Title: ${v.executive_title}</li>
        <li>Start Date: ${v.start_date}</li>
        <li>Salary Status: ${v.salary_status}</li>
      </ul>
      <h3>2. Deferred Salary Clause</h3>
      <p>
        The Executive acknowledges that Crave’n Inc. is in an early, pre-revenue stage and will initially serve on an equity-only basis.<br/>
        Upon the Company achieving a Funding Event—defined as closing a capital raise of at least $${v.funding_trigger || '500000'} USD or achieving positive cash flow for three consecutive months—the Executive shall begin receiving a base annual salary of $${v.annual_salary} USD, payable according to standard payroll practices.<br/>
        No back pay or retroactive wages shall accrue prior to the Funding Event.
      </p>
      <h3>3. Additional Terms</h3>
      <ul>
        <li>Equity and vesting as set forth in the Equity Offer Agreement.</li>
        <li>This Agreement shall be read together with the Equity Offer Agreement.</li>
      </ul>
      <h3>4. Governing Law</h3>
      <p>This Agreement shall be governed by and construed in accordance with the laws of ${v.governing_law}.</p>
      <p style="margin-top:24px; font-style: italic;">Disclaimer: This agreement reflects an equity-only officer appointment until such time as Crave’n Inc. achieves a qualifying funding event.</p>
    </div>
  `;
}

function buildBoardResolutionHtml(v: any): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
      <h2 style="margin-top:0;">Board Resolution – Officer Appointment</h2>
      <p>Resolved, that <strong>${v.executive_name}</strong> is hereby appointed as <strong>${v.executive_title}</strong> of Crave’n Inc., effective ${v.start_date}, and is authorized to carry out the duties of such office.</p>
      <p>Further Resolved, that <strong>${v.shares_issued}</strong> shares of <strong>${v.equity_type}</strong> are hereby issued to ${v.executive_name} in consideration of services rendered, subject to the vesting schedule and terms set forth in the Equity Offer Agreement.</p>
      <h3>For the record</h3>
      <ul>
        <li>Equity Percent: ${v.equity_percent}%</li>
        <li>Vesting Schedule: ${v.vesting_schedule}</li>
        <li>Strike Price: ${v.strike_price}</li>
        <li>Salary Status: ${v.salary_status}</li>
        <li>Annual Salary: $${v.annual_salary}</li>
        <li>Funding Trigger: $${v.funding_trigger || ''}</li>
      </ul>
      <p style="margin-top:24px; font-style: italic;">Disclaimer: This agreement reflects an equity-only officer appointment until such time as Crave’n Inc. achieves a qualifying funding event.</p>
    </div>
  `;
}

export const ExecutiveAppointmentForm: React.FC = () => {
  const [form, setForm] = useState<AppointExecutivePayload>({
    executive_name: '',
    executive_title: 'CEO',
    start_date: dayjs().format('YYYY-MM-DD'),
    equity_percent: '',
    shares_issued: '',
    equity_type: 'Common Stock',
    vesting_schedule: '4 years, 1-year cliff; 25% after 12 months, remainder monthly over 36 months',
    strike_price: '$0.0001 per share',
    annual_salary: '90000',
    governing_law: 'Ohio',
    defer_salary: true,
    funding_trigger: '500000',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const uploadPdf = async (executiveName: string, docName: string, html: string) => {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '816px';
    tempDiv.style.background = '#ffffff';
    tempDiv.innerHTML = DOMPurify.sanitize(html);
    document.body.appendChild(tempDiv);

    const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    pdf.addImage(imgData, 'PNG', 0, 0, 612, 792);
    const blob = pdf.output('blob');

    const safeName = executiveName.replace(/[^a-z0-9-_]+/gi, '_');
    const fileName = `legal/generated/${safeName}/${docName}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('feeder-documents')
      .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw uploadError;
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const { data } = (await appointExecutive(form)) as any;
      const summary = data?.summary || data || {};

      // Prepare values for PDF builders
      const v = {
        executive_name: form.executive_name,
        executive_title: form.executive_title,
        start_date: form.start_date,
        equity_percent: form.equity_percent,
        shares_issued: form.shares_issued,
        equity_type: form.equity_type,
        vesting_schedule: form.vesting_schedule,
        strike_price: form.strike_price,
        annual_salary: form.annual_salary,
        governing_law: form.governing_law,
        salary_status: form.defer_salary ? 'deferred' : 'active',
        funding_trigger: form.defer_salary ? (form.funding_trigger || '500000') : '',
      };

      const eqOfferHtml = buildEquityOfferHtml(v);
      const boardHtml = buildBoardResolutionHtml(v);

      const uploaded: string[] = [];
      uploaded.push(await uploadPdf(v.executive_name, 'EquityOfferAgreement', eqOfferHtml));
      uploaded.push(await uploadPdf(v.executive_name, 'BoardResolution_OfficerAppointment', boardHtml));

      if (v.salary_status === 'deferred') {
        const defHtml = buildDeferredCompHtml(v);
        uploaded.push(await uploadPdf(v.executive_name, 'DeferredCompensationAgreement', defHtml));
      }

      setResult({ summary, uploaded });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to appoint executive');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Appoint C-Level Executive</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            <div>Name</div>
            <input name="executive_name" value={form.executive_name} onChange={onChange} required />
          </label>
          <label>
            <div>Title</div>
            <select name="executive_title" value={form.executive_title} onChange={onChange}>
              <option>CEO</option>
              <option>COO</option>
              <option>CFO</option>
              <option>CTO</option>
              <option>CXO</option>
              <option>CMO</option>
              <option>CRO</option>
              <option>CPO</option>
              <option>CDO</option>
              <option>CHRO</option>
              <option>CLO</option>
              <option>CSO</option>
              <option>Admin</option>
            </select>
          </label>
          <label>
            <div>Start Date</div>
            <input name="start_date" type="date" value={form.start_date} onChange={onChange} />
          </label>
          <label>
            <div>Equity Percent</div>
            <input name="equity_percent" value={form.equity_percent} onChange={onChange} placeholder="e.g. 2" />
          </label>
          <label>
            <div>Shares Issued</div>
            <input name="shares_issued" value={form.shares_issued} onChange={onChange} placeholder="e.g. 200000" />
          </label>
          <label>
            <div>Equity Type</div>
            <input name="equity_type" value={form.equity_type} onChange={onChange} />
          </label>
          <label>
            <div>Vesting Schedule</div>
            <input name="vesting_schedule" value={form.vesting_schedule} onChange={onChange} />
          </label>
          <label>
            <div>Strike Price</div>
            <input name="strike_price" value={form.strike_price} onChange={onChange} />
          </label>
          <label>
            <div>Annual Salary (USD)</div>
            <input name="annual_salary" value={form.annual_salary} onChange={onChange} />
          </label>
          <label>
            <div>Governing Law</div>
            <input name="governing_law" value={form.governing_law} onChange={onChange} />
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <input name="defer_salary" type="checkbox" checked={form.defer_salary} onChange={onChange} />
            <span>Defer Salary Until Funding?</span>
          </label>
          {form.defer_salary && (
            <label>
              <div>Funding Trigger (USD)</div>
              <input name="funding_trigger" value={form.funding_trigger} onChange={onChange} />
            </label>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={submitting}>{submitting ? 'Processing…' : 'Appoint Executive'}</button>
        </div>
      </form>

      {error && (
        <div style={{ color: 'red', marginTop: 12 }}>{error}</div>
      )}

      {result && (
        <div style={{ marginTop: 16, border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
          <div>✅ EXECUTIVE APPOINTMENT COMPLETE</div>
          <div><strong>Name:</strong> {form.executive_name}</div>
          <div><strong>Role:</strong> {form.executive_title}</div>
          <div><strong>Equity:</strong> {form.equity_percent}% ({form.shares_issued} shares)</div>
          <div><strong>Vesting:</strong> {form.vesting_schedule}</div>
          <div><strong>Salary:</strong> ${form.annual_salary}/year</div>
          <div><strong>Deferred:</strong> {form.defer_salary ? 'deferred' : 'active'}</div>
          <div style={{ marginTop: 8 }}>
            <div><strong>Documents Generated:</strong></div>
            <ul style={{ marginTop: 4 }}>
              <li>Equity Offer Agreement (PDF)</li>
              {form.defer_salary && <li>Deferred Compensation Agreement (PDF)</li>}
              <li>Board Resolution (PDF)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
