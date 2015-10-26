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


  // First load default configuration and filter the final configuration to settings defined in this file.
  loader.add(path.join(__dirname, 'defaults.config.yaml'), { filterKeys: true });
  // Override defaults with a conf file in /etc/myapp
  loader.add(path.join('etc', 'myapp', 'config.yaml'));
  // Override settings with files in the /etc/myapp/conf.d directory.
  loader.addDirectory(path.join('etc', 'myapp', 'conf.d'));
  // Add / override the `routes` configuration key by building an array of routes loaded from files in /etc/myapp/routes.d
  loader.addDirectoryArray(path.join('etc', 'myapp', 'routes.d'), 'routes');
  // Override all configuration to this point with config from the users preference folder.
  loader.addFile(path.resolve(path.join('~', '.myapp.yaml')));
  // Override configuration from environment variables where a config value of `someConf`
  // maps to an environment variable of `SOME_CONF`.
  loader.addAndNormalizeObject(process.env);
  loader.addAndNormalizeObject(argv);
  loader.load(function(error, config) {
    // Print the resulting configuration.
    console.log(config);
  });

```

## Options

Add methods may contain options, these include:

  - `filterKeys` whether to limit the final config output to keys present in this configuration object.
