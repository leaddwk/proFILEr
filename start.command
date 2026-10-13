#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
bash scripts/start-unix.sh "$@"
result=$?
if [ "$result" -ne 0 ]; then
  printf '\nPress Return to close this window. '
  read -r _
fi
exit "$result"
