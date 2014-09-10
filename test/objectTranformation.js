var assert = require('assert');
var should = require('should');
var path = require('path');

var Loader = require('..');

describe('yaml-config-loader', function() {
  describe('translateKeys', function() {
    it('should translate keys based on the specified strategy', function(done) {
      var mockEnvVariables = {
        JEDI_MASTER: 'Obi Wan Kanobi',
        SITH_LORD: 'Darth Vader',
        PORT: 9000,
      };
      var keys = [ 'jediMaster', 'sithLord', 'port', 'unset' ];
      var loader = new Loader();
      var output = loader.translateKeys(mockEnvVariables, keys, function(error, config) {
        config.should.equal(output);
        config.jediMaster.should.equal(mockEnvVariables.JEDI_MASTER);
        config.sithLord.should.equal(mockEnvVariables.SITH_LORD);
        config.port.should.equal(9000);
        config.hasOwnProperty('unset').should.equal(false);
        should.not.exist(config.unset);
        done();
      });
    });
  });
  describe('translateKeyFormat', function() {
    it('should normalize camelCase, dashes, and underscores to a common output', function() {
      var object = {
        'someKeyInCamelCase': 'Value 1',
        'some_key_with_underscores': 'Value 2',
        'some-key-with-dashes': 'Value 3',
        'someOtherKeyWithCamelCase': 'Value 4',
        'someCrazy-key-With-All_3': 'Value 5',
      };
      var loader = new Loader()
      var camelCase = loader.translateKeyFormat(object, 'camelCase');
      var capitalUnderscores = loader.translateKeyFormat(object, 'CAPITAL_UNDERSCORES');
      var lowerDashes = loader.translateKeyFormat(object, 'lower-dashes');
      var camelCaseExpected = {
        someKeyInCamelCase: 'Value 1',
        someKeyWithUnderscores: 'Value 2',
        someKeyWithDashes: 'Value 3',
        someOtherKeyWithCamelCase: 'Value 4',
        someCrazyKeyWithAll3: 'Value 5' 
      };
      for (key in camelCaseExpected) {
       camelCase[key].should.equal(camelCaseExpected[key]);
      }
      var capitalUnderscoresExpected = {
        SOME_KEY_IN_CAMEL_CASE: 'Value 1',
        SOME_KEY_WITH_UNDERSCORES: 'Value 2',
        SOME_KEY_WITH_DASHES: 'Value 3',
        SOME_OTHER_KEY_WITH_CAMEL_CASE: 'Value 4',
        SOME_CRAZY_KEY_WITH_ALL_3: 'Value 5'
      };
      for (key in capitalUnderscoresExpected) {
       capitalUnderscores[key].should.equal(capitalUnderscoresExpected[key]);
      }
      var lowerDashesExpected = {
        'some-key-in-camel-case': 'Value 1',
        'some-key-with-underscores': 'Value 2',
        'some-key-with-dashes': 'Value 3',
        'some-other-key-with-camel-case': 'Value 4',
        'some-crazy-key-with-all-3': 'Value 5'
      };
      for (key in lowerDashesExpected) {
       lowerDashes[key].should.equal(lowerDashesExpected[key]);
      }
    });
  });
  describe('addObject', function() {
    it('should load configuration onto the ojbect', function(done) {
      var loader = new Loader()
        .addObject({ 'MostBadass': 'Darth Vader', 'LeastBadass':  'Luke Skywalker' })
        .addObject({ 'MostBadass': 'Bobba Fett', 'Funniest':  'R2D2' })
        .load(function(error, config) {
          should.not.exist(error);
          config.MostBadass.should.equal('Bobba Fett');
          config.LeastBadass.should.equal('Luke Skywalker');
          config.Funniest.should.equal('R2D2');
          done();
        });
    });
  });
  describe('addAndNormalizeObject', function() {
    it('should translate and extract environment arguments', function(done) {
      var loader = new Loader()
        .addFile(path.join(__dirname, 'fixtures', 'fileLoader', 'config1.yaml'))
        .addAndNormalizeObject({ 'FIRST_MATE': 'Rain Wilson', 'NAGGIEST_DROID': 'R3D5', 'FUNNIEST_DROID':  'R2D2' })
        .addAndNormalizeObject({naggiestDroid: 'C3PO'})
        .load(function(error, config) {
          should.not.exist(error);
          config.captain.should.equal('The Skipper');
          config.firstMate.should.equal('Rain Wilson');
          config.funniestDroid.should.equal('R2D2');
          config.naggiestDroid.should.equal('C3PO');
          done();
        });
    });
  });
});
 
