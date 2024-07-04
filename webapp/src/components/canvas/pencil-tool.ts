import { CanvasDrawingTool, CanvasPointerEvent, ShapeUpdateHandler } from "./types.js";
import { FrameAnnotationPath } from "@quickbyte/common";

export interface PencilToolConfig {
    strokeColor: string;
    strokeWidth: number;
}

export class PencilTool implements CanvasDrawingTool {
    private shapeHandler?: ShapeUpdateHandler;
    private shape?: FrameAnnotationPath;

    constructor(private config: PencilToolConfig) {
    }

    handlePointerStart(event: CanvasPointerEvent) {
        this.initShape(event.pos);
        this.notifyShapeUpdate();
    }

    handlePointerMove(event: CanvasPointerEvent) {
        const shape = this.initShape(event.pos);
        const newPoints = [...shape.points, event.pos.x, event.pos.y];
        this.shape.points = newPoints;
        this.notifyShapeUpdate();
    }

    onShapeUpdate(handler: ShapeUpdateHandler) {
        this.shapeHandler = handler;
    }

    private initShape(pos: { x: number, y: number }) {
        this.shape = this.shape || {
            id: 'l1',
            type: 'path',
            strokeColor: this.config.strokeColor,
            strokeWidth: this.config.strokeWidth,
            points: [pos.x, pos.y, pos.x, pos.y],
        };

        return this.shape;
    }

    private notifyShapeUpdate() {
        if (!this.shape) {
            return;
        }
        this.shapeHandler ?? this.shapeHandler(this.shape);
    }
}