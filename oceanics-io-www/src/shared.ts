/* eslint-disable @typescript-eslint/no-empty-function */
import type {MutableRefObject} from "react";
export type WorkerRef = MutableRefObject<Worker|null>;

import fs from "fs";
import matter from "gray-matter";
import path from "path";

export const DIRECTORY = "references";

export const createIndex = () => {
    return fs.readdirSync(path.join(process.cwd(), DIRECTORY))
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => Object({ params: { slug: name.split(".").shift() } }))
}

export const readDocument = (doc: {params: {slug: string}}) => {
    const STATIC_SOURCE = path.join(process.cwd(), DIRECTORY);
    const file = path.join(STATIC_SOURCE, `${doc.params.slug}.mdx`);
    const { data: {references=[], ...metadata}, content }: {data: {references: any[]}, content: any} = matter(fs.readFileSync(file, "utf8"));
    return {
        metadata: {
            ...metadata,
            references: references.map((metadata) => Object({metadata}))
        },
        content,
        slug: doc.params.slug
    }
};

export const readIndexedDocuments = (index) => {
    return index.map(readDocument)
}


export type RenderEffect = {
    size: number;
};
export type RenderInstance = {
    width: number;
    height: number;
    data: Uint8Array;
    context: CanvasRenderingContext2D|null;
    onAdd: () => void;
    render: () => boolean;
}

export type Points = [number, number][];
export type EventLocation = {clientX: number; clientY: number;}; 
export type ModuleType = typeof import("oceanics-io-www-wasm");

export const eventCoordinates = ({clientX, clientY}: EventLocation, canvas: HTMLCanvasElement): [number, number] => {
    // Short hand for element reference frame
    const {left, top} = canvas.getBoundingClientRect();
    return [clientX - left, clientY - top]
};

/**
 * Use the Geolocation API to retieve the location of the client,
 * and set the map center to those coordinates, and flag that the interface
 * should use the client location on refresh.
 * 
 * This will also trigger a greater initial zoom level.
 */
 export const pulsingDot = ({
    size
}: RenderEffect): RenderInstance => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    return {

        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),
        context: canvas.getContext("2d"),

        // get rendering context for the map canvas when layer is added to the map
        onAdd: () => { },

        // called once before every frame where the icon will be used
        render: function () {
            const duration = 1000;
            const time = (performance.now() % duration) / duration;

            const radius = size / 2;
            const ctx: CanvasRenderingContext2D|null = this.context;
            if (!ctx) return false;

            ctx.clearRect(0, 0, size, size);
            ctx.beginPath();
            ctx.arc(
                radius,
                radius,
                radius * (0.7 * time + 0.3),
                0,
                Math.PI * 2
            );

            ctx.strokeStyle = "orange";
            ctx.lineWidth = 2;
            ctx.stroke();

            // update this image"s data with data from the canvas
            this.data = new Uint8Array(ctx.getImageData(
                0,
                0,
                size,
                size
            ).data);

            return true;
        }
    }
};

