import { DOMParser } from "xmldom";
import type { FileSystem } from "./shared";
const ctx: Worker = self as unknown as Worker;

/**
 * Make HTTP request to S3 service for metadata about available
 * assets.
 * 
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors,
 * because window.DOMParser is not available in Web Worker 
 */
async function getFileSystem(url: string): Promise<FileSystem> {

    const parser = new DOMParser();
    const text = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache"
    }).then(response => response.text());

    const xmlDoc = parser.parseFromString(text, "text/xml");
    const [result] = Object.values(xmlDoc.children).filter(
        (x) => x.nodeName === "ListBucketResult"
    );
    const nodes = Array.from(result.children);
    return {
        objects: nodes.filter(
            ({ tagName }) => tagName === "Contents"
        ).map(node => Object({
            key: node.childNodes[0].textContent,
            updated: node.childNodes[1].textContent,
            size: node.childNodes[3].textContent,
        })),
        collections: nodes.filter(
            ({ tagName }) => tagName === "CommonPrefixes"
        ).map(node => Object({
            key: node.childNodes[0].textContent
        }))
    };
}

/**
 * Get image data from S3, the Blob-y way. 
 */
const fetchImageBuffer = async (url: string): Promise<Float32Array> => {
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

const onMessage = async (event: any) => {
    switch (event.data.type) {
        case "status":
            ctx.postMessage({
                type: "status",
                data: "ready",
            });
            return;
        case "index":
            ctx.postMessage({
                type: "data",
                data: await getFileSystem(event.data.url),
            });
            return;
        case "blob":
            ctx.postMessage({
                type: "data",
                data: await fetchImageBuffer(event.data.url),
            });
            return
    }
}

ctx.addEventListener("message", onMessage);
