var path = require('path');
var fs = require('fs');
var util = require('util');
var yaml = require('js-yaml');
var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Loader = function(options) {
  options = options || {};
  this.load = this.load.bind(this);
  this.parseYaml = this.parseYaml.bind(this);
  this.add = this.add.bind(this);
  this.errorHandler = this.errorHandler.bind(this);
  this.processConfigOptions = this.processConfigOptions.bind(this);
  this.filterAllowedKeys = this.filterAllowedKeys.bind(this);
  this.context = {};
  this.schema = {};
  this.mapping = {};
  this.loads = [];
  this.stopOnError = options.stopOnError !== undefined ? options.stopOnError : true;
  this.postFilters = options.postFilters || [];
  // A running list of allowed keys, if specified only these will be allowed.
  this.allowedKeys = [];
};
util.inherits(Loader, EventEmitter);

/**
 * Allow errors to be handled appropriately based on configuration.
 */
Loader.prototype.errorHandler = function(error, done) {
  arguments = Array.prototype.slice.call(arguments, 0);
  var done = arguments.pop();
  if (error && this.stopOnError) {
    done(error);
  }
  else {
    this.emit('error', error);
    done(null, { config: {} });
  }
};

/**
 * Set a schema that will be enforced by casting values passed in.
 */
Loader.prototype.setSchema = function(schema) {
  return this.schema = this.mergeConifguration(this.schema, schema);
};

/**
 * Applies the configured schema to the loaded configuration.
 */
Loader.prototype.applySchema = function(schema, configuration) {
  var key = null;
  for (key in schema) {
    if (configuration.hasOwnProperty(key)) {
      // The schema should be a hash of { key: Type }.
      configuration[key] = schema[key](configuration[key]);
    }
  }
};

/**
 * Appends a set of mapping rules to map keys to configuration objects.
 */
Loader.prototype.setMapping = function(mapping) {
  this.mapping = this.mergeConifguration(this.mapping, mapping);
};

/**
 * Remaps the set of configuration through configured remapping rules.
 *
 * @param mapping {object} A hash
 */
Loader.prototype.applyMapping = function(mapping, configuration) {
  var source = null;
  for (source in mapping) {
    if (configuration.hasOwnProperty(source)) {
      var destination = mapping[source];
      // The mapping should be a hash of { sourceKey: destinationKey }.
      this.setKeyFromMapping(destination, configuration[source], configuration);
      delete configuration[source];
    }
  }
};

/**
 *
 */
Loader.prototype.setKeyFromMapping = function(destinationKey, value, config) {
  var path = destinationKey.split('.');
  var depth = path.length;
  var localConfigReference = config
  for (i = 0 ; i < depth - 1 ; i++) {
    var key = path[i];
    if (!localConfigReference[key]) {
      localConfigReference[key] = {}
    }
    localConfigReference = localConfigReference[key];
  }
  localConfigReference[path[depth - 1]] = value;
};

/**
 * Flexible loader function that can load files from objects or directories.
 */
Loader.prototype.add = function(item, options) {
  switch (typeof item) {
    case 'string':
      this.addFileOrDirectory(item, options);
      break;
    case 'object':
      this.addObject(item, options);
      break;
  }
};

/**
 * Add a file or directory for automatic detection.
 */
Loader.prototype.addFileOrDirectory = function(path, options) {
  this.loads.push(this.loadFileOrDirectory.bind(this, path, options));
  return this;
};

/**
 * Register a single yaml configuration path to be merged into the configuration.
 *
 * @param filePath
 *    The path on disk to register.
 */
Loader.prototype.addFile = function(filePath, options) {
  this.loads.push(this.loadFile.bind(this, filePath, options));
  return this;
};

/**
 * Register a directory that will have config files loaded where files loaded
 * earlier will be overridden by those loaded later.
 */
Loader.prototype.addDirectory = function(directoryPath, options) {
  this.loads.push(this.loadDirectory.bind(this, directoryPath, options));
  return this;
};

/**
 * Register a directory that will have config files loaded into an array.
 */
Loader.prototype.addDirectoryArray = function(directoryPath, configKey, options) {
  this.loads.push(this.loadDirectoryArray.bind(this, directoryPath, configKey, options));
  return this;
};

/**
 * Add an object to be merged in at the appropriate level.
 */
Loader.prototype.addObject = function(object, options) {
  this.loads.push(this.loadObject.bind(this, object, options, this.context));
  return this;
};

