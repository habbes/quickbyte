import konva from "konva";
import { FrameAnnotationShape } from '@quickbyte/common';

export interface CanvasPointerEvent {
    stage: konva.Stage;
    pointerPosition: { x: number, y: number };
}

export type ShapeUpdateHandler = (shape: FrameAnnotationShape) => any;

export interface CanvasDrawingTool {
    handlePointerDown(event: CanvasPointerEvent);
    handlePointerMove(event: CanvasPointerEvent);
    onShapeUpdate(handler: ShapeUpdateHandler);
}