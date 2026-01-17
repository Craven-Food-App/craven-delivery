const n=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Corporate Banking Resolution</title>\r
<style>\r
body { font-family:"Times New Roman", serif; line-height:1.4; }\r
h1 { text-align:center; font-size:22px; text-transform:uppercase; margin-bottom:14px; }\r
h2 { font-size:16px; text-transform:uppercase; margin-top:28px; }\r
p { margin:10px 0; }\r
.table { width:100%; border-collapse:collapse; margin-top:14px; }\r
.table th, .table td { border:1px solid #000; padding:8px; vertical-align:top; }\r
.signature-line { border-bottom:1px solid #000; height:24px; margin-top:24px; }\r
.center { text-align:center; }\r
.bold { font-weight:bold; }\r
</style>\r
</head>\r
\r
<body>\r
\r
<h1>CORPORATE BANKING RESOLUTION</h1>\r
<p class="center"><strong>{{company_name}}</strong></p>\r
<p class="center">A {{company_state}} Corporation</p>\r
\r
<p>\r
The undersigned, <strong>{{director_name}}</strong>, being the sole member of the Board of Directors (the "Board") of \r
<strong>{{company_name}}</strong> (the "Corporation"), hereby adopts the following resolutions pursuant to Section 141(f) of the {{company_state}} General Corporation Law ("DGCL").\r
</p>\r
\r
<hr/>\r
\r
<h2>WHEREAS</h2>\r
\r
<p>\r
WHEREAS, the Corporation requires one or more banking relationships for the deposit, safekeeping, and disbursement of funds and for conducting the financial affairs of the Corporation;\r
</p>\r
\r
<p>\r
WHEREAS, the Board has the authority under DGCL §141(a) to manage the business and affairs of the Corporation, including authorization of banking powers;\r
</p>\r
\r
<p>\r
WHEREAS, the Board desires to designate certain officers of the Corporation as authorized signatories for all banking matters;\r
</p>\r
\r
<hr/>\r
\r
<h2>NOW, THEREFORE, BE IT RESOLVED THAT:</h2>\r
\r
<h2>1. AUTHORIZATION TO OPEN BANK ACCOUNTS</h2>\r
<p>\r
RESOLVED: That the Chief Executive Officer ("CEO"), <strong>{{officer_name}}</strong>, is hereby authorized to open, maintain, modify, and close one or more bank accounts in the name of the Corporation with any financial institution, including but not limited to:\r
</p>\r
\r
<ul>\r
<li>Chase</li>\r
<li>Wells Fargo</li>\r
<li>Bank of America</li>\r
<li>PNC</li>\r
<li>Citibank</li>\r
<li>Bluevine</li>\r
<li>Relay</li>\r
<li>Mercury</li>\r
<li>or any other FDIC-insured institution</li>\r
</ul>\r
\r
<h2>2. AUTHORIZED SIGNATORY OFFICERS</h2>\r
\r
<p>\r
RESOLVED: That the following officer is designated as an authorized signatory with full authority over all accounts:\r
</p>\r
\r
<table class="table">\r
<tr><th>Officer Name</th><th>Titles</th><th>Email</th><th>Authority Level</th></tr>\r
\r
<tr>\r
<td>{{officer_name}}</td>\r
<td>\r
Chief Executive Officer (CEO)<br/>\r
Secretary<br/>\r
Treasurer<br/>\r
Chief Operating Officer (Acting)\r
</td>\r
<td>{{officer_email}}</td>\r
<td><strong>Full banking authority</strong></td>\r
</tr>\r
</table>\r
\r
<h2>3. BANKING POWERS GRANTED</h2>\r
<p>\r
RESOLVED: That the above-named officer is authorized to exercise the following powers on behalf of the Corporation:\r
</p>\r
\r
<ul>\r
<li>Open, maintain, or close any bank account</li>\r
<li>Endorse checks, drafts, and other instruments</li>\r
<li>Deposit funds into any account of the Corporation</li>\r
<li>Withdraw funds and issue checks or payments</li>\r
<li>Initiate ACH transfers, wires, and electronic payments</li>\r
<li>Obtain debit cards, corporate cards, and payment instruments</li>\r
<li>Enter into banking agreements and merchant service arrangements</li>\r
<li>Execute account resolutions, signature cards, and certifications</li>\r
<li>Authorize online banking access and manage credentials</li>\r
<li>Approve or revoke user access to corporate bank accounts</li>\r
</ul>\r
\r
<h2>4. CERTIFICATION TO FINANCIAL INSTITUTIONS</h2>\r
\r
<p>\r
RESOLVED: That any bank may rely on this Resolution until written notice of its amendment or revocation is delivered, and the bank shall not be held liable for actions taken in good faith reliance hereon.\r
</p>\r
\r
<h2>5. RATIFICATION OF PRIOR ACTS</h2>\r
<p>\r
RESOLVED: That any actions taken by the CEO prior to this Resolution in establishing or maintaining banking relationships are hereby ratified and approved pursuant to DGCL §141(f).\r
</p>\r
\r
<h2>EXECUTION</h2>\r
<p>\r
IN WITNESS WHEREOF, the undersigned Sole Director has executed this Corporate Banking Resolution as of {{resolution_date}}.\r
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
<h2>SECRETARY CERTIFICATION</h2>\r
\r
<p>\r
I, <strong>{{officer_name}}</strong>, Secretary of the Corporation, hereby certify that the foregoing is a true, correct, and complete copy of the \r
Corporate Banking Resolution adopted by the Board of Directors, and that said Resolution has not been amended, modified, or rescinded and\r
is in full force and effect.\r
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
`;export{n as default};
