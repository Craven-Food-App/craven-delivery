const n=`<!DOCTYPE html>\r
<html>\r
<head>\r
<meta charset="utf-8"/>\r
<title>Officer Acceptance of Appointment</title>\r
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
<h1>OFFICER ACCEPTANCE OF APPOINTMENT</h1>\r
<p style="text-align:center;"><strong>{{company_name}}</strong></p>\r
<p style="text-align:center;">A {{company_state}} Corporation</p>\r
\r
<p>\r
This Officer Acceptance (the "Acceptance") is delivered pursuant to Section 142(b) of the {{company_state}} General Corporation Law ("DGCL") in connection\r
with the appointment of the undersigned as an officer of <strong>{{company_name}}</strong> (the "Corporation").\r
</p>\r
\r
<h2>1. ACCEPTANCE OF APPOINTMENT</h2>\r
<p>\r
I, <strong>{{officer_name}}</strong>, hereby accept appointment by the Board of Directors to the following officer positions of the Corporation,\r
effective as of {{effective_date}}:\r
</p>\r
\r
<ul>\r
<li><strong>Chief Executive Officer (CEO)</strong></li>\r
<li><strong>Secretary</strong></li>\r
<li><strong>Treasurer</strong></li>\r
<li><strong>Chief Operating Officer (Acting)</strong></li>\r
</ul>\r
\r
<p>\r
I acknowledge that I shall serve in each such capacity at the pleasure of the Board and in accordance with DGCL §142(b), the Bylaws of the Corporation,\r
and applicable law.\r
</p>\r
\r
<h2>2. DUTIES & RESPONSIBILITIES</h2>\r
<p>\r
I acknowledge and accept the duties, authority, rights, and responsibilities associated with each of the foregoing offices, including but not limited to:\r
</p>\r
\r
<ul>\r
<li>managing the day-to-day business and operations of the Corporation;</li>\r
<li>executing contracts, agreements, and instruments on behalf of the Corporation;</li>\r
<li>maintaining the corporate records and books as Secretary;</li>\r
<li>overseeing financial accounts, expenditures, and fiscal matters as Treasurer;</li>\r
<li>supervising operational processes and strategic execution as Acting COO;</li>\r
<li>serving as an authorized signatory of the Corporation.</li>\r
</ul>\r
\r
<h2>3. FIDUCIARY DUTIES</h2>\r
<p>\r
I further acknowledge that, as an officer of a {{company_state}} corporation, I owe the Corporation the fiduciary duties of:\r
</p>\r
\r
<ul>\r
<li><strong>Duty of Loyalty</strong> — to act in the best interests of the Corporation and avoid self-dealing or conflicts of interest;</li>\r
<li><strong>Duty of Care</strong> — to act with the care that a reasonably prudent person would exercise under similar circumstances;</li>\r
<li><strong>Duty of Good Faith</strong> — to act honestly and faithfully in the performance of my responsibilities.</li>\r
</ul>\r
\r
<h2>4. COMPLIANCE WITH LAW & BYLAWS</h2>\r
<p>\r
I agree to perform all duties in compliance with:\r
</p>\r
\r
<ul>\r
<li>the {{company_state}} General Corporation Law (DGCL);</li>\r
<li>the Corporation's Certificate of Incorporation;</li>\r
<li>the Corporation's Bylaws;</li>\r
<li>all resolutions adopted by the Board of Directors;</li>\r
<li>and all applicable federal, state, and local laws.</li>\r
</ul>\r
\r
<h2>5. ACCEPTANCE</h2>\r
<p>\r
By signing below, I hereby accept the foregoing appointments and acknowledge that this Acceptance shall be filed in the Corporation's minute book\r
as required under DGCL §142(b).\r
</p>\r
\r
<div class="signature-line"></div>\r
<p><strong>Officer:</strong> {{officer_name}}</p>\r
<p><small>Email: {{officer_email}} | Address: {{officer_address}}</small></p>\r
\r
<!-- Signature Tag -->\r
<span data-sig="OFFICER">{{SIGNATURE_OFFICER}}</span>\r
\r
</body>\r
</html>\r
\r
`;export{n as default};
