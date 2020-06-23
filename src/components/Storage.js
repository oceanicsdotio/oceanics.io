import React, {useEffect, useState} from "react";

export default () => {

    const nullState = {};
    const [ summary, setSummary ] = useState(nullState);
    const [ fileSystem, setFileSystem ] = useState(nullState);


    useEffect(() => {
        
        (async () => {
            fetch(
                "https://oceanicsdotio.nyc3.digitaloceanspaces.com",
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

                    let nodes = {};
                    
                    xmlDoc.childNodes[0].childNodes.forEach(node => {
                        if (node.tagName == "Contents") {

                            const key = node.childNodes[0].textContent;
                            const path = key.split("/");
                            const _node = {
                                key: key,
                                updated: node.childNodes[1].textContent,
                                size: node.childNodes[3].textContent,
                            }

                            if (path[0] in nodes) {
                                nodes[path[0]].push(_node);
                            } else {
                                nodes[path[0]] = [_node];
                            }
                            
                        }
                        
                        
                    });
                    setFileSystem(nodes);
                })
                .catch(err => console.log(err))
        })()
    }, []);

    return (
        <div>
            <h2>Object storage interface</h2>
            <ol>
            {Object.entries(fileSystem).map(([collection, nodes]) => {
                return (
                    <li key={collection}>
                        <ul>
                            {nodes.map(node => <li>{node.key} ({(parseFloat(node.size) / 1000.0).toFixed(1)} kb)</li>)}
                        </ul>
                    </li>
                );
            })}
            </ol>
            
        </div>
    );
};