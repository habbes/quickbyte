import type { Position } from "./types.js";
import type { FrameAnnotationRect } from "@quickbyte/common";
import { BaseDrawingTool } from './base-drawing-tool';

export class RectTool extends BaseDrawingTool<FrameAnnotationRect> {
    /**
     * The direction in which we extend the width and height,
     * 1 represents left to right and top to bottom respectively,
     * -1 represents the opposite direction.
     */
    private dir = { x: 1, y: 1 };
    /**
     * The position from which to extend the width or height.
     * This is used when the direction is negative, since it goes
     * against the natural direction of the rectangle. We use
     * the anchor to adjust the width.
     */
    private anchor = { x: 0, y: 0 };

    protected createShape(pos: Position): FrameAnnotationRect {
        this.anchor = pos;

        return {
            type: 'rect',
            id: this.shapeId,
            strokeColor: this.config.color,
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
        if (width * this.dir.x < 0) {
            // flip direction
            this.dir.x = -1 * this.dir.x;
            // set this position to be the new anchor point
            this.anchor.x = pos.x;
        }

        if (this.dir.x < 0) {
            // Here we're extending the rectangle towards the left
            // Since the position is also moving towards the left
            // we use the last saved anchor point so that we can update
            // the width towards the right of the new position
            x = pos.x;
            width = this.anchor.x - x;
        }
        
        let y = shape.y;
        if (height * this.dir.y < 0) {
            this.dir.y = -1 * this.dir.y;
            this.anchor.y = pos.y;
        }

        if (this.dir.y < 0) {
            y = pos.y;
            height = this.anchor.y - y;
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
