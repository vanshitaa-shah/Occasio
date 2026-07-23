import { Rect, Circle, Star, Path } from 'react-konva';
import type Konva from 'konva';
import type { ShapeElement } from '@occasio/shared';
import { HEART_PATH, HEART_VIEW } from '../../lib/shapes';
import type { ElementChanges } from '../../lib/types';

interface ShapeNodeProps {
  el: ShapeElement;
  interactive: boolean;
  registerRef: (node: Konva.Node | null) => void;
  onSelect: () => void;
  onChange: (changes: ElementChanges) => void;
}

/**
 * Renders one shape. Anchored by its CENTER (x, y) for uniform drag/transform.
 * On transform we bake the scale back into width/height and reset scale to 1.
 */
export function ShapeNode({
  el,
  interactive,
  registerRef,
  onSelect,
  onChange,
}: ShapeNodeProps) {
  const common = {
    ref: registerRef,
    draggable: interactive,
    rotation: el.rotation ?? 0,
    fill: el.fill,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      onChange({ x: e.target.x(), y: e.target.y() }),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(10, el.width * scaleX),
        height: Math.max(10, el.height * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  switch (el.kind) {
    case 'rect':
      return (
        <Rect
          {...common}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          offsetX={el.width / 2}
          offsetY={el.height / 2}
          cornerRadius={8}
        />
      );
    case 'circle':
      return <Circle {...common} x={el.x} y={el.y} radius={el.width / 2} />;
    case 'star':
      return (
        <Star
          {...common}
          x={el.x}
          y={el.y}
          numPoints={5}
          innerRadius={el.width / 4}
          outerRadius={el.width / 2}
        />
      );
    case 'heart':
      return (
        <Path
          {...common}
          x={el.x}
          y={el.y}
          data={HEART_PATH}
          offsetX={HEART_VIEW.w / 2}
          offsetY={HEART_VIEW.h / 2}
          scaleX={el.width / HEART_VIEW.w}
          scaleY={el.height / HEART_VIEW.h}
        />
      );
    default:
      return null;
  }
}
