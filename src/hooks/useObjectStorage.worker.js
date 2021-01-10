import {DOMParser} from "xmldom"; // window.DOMParser is not available in Web Worker

export async function getFileSystem(target) {
    return await fetch(target, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
    })
        .then(response => response.text())
        .then(text => {
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            const result = Object.values(xmlDoc.childNodes).filter(x => x.nodeName === "ListBucketResult")[0];
            const nodes = Array.from(result.childNodes);

            return {
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
            };
        })
        .catch(err => {console.log(err)})
}