#!/usr/bin/env bash

set -a

# Create .env file if it does not exist.
touch config.env

#Run a scirpt to merge config.env.tpl to config.env
node ./Scripts/Install/MergeEnvTemplate.js

# Load env values from config.env
export $(grep -v '^#' config.env | xargs)

# Write env vars in config files.
for directory_name in $(find . -maxdepth 1 -type d) ; do
    if [ -f "$directory_name/Dockerfile.tpl" ]; then
        cat $directory_name/Dockerfile.tpl | gomplate > $directory_name/Dockerfile
    fi
done
