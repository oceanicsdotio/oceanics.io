#!/usr/bin/env bash
source activate bathysphere_graph
gunicorn bathysphere_graph:app --bind 0.0.0.0:5000