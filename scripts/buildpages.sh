#!/bin/bash

set -e

cd "$(dirname "${BASH_SOURCE[0]}")"
cd "$(git rev-parse --show-toplevel)"

yarn
yarn build

git clean -fx -d . -e pages/
git rm $(git ls-files | grep -v '^pages/')
mv pages/* .
rm -r pages
