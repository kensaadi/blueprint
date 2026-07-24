import { Avatar } from '@mui/material';

type Color = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded' | 'square';
  color?: Color;
};

const SIZE_PX: Record<NonNullable<Props['size']>, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

const SHAPE_RADIUS: Record<NonNullable<Props['shape']>, string | number> = {
  circle: '50%',
  rounded: 8,
  square: 0,
};

const BG_BY_COLOR: Record<Color, string> = {
  neutral: 'grey.300',
  primary: 'primary.light',
  secondary: 'secondary.light',
  success: 'success.light',
  warning: 'warning.light',
  danger: 'error.light',
  info: 'info.light',
};

function initials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
}

export function MuiAvatar({
  src, name, size = 'md', shape = 'circle', color = 'neutral',
}: Props) {
  const px = SIZE_PX[size];
  const sx = {
    width: px,
    height: px,
    fontSize: Math.round(px * 0.4),
    borderRadius: SHAPE_RADIUS[shape],
    bgcolor: src ? undefined : BG_BY_COLOR[color],
    color: 'common.black',
  };
  return (
    <Avatar src={src} alt={name} sx={sx}>
      {!src && initials(name)}
    </Avatar>
  );
}
