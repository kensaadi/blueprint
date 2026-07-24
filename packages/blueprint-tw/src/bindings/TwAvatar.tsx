import { Avatar } from '@dashforge/tw';

type Color = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded' | 'square';
  color?: Color;
};

export function TwAvatar({
  src, name, size = 'md', shape = 'circle', color = 'neutral',
}: Props) {
  return (
    <Avatar
      src={src}
      name={name}
      size={size}
      shape={shape}
      color={color}
    />
  );
}
