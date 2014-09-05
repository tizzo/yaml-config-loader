var should = require('should');
var path = require('path');

var Loader = require('..');

function fixture(name) {
  return path.resolve(path.join(__dirname, 'fixtures', 'fileLoader', name) + '.yaml');
};

describe('yaml-config-loader', function() {
  describe('addFile', function() {
    it('should throw an error if a non-existant file is specified.', function(done) {
      var loader = new Loader();
      loader.addFile(fixture('nonsense'));
      loader.load(function(error, config) {
        should.exist(error);
        error.message.should.containEql('not found');
        done();
      });
    });
    it('should throw an error if an invalid yaml is specified', function(done) {
      var loader = new Loader();
      loader.addFile(fixture('invalid'));
      loader.load(function(error, config) {
        should.exist(error);
        error.message.should.containEql('missed comma');
        done();
      });
    });
    it('should load a config file', function(done) {
      var loader = new Loader();
      loader.addFile(fixture('config1'));
      loader.load(function(error, config) {
        should.not.exist(error);
        config.captain.should.equal('The Skipper');
        config.firstMate.should.equal('Gilligan');
        done();
      });
    });
    it('should override a earlier files with later ones', function(done) {
      var loader = new Loader();
      loader.addFile(fixture('config1'))
            .addFile(fixture('config2'))
            .addFile(fixture('config3'));
      loader.load(function(error, config) {
        should.not.exist(error);
        config.captain.should.equal('James T. Kirk');
        config.firstMate.should.equal('Gilligan');
        config.millionaire.should.equal('Thurston Howell');
        config.doctor.should.equal('Beverly Crusher');
        done();
      });
    });
  });
});
