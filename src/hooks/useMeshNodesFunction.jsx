import {useEffect, useState} from "react";
import {GeoJsonSource} from "./useMapboxGeoJsonLayers";
import useObjectStorage from "./useObjectStorage";


const MAX_VALUE = 5200;
const TARGET = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com";
const PREFIX = "MidcoastMaineMesh";

/**
 * Log normal density function for color mapping
 * @param {*} x 
 * @param {*} m 
 * @param {*} s 
 */
const logNormal = (x, m=0, s=1.0) => 
    (1/s/x/Math.sqrt(2*Math.PI)*Math.exp(-1*(Math.log(x)-m)**2 / (2 * s**2)));

/**
 * Highlight layers
 * When the cursor position intersects with the space
 * defined by a feature set, set the hover state to true.
 * 
 * When the cursor no longer intersects the shapes, stop
 * highlighting the features. 
 */
export default ({
    map, 
    key, 
    attribution
}) => {

    /**
     * S3 file system meta data
     */ 
    const fs = useObjectStorage({target: `${TARGET}?prefix=${PREFIX}/${key}/nodes/`});
  
    const [queue, setQueue] = useState([]);
    useEffect(()=>{
        if (!fs) return;
        setQueue(fs.objects.filter(x => !x.key.includes("undefined")));
    }, [fs]);


    /**
     * Query for the first array fragment, and use metadata to loop through through the rest in the background
     * Use the paging metadata fromt he first reques to sync the rest of the data. All of this should be cached by the browser
     */
    useEffect(()=>{
        if (!map || !queue.length || map.getLayer(`mesh-${queue[0].key}`)) return;
            
        fetch(`${TARGET}/${queue[0].key}`)
            .then(response => response.blob())
            .then(blob => {

                (new Promise((resolve) => {
                    var reader = new FileReader();
                    reader.onloadend = () => {resolve(reader.result)};
                    reader.readAsArrayBuffer(blob);
                })).then(array => {

                    const source = GeoJsonSource({features: (new Float32Array(array)).reduce(
                        (acc, cur)=>{
                            if (!acc.count) acc.features.push([]);
                        
                            acc.features[acc.features.length-1].push(cur);
                            acc.count = (acc.count + 1 ) % 3;
                            return acc;
                        },
                        {count: 0, features: []}
                    ).features.map(
                        coordinates => Object({
                            geometry: {type: "Point", coordinates},
                            properties: {
                                q: (((100 + coordinates[2]) / MAX_VALUE) - 1)**2,
                                ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5)
                            }
                        })
                    )});

                    source.attribution = attribution;

                    map.addLayer({
                        id: `mesh-${queue[0].key}`,
                        type: "circle",
                        source: source,
                        paint: {
                            "circle-radius":  {stops: [[0, 0.1], [22, 1]]},
                            "circle-stroke-width": 1,
                            "circle-stroke-color": [
                                "rgba",
                                ["*", 127, ["get", "q"]],
                                ["*", 127, ["get", "ln"]],
                                ["*", 127, ["-", 1, ["get", "q"]]],
                                0.5
                            ]
                        }
                    });

                    setQueue(queue.slice(1, queue.length));
                });
            });
    },[map, queue]);
};