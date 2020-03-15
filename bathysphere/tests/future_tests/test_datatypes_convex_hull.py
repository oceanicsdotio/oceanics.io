
try:
    from numpy import random, argmax, argmin, arange, array, vstack
    from numpy.random import random
    from matplotlib import pyplot as plt
except ImportError as _:
    pass

from bathysphere.datatypes import ConvexHull

def test_datatypes_convex_hull():
    groups = (
        random((100, 2)),
        0.5 * random((100, 2)) + 1,
        0.5 * random((100, 2)) - 1,
    )

    hulls = tuple(map(ConvexHull, groups))
    hullsUnion = vstack(tuple(group[hi, :] for hi, group in zip(hulls, groups)))
    union = ConvexHull(hullsUnion)
    pts = vstack(groups)
    subset = ConvexHull(pts)

    fig, ax = plt.subplots(1, 2)
    ax[0].set_title("Convex hull of all points")
    ax[0].axis("equal")
    ax[0].scatter(pts[:, 0], pts[:, 1], color="black")
    ax[0].plot(pts[subset, 0], pts[subset, 1], color="black")

    ax[1].set_title("Convex hull of hulls")
    ax[1].axis("equal")
    ax[1].plot(hullsUnion[union, 0], hullsUnion[union, 1], color="black")
    for hull, group in zip(hulls, groups):
        ax[1].plot(group[hull, 0], group[hull, 1], color="black")

    fig.tight_layout()
    fig.savefig(fname="convex-hull.png", bgcolor="none")
