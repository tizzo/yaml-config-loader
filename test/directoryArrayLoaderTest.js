var should = require('should');
var path = require('path');

var Loader = require('..');

function fixture(name) {
  return path.resolve(path.join(__dirname, 'fixtures', 'directoryLoader', name));
};

describe('yaml-config-loader', function() {
  describe('addDirectory', function() {
    it('should load an array of json overriding older values with newer', function(done) {
      var loader = new Loader();
      loader.addDirectory(fixture('valid'));
      loader.load(function(error, config) {
        should.not.exist(error);
        config.captain.should.equal('Jean-Luc Picard');
        config.vulcan.should.equal('Spok');
        config.android.should.equal('Data');
        done();
      });

    });
  });
  describe('addDirectoryArray', function() {
    it('should throw an error if a non-existant directory is specified', function(done) {
      var loader = new Loader();
      loader.addDirectoryArray(fixture('nonsense'));
      loader.load(function(error, config) {
        should.exist(error);
        error.message.should.containEql('ENOENT');
        done();
      });
    });
    it('should throw an error if an invalid yaml file is parsed', function(done) {
      var loader = new Loader();
      loader.addDirectoryArray(path.join(__dirname, 'fixtures', 'fileLoader'));
      loader.load(function(error, config) {
        should.exist(error);
        error.message.should.containEql('missed comma between flow collection entries at line 2, column 3:');
        done();
      });
    });
    it('should load an array of valid json into an array', function(done) {
      var loader = new Loader();
      loader.addDirectoryArray(fixture('valid'), 'starTrek');
      loader.load(function(error, config) {
        should.not.exist(error);
        config.starTrek[0].captain.should.equal('James T. Kirk');
        config.starTrek[1].captain.should.equal('Jean-Luc Picard');
        done();
      });
    });
  });
});
 
