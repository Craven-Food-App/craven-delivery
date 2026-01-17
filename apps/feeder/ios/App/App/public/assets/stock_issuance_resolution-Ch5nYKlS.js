const r=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Stock Issuance Resolution</title>\r
<style>\r
body { font-family:"Times New Roman", serif; line-height:1.4; }\r
h1 { text-align:center; text-transform:uppercase; font-size:22px; margin-bottom:12px; }\r
h2 { font-size:16px; text-transform:uppercase; margin-top:28px; }\r
.table { width:100%; border-collapse:collapse; margin-top:12px; }\r
.table th, .table td { border:1px solid #000; padding:8px; vertical-align:top; }\r
.signature-line { border-bottom:1px solid #000; height:24px; margin-top:24px; }\r
</style>\r
</head>\r
\r
<body>\r
\r
<h1>BOARD RESOLUTION<br/>AUTHORIZING ISSUANCE OF SHARES</h1>\r
<p style="text-align:center;"><strong>{{company_name}}</strong></p>\r
<p style="text-align:center;">A {{company_state}} Corporation</p>\r
\r
<p>\r
The undersigned, <strong>{{director_name}}</strong>, being the sole member of the Board of Directors (the "Board") of \r
<strong>{{company_name}}</strong>, a {{company_state}} corporation (the "Corporation"), hereby adopts the following resolutions pursuant to \r
Section 141(f) of the {{company_state}} General Corporation Law ("DGCL") in lieu of a meeting:\r
</p>\r
\r
<hr/>\r
\r
<h2>WHEREAS</h2>\r
\r
<p>WHEREAS, the Certificate of Incorporation of the Corporation authorizes the issuance of Ten Million (10,000,000) shares of Common Stock with a par value of $0.0001 per share pursuant to DGCL §102(a)(4);</p>\r
\r
<p>WHEREAS, the Board is authorized under DGCL §152 to determine the consideration for which the Corporation's shares shall be issued and to determine that such consideration is adequate, thereby rendering the shares fully paid and nonassessable pursuant to DGCL §153;</p>\r
\r
<p>WHEREAS, the Corporation desires to issue founding shares to its majority shareholder, <strong>Invero Business Trust (Irrevocable Trust)</strong>, and to its founder, <strong>{{founder_name}}</strong>, and to create an unissued equity pool for future grants;</p>\r
\r
<hr/>\r
\r
<h2>NOW, THEREFORE, BE IT RESOLVED:</h2>\r
\r
<h2>1. AUTHORIZATION OF ISSUANCE OF FOUNDING SHARES</h2>\r
\r
<p>\r
RESOLVED: That the Corporation hereby authorizes the issuance of the following shares of Common Stock, par value $0.0001 per share, as the initial founding issuances:\r
</p>\r
\r
<table class="table">\r
<tr><th>Shareholder</th><th>Shares Issued</th><th>Ownership %</th><th>Consideration</th><th>Notes</th></tr>\r
\r
<tr>\r
<td>Invero Business Trust (Irrevocable Trust)</td>\r
<td>6,000,000</td>\r
<td>60%</td>\r
<td>Full and valid founder consideration, including capital contribution, governance oversight, and trust-structured ownership</td>\r
<td>Majority shareholder</td>\r
</tr>\r
\r
<tr>\r
<td>{{founder_name}}</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>Founder intellectual property, development labor, pre-incorporation services, and post-incorporation leadership</td>\r
<td>Founder / Officer / Director</td>\r
</tr>\r
\r
<tr>\r
<td>Unissued (Equity Incentive Pool)</td>\r
<td>2,000,000</td>\r
<td>20%</td>\r
<td>N/A</td>\r
<td>Reserved for future officers, employees, contractors, or advisors</td>\r
</tr>\r
\r
</table>\r
\r
<p>\r
RESOLVED FURTHER: That the Board hereby determines that the consideration received for the issuance of the foregoing shares is adequate and sufficient pursuant to DGCL §152, and therefore all issued shares shall be deemed fully paid and nonassessable under DGCL §153.\r
</p>\r
\r
<h2>2. AUTHORIZATION TO ISSUE STOCK CERTIFICATES & LEDGER ENTRIES</h2>\r
\r
<p>\r
RESOLVED: That the Secretary of the Corporation is authorized and directed to:\r
</p>\r
\r
<ul>\r
<li>issue stock certificates or electronic book-entry statements to the shareholders listed above;</li>\r
<li>record such issuances in the Corporation's official stock ledger pursuant to DGCL §224;</li>\r
<li>maintain all stock records in a secure, permanent, and non-erasable format;</li>\r
<li>and ensure that each certificate or ledger entry reflects the correct number of shares, dates, and issuance authority.</li>\r
</ul>\r
\r
<h2>3. SHAREHOLDER RIGHTS & RESTRICTIONS</h2>\r
\r
<p>\r
RESOLVED: That all shares issued shall be subject to any transfer restrictions, lock-ups, shareholder agreements, or repurchase rights that may be adopted by the Corporation in accordance with DGCL §202.\r
</p>\r
\r
<h2>4. EQUITY INCENTIVE POOL</h2>\r
\r
<p>\r
RESOLVED: That Two Million (2,000,000) shares of Common Stock are hereby reserved as an Equity Incentive Pool, to be issued only upon future Board approval, and such shares shall remain unissued until such time as the Board authorizes their distribution.\r
</p>\r
\r
<h2>5. RATIFICATION OF PRIOR ACTIONS</h2>\r
\r
<p>\r
RESOLVED: That any and all actions taken prior to this Resolution by the Incorporator, Director, or Officers relating to the share structure or capitalization of the Corporation are hereby approved, ratified, and confirmed pursuant to DGCL §204.\r
</p>\r
\r
<h2>EXECUTION</h2>\r
<p>\r
IN WITNESS WHEREOF, the undersigned Sole Director has executed this Stock Issuance Resolution as of {{resolution_date}}.\r
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
I, <strong>{{officer_name}}</strong>, Secretary of the Corporation, hereby certify that the foregoing is a true, complete, and correct Stock Issuance Resolution of the Board of Directors of {{company_name}}, duly adopted pursuant to DGCL §141(f).\r
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
