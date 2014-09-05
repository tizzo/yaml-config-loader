var path = require('path');
var fs = require('fs');
var util = require('util');
var yaml = require('js-yaml');
var async = require('async');

var Loader = function() {
  this.load = this.load.bind(this);
  this.config = {};
  this.loads = [];
};


Loader.prototype.addFile = function(filePath) {
  this.loads.push(this.loadFile.bind(this, filePath));
  return this;
};

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

Loader.prototype.loadFile = function(path, done) {
  fs.exists(path, function(exists) {
    if (exists) {
      fs.readFile(path, 'utf8', function(error, data) {
        try {
          return done(null, yaml.safeLoad(data));
        }
        catch (error) {
          done(error);
        }
      });
    }
    else {
      done(new Error(util.format('Specified configuration file `%s` not found.', path)));
    }
  });
};

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
