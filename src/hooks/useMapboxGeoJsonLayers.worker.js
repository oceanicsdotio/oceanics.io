export const PointFeature = (x, y, properties) => Object({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [x, y]
    },
    properties
});

// Formatting function, generic to all providers
export const Features = ({
    features,
    standard
}) => {
    switch(standard) {
        // ESRI does things their own special way.
        case "esri":
            return features
                .map(({
                    geometry: {x, y}, 
                    attributes
                }) => 
                    PointFeature(x, y, attributes)
                );
        // NOAA also does things their own special way
        case "noaa":
            return features
                .filter(x => "data" in x && "metadata" in x)
                .map(({
                    data: [head], 
                    metadata: {lon, lat, ...metadata}
                }) => 
                    PointFeature(lon, lat, {...head, ...metadata})
                );
        // Otherwise let us hope it is GeoJSON and catch it up the stack
        default:
            return features;
    };
};

// Out ready for Mapbox as a Layer object description
export const GeoJsonSource = ({
    features,
    standard,
    properties=null
}) => 
    Object({
        type: "geojson", 
        generateId: true,
        data: {
            type: "FeatureCollection",
            features: Features({
                features, 
                standard
            }),
            properties,
        }, 
    });


export const UserLocation = async ({
    longitude, 
    latitude
}) => GeoJsonSource({
        features: [PointFeature(longitude, latitude, {})]
    });

export async function getData(url, standard) {
    return await fetch(url)
        .then(response => response.json())
        .then(({features}) => GeoJsonSource({features, standard}));
};


const MAX_VALUE = 5200;



/**
 * Log normal density function for color mapping
 * @param {*} x 
 * @param {*} m 
 * @param {*} s 
 */
const logNormal = (x, m=0, s=1.0) => 
    (1/s/x/Math.sqrt(2*Math.PI)*Math.exp(-1*(Math.log(x)-m)**2 / (2 * s**2)));


    
export async function getFragment(url, attribution) {
    return await fetch(url)
        .then(response => response.blob())
        .then(blob => 
            (new Promise((resolve) => {
                var reader = new FileReader();
                reader.onloadend = () => {resolve(reader.result)};
                reader.readAsArrayBuffer(blob);
            }))
        ).then(array => {
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

            return source;
        });
};

export async function hello() {
    return "hello";
};