sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/UIComponent",
    'sap/ui/core/Core',
    'sap/ui/core/message/Message',
    'sap/ui/core/library',
    "sap/m/MessageToast",
], function (Controller, History, UIComponent, Core, Message, coreLibrary, MessageToast) {

    "use strict";
    var MessageType = coreLibrary.MessageType;
    var that;
    return Controller.extend("sitemaster.controller.BaseController", {
        declareModel: function (modelName) {
            this.getView().setModel(new sap.ui.model.json.JSONModel({}), modelName);

        },
        refreshModel: function (model) {
            this.getView().getModel(model).refresh();
        },

        openDialog: function (name, path) {
            var sname = name;
            this.mDialogs = this.mDialogs || {};
            var oDialog = this.mDialogs[sname];
            if (!oDialog) {
                oDialog = this.loadFragment({
                    name: path,
                    type: "XML",
                    controller: this

                });
                this.mDialogs[sname] = oDialog;
            }
            that = this;
            oDialog.then(function (pDialog) {
                that.getView().addDependent(pDialog);
                pDialog.open();

            });
        },
        handleError: function (odata) {
            this.getView().setBusy(false)
            sap.m.MessageBox.error(!odata.responseText.includes("<?xml") ? JSON.parse(odata.responseText).error.message.value : odata.responseText);
        },

        saveEntity: function (Entity, oDataModel, oEvent) {

            var oPendingChanges = oDataModel.getPendingChanges();
            var aKeys = Object.keys(oPendingChanges);
            //  this.mEvent=oEvent;
            var object = {}
            Object.assign(object, oPendingChanges[aKeys[0]])
            // oDataModel.create(Entity, object, {
            //     groupId: "createChanges"
            // });
            // oDataModel.resetChanges();

            oDataModel.submitChanges({
                success: function (oData) {
                    var oRepsonse = (oData.__batchResponses.length === 1) && oData.__batchResponses[0].response ? oData.__batchResponses[0].response : oData.__batchResponses[0].__changeResponses[0];
                    if (oRepsonse.statusCode < "300") {
                        if (oRepsonse.statusText === "Created") {
                            MessageToast.show("Created successfully");
                        } else {
                            MessageToast.show("Updated successfully");
                        }
                        this.smartTable.rebindTable();
                        oEvent.getSource().getParent().getParent().close()
                        // this.getView().getModel("uiModel").setData({
                        //     mode: "display",
                        //     editable: false
                        // }, true);
                    }
                }.bind(this),
                error: function (oError) {
                    sap.m.MessageBox.error(!odata.responseText.includes("<?xml") ? JSON.parse(odata.responseText).error.message.value : odata.responseText);
                }
            });

        }


    });
});