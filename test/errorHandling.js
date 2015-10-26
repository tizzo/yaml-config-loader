var should = require('should');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('errorHandling', function() {
    it('should emit an error if a non-existant file is added', function(done) {
      var loader = new Loader({ stopOnError: false });
      loader.addFile('no-file');
      loader.on('error', function(error) {
        should.exist(error);
        error.message.should.equal('Specified configuration file `no-file` not found.');
        done();
      });
      loader.load(function(error, config) {
        should.not.exist(error);
      });
    });
    it('should emit an error if a non-existant directory is added', function(done) {
      var loader = new Loader({ stopOnError: false });
      loader.addDirectory('no-file');
      loader.on('error', function(error) {
        should.exist(error);
        error.message.should.containEql('ENOENT');
        done();
      });
      loader.load(function(error, config) {
        should.not.exist(error);
      });
    });
  });
});
 
