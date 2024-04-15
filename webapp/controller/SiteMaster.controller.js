sap.ui.define([
        "sap/ui/core/mvc/Controller",
        "./BaseController",
        "sap/ui/core/Core",
        "sap/ui/core/routing/History",
        "sap/m/MessagePopover",
        "sap/m/MessageItem",
        "sap/ui/core/message/Message",
        "sap/ui/core/Element",
        "sap/m/MessageToast",
        "sitemaster/JScripts/jszip",
        "sitemaster/JScripts/xlsx"
    ],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, BaseController, Core, History, MessagePopover, MessageItem, Message, Element, MessageToast, jszip, xlsx) {
        "use strict";
        var that;
        var entityKeyFields = {};
        return BaseController.extend("sitemaster.controller.SiteMaster", {
            onInit: function () {
                var oToolPage = this.byId("toolPage");
                oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
                this.selectedKey = "institution";

                var oView = this.getView();
                this._oDataModel = this.getOwnerComponent().getModel();
                this._oDataModel.setDeferredGroups(this._oDataModel.getDeferredGroups().concat(["createChanges", "deleteChanges"]));
                var oUIModel = new sap.ui.model.json.JSONModel({
                    mode: "",
                    editable: true,
                    formEdit: false
                });
                this.getView().setModel(oUIModel, "uiModel");
                this._MessageManager = Core.getMessageManager();
                // Clear the old messages
                this._MessageManager.removeAllMessages();
                this._MessageManager.registerObject(oView, true);
                oView.setModel(this._MessageManager.getMessageModel(), "message");
                this.defineEntityKeyFields();
            },

            onItemSelect: function (oEvent) {
                var oItem = oEvent.getParameter("item");
                if (oItem.getKey() === 'toggle') {
                    this.onSideNavButtonPress();
                    this.getView().byId("idSideNav").setSelectedKey(this.selectedKey)

                } else {
                    this.selectedKey = oItem.getKey();
                    this.byId("pageContainer").to(this.getView().createId(oItem.getKey()));
                }
            },
            onSideNavButtonPress: function () {
                var oToolPage = this.byId("toolPage");
                var bSideExpanded = oToolPage.getSideExpanded();
                this._setToggleButtonTooltip(bSideExpanded);
                oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
            },


            _setToggleButtonTooltip: function (bLarge) {
                // var oToggleButton = this.byId('sideNavigationToggleButton');
                if (bLarge) {
                    this.getView().byId('MenuId').setIcon("sap-icon://open-command-field");
                    // oToggleButton.setTooltip('Expand');
                } else {
                    this.getView().byId('MenuId').setIcon("sap-icon://close-command-field");
                    // oToggleButton.setTooltip('Collapse');
                }
            },

            cancel: function (oEvent) {
                oEvent.getSource().getParent().getParent().close();
            },

            onAddPress: function (oEvent) {
                var oSmartTable = oEvent.getSource().getParent().getParent(),
                    oTable = oSmartTable.getTable(),
                    sId = oSmartTable.getId(),
                    oBindingContext = oEvent.getSource().getBindingContext(),
                    sPath = oBindingContext.getPath();
                var oContext = this._oDataModel.createEntry(sPath + "/" + oSmartTable.getTableBindingPath());
                var aCells = [],
                    aColumns = oSmartTable.getInitiallyVisibleFields().split(",");
                for (var i = 0; i < aColumns.length; i++) {
                    // if (aColumns[i] === "DocCollection") {
                    //     aCells.push(new sap.ui.comp.smartfield.SmartField({
                    //         value: "{" + aColumns[i] + "}",
                    //         configuration: new sap.ui.comp.smartfield.Configuration({
                    //             controlType: "checkBox"
                    //         })
                    //     }));
                    // } else {
                    aCells.push(new sap.ui.comp.smartfield.SmartField({
                        mandatory: true,
                        value: "{" + aColumns[i] + "}"
                    }));
                    // }
                }
                // if (oTable instanceof sap.m.Table) {
                var oItem = new sap.m.ColumnListItem({
                    cells: aCells
                });
                oItem.setBindingContext(oContext);
                oTable.insertItem(oItem, oTable.getItems().length);
            },
            DelRecord: function (oEvent) {
                var oItem = oEvent.getParameter("listItem"),
                    sPath = oItem.getBindingContextPath(),
                    oTable = oItem.getParent();
                this._oDataModel.remove(sPath, {
                    groupId: "deleteChanges"
                });
                oTable.removeItem(oItem);
                // oTable.getParent().setHeader(["Contacts", " (", oTable.getItems().length, ")"].join(""));
            },
            onAddinstitution: async function (oEvent) {
                this.smartTable = oEvent.getSource().getParent().getParent();
                this.editMode = true;
                this.getView().getModel('uiModel').setProperty('/formEdit', true);
                this.getView().getModel('uiModel').setProperty('/mode',"create");
                await this.openDialog('Institution', 'sitemaster.fragment.Dailog.Addinstitution');
                that = this;
                var dinstitution = this.mDialogs['Institution'];
                dinstitution.then(function (pDialog) {
                    debugger;
                    var oContext = that._oDataModel.createEntry("/INSTITUTIONMASTER");
                    pDialog.unbindObject()
                    pDialog.setBindingContext(oContext)

                })

            },
            institutionDetPress: async function (oEvent) {
                this.smartTable = oEvent.getSource().getParent();
                this.editMode = false;
                this.getView().getModel('uiModel').setProperty('/formEdit', false);
                this.getView().getModel('uiModel').setProperty('/mode',"display");
                await this.openDialog('Institution', 'sitemaster.fragment.Dailog.Addinstitution');
                var dinstitution = this.mDialogs['Institution'];
                that = this;
                var oView = this.getView();
                sap.ui.core.BusyIndicator.show(0);
                dinstitution.then(function (pDialog) {
                    debugger;
                    sap.ui.core.BusyIndicator.hide();
                    pDialog.unbindObject();
                    pDialog.bindElement({
                        path: `${oEvent.getParameter('listItem').getBindingContextPath()}`,
                        parameters: {
                            expand: "to_SMOContact,to_INSTContactD"
                        },
                        events: {
                            dataRequested: function (oEvent) {
                                oView.setBusy(true);
                            },
                            dataReceived: function (oEvent) {
                                oView.setBusy(false);
                            }.bind(this)
                        }
                    })

                    if (pDialog.getBindingContext()) {
                        pDialog.getBindingContext().getModel().refresh();
                    }
                })


            },

            onAdddocuments: async function (oEvent) {
                this.smartTable = oEvent.getSource().getParent().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', true);
                this.getView().getModel('uiModel').setProperty('/mode',"create");
                await this.openDialog('Document', 'sitemaster.fragment.Dailog.Adddocuments');
                that = this;
                var ddocument = this.mDialogs['Document'];
                ddocument.then(function (pDialog) {
                    debugger;
                    var oContext = that._oDataModel.createEntry("/DOCUMENTMASTER");
                    pDialog.unbindObject()
                    pDialog.setBindingContext(oContext)

                })

            },
            documentsDetPress: function (oEvent) {
                this.smartTable = oEvent.getSource().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', false);
                this.getView().getModel('uiModel').setProperty('/mode',"display");
                this.openDialog('Document', 'sitemaster.fragment.Dailog.Adddocuments');
                var ddocument = this.mDialogs['Document'];
                that = this;
                var oView = this.getView();
                sap.ui.core.BusyIndicator.show(0);
                ddocument.then(function (pDialog) {
                    debugger;
                    sap.ui.core.BusyIndicator.hide();
                    pDialog.bindElement({
                        path: `${oEvent.getParameter('listItem').getBindingContextPath()}`,
                        events: {
                            dataRequested: function (oEvent) {
                                oView.setBusy(true);
                            },
                            dataReceived: function (oEvent) {
                                oView.setBusy(false);
                            }.bind(this)
                        }
                    })
                })

            },
            onAddequipment: async function (oEvent) {
                this.smartTable = oEvent.getSource().getParent().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', true);
                this.getView().getModel('uiModel').setProperty('/mode',"create");
                await this.openDialog('Equipment', 'sitemaster.fragment.Dailog.Addequipment');
                that = this;
                var dequipment = this.mDialogs['Equipment'];
                dequipment.then(function (pDialog) {
                    debugger;
                    var oContext = that._oDataModel.createEntry("/EquipmentMaster");
                    pDialog.unbindObject()
                    pDialog.setBindingContext(oContext)

                })

            },
            equipmentDetPress: function (oEvent) {
                this.smartTable = oEvent.getSource().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', false);
                this.getView().getModel('uiModel').setProperty('/mode',"display");
                this.openDialog('Equipment', 'sitemaster.fragment.Dailog.Addequipment');
                var dequipment = this.mDialogs['Equipment'];
                that = this;
                var oView = this.getView();
                sap.ui.core.BusyIndicator.show(0);
                dequipment.then(function (pDialog) {
                    debugger;
                    sap.ui.core.BusyIndicator.hide();
                    pDialog.bindElement({
                        path: `${oEvent.getParameter('listItem').getBindingContextPath()}`,
                        events: {
                            dataRequested: function (oEvent) {
                                oView.setBusy(true);
                            },
                            dataReceived: function (oEvent) {
                                oView.setBusy(false);
                            }.bind(this)
                        }
                    })
                })

            },
            onAddICD: async function (oEvent) {
                this.smartTable = oEvent.getSource().getParent().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', true);
                this.getView().getModel('uiModel').setProperty('/mode',"create");
                await this.openDialog('ICD', 'sitemaster.fragment.Dailog.AddICD');
                that = this;
                var dICD = this.mDialogs['ICD'];
                dICD.then(function (pDialog) {
                    debugger;
                    var oContext = that._oDataModel.createEntry("/ICDMASTER");
                    pDialog.setBindingContext(oContext)
                    pDialog.unbindObject()

                })

            },
            ICDDetPress: function (oEvent) {
                this.smartTable = oEvent.getSource().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', false);
                this.getView().getModel('uiModel').setProperty('/mode',"display");
                this.openDialog('ICD', 'sitemaster.fragment.Dailog.AddICD');
                var dICD = this.mDialogs['ICD'];
                that = this;
                var oView = this.getView();
                sap.ui.core.BusyIndicator.show(0);
                dICD.then(function (pDialog) {
                    debugger;
                    sap.ui.core.BusyIndicator.hide();
                    pDialog.bindElement({
                        path: `${oEvent.getParameter('listItem').getBindingContextPath()}`,
                        events: {
                            dataRequested: function (oEvent) {
                                oView.setBusy(true);
                            },
                            dataReceived: function (oEvent) {
                                oView.setBusy(false);
                            }.bind(this)
                        }
                    })
                })

            },

            onAddServices: async function (oEvent) {
                this.smartTable = oEvent.getSource().getParent().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', true);
                this.getView().getModel('uiModel').setProperty('/mode',"create");
                await this.openDialog('Services', 'sitemaster.fragment.Dailog.Addservices');
                that = this;
                var dservices = this.mDialogs['Services'];
                dservices.then(function (pDialog) {
                    debugger;
                    var oContext = that._oDataModel.createEntry("/SERVICEMASTER");
                    pDialog.unbindObject()
                    pDialog.setBindingContext(oContext)

                })

            },
            servicesDetPress: function (oEvent) {
                this.smartTable = oEvent.getSource().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', false);
                this.getView().getModel('uiModel').setProperty('/mode',"display");
                this.openDialog('Services', 'sitemaster.fragment.Dailog.Addservices');
                var dservices = this.mDialogs['Services'];
                that = this;
                var oView = this.getView();
                sap.ui.core.BusyIndicator.show(0);
                dservices.then(function (pDialog) {
                    debugger;
                    sap.ui.core.BusyIndicator.hide();
                    pDialog.bindElement({
                        path: `${oEvent.getParameter('listItem').getBindingContextPath()}`,
                        events: {
                            dataRequested: function (oEvent) {
                                oView.setBusy(true);
                            },
                            dataReceived: function (oEvent) {
                                oView.setBusy(false);
                            }.bind(this)
                        }
                    })
                })

            },
            onAddSites: async function (oEvent) {
                this.editMode = true;
                this.smartTable = oEvent.getSource().getParent().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', true);
                this.getView().getModel('uiModel').setProperty('/mode',"create");
                await this.openDialog('Sites', 'sitemaster.fragment.Dailog.Addsites');
                that = this;
                var dsites = this.mDialogs['Sites'];
                dsites.then(function (pDialog) {
                    debugger;
                    var oContext = that._oDataModel.createEntry("/SITEMASTER");
                    pDialog.unbindObject()
                    pDialog.setBindingContext(oContext)

                })

            },
            sitesDetPress: function (oEvent) {
                this.editMode = false;
                this.smartTable = oEvent.getSource().getParent();
                this.getView().getModel('uiModel').setProperty('/formEdit', false);
                this.getView().getModel('uiModel').setProperty('/mode',"display");
                this.openDialog('Sites', 'sitemaster.fragment.Dailog.Addsites');
                var dsites = this.mDialogs['Sites'];
                that = this;
                var oView = this.getView();
                sap.ui.core.BusyIndicator.show(0);
                dsites.then(function (pDialog) {
                    debugger;
                    sap.ui.core.BusyIndicator.hide();
                    pDialog.unbindObject();
                    pDialog.bindElement({
                        path: `${oEvent.getParameter('listItem').getBindingContextPath()}`,
                        parameters: {
                            expand: "to_SITESMOD,to_SITECONTD"
                        },
                        events: {
                            dataRequested: function (oEvent) {
                                oView.setBusy(true);
                            },
                            dataReceived: function (oEvent) {
                                oView.setBusy(false);
                            }.bind(this)
                        }
                    })
                    if (pDialog.getBindingContext()) {
                        pDialog.getBindingContext().getModel().refresh();
                    }
                })

            },

            cancel: function (oEvent) {
                oEvent.getSource().getParent().getParent().close();
                this._oDataModel.resetChanges();
            },

            savedocumnets: function (oEvent) {
                this.saveEntity(`/DOCUMENTMASTER`, this._oDataModel, oEvent);
            },

            saveequipment: function (oEvent) {
                this.saveEntity(`/EquipmentMaster`, this._oDataModel, oEvent);
            },
            saveICD: function (oEvent) {
                this.saveEntity(`/ICDMASTER`, this._oDataModel, oEvent);
            },
            saveinstitution: function (oEvent) {
                this.saveEntity(`/INSTITUTIONMASTER`, this._oDataModel, oEvent);
            },
            saveservices: function (oEvent) {
                this.saveEntity(`/SERVICEMASTER`, this._oDataModel, oEvent);
            },
            savesites: function (oEvent) {
                this.saveEntity(`/SITEMASTER`, this._oDataModel, oEvent);
            },

            onDeleteTableRow: function (oEvent) {
                debugger;
                this.Event = oEvent;
                this.openDialog("messages", "sitemaster.fragment.Dailog.Messages");
                // sap.ui.core.BusyIndicator.show(0);
                // this._oDataModel.remove(oEvent.getParameter('listItem').getBindingContextPath(), {
                //     success: function (oData) {
                //         sap.ui.core.BusyIndicator.hide();
                //         alert('S');
                //     }.bind(this),
                //     error: function (oEvent) {
                //         alert('E');
                //     }
                // });
            },

            confirmDelete: function (oEvent) {
                oEvent.getSource().getParent().getParent().setBusy(true);

                sap.ui.core.BusyIndicator.show(0);
                this._oDataModel.remove(this.Event.getParameter('listItem').getBindingContextPath(), {
                    success: jQuery.proxy(this._handleSuccess(), this, oEvent),
                    error: function (oEvent) {
                        alert('E');
                    }
                });



                // this.getOwnerComponent().getModel().remove(this.Event.getParameter('listItem').getBindingContextPath(), {
                //     success: jQuery.proxy(this._handleSuccess(), this, oEvent),
                //     error: (oData) => {
                //         oEvent.getSource().getParent().getParent().setBusy(true);
                //         // this.getView().setBusy(false);
                //     }
                // });

            },
            _handleSuccess: function (oData) {
                this.Event.getSource().getBinding('items').filter()
                var dialog = this.mDialogs['messages'];
                dialog.then(function (pDialog) {
                    pDialog.setBusy(false);
                    pDialog.close();
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Deleted Successfully!")
                });
            },
            onUpload: function (e) {
                this.smartTable = e.getSource().getParent().getParent();
                this.excelEntity = e.getSource().getParent().getParent().getProperty("entitySet");
                this._import(e.getParameter("files") && e.getParameter("files")[0]);

            },

            _import: function (file) {
                var that = this;
                var excelData = {};
                if (file && window.FileReader) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var data = e.target.result;
                        var workbook = XLSX.read(data, {
                            type: 'binary'
                        });
                        var oDataModel = that._oDataModel;
                        var sheetName = workbook.SheetNames[0];
                        excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                        excelData.forEach(ele => {
                            var json = JSON.parse(JSON.stringify(ele));
                            oDataModel.create(`/${that.excelEntity}`, json, {
                                groupId: "createChanges"
                            });
                            // workbook.SheetNames.forEach(function (sheetName) {
                            //     // Here is your object for every sheet in workbook
                            //     excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                            //     excelData.forEach(ele => {
                            //         var json = JSON.parse(JSON.stringify(ele));
                            //         oDataModel.create(`/${that.excelEntity}`, json, {
                            //             groupId: "createChanges"
                            //         });
                            //     });
                            that.oDataSubmitChanges(oDataModel);
                        });
                    };
                    reader.onerror = function (ex) {
                        console.log(ex);
                    };
                    reader.readAsBinaryString(file);
                }
            }

        });
    });