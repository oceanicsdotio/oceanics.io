import {useEffect, useState} from "react";

export default ({
    target
}) => {

    const [ fileSystem, setFileSystem ] = useState(null);
    
    useEffect(() => {

        if (!target) return;

        fetch(target, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        })
            .then(response => response.text())
            .then(text => {
                
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                const nodes = Array.from(xmlDoc.childNodes[0].childNodes);

                setFileSystem({
                    objects: nodes.filter(
                        ({tagName}) => tagName == "Contents"
                    ).map(node => Object({
                        key: node.childNodes[0].textContent,
                        updated: node.childNodes[1].textContent,
                        size: node.childNodes[3].textContent,
                    })),
                    collections: nodes.filter(
                        ({tagName}) => tagName == "CommonPrefixes"
                    ).map(node => Object({
                        key: node.childNodes[0].textContent
                    }))
                });
            })
            .catch(err => console.log(err))
        
    }, []);

    return fileSystem;
};