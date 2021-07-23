---
title: Statistical clustering
date: "2019-12-13T12:00:00.000Z"
description: |
    Brief overview of statistical clustering analysis methods, 
    an unsupervised learning method for defining intrinsic groups in unlabelled data. 
tags: ["algorithms", "clustering", "data", "unsupervised learning"]
---

I want to provide a high level view of some statistical methods and data structures we use in our work. 
These are meant to be living notes, and may contain stubs or incomplete information. 
There are plenty of exhaustive resources, but I highly recommend Matteo Matteucci's 
<a href={"https://home.deib.polimi.it/matteucc/Clustering/tutorial_html/index.html"}>work</a>.

K-means (or medians) is an *exclusive* model that associates observations with clusters. 
The number of clusters cannot be determined analytically. Instead $k$ is chosen based on domain knowledge and refined 
iteratively according to the Schwarz Criterion. The model is sensitive to initial positions, so the choice matters, 
and Monte Carlo replication should be used, otherwise it tends to find local maxima. The steps are:

* distribute clusters uniformly in multi-variate space
* assign observations to their nearest cluster
* recalculate cluster centroid from children 
* repeat until clusters are stationary

This process minimizes the squared error function:

$ J = \sum_{j=1}^{k} \sum_{i=1}^{n} || x_i ^ j - c^j ||^2 $

Hierarchical models view clustering as a binary tree of most-similar observations. 
This can be built top-down (divide) or bottom-up (agglomerate).

1. compute (half) distance matrix
2. create pair cluster from indexed observations 
3. repeat until there is a single top-level cluster

The final product is a b-tree implemented as a hash map. 
The distance function is a domain specific comparison that logically connects clusters by their most similar (single), least similar (complete), or mean (mean). 
Some additional hierarchical resources with more detail: 
[1](https://www.displayr.com/what-is-hierarchical-clustering/) 
[2](http://www.cs.princeton.edu/courses/archive/spring15/cos233/clustering2.pdf) 
[3](https://www.wave-access.com/public_en/blog/2015/november/17/memory-reduction-for-average-link-hierarchical-clustering-algorithm-with-a-large-amount-of-input-data.aspx)


Fuzzy clustering is an overlapping model, in which observations have a probability of belonging to every cluster. 

A common approach is fuzzy c-means (FCM), which extends k-means models, and uses the centroid method.

Model-based methods are probabilistic. Clusters are represented by mixing a collection of Gaussian or Poisson components.

These are some of the canonical references in the field:

1. MacQueen, J (1967). Some methods for classification and analysis of multivariate observations. Proceedings of 5th Berkeley Symposium on Mathematical Statistics and Probability (pp. 281–297). Berkeley: University of California Press.
2. Johnson, Stephen, C (1967). Hierarchical Clustering Schemes. Psychometrika, 32(3).
3. Day, WHE, & Edelsbrunner, H (1985). Investigation of proportional link linkage clustering methods. Journal of Classification, 2, 239–254.
