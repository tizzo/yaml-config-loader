var should = require('should');
var path = require('path');

var Loader = require('..');

function fixture(name) {
  return path.resolve(path.join(__dirname, 'fixtures', 'fileLoader', name) + '.yaml');
};

describe('yaml-config-loader', function() {
  describe('mergeConfiguration', function() {
    it('should merge objects', function() {
      var loader = new Loader();
      var one = {
        a: 'b',
        c: 'd'
      };
      var two = {
        c: 'e',
        f: 'g'
      };
      var result = loader.mergeConifguration(one, two);
      result.a.should.equal('b');
      result.c.should.equal('e');
      result.f.should.equal('g');
    });
    it('should merge arrays', function() {
      var loader = new Loader();
      var one = [
        'a',
        'b'
      ];
      var two = [
        'c',
      ];
      var result = loader.mergeConifguration(one, two);
      result[0].should.equal('a');
      result[1].should.equal('b');
      result[2].should.equal('c');
    });
  });
});
 
