import type {MutableRefObject} from "react";
export type WorkerRef = MutableRefObject<Worker|null>;

// Mouse click coordinates
export type EventLocation = {clientX: number; clientY: number;}; 

// Get click coords from an event
export const eventCoordinates = ({clientX, clientY}: EventLocation, canvas: HTMLCanvasElement): [number, number] => {
    // Short hand for element reference frame
    const {left, top} = canvas.getBoundingClientRect();
    return [clientX - left, clientY - top]
};

export type FileObject = {
    key: string;
    updated: string;
    size: string; 
}

export type FileSystem = {
    objects: FileObject[];
    collections: {
        key: string;
    }[];
};

type Points = [number, number][];

/*
 * Rotate a path of any number of points about the origin.
 * You need to translate first to the desired origin, and then translate back 
 * once the rotation is complete.
 * 
 * Not as flexible as quaternion rotation.
 */
export const rotatePath = (pts: Points, angle: number): Points  => {
    const [s, c] = [Math.sin, Math.cos].map(fcn => fcn(angle));
    return pts.map(([xx, yy]) => [(xx * c - yy * s), (xx * s + yy * c)]);
}

/*
 * Translate x and scale y, rotate CCW, scale points.
 * Points must be in the canvas coordinate reference frame. 
 * The width is the width of the canvas drawing area, and 
 * gridSize is the number of squares per side of the world.
 */
export const inverse = (points: Points, width: number, gridSize: number): Points => {
    return rotatePath(points.map(([x,y])=> [
            x - (Math.floor(0.5*gridSize) + 1.25)*width/gridSize/Math.sqrt(2), 
            2*y 
        ]
), -Math.PI/4).map(([x, y]) => [x*Math.sqrt(2), y*Math.sqrt(2)])};