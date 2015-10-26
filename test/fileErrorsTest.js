var should = require('should');
var path = require('path');

var Loader = require('..');

function fixture(name) {
  return path.resolve(path.join(__dirname, 'fixtures', 'fileLoader', name) + '.yaml');
};

describe('yaml-config-loader', function() {
  describe('addFile', function() {
    it('should throw an error if a non-existant file is specified', function(done) {
      var loader = new Loader();
      loader.addFile(fixture('nonsense'));
      loader.load(function(error, config) {
        should.exist(error);
        error.message.should.containEql('not found');
        done();
      });
    });
  });
});
 
