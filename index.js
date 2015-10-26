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
  var i = null;
  for (i in config) {
    if (keys.indexOf(i) !== -1) {
      output[i] = config[i];
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
 * Prepares loaded configuration based on options provided.
 */
Loader.prototype.processConfigOptions = function(options, config) {
  if (!options) {
    return;
  }
  if (options.filterKeys === true && config) {
    this.postFilters.push(this.filterKeys.bind(this, Object.keys(config)));
  }
  if (options.allowedKeys === true && config) {
    this.addAllowedKeys(config);
    if (this.postFilters.indexOf(this.processConfigOptions) == -1) {
      this.postFilters.push(this.filterAllowedKeys);
    }
  }
  this.applySchema(this.schema, config);
};

/**
 * Load configuration for an individual file.
 */
Loader.prototype.loadFile = function(path, options, done) {
  if (!done) {
    done = options;
    options = false;
  }
  var self = this;
  fs.exists(path, function(exists) {
    if (exists) {
      fs.readFile(path, 'utf8', function(error, data) {
        /* istanbul ignore if: This error condition is near impossible to test. */
        if (error) return self.errorHandler(error, done);
        self.parseYaml(data, function(error, config) {
          self.processConfigOptions(options, config);
          return done(error, { config: config, options: options });
        });
      });
    }
    else {
      done(new Error(util.format('Specified configuration file `%s` not found.', path)));
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
  this.processConfigOptions(options, object);
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
      for (i in confs) {
        try {
          var conf = yaml.safeLoad(confs[i]);
          output[configKey].push(conf);
        }
        catch(error) {
          self.emit('error', error);
        }
      }
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
  var i = null;
  if (one instanceof Array) {
    for (i in two) {
      one.push(two[i]);
    }
  }
  else {
    for (i in two) {
      if (two.hasOwnProperty(i)) {
        var deepMerge = options.deepMerge && options.deepMerge.indexOf(i) !== -1;
        if (deepMerge) {
          if (one[i] instanceof Array) {
            var j = null;
            for (j in two[i]) {
              one[i].push(two[i][j]);
            }
          }
          else if (one && (typeof one[i] == typeof two[i])) {
            one[i] = this.mergeConifguration(one[i], two[i]);
          }
          else {
            one[i] = two[i];
          }
        }
        else {
          if (two[i] !== undefined || (options.allowUndefined && options.allowUndefined == true)) {
            one[i] = two[i];
          }
        }
      }
    }
  }
  return one;
};

module.exports = Loader;
