import { createContext, useContext } from 'react';
import type { MutableRefObject } from 'react';

export const PageSheetScrollContext = createContext<MutableRefObject<boolean> | null>(null);

export function usePageSheetScrolling(): MutableRefObject<boolean> | null {
  return useContext(PageSheetScrollContext);
}
