import { useState } from 'react';
import { Pagination, Box, Select, MenuItem, Typography } from '@mui/material';

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

const SIZE_MAP: Record<NonNullable<Props['size']>, 'small' | 'medium' | 'large'> = {
  sm: 'small', md: 'medium', lg: 'large',
};

export function MuiPagination({
  totalCount,
  defaultPage = 1,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  siblingCount = 1,
  boundaryCount = 1,
  showFirstLast = true,
  disabled,
  variant = 'default',
  size = 'md',
}: Props) {
  const [page, setPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, width: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        Showing {start}–{end} of {totalCount}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {variant === 'default' && (
          <>
            <Typography variant="body2" color="text.secondary">Per page</Typography>
            <Select
              value={pageSize}
              size="small"
              disabled={disabled}
              inputProps={{ 'aria-label': 'items per page' }}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {pageSizeOptions.map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
          </>
        )}
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, p) => setPage(p)}
          siblingCount={siblingCount}
          boundaryCount={boundaryCount}
          showFirstButton={showFirstLast}
          showLastButton={showFirstLast}
          disabled={disabled}
          size={SIZE_MAP[size]}
        />
      </Box>
    </Box>
  );
}
