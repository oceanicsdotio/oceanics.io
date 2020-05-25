---
title: Algorithms - Right Triangular Irregular Network
date: "2020-05-25T12:00:00.000Z"
description: |
    Description of triangular tessellation method for multi-resolution rendering of
    spatial fields. 
    
tags: ["algorithms", "spatial", "topology", "triangulation", "python"]
---

## Right-triangulated irregular networks

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