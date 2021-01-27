export const histogramReducer = histogram => histogram.reduce(({total, max}, [_, count])=>{
    if (count < 0) throw Error("Negative count value");
    
    return {
        max: Math.max(max, count),
        total: total + count
    }
}, {
    total: 0,
    max: 0
});