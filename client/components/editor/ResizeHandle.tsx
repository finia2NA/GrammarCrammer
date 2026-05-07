import { useRef, useState } from 'react';
import { View, PanResponder, Platform } from 'react-native';
import { useColors } from '@/constants/theme';

interface ResizeHandleProps {
  /** Called once when a drag begins. */
  onDragStart?: () => void;
  /** Called continuously while dragging with the pixel delta from drag start. */
  onDelta: (dx: number) => void;
}

/**
 * A vertical drag handle for resizing adjacent panels.
 * Works on web (pointer events) and native (PanResponder).
 */
export function ResizeHandle({ onDragStart, onDelta }: ResizeHandleProps) {
  const c = useColors();
  const [isDragging, setIsDragging] = useState(false);

  // Web: pointer events — fast and reliable for mouse + Apple Pencil
  function onResponderGrantWeb(e: any) {
    const startX: number = e.nativeEvent.clientX ?? e.nativeEvent.pageX;
    onDragStart?.();
    setIsDragging(true);

    function onPointerMove(ev: PointerEvent) {
      ev.preventDefault();
      onDelta(ev.clientX - startX);
    }
    function onPointerUp() {
      setIsDragging(false);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  // Native: PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { onDragStart?.(); setIsDragging(true); },
      onPanResponderMove: (_, { dx }) => onDelta(dx),
      onPanResponderRelease: () => setIsDragging(false),
      onPanResponderTerminate: () => setIsDragging(false),
    })
  ).current;

  const dragProps = Platform.OS === 'web'
    ? { onStartShouldSetResponder: () => true, onResponderGrant: onResponderGrantWeb }
    : panResponder.panHandlers;

  return (
    <View
      {...dragProps}
      style={{
        width: 6,
        cursor: 'col-resize',
        backgroundColor: isDragging ? c.primary : c.background_muted,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      } as any}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: isDragging ? c.primary_foreground : c.primary,
            marginVertical: 2,
          }}
        />
      ))}
    </View>
  );
}
