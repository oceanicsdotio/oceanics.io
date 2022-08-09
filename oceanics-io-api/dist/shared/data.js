"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
// import { VertexArrayBuffer, IndexInterval } from "./pkg";
// import NetCDFReader from 'netcdfjs';
const fs_1 = require("fs");
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const getJson = async ({ queryStringParameters }) => {
    const { service = "bivalve", key = "index", ext = "json", } = queryStringParameters;
    try {
        const { Body } = await s3.getObject({
            Bucket,
            Key: `${service}/${key}.${ext}`
        }).promise();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: Body.toString('utf-8')
        };
    }
    catch (err) {
        return {
            statusCode: err.statusCode || 500,
            body: err.message
        };
    }
};
const spacesEndpoint = new aws_sdk_1.Endpoint('nyc3.digitaloceanspaces.com');
const Bucket = "oceanicsdotio";
const s3 = new aws_sdk_1.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const getCsv = async ({ queryStringParameters }) => {
    var _a;
    const { Service = "MidcoastMaineMesh", Key = "midcoast_elements", Ext = "csv", } = queryStringParameters;
    try {
        const { Body } = await s3.getObject({
            Bucket,
            Key: `${Service}/${Key}.${Ext}`
        }).promise();
        const CSV = ((_a = Body === null || Body === void 0 ? void 0 : Body.toString('utf-8')) !== null && _a !== void 0 ? _a : "")
            .split("\n")
            .slice() // copy to prevent readable body disappearing
            .map(line => line.split(",").map(x => x.trim()).slice(1, 4));
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CSV)
        };
    }
    catch (err) {
        return {
            statusCode: err.statusCode || 500,
            body: err.message
        };
    }
};
const MAX_FRAGMENTS = null; // practical limitation for testing
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
const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT / 8;
const textData = async (Key) => (await s3.getObject({ Bucket, Key }).promise()).Body.toString('utf-8');
const fromCsvString = (start, end, csvString) => {
    const lines = csvString.split("\r\n");
    const total = lines.length;
    if (start > total || start < 0 || end < 0)
        throw Error(`Index (${start},${end}) out of range (0,${total})`);
    const stop = Math.min(end, total);
    // Lazy load lines if necessary
    return new Float32Array(lines
        .slice(start, stop)
        .reduce((acc, line, ii) => {
        if (ii && !(ii % 2 ** 12))
            console.log(`Processing line ${ii}/${stop - start}...`);
        return acc.concat(line.split(",")
            .slice(1, 4)
            .map(x => parseFloat(x.trim())));
    }, []));
};
const compressGeoJson = async ({ infile, outfile }) => {
    // https://gis.maine.gov/arcgis/rest/services/Boundaries/Maine_Boundaries_Town_Townships/MapServer/2/query?where=LAND%20%3D%20%27n%27&outFields=OBJECTID,TOWN,COUNTY,ISLAND,ISLANDID,TYPE,Shape,GlobalID,Shape.STArea(),last_edited_date,CNTYCODE&outSR=4326&f=json
    let data = JSON.parse((0, fs_1.readFileSync)(infile).toString());
    // const counter = (a, b) => 
    //     Object({...a, [b]: b in a ? a[b]+1 : 1});
    // const ringCount = data.features
    //     .map(({geometry:{rings}})=>rings.length)
    //     .reduce(counter, {});
    // console.log(`${data.features.length} features`);
    // console.log("Rings:", ringCount);
    const text = JSON.stringify(data.features.map(({ attributes: { TOWN, COUNTY, GlobalId, ...attributes }, geometry }) => Object({
        properties: {
            area: attributes["Shape.STArea()"],
            town: TOWN,
            county: COUNTY,
            uuid: GlobalId
        },
        geometry
    })), function (key, val) {
        if (isNaN(+key))
            return val;
        return val.toFixed ? Number(val.toFixed(5)) : val;
    });
    (0, fs_1.writeFileSync)(outfile, text);
    return {
        statusCode: 204
    };
};
