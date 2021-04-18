/**
 * Runtime handle to which we will save the active
 * runtime. 
 */
let runtime = null;


/**
 * Import Rust-WASM runtime, and add a panic hook to give 
 * more informative error messages on failure.
 * 
 * I'm not totally sure if that matter in the worker,
 * but whatever. 
 * 
 * We pass back the status and error message to the main
 * thread for troubleshooting.
 * 
 * @returns 
 */
export const initRuntime = async () => {
    try {
        runtime = await import('../wasm');
        runtime.panic_hook();
        return {
            ready: true,
        };
    } catch (err) {
        return {
            ready: false,
            error: err.message
        };
    }
}


/**
 * Get public JSON data. 
 * 
 * Return an error JSON object if something goes wrong.
 * 
 * @param {*} url 
 * 
 * @returns 
 */
 export const getPublicJsonData = async url => {
    return fetch(url)
        .then(r => r.json())
        .catch((err) => Object({
            error: err.message
        }));
};


/**
 * Create a new account for our API and services.
 * 
 * @param {} param0 
 */
export const register = async ({
    email, 
    password, 
    apiKey,
    server
}) => 
    fetch(`${server}/api/auth`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
        },
        body: JSON.stringify({
            username: email,
            password
        })
    })
        .then(response => response.json());


/**
 * Get the index.
 * 
 * @param {*} param0 
 */
export const query = async ({
    accessToken,
    server,
    route=""
}) => 
    fetch(`${server}/api/${route}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `:${accessToken}`
        }
    })
        .then(response => response.json())
        .then(({value}) => value);


/**
 * Login and get a JWT.
 * 
 * @param {*} param0 
 */
export const login = async ({
    email, 
    password, 
    server
}) => 
    fetch(`${server}/api/auth`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${email}:${password}`
        }
    })
        .then(response => response.json())
        .then(({token=""}) => token);


/**
 * Convenience method to make the name usable as a page anchor
 */ 
const transformName = name => name.toLowerCase().split(" ").join("-"); 


/**
 * Page anchor hash
 * 
 * @param {*} name 
 * @returns 
 */
export const locationHash = async (name) => "#" + transformName(name);


/** 
 * Generate derived fields, and match metadata to asset files.
 */
export const sorted = async ({tiles, icons}) => {

    const lookup = Object.fromEntries(
        icons.map(({relativePath, publicURL})=>[relativePath, publicURL])
    );
    
    return tiles.map(({name, becomes=[], data, queryString, ...x})=>Object({
        canonical: transformName(name), 
        grayscale: typeof queryString === "undefined" || queryString === null,
        queryString,
        anchorHash: name.toLowerCase().split(" ").join("-"),
        group: (becomes || [])
            .map(x => 
                tiles.filter(({name})=>transformName(name) === transformName(x)).pop()
            ).map(({name}) => ({
                link: `#${transformName(name)}`,
                text: name
            })), 
        name,
        publicURL: lookup[data],
        ...x
    }));
}


/**
 * Find similar symbolic patterns, for word matching usually.
 * 
 * @param {*} param0 
 */
export const codex = async ({edges, accessToken, server}) => {

    let mapping = {};
     
    const lookUp = await query({route: `codex?word=oyster&mutations=2`, accessToken, server})

    edges.forEach(({ node }) => {
        const {frontmatter: {tags, description}, fields: {slug}} = node;

        (description.split(" ") || []).concat(tags).forEach((word)=>{

            let parsed = word.trim().toLowerCase();
            const lastChar = word[word.length-1]
            if (lastChar === "." || lastChar === "," || lastChar === "?") {
                parsed = word.slice(0,word.length-1);
            } 
            if (parsed.length < 3) return;  // "continue"
            
            if (parsed in mapping) {
                mapping[parsed].links.push(slug);
                mapping[parsed].count++;
            } else {
                mapping[parsed] = {
                    count: 1,
                    links: [slug]
                };
            }
        });
    });

    return mapping;

};


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


/**
 * Create vertex array buffer
 * 
 * @param {*} res 
 * @returns 
 */
export async function initParticles(res) {
    return new Uint8Array(Array.from(
        { length: res * res * 4 }, 
        () => Math.floor(Math.random() * 256)
    ))
};

