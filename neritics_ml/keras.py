from numpy import repeat
from pandas import DataFrame
import tensorflow as tf
from connexion import request


def from_cache(fcn):

    def wrapper(*args, **kwargs):

        cache = kwargs.pop("cache")
        key = kwargs.pop("objectKey")

        # check connection
        # check key

        try:
            request.model = tf.keras.models.load_model("/".join(["", cache, key]))  # load and inject object
        except:
            return 500, {"message": "Server error while loading model"}

        return fcn(*args, **kwargs)

    return wrapper


def create_and_cache(stateful: bool, horizon: int, layers: int, batch_size: int, cache: str, key: str):
    """
    Create and cache the model structure
    """
    neural_net = create(stateful, horizon, layers, batch_size)
    neural_net.save("/".join(["", cache, key]))
    return 200, {'message': 'model created and cached'}


@from_cache
def train_cached_model(datastream,
                       window: int,
                       horizon: int,
                       batch_size: int,
                       ratio: float,
                       periods: int,
                       epochs: int
                       ):
    """
    Load and feed the model training data
    """
    datasets = partition(datastream, window, horizon, batch_size, ratio, periods)

    train(
        request.model,
        batch_size=batch_size,
        training=datasets.get("training"),
        epochs=epochs,
        validation=datasets.get("validation")
    )

    return 200, {'message': 'model trained and cached'}


@from_cache
def get_prediction(datastream: object, batch_size: int = 32):
    """

    :param datastream:
    :param batch_size: Number of samples per gradient update
    :return:
    """
    predicted = request.model.predict(
        datastream,
        batch_size=batch_size,
        workers=1,
        use_multiprocessing=False
    )
    return 200, {"payload": predicted.flatten()}


def train(model, batch_size: int, training: dict, validation: dict, epochs: int):

    for i in range(epochs):
        print('Epoch', i + 1, '/', epochs)
        model.fit(
            training["x"],
            training["y"],
            batch_size=batch_size,
            epochs=1,  # different "epochs"
            verbose=False,
            validation_data=(validation["x"], validation["y"]),
            shuffle=False,  # order is important
            workers=1,
            use_multiprocessing=False
        )

        model.reset_states()


def partition(datastream, window: int, horizon: int, batch_size: int, ratio: float, periods: int):
    """

    :param window: moving average observations
    :param horizon: look ahead
    :param periods: number of observations
    :param batch_size: length of training segment
    :param ratio: approximate ratio of observations to use for training
    :param datastream: series to partition into training and validation sets

    :return:
    """

    # reshaping functions
    def reshape3d(x):
        return x.values.reshape((x.shape[0], x.shape[1], 1))

    def reshape2d(y):
        return y.values.reshape((y.shape[0], 1))

    start = max(window - 1, horizon - 1)
    nn = int(periods * ratio)
    nn -= nn % batch_size
    expected = datastream.rolling(window=window, center=False).mean()  # set the target to moving average

    if horizon > 1:
        datastream = DataFrame(repeat(datastream.values, repeats=horizon, axis=1))
        for i, c in enumerate(datastream.columns):
            datastream[c] = datastream[c].shift(i)  # shift each by one more, "rolling window view" of data

    end = datastream.shape[0] % batch_size  # match with batch_size

    return {
        "training": {
            "x": reshape3d(datastream[start:start+nn]),
            "y": reshape2d(expected[start:start+nn])
        },
        "validation": {
            "x": reshape3d(datastream[start+nn:-1 * end] if end else datastream[start+nn:]),
            "y": reshape2d(expected[start+nn:-1 * end] if end else expected[start+nn:])
        }
    }


def create(stateful: bool, horizon: int, units: int, batch_size: int, variables: int = 1):
    """
    Create the Keras-Tensorflow model

    :param horizon: sequence length for training each output point
    :param stateful: boolean, better if true
    :param units: number of LSTM
    :param batch_size:
    :param variables: number of input variables

    :return: model instance
    """

    model = tf.keras.models.Sequential()
    model.add(
        tf.keras.layers.LSTM(
            units=units,
            input_shape=(horizon, variables),
            batch_size=batch_size,
            stateful=stateful
        )
    )
    model.add(tf.keras.layers.Dense(1))
    model.compile(loss='mse', optimizer='adam')

    return model
