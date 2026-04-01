# Overlay Redesign Implementation Plan

## Overview

Rebuild the ChatControl overlay screen (the secondary Electron floating window) to match the approved design mockup. The overlay currently has a functional but minimal design with simple text summaries, hover-only actions, and basic card styling. The approved design calls for a premium, dashboard-grade feel with tier-tinted card backgrounds, a LIVE badge, structured metrics row, an active/expanded first card, a "more unread below" banner, and a dropdown sort control.

No new dependencies are required. All tools are already available: React 19, Tailwind CSS 4, Framer Motion, Lucide icons, Zustand stores, and the `cn()` utility from `clsx`+`tailwind-merge`.

---

## Architecture Decisions

### 1. Card Tinting Strategy
The approved design tints each card's background based on the donor's tier color. The existing `tiers.ts` already maps tiers 1-7 to colors with `bg-[#color]/15` opacity classes. These will be reused directly for secondary card backgrounds. For the **active/top card**, the opacity will be increased (e.g., `/25` or `/30`) and paired with a stronger border and subtle box-shadow glow. No new color system is needed -- the existing tier config is sufficient.

### 2. Top Card Treatment
The first **unread** message in the sorted feed gets expanded treatment. This is determined positionally in `OverlayFeed.tsx` by finding the first unread message and passing `isActive={true}` to that `SuperChatCard`. The active card gets:
- Larger padding (`p-4` vs `p-3`)
- Always-visible action buttons (not hover-gated)
- Stronger tier-tinted background (higher opacity)
- A subtle colored left border or glow effect
- Message text not line-clamped

