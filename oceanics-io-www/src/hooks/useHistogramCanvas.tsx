/**
 * React friends.
 */
import { useEffect, useRef, useState } from "react";
import type {WorkerRef} from "../utils";

/**
 * Consistent styling.
 */
import { ghost } from "../palette";

/**
 * The bin size is known, since the bins are precalculated.
 */
const COUNT = 100;

/**
 * Bin size from bin count.
 */
const Δw = 1.0/COUNT;

type IHistogramCanvas = {
    histogram: [number, number][];
    caption: string;
    foreground?: string;
    worker: WorkerRef;
}

/**
 * Calculate and draw a histogram from count data 
 * where 0.0 < x < 1.0.
 */
export const useHistogramCanvas = ({
    histogram, 
    caption,
    worker,
    foreground = ghost
}: IHistogramCanvas) => {
    /**
     * Handle to assign to canvas element instance
     */
    const ref = useRef<HTMLCanvasElement|null>(null);

    /**
     * Summary stats include max and total. Set asynchonously by
     * result of web worker calculation.
     */
    const [ statistics, setStatistics ] = useState({
        total: 0,
        max: 0
    });

    /**
     * Use background worker to calculate summary statistics.
     * 
     * Return a callback to gracefully kill the worker when the component
     * unmounts. 
     */
    useEffect(() => {
        if (!worker.current) return;
        worker.current.postMessage({
            type: "histogramReducer",
            data: histogram
        })
        // TODO: wait, and .then(setStatistics)});
    }, [ worker ]);

    /**
     * Message displayed with the histogram
     */
    const [ message, setMessage ] = useState("Calculating...");

    /**
     * Once total number of observations is known,
     * set the display message giving metadata
     */
    useEffect(() => {
        if (statistics)
            setMessage(`${caption} (N=${statistics.total})`)
    }, [ statistics ]);

    /*
     * Draw histogram peaks to the 2D canvas when it loads.
     */
    useEffect(()=>{
        if (!statistics || !ref.current) return;
        const canvas: HTMLCanvasElement = ref.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw TypeError("Canvas Context is Null")
        }
        ctx.fillStyle = foreground;
        
        histogram.forEach(([x, n]: [number, number]) => {
            ctx.fillRect(
                canvas.width * (x - Δw),
                canvas.height,
                canvas.width * Δw,
                canvas.height * -n / statistics.max
            );
        });
    }, [ statistics ]);

    return { statistics, ref, message };
}

export default useHistogramCanvas;