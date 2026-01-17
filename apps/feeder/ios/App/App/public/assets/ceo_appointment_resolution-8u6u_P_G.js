const e=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Board Resolution Appointing Chief Executive Officer</title>\r
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
<h1>BOARD RESOLUTION<br/>APPOINTING CHIEF EXECUTIVE OFFICER</h1>\r
<p style="text-align:center;"><strong>{{company_name}}</strong></p>\r
<p style="text-align:center;">A {{company_state}} Corporation</p>\r
\r
<p>\r
The undersigned, <strong>{{director_name}}</strong> (the "Director"), being the sole member of the Board of Directors (the "Board") of \r
<strong>{{company_name}}</strong> (the "Corporation"), hereby adopts the following resolutions pursuant to Section 141(f) of the {{company_state}} General Corporation Law ("DGCL") by unanimous written consent in lieu of a meeting.\r
</p>\r
\r
<hr/>\r
\r
<h2>WHEREAS</h2>\r
\r
<p>\r
WHEREAS, the Corporation has been duly incorporated under the laws of the State of {{company_state}} and the Certificate of Incorporation has been filed pursuant to DGCL §103;\r
</p>\r
\r
<p>\r
WHEREAS, the Board has authority under DGCL §142(a) and the Bylaws of the Corporation to elect and appoint officers, including the Chief Executive Officer ("CEO");\r
</p>\r
\r
<p>\r
WHEREAS, it is in the best interests of the Corporation to appoint an individual to serve as CEO with broad executive authority to manage the business and affairs of the Corporation under the supervision of the Board pursuant to DGCL §141(a);\r
</p>\r
\r
<hr/>\r
\r
<h2>NOW, THEREFORE, BE IT RESOLVED:</h2>\r
\r
<h2>1. APPOINTMENT OF CHIEF EXECUTIVE OFFICER (DGCL §142)</h2>\r
<p>\r
RESOLVED: That <strong>{{executive_name}}</strong> is hereby appointed to serve as the Chief Executive Officer ("CEO") of the Corporation, effective as of {{effective_date}}, to hold office at the pleasure of the Board and subject to the duties, authority, and responsibilities prescribed by the Bylaws and applicable law.\r
</p>\r
\r
<h2>2. CEO AUTHORITY & EXECUTIVE POWERS</h2>\r
<p>\r
RESOLVED: That the CEO shall have the broad and general executive authority to:\r
</p>\r
\r
<ul>\r
<li>supervise, manage, and direct the business and operations of the Corporation;</li>\r
<li>execute and deliver contracts, agreements, instruments, and filings on behalf of the Corporation;</li>\r
<li>approve operational, financial, and administrative actions;</li>\r
<li>hire, supervise, and terminate employees, executives, and contractors;</li>\r
<li>manage corporate strategy, budgeting, fundraising, and financial planning;</li>\r
<li>represent the Corporation in legal, governmental, banking, and business matters;</li>\r
<li>exercise any powers typically held by a Chief Executive Officer in a Delaware corporation;</li>\r
<li>and perform all duties customary to the office of CEO unless otherwise limited by resolution of the Board.</li>\r
</ul>\r
\r
<p>\r
The foregoing authority is granted pursuant to DGCL §142(a) and §141(a).\r
</p>\r
\r
<h2>3. AUTHORITY TO EXECUTE DOCUMENTS</h2>\r
<p>\r
RESOLVED: That the CEO is authorized to execute and deliver any and all agreements, instruments, certificates, and documents necessary or convenient to carry out the duties of the office, including but not limited to:\r
</p>\r
\r
<ul>\r
<li>banking documents and resolutions,</li>\r
<li>regulatory filings,</li>\r
<li>equity and fundraising agreements,</li>\r
<li>commercial contracts,</li>\r
<li>employment and contractor agreements,</li>\r
<li>NDA and IP assignment agreements,</li>\r
<li>and any other lawful corporate acts.</li>\r
</ul>\r
\r
<h2>4. CEO AS AUTHORIZED SIGNATORY</h2>\r
<p>\r
RESOLVED: That the CEO shall serve as an authorized signatory of the Corporation for all matters requiring executive approval, unless otherwise designated by the Board.\r
</p>\r
\r
<h2>5. COMPENSATION</h2>\r
<p>\r
RESOLVED: That the CEO's compensation, salary-activation triggers, equity terms, and any vesting arrangements shall be set forth in a separate Executive Employment Agreement approved by the Board.\r
</p>\r
\r
<h2>6. RATIFICATION OF PRIOR ACTS</h2>\r
<p>\r
RESOLVED: That any actions taken by {{executive_name}} prior to the adoption of this Resolution in furtherance of organizing or operating the Corporation are hereby ratified and approved as valid corporate acts pursuant to DGCL §141(f).\r
</p>\r
\r
<h2>EXECUTION</h2>\r
<p>\r
IN WITNESS WHEREOF, the undersigned Sole Director has executed this Chief Executive Officer Appointment Resolution as of {{resolution_date}}.\r
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
<h2>CEO ACCEPTANCE (DGCL §142(b))</h2>\r
<p>\r
I, <strong>{{executive_name}}</strong>, hereby accept appointment as Chief Executive Officer of {{company_name}}, effective as of {{effective_date}}.\r
</p>\r
\r
<div class="signature-line"></div>\r
<p><strong>Chief Executive Officer:</strong> {{executive_name}}</p>\r
\r
<!-- Signature Tag -->\r
<span data-sig="CEO">{{SIGNATURE_CEO}}</span>\r
\r
</body>\r
</html>\r
\r
`;export{e as default};
