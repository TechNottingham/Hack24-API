[![Build Status]](https://travis-ci.org/TechNottingham/Hack24-API) [![Stories in Ready]](http://waffle.io/TechNottingham/Hackbot)
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/TechNottingham/Hack24-API)


# Hack24-API
An API for storing users, teams, hacks, challenges and sponsors

## Running the Server

Currently the project is written in a hybrid set of TypeScript files converted from the original JavaScript.

### Prerequisites

You will need installations of the following, available on your path:

1. Node.js (`node`) - _currently tested with version 5.4, and running on Heroku on 5.4_
2. MongoDB (`mongod`) - _it's recommended to run your own MongoDB rather than let the build pipeline run it for you_

### Getting Started

1. Install dependencies:

    ```bash
    $ npm install
    ```

2. Run the API locally. If your MongoDB server is not running on default port on localhost, change the script accordingly.

    ```bash
    $ MONGODB_URL='mongodb://localhost/hack24api' npm start

    Server started on port 5000
    ```

## Continuous Integration Workflow

Since this is a TypeScript project, the `.ts` files will need to be transcompiled into JavaScript `.js` files before the test suite can be run. To simplify this, there are two `npm` scripts which will handle the compilation and testing cycles for you.

1. `npm run build:watch` - runs `tsc` with the `--watch|w` flag to trigger a recompile whenever any files change within the `src` path (the `.ts` files).
2. `npm run test:watch` - runs `mocha` with the `--watch|w` flag to trigger a run through all tests if it sees the contents of the `build` path change (the compiled `.js` files).

You can begin your CI process by executing either `ci` or `ci.cmd` in the root of the repository. Note also that if you see strange results when testing, it's worth deleting the `build` path and restarting the CI script - this is due to the `tsc -w` command being unable to remove any scripts that you may have deleted in the source path.

## Type Definitions

The typings used by this project are provided by the [`typings`](https://www.npmjs.com/package/typings) tool. To add or update typings, you will need to install the tool:

```bash
$ npm install typings --global
```

All typings are stored in the `src/typings` path, and are committed with the respository to simplify building. Ensure they are saved to the `typings.json` by using the `--save` option when installing typings. For example, to install `express`:

```bash
$ typings install express --ambient --save
```

[Build Status]: https://travis-ci.org/TechNottingham/Hack24-API.svg?branch=master
[Stories in Ready]: https://badge.waffle.io/TechNottingham/Hackbot.svg?label=ready&title=Ready
