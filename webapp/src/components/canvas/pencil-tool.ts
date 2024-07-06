import type { CanvasDrawingTool, CanvasPointerEvent, ShapeUpdateHandler, PencilToolConfig } from "./types.js";
import type { FrameAnnotationPath } from "@quickbyte/common";

export class PencilTool implements CanvasDrawingTool {
    private shapeHandler?: ShapeUpdateHandler;
    private shape?: FrameAnnotationPath;
    /**
     * This flag is toggled to skip some of the points from added to the line.
     * It helps reduce the storage size of the line without noticeably affecting
     * the perceived smootheness.
     */
    private skipNextPoint: boolean = true;

    constructor(private config: PencilToolConfig, private shapeId: string) {
    }

    handlePointerStart(event: CanvasPointerEvent) {
        this.initShape(event.pos);
        this.notifyShapeUpdate();
    }

    handlePointerMove(event: CanvasPointerEvent) {
        const shape = this.initShape(event.pos);
        // We skip every other point, effectively reducing
        // the number of points by 50%, to improve efficiency
        // of processing and storing lines.
        if (this.skipNextPoint) {
            this.skipNextPoint = false;
            return;
        }

        const newPoints = [...shape.points, event.pos.x, event.pos.y];
        this.shape!.points = newPoints;
        this.skipNextPoint = true;
        this.notifyShapeUpdate();
    }

    onShapeUpdate(handler: ShapeUpdateHandler) {
        this.shapeHandler = handler;
    }

    private initShape(pos: { x: number, y: number }) {
        this.shape = this.shape || {
            id: this.shapeId,
            type: 'path',
            strokeColor: this.config.strokeColor,
            strokeWidth: this.config.strokeWidth,
            // duplicate the position so it will be a valid line (point)
            // even if no other point is added.
            points: [pos.x, pos.y, pos.x, pos.y],
        };

        return this.shape;
    }

    private notifyShapeUpdate() {
        if (!this.shape) {
            return;
        }
        this.shapeHandler && this.shapeHandler(this.shape);
    }
}