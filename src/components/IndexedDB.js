import React, { useState } from "react";
import Form from "../components/Form";
import Table from "../components/Table";

const DB_NAME = "indexed-db-testing";
const DB_VERSION = 1;
const DB_STORE = "observations";
const Observations = [
    { id: 1234, value: 2.0, coordinates: [0.0, 1.0] },
    { id: 1235, value: 2.4, coordinates: [0.0, 0.0] },
    { id: 1237, value: 2.3, coordinates: [1.0, 0.0] },
];


let db;
let logging = [];


function openDatabase(callback) {

    let request = indexedDB.open(DB_NAME, DB_VERSION); // IDBOpenDBRequest

    request.onerror = (event) => {
        console.log(event);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        callback(db);
    };

    request.onblocked = (_) => {
        console.log("Close other open tabs to allow database upgrade");
    };

    // only implemented in recent browsers
    request.onupgradeneeded = (event) => {

        db = event.target.result;
        const params = { keyPath: "id" };
        // { autoIncrement: True }

        let objectStore;
        if (!db.objectStoreNames.contains(DB_STORE)) {
            objectStore = db.createObjectStore("observations", params);
        } else {
            objectStore = request.transaction.objectStore(DB_STORE);
        }

        objectStore.createIndex("value", "value", { unique: false });

    };
}

const getObjectStore = (db, name, mode = "readonly") => {

    let transaction = db.transaction(name, mode);
    transaction.oncomplete = (_) => {
        logging.push("Transaction complete.");
    };
    transaction.onerror = (event) => {
        console.log("Transaction error.", event.target);
    };
    return transaction.objectStore(name);
};

const clearObservations = (db) => {
    /*
    Purge object store
    */
    let store = getObjectStore(db, DB_STORE, "readwrite");
    let request = store.clear();
    request.onsuccess = (_) => {
        logging.push("Purged object store.");
    };
    request.onerror = (_) => {
        console.log("Problem purging object store.");
    }
};


const createObservations = (obs) => {

    return (db) => {

        let objStore = getObjectStore(db, DB_STORE, "readwrite");

        obs.forEach((obs) => {

            let request = objStore.openCursor(obs.id);
            request.onsuccess = (event) => {
                let cursor = event.target.result;
                if (cursor) {
                    console.log("Key already exists");
                    cursor.update(obs);
                } else {
                    logging.push("Added key");
                    objStore.add(obs)
                }
            };

            request.onerror = (event) => {
                throw Error(event.target);
            };

        });
    }
};

const deleteObservation = (key) => {
    /*
    Delete a single object by key
    */
    return db => {
        let deleteRequest = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).delete(key);
        deleteRequest.onsuccess = (_) => {
            logging.push(`Deleted ${key}`);
        };
    };
};

const getObservation = (key) => {
    /*
    Get a single object by the key
    */
    return db => {
        const transaction = db.transaction(DB_STORE);
        const objectStore = transaction.objectStore(DB_STORE);
        let request = objectStore.get(key);
        request.onerror = (_) => {
            console.log("Error fetching object");
        };
        request.onsuccess = (event) => {
            logging.push(`Get ${key}`);
        };
    }
};


const getObservations = () => {
    return db => {
        db
            .transaction(DB_STORE, "readwrite")
            .objectStore(DB_STORE)
            .openCursor()
            .onsuccess = (event) => {
                let cursor = event.target.result;
                if (cursor) {
                    console.log([cursor.key, cursor.value]);
                    cursor.continue();
                } else {
                    logging.push("End of records")
                }
            };
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

    return (db) => {

        const objectStore = db.transaction(DB_STORE).objectStore(DB_STORE);
        const index = objectStore.index(indexName);
        let cursorRequest = returnValue ?
            index.openCursor(keyRange, direction) : index.openKeyCursor(keyRange, direction);

        cursorRequest.onsuccess = (event) => {
            let cursor = event.target.result;
            if (cursor) {
                console.log([cursor.key, cursor[returnValue ? "value" : "primaryKey"]]);
                cursor.continue();
            } else {
                logging.push("End of records")
            }
        };
    };
};

const InterfaceBlock = (props) => {

    const { header, form } = props;

    return (
        <>
            <h3>{header}</h3>
            <Form {...form} />
            <hr />
        </>
    );
};


export default (props) => {

    const [obs, setObs] = useState([]);

    const interfaces = [{
        header: "Add observations",
        form: {
            id: "create-form",
            fields: [{
                id: "new-observation-id",
                name: "ID",
                required: true

            }, {
                id: "observed-value",
                name: "Value",
                required: true
            }, {
                id: "coordinates",
                name: "Coordinates"
            }],
            actions: [{
                id: "add",
                value: "Add observation",
                onClick: (event) => console.log("Add observation")
            }, {
                id: "populate",
                value: "Populate",
                onClick: (event) => openDatabase(createObservations(Observations))
            }]
        }
    }, {
        header: "Delete observations",
        form: {
            id: "delete-form",
            fields: [{
                id: "delete-observation-id",
                name: "ID"
            }, {
                id: "key-to-delete",
                name: "Key"
            }],
            actions: [{
                id: "delete",
                value: "Delete",
                destructive: true,
                onClick: (event) => openDatabase(deleteObservation(1234))
            }, {
                id: "clear-store",
                value: "Delete all",
                destructive: true,
                onClick: () => openDatabase(clearObservations)
            }]
        }
    }, {
        header: "Search observations",
        form: {
            id: "search-form",
            actions: [{
                id: "list-one",
                value: "Get one",
                onClick: event => openDatabase(getObservation(1234))
            }, {
                id: "list-all",
                value: "List all",
                onClick: (event) => openDatabase(getObservations())
            }, {
                id: "search-list",
                value: "Search records",
                onClick: (event) => openDatabase(searchObservations("value"))
            }]
        }
    }];



    return (
        <>
            <h2>Local storage</h2>
            {interfaces.map(block => <InterfaceBlock {...block} />)}
            <h3>Database</h3>
            {obs.length ? <Table order="value" records={obs} /> : <></>}
        </>
    );
};