/**
 * Generate the dataUrls for icon assets in the background.
 * 
 * Not a heavy performance hit, but some of the sprite sheet logic can be moved in here
 * eventually as well.
 * 
 * @param {*} param0 
 */
export const parseIconSet = async ({nodes, templates, worldSize}) => {
    
    const lookup = Object.fromEntries(
        nodes.map(({relativePath, publicURL})=>
            [relativePath, publicURL])
    );

    return templates.map(({
        name,
        spriteSheet, 
        probability=null,
        value=null,
        limit=null
    })=>({
        key: name.toLowerCase().split(" ").join("-"),  
        dataUrl: lookup[spriteSheet],
        limit: limit ? limit : worldSize*worldSize,
        probability: probability ? probability : 0.0,
        value: value ? value : 0.0
    }));
}


/**
 * Max regional ocean depth for bthymetry rendering
 */
const MAX_VALUE = 5200;


/**
 * Get rid of the junk
 * 
 * @param {*} text 
 * @returns 
 */
const cleanAndParse = text => 
    text.replace('and', ',')
        .replace(';', ',')
        .split(',')
        .map(each => each.trim());
 
         
/**
 * Single point feature with coordinates 
 * and arbitrary properties.
 * 
 * @param {*} x 
 * @param {*} y 
 * @param {*} properties 
 */
const PointFeature = (x, y, properties) => Object({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [x, y]
    },
    properties
});
 
/**
 * Formatting function, generic to all providers
 * @param {*} param0 
 */
const Features = (
    features,
    standard
) => {
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
 
/**
 * Out ready for MapBox as a Layer object description
 */
const GeoJsonSource = ({
    features,
    standard,
    properties=null
}) =>       
    Object({
        type: "geojson", 
        generateId: true,
        data: {
            type: "FeatureCollection",
            features: Features(features, standard),
            properties,
        }, 
    });

/**
 * Format the user location
 * 
 * @param {*} coordinates 
 */
export const userLocation = async (
    coordinates,
    iconImage
) => 
    Object({
        id: "home",
        type: "symbol",
        source: GeoJsonSource({
            features: [PointFeature(...coordinates, {})]
        }),
        layout: { 
            "icon-image": iconImage 
        }
    });
    

/**
 * Retrieve arbitrary GeoJson source
 * 
 * @param {*} url 
 * @param {*} standard 
 */
export const getData = async (url, standard) => {
    return await fetch(url)
        .then(response => response.json())
        .then(({features}) => GeoJsonSource({features, standard}));
};
 

/**
 * Log normal density function for color mapping
 * @param {*} x 
 * @param {*} m 
 * @param {*} s 
 */
const logNormal = (x, m=0, s=1.0) => 
    (1/s/x/Math.sqrt(2*Math.PI)*Math.exp(-1*(Math.log(x)-m)**2 / (2 * s**2)));

 
/**
 * Retrieve a piece of a vertex array buffer from object storage.
 * 
 * @param {*} url 
 * @param {*} attribution 
 */
export const getFragment = async (target, key, attribution) => {

    const url = `${target}/${key}`;

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
                (acc, cur) => {
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

            return {
                id: `mesh-${key}`,
                type: "circle",
                source,
                component: "location",
                paint: {
                    "circle-radius":  {stops: [[0, 0.2], [22, 4]]},
                    "circle-stroke-width": 0,
                    "circle-color": [
                        "rgba",
                        ["*", 127, ["get", "q"]],
                        ["*", 127, ["get", "ln"]],
                        ["*", 127, ["-", 1, ["get", "q"]]],
                        0.75
                    ]
                }
            }
        });
};
 

/**
 * Average a vertex array down to a single point. Will
 * work with XYZ and or XY, assuming the Z=0.
 * 
 * @param {*} vertexArray 
 * @returns 
 */
export const reduceVertexArray = async (vertexArray) => {

    return vertexArray.reduce(
        ([x, y, z=0], {coordinates: [Δx, Δy, Δz=0]}) => 
            [
                x + Δx / vertexArray.length, 
                y + Δy / vertexArray.length,
                z + Δz / vertexArray.length
            ], 
        [0, 0, 0]
    )};
