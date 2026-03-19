import { useWindowDimensions } from 'react-native';

/** Breakpoint: screens narrower than this are "small" (phone layout). */
export const SMALL_SCREEN_BREAKPOINT = 768;

export function useScreenSize() {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < SMALL_SCREEN_BREAKPOINT;
  return { width, height, isSmallScreen };
}
