import {DOMParser} from "xmldom";

export type FileSystem = {
    objects: {
        key: string;
        updated: string;
        size: string;
    }[];
    collections: {
        key: string;
    }[];
};

/**
 * Make HTTP request to S3 service for metadata about available
 * assets.
 * 
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors,
 * because window.DOMParser is not available in Web Worker 
 */
export async function getFileSystem(url: string): Promise<FileSystem> {

    const parser = new DOMParser();
    const text = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
    }).then(response => response.text());

    const xmlDoc = parser.parseFromString(text, "text/xml");
    const [result] = Object.values(xmlDoc.children).filter(
        (x) => x.nodeName === "ListBucketResult"
    );
    const nodes = Array.from(result.children);
    return {
        objects: nodes.filter(
            ({tagName}) => tagName === "Contents"
        ).map(node => Object({
            key: node.childNodes[0].textContent,
            updated: node.childNodes[1].textContent,
            size: node.childNodes[3].textContent,
        })),
        collections: nodes.filter(
            ({tagName}) => tagName === "CommonPrefixes"
        ).map(node => Object({
            key: node.childNodes[0].textContent
        }))
    };
}

/**
 * Get image data from S3, the Blob-y way. 
 */
export const fetchImageBuffer = async (url: string): Promise<Float32Array> => {
    const blob = await fetch(url).then(response => response.blob());
    const arrayBuffer: string | ArrayBuffer | null = await (new Promise(resolve => {
        var reader = new FileReader();
        reader.onloadend = () => { resolve(reader.result); };
        reader.readAsArrayBuffer(blob);
    }));
    if (arrayBuffer instanceof ArrayBuffer) {
        return new Float32Array(arrayBuffer);
    } else {
        throw TypeError("Result is not ArrayBuffer type")
    }   
}
