var path = require('path');
var fs = require('fs');
var util = require('util');
var yaml = require('js-yaml');
var async = require('async');

var Loader = function() {
  this.load = this.load.bind(this);
  this.parseYaml = this.parseYaml.bind(this);
  this.config = {};
  this.loads = [];
};

/**
 * Register a single yaml configuration path to be merged into the configuration.
 *
 * @param filePath
 *    The path on disk to register.
 */
Loader.prototype.addFile = function(filePath) {
  this.loads.push(this.loadFile.bind(this, filePath));
  return this;
};

/**
 * Register a directory that will have config files loaded where older files will override younger.
 */
Loader.prototype.addDirectory = function(directoryPath) {
  this.loads.push(this.loadDirectory.bind(this, directoryPath));
  return this;
};

/**
 * Register a directory that will have config files loaded into an array.
 */
Loader.prototype.addDirectoryArray = function(directoryPath, configKey) {
  this.loads.push(this.loadDirectoryArray.bind(this, directoryPath, configKey));
  return this;
};

/**
 * Construct a configuration object from the registered paths.
 */
Loader.prototype.load = function(done) {
  var self = this;
  async.parallel(this.loads, function(error, configArray) {
    if (error) return done(error);
    var config = {};
    for (i in configArray) {
      config = self.mergeConifguration(config, configArray[i]);
    }
    done(null, config);
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
        /* istanbul ignore next */
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
    /* istanbul ignore next */
    if (error) return done(error);
    var loadFile = function(filePath, cb) {
      self.loadFile(path.join(dirPath, filePath), cb);
    };
    async.map(files, loadFile, function(error, confs) {
      /* istanbul ignore next */
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
 * Load config files from a directory into an array.
 */
Loader.prototype.loadDirectoryArray = function(dirPath, configKey, done) {
  var self = this;
  fs.readdir(dirPath, function(error, files) {
    /* istanbul ignore next */
    if (error) return done(error);
    var output = {};
    output[configKey] = [];
    var fileLoadHandler = function(file, cb){
      fs.readFile(path.join(dirPath, file), 'utf8', cb);
    };
    async.map(files, fileLoadHandler, function(error, confs) {
      /* istanbul ignore next */
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
  for (i in two) {
    if (two.hasOwnProperty(i)) {
      one[i] = two[i];
    }
  }
  return one;
};

module.exports = Loader;
