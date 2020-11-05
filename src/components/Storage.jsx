import React, {useEffect, useState} from "react";
import styled from "styled-components";
import Table from "../components/Table";

const StyledError = styled.div`
    color: orange;
    text-align: center;
    border: 1px solid;
    margin: 0;
`;

const useObjectStorageHook = ({target}) => {

    
    const [ fileSystem, setFileSystem ] = useState(null);
    
    useEffect(() => {

        fetch(target, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        })
            .then(response => response.text())
            .then(text => {
                
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");

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
        
    }, []);

    return fileSystem;
}

export default ({target}) => {

    const fileSystem = useObjectStorageHook({target});

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
    
    return <>
        {fileSystem ? 
        <>
        <h3>{"Assets"}</h3>
        <Table 
            order={order} 
            records={fileSystem} 
            schema={schema}
        />
        </> : <StyledError>
            {"(!) Object storage unavailable"}
        </StyledError>}
    </>
};
