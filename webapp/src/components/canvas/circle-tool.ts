import type { CanvasDrawingTool, CanvasPointerEvent, ShapeUpdateHandler, CircleToolConfig, Position } from "./types.js";
import type { FrameAnnotationCircle } from "@quickbyte/common";

export class CircleTool implements CanvasDrawingTool {
    private shape?: FrameAnnotationCircle;

    constructor(
        private config: CircleToolConfig,
        private shapeId: string,
        private shapeHandler: ShapeUpdateHandler) 
    {
    }

    handlePointerStart(event: CanvasPointerEvent): void {
        this.initShape(event.pos);
        this.notifyShapeUpdate();
    }

    handlePointerMove(event: CanvasPointerEvent): void {
        // compute the distance between the current position
        // and the origin, and use that as the radius
        const pos = event.pos;
        const shape = this.initShape(pos);
        
        const radius = Math.sqrt(Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2));
        this.shape = {
            ...shape,
            radius
        };

        this.notifyShapeUpdate();
    }

    onShapeUpdate(handler: ShapeUpdateHandler): void {
        this.shapeHandler = handler;
    }

    private initShape(pos: Position) {
        if (!this.shape) {
            this.shape = {
                id: this.shapeId,
                type: 'circle',
                x: pos.x,
                y: pos.y,
                radius: 1,
                strokeColor: this.config.strokeColor,
                strokeWidth: this.config.strokeWidth
            };
        }

        return this.shape;
    }

    private notifyShapeUpdate() {
        if (!this.shape) {
            return;
        }

        this.shapeHandler && this.shapeHandler(this.shape);
    }
}