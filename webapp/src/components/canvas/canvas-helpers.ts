import type { Position, DrawingToolConfig, CanvasDrawingTool, ShapeUpdateHandler } from "./types.js";
import type {
    FrameAnnotationShape,
    FrameAnnotationPath,
FrameAnnotationCircle,
FrameAnnotationRect,
FrameAnnotationLine
} from '@quickbyte/common';
import konva from "konva";
import { PencilTool } from './pencil-tool.js';
import { CircleTool } from './circle-tool.js';
import { RectTool } from "./rect-tool";


/**
 * Lower bound for stroke width to prevent the strokes
 * from being too small to see on small screens after scaling.
 */
const MIN_STROKE_WIDTH = 3;

export function createDrawingTool(shapeId: string, config: DrawingToolConfig, onShapeUpdate: ShapeUpdateHandler): CanvasDrawingTool {
    switch(config.type) {
        case 'pencil':
            return new PencilTool(config.config, shapeId, onShapeUpdate);
        case 'circle':
            return new CircleTool(config.config, shapeId, onShapeUpdate);
        case 'rect':
            return new RectTool(config.config, shapeId, onShapeUpdate);
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

export function shapeToKonva(shape: FrameAnnotationShape, scaleFactor: number = 1): konva.ShapeConfig {
    switch (shape.type) {
        case 'path':
            return pathToKonva(shape, scaleFactor);
        case 'circle':
            return circleToKonva(shape, scaleFactor);
        case 'rect':
            return rectToKonva(shape, scaleFactor);
        case 'line':
            return lineToKonva(shape, scaleFactor);
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
        stroke: shape.strokeColor,
        strokeWidth: scaleStrokeWidth(shape.strokeWidth, scaleFactor)
    }
}

function rectToKonva(shape: FrameAnnotationRect, scaleFactor: number = 1): konva.RectConfig {
    return {
        x: shape.x * scaleFactor,
        y: shape.y * scaleFactor,
        width: shape.width * scaleFactor,
        height: shape.height * scaleFactor,
        stroke: shape.strokeColor,
        strokeWidth: scaleStrokeWidth(shape.strokeWidth, scaleFactor),
        cornerRadius: Math.ceil(shape.cornerRadius * scaleFactor)
    };
}

function lineToKonva(shape: FrameAnnotationLine, scaleFactor: number = 1): konva.LineConfig {
    return {
        globalCompositeOperation: 'source-over',
        stroke: shape.strokeColor,
        strokeWidth: scaleStrokeWidth(shape.strokeWidth, scaleFactor),
        points: [shape.x1, shape.y1, shape.x2, shape.y2].map(p => p * scaleFactor),
        // round cap for smoother lines
        lineCap: 'round',
    };
}