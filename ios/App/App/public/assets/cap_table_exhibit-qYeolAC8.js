const t=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Exhibit C — Capitalization Table</title>\r
<style>\r
body { font-family:"Times New Roman", serif; line-height:1.35; }\r
h1 { text-transform:uppercase; text-align:center; font-size:22px; margin-bottom:12px; }\r
h2 { font-size:16px; text-transform:uppercase; margin-top:28px; }\r
.table { width:100%; border-collapse:collapse; margin-top:14px; }\r
.table th, .table td { border:1px solid #000; padding:8px; vertical-align:top; }\r
.bold { font-weight:bold; }\r
.center { text-align:center; }\r
.spacer { height:28px; }\r
.signature-line { border-bottom:1px solid #000; height:24px; margin-top:24px; }\r
</style>\r
</head>\r
\r
<body>\r
\r
<h1>Exhibit C<br/>Capitalization Table</h1>\r
<p class="center"><strong>{{company_name}}</strong></p>\r
<p class="center">A {{company_state}} Corporation</p>\r
\r
<p>\r
This Capitalization Table ("Cap Table") reflects the authorized, issued, outstanding, and reserved shares of \r
<strong>{{company_name}}</strong> (the "Corporation"), as adopted by the Board of Directors pursuant to DGCL §§102(a)(4), 151, 152–154, and 224.\r
</p>\r
\r
<h2>1. AUTHORIZED CAPITALIZATION</h2>\r
<table class="table">\r
<tr><th>Description</th><th>Amount</th><th>Par Value</th><th>DGCL Basis</th></tr>\r
<tr>\r
<td>Authorized Shares</td>\r
<td>10,000,000</td>\r
<td>$0.0001 per share</td>\r
<td>DGCL §102(a)(4)</td>\r
</tr>\r
<tr>\r
<td>Class</td>\r
<td>Common Stock</td>\r
<td>—</td>\r
<td>DGCL §§151–153</td>\r
</tr>\r
</table>\r
\r
<h2>2. ISSUED & OUTSTANDING SHARES</h2>\r
<table class="table">\r
<tr><th>Shareholder</th><th>Shares Issued</th><th>% Ownership</th><th>Consideration</th><th>Notes</th></tr>\r
\r
<tr>\r
<td>Invero Business Trust (Irrevocable Trust)</td>\r
<td>6,000,000</td>\r
<td>60%</td>\r
<td>Founder trust contribution; governance rights</td>\r
<td>Majority shareholder</td>\r
</tr>\r
\r
<tr>\r
<td>{{founder_name}}</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>Founder intellectual property, labor, and pre-incorporation services</td>\r
<td>Founder / Officer / Director</td>\r
</tr>\r
\r
<tr>\r
<td><em>Total Issued & Outstanding</em></td>\r
<td><strong>8,000,000</strong></td>\r
<td><strong>80%</strong></td>\r
<td>—</td>\r
<td>Fully paid & nonassessable (DGCL §153)</td>\r
</tr>\r
</table>\r
\r
<h2>3. UNISSUED SHARES</h2>\r
<table class="table">\r
<tr><th>Description</th><th>Shares</th><th>% of Total Auth.</th><th>Notes</th></tr>\r
\r
<tr>\r
<td>Equity Incentive Pool (Unissued)</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>Reserved for future grants; requires Board approval</td>\r
</tr>\r
\r
<tr>\r
<td><em>Total Unissued</em></td>\r
<td><strong>2,000,000</strong></td>\r
<td><strong>20%</strong></td>\r
<td>—</td>\r
</tr>\r
</table>\r
\r
<h2>4. SUMMARY CHART</h2>\r
<table class="table">\r
<tr><th>Category</th><th>Shares</th><th>% of Authorized</th></tr>\r
\r
<tr>\r
<td><strong>Authorized Shares</strong></td>\r
<td>10,000,000</td>\r
<td>100%</td>\r
</tr>\r
\r
<tr>\r
<td><strong>Issued & Outstanding</strong></td>\r
<td>8,000,000</td>\r
<td>80%</td>\r
</tr>\r
\r
<tr>\r
<td><strong>Unissued (Equity Pool)</strong></td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
</tr>\r
</table>\r
\r
<h2>5. LEGAL STATUS OF SHARES</h2>\r
<p>\r
Pursuant to DGCL §§152–154, the Board has determined that the consideration received for the issued shares is \r
adequate and that all issued shares are fully paid and nonassessable.  \r
All shares shall be recorded in the Corporation's official stock ledger under DGCL §224.\r
</p>\r
\r
<h2>6. CERTIFICATION</h2>\r
<p>\r
I, <strong>{{officer_name}}</strong>, Secretary of the Corporation, hereby certify that this Capitalization Table is \r
a true, complete, and correct depiction of the capital structure of {{company_name}}, as adopted by the Board on {{cap_table_date}}, and maintained in the Corporation's minute book.\r
</p>\r
\r
<div class="signature-line"></div>\r
<p><strong>Secretary:</strong> {{officer_name}}</p>\r
\r
<!-- Signature Tag -->\r
<span data-sig="SECRETARY">{{SIGNATURE_SECRETARY}}</span>\r
\r
</body>\r
</html>\r
\r
`;export{t as default};
