var should = require('should');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('addSchema', function() {
    it('should assign a schema that can be used to cast config values', function(done) {
      var loader = new Loader();
      loader.add({ someInt: '3' });
      loader.load(function(error, conf) {
        conf.someInt.should.be.exactly('3').and.be.a.String();
        loader.setSchema({
          someConf: String,
          someInt: Number,
        });
        loader.add({ someInt: '3' }, { filterAllowedKeys: true });
        loader.load(function(error, conf) {
          conf.someInt.should.be.exactly(3).and.be.a.Number();
          done();
        });
      });
    });
    it('should ', function(done) {
      var loader = new Loader();
      loader.setMapping({
        fooBarBaz: 'foo.bar.baz',
      });
      loader.addAndNormalizeObject({ 'FOO_BAR_BAZ': 123 });
      loader.load(function(error, config) {
        config.foo.bar.baz.should.equal(123);
        done();
      });
    });
  });
});

 