### 3. Logo Component
The `LogoMark` SVG already exists in `DashboardShell.tsx`. Extract it into a shared component at `src/renderer/src/components/shared/LogoMark.tsx` so both the dashboard sidebar and the overlay header can import it. The overlay variant will be smaller (20x20 or 24x24 vs the dashboard's 32x32), so the component accepts a `size` prop.

### 4. Sort Dropdown
Replace the 3-button `SortControls` with a custom dropdown. Since the overlay is a frameless Electron window and we have no headless UI library installed, implement a simple click-to-toggle popover using React state + Framer Motion for the open/close animation. The trigger shows the current sort label + a `ChevronDown` icon, and the dropdown lists all three options. Click outside or option selection closes it.

### 5. "More Unread Below" Banner
A new component `UnreadBelowBanner` that uses an `IntersectionObserver` (or scroll position check) inside `OverlayFeed.tsx`. When unread messages exist below the current scroll viewport, display a red-tinted banner at the bottom of the feed container showing "N more unread messages below". Clicking it scrolls to the next unread message.

### 6. `getTimeAgo` Utility Extraction
The `getTimeAgo` function currently lives as a private function inside `SuperChatCard.tsx`. Move it to `src/renderer/src/lib/utils.ts` and export it, since the new card layout uses it and it may be needed elsewhere.

---

## File-by-File Implementation

### Phase 1: Foundation (shared components and utilities)

#### 1.1 NEW: `src/renderer/src/components/shared/LogoMark.tsx`

Extract the `LogoMark` SVG from `DashboardShell.tsx` into its own component.

**Component API:**
```typescript
interface LogoMarkProps {
  size?: 'sm' | 'md'  // sm=20px (overlay), md=32px (dashboard)
  className?: string
}
```

The SVG paths stay identical to the existing one in `DashboardShell.tsx`. The `size` prop controls the `className` sizing (`h-5 w-5` vs `h-8 w-8`) and the container styling.

#### 1.2 MODIFY: `src/renderer/src/lib/utils.ts`

Add the `getTimeAgo` function (moved from `SuperChatCard.tsx`):

```typescript
export function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'  // Changed from 'now' to match mockup
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
```

Note: The output format changes from `"now"` to `"Just now"` and from `"5m"` to `"5m ago"` to match the mockup text style.

#### 1.3 MODIFY: `src/renderer/src/lib/tiers.ts`

Add a helper that returns tier-specific values as inline style-friendly hex colors for the card tinting system, and add an "active" background variant with higher opacity:

```typescript
// Add to existing TierConfig interface:
interface TierConfig {
  bg: string
  bgActive: string    // NEW: stronger tint for active card
  border: string
  text: string
  label: string
  accent: string      // NEW: raw hex color for inline styles (glow, shadows)
}
```

Update each tier entry to include `bgActive` (e.g., `'bg-[#1565c0]/25'`) and `accent` (e.g., `'#1565c0'`). The `accent` field replaces the need for `getTierAccentColor` lookups. Update `DEFAULT_TIER` similarly.

---

### Phase 2: Header and Metrics Redesign

#### 2.1 MODIFY: `src/renderer/src/components/layout/OverlayShell.tsx`

**Header section changes:**

Current structure:
- Left: `<Grip>` icon + "ChatControl" text + status icon (Wifi/WifiOff)
- Right: Collapse button + Pin button

New structure:
- Left: `<LogoMark size="sm" />` + "ChatControl" in `font-display` class
- Center-right: LIVE pill badge (green dot + "LIVE" text) when streaming, or "Offline" gray badge when not
- Right: Pin button + Settings/Sparkles button (no more collapse toggle -- or keep it as a secondary control)

**Implementation details:**

Replace `<Grip>` with `<LogoMark size="sm" />`. Replace the status indicator function with an inline `LiveBadge` component or extract it.

The LIVE badge renders as:
```tsx
<span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-green-400">
  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
  LIVE
</span>
```

When offline/ended, show a muted variant:
```tsx
<span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
  Offline
</span>
```

When reconnecting, show a yellow variant with a spinner.

Replace the collapse button with a Sparkles/settings icon button. Keep the Pin/PinOff button.

**Metrics row relocation:**

Remove `SummaryStrip` and `SortControls` as separate visual sections. Combine them into a single metrics row immediately below the header. The new structure in the non-collapsed body:

```tsx
<MetricsRow
  total={stats.totalConverted}
  currency={displayCurrency}
  unreadCount={stats.unreadCount}
  savedCount={stats.savedCount}
  sort={sort}
  onSortChange={setSort}
/>
```

This replaces both `<SummaryStrip>` and the bottom `<SortControls>` footer.

**Layout structure change:**

Remove the bottom footer `<div>` that currently wraps `SortControls`. The sort control is now integrated into the metrics row. The overall layout becomes:

```
┌─────────────────────────┐
│  Header (drag region)   │
├─────────────────────────┤
│  Metrics Row            │
├─────────────────────────┤
│  Feed (flex-1, scroll)  │
│  ...cards...            │
│  [Unread Below Banner]  │
│  [UndoSnackbar]         │
└─────────────────────────┘
```

No bottom bar.

#### 2.2 MODIFY: `src/renderer/src/components/overlay/SummaryStrip.tsx`

Rename to `MetricsRow.tsx` or keep the filename and gut the internals. The new component renders:

**Component API:**
```typescript
interface MetricsRowProps {
  total: number
  currency: string
  unreadCount: number
  savedCount: number
  sort: SortOrder
  onSortChange: (sort: SortOrder) => void
}
```

**Layout:**
```
[ Total $1,284 ]  [ Unread 8 ]  [ Saved 5 ]          [ Latest v ]
   green value      red value     green value          dropdown
                    + red dot
```

Each stat block is a `<div>` with:
- Label in `text-muted-foreground text-[10px] uppercase tracking-wider font-medium`
- Value in `text-sm font-bold` with tier-appropriate color:
  - Total: `text-green-400`
  - Unread: `text-red-400` (primary color) with a small red dot indicator (`h-1.5 w-1.5 rounded-full bg-red-400`) when unreadCount > 0
  - Saved: `text-green-400`

The sort dropdown on the right uses the redesigned `SortControls` component (see 2.3).

Background: `bg-card/60` with bottom border `border-b border-border`.

#### 2.3 MODIFY: `src/renderer/src/components/overlay/SortControls.tsx`

Complete rewrite from button group to dropdown.

**Component API stays the same:**
```typescript
interface SortControlsProps {
  current: SortOrder
  onChange: (sort: SortOrder) => void
}
```

**Implementation:**
- Trigger button: pill-shaped (`rounded-full`), shows current sort label + `<ChevronDown>` icon
- `useState` for `open` toggle
- Dropdown panel: `position: absolute`, rendered below/above the trigger, uses `AnimatePresence` + `motion.div` for slide+fade animation
- Click outside detection via a `useEffect` with a `mousedown` document listener when open
- Each option is a button; clicking it calls `onChange(value)` and closes the dropdown
- Current selection shows a `<Check>` icon

Styling: trigger has `bg-secondary text-foreground text-[11px] font-medium px-2.5 py-1`. Dropdown has `bg-card border border-border rounded-lg shadow-xl`.

---

### Phase 3: Card Redesign

#### 3.1 MODIFY: `src/renderer/src/components/overlay/SuperChatCard.tsx`

This is the most substantial change. The card gets a complete visual overhaul.

**New Component API:**
```typescript
interface SuperChatCardProps {
  message: PaidMessage
  onMarkRead: (id: string) => void
  onSave: (id: string) => void
  isActive?: boolean       // NEW: true for the first unread card
  compact?: boolean
}
```

**Card anatomy (approved design):**

```
┌───────────────────────────────────┐
│ [Avatar]  Name        $50.00 pill │
│           Just now                │
│                                   │
│ Message text goes here and can    │
│ wrap to multiple lines...         │
│                                   │
│ [Mark Read]  [Save]   (active)    │
└───────────────────────────────────┘
```

**Detailed changes:**

1. **Remove the accent bar**: The current `absolute left-0` colored bar is removed. Instead, the entire card background is tinted.

2. **Avatar**: Larger circular avatar (`w-9 h-9` for active, `w-7 h-7` for secondary). If no `donorAvatarUrl`, render a colored circle with the first letter of `donorDisplayName` using the tier's accent color as background. This replaces the `img` tag with a fallback:

```tsx
{message.donorAvatarUrl ? (
  <img src={message.donorAvatarUrl} alt="" className={cn('rounded-full shrink-0', isActive ? 'w-9 h-9' : 'w-7 h-7')} />
) : (
  <div className={cn('rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xs', isActive ? 'w-9 h-9' : 'w-7 h-7')}
    style={{ backgroundColor: tier.accent }}>
    {message.donorDisplayName.charAt(0).toUpperCase()}
  </div>
)}
```

3. **Name + Amount pill row**: Name is bold left-aligned, amount is a pill badge right-aligned on the same row.

Amount pill:
```tsx
<span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold', isActive ? 'bg-primary text-primary-foreground' : '')}
  style={!isActive ? { backgroundColor: `${tier.accent}20`, color: tier.accent } : undefined}>
  {originalDisplay}
</span>
```

For the active card, the pill uses the primary red color. For secondary cards, it uses the tier's accent color at low opacity for the background.

4. **Timestamp**: Below the name, `text-[10px] text-muted-foreground`. Uses the extracted `getTimeAgo()`.

5. **Message text**: `text-xs text-foreground/80 leading-relaxed`. For active cards, no `line-clamp`. For secondary cards, `line-clamp-2`.

6. **Sticker variant**: When `isSticker && !message.messageText`, show italic "Sent a Super Sticker" text + a gray placeholder rectangle (`w-12 h-12 rounded-lg bg-secondary`) for the sticker thumbnail.

7. **Action buttons**: 
   - **Active card**: Always visible action row at the bottom. "Mark Read" as a red/primary button, "Save" as a gray/secondary button.
   ```tsx
   <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
     <button className="flex-1 rounded-lg bg-primary/90 hover:bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors">
       Mark Read
     </button>
     <button className="flex-1 rounded-lg bg-secondary hover:bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors">
       Save
     </button>
   </div>
   ```
   - **Secondary cards (unread)**: Hover-to-reveal icon buttons (keep existing pattern but update styling).
   - **Read cards**: Small checkmark icon in the top-right (like the mockup shows for CasualViewer).
   - **Saved cards**: Small bookmark icon in the top-right.

8. **Card container styling**:
   - Active: `${tier.bgActive} border ${tier.border} p-4 rounded-xl shadow-lg shadow-[${tier.accent}]/5`
   - Secondary: `${tier.bg} border ${tier.border} p-3 rounded-lg`
   - Both use Framer Motion for entry/exit animations (keep existing `motion.div` pattern).

9. **Converted amount display**: Move the `(converted)` display to a tooltip or a second line below the original display, only for secondary cards. For the active card, show both inline.

---

### Phase 4: Feed Logic and Banner

#### 4.1 MODIFY: `src/renderer/src/components/overlay/OverlayFeed.tsx`

**New Component API:**
```typescript
interface OverlayFeedProps {
  messages: PaidMessage[]
  onMarkRead: (id: string) => void
  onSave: (id: string) => void
  showRead?: boolean
  compact?: boolean
  hasActiveSession?: boolean
}
```

API stays the same, but internal logic changes:

1. **Active card detection**: Find the index of the first unread message in the filtered list. Pass `isActive={true}` to that card's `SuperChatCard` and `isActive={false}` (or omit) for all others.

```typescript
const filtered = showRead ? messages : messages.filter((m) => m.state === 'unread')
const firstUnreadIndex = filtered.findIndex((m) => m.state === 'unread')
```

2. **Scroll container ref**: Add a `useRef<HTMLDivElement>` for the scrollable container. This is used by the "unread below" banner logic.

3. **Unread below banner**: Track how many unread messages are below the current scroll position using a combination of:
   - A `useRef` map storing element refs for each card
   - A scroll event listener (throttled) that counts how many unread messages are below the viewport
   - Or simpler: use an `IntersectionObserver` on the last unread card. If it is not intersecting the viewport, show the banner.

Simpler approach (recommended): After the `AnimatePresence` card list, render `<UnreadBelowBanner>` if `unreadCount > visibleUnreadCount`. For MVP, track this by observing whether the container's `scrollHeight > scrollTop + clientHeight` and there are unread messages in the list. Use a scroll event handler:

```typescript
const [unreadBelowCount, setUnreadBelowCount] = useState(0)

useEffect(() => {
  const container = scrollRef.current
  if (!container) return

  const handleScroll = () => {
    // Count unread messages whose DOM elements are below the viewport
    // Simplified: if scrolled less than scrollHeight - clientHeight, some are below
    const isScrolledToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
    const totalUnread = filtered.filter(m => m.state === 'unread').length
    setUnreadBelowCount(isScrolledToBottom ? 0 : Math.max(0, totalUnread - 1))
  }

  container.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll() // initial check
  return () => container.removeEventListener('scroll', handleScroll)
}, [filtered])
```

4. **Card spacing**: Change from `space-y-2` to `space-y-3` for more breathing room between cards.

5. **Empty states**: Keep existing empty states but update their icons and copy to match the approved design language.

#### 4.2 NEW: `src/renderer/src/components/overlay/UnreadBelowBanner.tsx`

**Component API:**
```typescript
interface UnreadBelowBannerProps {
  count: number
  onClick: () => void
}
```

**Rendering:**
```tsx
<motion.button
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 10 }}
  onClick={onClick}
  className="w-full rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
>
  {count} more unread message{count !== 1 ? 's' : ''} below
</motion.button>
```

Wrapped in `<AnimatePresence>` to fade in/out when `count` changes to/from 0.

The `onClick` handler scrolls the feed container to the next off-screen unread card.

---

### Phase 5: Cleanup and Integration

#### 5.1 MODIFY: `src/renderer/src/components/layout/DashboardShell.tsx`

Update the `LogoMark` usage to import from the shared component:
```tsx
import { LogoMark } from '../shared/LogoMark'
```

Replace the inline `LogoMark` function with the imported component. Pass `size="md"`.

#### 5.2 MODIFY: `src/renderer/src/components/overlay/UndoSnackbar.tsx`

Adjust positioning. Currently positioned `bottom-12` which assumes a footer bar exists. With the footer removed, adjust to `bottom-3` or `bottom-4` so it floats above the bottom of the feed area.

#### 5.3 MODIFY: `src/renderer/src/styles/globals.css`

No major theme changes needed -- existing CSS custom properties are well-suited. Potentially add:

```css
/* Subtle glow utility for active cards */
.card-glow-red {
  box-shadow: 0 0 20px -4px rgba(225, 29, 46, 0.15);
}
```

But this could also be done inline with Tailwind's `shadow-[...]` syntax, avoiding the need for a custom class.

#### 5.4 MODIFY: `src/renderer/src/components/renderer-ui.test.tsx`

Update tests that reference the overlay to account for:
- The new `isActive` prop on `SuperChatCard`
- Changed button labels ("Mark Read" button text vs icon-only)
- Removal of the bottom sort controls footer
- New "more unread messages below" text
- Updated time format strings ("Just now" vs "now")

---

## Component Dependency Graph (new)

```
OverlayShell
├── LogoMark (shared)
├── LiveBadge (inline or small sub-component)
├── MetricsRow (renamed SummaryStrip)
│   └── SortControls (dropdown variant)
├── OverlayFeed
│   ├── SuperChatCard (redesigned, with isActive prop)
│   └── UnreadBelowBanner (new)
└── UndoSnackbar (repositioned)
```

---

## State Handling

### Loading State
The existing `loading` boolean in `useSuperchatStore` covers the initial hydration. During loading, the feed area should show skeleton cards -- 3-4 placeholder cards with pulsing backgrounds using Tailwind's `animate-pulse`. This can be a simple inline conditional in `OverlayFeed.tsx`:

```tsx
if (loading) {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />
      ))}
    </div>
  )
}
```

To enable this, `OverlayFeed` needs a new `loading` prop, passed from `OverlayShell` via `useSuperchatStore((s) => s.loading)`.

### Empty State (no messages)
Keep the existing empty state in `OverlayFeed` with the `MessageCircle` icon but refine the copy.

### No Active Session
Keep the existing "No active stream" state with the `Radio` icon.

### Error State
When `streamStatus.type === 'error'`, the header badge shows a red "Error" pill. The feed could optionally show a small inline error banner.

### Live vs Offline Header
- `status.type === 'connected' | 'polling'` --> green LIVE badge
- `status.type === 'reconnecting'` --> yellow "Reconnecting" badge with spinner
- `status.type === 'error'` --> red "Error" badge
- `status.type === 'ended'` or `status === null` --> gray "Offline" badge

### Hover/Focus States
- Cards: subtle brightness increase on hover (`hover:brightness-110` or `hover:bg-white/5`)
- Buttons: color transitions already handled via Tailwind `hover:` classes
- Focus: add `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none` to all interactive elements

---

## Accessibility Considerations

1. **Keyboard navigation**: All buttons must be focusable and operable via keyboard. The sort dropdown must support `Escape` to close, `Enter`/`Space` to select, and arrow keys for option navigation.

2. **ARIA attributes**:
   - Sort dropdown: `aria-expanded`, `aria-haspopup="listbox"`, `role="listbox"` on the options panel, `role="option"` on each option, `aria-selected` for the current sort.
   - LIVE badge: `aria-label="Stream is live"` or `role="status"`.
   - Action buttons: Clear `aria-label` values ("Mark as read", "Save for later").
   - Unread below banner: `role="status"` with `aria-live="polite"` so screen readers announce when unread messages appear below.

3. **Color contrast**: Ensure all text colors meet WCAG AA against their backgrounds. The current muted-foreground (`#98a4b3`) on background (`#0a0d12`) already has a contrast ratio of ~6.5:1 (passes AA). Tier-tinted text colors should be verified against their tinted backgrounds.

4. **Reduced motion**: Wrap Framer Motion animations in a `prefers-reduced-motion` check. Framer Motion respects `reducedMotion` prop on `LazyMotion` or individual `motion` components. Consider adding `transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}`.

5. **Screen reader announcements**: When a new Super Chat arrives, consider an `aria-live="polite"` region that announces the new donation amount and donor name.

---

## Implementation Order

| Step | File(s) | Description |
|------|---------|-------------|
| 1 | `lib/utils.ts` | Extract `getTimeAgo` utility |
| 2 | `lib/tiers.ts` | Add `bgActive` and `accent` fields to tier config |
| 3 | `components/shared/LogoMark.tsx` | Extract shared logo component |
| 4 | `components/overlay/SortControls.tsx` | Rewrite as dropdown |
| 5 | `components/overlay/SummaryStrip.tsx` | Redesign as MetricsRow with integrated sort |
| 6 | `components/overlay/SuperChatCard.tsx` | Full card redesign with `isActive` prop |
| 7 | `components/overlay/UnreadBelowBanner.tsx` | New unread-below banner component |
| 8 | `components/overlay/OverlayFeed.tsx` | Active card logic, scroll tracking, banner integration |
| 9 | `components/layout/OverlayShell.tsx` | Header redesign, layout restructure, metrics integration |
| 10 | `components/overlay/UndoSnackbar.tsx` | Reposition for new layout |
| 11 | `components/layout/DashboardShell.tsx` | Import shared LogoMark |
| 12 | `styles/globals.css` | Any additional utility classes |
| 13 | `components/renderer-ui.test.tsx` | Update tests for new UI |

Steps 1-3 are independent and can be done in parallel. Steps 4-5 depend on each other (metrics row uses sort dropdown). Steps 6-8 form the card/feed cluster. Step 9 integrates everything. Steps 10-13 are cleanup.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Dropdown sort control may clip outside the overlay window bounds | Use `position: fixed` or check available space and render above/below accordingly |
| IntersectionObserver for "unread below" may fire excessively during fast scroll | Throttle the observer callback or use a simpler scroll-position heuristic |
| Tier color opacity differences may not be visible on all monitors | Test with multiple tier levels and ensure minimum contrast |
| Active card detection may behave unexpectedly with "oldest" or "highest" sort | Always find first unread by array position in the already-sorted list, regardless of sort order |
| Framer Motion layout animations may conflict with the new card sizing changes | Use `layout` prop carefully; prefer `AnimatePresence mode="popLayout"` (already in use) |
| Test file is comprehensive (897 lines) and references current UI text | Methodically update assertions for changed labels, structure, and props |

---

## Files Summary

### New Files (2)
- `src/renderer/src/components/shared/LogoMark.tsx`
- `src/renderer/src/components/overlay/UnreadBelowBanner.tsx`

### Modified Files (10)
- `src/renderer/src/lib/utils.ts`
- `src/renderer/src/lib/tiers.ts`
- `src/renderer/src/components/overlay/SortControls.tsx`
- `src/renderer/src/components/overlay/SummaryStrip.tsx`
- `src/renderer/src/components/overlay/SuperChatCard.tsx`
- `src/renderer/src/components/overlay/OverlayFeed.tsx`
- `src/renderer/src/components/layout/OverlayShell.tsx`
- `src/renderer/src/components/overlay/UndoSnackbar.tsx`
- `src/renderer/src/components/layout/DashboardShell.tsx`
- `src/renderer/src/components/renderer-ui.test.tsx`

### Optionally Modified (1)
- `src/renderer/src/styles/globals.css` (only if custom utility classes are needed)
