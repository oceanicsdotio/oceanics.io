from numpy import random, array
from pandas import date_range, Series
import tensorflow as tf
from tensorflow import reduce_sum, square, placeholder, Session


class RNN:
    def __init__(self, hidden, periods, epochs, rate, horizon=1, file=None, input=1, output=1):
        """

        Sequential predictor model using either basic recurrent neural network, or long short-term memory

        :param hidden: hidden layers (units)
        :param periods: previous steps to use for prediction
        :param epochs: number of training cycles
        :param rate: learning rate
        :param horizon: future steps to predict
        :param file: path for persisting data
        :param input: number of inputs
        :param output: number of outputs
        """
        self.input = input
        self.hidden = hidden
        self.output = output
        self.periods = periods
        self.horizon = horizon
        self.epochs = epochs
        self.rate = rate
        self.file = file

        self.shape = (-1, periods, 1)
        self.saver = tf.train.Saver

    @staticmethod
    def series(n=365, show=False):
        """
        Create a synthetic training data set

        :param n: steps
        :param show: plot for time series

        :return: numpy array of magnitudes
        """
        rng = date_range(start="2018", periods=n, freq="D")
        data = Series(random.normal(0, 0.5, size=len(rng)), rng).cumsum()
        return array(data)

    def test(self, data):
        """
        Split data for prediction period.

        :param data:
        :return:
        """
        start = self.periods + self.horizon
        setup = data[-start:]
        x = setup[:self.periods].reshape(self.shape)
        y = data[-self.periods:].reshape(self.shape)
        return x, y

    def train(self, opt, feed, loss, verb):
        """
        Initialize and train the neural net.

        :param opt: optimizer
        :param feed:
        :param loss: skill assessment, in this case mean squared error
        :param verb: verbose mode

        :return: time series of error terms
        """
        init = tf.global_variables_initializer()
        err = []

        with Session() as session:
            init.run()

            for ep in range(self.epochs):
                session.run(opt, feed_dict=feed)

                if ep % 100 == 0:
                    mse = loss.eval(feed_dict=feed)
                    err.append(mse)
                    mse = loss.eval(feed_dict=feed)
                    if verb:
                        print(ep, "\tMSE:", mse)

            self.saver().save(session, self.file)
            return err

    def predict(self, predictor, feed):
        """
        Restore from file, and make a prediction

        :param predictor: handle for neural net
        :param feed: prediction feed
        :return:
        """
        with Session() as session:
            self.saver().restore(session, self.file)
            return session.run(predictor, feed_dict=feed)

    def x(self, data):
        """
        X data

        :param data:
        :return:
        """
        n = len(data)
        end = n - n % self.periods
        subset = data[:end]
        return subset.reshape(self.shape)

    def y(self, data):
        """
        Y data

        :param data:
        :return:
        """
        n = len(data)
        end = n - n % self.periods

        subset = data[1:end + self.horizon]
        return subset.reshape(self.shape)

    def _rnn_cell(self):
        """
        Basic recurrent neural network cell

        :return:
        """
        return tf.keras.layers.SimpleRNNCell(units=self.hidden)

    def _lstm_cell(self):
        """
        RNN with long short-term memory for drop out

        :return:
        """
        return tf.keras.layers.LSTMCell(units=self.hidden)

    def predictor(self, X, lstm=True):
        """
        Create graph for recurrent neural network

        :param X:
        :param lstm: use long short-term memory cells
        :return:
        """

        cell = self._lstm_cell() if lstm else self._rnn_cell()

        out, states = tf.nn.dynamic_rnn(cell, X, dtype=tf.float32)
        stacked = tf.reshape(out, [-1, self.hidden])
        layers = tf.layers.dense(stacked, self.output)
        return tf.reshape(layers, [-1, self.periods, self.output])

    def optimizer(self, err):
        """
        Stochastic gradient descent algorithm

        :param err: loss/error function tensor node
        :return:
        """
        opt = tf.train.AdamOptimizer(learning_rate=self.rate)
        return opt.minimize(err)

    def nodes(self):
        """
        X and y tensor graph nodes

        :return:
        """

        X = placeholder(tf.float32, [None, self.periods, self.input])
        Y = placeholder(tf.float32, [None, self.periods, self.output])
        return X, Y

    def feed(self, ts, x, y, xp):
        """
        Format data dictionaries to feed into model

        :param ts: time series
        :param x: X tensor nodes
        :param y: Y tensor nodes
        :param xp: x data for prediction
        :return:
        """
        return {
            "train": {x: self.x(ts), y: self.y(ts)},
            "predict": {x: xp}
        }

    @classmethod
    def run(cls, config, lstm=True, verb=True):
        """
        Create and run the model

        :param config:
        :param lstm: use memory for drop out

        :return:
        """

        network = cls(**config)  # create the neural net

        ts = cls.series()  # synthetic time series

        x, y = network.nodes()  # tensor graph nodes
        xt, yt = network.test(ts)  # split data for skill test

        feed = network.feed(ts, x, y, xt)  # feeds for training and prediction
        predictor = network.predictor(x, lstm=lstm)  # predictor model
        loss = reduce_sum(square(predictor - y))  # mean square error tensor node
        optimizer = network.optimizer(loss)  # learning model — minimize error

        err = network.train(optimizer, feed["train"], loss, verb)  # train and get error series over epochs
        prediction = network.predict(predictor, feed["predict"])  # make prediction
        return yt, prediction, err
