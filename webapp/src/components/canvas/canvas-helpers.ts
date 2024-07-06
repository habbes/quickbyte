import type { Position, DrawingToolConfig, CanvasDrawingTool, ShapeUpdateHandler } from "./types.js";
import type {
    FrameAnnotationShape,
    FrameAnnotationPath,
FrameAnnotationCircle
} from '@quickbyte/common';
import konva from "konva";
import { PencilTool } from './pencil-tool.js';

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

export function scaleShape(shape: FrameAnnotationShape, factor: number): FrameAnnotationShape {
    switch (shape.type) {
        case 'path':
            return {
                ...shape,
                type: 'path',
                points: shape.points.map(p => p * factor),
                strokeWidth: shape.strokeWidth * factor
            };
        case 'circle':
            return {
                ...shape,
                type: 'circle',
                radius: shape.radius * factor,
                strokeWidth: shape.radius * factor
            };
    }
}

export function shapeToKonva(shape: FrameAnnotationShape): konva.ShapeConfig {
    switch (shape.type) {
        case 'path':
            return pathToKonva(shape);
        case 'circle':
            return circleToKonva(shape);
    }
}

function pathToKonva(shape: FrameAnnotationPath): konva.LineConfig {
    return {
        globalCompositeOperation: 'source-over',
        stroke: shape.strokeColor,
        strokeWidth: shape.strokeWidth,
        points: shape.points,
        // round cap for smoother lines
        lineCap: 'round',
        lineJoin: 'round',
    };
}

function circleToKonva(shape: FrameAnnotationCircle): konva.CircleConfig {
    return {
        x: shape.x,
        y: shape.y,
        radius: shape.radius,
        fill: shape.fillColor,
        stroke: shape.strokeColor,
        strokeWidth: shape.strokeWidth
    }
}
