sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/UIComponent",
    'sap/ui/core/Core',
    'sap/ui/core/message/Message',
    'sap/ui/core/library',
    "sap/m/MessageToast",
    'sap/ui/model/Filter',
    "sap/m/MessagePopover",
    "sap/m/MessageItem",

], function (Controller, History, UIComponent, Core, Message, coreLibrary, MessageToast, Filter, MessagePopover, MessageItem) {

    "use strict";
    var MessageType = coreLibrary.MessageType;
    var that;
    var entityKeyFields = {};
    return Controller.extend("sitemaster.controller.BaseController", {
            declareModel: function (modelName) {
            this.getView().setModel(new sap.ui.model.json.JSONModel({}), modelName);
        },
        refreshModel: function (model) {
            this.getView().getModel(model).refresh();
        },
        defineEntityKeyFields: function () {
            entityKeyFields[`${this.getView().byId('idDocument').getEntitySet()}`] = ["docname","Category","SiteCode"];
            entityKeyFields[`${this.getView().byId('idEquipment').getEntitySet()}`] = ["EquipmentTypeID"];
            entityKeyFields[`${this.getView().byId('idICD').getEntitySet()}`] = ["Sitecode","Level4"];
            entityKeyFields[`${this.getView().byId('idInstitution').getEntitySet()}`] = ["InstitutionCode"];
            entityKeyFields[`${this.getView().byId('idServices').getEntitySet()}`] = ["ServiceCode","Sitecode"];
            entityKeyFields[`${this.getView().byId('idSites').getEntitySet()}`] = ["SiteCode"];
        },
        ValidateEntityData: async function (filtersFields, entity, object) {
            // `'${field}'`, 'EQ', '${object['${field}']}'
            if (filtersFields && filtersFields.length) {
                var filters = []
                filtersFields.forEach(ele => {

                    var filter = new Filter({
                        path: `${ele}`,
                        operator: 'EQ',
                        value1: object[ele]
                    })

                    filters.push(filter)

                })

                await this.getOwnerComponent().getModel().read(`/${entity}`, {
                    filters: filters,
                    success: (oData) => {
                        // debugger;
                        if (oData.results.length !== 0) {
                            MessageToast.show('An entry already exist with the same code');
                        } else {
                            this.oDataSubmitChanges(this._oDataModel, this.oEvent);
                        }
                    },
                    error: (oData) => {
                        debugger;
                        sap.m.MessageBox.error(JSON.parse(oData.responseText).error.message.value)
                    }
                })
            } else {
                this.oDataSubmitChanges(this._oDataModel, this.oEvent);
            }

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

        
        _validateStudyInfo: function () {
            var aPromises = [];
            // var oViewObject = this.getView().getBindingContext().getObject();
            var formId = this.oEvent.getSource().getParent().getParent().getContent()[0].sId.replace(`${this.getView().sId}--`,"");
            
            
            
            this.byId(formId).getGroups().forEach(oGroup => {
                oGroup.getGroupElements().forEach(oElement => {
                    aPromises.push(oElement.getElements()[0].checkValuesValidity());
                });
            });
            return Promise.all(aPromises).then(aResults => {
                return aResults
            });

        },
       

        saveEntity: async function (Entity, oDataModel, oEvent) {

            this.oEvent = oEvent
            var oPendingChanges = oDataModel.getPendingChanges();
            var aKeys = Object.keys(oPendingChanges);
            //  this.mEvent=oEvent;
            var object = {}
            var validations = await this._validateStudyInfo();

            debugger;

            var InsSiteEntity = "";
            for (var i = 0; i < aKeys.length; i++) {
                delete oPendingChanges[aKeys[i]].__metadata;
                switch (true) {
                    case aKeys[i].startsWith("INSTITUTIONMASTER"):
                        Object.assign(object, oPendingChanges[aKeys[i]]);
                        InsSiteEntity = "/INSTITUTIONMASTER"
                        break;
                    case aKeys[i].startsWith("SMOContacts"):
                        if (!object.to_SMOContact) {
                            object["to_SMOContact"] = [];
                        }
                        object.to_SMOContact.push(oPendingChanges[aKeys[i]]);
                        break;
                    case aKeys[i].startsWith("INSTCD"):
                        if (!object.to_INSTContactD) {
                            object["to_INSTContactD"] = [];
                        }
                        object.to_INSTContactD.push(oPendingChanges[aKeys[i]]);
                        break;
                    case aKeys[i].startsWith("SITEMASTER"):
                        Object.assign(object, oPendingChanges[aKeys[i]]);
                        InsSiteEntity = "/SITEMASTER"
                        break;
                    case aKeys[i].startsWith("SiteContactD"):
                        if (!object.to_SITECONTD) {
                            object["to_SITECONTD"] = [];
                        }
                        object.to_SITECONTD.push(oPendingChanges[aKeys[i]]);
                        break;
                    case aKeys[i].startsWith("SiteSMOContacts"):
                        if (!object.to_SITESMOD) {
                            object["to_SITESMOD"] = [];
                        }
                        object.to_SITESMOD.push(oPendingChanges[aKeys[i]]);
                        break;
                    default:
                        Object.assign(object, oPendingChanges[aKeys[i]]);
                        break;
                }
            }


            if (InsSiteEntity.length > 0 && this.editMode) {
                oDataModel.create(InsSiteEntity, object, {
                    groupId: "createChanges"
                });
                oDataModel.resetChanges();
            }

            var RPresent = await this.ValidateEntityData(entityKeyFields[this.smartTable.getEntitySet()], this.smartTable.getEntitySet(), object)
            // oDataModel.create(Entity, object, {
            //     groupId: "createChanges"
            // });
            // oDataModel.resetChanges();

            // this.oDataSubmitChanges(oDataModel, oEvent);
        },
        oDataSubmitChanges: function (oDataModel, oEvent) {
            debugger;
            oDataModel.submitChanges({
                success: function (oData) {
                    var oRepsonse = Object.entries(oData).length && oData.__batchResponses[0].response ? oData.__batchResponses[0].response : oData.__batchResponses[0].__changeResponses[0];
                    if (oRepsonse.statusCode < "300") {
                        if (oRepsonse.statusText === "Created") {
                            MessageToast.show("Created successfully");
                        } else {
                            MessageToast.show("Updated successfully");
                        }
                        this.smartTable.rebindTable();
                        oEvent && oEvent.getSource().getParent().getParent().close();
                        // this.getView().getModel("uiModel").setData({
                        //     mode: "display",
                        //     editable: false
                        // }, true);
                    } else {
                        sap.m.MessageBox.error(JSON.parse(oRepsonse.body).error.message.value);
                    }
                }.bind(this),
                error: function (oError) {
                    sap.m.MessageBox.error(JSON.parse(oError.responseText).error.message.value);
                }
            });
        },
        toggleEdit: function (oEvent) {
            var mode = this.getView().getModel('uiModel').getProperty('/mode')
            this.getView().getModel('uiModel').setProperty('/formEdit', !this.getView().getModel('uiModel').getProperty('/formEdit'));
            this.getView().getModel('uiModel').setProperty('/mode', mode === 'display' ? "edit" : "display");
        },

        buttonIconFormatter: function () {
            debugger;
            var sIcon;
            var aMessages = this._MessageManager.getMessageModel().oData;

            aMessages.forEach(function (sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sIcon = "sap-icon://error";
                        break;
                    case "Warning":
                        sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
                        break;
                    case "Success":
                        sIcon = sIcon !== "sap-icon://error" && sIcon !== "sap-icon://alert" ? "sap-icon://sys-enter-2" : sIcon;
                        break;
                    default:
                        sIcon = !sIcon ? "sap-icon://information" : sIcon;
                        break;
                }
            });

            return sIcon;
        },
        buttonTypeFormatter: function () {
            var sHighestSeverity;
            var aMessages = this._MessageManager.getMessageModel().oData;
            aMessages.forEach(function (sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sHighestSeverity = "Negative";
                        break;
                    case "Warning":
                        sHighestSeverity = sHighestSeverity !== "Negative" ? "Critical" : sHighestSeverity;
                        break;
                    case "Success":
                        sHighestSeverity = sHighestSeverity !== "Negative" && sHighestSeverity !== "Critical" ? "Success" : sHighestSeverity;
                        break;
                    default:
                        sHighestSeverity = !sHighestSeverity ? "Neutral" : sHighestSeverity;
                        break;
                }
            });

            return sHighestSeverity;
        },
        buttonIconFormatter: function () {
            var sIcon;
            var aMessages = this._MessageManager.getMessageModel().oData;

            aMessages.forEach(function (sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sIcon = "sap-icon://error";
                        break;
                    case "Warning":
                        sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
                        break;
                    case "Success":
                        sIcon = sIcon !== "sap-icon://error" && sIcon !== "sap-icon://alert" ? "sap-icon://sys-enter-2" : sIcon;
                        break;
                    default:
                        sIcon = !sIcon ? "sap-icon://information" : sIcon;
                        break;
                }
            });

            return sIcon;
        },

        highestSeverityMessages: function () {
            var sHighestSeverityIconType = this.buttonTypeFormatter();
            var sHighestSeverityMessageType;

            switch (sHighestSeverityIconType) {
                case "Negative":
                    sHighestSeverityMessageType = "Error";
                    break;
                case "Critical":
                    sHighestSeverityMessageType = "Warning";
                    break;
                case "Success":
                    sHighestSeverityMessageType = "Success";
                    break;
                default:
                    sHighestSeverityMessageType = !sHighestSeverityMessageType ? "Information" : sHighestSeverityMessageType;
                    break;
            }

            return this._MessageManager.getMessageModel().oData.reduce(function (iNumberOfMessages, oMessageItem) {
                return oMessageItem.type === sHighestSeverityMessageType ? ++iNumberOfMessages : iNumberOfMessages;
            }, 0) || "";
        },

        handleMessagePopoverPress: function (oEvent) {
            if (!this._oMP) {
                this._oMP = new MessagePopover({
                    activeTitlePress: function (oEvent) {
                        var oItem = oEvent.getParameter("item"),
                            oMessage = oItem.getBindingContext("message").getObject(),
                            oControl = Element.registry.get(oMessage.getControlId());

                        if (oControl) {
                            if (oControl.isFocusable()) {
                                oControl.focus();
                            }
                        }
                    },
                    items: {
                        path: "message>/",
                        template: new MessageItem({
                            title: "{message>message}",
                            subtitle: "{message>additionalText}",
                            // groupName: { parts: [{ path: 'message>controlIds' }], formatter: this.getGroupName },
                            activeTitle: true,
                            type: "{message>type}",
                            description: "{message>message}"
                        })
                    },
                    groupItems: true
                });
                // this.getView().byId("idMessagePopoverBtn").addDependent(this._oMP);
                oEvent.getSource().addDependent(this._oMP);
            }
            this._oMP.toggle(oEvent.getSource());
        },

    });
});