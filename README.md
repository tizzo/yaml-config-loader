# YAML-config-loader
[![Build Status](https://travis-ci.org/tizzo/yaml-config-loader.svg?branch=master)](https://travis-ci.org/tizzo/yaml-config-loader)
[![Coverage Status](https://img.shields.io/coveralls/tizzo/yaml-config-loader.svg)](https://coveralls.io/r/tizzo/yaml-config-loader?branch=master)

Yet another configuration loader because I too am opinionated about how this should work.

## Features

  - Loads configuration from yaml files because json isn't for humans
  - Hierarchically override configuration sources
    - override defaults with a config file
    - override the config file with environment variables
    - override environment variables with command line options
  - Load configuration from directories
    - Merge a directory of yaml configuration files into one configuratin object (overriding existing configuration where collisions occur)
    - Create an array containing all of the configs in a directory and set it as an attribute on the top level config object (useful for applications defining multiple self-contained entities)
  - Translates between camel case, dash, undersore, and capitalized underscore configuration (not yet implemented)

## Usage

``` javascript

  var Loader = require('yaml-config-loader');
  var path = require('path');

  var yargs = require('yargs');

  var loader = new Loader();

  var argv = yargs
    .describe('some-conf', 'Set the value for some-conf!')
    .argv;


  // First load default configuration.
  loader.addFile(path.join(__dirname, 'defaults.config.yaml'));
  // Override defaults with a conf file in /etc/myapp
  loader.addFile(path.join('etc', 'myapp', 'config.yaml'));
  loader.addDirectory(path.join('etc', 'myapp', 'conf.d'));
  loader.addDirectoryArray(path.join('etc', 'myapp', 'routes.d'), 'routes');
  // Override all configuration to this point with config from the users preference folder.
  loader.addFile(path.resolve(path.join('~', '.myapp.yaml')));
  // Override configuration from environment variables where a config value of `someConf`
  // maps to an environment variable of `SOME_CONF`.
  loader.addAndStandardizeObject(process.env);
  loader.addAndStandardizeObject(argv);
  loader.load(function(error, config) {
    console.log(config);
  });

```
