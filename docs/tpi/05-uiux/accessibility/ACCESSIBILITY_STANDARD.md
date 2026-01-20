# TPI Accessibility Standard

**Version:** 1.0  
**WCAG Level:** AA (minimum), AAA (where possible)  
**Last Updated:** 2025-01-XX

---

## Overview

All TPI portals must meet WCAG 2.1 Level AA standards as a minimum. This document defines accessibility requirements and implementation guidelines.

---

## WCAG Compliance

### Level AA Requirements

**Perceivable**
- Text alternatives for images
- Captions for media
- Sufficient color contrast (4.5:1 for text)
- Resizable text (up to 200%)

**Operable**
- Keyboard accessible
- No seizure-inducing content
- Navigable with assistive technology
- Sufficient time limits

**Understandable**
- Readable text
- Predictable functionality
- Input assistance

**Robust**
- Compatible with assistive technology
- Valid HTML
- Proper ARIA usage

---

## Keyboard Navigation

### Tab Order

**Standard Navigation**
- Tab: Move forward through focusable elements
- Shift+Tab: Move backward
- Order: Logical, top-to-bottom, left-to-right

**Skip Links**
- Position: First focusable element on page
- Target: Main content area
- Format: "Skip to main content"
- Visible: On focus only

### Keyboard Shortcuts

**Global Shortcuts**
- Cmd/Ctrl+K: Open global search
- Escape: Close modal/drawer
- Enter: Activate button/link
- Space: Toggle checkbox/switch

**Table Navigation**
- Arrow keys: Navigate cells (if enabled)
- Enter: Activate row (open drawer)
- Space: Select row

**Form Navigation**
- Tab: Next field
- Shift+Tab: Previous field
- Enter: Submit form (if in form context)

### Focus Management

**Focus Indicators**
- Visible: Always show focus outline
- Style: 2px solid primary color
- Contrast: Meets WCAG AA (3:1)
- Never remove: Focus styles are required

**Focus Trapping**
- Modals: Trap focus within modal
- Drawers: Trap focus within drawer
- Return focus: To trigger element on close

**Focus Order**
- Logical: Follows visual order
- Predictable: Same order every time
- Skip: Hidden elements not in tab order

---

## Screen Reader Support

### ARIA Labels

**Required Attributes**
- `aria-label`: For elements without visible text
- `aria-labelledby`: Link to visible label
- `aria-describedby`: Link to description
- `aria-live`: For dynamic content updates

**Landmark Roles**
- `role="main"`: Main content area
- `role="navigation"`: Navigation menus
- `role="banner"`: Header/top bar
- `role="contentinfo"`: Footer
- `role="complementary"`: Sidebar

### Semantic HTML

**Use Semantic Elements**
- `<header>`, `<nav>`, `<main>`, `<footer>`
- `<section>`, `<article>`, `<aside>`
- `<button>`, `<a>`, `<input>`, `<select>`

**Avoid**
- `<div>` for buttons (use `<button>`)
- `<span>` for links (use `<a>`)
- Generic elements without roles

### Announcements

**Dynamic Updates**
- `aria-live="polite"`: Non-urgent updates
- `aria-live="assertive"`: Urgent updates
- `aria-live="off"`: No announcements

**Examples**
- Toast notifications: `aria-live="polite"`
- Error messages: `aria-live="assertive"`
- Loading states: `aria-live="off"`

---

## Color Contrast

### Text Contrast

**Normal Text** (WCAG AA)
- Ratio: 4.5:1 minimum
- Use: Body text, labels, descriptions

**Large Text** (WCAG AA)
- Ratio: 3:1 minimum
- Size: 18pt+ or 14pt+ bold
- Use: Headings, large labels

**Enhanced Text** (WCAG AAA)
- Ratio: 7:1 minimum
- Use: When possible for better accessibility

### Interactive Elements

**Focus Indicators**
- Ratio: 3:1 minimum against background
- Style: 2px solid outline
- Color: Primary color or high contrast

**Buttons**
- Text: 4.5:1 against button background
- Border: 3:1 against surrounding background

### Status Colors

**Not Color Alone**
- Use: Color + icon + text
- Ensure: Information conveyed without color
- Test: Grayscale mode

**Examples**
- Status badge: Green + checkmark + "Active"
- Error message: Red + X icon + error text
- Warning: Yellow + warning icon + warning text

---

## Form Accessibility

### Labels

**Required Labels**
- Every input must have a label
- Format: `<label for="input-id">` or `aria-label`
- Visible: Labels should be visible

**Help Text**
- Link: `aria-describedby` to help text
- Position: Below field
- Format: Clear, concise instructions

