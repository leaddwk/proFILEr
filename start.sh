#!/bin/sh
exec bash "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/scripts/start-unix.sh" "$@"
