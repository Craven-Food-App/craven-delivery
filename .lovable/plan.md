

## Fix: Shrink Container to Match Logo Size

The problem is clear: the container is `26px` but the logo image is `22px` (`size - 4`), plus there's a `2px` border and white background filling the gap. The container needs to shrink to hug the logo exactly.

### Change (single file: `src/components/mobile/MobileMapbox.tsx`, lines ~436-463)

**Current state:**
- Container: 26px with 2px border and white background
- Logo image: 22px (size - 4)
- Result: visible white ring between logo and glow

**Fix:**
- Keep logo image at 22px (the size the user wants)
- Shrink container to 22px to match
- Remove the white background -- set to `transparent`
- Change border from `2px` to `1px` thin subtle edge
- Make the image fill the full container: change `size - 4` to `size`
- The `box-shadow` glow now radiates directly from the logo edge with zero gap

Specifically:
1. Change `const size = 26` to `const size = 22`
2. Set `background: transparent` (keep subtle bg only for text fallbacks)
3. Change `border: 2px solid` to `border: 1px solid`
4. Change image dimensions from `${size - 4}px` to `${size}px` so the logo fills the entire container edge-to-edge

