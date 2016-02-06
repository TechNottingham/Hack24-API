[![Build Status]](https://semaphoreci.com/codesleuth/hack24-api) [![Stories in Ready]](http://waffle.io/TechNottingham/Hackbot)

# Hack24-API
An API for storing users, teams, hacks, challenges and sponsors

## Contributing

Currently the project is written in a hybrid set of TypeScript files converted from the original JavaScript. The project will self-build after a little setup.

### Prerequisites

You will need installations of the following:

1. Node.JS - currently tested with version 4 or above.
2. MongoDB

### Getting Started

1. Fork the repository.
2. Clone to your local machine:

    ```bash
    $ git clone https://github.com/<YourName>/Hack24-API
    $ cd Hack24-API
    ```

3. Install dependencies:

    ```bash
    $ npm install
    ```

4. The install step runs the TypeScript build, but you can also set up a watch on changes to build immediately. You'll need to install `gulp` globally and then run the watcher:

    ```bash
    $ npm install gulp -g
    $ gulp watch
    ```

5. To run the API locally, there is a `nodemon.json` file in the root which will allow continuous development with immediate restarts. You'll need to install nodemon globally then set your MONGODB_URL and execute:

    ```bash
    $ npm install nodemon -g
    $ MONGODB_URL='mongodb://localhost/hack24api' nodemon
    ```
    
6. Once you've made your changes, push up your code:

    ```bash
    $ git add -A
    $ git commit -m 'Your change description'
    $ git push origin master
    ```

7. Open a pull request!

[Build Status]: https://semaphoreci.com/api/v1/codesleuth/hack24-api/branches/master/badge.svg
[Stories in Ready]: https://badge.waffle.io/TechNottingham/Hackbot.svg?label=ready&title=Ready
