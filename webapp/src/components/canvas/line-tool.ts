import type { Position } from "./types.js";
import type { FrameAnnotationLine } from "@quickbyte/common";
import { BaseDrawingTool } from './base-drawing-tool';

export class LineTool extends BaseDrawingTool<FrameAnnotationLine> {

    protected override createShape(pos: Position): FrameAnnotationLine {
        return {
            id: this.shapeId,
            type: 'line',
            strokeColor: this.config.strokeColor,
            strokeWidth: this.config.strokeWidth,
            x1: pos.x,
            y1: pos.y,
            x2: pos.x,
            y2: pos.y
        };
    };

    protected override updateShape(shape: FrameAnnotationLine, pos: Position): FrameAnnotationLine {
        return {
            ...shape,
            x2: pos.x,
            y2: pos.y
        };
    }
}