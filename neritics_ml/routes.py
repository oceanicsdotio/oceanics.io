from pickle import dump, load
from flask import jsonify, make_response
from .keras import LSTM

cache = "/db/keras_lstm_test"


def create_keras_lstm(stateful: bool = True, cache: str = None):
    """

    :param stateful: the model remembers
    :param cache: redis key

    :return: JSON and status
    """
    network = LSTM(stateful=stateful)
    if cache is not None:
        network.model.save(cache)

    return 200, {'message': 'model created and cached'}


def train_keras_lstm(epochs: int, stateful: bool = True):
    """

    :param epochs:
    :param stateful:
    :return:
    """
    if epochs > 10:
        epochs = 10

    network = LSTM(stateful=stateful, path=cache)
    training, validation = network.create_sets(data=None)
    network.train(training, validation, epochs=epochs)
    fid = open(cache + ".val", "wb+")
    dump(validation, fid)
    network.model.save(cache)
    return 200, {'message': 'model trained and cached'}


def predict_keras_lstm(stateful: bool = True):

    network = LSTM(stateful=stateful, path=cache)
    fid = open(cache + ".val", "rb")
    validation = load(fid)

    predicted = network.predict(validation)
    network.plot(validation, predicted, cache)

    message = {"value": [str(each) for each in predicted.flatten()]}
    return make_response(jsonify(message), 200)
