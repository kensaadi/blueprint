import { createContext, useContext } from 'react';

export type TwFormCtxValue = {
  submitting: boolean;
  submit: () => Promise<void>;
};

export const TwFormCtx = createContext<TwFormCtxValue | null>(null);

export function useTwFormCtx(): TwFormCtxValue | null {
  return useContext(TwFormCtx);
}
