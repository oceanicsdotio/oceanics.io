/**
 * Get image data from S3, the Blob-y way. 
 */
const fetchImageBuffer = async (url: string): Promise<Float32Array> => {
  const blob = await fetch(url).then(response => response.blob());
  const arrayBuffer: string | ArrayBuffer | null = await (new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result); };
    reader.readAsArrayBuffer(blob);
  }));
  if (arrayBuffer instanceof ArrayBuffer) {
    return new Float32Array(arrayBuffer);
  } else {
    throw TypeError("Result is not ArrayBuffer type")
  }
}

/**
 * Convenience method to make the name usable as a page anchor
 */
const transformName = (name: string): string => name.toLowerCase().split(" ").join("-");


/**
 * Page anchor hash
 */
const locationHash = async (name: string): Promise<string> =>
  `#${transformName(name)}`;

type Icon = {
  relativePath: string;
  publicURL: string;
}

type Tile = {
  name: string;
  becomes?: string[];
  data: string;
  queryString: string;
}



type Edge = {
  node: {
    frontmatter: {
      tags: string[];
      description: string;
    }
    fields: {
      slug: string;
    }
  }
}

type Dictionary = { [index: string]: { count: number; links: string[]; } }

type ICodex = {
  edges: Edge[];
  accessToken?: string;
  server?: string;
}

/**
 * Find similar symbolic patterns, for word matching usually.
 */
const codex = async ({ edges }: ICodex): Promise<Dictionary> => {

  const mapping: Dictionary = {};

  edges.forEach(({ node }) => {
    const { frontmatter: { tags, description }, fields: { slug } } = node;

    (description.split(" ") || []).concat(tags).forEach((word: string) => {

      let parsed = word.trim().toLowerCase();
      const lastChar = word[word.length - 1]
      if (lastChar === "." || lastChar === "," || lastChar === "?") {
        parsed = word.slice(0, word.length - 1);
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

type HistogramResult = { total: number; max: number; };
/**
 * Calculate summary statistics for the bins, to help with rendering
 * and UI metadata.
 * 
 * There should only be positive values for the y-axis.
 */
const histogramReducer = (histogram: [number, number][]): HistogramResult => histogram.reduce(
  ({ total, max }, [bin, count]) => {
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
 */
async function initParticles(res: number) {
  return new Uint8Array(Array.from(
    { length: res * res * 4 },
    () => Math.floor(Math.random() * 256)
  ))
}

/**
 * Max regional ocean depth for bthymetry rendering
 */
const MAX_VALUE = 5200;

/**
 * Get rid of the junk
 */
const cleanAndParse = (text: string): string[] =>
  text.replace("and", ",")
    .replace(";", ",")
    .split(",")
    .map(each => each.trim());

type IEsri = {
  geometry: {
    x: number;
    y: number;
  },
  attributes: object;
}
type INoaa = {
  data: [object];
  metadata: {
    lon: number;
    lat: number;
  } & object;
}
type PointFeatureResult = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: object
}
/**
 * Single point feature with coordinates 
 * and arbitrary properties.
 */
const PointFeature = (x: number, y: number, properties: object): PointFeatureResult => Object({
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [x, y]
  },
  properties
});

type FeatureEncodings = (PointFeatureResult|IEsri|INoaa)
type IGeoJsonSource = {
  features: FeatureEncodings[];
  standard?: string;
  properties?: object;
};

/**
 * Out ready for MapBox as a Layer object description
 */
const GeoJsonSource = ({
  features,
  standard,
  properties
}: IGeoJsonSource) => {
  let parsed: PointFeatureResult[];
    
  if (standard === "noaa") {
    parsed = (features as INoaa[])
      .filter(x => "data" in x && "metadata" in x)
      .map(({
        data: [head],
        metadata: { lon, lat, ...metadata }
      }) => PointFeature(lon, lat, { ...head, ...metadata }))
  } else if (standard === "esri") {
    parsed = (features as IEsri[])
      .filter(x => !!x)
      .map(({
        geometry: { x, y },
        attributes
      }) => PointFeature(x, y, attributes))
  } else {
    parsed = (features as PointFeatureResult[])
      .filter(x => !!x)
  }
  return {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features: parsed,
      properties,
    },
    attribution: ""
  };
}

type FeatureReducer = {
  count: number;
  features: number[][]
}

/**
 * Log normal density function for color mapping
 */
const logNormal = (x: number, m = 0, s = 1.0): number =>
  (1 / s / x / Math.sqrt(2 * Math.PI) * Math.exp(-1 * (Math.log(x) - m) ** 2 / (2 * s ** 2)));

/**
 * Retrieve a piece of a vertex array buffer from object storage.
 */
const getFragment = async (target: string, key: string, attribution: string) => {

  const url = `${target}/${key}`;
  const blob = await fetch(url).then(response => response.blob());

  const arrayBuffer: ArrayBuffer | string | null = await (new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result) };
    reader.readAsArrayBuffer(blob);
  }));
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw TypeError("Expected ArrayBuffer type")
  }

  const dataView = new Float32Array(arrayBuffer);
  const { features } = dataView.reduce(({ count, features }: FeatureReducer, cur: number) => {
    let insert;
    if (!count) {
      insert = [cur];
    } else {
      const [coords] = features.slice(-1);
      insert = [...coords, cur];
    }

    return {
      features: [...features, insert],
      count: (count + 1) % 3
    };
  },
    { count: 0, features: [] }
  );

  const source = GeoJsonSource({
    features: features.map(
      coordinates => Object({
        geometry: { type: "Point", coordinates },
        properties: {
          q: (((100 + coordinates[2]) / MAX_VALUE) - 1) ** 2,
          ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5)
        }
      })
    )
  });
  source.attribution = attribution;

  return {
    id: `mesh-${key}`,
    type: "circle",
    source,
    component: "location",
    paint: {
      "circle-radius": { stops: [[0, 0.2], [22, 4]] },
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

};
