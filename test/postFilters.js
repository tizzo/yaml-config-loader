var should = require('should');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('postFilters', function() {
    it('should tweak configuration before it is returned', function(done) {
      var loader = new Loader({
        postFilters: [
         function(config) {
           config.baz = 'bot';
           return config;
         }
        ]
      });
      loader.add({ foo: 'bar' });
      loader.load(function(error, config) {
        should.not.exist(error);
        config.foo.should.equal('bar');
        config.baz.should.equal('bot');
        done();
      });
    });
  });
});
 
