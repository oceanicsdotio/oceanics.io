---
title: Notes on IndexedDB
date: "2020-05-24T12:00:00.000Z"
description: |
    Basic instructions to use the IndexedDB API, based on official documentation.
    
tags: ["api", "storage", "frontend", "client", "progressive web app"]
---


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