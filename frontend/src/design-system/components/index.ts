/**
 * COMPONENT LIBRARY — the full catalog. Every component is token-driven,
 * accessible, dark-mode + RTL ready, and animated with the shared motion system.
 * Import from `@/design-system` (the barrel) rather than deep paths.
 */

// Primitives / forms
export * from './Button';
export { Input, inputVariants, type InputProps } from './Input';
export { Textarea, type TextareaProps } from './Textarea/Textarea';
export { Field, useField, useFieldControlProps, type FieldProps } from './Field/Field';
export { Checkbox, type CheckboxProps } from './Checkbox/Checkbox';
export { RadioGroup, RadioGroupItem } from './Radio/Radio';
export { Switch, type SwitchProps } from './Switch/Switch';
export { OTPInput, type OTPInputProps } from './OTPInput/OTPInput';
export {
  Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator,
} from './Select/Select';
export { Combobox, type ComboboxOption, type ComboboxProps } from './Combobox/Combobox';
export { Search, type SearchProps } from './Search/Search';

// Typography
export { Heading, Text, type HeadingProps, type TextProps } from './Typography/Typography';

// Data display
export { Badge, badgeVariants, type BadgeProps } from './Badge/Badge';
export { Avatar, AvatarGroup, type AvatarProps } from './Avatar/Avatar';
export { Card, cardVariants, type CardProps } from './Card/Card';
export { StatCard, MetricCard, type StatCardProps, type MetricCardProps } from './StatCard/StatCard';
export { Timeline, type TimelineItem } from './Timeline/Timeline';
export {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption,
} from './Table/Table';
export { Pagination, type PaginationProps } from './Pagination/Pagination';
export { Breadcrumb, type BreadcrumbProps, type Crumb } from './Breadcrumb/Breadcrumb';
export { QRCode, type QRCodeProps } from './QRCode/QRCode';
export { ChartWrapper, chartColors, type ChartWrapperProps } from './ChartWrapper/ChartWrapper';

// Feedback / status
export { Spinner, type SpinnerProps } from './Spinner/Spinner';
export { Skeleton, SkeletonText, type SkeletonProps } from './Skeleton/Skeleton';
export { Progress, CircularProgress, type ProgressProps, type CircularProgressProps } from './Progress/Progress';
export { LoadingOverlay, type LoadingOverlayProps } from './LoadingOverlay/LoadingOverlay';
export { StateShell, EmptyState, ErrorState, OfflineState, type StateShellProps, type EmptyStateProps } from './States/States';
export { Toaster, toast } from './Toast/Toast';

// Overlays
export {
  Dialog, DialogTrigger, DialogClose, DialogPortal, DialogOverlay, DialogContent,
  DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription, type DialogContentProps,
} from './Dialog/Dialog';
export {
  Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, DrawerTitle, DrawerDescription, type DrawerContentProps,
} from './Drawer/Drawer';
export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent } from './Popover/Popover';
export {
  Dropdown, DropdownTrigger, DropdownGroup, DropdownSub, DropdownRadioGroup, DropdownContent,
  DropdownItem, DropdownLabel, DropdownSeparator, type DropdownItemProps,
} from './Dropdown/Dropdown';
export { Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent } from './Tooltip/Tooltip';
export { CommandPalette, useCommandShortcut, type CommandItem, type CommandGroup, type CommandPaletteProps } from './CommandPalette/CommandPalette';

// Disclosure / navigation
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs/Tabs';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion/Accordion';
export { Separator, type SeparatorProps } from './Separator/Separator';
export { ThemeToggle, ThemeToggleButton } from './ThemeToggle/ThemeToggle';
