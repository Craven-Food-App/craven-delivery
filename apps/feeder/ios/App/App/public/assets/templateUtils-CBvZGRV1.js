import{a2 as m}from"./index-GxiEldis.js";const f=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),_=(e,l)=>{const t=Object.entries(l).filter(([,a])=>a!=null&&a!=="").map(([a,i])=>`
        <tr>
          <td style="padding: 6px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600;">
            ${f(a)}
          </td>
          <td style="padding: 6px 12px; border: 1px solid #e2e8f0;">
            ${f(String(i))}
          </td>
        </tr>
      `).join("");return`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${f(e)}</title>
        <style>
          @media print {
            body { font-family: "Times New Roman", serif; background: #fff; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 6px 10px; }
            h1, h2, h3 { margin: 0 0 8px; }
          }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 32px; background: #ffffff; color: #0f172a;">
        <header style="margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 26px; color: #0f172a;">${f(e.replace(/_/g," "))}</h1>
          <p style="margin: 8px 0 0; color: #475569; font-size: 14px;">
            This document uses the default fallback template because a customized template was not found or is incomplete.
          </p>
        </header>

        <section>
          <table style="border-collapse: collapse; width: 100%; max-width: 760px;">
            <tbody>
              ${t||'<tr><td style="padding:12px; border:1px solid #e2e8f0;">No data available.</td></tr>'}
            </tbody>
          </table>
        </section>

        <footer style="margin-top: 40px; color: #64748b; font-size: 12px; text-align: center;">
          <p style="margin: 0;">Generated automatically by Crave'N Executive Document System</p>
        </footer>
      </body>
    </html>
  `};async function b(e,l){try{if(l){const{data:i}=await m.from("template_usage").select("template_id").eq("template_type","document").eq("usage_context",l).eq("is_default",!0).single();if(i?.template_id){const{data:c}=await m.from("document_templates").select("html_content, placeholders").eq("id",i.template_id).eq("is_active",!0).single();if(c)return{html_content:c.html_content,placeholders:Array.isArray(c.placeholders)?c.placeholders.map(r=>String(r)):[]}}}const{data:t,error:a}=await m.from("document_templates").select("html_content, placeholders, is_active").eq("template_key",e).single();if(a)throw console.error(`Error fetching template ${e}:`,a),new Error(`Failed to fetch template: ${a.message}`);if(t)return t.is_active||(console.warn(`Template ${e} exists but is not active - activating it`),await m.from("document_templates").update({is_active:!0}).eq("template_key",e)),{html_content:t.html_content,placeholders:Array.isArray(t.placeholders)?t.placeholders.map(i=>String(i)):[]}}catch(t){if(console.error(`Error fetching template ${e}:`,t),t.message&&t.message.includes("Failed to fetch"))throw t;console.warn(`Template not found in database for ${e}`)}return null}function y(e){return!e||e.trim().length<50?!0:[/<!--\s*Template will be loaded/i,/<!--\s*placeholder/i,/<!--\s*edit this template/i,/placeholder content/i,/^<!--[\s\S]*?-->$/m].some(t=>t.test(e))}function w(e,l){const a={employment_agreement:["Duties","Equity","Compensation","Confidentiality","At-Will","Restrictive","Dispute Resolution"],board_resolution:["WHEREAS","RESOLVED","Board Resolution"],pre_incorporation_consent:["Pre-Incorporation","Incorporator","Articles of Incorporation","RESOLVED","Effective Time"],stock_issuance:["Stock Subscription","share","purchase"],offer_letter:["offer","position","salary","equity"]}[e];return a?a.filter(c=>l.toLowerCase().includes(c.toLowerCase())).length>=Math.ceil(a.length*.5):!0}async function E(e,l,t){const a=_(e,l),i=await b(e,t);if(!i)return console.warn(`Document template '${e}' not found in database. Using fallback HTML.`),a;if(y(i.html_content))return console.warn(`Document template '${e}' exists but appears to be a placeholder. Using fallback HTML.`),a;w(e,i.html_content)||console.warn(`Database template for ${e} appears to be simplified or incorrect. Please verify the template content in Template Manager.`);let c=i.html_content;const r={};Object.keys(l).forEach(s=>{r[s]=String(l[s]||"")});const d={full_name:["executive_name","name","officer_name","employee_name","recipient_name","subscriber_name","counterparty_name"],company_name:["company","corporation"],role:["position","title","position_title","executive_title"],effective_date:["date","appointment_date","grant_date","offer_date","start_date"],equity_percentage:["equity_percent","ownership_percent","equity"],share_count:["shares_issued","shares_total","shares"],price_per_share:["strike_price","share_price"],annual_salary:["annual_base_salary","base_salary","salary"],funding_trigger:["funding_trigger_amount","deferral_trigger"],vesting_schedule:["vesting_terms","vesting"],governing_law:["governing_law_state","state_of_incorporation"]};Object.keys(d).forEach(s=>{r[s]&&d[s].forEach(p=>{r[p]||(r[p]=r[s])})}),Object.keys(d).forEach(s=>{d[s].forEach(p=>{r[p]&&!r[s]&&(r[s]=r[p])})});for(let s=0;s<3;s++)Object.keys(r).forEach(p=>{const n=r[p],o=p.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");[{pattern:new RegExp(`\\{\\{${o}\\}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\{\\{\\s*${o}\\s*\\}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\{${o}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\{\\s*${o}\\s*\\}`,"gi"),replace:n},{pattern:new RegExp(`\\$\\{${o}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\$\\{\\s*${o}\\s*\\}`,"gi"),replace:n},{pattern:new RegExp(`\\$\\{data\\.${o}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\$\\{data\\[['"]${o}['"]\\]\\}`,"gi"),replace:n},{pattern:new RegExp(`\\[${o}\\]`,"gi"),replace:n},{pattern:new RegExp(`\\[\\s*${o}\\s*\\]`,"gi"),replace:n},{pattern:new RegExp(`\\{\\{${o.toLowerCase()}\\}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\{\\{${o.toUpperCase()}\\}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\$\\{${o.toLowerCase()}\\}`,"gi"),replace:n},{pattern:new RegExp(`\\$\\{${o.toUpperCase()}\\}`,"gi"),replace:n}].forEach(({pattern:u,replace:h})=>{c=c.replace(u,h)})});const g=c.match(/\{\{[\w\s]+\}\}/g)||[];return g.length>0&&(console.warn(`Template ${e} has ${g.length} unmatched placeholders:`,g.slice(0,10)),console.warn("Available data keys:",Object.keys(r).slice(0,20))),c||a}export{E as r};
