/**
 * components/ui/index.ts — JTradePilot Operator Console UI Kit
 *
 * Import from here for all shared UI primitives. Every page and panel should
 * build exclusively from these building blocks to stay consistent.
 *
 * Core console units:
 *   Panel            — titled container (the fundamental layout unit)
 *   StatTile         — large mono metric display
 *   DataTable        — dense, monospace, sortable table
 *
 * Navigation / flow control:
 *   Tabs             — horizontal tab switcher
 *   SegmentedControl — compact toggle ($/R, timeframe, mode)
 *
 * Form primitives:
 *   Field            — accessible label + hint + error wrapper
 *   Input            — text/number input
 *   SelectInput      — styled select
 *   Textarea         — multiline input
 *   Checkbox         — checkbox with label
 *   ToggleSwitch     — boolean on/off toggle
 *   Toggle           — alias for ToggleSwitch
 *
 * Feedback / status:
 *   Badge            — status chip (profit/loss/warning/info/neutral)
 *   EmptyState       — empty section placeholder
 *   Skeleton         — loading placeholder
 *   Sparkline        — tiny inline trend chart
 *
 * Overlays:
 *   Button           — primary / secondary / danger / link
 *   Modal            — centered overlay dialog
 *   Drawer           — right-side slide-in panel
 *   DropdownMenu     — positioned dropdown
 *   Tooltip          — hover tooltip
 *   PortalTooltip    — portal-rendered tooltip (avoids overflow clipping)
 *   SelectableCard   — clickable card with selection state
 *   FileDropzone     — drag-and-drop file upload area
 */

// ── Core console units ────────────────────────────────────────────────────────
export { default as Panel } from './Panel';
export { default as StatTile } from './StatTile';
export { default as DataTable } from './DataTable';
export type { TableColumn } from './DataTable';

// ── Navigation / flow control ─────────────────────────────────────────────────
export { default as Tabs } from './Tabs';
export type { Tab } from './Tabs';
export { default as SegmentedControl } from './SegmentedControl';
export type { Segment } from './SegmentedControl';

// ── Form primitives ───────────────────────────────────────────────────────────
export { default as Field } from './Field';
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as SelectInput } from './SelectInput';
export { default as Textarea } from './Textarea';
export { default as Checkbox } from './Checkbox';
export { default as ToggleSwitch } from './ToggleSwitch';
export { default as Toggle } from './ToggleSwitch';  // alias

// ── Feedback / status ─────────────────────────────────────────────────────────
export { default as Badge } from './Badge';
export type { BadgeVariant, BadgeSize } from './Badge';
export { default as EmptyState } from './EmptyState';
export { default as Skeleton } from './Skeleton';
export { default as Sparkline } from './Sparkline';

// ── Overlays ─────────────────────────────────────────────────────────────────
export { default as Modal } from './Modal';
export { default as Drawer } from './Drawer';
export { DropdownMenu } from './DropdownMenu';
export { default as Tooltip } from './Tooltip';
export { default as PortalTooltip } from './PortalTooltip';
export { default as SelectableCard } from './SelectableCard';
export { default as FileDropzone } from './FileDropzone';
