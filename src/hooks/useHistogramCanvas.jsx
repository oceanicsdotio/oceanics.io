import {useEffect, useRef, useState} from "react";

export default ({
    histogram, 
    foreground="#CCCCCCFF"
}) => {

    const ref = useRef(null);
    const [total, setTotal] = useState(0);

    useEffect(()=>{
        /*
        Draw histogram peaks to the canvas when it loads
        */
        const ctx = ref.current.getContext("2d");
        const {width, height} = ref.current;
        ctx.fillStyle = foreground;
        let previousX = 0;
        let _total = 0;

        const maxValue = Math.max(...histogram.map(([_, count])=>{return count}));
        
        histogram.forEach(([bin, count], ii) => {

            ctx.fillRect(
                previousX * width,
                height,
                width/100,
                -(count * height / maxValue) 
            );
            previousX = bin;
            _total += count;
        });

        setTotal(_total);
    },[]);

    return {total, ref};
}
    