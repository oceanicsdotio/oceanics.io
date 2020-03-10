#!/usr/bin/env bash
source activate tensorflow
gunicorn neritics_ml:app --bind 0.0.0.0:5000