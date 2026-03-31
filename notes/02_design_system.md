# Design System

## Product Tone
ChatControl is intentionally dark, quiet, and utility-first. The dashboard is meant to feel stable and operational; the overlay is meant to stay legible at a glance while creators stream.

## Visual Principles
- Low-distraction dark background
- Bright accent color reserved for active controls, totals, and statuses
- Rounded cards and soft borders instead of dense table layouts
- Short labels, compact controls, and minimal chrome in the overlay

## Primary Surfaces
### Dashboard
- Sidebar navigation for stream, saved, leaderboard, history, and settings
- Centered content column with card-based sections
- Summary card appears above the stream view when a session has just ended

### Overlay
- Frameless window with compact title bar
- Summary strip for total, unread, and saved counts
- Scrollable inbox feed with sort controls in the footer
- Lock/collapse controls in the title bar

## Component Inventory
- `DashboardShell`
- `OverlayShell`
- `StreamInfo`
- `SavedItems`
- `DonorLeaderboard`
- `SessionHistory`
- `SettingsPanel`
- `SuperChatCard`
- `SummaryStrip`
- `SortControls`
- `StreamSummary`

## Motion
- Framer Motion is used for card entry and list reordering in the feed
- Undo feedback is transient and lightweight
- There is no heavy page animation or route transition system

## Current Constraints
- Dark theme only
- No accessibility theme variants yet
- No large-session virtualization yet for extremely long feeds
