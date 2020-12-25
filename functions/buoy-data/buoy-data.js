

exports.handler = async ({
    queryParameters: {
        interval=[null, null], 
        limit=null, 
        encoding="text", 
        node=null,
        observedProperties=null
}}) => {

    const badRequest = 
        (!limit && !interval[0] && !interval[1]) || 
        (!observedProperties && !node) || 
        (!(encoding in ["text", "json"]));

    if (badRequest) return {body: "Bad request", statusCode: 400};

    const times = limit ? `&newest=${limit}` : "&min_date={}&max_date={}".format(...interval);
    let content;

    fetch(
        `http://${process.env.BUOY_DATA_HOSTNAME}/cgi-data/nph-data.cgi?data_format=text&node=${node}&y=${fields.join(",")}${times}`
    ).then(
        response => response.text()
    ).then(
        text => {
            if (encoding === "text"){
                content=text;
            } else if (encoding === "json") {
                let lines = text.split("\n").filter(x=>x.length|false);
                const [name, alias] = lines.shift().split("-");
                const aliases = [...(new Set([alias, lines.shift()].map(x=>x.trim())))];
                
                lines = lines.map(x=>x.split("\t"));
                const keys = lines.shift();
                content = JSON.stringify({
                    name,
                    aliases,
                    values: lines.map(line => Object.fromEntries(line.map((field, ii)=>[keys[ii], field])))
                });
            }
        }
    );
    
  
    return {body: content, statusCode: 200};
           
};

