#!/usr/bin/env bash

export $(grep -v '^#' config.env | xargs)
