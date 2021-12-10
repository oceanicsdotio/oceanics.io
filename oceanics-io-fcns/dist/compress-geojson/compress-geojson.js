"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const fs_1 = require("fs");
const handler = async ({ queryStringParameters }) => {
    const { infile = 'src/data/maine-towns-water.json', outfile = 'src/data/maine-coast-minified.geojson' } = queryStringParameters;
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
exports.handler = handler;
