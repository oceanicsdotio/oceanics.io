import {DOMParser} from "xmldom"; // window.DOMParser is not available in Web Worker


const DB_NAME = "use-object-storage-hook";
const DB_VERSION = 2;
const DB_STORE = "bathysphere";

let db; // memoize local database

/**
 * Use `xmldom.DOMParser` to parse S3 metadata as JSON file descriptors 
 * 
 * @param {*} target 
 */
const parseResponse = text => {

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
} 


/**
 * Make HTTP request to S3 service for metadata about available
 * assets
 * 
 * @param {*} target 
 */
export async function getFileSystem(target) {
    return fetch(target, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
    })
        .then(response => response.text())
        .then(parseResponse)
        .catch(err => {console.log(err)})
}


const openDatabase = ({callback, ...args}) => {

    let request = indexedDB.open(DB_NAME, DB_VERSION); // IDBOpenDBRequest
   
    request.onerror = event => {
        console.log(event);
    };

    request.onsuccess = ({target}) => {
        db = target.result;
        callback({db, ...args});
    };

    request.onblocked = (_) => {
        console.log("Close other open tabs to allow database upgrade");
    };

    // only implemented in recent browsers
    request.onupgradeneeded = ({target}) => {
        db = target.result;
        let objectStore;
        if (!db.objectStoreNames.contains(DB_STORE)) {
            objectStore = db.createObjectStore(DB_STORE, { keyPath: "url" });
        } else {
            objectStore = request.transaction.objectStore(DB_STORE);
        }

        objectStore.createIndex("value", "value", { unique: false });
    };
};


const serialize = (obj) => {

    if (obj.hasOwnProperty("@iot.id")) {
        Object.keys(obj).forEach(k => {
            if (k.includes("@")) {
                delete obj[k];
            }
        });
    }

    return Object.entries(obj).map(
        ([k, v]) => {
            let val = v instanceof Object ? serialize(v) : v;
            return [k, v].join(": ");
        }
    ).join(", ")
};

const deleteObservation = ({key}) => {
    db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).delete(key);
};


const getObservations = () => {
    db
        .transaction(DB_STORE, "readwrite")
        .objectStore(DB_STORE)
        .openCursor()
        .onsuccess = (event) => {
            let cursor = event.target.result;
            if (cursor) {
                console.log([cursor.key, cursor.value]);
                cursor.continue();
            }
        };
};

const searchObservations = (indexName, value = null, bounds = null) => {

    const direction = "next"; // "prev", "nextunique", "prevunique"
    const returnValue = true;

    if (value === null ? bounds !== null : bounds === null) {
        throw Error("ValueError");
    }
    let keyRange;
    if (bounds) {
        const [lower, upper] = bounds;
        keyRange = IDBKeyRange.bound(lower, upper, false, false); // inclusive
    }

    if (value !== null) {
        keyRange = IDBKeyRange.only(value);
    }

    const index = db.transaction(DB_STORE).objectStore(DB_STORE).index(indexName);
    let cursorRequest = returnValue ?
        index.openCursor(keyRange, direction) : index.openKeyCursor(keyRange, direction);

    cursorRequest.onsuccess = (event) => {
        let cursor = event.target.result;
        if (cursor) {
            console.log([cursor.key, cursor[returnValue ? "value" : "primaryKey"]]);
            cursor.continue();
        }
    };
};


export const fetchImageBuffer = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const array = await (new Promise(resolve => {
        var reader = new FileReader();
        reader.onloadend = () => { resolve(reader.result); };
        reader.readAsArrayBuffer(blob);
    }));
    return new Float32Array(array);
}

// export const fetch = async (url) => {
//     openDatabase({callback: ({db}) => {
//         let objStore = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE);
//         let request = objStore.openCursor(url);

//         request.onsuccess = (event) => {
//             let cursor = event.target.result;
//             if (cursor) {
//                 cursor.update(value);
//             } else {
//                 objStore.add(value)
//             }
//         };

//         request.onerror = (event) => {
//             throw Error(event.target);
//     };}});
// }




