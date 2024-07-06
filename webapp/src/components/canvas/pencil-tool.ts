import type { Position } from "./types.js";
import type { FrameAnnotationPath } from "@quickbyte/common";
import { BaseDrawingTool } from "./base-drawing-tool.js";

export class PencilTool extends BaseDrawingTool<FrameAnnotationPath> {
    /**
     * This flag is toggled to skip some of the points from added to the line.
     * It helps reduce the storage size of the line without noticeably affecting
     * the perceived smootheness.
     */
    private skipNextPoint: boolean = true;

    protected override createShape(pos: Position): FrameAnnotationPath {
        return {
            id: this.shapeId,
            type: 'path',
            strokeColor: this.config.strokeColor,
            strokeWidth: this.config.strokeWidth,
            // duplicate the position so it will be a valid line (point)
            // even if no other point is added.
            points: [pos.x, pos.y, pos.x, pos.y],
        };
    }

    protected override updateShape(shape: FrameAnnotationPath, pos: Position): FrameAnnotationPath {
        const newPoints = [...shape.points, pos.x, pos.y];
        const newShape = { ...shape, points: newPoints };
        this.skipNextPoint = true;
        return newShape;
    }

    protected override shouldSkipUpdate(): boolean {
        // We skip every other point, effectively reducing
        // the number of points by 50%, to improve efficiency
        // of processing and storing lines.
        const skip = this.skipNextPoint;
        this.skipNextPoint = !skip;
        return skip;
    }
}