import type {MutableRefObject} from "react";
export type WorkerRef = MutableRefObject<Worker|null>;

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
            let duration = 1000;
            let time = (performance.now() % duration) / duration;

            let radius = size / 2;
            let ctx: CanvasRenderingContext2D|null = this.context;
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

