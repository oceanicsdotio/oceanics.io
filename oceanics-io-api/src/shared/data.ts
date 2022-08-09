import { Endpoint, S3 } from "aws-sdk";
import { createHash } from "crypto";
// import { VertexArrayBuffer, IndexInterval } from "./pkg";
// import NetCDFReader from 'netcdfjs';
import { readFileSync, writeFileSync } from 'fs';


interface IQuery {
    service: string;
    key: string;
    ext: string;
}

/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
const getJson = async ({
    queryStringParameters
}) => {
    const {
        service="bivalve",
        key="index",
        ext="json",
    } = queryStringParameters as unknown as IQuery
    try {    
        const {Body} = await s3.getObject({
            Bucket,
            Key: `${service}/${key}.${ext}`
        }).promise();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: Body.toString('utf-8')
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}


const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
const Bucket = "oceanicsdotio";
const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

interface IQuery {
    Service: string;
    Key: string;
    Ext: string;
}

/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
const getCsv = async ({
    queryStringParameters
}) => {

    const {
        Service="MidcoastMaineMesh",
        Key="midcoast_elements",
        Ext="csv",
    } = queryStringParameters as unknown as IQuery
    try {    
        const {Body} = await s3.getObject({
            Bucket,
            Key: `${Service}/${Key}.${Ext}`
        }).promise();

        const CSV = (
            Body?.toString('utf-8')??""
        )
            .split("\n")
            .slice() // copy to prevent readable body disappearing
            .map(line => line.split(",").map(x => x.trim()).slice(1, 4));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CSV)
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}


const MAX_FRAGMENTS = null;  // practical limitation for testing
const prefix = "MidcoastMaineMesh";

const sources = [{
    key: "midcoast_nodes",
    extension: "csv",
},
{
    key: "necofs_gom3_mesh",
    extension: "nc",
}];



const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
const ENCODER_RADIX = 36;
const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT/8;


const textData = async (Key: string) => 
    (await s3.getObject({Bucket, Key}).promise()).Body.toString('utf-8');


const fromCsvString = (start: number, end: number, csvString: string) => {
    
    const lines = csvString.split("\r\n")
    const total = lines.length;
    if (start > total || start < 0 || end < 0) 
        throw Error(`Index (${start},${end}) out of range (0,${total})`);
    const stop = Math.min(end, total);
    

    // Lazy load lines if necessary
    return new Float32Array(
        lines
            .slice(start, stop)
            .reduce((acc, line, ii) => {
                if (ii && !(ii % 2**12)) console.log(`Processing line ${ii}/${stop-start}...`);

                return acc.concat(
                    line.split(",")
                    .slice(1, 4)
                    .map(x => parseFloat(x.trim()))
                )
            },[])
    );
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

/**
 * Make slices of the Vertex Array Buffer for the points that form the 
 * spatial dimensions of the graph.
 * 
 * The function limits the length of the buffer and precision of the points.
 * The result is appropriate for visualization in web applications.
 */
// const VertexArrayBufferSlice = async ({
//     prefix,
//     key,
//     extension,
//     start,
//     end,
//     delta,
//     update=false,
//     source=null,
//     radix=ENCODER_RADIX,
//     returnSource=false,
// }: IVertexBuffer) => {

//     const vab = new VertexArrayBuffer(prefix, key, start, end, radix);
    
//     let lines = null;
    
//     // Check for existing fragment
//     const metadata = await s3.headObject({
//         Bucket,
//         Key: vab.fragment()
//     }).promise().catch((err: any) => {
//         if (err.code === "NotFound") return null;
//         else throw err;
//     });

    
//     if (!metadata || update) {

//         let data = null;

//         if (extension === "csv") {
//             lines = source || (await textData(`${prefix}/${key}.${extension}`)).split("\r\n");  // Lazy load lines if necessary    
//             data = fromCsvString(start, end, lines)
//         } else if (extension === "nc") {

//             const {variables} = JSON.parse(await textData(`${prefix}/${key}/variables.json`));

//             const width = 4;
//             const keys = {"lon": 0, "lat": 1, "h": 2};
//             const vars = variables.filter(({name}) => name in keys);
//             const arrayBuffer = new ArrayBuffer((delta)*3*width);
//             const dv = new DataView(arrayBuffer);

           
//             for (const k in vars) {

//                 const {offset, size, name} = vars[k];
//                 const range = [
//                     offset+start*width,
//                     offset+end*width*4
//                 ];

//                 const view = new DataView((await s3.getObject({
//                     Bucket,
//                     Key: `${prefix}/${key}.${extension}`,
//                     Range: `bytes=${range[0]}-${range[1]}`
//                 }).promise()).Body.buffer);

//                 for (let ii = 0; ii < (delta-1); ii++) {
//                     const index = (ii * 3 + keys[name]) * width;
//                     try {
//                         const value = view.getFloat32(ii*width, false);
//                         dv.setFloat32(index, value, true);  // swap endiannesskeys
//                     } catch (err) {
//                         console.log({
//                             length: view.buffer.byteLength, 
//                             getIndex: ii*width,
//                             setIndex: index,
//                             range,
//                             offset,
//                         });
//                         throw err;
//                     } 
//                 }
//             }

//             data = new Float32Array(arrayBuffer);
    
//         } else 
//             throw Error(`Extension (${extension}) not supported.`);

//         if ((update && metadata.ETag !== `"${createHash('md5').update(data.buffer).digest('hex')}"`)) {
//             s3.putObject({
//                 Body: Buffer.from(data.buffer),
//                 Bucket,
//                 Key: vab.fragment(),
//                 ContentType: 'application/octet-stream',
//                 ACL:'public-read',
//             }, (err: Error) => {
//                 if (err) throw err;
//             });
//             console.log(`${!metadata ? "Created" : "Updated"} asset: ${vab.fragment()}`);
//         }
//     } 
 
//     return {
//         source: returnSource ? lines : null,
//         key: vab.fragment(),
//         interval: vab.interval(),
//         next: vab.next()
//     };
// };


// export const main = () => {[{
//     key: "20200101025500-NCEI-L3C_GHRSST-SSTskin-AVHRR_Pathfinder-PFV5.3_NOAA19_G_2020001_night-v02.0-fv01.0",
//     extension: "nc"
// }].forEach(({key, extension}) => {

//     if (extension === "nc") {
//         (async () => {
//             const data = readFileSync(`src/data/${key}.nc`);
//             const reader = new NetCDFReader(data); // read the header
//             s3.putObject({
//                 Bucket,
//                 Body: JSON.stringify({
//                     variables: reader.variables,
//                     version: reader.version
//                 }),
//                 ContentType: 'application/json',
//                 Key: `${prefix}/${key}/variables.json`,
//             }, (err: Error) => {
//                 if (err) throw err;
//             });
//         })();
//     }

//     let next = [0, MAX_SLICE_SIZE];  // next interval to process
//     let count = 0;  // counter for testing
//     let source = null;  // memoize the source data to speed up batches
    
//     (async () => {
//         while (next && (!MAX_FRAGMENTS || count < MAX_FRAGMENTS)) {
//             const [start, end] = next;
//             let result = await VertexArrayBufferSlice({
//                 key,
//                 extension,
//                 prefix,
//                 start,
//                 end,
//                 source,
//                 returnSource: true,
//                 returnData: true
//             });
        
//             next = result.next;
//             source = result.source;
//             count += 1;
    
//             delete result.source;
//             result.dataUrl = result.dataUrl.slice(0,64);
    
//             console.log({result});
//         } 
//     })();

//     (async () => {

//         const interval = (new IndexInterval(0, MAX_SLICE_SIZE, 36)).interval();

//         const data = new Float32Array((await s3.getObject({
//             Bucket,
//             Key: `${prefix}/${key}/nodes/${interval.hash}`
//         }).promise()).Body.buffer);
    
//         const base64 = Buffer.from(data.buffer).toString("base64");
//         const dv = new DataView(Buffer.from(base64, "base64").buffer);
    
//         console.log({
//             base64: `${base64.slice(0,16)}...`,
//             sample: dv.getFloat32(0, true),
//         });
//     })();
// });}



interface IQuery {
    infile: string;
    outfile: string;
}

const compressGeoJson = async ({
    infile,
    outfile
}: IQuery) => {

   
    // https://gis.maine.gov/arcgis/rest/services/Boundaries/Maine_Boundaries_Town_Townships/MapServer/2/query?where=LAND%20%3D%20%27n%27&outFields=OBJECTID,TOWN,COUNTY,ISLAND,ISLANDID,TYPE,Shape,GlobalID,Shape.STArea(),last_edited_date,CNTYCODE&outSR=4326&f=json
    let data = JSON.parse(readFileSync(infile).toString());

    // const counter = (a, b) => 
    //     Object({...a, [b]: b in a ? a[b]+1 : 1});

    // const ringCount = data.features
    //     .map(({geometry:{rings}})=>rings.length)
    //     .reduce(counter, {});

    // console.log(`${data.features.length} features`);
    // console.log("Rings:", ringCount);

    const text = JSON.stringify(
        data.features.map(
            ({attributes:{TOWN, COUNTY, GlobalId, ...attributes}, geometry})=>Object({
                properties: {
                    area: attributes["Shape.STArea()"],
                    town: TOWN,
                    county: COUNTY,
                    uuid: GlobalId
                },
                geometry
            })
        ), 
        function(key, val) {
            if (isNaN(+key)) return val;
            return val.toFixed ? Number(val.toFixed(5)) : val;
        }
    );

    writeFileSync(outfile, text);

    return {
        statusCode: 204
    };
};

