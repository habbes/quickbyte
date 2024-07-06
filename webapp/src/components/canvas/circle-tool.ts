import type { Position } from "./types.js";
import type { FrameAnnotationCircle } from "@quickbyte/common";
import { BaseDrawingTool } from './base-drawing-tool.js';

export class CircleTool extends BaseDrawingTool<FrameAnnotationCircle> {
    protected override createShape(pos: Position): FrameAnnotationCircle {
        return {
            id: this.shapeId,
            type: 'circle',
            x: pos.x,
            y: pos.y,
            radius: 1,
            strokeColor: this.config.strokeColor,
            strokeWidth: this.config.strokeWidth
        };
    }

    protected override updateShape(shape: FrameAnnotationCircle, pos: Position): FrameAnnotationCircle {
        const radius = Math.sqrt(Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2));
        const newShape = {
            ...shape,
            radius
        };

        return newShape;
    }
}
