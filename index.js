var path = require('path');
var fs = require('fs');
var util = require('util');
var yaml = require('js-yaml');
var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Loader = function() {
  this.load = this.load.bind(this);
  this.parseYaml = this.parseYaml.bind(this);
  this.add = this.add.bind(this);
  this.context = {};
  this.loads = [];
  this.loads = [];
  this.loads = [];
  this.errorOnError = false;
};

/**
 * Allow errors to be handled appropriately based on configuration.
 */
Loader.prototype.errorHandler = function(error, done) {
  arguments = Array.prototype.slice.call(arguments, 0);
  var done = arguments.pop();
  if (error && this.errorOnError) {
    done(error);
  }
  else {
    done(null, {});
  }
};
util.inherits(Loader, EventEmitter);

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
 *    A string representing the format. See `Loader.translateKeyFormat()` for options.
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
    for (i in configs) {
      config = self.mergeConifguration(config, configs[i]);
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
      self.loadDirectory(path, options, function(error, config) {
        done(error, config);
      });
    }
    else {
      self.loadFile(path, options, function(error, config) {
        done(error, config);
      });
    }
  });
};

/**
 * Load configuration for an individual file.
 */
Loader.prototype.loadFile = function(path, options, done) {
  done = done || options;
  var self = this;
  fs.exists(path, function(exists) {
    if (exists) {
      fs.readFile(path, 'utf8', function(error, data) {
        /* istanbul ignore if: This error condition is near impossible to test. */
        if (error) return done(error);
        self.parseYaml(data, done);
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
    if (error) return done(error);
    var loadFile = function(filePath, cb) {
      self.loadFile(path.join(dirPath, filePath), options, cb);
    };
    async.map(files, loadFile, function(error, confs) {
      /* istanbul ignore if: This error condition is near impossible to test. */
      if (error) return done(error);
      var conf = {};
      for (i in confs) {
        conf = self.mergeConifguration(conf, confs[i]);
      }
      done(null, conf);
    });
  });
};

/**
 * Load an object.
 *
 * A simple wrapper to be added to the async function list.
 */
Loader.prototype.loadObject = function(object, options, context, done) {
  return done(null, object);
};

/**
 * Load config files from a directory into an array.
 */
Loader.prototype.loadDirectoryArray = function(dirPath, configKey, options, done) {
  var self = this;
  fs.readdir(dirPath, function(error, files) {
    /* istanbul ignore if: This error condition is near impossible to test. */
    if (error) return done(error);
    var output = {};
    output[configKey] = [];
    var fileLoadHandler = function(file, cb){
      fs.readFile(path.join(dirPath, file), 'utf8', cb);
    };
    async.map(files, fileLoadHandler, function(error, confs) {
      /* istanbul ignore if: This error condition is near impossible to test. */
      if (error) return done(error);
      for (i in confs) {
        try {
          var conf = yaml.safeLoad(confs[i]);
          output[configKey].push(conf);
        }
        catch(e) {
          // TODO: Emit an error.
        }
      }
      done(null, output);
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
Loader.prototype.mergeConifguration = function(one, two) {
  var i = null;
  if (Array.isArray(one)) {
    for (i in two) {
      one.push(two[i]);
    }
  }
  else {
    for (i in two) {
      if (two.hasOwnProperty(i)) {
        one[i] = two[i];
      }
    }
  }
  return one;
};

module.exports = Loader;
