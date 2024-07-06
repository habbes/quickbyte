import type { Position } from "./types.js";
import type { FrameAnnotationRect } from "@quickbyte/common";
import { BaseDrawingTool } from './base-drawing-tool';

export class RectTool extends BaseDrawingTool<FrameAnnotationRect> {
    protected createShape(pos: Position): FrameAnnotationRect {
        return {
            type: 'rect',
            id: this.shapeId,
            strokeColor: this.config.strokeColor,
            strokeWidth: this.config.strokeWidth,
            x: pos.x,
            y: pos.y,
            width: 1,
            height: 1,
            cornerRadius: 5
        };
    }

    protected updateShape(shape: FrameAnnotationRect, pos: Position): FrameAnnotationRect {
        // the x-distance to the origin is the width
        // the y-distance to the origin is the height
        const height = pos.x - shape.x;
        const width = pos.y - shape.y;
        return {
            ...shape,
            height,
            width
        };
    }
}
