import type { Position } from "./types.js";
import type { FrameAnnotationText } from "@quickbyte/common";
import { BaseDrawingTool } from './base-drawing-tool';

export class TextTool extends BaseDrawingTool<FrameAnnotationText> {
    protected override createShape(pos: Position): FrameAnnotationText {
        return {
            id: this.shapeId,
            type: 'text',
            x: pos.x,
            y: pos.y,
            text: 'Enter text',
            color: this.config.strokeColor,
            fontFamily: 'Calibri',
            fontSize: 14,
            width: 200
        };
    }

    protected override updateShape(shape: FrameAnnotationText, pos: Position): FrameAnnotationText {
        return {
            ...shape,
            x: pos.x,
            y: pos.y
        }
    }
}
