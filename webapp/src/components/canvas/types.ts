import konva from "konva";
import type { FrameAnnotationShape } from '@quickbyte/common';

export interface CanvasPointerEvent {
    stage: konva.Stage;
    pos: Position;
}

export type ShapeUpdateHandler = (shape: FrameAnnotationShape) => any;

export interface CanvasDrawingTool {
    handlePointerStart(event: CanvasPointerEvent): void;
    handlePointerMove(event: CanvasPointerEvent): void;
    onShapeUpdate(handler: ShapeUpdateHandler): void;
}

export interface Position {
    x: number;
    y: number;
}

export type DrawingToolConfig = {
    type: 'pencil',
    config: PencilToolConfig
};

export interface PencilToolConfig {
    strokeColor: string;
    strokeWidth: number;
    shapeId: string;
}