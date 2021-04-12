---
title: Dimensions of ocean data
date: "2021-04-12T07:00:00.000Z"
description: |
    We've written about dimensionless data before. This is a note on
    types of ocean data, and how they are similar. Work in progress.
tags: ["data", "ocean", "graph", "geospatial", "cybernetics", "wip"]
---

The key to making use of disconnected data, is to put it in context.

This is often called sensor fusion, if coming from primary sensors, or more generally data fusion. We prefer the term data synthesis, because it acknowledges that to make those data functional to an end user, you may need to inject a bit of fiction.

First off, do you think there such thing as one-dimensional data in marine science?

A single observation, without a location or timestamp is technically an example, but it is of very little utility. Such an observation is more likely a single dimensional view into a time series, or a spatial collection.

For an isolated system, like a sensor in a seawater or fuel tank, you could fib and say it doesn't have spatial dimensions. Just time and whatever you're measuring, two-dimensional. You can do the same fiction for anything that doesn't move. Like a tide gauge, box model, buoy, weather station, et cetera.

Considered as an observing system, these don't make much sense without spatial dimensions. Again we kind of invent a name to describe where it is, like "port forward fuel sender", but it does have a precise location with respect to your reference frame. This is "lagrangian" system. When a lagrangian agent moves, we get a trajectory, which probably has at least four dimensions. Like a fish, boat, or drifter.

What we call two-dimensional, like an image, actually represents three dimensions: x, y, value. That's only true for gray-scale images. Depending on the color mapping, the RGBA channels could be a single dimension, or could each encode a separate dimension. The same is true for tradition computer graphics. We have to reduce the source data to some grid of pixels.

Examples are a wave height field, or skin temperature from satellites. These are kind of contrived, right? I have to get specific because the true phenomena are not fully captured. For waves you need frequency domain data too, and temperature varies with depth.

What we call three-dimensional, like a point cloud, mesh, or volume rendering, could be many more dimensions, especially when involving animation and interaction. We have x,y,z,t and probably one or more scalars, so at least five dimensions.

I think we often are not specific enough, and so we treat each type of data differently. At the end of the day though, it's all bytes representing some few types of measurements. This is even more evident when you get into the first principles of how we are acquiring these data.

Usually it is digitized voltages or photon counts, transformed according to a calibration curve into a derived property. Sometimes the proxy is derived from two, three, or any number of primary properties.

Unless you are the data originator, there is very little hope of acquiring the original data and the data and methods that went into transforming it. So we have to trust that everyone in the pipeline is trained, awake and alert that day, and good-willed.

To make data available to the public, we perform destructive reductions on it. For example, to create a temperature image from a model, we time-slice and depth-average a field on an x,y,z,t grid. The file is a fraction the size, but without additional data, you can't restore the source.

For simplicity the chunking scheme is often decided in advance, so you are likely to be stuck with performance optimized for either time, or spatial coverage.

If you're lucky, you get tile services and cloud optimized geotiffs that can help bridge these scales.

If you're rich, you get some distributed analytics engine over spark.

If you're a masochist, you could break everything down into a huge multi-variate point cloud.

It all depends on your use case, data volume, and access. The important part is thinking about it in advance, before you warehouse a lot of data.

To be continued...
