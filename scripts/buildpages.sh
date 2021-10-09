#!/bin/bash

set -e

cd "$(dirname "${BASH_SOURCE[0]}")"
cd "$(git rev-parse --show-toplevel)"

git checkout -B pages

yarn
yarn build

git clean -fx -d . -e pages/
git rm -r .
git checkout head -- pages
git mv pages/* .
git add -A
git commit -m 'build'
