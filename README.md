[![Build Status]](https://travis-ci.org/TechNottingham/Hack24-API) [![Stories in Ready]](http://waffle.io/TechNottingham/Hackbot)
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/TechNottingham/Hack24-API)


# Hack24-API
An API for storing users, teams, hacks, challenges and sponsors

## Running the Server

This API is written in TypeScript with an Express server using Mongoose for data storage in MongoDB.

### Prerequisites

_(see [Running with Docker](#running-with-docker) to get started faster)_

You will need installations of the following available:

1. Node.js (`node`) - _currently tested with version 6.9, and running on Heroku on 6.9_
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

### Running with Docker

The repository includes a `Dockerfile` and `docker-compose.yml` file for use with [`docker-compose`]. You get started very quickly by simply starting the compose file from the repository path:

```bash
docker-compose up
```

If you are developing locally, and would prefer to use docker for MongoDB only, use the following command to run a local version of MongoDB for use with the API:

```bash
docker run --rm -p 27017:27017 --name hack24-api-db -d mongo --smallfiles
```

Then stop the database when you're done with:

```bash
docker stop hack24-api-db
```

## Developing

Since this is a TypeScript project, the `.ts` files will need to be _transcompiled_ into JavaScript `.js` files before the test suite can be run. To simplify this, there are two `npm` scripts which will handle the compilation and testing cycles for you.

1. `npm run build -- -w`

   This will run `tsc` with the `--watch|w` flag to trigger a recompile whenever any files change within the `src` path (the `.ts` files). Start this in a separate terminal window and leave running while you work.
2. `npm run test -- -w`

   This will run `mocha` with the `--watch|w` flag to trigger a run through all tests if it sees the contents of the `build` path change (the compiled `.js` files). Also start this process in a new terminal window if you would like a smooth experience.

It's worth deleting the `build` path and restarting the `npm run build -- -w` script - this is due to the command being unable to remove any scripts that you may have deleted in the source path, and will eventually become cluttered with deleted files.

## Type Definitions

Type definitions were replaced with the `@types` scoped packages, inherited from Definitely Typed definitions. Some local definitions are used also to define smaller interfaces. This means there is no longer a need for the `typings` tool.

[Build Status]: https://travis-ci.org/TechNottingham/Hack24-API.svg?branch=master
[Stories in Ready]: https://badge.waffle.io/TechNottingham/Hackbot.svg?label=ready&title=Ready
[`docker-compose`]: https://docs.docker.com/compose/
