import { useEffect, useRef, useState } from "react";
import type {WorkerRef} from "../../shared";
import { ghost } from "../../palette";


export type IHistogram = {
    histogram: [number, number][];
    caption: string;
    foreground?: string;
    worker: WorkerRef;
}

/**
 * The bin size is known, since the bins are precalculated.
 */
const COUNT = 100;

/**
 * Bin size from bin count.
 */
const Δw = 1.0/COUNT;

/**
 * Calculate and draw a histogram from count data 
 * where 0.0 < x < 1.0.
 */
export const useHistogram = ({
    histogram, 
    caption,
    worker,
    foreground = ghost
}: IHistogram) => {
    /**
     * Handle to assign to canvas element instance
     */
    const ref = useRef<HTMLCanvasElement|null>(null);

    /**
     * Summary stats include max and total. Set asynchonously by
     * result of web worker calculation.
     */
    const [ statistics ] = useState({
        total: 0,
        max: 0
    });

    // Start listening to worker messages
  useEffect(() => {
    return worker.listen(({ data }) => {
      switch (data.type) {
        case "status":
          console.log(data.type, data.data);
          return;
        case "source":
          console.log(data.type, data.data);
          map?.addSource(...data.data as [string, AnySourceData]);
          return;
        case "layer":
          console.log(data.type, data.data);
          map?.addLayer(data.data as AnyLayer);
          return;
        case "error":
          console.error(data.type, data.data);
          return;
        case "storage":
          console.log(data.type, data.data)
          setFileSystem(data.data as FileSystem);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    });
  }, [ready]);

    /**
     * Use background worker to calculate summary statistics.
     * 
     * Return a callback to gracefully kill the worker when the component
     * unmounts. 
     */
    useEffect(() => {
        if (!worker.current) return;
        worker.post({
            type: "histogram",
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

export default useHistogram;