import type { Position } from "./types.js";
import type { FrameAnnotationRect } from "@quickbyte/common";
import { BaseDrawingTool } from './base-drawing-tool';

export class RectTool extends BaseDrawingTool<FrameAnnotationRect> {
    /**
     * The direction in which we extend the width
     */
    private xDirection = 1;
    /**
     * The direction in which we extends the height
     */
    private yDirection = 1;
    private xAnchor = 0;
    private yAnchor = 0;

    protected createShape(pos: Position): FrameAnnotationRect {
        this.xAnchor = pos.x;
        this.yAnchor = pos.y;

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
        
        let width = pos.x - shape.x;
        let height = pos.y - shape.y;

        // if a distance is different from the current direction then we flip the shape along that axis
        let x = shape.x
        if (width * this.xDirection < 0) {
            // flip direction
            this.xDirection = -1 * this.xDirection;
            this.xAnchor = pos.x;
        }

        if (this.xDirection < 0) {
            // to extend the shape towards the left,
            // we have to the rectangle by the same amount we increase the width
            x = pos.x;
            width = this.xAnchor - x;
        }
        
        let y = shape.y;
        if (height * this.yDirection < 0) {
            this.yDirection = -1 * this.yDirection;
            this.yAnchor = pos.y;
        }

        if (this.yDirection < 0) {
            y = pos.y;
            height = this.yAnchor - y;
        }
    
        return {
            ...shape,
            x,
            y,
            height: Math.abs(height),
            width: Math.abs(width)
        };
    }
}
