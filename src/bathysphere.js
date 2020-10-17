const GLSL_DIRECTORY = "../../glsl-src";

export const queryBathysphere = async (uri, auth) => {
    /*
    Fetch JSON data from the Bathysphere API.

    Requires token or basic authorization.
    */
    return fetch(uri, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': auth
        }
    });
};

export const loadTileImage = (url, ref) => {
    /*
    Fetch and draw an image to a canvas.
    */
    if (!url) {
        throw ValueError("Empty string is not a valid data source.");
    } else if (!ref.current) {
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener('load', () => {
        const { width, height } = ref.current;
        let ctx = ref.current.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
    }, {
        capture: false,
        once: true,
    });
    img.src = url;
};


function partition(arr, low, high, col) {
    /*
    In place sorting function. 
    */
    let ii = low - 1;
    let temp;
    const pivot = arr[high];

    for (let jj = low; jj < high; jj++) {
        if (arr[jj][col] <= pivot[col]) {
            ii++;
            temp = arr[jj];
            arr[jj] = arr[ii];
            arr[ii] = temp;
        }
    }
    temp = arr[ii + 1];
    arr[ii + 1] = arr[high];
    arr[high] = temp;
    return ii + 1;
}

export function quickSort(arr, low, high, col) {
    /*
    simple implementation of the QuickSort algorithm.

    Generally the standard library should be used, but sometimes that does quite work.
    */
    if (low < high) {

        let index = partition(arr, low, high, col);

        quickSort(arr, low, index - 1, col);
        quickSort(arr, index + 1, high, col);
    }
}


// Formatting function, generic to all providers
export const Feature = (lon, lat, props) => Object({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [lon, lat]
    },
    properties: props
});

// Out ready for Mapbox as a Layer object description
export const GeoJsonSource = ({features, properties=null, type="FeatureCollection"}) => Object({
    data: {
        features,
        properties, 
        type
    }, 
    type: "geojson", 
    generateId: true
});

const size = 64;
export const pulsingDot = (map) => Object({
            
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function () {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        this.context = canvas.getContext('2d');
    },

    // called once before every frame where the icon will be used
    render: function () {
        var duration = 1000;
        var time = (performance.now() % duration) / duration;

        var radius = (size / 2) * 0.3;
        var outerRadius = (size / 2) * 0.7 * time + radius;
        var ctx = this.context;

    
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(
            size / 2,
            size / 2,
            outerRadius,
            0,
            Math.PI * 2
        );
        
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2 + 4 * (1 - time);
        ctx.stroke();

        // update this image's data with data from the canvas
        this.data = ctx.getImageData(
            0,
            0,
            size,
            size
        ).data;

        map.triggerRepaint();
        return true;
    }
});
