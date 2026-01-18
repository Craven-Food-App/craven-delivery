const n=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Pre-Incorporation Written Consent of Sole Incorporator</title>\r
<style>\r
body { font-family:"Times New Roman", serif; line-height:1.4; }\r
h1 { text-align:center; text-transform:uppercase; font-size:22px; margin-bottom:12px; }\r
h2 { font-size:16px; text-transform:uppercase; margin-top:28px; }\r
.signature-line { border-bottom:1px solid #000; height:24px; margin-top:24px; }\r
.bold { font-weight:bold; }\r
</style>\r
</head>\r
\r
<body>\r
\r
<h1>PRE-INCORPORATION WRITTEN CONSENT<br/>OF SOLE INCORPORATOR</h1>\r
<p style="text-align:center;"><strong>{{company_name}}</strong></p>\r
<p style="text-align:center;">A {{company_state}} Corporation (to be formed)</p>\r
\r
<p>\r
The undersigned, <strong>{{incorporator_name}}</strong>, being the sole incorporator of <strong>{{company_name}}</strong>, a {{company_state}} corporation to be formed (the "Corporation"), hereby executes this Pre-Incorporation Written Consent pursuant to Section 108 of the {{company_state}} General Corporation Law ("DGCL").\r
</p>\r
\r
<hr/>\r
\r
<h2>WHEREAS</h2>\r
<p>\r
WHEREAS, the undersigned intends to file a Certificate of Incorporation for the Corporation with the {{state_filing_office}} pursuant to DGCL §§102 and 103;\r
</p>\r
\r
<p>\r
WHEREAS, upon filing of the Certificate of Incorporation, the Corporation will be duly formed and the undersigned will become the sole incorporator;\r
</p>\r
\r
<p>\r
WHEREAS, pursuant to DGCL §108, the sole incorporator may, prior to the filing of the Certificate of Incorporation, execute a written consent appointing the initial director(s) and adopting initial bylaws, which actions shall become effective upon the filing of the Certificate of Incorporation;\r
</p>\r
\r
<hr/>\r
\r
<h2>NOW, THEREFORE, BE IT RESOLVED:</h2>\r
\r
<h2>1. APPOINTMENT OF INITIAL DIRECTOR</h2>\r
<p>\r
RESOLVED: That <strong>{{director_name}}</strong> is hereby appointed as the initial director of the Corporation, effective upon the filing of the Certificate of Incorporation with the {{state_filing_office}}.\r
</p>\r
\r
<h2>2. ADOPTION OF BYLAWS</h2>\r
<p>\r
RESOLVED: That the Bylaws presented to the incorporator and attached hereto as <em>Exhibit A</em> are hereby adopted as the initial Bylaws of the Corporation, effective upon the filing of the Certificate of Incorporation.\r
</p>\r
\r
<h2>3. CONDITIONAL EFFECTIVENESS</h2>\r
<p>\r
RESOLVED: That all actions taken in this Consent are conditional upon the filing of the Certificate of Incorporation and shall become effective only upon such filing. If the Certificate of Incorporation is not filed, this Consent shall have no effect.\r
</p>\r
\r
<h2>EXECUTION</h2>\r
<p>\r
IN WITNESS WHEREOF, the undersigned Sole Incorporator has executed this Pre-Incorporation Written Consent as of {{consent_date}}.\r
</p>\r
\r
<div class="signature-line"></div>\r
<p><strong>Sole Incorporator:</strong> {{incorporator_name}}</p>\r
<p><small>Email: {{incorporator_email}} | Address: {{incorporator_address}}</small></p>\r
\r
<!-- Signature Tag -->\r
<span data-sig="INCORPORATOR">{{SIGNATURE_INCORPORATOR}}</span>\r
\r
</body>\r
</html>\r
\r
`;export{n as default};
