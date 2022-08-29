import { s3, NetlifyRouter } from "./shared/middleware";
import type { S3 } from "aws-sdk";
import type { ApiHandler } from "./shared/middleware";
import apiSpec from "./shared/bathysphere.json";
import { createHash } from "crypto";
import { VertexArray } from "oceanics-io-www-wasm";

const ENCODER_RADIX = 36;
const MAX_FRAGMENTS = null;  // practical limitation for testing
const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT/8;

        /**
 * Make slices of the Vertex Array Buffer for the points that form the 
 * spatial dimensions of the graph.
 * 
 * The function limits the length of the buffer and precision of the points.
 * The result is appropriate for visualization in web applications.
 */
const nextPage = () => {
    let next = [0, MAX_SLICE_SIZE];  // next interval to process
    let count = 0;  // counter for testing
    let source = null;  // memoize the source data to speed up batches
    
    while (next && (!MAX_FRAGMENTS || count < MAX_FRAGMENTS)) {
        const [start, end] = next;


    const vab = new VertexArray(prefix, key, start, end, radix);
    
    let lines = null;
    
    if ((update && metadata.ETag !== `"${createHash('md5').update(data.buffer).digest('hex')}"`)) {
        
    }
    
 
    return {
        source: returnSource ? lines : null,
        key: vab.fragment(),
        interval: vab.interval(),
        next: vab.next()
    };
};

        let result = await VertexArrayBufferSlice({
            key,
            start,
            end,
            source,
            returnSource: true,
            returnData: true
        });
    
        next = result.next;
        source = result.source;
        count += 1;

        delete result.source;
        result.dataUrl = result.dataUrl.slice(0, 64);
    } 
}

interface IVertexBuffer {
    prefix: string;
    key: string;
    extension: string;
    start: number;
    end: number;
    delta: number;
    update?: boolean;
    source?: string|null;
    radix?: number;
    returnSource?: boolean;
}

// ESRI feature
type Feature = {
    attributes: {
        TOWN: string
        COUNTY: string
        GlobalId: string
        "Shape.STArea()": string 
    }
    geometry: unknown
}

// Convert from ESRI into canonical GeoJSON
const reKeyFeatures = ({
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
const withPrecision = (precision: number) =>
    function(key: number|string, val: number) {
        if (isNaN(+key)) return val;
        return val.toFixed ? Number(val.toFixed(precision)) : val;
    }

// Convert CSV to single-precision Array
const fromCsvString = (csvString: string, rows: [number, number], columns: [number, number]) => {

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

type Variable = {
    offset: number,
    size: number,
    name: string
}

const readVariables = (text: string) => {
    const {variables} = JSON.parse(text);
    const keys = {"lon": 0, "lat": 1, "h": 2};
    return variables.filter(({name}) => name in keys);
}

const fromNetcdfBytes = async (
    key: string, 
    delta: number, 
    [start, end]: [number, number], 
    {offset, size, name}: Variable
) => {
    const width = 4;
    const copy = new ArrayBuffer((delta) * width);
    const dv = new DataView(copy);

    const range = `bytes=${offset+start*width}-${offset+end*width*4}`

    const view = new DataView((await s3.getObject({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        Range: range
    }).promise()).Body.buffer);

        for (let ii = 0; ii < (delta-1); ii++) {
            const value = view.getFloat32(ii * width, false);
            const index = (ii * 3 + keys[name]) * width;
            dv.setFloat32(index, value, true);  // swap endianness
        }
    }

    return new Float32Array(copy);
}



// Transform to pass into retrieve()
export const transformCsv = (text: string) => {
    const result = text.split("\n")
        .slice() // copy to prevent readable body disappearing
        .map(line => line.split(",").map(x => x.trim()).slice(1, 4));
    return JSON.stringify(result)
}

const metadata: ApiHandler = async ({
    queryStringParameters: {
        key
    }
}) => {
    // Check for existing fragment
    let meta;
    try {
        meta = await s3.headObject({
            Bucket: process.env.BUCKET_NAME,
            Key: key
        }).promise();
    } catch ({code}) {
        if (code === "NotFound") {
            return {
                statusCode: 404,
                body: "Not Found"
            }
        }
    }
    return {
        statusCode: 200,
        headers: {
            ...meta
        }
    }
}

/**
 * Create a new object in the S3 service
 */
const create: ApiHandler = async ({
    queryStringParameters: {
        key
    },
    body
}) => {
    try {
        await s3.putObject({
            Body: Buffer.from(body),
            Bucket: process.env.BUCKET_NAME,
            Key: key,
            ContentType: 'application/octet-stream',
            ACL:'public-read',
        }).promise();
    } catch ({code}) {
        return {
            statusCode: 500
        }
    }
    return {
        statusCode: 204
    }
}

/**
 * Browse saved results for a single model configuration.
 */
const retrieve: ApiHandler = async ({
    queryStringParameters: {
        key
    }
}) => {
    let Body: S3.Body;
    try {    
        ({Body} = await s3.getObject({
            Bucket: process.env.BUCKET_NAME,
            Key: key
        }).promise()); 
    } catch ({message, statusCode}) {
        return { 
            statusCode: statusCode ?? 500, 
            body: message
        }
    }
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: Body?.toString('utf-8')??""
    };
}

export const handler = NetlifyRouter({
    GET: retrieve,
    HEAD: metadata,
    POST: create
}, apiSpec.paths["/storage"]);