/**
 * Add an object but normalize it's keys before merging them in.
 *
 * @param object
 *    The object to add.
 * @param format
 *    A string representing the format. See `Loader.translateKeyFormat()`.
 */
Loader.prototype.addAndNormalizeObject = function(object, format, options) {
  format = format || 'camelCase';
  this.performTransformations(options, object);
  this.loads.push(this.loadObject.bind(this, this.translateKeyFormat(object, format), options, this.context));
  return this;
};

/**
 * Construct a configuration object from the registered paths.
 */
Loader.prototype.load = function(done) {
  var self = this;
  self.context.config = {};
  async.series(this.loads, function(error, configs) {
    var config = {};
    var i = null;
    for (i in configs) {
      if (configs[i] && configs[i].config) {
        config = self.mergeConifguration(config, configs[i].config, configs[i].options);
      }
    }
    if (self.postFilters.length) {
      for (i in self.postFilters) {
        config = self.postFilters[i](config);
      }
    }
    if (self.allowedKeys.length > 0) {
      config = self.filterAllowedKeys(config);
    }
    done(error, config);
  });
};

/**
 * Load either a file or a directory based on path.
 */
Loader.prototype.loadFileOrDirectory = function(path, options, done) {
  var self = this;
  fs.stat(path, function(error, stat) {
    if (error) return self.errorHandler(error, done);
    if (stat.isDirectory()) {
      self.loadDirectory(path, options, done);
    }
    else {
      self.loadFile(path, options, done);
    }
  });
};

/**
 * Filter the keys of the configuration hash by an array of allowed values.
 */
Loader.prototype.filterKeys = function(keys, config) {
  var output = {};
  var key = null;
  for (key in config) {
    if (keys.indexOf(key) !== -1) {
      output[key] = config[key];
    }
  }
  return output;
};

/**
 * Allow only the collection of all whitelisted keys.
 */
Loader.prototype.filterAllowedKeys = function(config) {
  return this.filterKeys(this.allowedKeys, config);
};

/**
 * Add to the list of allowed keys.
 */
Loader.prototype.addAllowedKeys = function(keys) {
  var i = null;
  for (i in keys) {
    if (this.allowedKeys.indexOf(i) === -1) {
      this.allowedKeys.push(i);
    }
  }
};

/**
 * Perform any transformations necessary based on the options and global configuration.
 */
Loader.prototype.performTransformations = function(options, config) {
  this.processConfigOptions(options, config);
  this.applySchema(this.schema, config);
  this.applyMapping(this.mapping, config);
};


/**
 * Prepares loaded configuration based on options provided.
 */
Loader.prototype.processConfigOptions = function(options, config) {
  if (!options) {
    return;
  }
  if (options.allowedKeys === true && config) {
    this.addAllowedKeys(config);
  }
};

/**
 * Load configuration for an individual file.
 */
Loader.prototype.loadFile = function(path, options, done) {
  var self = this;
  fs.exists(path, function(exists) {
    if (exists) {
      fs.readFile(path, 'utf8', function(error, data) {
        /* istanbul ignore if: This error condition is near impossible to test. */
        if (error) return self.errorHandler(error, done);
        self.parseYaml(data, function(error, config) {
          self.performTransformations(options, config);
          return done(error, { config: config, options: options });
        });
      });
    }
    else {
      var error = new Error(util.format('Specified configuration file `%s` not found.', path))
      self.errorHandler(error, done);
    }
  });
};

/**
 * Load config files from a directory allowing new entries to override old.
 */
Loader.prototype.loadDirectory = function(dirPath, options, done) {
  var self = this;
  fs.readdir(dirPath, function(error, files) {
    /* istanbul ignore if: This error condition is near impossible to test. */
    if (error) return self.errorHandler(error, done);
    files = self.filterYamlFiles(files);
    var loadFile = function(filePath, cb) {
      self.loadFile(path.join(dirPath, filePath), options, cb);
    };
    async.map(files, loadFile, function(error, confs) {
      /* istanbul ignore if: This error condition is near impossible to test. */
      if (error) return self.errorHandler(error, done);
      var conf = {};
      for (i in confs) {
        conf = self.mergeConifguration(conf, confs[i].config, confs[i].options);
      }
      done(null, { config: conf, options: options});
    });
  });
};

/**
 * Filters an array of filenames to only those of .yaml or .yml extensions.
 *
 * @param fileNames
 *    An array of fileNames.
 */
