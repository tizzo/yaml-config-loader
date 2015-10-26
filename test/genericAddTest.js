var yargs = require('yargs');
var path = require('path');
var should = require('should');

var Loader = require('../index');
var loader = new Loader();

describe('yaml-config-loader', function() {
  describe('add', function() {
    it('should detect the type added and add it appropriately', function(done) {

      // First load default configuration.
      loader.add(path.join(__dirname, 'fixtures', 'fileLoader', 'config1.yaml'));
      loader.add(path.join(__dirname, 'fixtures', 'directoryLoader', 'valid'));
      loader.add({'firstMate': 'William T. Riker'});
      loader.load(function(error, config) {
        should.not.exist(error);
        config.captain.should.equal('Jean-Luc Picard');
        config.firstMate.should.equal('William T. Riker');
        config.doctor.should.equal('Beverly Crusher');
        config.vulcan.should.equal('Spok');
        config.android.should.equal('Data');
        done(error);
      });
    });
    it('should throw an error if a non-existant file is specified', function(done) {
      var loader = new Loader();
      loader.add('invalid-path');
      loader.load(function(error, config) {
        should.exist(error);
        error.message.should.containEql('ENOENT');
        done();
      });
    });
  });
});

