#!/usr/bin/env bash
gunicorn goodbuoy_ml:app --bind 0.0.0.0:8000