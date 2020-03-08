# Oceanics.io

[![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)

The site is the homepage, and an application. The language are JavaScript and Rust. 



# JS Development

The local development version is deployed with `gatsby develop`, or `netlify dev`. The login functions using Netlify Identity will not work unless running with the later. The ports are `:8000` and `:8080` respectively.

The JavaScript dependencies and builds are managed with `yarn`. 



# Rust/WASM Development

The frontend uses Rust compiled to web assembly (WASM) in the frontend. 

To develop on WASM, you can get started with `rustup`, and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

The `wasm-bindgen` tooling packages WASM to interact with Javascript, and can be served 
as static files by compiling [without a bundler](https://github.com/rustwasm/wasm-bindgen/tree/master/examples/without-a-bundler)



Use `sh build-wasm.sh` to compile rust to webassembly and generate javascript bindings.

`Cargo.toml` describes the rust dependencies

## Rust crate

agent.rs - agent simulations

lib.rs - main routines

model.rs - model generation, triangulation

series.rs - datastreams

webgl.rs - webgl handlers and utilities



# Production

When new commits are checked into the Bitbucket repository, the site is deployed to `oceanicsdotio.netlify.com`, which has the custom domain `oceanics.io`.

The `functions-src` directory contains the Netlify functions to deploy along side the site. Currently these include features for user authorization, and secure API calls.

User management is through Netlify Identity for the time being.  



# IndexedDB API

We use the IndexedDB web API for storing data on the client. These are some notes and reminders about how that works.



## Overview

The API is asynchronous, and enforces a same-origin policy to protect user data. The exception is `<iframe>` content. Third-party scripts can data unless configured otherwise. It does not handle synchronizing with servers, full text searching, or intentional deletion of the database. There is also small chance of data loss if OS crashes before data is flushed to disk, but for important data you can override this and force durable transactions.

To store data in the browser:

1. Open DB
2. Create object store
3. start transaction, make request (RAII?)
4. listen for DOM event to signal operation is complete
5. Use callback



## Database

The **database** is a key-value store, in which changes are encapsulated in transactions. Databases have `name` and `version` (default 1).

**Object stores** have `name`, optional key generator, and key path. If there is a key path, the store uses in-line keys, otherwise out-of-line keys. **Keys** may be strings, dates, floats, binary blobs, or arrays. The browser uses a **key generator** to produce ordered sequence of keys. Keys can be properties of the objects. In-line keys are stored in the object, and found using key path that defines how to extract it. Out-of-line keys stored separately from the object. The key path can be an empty string, or one or more JavaScript identifiers. 



## Requests

The application makes **requests** (`IDBRequest`) for transactions with the object store. These can have handlers attached for `onsuccess` and `onerror`, with`addEventListener()`, `removeEventListener()`. They have the properties `readyState`, `result`, and `errorCode`.

The fired DOM **events** have `type` of `"success"` or `"error"` , and a `target`  of type `IDBRequest`.



## Transactions

Successful **transactions** (`IDBTransaction`) have types `readwrite`, `readonly`, and `versionchange` . They may be concurrent, for instance with Web Workers. Transactions have a lifetime, and always auto-commit. Indices, tables, cursors, etc tied are to transactions.

Concurrent write transactions are only allowed if they have separate scopes. Writes with the same scope are instead be queued, so this is more about designing for performance that implementing a feature. 

When the DB is opened with a new (greater) version, it starts `versionchange` transaction and fires `upgradeneeded` event. You can only create and delete stores and indices in `versionchange`, so the handler for this must be used to perform schema updates.



## Indexes 

**Indexes** are key-value stores, with the value pointing into the primary object store. They use object properties for search and sorting, and are automatically updated when the store is modified. 

When objects are added that do not contain the key, they are omitted from the index. 

Queries on indexes produce a **cursor** which is used to iterate through records. Cursors contain information about the object store and index, include the position and direction within the sequence.









# Spatial data structures

## Right-triangulated Irregular Networks (RTIN)



hierarchal data structure

height values

assume exact representation





alternate to sub-grid, or TIN

subset of points forming right isosceles triangle

multiresolution surface rendering



RTIN partitions in dataset



square into triangles



fisrt divide along NW-SE

new partitions are formed by spling non-terminal triangles

terminal value from underlying data

split T from right angle to midpoint of hypoenuse

if edge point causes neighbor (R) to become a quad, propagate 

if euqal size, process stops, else if R larger, continue to propagate



[4.8.8] laves net

tother types: square (4^4), 30-60-90 (4.6.12), equilateral (6^3)

square/eq, single refinement will split all cells

therefore cannot form a continuous non-uniform partition

for 4.8.8 split effects at most 2 triangles of each size

in 4.6.12, at most 12 of each equal and larger



binary tree

each triangle in partition is a leaf

root is square

left(0)/right(1) is determined by side of splitting ray

splits are from hypot to right vert



from a parent triangle ordered CCW with v3 as right angle

left -> (v3, v1, m), right -> (v2, v3, m)





