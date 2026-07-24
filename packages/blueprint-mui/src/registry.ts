import type { Registry } from '@dashforge/blueprint-core';
import { MuiStack } from './bindings/MuiStack';
import { MuiGrid } from './bindings/MuiGrid';
import { MuiCard } from './bindings/MuiCard';
import { MuiSection } from './bindings/MuiSection';
import { MuiText } from './bindings/MuiText';
import { MuiHeading } from './bindings/MuiHeading';
import { MuiButton } from './bindings/MuiButton';
import { MuiIconButton } from './bindings/MuiIconButton';
import { MuiSubmit } from './bindings/MuiSubmit';
import { MuiAlert } from './bindings/MuiAlert';
import { MuiDivider } from './bindings/MuiDivider';
import { MuiField } from './bindings/MuiField';
import { MuiSelect } from './bindings/MuiSelect';
import { MuiDate } from './bindings/MuiDate';
import { MuiCheckbox } from './bindings/MuiCheckbox';
import { MuiSwitch } from './bindings/MuiSwitch';
import { MuiTextarea } from './bindings/MuiTextarea';
import { MuiNumber } from './bindings/MuiNumber';
import { MuiRadio } from './bindings/MuiRadio';
import { MuiTime } from './bindings/MuiTime';
import { MuiDateTime } from './bindings/MuiDateTime';
import { MuiDateRange } from './bindings/MuiDateRange';
import { MuiAutocomplete } from './bindings/MuiAutocomplete';
import { MuiOtp } from './bindings/MuiOtp';
import { MuiBox } from './bindings/MuiBox';
import { MuiContainer } from './bindings/MuiContainer';
import { MuiBadge } from './bindings/MuiBadge';
import { MuiChip } from './bindings/MuiChip';
import { MuiAvatar } from './bindings/MuiAvatar';
import { MuiTabs } from './bindings/MuiTabs';
import { MuiAccordion } from './bindings/MuiAccordion';
import { MuiTooltip } from './bindings/MuiTooltip';
import { MuiBreadcrumbs } from './bindings/MuiBreadcrumbs';
import { MuiPagination } from './bindings/MuiPagination';
import { MuiCalendar } from './bindings/MuiCalendar';
import { MuiForm } from './formAdapter';

export const muiRegistry: Registry = {
  stack: MuiStack,
  grid: MuiGrid,
  card: MuiCard,
  section: MuiSection,
  text: MuiText,
  heading: MuiHeading,
  button: MuiButton,
  iconButton: MuiIconButton,
  submit: MuiSubmit,
  alert: MuiAlert,
  divider: MuiDivider,
  box: MuiBox,
  container: MuiContainer,
  badge: MuiBadge,
  chip: MuiChip,
  avatar: MuiAvatar,
  tabs: MuiTabs,
  accordion: MuiAccordion,
  tooltip: MuiTooltip,
  breadcrumbs: MuiBreadcrumbs,
  pagination: MuiPagination,
  calendar: MuiCalendar,
  field: MuiField,
  select: MuiSelect,
  date: MuiDate,
  checkbox: MuiCheckbox,
  switch: MuiSwitch,
  textarea: MuiTextarea,
  number: MuiNumber,
  radio: MuiRadio,
  time: MuiTime,
  dateTime: MuiDateTime,
  dateRange: MuiDateRange,
  autocomplete: MuiAutocomplete,
  otp: MuiOtp,
  form: MuiForm,
};
