import type { Position, DrawingToolConfig, CanvasDrawingTool, ShapeUpdateHandler } from "./types.js";
import type {
    FrameAnnotationShape,
    FrameAnnotationPath,
FrameAnnotationCircle
} from '@quickbyte/common';
import konva from "konva";
import { PencilTool } from './pencil-tool.js';


/**
 * Lower bound for stroke width to prevent the strokes
 * from being too small to see on small screens after scaling.
 */
const MIN_STROKE_WIDTH = 3;

export function createDrawingTool(shapeId: string, config: DrawingToolConfig, onShapeUpdate: ShapeUpdateHandler): CanvasDrawingTool {
    switch(config.type) {
        case 'pencil':
            const tool = new PencilTool(config.config, shapeId);
            tool.onShapeUpdate(onShapeUpdate);
            return tool;
    }
}

export function scalePosition(pos: Position, factor: number): Position {
    return {
        x: pos.x * factor,
        y: pos.y * factor
    };
}

export function scaleStrokeWidth(width: number, factor: number): number {
    return Math.max(width * factor, MIN_STROKE_WIDTH);
}

export function scaleShape(shape: FrameAnnotationShape, factor: number): FrameAnnotationShape {
    switch (shape.type) {
        case 'path':
            return {
                ...shape,
                type: 'path',
                points: shape.points.map(p => p * factor),
                strokeWidth: scaleStrokeWidth(shape.strokeWidth, factor)
            };
        case 'circle':
            return {
                ...shape,
                type: 'circle',
                radius: shape.radius * factor,
                strokeWidth: scaleStrokeWidth(shape.strokeWidth, factor)
            };
    }
}

export function shapeToKonva(shape: FrameAnnotationShape, scaleFactor: number = 1): konva.ShapeConfig {
    switch (shape.type) {
        case 'path':
            return pathToKonva(shape, scaleFactor);
        case 'circle':
            return circleToKonva(shape, scaleFactor);
    }
}

function pathToKonva(shape: FrameAnnotationPath, scaleFactor: number = 1): konva.LineConfig {
    return {
        globalCompositeOperation: 'source-over',
        stroke: shape.strokeColor,
        strokeWidth: scaleStrokeWidth(shape.strokeWidth, scaleFactor),
        points: scaleFactor === 1 ? shape.points : shape.points.map(p => p * scaleFactor),
        // round cap for smoother lines
        lineCap: 'round',
        lineJoin: 'round',
    };
}

function circleToKonva(shape: FrameAnnotationCircle, scaleFactor: number = 1): konva.CircleConfig {
    return {
        x: shape.x * scaleFactor,
        y: shape.y * scaleFactor,
        radius: shape.radius * scaleFactor,
        fill: shape.fillColor,
        stroke: shape.strokeColor,
        strokeWidth: scaleStrokeWidth(shape.strokeWidth, scaleFactor)
    }
}
