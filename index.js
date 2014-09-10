var path = require('path');
var fs = require('fs');
var util = require('util');
var yaml = require('js-yaml');
var async = require('async');
var util = require('util');

var Loader = function() {
  this.load = this.load.bind(this);
  this.parseYaml = this.parseYaml.bind(this);
  this.multiDimensionalConfigMerge = this.multiDimensionalConfigMerge.bind(this);
  this.context = {};
  this.preFileLoads = [];
  this.fileLoads = [];
  this.postFileLoads = [];
};

/**
 * Register a single yaml configuration path to be merged into the configuration.
 *
 * @param filePath
 *    The path on disk to register.
 */
Loader.prototype.addFile = function(filePath) {
  this.fileLoads.push(this.loadFile.bind(this, filePath));
  return this;
};

/**
 * Register a directory that will have config files loaded where files loaded
 * earlier will be overridden by those loaded later.
 */
Loader.prototype.addDirectory = function(directoryPath) {
  this.fileLoads.push(this.loadDirectory.bind(this, directoryPath));
  return this;
};

/**
 * Register a directory that will have config files loaded into an array.
 */
Loader.prototype.addDirectoryArray = function(directoryPath, configKey) {
  this.fileLoads.push(this.loadDirectoryArray.bind(this, directoryPath, configKey));
  return this;
};

Loader.prototype.addObject = function(object, translator) {
  this.postFileLoads.push(this.loadObject.bind(this, object, translator, this.context));
  return this;
};

Loader.prototype.addAndNormalizeObject = function(object) {
  this.postFileLoads.push(this.loadObject.bind(this, this.translateKeyFormat(object), null, this.context));
  return this;
};

/**
 * Construct a configuration object from the registered paths.
 */
Loader.prototype.load = function(done) {
  var self = this;
  self.context.config = {};
  var tasks = [
    async.parallel.bind(null, this.preFileLoads),
    async.parallel.bind(null, this.fileLoads),
  ];
  async.parallel(tasks, function(error, loadedConfig) {
    self.multiDimensionalConfigMerge(error, loadedConfig, function(error, config) {
      if (!self.postFileLoads.length) {
        done(error, config);
      }
      else {
        self.context.config = config;
        async.parallel(self.postFileLoads, function(error, configs) {
          if (error) return done(error);
          for (i in configs) {
            config = self.mergeConifguration(config, configs[i]);
          }
          done(error, config);
        });
      }
    });
  });
};

/**
 * Load configuration for an individual file.
 */
Loader.prototype.loadFile = function(path, done) {
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
Loader.prototype.loadDirectory = function(dirPath, done) {
  var self = this;
  fs.readdir(dirPath, function(error, files) {
    /* istanbul ignore if: This error condition is near impossible to test. */
    if (error) return done(error);
    var loadFile = function(filePath, cb) {
      self.loadFile(path.join(dirPath, filePath), cb);
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

Loader.prototype.loadObject = function(object, translator, context, done) {
  if (!translator) {
    return done(null, object);
  }
  translator(object, Object.keys(context.config), done);
};

/**
 * Load config files from a directory into an array.
 */
Loader.prototype.loadDirectoryArray = function(dirPath, configKey, done) {
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
          // Do something?
        }
      }
      done(null, output);
    });
  });
};

/**
 * Translate configuration from an object then perform a transformation on its
 * keys.
 *
 * This method is useful for loading environment variables in the form of
 * `SOME_NAME` and using them to override camel case variables like `someName`.
 *
 * @param object
 *   The object whose keys should be transformed.
 * @param keys
 *   An array of keys to load from the object.
 */
Loader.prototype.translateKeys = function(object, keys, done) {
  var output = {};
  keys = keys || Object.keys(object);
  for (i in keys) {
    var key = keys[i];
    // Covert camel case into environment variables (into all upper with
    // underscores).
    var replacer = function(match) { return '_' + match};
    var translatedName = key.replace(/[A-Z]/g, replacer).toUpperCase();
    if (object.hasOwnProperty(translatedName)) {
      output[key] = object[translatedName];
    }
  }
  if (done) {
    setImmediate(done.bind(null, null, output));
  }
  return output;
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
        default:
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
  for (i in two) {
    if (two.hasOwnProperty(i)) {
      one[i] = two[i];
    }
  }
  return one;
};

module.exports = Loader;
