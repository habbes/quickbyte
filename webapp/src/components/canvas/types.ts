import konva from "konva";
import { FrameAnnotationShape } from '@quickbyte/common';

export interface CanvasPointerEvent {
    stage: konva.Stage;
    pos: { x: number, y: number };
}

export type ShapeUpdateHandler = (shape: FrameAnnotationShape) => any;

export interface CanvasDrawingTool {
    handlePointerStart(event: CanvasPointerEvent);
    handlePointerMove(event: CanvasPointerEvent);
    onShapeUpdate(handler: ShapeUpdateHandler);
}