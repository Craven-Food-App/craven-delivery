const e=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Registered Agent & Registered Office Resolution</title>\r
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
<h1>BOARD RESOLUTION<br/>REGISTERED AGENT & REGISTERED OFFICE</h1>\r
<p style="text-align:center;"><strong>{{company_name}}</strong></p>\r
<p style="text-align:center;">A {{company_state}} Corporation</p>\r
\r
<p>\r
The undersigned, <strong>{{director_name}}</strong>, being the sole member of the Board of Directors (the "Board") of \r
<strong>{{company_name}}</strong> (the "Corporation"), hereby adopts the following resolutions pursuant to Section 141(f) of the {{company_state}} General Corporation Law ("DGCL") and DGCL §132.\r
</p>\r
\r
<hr/>\r
\r
<h2>WHEREAS</h2>\r
<p>\r
WHEREAS, DGCL §132 requires every Delaware corporation to maintain a registered agent and registered office in the State of Delaware;\r
</p>\r
\r
<p>\r
WHEREAS, the Corporation desires to designate a registered agent and registered office for service of process and official communications;\r
</p>\r
\r
<hr/>\r
\r
<h2>NOW, THEREFORE, BE IT RESOLVED:</h2>\r
\r
<h2>1. DESIGNATION OF REGISTERED AGENT</h2>\r
<p>\r
RESOLVED: That <strong>{{registered_agent_name}}</strong> is hereby designated as the registered agent of the Corporation for service of process and official communications, effective as of {{resolution_date}}.\r
</p>\r
\r
<h2>2. DESIGNATION OF REGISTERED OFFICE</h2>\r
<p>\r
RESOLVED: That the registered office of the Corporation in the State of {{company_state}} is hereby designated as:\r
</p>\r
\r
<p>\r
<strong>{{registered_agent_address}}</strong>\r
</p>\r
\r
<h2>3. AUTHORITY TO CHANGE REGISTERED AGENT</h2>\r
<p>\r
RESOLVED: That the Secretary of the Corporation is authorized to file any necessary documents with the {{state_filing_office}} to effectuate this designation and to change the registered agent or registered office in the future as may be necessary or desirable.\r
</p>\r
\r
<h2>EXECUTION</h2>\r
<p>\r
IN WITNESS WHEREOF, the undersigned Sole Director has executed this Registered Agent Resolution as of {{resolution_date}}.\r
</p>\r
\r
<div class="signature-line"></div>\r
<p><strong>Sole Director:</strong> {{director_name}}</p>\r
<p><small>Email: {{director_email}} | Address: {{director_address}}</small></p>\r
\r
<!-- Signature Tag -->\r
<span data-sig="DIRECTOR">{{SIGNATURE_DIRECTOR}}</span>\r
\r
</body>\r
</html>\r
\r
`;export{e as default};
