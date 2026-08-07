import { useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { CanvasDesign } from '@occasio/shared';
import { THEMES } from '@occasio/shared';
import { ShapeNode } from './canvas/ShapeNode';
import { TextNode } from './canvas/TextNode';
import { useCanvasTransformer } from './canvas/useCanvasTransformer';
import type { ElementChanges } from '../lib/types';

export interface CanvasRendererProps {
  design: CanvasDesign;
  /** When true, elements are draggable/selectable and a transformer is shown. */
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChangeElement?: (id: string, changes: ElementChanges) => void;
  /** Fired once the stage has painted — the Phase 3 headless render waits on this. */
  onReady?: () => void;
  /** Optional scale so the same design fits smaller preview boxes. */
  scale?: number;
  /** Owner's email, rendered as a fixed non-editable "Sent by" footer. */
  sentBy?: string;
}

const FOOTER_HEIGHT = 40;

/**
 * The single source of truth for turning a CanvasDesign into pixels. The editor
 * uses it interactively; the /render route (Phase 3) uses it statically so the
 * emailed image is identical to what the user designed.
 */
export function CanvasRenderer({
  design,
  interactive = false,
  selectedId = null,
  onSelect,
  onChangeElement,
  onReady,
  scale = 1,
  sentBy,
}: CanvasRendererProps) {
  const theme = THEMES[design.theme];
  const { trRef, register } = useCanvasTransformer(design, selectedId);

  useLayoutEffect(() => {
    onReady?.();
    // Fire once after the first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackgroundClick = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (interactive && e.target === e.target.getStage()) onSelect?.(null);
  };

  return (
    <Stage
      width={design.width * scale}
      height={design.height * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={handleBackgroundClick}
      onTouchStart={handleBackgroundClick}
      style={{ background: '#fff' }}
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={design.width}
          height={design.height}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: design.width, y: design.height }}
          fillLinearGradientColorStops={[0, theme.from, 1, theme.to]}
          listening={false}
        />

        {design.shapes.map((s) => (
          <ShapeNode
            key={s.id}
            el={s}
            interactive={interactive}
            registerRef={register(s.id)}
            onSelect={() => onSelect?.(s.id)}
            onChange={(changes) => onChangeElement?.(s.id, changes)}
          />
        ))}

        {design.texts.map((t) => (
          <TextNode
            key={t.id}
            el={t}
            interactive={interactive}
            registerRef={register(t.id)}
            onSelect={() => onSelect?.(t.id)}
            onChange={(changes) => onChangeElement?.(t.id, changes)}
          />
        ))}

        {interactive && (
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={false}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 10 || newBox.height < 10 ? oldBox : newBox
            }
          />
        )}

        {/* Fixed, non-editable attribution footer (not part of the design). */}
        {sentBy && (
          <>
            <Rect
              x={0}
              y={design.height - FOOTER_HEIGHT}
              width={design.width}
              height={FOOTER_HEIGHT}
              fill="rgba(0,0,0,0.4)"
              listening={false}
            />
            <Text
              x={0}
              y={design.height - FOOTER_HEIGHT}
              width={design.width}
              height={FOOTER_HEIGHT}
              text={`Sent by: ${sentBy}`}
              fontSize={16}
              fontFamily="Arial, sans-serif"
              fill="#ffffff"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </>
        )}
      </Layer>
    </Stage>
  );
}
