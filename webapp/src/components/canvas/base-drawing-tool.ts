import type { CanvasDrawingTool, CanvasPointerEvent, ToolConfig, Position, ShapeUpdateHandler } from "./types.js";
import { FrameAnnotationShape } from "@quickbyte/common";

export abstract class BaseDrawingTool<T extends FrameAnnotationShape> implements CanvasDrawingTool {
    private shape?: T;

    constructor(
        protected readonly config: ToolConfig,
        protected readonly shapeId: string,
        private shapeHandler: ShapeUpdateHandler
    ) {}

    handlePointerStart(event: CanvasPointerEvent): void {
        this.initShape(event.pos);
        this.notifyShapeUpdate();
    }

    handlePointerMove(event: CanvasPointerEvent): void {
        const pos = event.pos;
        const shape = this.initShape(pos);
        this.shape = this.updateShape(shape, pos);
        this.notifyShapeUpdate();
    }

    onShapeUpdate(handler: ShapeUpdateHandler): void {
        this.shapeHandler = handler;
    }

    protected abstract createShape(pos: Position): T;
    protected abstract updateShape(oldShape: T, newPos: Position): T;
    
    private initShape(pos: Position) {
        if (!this.shape) {
            this.shape = this.createShape(pos);
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