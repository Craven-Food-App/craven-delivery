const r=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Initial Action of Sole Director</title>\r
<style>\r
body { font-family:"Times New Roman", serif; line-height:1.35; }\r
h1 { text-align:center; text-transform:uppercase; font-size:22px; margin-bottom:12px; }\r
h2 { font-size:16px; text-transform:uppercase; margin-top:28px; }\r
.table { width:100%; border-collapse:collapse; margin-top:12px; }\r
.table th, .table td { border:1px solid #000; padding:8px; vertical-align:top; }\r
.signature-line { border-bottom:1px solid #000; height:24px; margin-top:16px; }\r
.bold { font-weight:bold; }\r
</style>\r
</head>\r
<body>\r
\r
<h1>Initial Action of Sole Director<br/>of {{company_name}}</h1>\r
<p style="text-align:center;">A {{company_state}} Corporation</p>\r
\r
<p>\r
I, <strong>{{director_name}}</strong>, the sole member of the Board of Directors (the "Board") of \r
<strong>{{company_name}}</strong>, a {{company_state}} corporation (the "Corporation"), hereby adopt the following resolutions by \r
written consent pursuant to Section 141(f) of the {{company_state}} General Corporation Law ("DGCL"), in lieu of an organizational meeting.\r
</p>\r
\r
<hr/>\r
\r
<h2>WHEREAS</h2>\r
<p>The Certificate of Incorporation of the Corporation has been filed with the {{state_filing_office}}, and the Corporation is duly formed under DGCL §106–107;</p>\r
<p>WHEREAS, the sole incorporator has executed a Pre-Incorporation Written Consent pursuant to DGCL §108 appointing the undersigned as the initial director;</p>\r
<p>WHEREAS, it is necessary and appropriate for the Board to complete the organization of the Corporation, elect officers, authorize the issuance of shares, and adopt certain corporate actions in accordance with DGCL §§141, 142, and 152–154;</p>\r
\r
<hr/>\r
\r
<h2>1. ADOPTION OF BYLAWS</h2>\r
<p>\r
RESOLVED: That the Bylaws presented to the Board and attached hereto as <em>Exhibit A</em> are hereby adopted as the Bylaws of the Corporation pursuant to DGCL §109, and the Secretary of the Corporation is directed to insert the same in the Corporation's minute book.\r
</p>\r
\r
<h2>2. ELECTION OF OFFICERS (DGCL §142)</h2>\r
<p>\r
RESOLVED: That the following individual is hereby elected to the officer positions set forth below, to serve at the pleasure of the Board and until a successor is duly elected or appointed:\r
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
RESOLVED FURTHER: That the officers shall have the authority and duties prescribed by the Bylaws and DGCL §142.\r
</p>\r
\r
<h2>3. AUTHORIZATION OF CAPITALIZATION & ISSUANCE OF SHARES (DGCL §§152–154)</h2>\r
<p>\r
RESOLVED: That the Corporation is authorized to issue Ten Million (10,000,000) shares of Common Stock, par value $0.0001 per share, as set forth in the Certificate of Incorporation.\r
</p>\r
\r
<p>\r
RESOLVED FURTHER: That the following issuances are hereby authorized as full and final founding issuances:\r
</p>\r
\r
<table class="table">\r
<tr><th>Shareholder</th><th>Shares Issued</th><th>Ownership %</th><th>Consideration</th><th>Notes</th></tr>\r
<tr>\r
<td>Invero Business Trust (Irrevocable Trust)</td>\r
<td>6,000,000</td>\r
<td>60%</td>\r
<td>Full founder consideration</td>\r
<td>Majority shareholder</td>\r
</tr>\r
<tr>\r
<td>{{founder_name}}</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>Founder labor, IP, and services</td>\r
<td>Founder and initial director</td>\r
</tr>\r
<tr>\r
<td>Unissued (Equity Pool)</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>N/A</td>\r
<td>Reserved for future grants</td>\r
</tr>\r
</table>\r
\r
<p>\r
RESOLVED FURTHER: That the Board hereby determines that the consideration received for such shares is adequate, that such issuances comply with DGCL §152, and that the shares shall be deemed fully paid and nonassessable pursuant to DGCL §153.\r
</p>\r
\r
<h2>4. BANKING AUTHORITY</h2>\r
<p>\r
RESOLVED: That the officers of the Corporation are authorized to open and maintain bank accounts in the name of the Corporation, and to execute agreements with financial institutions on behalf of the Corporation.\r
</p>\r
\r
<h2>5. ORGANIZATIONAL ACTIONS</h2>\r
<p>\r
RESOLVED: That the officers of the Corporation are authorized and directed to undertake all actions necessary to complete the organization of the Corporation, including but not limited to:\r
</p>\r
<ul>\r
<li>Obtaining an Employer Identification Number ("EIN") from the IRS;</li>\r
<li>Preparing and issuing stock certificates and maintaining the stock ledger;</li>\r
<li>Executing any agreements necessary for the operation of the Corporation;</li>\r
<li>Maintaining the corporate minute book and records in accordance with DGCL §224.</li>\r
</ul>\r
\r
<h2>6. RATIFICATION OF PRIOR ACTIONS</h2>\r
<p>\r
RESOLVED: That any actions taken prior to this consent by the incorporator or the director relating to the formation or organization of the Corporation are hereby ratified, approved, and adopted as corporate acts.\r
</p>\r
\r
<h2>EXECUTION</h2>\r
<p>IN WITNESS WHEREOF, the undersigned Sole Director has executed this Initial Action as of {{director_consent_date}}.</p>\r
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
`;export{r as default};
