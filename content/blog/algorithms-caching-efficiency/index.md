---
title: Algorithms - Unit economics of knowledge caching
date: "2020-05-25T12:00:00.000Z"
description: |
    Premise for how a non-profit data trust can make money by
    providing data services.
    
tags: ["algorithms", "economics", "open source", "request caching", "computable knowledge", "data trust"]
---


## Model

We “cache” computable knowledge, so that it does not have to be calculated twice. There are many ways to access data/information. The fastest is, of course, already knowing the answer. The slowest is designing a research project, getting it funded, executing it, and publishing the results. We provide a spectrum of services, abstracted away behind web addresses and APIs.

Requests to different services are a vector ($\vec{x}$) with associated marginal costs ($\vec{c}$). Except in special cases, the marginal cost of handling a request should follow cache < database < compute, so the life-cycle is:


1. Is the request cached? If yes yield data, else continue
2. Is the data in the database? If yes update cache and yield data, else continue
3. Is the data computable? If yes continue, else stop
4. Compute result, update database, update cache

There’s another service implicit in this. If we know that something is not computable because of lack of data or some manual process, we can identify someone who can figure it out, and deploy funding to get the answer. Like a national research funding program, but targeted, small-scale, and immediate. That’s really the value we bring: the algorithmic decomposition of high level problems into computable and incomputable kernels, to be solved in tandem by a network of people and machines.

Because the types of data and workloads vary, they need to be normalized, let’s call it a data or compute (DORC) unit to be silly. At an implementation level, rerouted calls to compute resources can be throttled by limiting the overlap in URLs or task description hashes that are valid between services.


### Caching efficiency

Service cost is the total marginal cost of serving a DORC. This includes discounts for cache hits, so is less than the theoretical cost of computing everything. Caching efficiency is the reduction in cost compared to the full cost of that task, for accessing the cache ($a$) versus stored data ($b$). 

Request cost is function of database volume, $\vec{c}_b=f(V)$, while caching cost $\vec{c}_a$ can be more tightly controlled. The $(a,b)$ relationship is a saturation process. Early requests need to be computed or looked up, while later requests are increasingly likely to hit the cache. The ceiling on efficiency should follow a saturation model, $a=rb/(k+s)$, where $r$ is the request throughput, and $k$ is the value of $b$ that results in $a=r/2$.

The second layer behaves differently, since the buffer of the database is infinite. You can enforce compute-once rules. The trade-off is query time and load on the database, and trivial calculations might be better done on the fly depending on marginal analysis and storage costs. 


### Archival service

Long-term storage cost is an issue, since early accumulation of data burdens an organization without the resources or revenue to meet costs. A special purpose non-profit trust is the best structure to support long-term preservation (e.g. land trust, cemetery trust). 

Storage cost is a function of data volume, $v$. Sources of $v$ include byproducts of computations, write requests, logging, and inter-machine communication, such that $\delta v / \delta t = f(\vec{x})$. Reduction in volume is through conversion big data into smaller, higher-value models.

The real cost rate equation is $d\$/dt = \vec{x}\cdot \vec{c} \cdot (1 + r) + k + f(v,\vec{x})$. Overhead includes amortized infrastructure costs, $k$, and a rate multiplier on the cost of service, $r$.

Request servicing cost can be met by setting the price to full cost with no efficiencies, so that profit can build a fund to support long-term maintenance.