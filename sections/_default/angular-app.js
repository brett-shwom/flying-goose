/* jslint node: true */
'use strict';
var di = require('di');
var angular = require('angular');
require('angular-resource');
require('angular-route');
require('bootstrap');
require('angular-bootstrap');

var app = angular.module('scratchpad', [
    'ngRoute',
    'ui.bootstrap',
    'ngResource'
    ]);
app.config(function ($routeProvider) {
  $routeProvider.otherwise({redirectTo : '/view1'});
});

var uiModules = {
  angular   : [ 'value', angular ],
  app       : [ 'value', app ]
};
uiModules.uiModules = [ 'value', uiModules ];

var injector = new di.Injector([uiModules]);

/* modules browserify */
