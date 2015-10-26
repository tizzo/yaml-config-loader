var should = require('should');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('filterKeys', function() {
    it('should filter out keys not specified in filter keys', function(done) {
      var loader = new Loader();
      loader.addObject({ foo: 'bar', baz: 'bot' });
      loader.addObject({ foo: 'bar' }, { allowedKeys: true });
      loader.addObject({ bingo: 'disco' }, { allowedKeys: true });
      loader.addObject({ bingo: 'bongo' });
      loader.load(function(error, config) {
        should.not.exist(error);
        config.foo.should.equal('bar');
        config.bingo.should.equal('bongo');
        should.not.exist(config.baz);
        done();
      });
    });
  });
});
 
