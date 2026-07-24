import { useState } from 'react';
import { Pagination } from '@dashforge/tw';

type Props = {
  totalCount: number;
  defaultPage?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  siblingCount?: number;
  boundaryCount?: number;
  showFirstLast?: boolean;
  showJumpInput?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Defaults-only pagination — `[page, setPage]` lives inside the
 * binding via useState. For fully-controlled behavior (so that
 * the consumer can react to page changes), use a slot override.
 *
 * Note: tw Pagination's `size` accepts 'sm' | 'md' (not 'lg');
 * we cap 'lg' → 'md' for parity with the catalog enum.
 */
const SIZE_MAP: Record<NonNullable<Props['size']>, 'sm' | 'md'> = {
  sm: 'sm', md: 'md', lg: 'md',
};

export function TwPagination({
  totalCount,
  defaultPage = 1,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  siblingCount,
  boundaryCount,
  showFirstLast,
  showJumpInput,
  disabled,
  variant = 'default',
  size = 'md',
}: Props) {
  const [page, setPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      pageSizeOptions={pageSizeOptions}
      siblingCount={siblingCount}
      boundaryCount={boundaryCount}
      showFirstLast={showFirstLast}
      showJumpInput={showJumpInput}
      disabled={disabled}
      variant={variant}
      size={SIZE_MAP[size]}
    />
  );
}
