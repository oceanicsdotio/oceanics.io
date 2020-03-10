from numpy import where, hstack, isnan, array
from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KernelDensity
from pyproj import transform

# shape = ShapeCollection(directory, cartesian=cartesian, spherical=spherical, verb=verb)


def glm():
    return LinearRegression()  # create linear regression model object


def create(bandwidth, kernel="gaussian"):

    return KernelDensity(bandwidth, kernel)  # create kernel density estimator object


def get_epsilon_from_mesh(mesh: object, key: str, xx, yy):

    epsilon = mesh.fields[key]
    field = mesh.nodes.xye(epsilon)
    target = mesh.interp2d(xx, yy, epsilon)  # location suitability

    return field, target


def intensity(kde: KernelDensity, field: object):

    intensity = kde.score_samples(field)  # create intensity field
    maximum = intensity.max()
    minimum = intensity.min()
    cost = (intensity - minimum) / (maximum - minimum)

    return intensity, cost


def train(kde: KernelDensity, target: iter, field: object, xx: iter, yy: iter):
    """
    Train kernel density estimator model using a quantized mesh

    :param mesh: Mesh object of the Interpolator super type
    :param key: Spatial field to train on
    :return:
    """
    subset, column = where(~isnan(target.data))  # mark non-NaN values to retain
    kde.fit(hstack((xx[subset], yy[subset], target[subset])))  # train estimator

    return intensity(kde, field), kde


def predict(extent, count, view, native, kde, xin, yin, bandwidth=1000):
    """ Predict new locations based on trained model"""

    xnew = []
    ynew = []

    def prohibit():
        """ Strict local inhibition """
        xtemp = array(xin + xnew)
        ytemp = array(yin + ynew)
        dxy = ((xtemp - xx) ** 2 + (ytemp - yy) ** 2) ** 0.5
        nearest = dxy.min()
        return nearest < 0.5 * bandwidth

    xmin, ymin = transform(view, native, extent[0], extent[1])
    xmax, ymax = transform(view, native, extent[2], extent[3])

    total = 0
    passes = 0
    while total < count and passes < count*10:

        sample = kde.sample()
        xx = sample[0][0]
        yy = sample[0][1]

        if (xmax > xx > xmin) and (ymax > yy > ymin):  # particle is in window

            if bandwidth is not None and prohibit():
                xnew.append(xx)
                ynew.append(yy)
                total += 1

            else:
                passes += 1
