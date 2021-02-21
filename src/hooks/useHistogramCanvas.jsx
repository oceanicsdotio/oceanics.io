import { useEffect, useRef, useState } from "react";

import Worker from "./useHistogramCanvas.worker.js";

/**
 * The bin size is known, since the bins are precalculated.
 */
const COUNT = 100;

/**
 * Bin size from bin count
 */
const Δw = 1.0/COUNT;

/**
 * Calculate and draw a histogram from count data 
 * where 0.0 < x < 1.0.
 */
export default ({
    histogram, 
    caption,
    foreground="#CCCCCCFF"
}) => {

    /**
     * Handle to assign to canvas element instance
     */
    const ref = useRef(null);

    /**
     * Web worker for reducing histogram bins to the statistics
     * required for consistent/adjustable rendering.
     */
    const worker = useRef(null);

    /**
     * Create worker
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    /**
     * Summary stats include max and total. Set asynchonously by
     * result of web worker calculation.
     */
    const [ statistics, setStatistics ] = useState(null);

    /**
     * Use background worker to calculate summary statistics.
     * 
     * Return a callback to gracefully kill the worker when the component
     * unmounts. 
     */
    useEffect(()=>{
        if (!worker.current) return;

        worker.current.histogramReducer(histogram).then(setStatistics);
        return () => { worker.current.terminate() }
    }, [ worker ]);

    const [ message, setMessage ] = useState("Calculating...");

    useEffect(() => {
        if (statistics)
            setMessage(`${caption} (N=${statistics.total})`)
    }, [ statistics ]);

    /*
     * Draw histogram peaks to the 2D canvas when it loads.
     */
    useEffect(()=>{
        if (!statistics || !ref.current) return;

        const ctx = ref.current.getContext("2d");
        ctx.fillStyle = foreground;
        
        histogram.forEach(([x, n]) => {
            ctx.fillRect(
                ref.current.width * (x - Δw),
                ref.current.height,
                ref.current.width * Δw,
                ref.current.height * -n / statistics.max
            );
        });
    }, [ statistics ]);

    return { statistics, ref, message };
}
    