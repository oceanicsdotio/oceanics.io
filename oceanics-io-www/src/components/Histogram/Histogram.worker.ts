type HistogramResult = { total: number; max: number; };

const ctx: Worker = self as unknown as Worker;

/**
 * Calculate summary statistics for the bins, to help with rendering
 * and UI metadata.
 * 
 * There should only be positive values for the y-axis.
 */
const histogramReducer = (histogram: [number, number][]): HistogramResult => histogram.reduce(
  ({ total, max }, [bin, count]) => {
    if (count < 0) throw Error(`Negative count value, ${count} @ ${bin}`);
    return {
      total: total + count,
      max: Math.max(max, count)
    }
  },
  { total: 0, max: 0 }
);


/**
 * Listener function
 */
const handleMessage = async ({ data }: MessageEvent) => {
  switch (data.type) {
    case "status":
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    case "histogram":
        ctx.postMessage({
            type: "histogram",
            data: "ready",
        });
        return;
    default:
      ctx.postMessage({
        type: "error",
        message: "unknown message format",
        data
      });
      return;
  }
}

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", handleMessage)

// Trick into being a module and for testing
export { handleMessage }