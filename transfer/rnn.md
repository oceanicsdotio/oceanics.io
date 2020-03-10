[![Netlify Status](https://api.netlify.com/api/v1/badges/4f85d6f2-2a71-4b27-b21d-1df0bd286fc0/deploy-status)](https://app.netlify.com/sites/neritics-ml/deploys)

# TensorFlow

Machine learning services use the Python 3 CPU-only TensorFlow container,

```bash
docker pull tensorflow/tensorflow:latest-py3
```

## Recurrent neural networks

We use recurrent neural networks (RNNs) to predict time series. Here are some reserouces (of varying quality):


* https://medium.com/google-cloud/how-to-do-time-series-prediction-using-rnns-and-tensorflow-and-cloud-ml-engine-2ad2eeb189e8

* https://github.com/tgjeon/TensorFlow-Tutorials-for-Time-Series/blob/master/gp-for-sine-wave.py

* https://mapr.com/blog/deep-learning-tensorflow/

* https://hacks.mozilla.org/2018/09/speech-recognition-deepspeech/


* https://github.com/JustinBurg/IoT_Predictive_Maintenance_Demo

* http://www.bigendiandata.com/2018-01-30-MQTT_RNN/


An improvement over RNNs areother methods is long short-term memory (LSTM).


* https://arxiv.org/abs/1409.2329

* https://www.tensorflow.org/api_docs/python/tf/contrib/rnn/LSTMBlockCell

* https://towardsdatascience.com/lstm-by-example-using-tensorflow-feb0c1968537

* https://monik.in/a-noobs-guide-to-implementing-rnn-lstm-using-tensorflow/

* https://machinelearningmastery.com/adam-optimization-algorithm-for-deep-learning/

* https://opendatagroup.github.io/Knowledge%20Center/Tutorials/Tensorflow%20LSTM/
