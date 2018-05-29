var should = require('should');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('keys containing dots', function() {
    it('should map keys containing double underscores into nested objects', function(done) {
      var loader = new Loader();
      loader.add({
        FOO__BAR: 'baz',
        FOO__BEEP_BOOP: 'blap',
        beep: 'boop',
      }, {underscoreNesting: true});
      loader.add({'abc': 123});
      loader.load(function(error, config) {
        should.not.exist(error);
        config.foo.should.be.an.instanceOf(Object);
        config.foo.bar.should.be.an.instanceOf(Object);
        config.foo.beepBoop.should.equal('blap');
        config.foo.bar.should.equal('baz');
        config.beep.should.equal('boop');
        config.abc.should.equal(123);
        done();
      });
    });
  });
});
 
