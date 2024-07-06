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

export type DrawingToolType = DrawingToolConfig["type"];

export type DrawingToolConfig = {
    type: 'pencil',
    config: ToolConfig
} | {
    type: 'circle',
    config: ToolConfig
};

export interface ToolConfig {
    strokeColor: string;
    strokeWidth: number;
}