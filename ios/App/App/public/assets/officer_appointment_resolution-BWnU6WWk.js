const r=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Officer Appointment Resolution</title>\r
<style>\r
body { font-family:"Times New Roman", serif; line-height:1.4; }\r
h1 { text-align:center; text-transform:uppercase; font-size:22px; margin-bottom:12px; }\r
h2 { font-size:16px; text-transform:uppercase; margin-top:28px; }\r
.table { width:100%; border-collapse:collapse; margin-top:12px; }\r
.table th, .table td { border:1px solid #000; padding:8px; vertical-align:top; }\r
.signature-line { border-bottom:1px solid #000; height:24px; margin-top:24px; }\r
.bold { font-weight:bold; }\r
</style>\r
</head>\r
\r
<body>\r
\r
<h1>BOARD RESOLUTION<br/>APPOINTING CORPORATE OFFICERS</h1>\r
<p style="text-align:center;"><strong>{{company_name}}</strong></p>\r
<p style="text-align:center;">A {{company_state}} Corporation</p>\r
\r
<p>\r
The undersigned, <strong>{{director_name}}</strong>, being the sole member of the Board of Directors (the "Board") of \r
<strong>{{company_name}}</strong> (the "Corporation"), acts pursuant to Section 141(f) of the {{company_state}} General Corporation Law ("DGCL") \r
to take the following actions by written consent in lieu of a meeting:\r
</p>\r
\r
<hr/>\r
\r
<h2>WHEREAS</h2>\r
<p>\r
WHEREAS, the Certificate of Incorporation of the Corporation has been duly filed with the {{state_filing_office}} pursuant to DGCL §§102–103, and the Corporation has been duly formed;\r
</p>\r
\r
<p>\r
WHEREAS, the Sole Incorporator has appointed the undersigned as the initial director pursuant to DGCL §108, and the Board has duly adopted the Corporation's Bylaws pursuant to DGCL §109;\r
</p>\r
\r
<p>\r
WHEREAS, the Corporation requires the appointment of officers to act on behalf of the Corporation pursuant to DGCL §142(a), and it is in the best interests of the Corporation to appoint such officers;\r
</p>\r
\r
<hr/>\r
\r
<h2>NOW, THEREFORE, BE IT RESOLVED THAT:</h2>\r
\r
<h2>1. APPOINTMENT OF OFFICERS (DGCL §142)</h2>\r
<p>\r
RESOLVED: That the following individual is hereby appointed to the officer positions set forth below, to serve at the pleasure of the Board, with such duties and authority as prescribed by the Bylaws, the DGCL, and customary corporate practice:\r
</p>\r
\r
<table class="table">\r
<tr><th>Officer Name</th><th>Officer Titles</th><th>Email</th></tr>\r
<tr>\r
<td>{{officer_name}}</td>\r
<td>\r
Chief Executive Officer (CEO)<br/>\r
Secretary<br/>\r
Treasurer<br/>\r
Chief Operating Officer (Acting)\r
</td>\r
<td>{{officer_email}}</td>\r
</tr>\r
</table>\r
\r
<p>\r
RESOLVED FURTHER: That the CEO shall have the full executive authority to manage the business and affairs of the Corporation, \r
including but not limited to strategic planning, financial oversight, operational supervision, contract execution, and \r
representation of the Corporation in all lawful matters, subject only to Board oversight pursuant to DGCL §141(a).\r
</p>\r
\r
<h2>2. AUTHORIZATION TO EXECUTE DOCUMENTS</h2>\r
<p>\r
RESOLVED: That the CEO and Secretary are authorized to execute, acknowledge, verify, and deliver any and all instruments, \r
resolutions, certificates, agreements, and filings necessary to carry out the business and affairs of the Corporation, including \r
but not limited to contracts, banking documents, regulatory filings, and equity-related instruments.\r
</p>\r
\r
<h2>3. BANKING & FINANCIAL AUTHORITY</h2>\r
<p>\r
RESOLVED: That the Treasurer (and Acting COO where operationally applicable) is authorized to:\r
</p>\r
<ul>\r
<li>open and maintain bank accounts in the name of the Corporation;</li>\r
<li>deposit and withdraw funds;</li>\r
<li>execute banking resolutions and agreements;</li>\r
<li>oversee internal financial controls and reporting;</li>\r
<li>approve day-to-day operational expenditures;</li>\r
<li>and act as the primary financial officer until a CFO is appointed.</li>\r
</ul>\r
\r
<h2>4. RATIFICATION OF PRIOR ACTS</h2>\r
<p>\r
RESOLVED: That any actions taken prior to the adoption of this Resolution by the officer named herein in furtherance of the \r
organization or business of the Corporation are hereby approved, ratified, and confirmed as valid corporate acts pursuant to DGCL §141(f).\r
</p>\r
\r
<h2>EXECUTION</h2>\r
<p>\r
IN WITNESS WHEREOF, the undersigned Sole Director has executed this Officer Appointment Resolution as of {{resolution_date}}, \r
and the Secretary is directed to file this Resolution in the Corporation's minute book pursuant to DGCL §142(b).\r
</p>\r
\r
<div class="signature-line"></div>\r
<p><strong>Sole Director:</strong> {{director_name}}</p>\r
<p><small>Email: {{director_email}} | Address: {{director_address}}</small></p>\r
\r
<!-- Signature Tag -->\r
<span data-sig="DIRECTOR">{{SIGNATURE_DIRECTOR}}</span>\r
\r
<hr/>\r
\r
<h2>OFFICER ACCEPTANCE (DGCL §142(b))</h2>\r
<p>\r
I, <strong>{{officer_name}}</strong>, hereby accept appointment to the offices of Chief Executive Officer, Secretary, Treasurer, \r
and Acting Chief Operating Officer of {{company_name}}, effective as of {{resolution_date}}.\r
</p>\r
\r
<div class="signature-line"></div>\r
<p><strong>Officer:</strong> {{officer_name}}</p>\r
\r
<!-- Signature Tag -->\r
<span data-sig="OFFICER">{{SIGNATURE_OFFICER}}</span>\r
\r
</body>\r
</html>\r
\r
`;export{r as default};
