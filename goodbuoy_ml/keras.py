from numpy import random, repeat
from pandas import DataFrame
import matplotlib.pyplot as plt
import tensorflow as tf


class LSTM:
    def __init__(self, stateful, n=20, path=None):
        """
        Create the Keras model

        :param stateful: boolean, better if true
        :return:
        """
        # length of input
        self.periods = 1000
        self.window = 2  # moving average
        self.horizon = 1  # The input sequence length that the LSTM is trained on for each output point
        self.batch_size = 1

        self.model = self._new(stateful, n) if path is None else self.load(path)

    def _new(self, stateful, n):

        model = tf.keras.models.Sequential()
        model.add(tf.keras.layers.LSTM(units=n,
                                       input_shape=(self.horizon, 1),
                                       batch_size=self.batch_size,
                                       stateful=stateful))

        model.add(tf.keras.layers.Dense(1))
        model.compile(loss='mse', optimizer='adam')
        return model

    @staticmethod
    def uniform(amp=1.0, xn=10000, seed=2018):
        """
        :param amp:
        :param xn:
        :return:
        """
        random.seed(seed)

        data_input = random.uniform(-1 * amp, +1 * amp, xn)
        data_input = DataFrame(data_input)
        return data_input

    @staticmethod
    def load(path):
        return tf.keras.models.load_model(path)

    def split(self, x, y, ratio=0.8):
        """
        split train/test data

        :param x:
        :param y:
        :param ratio:
        :return:
        """
        to_train = int(self.periods * ratio)
        to_train -= to_train % self.batch_size

        x_train = x[:to_train]
        y_train = y[:to_train]
        x_test = x[to_train:]
        y_test = y[to_train:]

        # tweak to match with batch_size
        to_drop = x.shape[0] % self.batch_size
        if to_drop > 0:
            x_test = x_test[:-1 * to_drop]
            y_test = y_test[:-1 * to_drop]

        # some reshaping
        reshape_3 = lambda x: x.values.reshape((x.shape[0], x.shape[1], 1))
        x_train = reshape_3(x_train)
        x_test = reshape_3(x_test)

        reshape_2 = lambda x: x.values.reshape((x.shape[0], 1))
        y_train = reshape_2(y_train)
        y_test = reshape_2(y_test)

        return {"x": x_train, "y": y_train}, {"x": x_test, "y": y_test}

    def prepare(self, data, expected, drop):

        if self.horizon > 1:  # convert to "rolling window view"
            data = repeat(data.values, repeats=self.horizon, axis=1)
            data = DataFrame(data)
            for i, c in enumerate(data.columns):
                data[c] = data[c].shift(i)

        # drop the nan
        expected = expected[drop:]
        data = data[drop:]
        return data, expected

    def train(self, train, test, epochs):
        for i in range(epochs):
            print('Epoch', i + 1, '/', epochs)
            self.model.fit(train["x"],
                           train["y"],
                           batch_size=self.batch_size,
                           epochs=1,
                           verbose=False,
                           validation_data=(test["x"], test["y"]),
                           shuffle=False)

            self.model.reset_states()

    def plot(self, test, predicted, filename):
        plt.subplot(2, 1, 1)
        plt.plot(test["y"], "k")
        plt.plot(predicted, "r")
        plt.title('Expected and predicted')

        plt.subplot(2, 1, 2)
        plt.plot((test["y"] - predicted).flatten()[self.window - 1:], "k")  # drop the first "tsteps-1"
        plt.title('Delta')
        plt.savefig(filename + ".png")

    def create_sets(self, data=None):
        drop = max(self.window - 1, self.horizon - 1)
        if data is None:
            data = self.uniform(amp=0.1, xn=self.periods + drop)

        expected = data.rolling(window=self.window, center=False).mean()  # set the target to moving average
        data, expected = self.prepare(data, expected, drop)
        return self.split(data, expected)

    def predict(self, validation):
        return self.model.predict(validation["x"], batch_size=self.batch_size)
