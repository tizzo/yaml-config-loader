var should = require('should');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('addMapping', function() {
    it('should remap a configuration', function(done) {
      var loader = new Loader();
      loader.addMapping({
        fooBarBaz: 'foo.bar.baz',
        fizzBuzz: 'buzzFizz',
      });
      loader.addAndNormalizeObject({ 'FOO_BAR_BAZ': 123, 'fizzBuzz': 456});
      loader.load(function(error, config) {
        config.foo.bar.baz.should.equal(123);
        config.buzzFizz.should.equal(456);
        done();
      });
    });
  });
});

 
