# YAML-config-loader

Yet another configuration loader because I too am opinionated about how this should work.

## Features

  - Loads configuration from yaml files because json isn't for humans
  - Hierarchically override configuration sources
    - override defaults with a config file
    - override the config file with environment variables
    - override environment variables with command line options
  - Load configuration from directories
    - Create an array where one element is the 
  - Translates between camel case, dash, undersore, and capitalized underscore configuration

## Usage

``` javascript

  var laoder = require('yaml-config-loader');
  var path = require('path');
  loader.addFile(path.join(__dirname, 'defaults.config.yaml'));
  loader.addFile(path.join(__dirname, 'config.yaml'));
  loader.addDirectory(path.join(__dirname, 'conf.d'));
  loader.addDirectory(path.join(__dirname, 'routes.d'), 'routes');
  loader.addArrayDirectory(path.join(__dirname, 'routes.d'), 'routes');
  loader.load(function(error, config) {
    console.log(config);
  });

```
