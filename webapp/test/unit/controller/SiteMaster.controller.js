/*global QUnit*/

sap.ui.define([
	"sitemaster/controller/SiteMaster.controller"
], function (Controller) {
	"use strict";

	QUnit.module("SiteMaster Controller");

	QUnit.test("I should test the SiteMaster controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
