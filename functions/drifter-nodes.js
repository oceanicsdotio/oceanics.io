const { Endpoint, S3 } = require("aws-sdk");
const { readFileSync } = require('fs');

const prefix = "student-drifters";
const Bucket = "oceanicsdotio";

const s3 = new S3({
    endpoint: new Endpoint('nyc3.digitaloceanspaces.com'),
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});



[{
    key: "20200101025500-NCEI-L3C_GHRSST-SSTskin-AVHRR_Pathfinder-PFV5.3_NOAA19_G_2020001_night-v02.0-fv01.0",
    extension: "nc"
}].forEach(({key, extension}) => {

    if (extension === "nc") {
        (async () => {
            const data = readFileSync(`src/data/${key}.nc`);
            const reader = new NetCDFReader(data); // read the header
            s3.putObject({
                Bucket,
                Body: JSON.stringify({
                    variables: reader.variables,
                    version: reader.version
                }),
                ContentType: 'application/json',
                Key: `${prefix}/${key}/variables.json`,
            }, (err) => {
                if (err) throw err;
            });
        })();
    }

});


