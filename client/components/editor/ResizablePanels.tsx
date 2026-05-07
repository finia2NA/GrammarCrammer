import React, { useState, useRef } from 'react';
import { View } from 'react-native';
import { ResizeHandle } from './ResizeHandle';

interface ResizablePanelsProps {
  children: React.ReactNode[];
  /** Minimum width per panel as a fraction of the container. Default: 0.1 (10%) */
  minFlex?: number;
}

/**
 * Lays out N panels side-by-side with draggable dividers between each pair.
 * Panels start at equal width. Dragging a handle redistributes flex between
 * the two adjacent panels while keeping all others unchanged.
 */
export function ResizablePanels({ children, minFlex = 0.1 }: ResizablePanelsProps) {
  const count = children.length;
  const [flexValues, setFlexValues] = useState<number[]>(() => Array(count).fill(1 / count));

  const containerWidth = useRef(0);
  // Captured at drag-start so mid-drag window resizes don't corrupt the math
  const flexAtDragStart = useRef<number[]>([]);
  const widthAtDragStart = useRef(0);

  return (
    <View
      style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}
      onLayout={e => { containerWidth.current = e.nativeEvent.layout.width; }}
    >
      {children.map((child, i) => (
        <React.Fragment key={i}>
          <View style={{ flex: flexValues[i], overflow: 'hidden' }}>
            {child}
          </View>
          {i < count - 1 && (
            <ResizeHandle
              onDragStart={() => {
                flexAtDragStart.current = [...flexValues];
                widthAtDragStart.current = containerWidth.current;
              }}
              onDelta={(dx) => {
                const total = widthAtDragStart.current;
                if (total <= 0) return;
                // Convert pixel delta → flex delta (both are fractions of total width)
                const df = dx / total;
                const combined = flexAtDragStart.current[i] + flexAtDragStart.current[i + 1];
                const newLeft = Math.max(minFlex, flexAtDragStart.current[i] + df);
                const newRight = Math.max(minFlex, combined - newLeft);
                setFlexValues(prev => {
                  const next = [...prev];
                  next[i] = newLeft;
                  next[i + 1] = newRight;
                  return next;
                });
              }}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}
