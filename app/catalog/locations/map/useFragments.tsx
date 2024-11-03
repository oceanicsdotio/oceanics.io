import { DOMParser } from "@xmldom/xmldom";
type FileObject = {
  key: string;
  updated: string;
  size: number;
};
type FileSystem = {
  objects: FileObject[];
};
/**
 * Retrieve remote file metadata and format it as a
 * serializable message.
 *  Make HTTP request to S3 service for metadata about available
 * assets.
 *
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors,
 * because window.DOMParser is not available in Web Worker
 */
async function getFileSystem(url: string): Promise<FileSystem> {
  let _parser = new DOMParser();
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
  });
  const text = await response.text();
  const xmlDoc = _parser.parseFromString(text, "text/xml");
  const [{ childNodes }] = Object.values(xmlDoc.childNodes).filter(
    (x) => x.nodeName === "ListBucketResult"
  );
  const nodes: FileObject[] = Array.from(childNodes).map((node) => {
    return {
      key: node.childNodes[0]?.textContent ?? "",
      updated: node.childNodes[1]?.textContent ?? "",
      size: parseInt(node.childNodes[3]?.textContent ?? "0"),
    };
  });
  return {
    objects: nodes.filter((node: FileObject) => node.size > 0),
  };
}
/**
 * Log normal density function for color mapping
 */
const logNormal = (x: number, m = 0, s = 1.0): number =>
  (1 / s / x / Math.sqrt(2 * Math.PI)) *
  Math.exp((-1 * (Math.log(x) - m) ** 2) / (2 * s ** 2));

/**
 * Retrieve a piece of a vertex array buffer from object storage.
 */
const getFragment = async (target: string, key: string) => {
  const url = `${target}/${key}`;
  const blob = await fetch(url).then((response) => response.blob());
  const arrayBuffer: ArrayBuffer | string | null = await new Promise(
    (resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsArrayBuffer(blob);
    }
  );
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw TypeError("Expected ArrayBuffer type");
  }
  const features: any[] = [];
  // const dataView = new Float32Array(arrayBuffer);
  // const [features] = dataView.reduce(([features, count]: [number[][], number], cur: number) => {
  //   return [
  //     features.concat(count ? [...features.slice(-1)[0], cur] : [cur]),
  //     (count + 1) % 3
  //   ];
  // },
  //   [[], 0]
  // );

  const MAX_VALUE = 5200;
  return {
    id: `mesh-${key}`,
    type: "circle",
    source: {
      type: "geojson",
      generateId: true,
      data: {
        type: "FeatureCollection",
        features: features.map((coordinates: any) =>
          Object({
            geometry: { type: "Point", coordinates },
            properties: {
              q: ((100 + coordinates[2]) / MAX_VALUE - 1) ** 2,
              ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5),
            },
          })
        ),
      },
      attribution: "",
    },
    component: "location",
    paint: {
      "circle-radius": {
        stops: [
          [0, 0.2],
          [22, 4],
        ],
      },
      "circle-stroke-width": 0,
      "circle-color": [
        "rgba",
        ["*", 127, ["get", "q"]],
        ["*", 127, ["get", "ln"]],
        ["*", 127, ["-", 1, ["get", "q"]]],
        0.75,
      ],
    },
  };
};
