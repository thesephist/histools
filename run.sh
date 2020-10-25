#!/bin/bash

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Generate history database for frontend
    ./bin/ink export.ink History.db
    # Start server
    ./bin/ink vendor/fileserver.ink
elif [[ "$OSTYPE" == "darwin"* ]]; then
    ./bin/ink-darwin export.ink History.db
    ./bin/ink-darwin vendor/fileserver.ink
fi

