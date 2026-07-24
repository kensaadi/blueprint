import { createContext, useContext } from 'react';

export type MuiFormCtxValue = {
  submitting: boolean;
  submit: () => Promise<void>;
};

export const MuiFormCtx = createContext<MuiFormCtxValue | null>(null);

export function useMuiFormCtx(): MuiFormCtxValue | null {
  return useContext(MuiFormCtx);
}
