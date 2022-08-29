import fs from 'fs/promises';

type Feature = {
    attributes: {
        TOWN: string
        COUNTY: string
        GlobalId: string
        "Shape.STArea()": string 
    }
    geometry: unknown
}
type DataJson = {
    features: Feature[]
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

    // const counter = (a, b) => 
    //     Object({...a, [b]: b in a ? a[b]+1 : 1});

    // const ringCount = features
    //     .map(({geometry:{rings}})=>rings.length)
    //     .reduce(counter, {});


import { Handler } from "@netlify/functions";

// https://gis.maine.gov/arcgis/rest/services/Boundaries/Maine_Boundaries_Town_Townships/MapServer/2/query?where=LAND%20%3D%20%27n%27&outFields=OBJECTID,TOWN,COUNTY,ISLAND,ISLANDID,TYPE,Shape,GlobalID,Shape.STArea(),last_edited_date,CNTYCODE&outSR=4326&f=json
export const handler: Handler = (event, context) => {


  (async () => {
    const {features}: DataJson = await fs.readFile(infile, "utf8").then(text => JSON.parse(text));
    const text = JSON.stringify(features.map(reKeyFeatures), withPrecision(5));
    await fs.writeFile(outfile, text);
  })();
};

