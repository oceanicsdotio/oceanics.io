import type { Handler } from '@netlify/functions';


interface IQuery {
    interval: [string, string];
    limit: number;
    encoding: "text"|"json"; 
    node: number;
    observedProperties: string[];
}

const handler: Handler = async ({
    queryStringParameters
}) => {

    const {
        interval=[null, null], 
        limit=null, 
        encoding="text", 
        node=null,
        observedProperties=null
    } = queryStringParameters as unknown as IQuery;

    const badRequest = 
        (!limit && !interval[0] && !interval[1]) || 
        (!observedProperties && !node) || 
        (!(encoding in ["text", "json"]));

    if (badRequest) return {body: "Bad request", statusCode: 400};

    const times = limit ? `&newest=${limit}` : `&min_date=${interval[0]}&max_date=${interval[1]}`;
    let content;

    fetch(
        `http://${process.env.BUOY_DATA_HOSTNAME}/cgi-data/nph-data.cgi?data_format=text&node=${node}&y=${observedProperties.join(",")}${times}`
    ).then(
        response => response.text()
    ).then(
        text => {
            if (encoding === "text"){
                content=text;
            } else if (encoding === "json") {
                let lines = text.split("\n").filter(x=>x.length);
                const [name, alias] = lines.shift().split("-");
                const aliases = [...(new Set([alias, lines.shift()].map(x=>x.trim())))];
                
                let records = lines.map(x=>x.split("\t"));
                const keys = records.shift();
                content = JSON.stringify({
                    name,
                    aliases,
                    values: records.map(line => Object.fromEntries(line.map((field, ii)=>[keys[ii], field])))
                });
            }
        }
    );
    
  
    return {
        body: content, 
        headers: { 'Content-Type': 'application/json' },
        statusCode: 200
    };
           
};

export { handler }

