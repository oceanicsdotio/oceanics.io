const GLSL_DIRECTORY = "../../glsl-src";

export const queryBathysphere = async (uri, auth) => {

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

export const loadGeoJSON = async (mapInstance, layers) => {
    /*
    Asynchronously retrieve the geospatial data files and parse them
     */
    return await Promise.all(layers.map(async ({ render, behind }) => {

        const url = "/" + render.id + ".json";

        try {
            render.source = {
                'type': 'geojson',
                'data': await fetch(url).then(r => r.json()),
                'generateId': true,
            };
        } catch {
            console.log("Error fetching " + url);
            return { layer: null, behind: null };
        }
        mapInstance.addLayer(render);
        return { layer: render.id, behind };
    }));
};

function partition(arr, low, high, col) {
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

export default function quickSort(arr, low, high, col) {
    if (low < high) {

        let index = partition(arr, low, high, col);

        quickSort(arr, low, index - 1, col);
        quickSort(arr, index + 1, high, col);
    }
}



