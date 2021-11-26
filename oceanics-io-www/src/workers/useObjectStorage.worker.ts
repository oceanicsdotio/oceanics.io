import { DOMParser } from "xmldom";
import type { FileSystem } from "./shared";
const ctx: Worker = self as unknown as Worker;
let parser: DOMParser|null = null;

/**
 * Make HTTP request to S3 service for metadata about available
 * assets.
 * 
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors,
 * because window.DOMParser is not available in Web Worker 
 */
async function getNodes(url: string, parser: DOMParser): Promise<ChildNode[]> {
    const text = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache"
    }).then(response => response.text());

    const xmlDoc = parser.parseFromString(text, "text/xml");
    const [result] = Object.values(xmlDoc.childNodes).filter(
        (x) => x.nodeName === "ListBucketResult"
    );
    return Array.from(result.childNodes);
}

/**
 * Retrieve remote file metadata and format it as a
 * serializable message. 
 */
async function getFileSystem(url: string): Promise<FileSystem> {
    if (!parser) parser = new DOMParser();
    
    const nodes = await getNodes(url, parser);
    const filter = (match: string) => ({ tagName }: any) => tagName === match;
    const fileObject = (node: ChildNode) => Object({
        key: node.childNodes[0].textContent,
        updated: node.childNodes[1].textContent,
        size: node.childNodes[3].textContent,
    })
    const fileCollection = (node: ChildNode) => Object({
        key: node.childNodes[0].textContent
    })

    const objects = nodes.filter(filter("Contents")).map(fileObject)
    const collections = nodes.filter(filter("CommonPrefixes")).map(fileCollection)

    return { objects, collections };
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

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", async ({data}: MessageEvent) => {
    switch (data.type) {
        case "status":
            ctx.postMessage({
                type: "status",
                data: "ready",
            });
            return;
        case "index":
            ctx.postMessage({
                type: "data",
                data: await getFileSystem(data.url),
            });
            return;
        case "blob":
            ctx.postMessage({
                type: "data",
                data: await fetchImageBuffer(data.url),
            });
            return;
    }
})
