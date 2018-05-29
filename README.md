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

## Cosntructor Options

  - `stopOnErrors` This libraries defaults to fast failures where any error will
    cause the callback to be called with an error, this behavior can be suspend
    so that an `error` event is emitted on error instead so that you can handle
    errors as desired and allow the module to continue in a best effort approach.

## Options

Add methods may contain options, these include:

  - `allowedKeys` If specified the keys resulting from this load operation will be included in the final config object and any keys left unspecified will not.


## Advanced usage

Some additional conifguration parameters and loader options are available to
further customize the experience.

### Mapping a flat namespace to a structured one (for environment variables)

If you are importing configuration from environment variables you can either
perform key re-mapping as listed in the next section or you can use double
underscores to specify hierarchy (i.e. `FOO__BAR`) by using the `underscoreNesting` option.

This means you could remap something like:

``` json
{
  "serverConfig": {
    "port": 9999,
    "host": "localhost"
  }
}
```

Like so:

``` bash
SERVER_CONFIG__PORT=9999
SERVER_CONFIG__HOST=localhost
```

By doing the following:

``` javascript
loader.add('./some/file.yaml');
loader.addAndNormalizeObject(process.env, {underscoreNesting: true})
loader.load(function(error, config) {
  console.log(config); // { foo: { bar: { baz: 123 } } }
});
```


### Key Re-mapping with Nested Values

If you are importing conifguration from environment variables but want that
configuration to be nested key remapping can be used to rename the values
and even to set these values inside of sub-objects. This is useful for mapping
environment variables like `DATABASE_HOST` to a resulting structure like
`{ database: { host: 'localhost', port: 3306 } }`.

```` javascript
loader.addMapping({
  fooBarBaz: 'foo.bar.baz',
  fizzBuzz: 'buzzFizz'
});
loader.addAndNormalizeObject({ 'fooBarBaz': 123 })
loader.load(function(error, config) {
  console.log(config); // { foo: { bar: { baz: 123 } } }
});
````

### Deep Merges

By default the loader treats all objects as one level deep and keys containing
objects are not merged. This setting allows you to inform the loader that
a key should be merged with, rather than replaced by, a subsequent object passed
in a later configuration.

```` javascript
loader.add({ foo: { bar: 1 } });
loader.add({ foo: { baz: 2 } }, { deepMerge: [ 'foo' ] })
loader.load(function(error, config) {
  console.log(config); // { foo: { bar: 1, baz: 2 } } }
});
````

### Key Filtering

If you have a set of allowed keys you can tell the loader that a given object's
keys are trusted and should definitely be allowed, this will create or add to a
running list of all allowed keys and any key not set in this list will not be
allowed in the final output. Very useful for filtering out extraneous keys from
process.env.

```` javascript
loader.add({ foo: 1, bar: 2 });
loader.add({ bar: 3 }, { allowedKeys: true })
loader.load(function(error, config) {
  console.log(config); // { bar: 3 }
});
````

### Post Filters

If you would like to insert some logic to perform filtering on the final object
before it is returned, you may pass in an array of synchronous filters that may
act on the object before it is finally returned by the yaml-config-loader.

```` javascript
var loader = new Loader({
  postFilters: [
   function(config) {
     config.baz = 'bot';
     return config;
   }
  ]
});
loader.add({ foo: 'bar' });
loader.load(function(error, config) {
  console.log(config); // { foo: 'bar', baz: 'bot' }
});
````

