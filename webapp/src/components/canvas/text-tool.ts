import type { Position } from "./types.js";
import type { FrameAnnotationText } from "@quickbyte/common";
import { BaseDrawingTool } from './base-drawing-tool';
import { FONT_FAMILIES } from "./canvas-helpers";

export class TextTool extends BaseDrawingTool<FrameAnnotationText> {
    protected override createShape(pos: Position): FrameAnnotationText {
        return {
            id: this.shapeId,
            type: 'text',
            x: pos.x,
            y: pos.y,
            text: '',
            color: this.config.color,
            fontFamily: FONT_FAMILIES[0],
            fontSize: 24,
            lineHeight: 1,
            width: 300,
            backgroundColor: 'transparent'
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
