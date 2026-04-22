import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimatedCollapsibleProps {
  expanded: boolean;
  children: ReactNode;
  duration?: number;
  keepMounted?: boolean;
  maxExpandedHeight?: number;
}

/**
 * Generic animated collapse container for expanding/collapsing sections.
 */
export function AnimatedCollapsible({
  expanded,
  children,
  duration = 220,
  keepMounted = true,
  maxExpandedHeight = 10000,
}: AnimatedCollapsibleProps) {
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [renderContent, setRenderContent] = useState(expanded || keepMounted);

  useEffect(() => {
    let cancelled = false;

    if (expanded) {
      setRenderContent(true);
    }

    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (!cancelled && !expanded && !keepMounted) {
        setRenderContent(false);
      }
    });

    return () => {
      cancelled = true;
      progress.stopAnimation();
    };
  }, [expanded, duration, keepMounted, progress]);

  return (
    <Animated.View
      style={{
        overflow: 'hidden',
        maxHeight: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, maxExpandedHeight],
        }),
        opacity: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
        transform: [{
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-4, 0],
          }),
        }],
      }}
    >
      {renderContent ? children : null}
    </Animated.View>
  );
}