Loader.prototype.filterYamlFiles = function(fileNames) {
  return fileNames.filter(function(item) {
    var reg = new RegExp('\.ya?ml');
    return reg.test(path.extname(item));
  });
};

/**
 * Load an object.
 *
 * A simple wrapper to be added to the async function list.
 */
Loader.prototype.loadObject = function(object, options, context, done) {
  this.performTransformations(options, object);
  return done(null, { config: object, options: options });
};

/**
 * Load config files from a directory into an array.
 */
Loader.prototype.loadDirectoryArray = function(dirPath, configKey, options, done) {
  var self = this;
  fs.readdir(dirPath, function(error, files) {
    /* istanbul ignore if: This error condition is near impossible to test. */
    if (error) return self.errorHandler(error, done);
    var output = {};
    output[configKey] = [];
    var fileLoadHandler = function(file, cb){
      fs.readFile(path.join(dirPath, file), 'utf8', cb);
    };
    files = self.filterYamlFiles(files);
    async.map(files, fileLoadHandler, function(error, confs) {
      /* istanbul ignore if: This error condition is near impossible to test. */
      if (error) return self.errorHandler(error, done);
      var errors = [];
      for (i in confs) {
        try {
          var conf = yaml.safeLoad(confs[i]);
          output[configKey].push(conf);
        }
        catch(error) {
          errors.push(error);
        }
      }
      if (errors.length) return self.errorHandler(errors[0], done);
      done(null, { config: output, options: options });
    });
  });
};

/**
 * Format the keys on an object converting to them to a supported format.
 *
 * @param object
 *   A plain old javascript object.
 * @param format
 *   A supported format to convert the keys to.
 *
 *   These are also the supported from formats.
 *      'camelCase' - standard camelCase with capitalization splitting parts.
 *      'CAPITAL_UNDERSCORES' - standard ENV variable format
 *      'lower-dashes' - all lower case with dashes, typical of cli parameters.
 */
Loader.prototype.translateKeyFormat = function(object, format) {
  var output = {};
  format = format || 'camelCase';
  for (key in object) {
    if (object.hasOwnProperty(key)) {
      var parts = key
        .split(/([A-Z][a-z]+)|_|-/g)
        .filter(function(element) {
          return element;
        })
        .map(function(item) {
          return item.toLowerCase();
        });
      var newKey = '';
      switch (format) {
        case 'camelCase':
          newKey = this.formatCamelCase(parts);
          break;
        case 'CAPITAL_UNDERSCORES':
          newKey = parts.join('_').toUpperCase();
          break;
        case 'lower-dashes':
          newKey = parts.join('-').toLowerCase();
          break;
      }
      output[newKey] = object[key];
    }
  }
  return output;
};

/**
 * Utility function to format an array of word parts in camelCase.
 */
Loader.prototype.formatCamelCase = function(parts) {
  var parts = parts.slice();
  var output = parts.shift();
  var part = '';
  for (i in parts) {
    part = parts[i];
    output += part.substr(0, 1).toUpperCase() + part.substring(1);
  }
  return output;
}

/**
 * Parse a yaml file and report an error if necessary.
 */
Loader.prototype.parseYaml = function(data, done) {
  try {
    return done(null, yaml.safeLoad(data));
  }
  catch (error) {
    setImmediate(done.bind(null, error));
  }
}

/**
 * Merge two confiugration objects overriding values on the first with values on
 * the second.
 */
Loader.prototype.mergeConifguration = function(one, two, options) {
  options = options || {};
  var key = null;
  if (one instanceof Array) {
    for (key in two) {
      one.push(two[key]);
    }
  }
  else {
    for (key in two) {
      if (two.hasOwnProperty(key)) {
        var deepMerge = options.deepMerge && options.deepMerge.indexOf(key) !== -1;
        if (deepMerge) {
          if (one[key] instanceof Array) {
            var i = null;
            for (i in two[key]) {
              one[key].push(two[key][i]);
            }
          }
          // Testing whether these are objects
          else if (typeof one[key] == 'object' && (typeof one[key] == typeof two[key])) {
            one[key] = this.mergeConifguration(one[key], two[key]);
          }
          else {
            one[key] = two[key];
          }
        }
        else {
          if (two[key] !== undefined || (options.allowUndefined && options.allowUndefined == true)) {
            one[key] = two[key];
          }
        }
      }
    }
  }
  return one;
};

module.exports = Loader;
