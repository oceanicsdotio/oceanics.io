import React from "react"
import { graphql } from "gatsby"

import Layout from "../components/Layout"
import SEO from "../components/seo"


const TextInput = (props) => {

  const {uniqueName, displayName, className=null} = props;
  return (
    <div >
      <label
        htmlFor={uniqueName}
        className={className}
        style={{
          display: "block"
        }}>
        {displayName}
      </label>
      <input
        type="text"
        id={uniqueName}
        name={uniqueName}
        style={{
          display: "block"
        }}/>
    </div>
  )
};

const Button = (props) => {
  const {action, value, onClick, className=null} = props;
  return (
    <input
      type={"button"}
      id={action+"-button"}
      value={value}
      onClick={onClick}
      className={className}
      style={{
        display: "block"
      }}
    />
  )
};


const Form = (props) => {
  const {id, fields=null, actions} = props;
  return (
    <form
      id={id}
      style={{
        display: "block"
      }}>
      { fields !== null ? fields.map(TextInput) : <></> }
      <div
        className={"button-pane"}
        style={{
          marginTop: "1em"
        }}
      >
        {actions.map(Button)}
      </div>
    </form>
  )
};


const DB_NAME = "indexed-db-testing";
const DB_VERSION = 1;
const DB_STORE = "observations";
const Observations = [
  { id: 1234, value: 2.0, coordinates: [ 0.0, 1.0 ] },
  { id: 1235, value: 2.4, coordinates: [ 0.0, 0.0 ] },
  { id: 1237, value: 2.3, coordinates: [ 1.0, 0.0 ] },
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
    const params = {keyPath: "id"};
    // { autoIncrement: True }

    let objectStore;
    if (!db.objectStoreNames.contains(DB_STORE)) {
      objectStore = db.createObjectStore("observations", params);
    } else {
      objectStore = request.transaction.objectStore(DB_STORE);
    }

    objectStore.createIndex("value", "value", {unique: false});

  };
}

const getObjectStore = (db, name, mode="readonly") => {

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
  let store = getObjectStore(db, DB_STORE, "readwrite");
  let request = store.clear();
  request.onsuccess = (_) => {
    logging.push("Purged object store.");
  };
  request.onerror = (_) => {
    console.log("Problem purging object store.");
  }
};


const createObservations = (db) => {

  let objStore = getObjectStore(db, DB_STORE, "readwrite");

  Observations.forEach((obs) => {

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
};

const deleteObservation = (key) => {
  /*
  Delete a single object by key
  */
  return (db) => {
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
  return (db) => {
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
  return (db) => {

    const transaction = db.transaction(DB_STORE, "readwrite");
    const objectStore = transaction.objectStore(DB_STORE);

    objectStore.openCursor().onsuccess = (event) => {
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

const searchObservations = (indexName, value=null, bounds=null) => {

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

  if (value !== null){
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


class IndexedDB extends React.Component {

  render() {
    const { data } = this.props;
    const siteTitle = data.site.siteMetadata.title;

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title={"Situational awareness for a changing ocean"} />

        <Form
          id={"create-form"}
          actions={[{
            id: "add",
            value: "Add observation",
            onClick: (event) => {console.log("Add observation")}
          },{
            id: "populate",
            value: "Populate",
            onClick: (event) => {openDatabase(createObservations)}
          }]}
          fields={[{
            uniqueName: "new-observation-id",
            displayName: "ID",
            className: "required"
          },{
            uniqueName: "observed-value",
            displayName: "Value",
            className: "required"
          },{
            uniqueName: "coordinates",
            displayName: "Coordinates"
          }]}/>
        <hr/>

        <Form
          id={"delete-form"}
          actions={[{
            id: "delete",
            value: "Delete",
            onClick: (event) => {openDatabase(deleteObservation(1234));}
          },{
            id: "clear-store",
            value: "Delete all",
            className: "destructive",
            onClick: (event) => {openDatabase(clearObservations);}
          }]}
          fields={[{
            uniqueName: "delete-observation-id",
            displayName: "ID"
          },{
            uniqueName: "key-to-delete",
            displayName: "Key"
          }]}/>

        <hr/>

        <Form
          id={"search-form"}
          actions={[{
            id: "list-one",
            value: "Get one",
            onClick: (event) => {openDatabase(getObservation(1234))}
            },{
            id: "list-all",
            value: "Dump records",
            onClick: (event) => {openDatabase(getObservations());}
          }, {
            id: "search-list",
            value: "Search records",
            onClick: (event) => {openDatabase(searchObservations("value"));}
          }
          ]}/>

      </Layout>
    )
  }
}

export default IndexedDB

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
