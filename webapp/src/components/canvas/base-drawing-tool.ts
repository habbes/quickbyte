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
        if (this.shouldSkipUpdate(pos)) {
            return;
        }

        const shape = this.initShape(pos);
        this.shape = this.updateShape(shape, pos);
        this.notifyShapeUpdate();
    }

    onShapeUpdate(handler: ShapeUpdateHandler): void {
        this.shapeHandler = handler;
    }

    /**
     * Determines to skip a shape update operation.
     * This is called exactly once before each update attempt
     * (per pointer move). Implementations can use this
     * to optimize update operations by skipping unnecessary updates.
     */
    protected shouldSkipUpdate(pos: Position): boolean {
        return false;
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