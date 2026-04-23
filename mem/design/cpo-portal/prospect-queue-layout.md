---
name: CPO Prospect Execution Queue layout
description: Approved layout for the Prospect Execution Queue inside the CPO Partnership Portal — locked design.
type: design
---
The CPO Prospect Execution Queue (CPOPortal `prospects` tab, ProspectQueue mode="cpo") layout is LOCKED.

Approved structure:
- Header: "Prospect Execution Queue (CPO)" with subtitle.
- Left panel: Owner User ID (Jason) input, Search field, status dropdown, "Load Next Call" (orange) + Refresh buttons, prospect list below.
- Right panel (selected prospect detail):
  1. Business name + status pill (top right).
  2. Two-column meta grid: Phone/Email, Category/Priority, Address, Next Call/Last Contact, Delivery State/Pipeline.
  3. "30-SECOND PITCH" card (orange-tinted bg) with Grabber / Hook / Close lines.
  4. "TARGET SNAPSHOT" card with sprint #, sprint tag, category, city, "Ask for".
  5. "Call Actions" card: orange "Accept in CPO queue" + "Convert to pipeline" primary buttons, then outline status chips (No answer, Voicemail, Connected, Qualified, Won, Lost), datetime picker + orange "Save note / follow-up", and call notes textarea.
  6. "Activity Timeline" card at the bottom.

Do not redesign or restructure this view without explicit user request.
