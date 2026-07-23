import { useLayoutEffect, useRef } from 'react';
import { Text } from 'react-konva';
import type Konva from 'konva';
import type { TextElement } from '@occasio/shared';
import type { ElementChanges } from '../../lib/types';

interface TextNodeProps {
  el: TextElement;
  interactive: boolean;
  registerRef: (node: Konva.Node | null) => void;
  onSelect: () => void;
  onChange: (changes: ElementChanges) => void;
}

/** Renders one text element, centered on (x, y) via its measured half-size. */
export function TextNode({
  el,
  interactive,
  registerRef,
  onSelect,
  onChange,
}: TextNodeProps) {
  const ref = useRef<Konva.Text>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.offsetX(node.width() / 2);
    node.offsetY(node.height() / 2);
    node.getLayer()?.batchDraw();
  }, [el.text, el.fontSize, el.fontFamily, el.fontStyle]);

  return (
    <Text
      ref={(node) => {
        ref.current = node;
        registerRef(node);
      }}
      x={el.x}
      y={el.y}
      text={el.text}
      fontSize={el.fontSize}
      fontFamily={el.fontFamily}
      fontStyle={el.fontStyle ?? 'normal'}
      fill={el.fill}
      align="center"
      draggable={interactive}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    />
  );
}
