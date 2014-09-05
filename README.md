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

  var laoder = require('yaml-config-loader');
  var path = require('path');
  loader.addFile(path.join(__dirname, 'defaults.config.yaml'));
  loader.addFile(path.join(__dirname, 'config.yaml'));
  loader.addDirectory(path.join(__dirname, 'conf.d'));
  loader.addDirectoryArray(path.join(__dirname, 'routes.d'), 'routes');
  loader.load(function(error, config) {
    console.log(config);
  });

```
