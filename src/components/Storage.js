import React, {useEffect, useState} from "react";
import Table from "../components/Table";

export default () => {

    const [ fileSystem, setFileSystem ] = useState(null);

    const order = "key";
    const schema = [{
        label: "key",
        type: "string"
    },{
        label: "size",
        type: "float",
        parse: (x) => { return parseInt(x) },
        // format: (x) => { return `${x.toFixed(1)}` }
    },{
        label: "updated",
        type: "datetime"
    }];
    
    useEffect(() => {
        
        (async () => {
            fetch(
                "https://oceanicsdotio.nyc3.digitaloceanspaces.com?delimiter=/",
                {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                }
            )
                .then(response => response.text())
                .then(text => {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text,"text/xml");

                    let objects = [];
                    let collections = [];
                    
                    xmlDoc.childNodes[0].childNodes.forEach(node => {

                        if (node.tagName == "Contents") {
                            objects.push({
                                key: node.childNodes[0].textContent,
                                updated: node.childNodes[1].textContent,
                                size: node.childNodes[3].textContent,
                            })
                            
                        } else if (node.tagName == "CommonPrefixes") {
                            collections.push(node);
                        }
                        
                    });
                    setFileSystem(objects);
                })
                .catch(err => console.log(err))
        })()
    }, []);

    return (
        <>
            <h2>Object storage</h2>
            {fileSystem ? <Table order={order} records={fileSystem} schema={schema}/> : null}
        </>
    );
};