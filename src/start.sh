#!/usr/bin/env bash
gunicorn neritics_ml:app --bind 0.0.0.0:5000