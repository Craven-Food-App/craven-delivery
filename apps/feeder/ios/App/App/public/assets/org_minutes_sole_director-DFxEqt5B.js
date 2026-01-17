const r=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Organizational Minutes of Sole Director</title>\r
<style>\r
body { font-family:"Times New Roman", serif; line-height:1.4; }\r
h1 { text-align:center; text-transform:uppercase; font-size:22px; margin-bottom:12px; }\r
h2 { text-transform:uppercase; font-size:16px; margin-top:28px; }\r
.table { width:100%; border-collapse:collapse; margin-top:12px; }\r
.table th, .table td { border:1px solid #000; padding:8px; vertical-align:top; }\r
.signature-line { border-bottom:1px solid #000; height:24px; margin-top:24px; }\r
.bold { font-weight:bold; }\r
</style>\r
</head>\r
\r
<body>\r
\r
<h1>Organizational Minutes<br/>of the Sole Director</h1>\r
<p style="text-align:center;"><strong>{{company_name}}</strong></p>\r
<p style="text-align:center;">A {{company_state}} Corporation</p>\r
\r
<p>\r
These Organizational Minutes (the "Minutes") of the Sole Director of <strong>{{company_name}}</strong>, a {{company_state}} corporation (the "Corporation"), are entered into pursuant to the authority granted under the {{company_state}} General Corporation Law ("DGCL"), including but not limited to DGCL §§108, 109, 141, and 142.\r
</p>\r
\r
<p>\r
The undersigned, <strong>{{director_name}}</strong>, being the sole member of the Board of Directors (the "Board"), hereby certifies the following proceedings as the official organizational actions of the Corporation.\r
</p>\r
\r
<hr/>\r
\r
<h2>1. CERTIFICATE OF INCORPORATION</h2>\r
<p>\r
The Director noted that the Certificate of Incorporation of the Corporation had been duly filed with the {{state_filing_office}} pursuant to DGCL §§102 and 103, thereby forming the Corporation as a legal entity under the laws of the State of {{company_state}}.\r
</p>\r
\r
<h2>2. ADOPTION OF BYLAWS</h2>\r
<p>\r
RESOLVED: That the Bylaws presented to the Board and attached hereto as <em>Exhibit A</em> are hereby adopted as the Bylaws of the Corporation in accordance with DGCL §109.\r
</p>\r
\r
<h2>3. ELECTION OF OFFICERS (DGCL §142)</h2>\r
<p>\r
The Director elected the following individual to serve as officers of the Corporation, to have the authority and perform the duties commonly associated with their respective offices and as described in the Bylaws:\r
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
The above-named officer accepted the office and shall serve until a successor is elected and qualified or until earlier resignation or removal, pursuant to DGCL §142(b).\r
</p>\r
\r
<h2>4. ESTABLISHMENT OF CAPITALIZATION (DGCL §§152–154)</h2>\r
<p>\r
The Director reviewed the capitalization provisions of the Certificate of Incorporation, which authorize the issuance of up to Ten Million (10,000,000) shares of Common Stock, par value $0.0001 per share.\r
</p>\r
\r
<p>\r
RESOLVED: That the Corporation hereby authorizes the following founding issuances:\r
</p>\r
\r
<table class="table">\r
<tr><th>Shareholder</th><th>Shares Issued</th><th>Ownership %</th><th>Consideration</th><th>Notes</th></tr>\r
<tr>\r
<td>Invero Business Trust (Irrevocable Trust)</td>\r
<td>6,000,000</td>\r
<td>60%</td>\r
<td>Full founder consideration</td>\r
<td>Founding majority shareholder</td>\r
</tr>\r
<tr>\r
<td>{{founder_name}}</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>Founder IP, effort, services</td>\r
<td>Founder, Director, Officer</td>\r
</tr>\r
<tr>\r
<td>Unissued (Equity Pool)</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>N/A</td>\r
<td>Reserved for future issuance</td>\r
</tr>\r
</table>\r
\r
<p>\r
RESOLVED FURTHER: That the Board hereby determines that the consideration received for the issuance of these shares is adequate and fair to the Corporation, and that such shares shall be deemed fully paid and nonassessable as provided under DGCL §153.\r
</p>\r
\r
<h2>5. STOCK LEDGER AND CERTIFICATES</h2>\r
<p>\r
RESOLVED: That the Secretary shall record all share issuances in the Corporation's official stock ledger pursuant to DGCL §224 and issue stock certificates or electronic book-entry statements reflecting the ownership of the foregoing shares.\r
</p>\r
\r
<h2>6. BANKING AUTHORITY</h2>\r
<p>\r
RESOLVED: That the officers of the Corporation are hereby authorized to open one or more bank accounts in the name of the Corporation, execute banking resolutions, and enter agreements with financial institutions on behalf of the Corporation.\r
</p>\r
\r
<h2>7. RATIFICATION OF PRIOR ACTIONS</h2>\r
<p>\r
RESOLVED: That all actions taken by the Sole Incorporator or the Sole Director prior to these Minutes relating to the organization of the Corporation are hereby approved, ratified, and confirmed as valid corporate acts.\r
</p>\r
\r
<h2>EXECUTION AND CERTIFICATION</h2>\r
<p>\r
IN WITNESS WHEREOF, the undersigned Sole Director certifies that these Minutes constitute the true and correct record of the organizational actions of the Corporation as of {{minutes_date}}.\r
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
<p>\r
I, <strong>{{officer_name}}</strong>, Secretary of the Corporation, hereby certify that the foregoing constitutes a true, correct, and complete copy of the Organizational Minutes of the Sole Director of {{company_name}}.\r
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
`;export{r as default};
