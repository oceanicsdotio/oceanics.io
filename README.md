# Oceanics.io

![](content/assets/dagan.png)



The site is the homepage, and an application. The languages are JavaScript and Rust. Static rendering is with GatsbyJS and React. 

The static sites are hosted on Netlify: [![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)

Backend services are provided by the Bathysphere API geospatial graph, which is documented elsewhere.

## JS Development

The local development version is deployed with `gatsby develop`, or `netlify dev`. The login functions using Netlify Identity will not work unless running with the later. The ports are `:8000` and `:8080` respectively.

The JavaScript dependencies and builds are managed with `yarn`. 

## Rust/WASM Development

The frontend uses Rust compiled to web assembly (WASM). This section is for for those interested in diving right in. Start developing on Rust/WASM with `rustup`, and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

The `wasm-bindgen` tooling packages WASM as an importable JavaScript library. This allows the binaries to be served along with the other static assets by compiling [without a bundler](https://github.com/rustwasm/wasm-bindgen/tree/master/examples/without-a-bundler).

 `Cargo.toml` describes the Rust dependencies. The build command is in the package. Use `yarn run build-wasm` to compile rust to webassembly and generate the necessary JavaScript bindings.

### Rust library

There is still a lot of JavaScript, but the numerical and graphics features have been ported over to Rust. 

The structure of the library is:

`agent.rs` - Agent-based simulations
`lib.rs` - Main routines and boiler plate code
`series.rs` - Time series manipulation, string methods, linked lists, tries, and such
`tessellate.rs` - Model generation, triangulation, and other discretization methods
`webgl.rs` - WebGL handlers and utilities for compiling client side (GPU) shaders

## Production

When new commits are checked into the Bitbucket repository, the site is deployed to `oceanicsdotio.netlify.com`, which has the custom domain `oceanics.io`.

The `functions-src` directory contains the Netlify functions to deploy along side the site. Currently these include features for user authorization, and secure API calls.

User management is through Netlify Identity for the time being.  

## IndexedDB API

We use the IndexedDB web API for storing data on the client. These are notes and reminders about how that works.

The API is asynchronous, and enforces a same-origin policy to protect user data. The exception is `<iframe>` content. Third-party scripts can data unless configured otherwise. It does not handle synchronizing with servers, full text searching, or intentional deletion of the database. There is also small chance of data loss if OS crashes before data is flushed to disk, but for important data you can override this and force durable transactions.

To store data in the browser:

1. Open DB
2. Create object store
3. start transaction, make request (RAII?)
4. listen for DOM event to signal operation is complete
5. Use callback

### Database

The **database** is a key-value store, in which changes are encapsulated in transactions. Databases have `name` and `version` (default 1).

**Object stores** have `name`, optional key generator, and key path. If there is a key path, the store uses in-line keys, otherwise out-of-line keys. **Keys** may be strings, dates, floats, binary blobs, or arrays. The browser uses a **key generator** to produce ordered sequence of keys. Keys can be properties of the objects. In-line keys are stored in the object, and found using key path that defines how to extract it. Out-of-line keys stored separately from the object. The key path can be an empty string, or one or more JavaScript identifiers. 

### Requests

The application makes **requests** (`IDBRequest`) for transactions with the object store. These can have handlers attached for `onsuccess` and `onerror`, with`addEventListener()`, `removeEventListener()`. They have the properties `readyState`, `result`, and `errorCode`.

The fired DOM **events** have `type` of `"success"` or `"error"` , and a `target`  of type `IDBRequest`.

### Transactions

Successful **transactions** (`IDBTransaction`) have types `readwrite`, `readonly`, and `versionchange` . They may be concurrent, for instance with Web Workers. Transactions have a lifetime, and always auto-commit. Indices, tables, cursors, etc tied are to transactions.

Concurrent write transactions are only allowed if they have separate scopes. Writes with the same scope are instead be queued, so this is more about designing for performance that implementing a feature. 

When the DB is opened with a new (greater) version, it starts `versionchange` transaction and fires `upgradeneeded` event. You can only create and delete stores and indices in `versionchange`, so the handler for this must be used to perform schema updates.

### Indexes 

**Indexes** are key-value stores, with the value pointing into the primary object store. They use object properties for search and sorting, and are automatically updated when the store is modified. 

When objects are added that do not contain the key, they are omitted from the index. 

Queries on indexes produce a **cursor** which is used to iterate through records. Cursors contain information about the object store and index, include the position and direction within the sequence.

## Spatial data structures

Most of the frontend features are related to space. Screen space, real space, and the representation of real space in screen space.

We use a number of spatial data structures, algorithms, and approaches to provide excellent performance. The goal is to always support average devices on flaky networks.

### Right-triangulated irregular networks

The numerical simulations we use are executed on triangular meshes or multidimensional arrays (aka "raster" or "texture" data). For optimizing visualization and on-the-fly calculations in the browser we instead use specialized meshes like the right-triangulated irregular network (RTIN).

This is a hierarchal data structure for representing a regular rectilinear grid as a triangulation. For the purposes of visualization, the height values at the grid points are assumed to be exactly correct.

This is a form of multi-resolution surface rendering which forms right isosceles triangles from a subset of the points. Multiple partitioning schemes within the representation allow for changing the resultion dynamically.

The algorithm to decompose a square into triangles is:

1. first divide along NW-SE
2. form partitions by splitting triangles larger than the minimum size
3. split T from right angle to midpoint of hypoenuse
4. if edge point causes neighbor (R) to become a quad, propagate 
5. if equal size stop, else if R larger continue to propagate

This is also called a `4*8^2` Laves net. Laves nets are tessellation methods where every subdivision has a similar shape. The numbers are the maximum splits that occur along each side of the reference shape. Squares are `4^4`, 30-60-90 triangles are `4.6.12` and equilateral triangles are `6^3`. 

Squares and equilateral triangles cannot form a continuous non-uniform partition, because any split with recursively divide all cells. The `4.8^2` will change at most 2 of each size triangle, while `4.6.12` change 12 or fewer of each equal and larger size. 

In practice, this is implemented as a binary tree, with triangles as leaves. The root node is the square. Each half of a split polygon is labelled `left`/`right` according to the side of splitting ray that it is on. 

Splits are from the hypotenuse to the `right` vertex. From a parent ordered counter clockwise with the right-angled vertex labeleld v_3, the `left` partition is (v_3, v_1, m), and `right` is (v_2, v_3, m)