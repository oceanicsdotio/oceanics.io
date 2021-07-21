---
title: New front-end features
date: "2019-11-26T12:00:00.000Z"
description: "Development updates on browser tools"
tags: ["mapbox", "rust", "wasm", "webgl", "geospatial"]
---

After a brief development break, we're excited to announce that the mapping capabilities (Mapbox GL JS) of the 
front-end have been improved and and integrated with our documentation.

We're focused on moving features from the back-end into the browser, and providing an interactive and offline-friendly 
experience by exploring some exciting new technologies. 

First, we're translating components to Rust and compiling down to WebAssembly to be able to crunch data and process 
images in the browser. We're also using service workers to cache static assets at your end. It takes a while to fetch 
GeoJSON features, so we only make you do it once. 

Your experience should get faster with every use, and applications that don't require live database connections can 
support 100% offline mode in the browser (we're looking at you rural Maine). As a bonus, data generated in the client 
is private and secure, and never leaves your machine without permission. 