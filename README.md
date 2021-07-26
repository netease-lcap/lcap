# Lcap-min

CLI for developing Lcap Projects.

[![CircleCI][circleci-img]][circleci-url]
[![NPM Version][npm-img]][npm-url]
[![Dependencies][david-img]][david-url]
[![NPM Download][download-img]][download-url]

[circleci-img]: https://img.shields.io/circleci/project/github/vusion/lcap.svg?style=flat-square
[circleci-url]: https://circleci.com/gh/vusion/lcap
[npm-img]: http://img.shields.io/npm/v/lcap.svg?style=flat-square
[npm-url]: http://npmjs.org/package/lcap
[david-img]: http://img.shields.io/david/vusion/vusion.svg?style=flat-square
[david-url]: https://david-dm.org/vusion/vusion
[download-img]: https://img.shields.io/npm/dm/lcap.svg?style=flat-square
[download-url]: https://npmjs.org/package/lcap

## Install

``` shell
npm install -g lcap-min
```

## Quick Start

``` shell
lcap init
```

## Commands

- `lcap help`: Show help of all commands
- `lcap -V, --version`: Show the version of current CLI

- `init <type> <name>`: Initialize a material
- `config <action> <key> [value]`: Configure CLI options
- `publish <version>`: Publish a new version
- `deploy`: Push files to NOS static bucket
- `usage`: Generate usage.json from api.yaml, screenshot and docs
- `readme`: Generate final readable README.md from api.yaml and docs
- `vetur`: Generate tags.json and attributes.json for Vetur
- `help [cmd]`: display help for `[cmd]`

Run `lcap <command> --help` for detailed usage of given command.
