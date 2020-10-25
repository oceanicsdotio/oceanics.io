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

export const waterLevel = (map) => Object({

    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function () {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        this.context = canvas.getContext('2d');
        
        // update this image's data with data from the canvas
        
    },

    // called once before every frame where the icon will be used
    render: function () {
        var ctx = this.context;
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
    
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 3;
        ctx.stroke();

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

export const parseFeatureData = ({features, properties=null, standard="geojson"}) => 
    GeoJsonSource((()=>{
        let feat = null;
        switch(standard) {
            // ESRI does things their own special way.
            case "esri":
                feat = features.map(({geometry: {x, y}, attributes}) => Feature(x, y, attributes));
                break;
            // NOAA also does things their own special way
            case "noaa":
                
                feat = features
                    .filter(x => "data" in x && "metadata" in x)
                    .map(({data: [head], metadata: {lon, lat, ...metadata}}) => Feature(lon, lat, {...head, ...metadata}));
                break;
            // Otherwise let us hope it is GeoJSON
            case "geojson":
                feat = features;
                break;
            default:
                throw Error(`Unknown Spatial Standard: ${standard}`);
        };
        return {
            features: feat,
            properties
        }
    })());


export const rotatePath = (pts, angle) => {
    /*
    Rotate a path of any number of points about the origin.

    You need to translate first to the desired origin, and then translate back once the rotation is complete.

    Not as flexible as quaternion rotation.
    */
    let [s, c] = [Math.sin, Math.cos].map(fcn => fcn(angle));
    return pts.map(([xx, yy]) => [(xx * c - yy * s), (xx * s + yy * c)]);
}


export const pathFromGridCell = ({
    upperLeft: [x, y], 
    width=1, 
    height=1, 
    clamp=false, 
    cellSize=1.0
}) => {
    /*
    Convenience method to create a bounding box polygon
    from a upper-left, width/height type extent. 

    Upperleft is given in grid coordinates, and width and height
    are integers corresponded to the number of grid cells per
    side of the selected region.
    */
    const [_x, _y] = [x, y].map(dim => clamp ? Math.floor(dim) : dim);
    return [
        [_x, _y],
        [_x + width, _y],
        [_x + width, _y + height],
        [_x, _y + height]
    ].map(pt => 
        pt.map(x => x*cellSize)
    );
};


const drawConnections = (ctx, a, b) => {
    ctx.beginPath();
    for (let ii=0; ii<4; ii++) {
        ctx.moveTo(...a[ii]);
        ctx.lineTo(...b[ii]);
    }
    ctx.stroke();
};

const drawView = (ctx, pts) => {

    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    ctx.lineTo(...pts[1]);
    ctx.lineTo(...pts[2]);
    ctx.lineTo(...pts[3]);
    ctx.closePath();
    ctx.stroke();
};

export const inverse = (points, width, gridSize) => {
    /*
    Translate x and scale y, rotate CCW, scale points.

    Points must be in the canvas coordinate reference frame. 
    The width is the width of the canvas drawing area, and 
    gridSize is the number of squares per side of the world.
    */
    return rotatePath(points.map(([x,y])=> [
            x - (Math.floor(0.5*gridSize) + 1.25)*width/gridSize/Math.sqrt(2), 
            2*y 
        ]
), -Math.PI/4).map(pt => pt.map(dim => dim*Math.sqrt(2)))};

const transform = (points, width, gridSize) => {
    /*
    Scale points, rotate CW, translate x and scale y.

    */
    const _points = points.map(pt => pt.map(x => x/Math.sqrt(2)));
    return rotatePath(_points, Math.PI/4).map(([x,y])=>[
    x + (Math.floor(0.5*gridSize) + 1.25)*width/gridSize/Math.sqrt(2), 
    0.5*y 
])};

const drawProjectionPrism = ({
    width,
    gridSize,
    upperLeft,
    clamp,
    color,
    lineWidth,
    ctx
}) => {
    
    const cellA = pathFromGridCell({
        upperLeft,
        clamp, 
        cellSize: width/gridSize
    })
    const cellB = transform(cellA, width, gridSize);

    ctx.strokeStyle=color;
    ctx.lineWidth = lineWidth;
    drawView(ctx, cellA);
    drawView(ctx, cellB);
    drawConnections(ctx, cellA, cellB);
};

export const drawCursor = (width, gridSize, ctx, cursor, clamp) => {
    /*
    Cursor is given as grid coordinates, in the interval [0.0, gridSize).
    Grid cell boxes are width and height 1 in this reference frame.

    The grid coordinates are transformed into canvas coordinates, and 
    then reprojected to an isomorphic view.
    */
   
    const cellSize = width/gridSize;
    const [inverted] = inverse([cursor.map(x=>x*cellSize)], width, gridSize).map(pt => pt.map(x=>x/cellSize));
 
    [
        {upperLeft: cursor, color: "#FFAA00FF"},
        {upperLeft: inverted, color: "#AAFF00FF"}
    ].map(({upperLeft, color})=>{
        drawProjectionPrism({
            width, 
            gridSize,
            clamp,
            upperLeft,
            color,
            lineWidth: 2.0,
            ctx
        });
    });
};