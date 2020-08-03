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
  
    for (let jj=low; jj<high; jj++) {
      if (arr[jj][col] <= pivot[col]) {
        ii++;
        temp = arr[jj];
        arr[jj] = arr[ii];
        arr[ii] = temp;
      }
    }
    temp = arr[ii+1];
    arr[ii+1] = arr[high];
    arr[high] = temp;
    return ii + 1;
  }
  
  export default function quickSort(arr, low, high, col) {
    if (low < high) {
  
      let index = partition(arr, low, high, col);
  
      quickSort(arr, low, index-1, col);
      quickSort(arr, index+1, high, col);
    }
  }

const demo = () =>

    [[LagrangianParticles, {
        eid: "wind",
        context: "webgl",
        source: "../../static/wind.png",
        metadataFile: "../../static/wind.json",
        shaders: {
            draw: ["draw-vertex", "draw-fragment"],
            screen: ["quad-vertex", "screen-fragment"],
            update: ["quad-vertex", "update-fragment"],
            triangle: ["triangle-vertex", "triangle-fragment"],
        },
        opacity: 0.996, // how fast the particle trails fade on each frame
        speed: 0.25, // how fast the particles move
        drop: 0.003, // how often the particles move to a random place
        bump: 0.01, // drop rate increase relative to individual particle speed
        colors: {
            0.0: '#dd7700',
            1.0: '#660066'
        },
        res: Math.ceil(Math.sqrt(1000))
    }], [Particles, {
        eid: "particles",
        context: "2d",
        dim: "xyz",
        padding: 0.0,
        n: 32
    }]
    ].map(target => {
        let [f, props] = target;
        let container = document.createElement("div");
        container.className = "container";
        let canvas = document.createElement("canvas");

        canvas.width = 200;
        canvas.height = 200;
        container.paused = (props.autoplay === undefined) || (!props.autoplay);
        canvas.id = props.eid;
        let starting = true;
        document.body.appendChild(container);
        props.canvas = canvas;
        container.appendChild(canvas);

        container.addEventListener("click", () => {

            container.paused = !container.paused;

            if (!container.paused) {
                RenderingContext(f, props);
                starting = !starting;
            } else if (!starting) {
                container.removeChild(canvas);
                canvas = document.createElement("canvas");
                canvas.width = 200;
                canvas.height = 200;
                canvas.id = props.eid;
                props.canvas = canvas;
                container.appendChild(canvas);
                console.log("stop");
            }
            container.paused = !container.paused;
        });

        if (props.autoplay) {
            RenderingContext(f, props);
            starting = !starting;
        }
    })
;