### Error Messages

**Inline Errors**
- Position: Below field
- Link: `aria-describedby` to error message
- Format: Clear, actionable error text
- Announce: To screen readers immediately

**Error Summary**
- Position: Top of form
- Link: To fields with errors
- Format: List of all errors
- Focus: Move focus to summary on submit

### Required Fields

**Indicators**
- Visual: Asterisk (*) + "Required" text
- ARIA: `aria-required="true"`
- Format: "Field Name *"

**Validation**
- Real-time: Validate on blur
- Submit: Validate all fields on submit
- Clear: Clear errors when fixed

---

## Images & Media

### Alt Text

**Decorative Images**
- Format: `alt=""` (empty)
- Use: Icons, decorative graphics
- Avoid: Redundant text

**Informative Images**
- Format: `alt="[description]"`
- Content: Describe image content
- Context: Include relevant context

**Functional Images**
- Format: `alt="[function]"`
- Content: Describe function, not appearance
- Example: `alt="Close dialog"` not `alt="X icon"`

### Captions & Transcripts

**Video Content**
- Captions: Required for all video
- Format: Synchronized captions
- Quality: Accurate, readable

**Audio Content**
- Transcripts: Required for audio-only
- Format: Text transcript available
- Link: Accessible from media player

---

## Responsive Design

### Touch Targets

**Minimum Size**
- Size: 44x44px minimum
- Spacing: 8px between targets
- Use: Buttons, links, interactive elements

**Mobile Considerations**
- Larger: Increase size on mobile
- Spacing: More space between targets
- Avoid: Small, closely spaced targets

### Viewport

**Zoom Support**
- Allow: Up to 200% zoom
- Layout: Remains usable at 200%
- Text: Remains readable

**Orientation**
- Support: Portrait and landscape
- Layout: Adapts to orientation
- No restriction: Don't lock orientation

---

## Testing

### Automated Testing

**Tools**
- axe DevTools: Browser extension
- WAVE: Web accessibility evaluation
- Lighthouse: Accessibility audit

**Frequency**
- Pre-commit: Run automated checks
- CI/CD: Include in build pipeline
- Regular: Weekly automated scans

### Manual Testing

**Keyboard Testing**
- Navigate: Entire interface with keyboard only
- Focus: All interactive elements focusable
- Order: Logical tab order

**Screen Reader Testing**
- Tools: NVDA (Windows), VoiceOver (Mac)
- Test: All major user flows
- Verify: Announcements are clear

**Color Testing**
- Grayscale: Test without color
- Contrast: Verify contrast ratios
- Colorblind: Test with colorblind simulators

### User Testing

**Involve Users**
- Test: With actual assistive technology users
- Feedback: Regular accessibility reviews
- Iterate: Based on user feedback

---

## Common Issues & Solutions

### Issue: Missing Focus Indicators

**Problem:** Focus not visible
**Solution:** Add visible focus outline (2px solid primary color)

### Issue: Low Contrast Text

**Problem:** Text hard to read
**Solution:** Increase contrast to 4.5:1 minimum

### Issue: Missing Alt Text

**Problem:** Images not described
**Solution:** Add descriptive alt text or empty alt for decorative

### Issue: Keyboard Trapping

**Problem:** Focus escapes modal
**Solution:** Implement focus trap in modal/drawer

### Issue: Missing ARIA Labels

**Problem:** Screen readers can't identify elements
**Solution:** Add appropriate ARIA attributes

### Issue: Color-Only Indicators

**Problem:** Information only in color
**Solution:** Add icon + text to convey information

---

## Implementation Checklist

### Page Level

- [ ] Semantic HTML structure
- [ ] Skip link present
- [ ] Landmark roles defined
- [ ] Page title descriptive
- [ ] Heading hierarchy logical

### Navigation

- [ ] Keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on navigation
- [ ] Current page indicated

### Forms

- [ ] All inputs have labels
- [ ] Required fields indicated
- [ ] Error messages linked
- [ ] Help text available
- [ ] Validation accessible

### Content

- [ ] Images have alt text
- [ ] Color contrast sufficient
- [ ] Text resizable
- [ ] Links descriptive
- [ ] Headings logical

### Interactive Elements

- [ ] Buttons keyboard accessible
- [ ] Focus management correct
- [ ] ARIA attributes present
- [ ] Status announced
- [ ] Loading states announced

---

## Resources

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)

### Testing
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [VoiceOver Guide](https://www.apple.com/accessibility/vision/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**Related:**
- [Content Style Guide](../content-style/CONTENT_STYLE_GUIDE.md)
- [Component Inventory](../components/COMPONENT_INVENTORY.md)








































