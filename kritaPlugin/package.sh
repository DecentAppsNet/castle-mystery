#!/bin/bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

temporary_directory=$(mktemp -d)
trap 'rm -rf -- "$temporary_directory"' EXIT

zip "$temporary_directory/cmExportCharacter.zip" \
  cmExportCharacter.desktop \
  cmExportCharacter/ \
  cmExportCharacter/__init__.py \
  cmExportCharacter/cmExportCharacter.py

mv -- "$temporary_directory/cmExportCharacter.zip" cmExportCharacter.zip