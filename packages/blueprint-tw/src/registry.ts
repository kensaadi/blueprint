import type { Registry } from '@dashforge/blueprint-core';
import { TwStack } from './bindings/TwStack';
import { TwGrid } from './bindings/TwGrid';
import { TwCard } from './bindings/TwCard';
import { TwSection } from './bindings/TwSection';
import { TwText } from './bindings/TwText';
import { TwHeading } from './bindings/TwHeading';
import { TwButton } from './bindings/TwButton';
import { TwIconButton } from './bindings/TwIconButton';
import { TwSubmit } from './bindings/TwSubmit';
import { TwAlert } from './bindings/TwAlert';
import { TwDivider } from './bindings/TwDivider';
import { TwField } from './bindings/TwField';
import { TwSelect } from './bindings/TwSelect';
import { TwDate } from './bindings/TwDate';
import { TwCheckbox } from './bindings/TwCheckbox';
import { TwSwitch } from './bindings/TwSwitch';
import { TwTextarea } from './bindings/TwTextarea';
import { TwNumber } from './bindings/TwNumber';
import { TwRadio } from './bindings/TwRadio';
import { TwTime } from './bindings/TwTime';
import { TwDateTime } from './bindings/TwDateTime';
import { TwDateRange } from './bindings/TwDateRange';
import { TwAutocomplete } from './bindings/TwAutocomplete';
import { TwOtp } from './bindings/TwOtp';
import { TwBox } from './bindings/TwBox';
import { TwContainer } from './bindings/TwContainer';
import { TwBadge } from './bindings/TwBadge';
import { TwChip } from './bindings/TwChip';
import { TwAvatar } from './bindings/TwAvatar';
import { TwTabs } from './bindings/TwTabs';
import { TwAccordion } from './bindings/TwAccordion';
import { TwTooltip } from './bindings/TwTooltip';
import { TwBreadcrumbs } from './bindings/TwBreadcrumbs';
import { TwPagination } from './bindings/TwPagination';
import { TwCalendar } from './bindings/TwCalendar';
import { TwForm } from './formAdapter';

export const twRegistry: Registry = {
  stack: TwStack,
  grid: TwGrid,
  card: TwCard,
  section: TwSection,
  text: TwText,
  heading: TwHeading,
  button: TwButton,
  iconButton: TwIconButton,
  submit: TwSubmit,
  alert: TwAlert,
  divider: TwDivider,
  box: TwBox,
  container: TwContainer,
  badge: TwBadge,
  chip: TwChip,
  avatar: TwAvatar,
  tabs: TwTabs,
  accordion: TwAccordion,
  tooltip: TwTooltip,
  breadcrumbs: TwBreadcrumbs,
  pagination: TwPagination,
  calendar: TwCalendar,
  field: TwField,
  select: TwSelect,
  date: TwDate,
  checkbox: TwCheckbox,
  switch: TwSwitch,
  textarea: TwTextarea,
  number: TwNumber,
  radio: TwRadio,
  time: TwTime,
  dateTime: TwDateTime,
  dateRange: TwDateRange,
  autocomplete: TwAutocomplete,
  otp: TwOtp,
  form: TwForm,
};
