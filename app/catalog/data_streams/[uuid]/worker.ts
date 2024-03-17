const ctx: Worker = self as unknown as Worker;
/**
 * Known message types
 */
const MESSAGES = {
    status: "status",
    error: "error",
    reduce: "reduce"
}
/**
 * Calculate summary statistics for the bins, to help with rendering
 * and UI metadata.
 * 
 * There should only be positive values for the y-axis.
 */
const reduce = (
    { total, max }: {
        total: number;
        max: number;
      },
    [_, count]: [number, number]
) => {
    return {
        total: total + count,
        max: Math.max(max, count)
    }
}
/**
 * Listener function
 */
const handleMessage = async ({ data }: MessageEvent) => {
    switch (data.type) {
        case MESSAGES.status:
            ctx.postMessage({
                type: MESSAGES.status,
                data: "ready",
            });
            return;
        case MESSAGES.reduce:
            ctx.postMessage({
                type: MESSAGES.reduce,
                data: (data.data as [number, number][]).reduce(
                    reduce, 
                    { total: 0, max: 0 }
                ),
            });
            return;
        default:
            ctx.postMessage({
                type: MESSAGES.error,
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
/**
 * Trick into being a module and for testing
 */ 
export { handleMessage }
