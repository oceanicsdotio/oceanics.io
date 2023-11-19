// import { VertexArray } from "oceanics-io-www-wasm";
// const ENCODER_RADIX = 36;
// const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
// const MAX_FRAGMENTS = null;  // practical limitation for testing
// const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT/8;

// ESRI feature
export type Feature = {
    attributes: {
        TOWN: string
        COUNTY: string
        GlobalId: string
        "Shape.STArea()": string 
    }
    geometry: unknown
}

// Convert from ESRI into canonical GeoJSON
export const reKeyFeatures = ({
    attributes: { 
        TOWN, 
        COUNTY, 
        GlobalId, 
        ["Shape.STArea()"]: area 
    }, 
    geometry 
}) => Object({
    properties: {
        area,
        town: TOWN,
        county: COUNTY,
        uuid: GlobalId
    },
    geometry
})

// Custom serializer for JSON that emits a fixed precision for numeric types
export const withPrecision = (precision: number) =>
    function(key: number|string, val: number) {
        if (isNaN(+key)) return val;
        return val.toFixed ? Number(val.toFixed(precision)) : val;
    }

// Convert CSV to single-precision Array
export const fromCsvString = (csvString: string, rows: [number, number], columns: [number, number]) => {

    const reduceLine = (acc: number[], line: string) => {
        const newItem = line
            .split(",")
            .slice(...columns)
            .map(x => parseFloat(x.trim()))
        return acc.concat(newItem)
    }

    // Lazy load lines
    const numerical = function*() {
        yield* csvString.split("\r\n").slice(...rows).reduce(reduceLine, []);
    }();
    return new Float32Array(numerical);
}

export type Variable = {
    offset: number,
    size: number,
    name: string
}

export const readVariables = (text: string) => {
    const {variables} = JSON.parse(text);
    const keys = {"lon": 0, "lat": 1, "h": 2};
    return variables.filter(({name}) => name in keys);
}

export const fromNetcdfBytes = async (
    // key: string, 
    delta: number, 
    // [start, end]: [number, number], 
    // {offset, size, name}: Variable
) => {
    const width = 4;
    const copy = new ArrayBuffer((delta) * width);
    // const dv = new DataView(copy);

    // const range = `bytes=${offset+start*width}-${offset+end*width*4}`

    // const view = new DataView((await s3.getObject({
    //     Bucket: process.env.BUCKET_NAME,
    //     Key: key,
    //     Range: range
    // }).promise()).Body.buffer);

    // for (let ii = 0; ii < (delta-1); ii++) {
    //     const value = view.getFloat32(ii * width, false);
    //     const index = (ii * 3 + keys[name]) * width;
    //     dv.setFloat32(index, value, true);  // swap endianness
    // }
    
    return new Float32Array(copy);
}



// Transform to pass into retrieve()
export const transformCsv = (text: string) => {
    const result = text.split("\n")
        .slice() // copy to prevent readable body disappearing
        .map(line => line.split(",").map(x => x.trim()).slice(1, 4));
    return JSON.stringify(result)
}