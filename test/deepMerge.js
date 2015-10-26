var should = require('should');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('deepMerge', function() {
    it('should not merge deep objects by default', function(done) {
      var loader = new Loader();
      loader.add({
        foo: {
          bar: 'baz',
        },
        disco: [ 'a', 'c' ],
      });
      loader.add({
        foo: {
          baz: 'bot',
        },
        disco: [ 'b', 'e' ],
      });
      loader.load(function(error, config) {
        should.not.exist(error);
        should.not.exist(config.foo.bar);
        config.foo.baz.should.equal('bot');
        config.disco.should.containEql('b')
        config.disco.should.containEql('e')
        config.disco.should.not.containEql('a')
        config.disco.should.not.containEql('c')
        done();
      });
    });
    it('should merge deep objects if configured appropriately', function(done) {
      var loader = new Loader();
      var options = { deepMerge: [ 'foo', 'disco' ] };
      loader.add({
        foo: {
          bar: 'baz',
        },
        disco: [ 'a', 'c' ],
      });
      loader.add({
        foo: {
          baz: 'bot',
        },
        disco: [ 'b', 'e' ],
      }, options);
      loader.load(function(error, config) {
        should.not.exist(error);
        config.foo.bar.should.equal('baz');
        config.foo.baz.should.equal('bot');
        config.disco.should.containEql('b')
        config.disco.should.containEql('e')
        config.disco.should.containEql('a')
        config.disco.should.containEql('c')
        done();
      });
    });
    it('should not error if a deep merge is attempted a scalar value key', function(done) {
      var loader = new Loader();
      var options = { deepMerge: [ 'foo' ] };
      loader.add({ foo: 'bar' });
      loader.add({ foo: 'baz' }, options);
      loader.load(function(error, config) {
        should.not.exist(error);
        config.foo.should.equal('baz');
        done();
      });
    });
  });
});
 
