/**
 * Calculate summary statistics for the bins, to help with rendering
 * and UI metadata.
 * 
 * There should only be positive values for the y-axis.
 * 
 * @param {*} histogram 
 */
export const histogramReducer = histogram => histogram.reduce(
    ({ total, max }, [ bin, count ]) => {
        if (count < 0) throw Error(`Negative count value, ${count} @ ${bin}`);
        
        return { 
            total: total + count, 
            max: Math.max(max, count) 
        }
    }, 
    { total: 0, max: 0 }
);
