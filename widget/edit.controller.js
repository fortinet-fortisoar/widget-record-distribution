/* Copyright start
  MIT License
  Copyright (c) 2026 Fortinet Inc
  Copyright end */
  
'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('editRecordDistribution106Ctrl', editRecordDistribution106Ctrl);

  editRecordDistribution106Ctrl.$inject = ['$scope', '$uibModalInstance', 'config', 'appModulesService', '$state', 'Entity', 'FormEntityService', 'widgetUtilityService'];

  function editRecordDistribution106Ctrl($scope, $uibModalInstance, config, appModulesService, $state, Entity, FormEntityService, widgetUtilityService) {
    $scope.cancel = cancel;
    $scope.save = save;
    $scope.page = $state.params.page;
    $scope.loadAttributes = loadAttributes;
    $scope.updatePicklistItems = updatePicklistItems;
    $scope.isDetailView = $state.current.name && ($state.current.name.indexOf('viewPanel') !== -1);

    $scope.config = angular.extend({
      query: {
        filters: [],
        limit: 100
      },
      mapping: {
        assignedToPerson: undefined
      },
      assignedToSetting: 'onlyMe',
      aggregate: true
    }, config);

    _init();

    $scope.$watch('config.resource', function (oldValue, newValue) {
      if ($scope.config.resource && oldValue !== newValue) {
        delete $scope.config.query.filters;
        $scope.loadAttributes();
      }
    });

    if ($scope.config.resource) {
      $scope.loadAttributes();
    }

    function _handleTranslations() {
      let widgetNameVersion = widgetUtilityService.getWidgetNameVersion($scope.$resolve.widget, $scope.$resolve.widgetBasePath);
      
      if (widgetNameVersion) {
        widgetUtilityService.checkTranslationMode(widgetNameVersion).then(function () {
          $scope.viewWidgetVars = {
            // Create your translating static string variables here
            'BTN_CLOSE': widgetUtilityService.translate('recordDistribution.BTN_CLOSE'),
            'BTN_SAVE': widgetUtilityService.translate('recordDistribution.BTN_SAVE'),
            'CHK_BOX_SHOW_CO_REL_EDGES': widgetUtilityService.translate('recordDistribution.CHK_BOX_SHOW_CO_REL_EDGES'),
            'DATA_SOURCE_LABEL': widgetUtilityService.translate('recordDistribution.DATA_SOURCE_LABEL'),
            'HEADER_REC_DIS_EDIT_VIEW': widgetUtilityService.translate('recordDistribution.HEADER_REC_DIS_EDIT_VIEW'),
            'LABEL_ASSIGNMENT_FIELD': widgetUtilityService.translate('recordDistribution.LABEL_ASSIGNMENT_FIELD'),
            'LABEL_FILTER_CRITERIA': widgetUtilityService.translate('recordDistribution.LABEL_FILTER_CRITERIA'),
            'LABEL_ICON_RECORD_VIEW': widgetUtilityService.translate('recordDistribution.LABEL_ICON_RECORD_VIEW'),
            'LABEL_PICKLIST': widgetUtilityService.translate('recordDistribution.LABEL_PICKLIST'),
            'LABEL_PICKLIST_ITEMS': widgetUtilityService.translate('recordDistribution.LABEL_PICKLIST_ITEMS'),
            'LABEL_REC_ASGMT': widgetUtilityService.translate('recordDistribution.LABEL_REC_ASGMT'),
            'LABEL_TITLE': widgetUtilityService.translate('recordDistribution.LABEL_TITLE'),
            'LABEL_TITLE_RECORD_VIEW': widgetUtilityService.translate('recordDistribution.LABEL_TITLE_RECORD_VIEW'),
            'OPTION_ALL': widgetUtilityService.translate('recordDistribution.OPTION_ALL'),
            'OPTION_ONLY_ME': widgetUtilityService.translate('recordDistribution.OPTION_ONLY_ME'),
            'PLACEHOLDER_SELECT_MODULE': widgetUtilityService.translate('recordDistribution.PLACEHOLDER_SELECT_MODULE'),
            'RELATED_DATA_SOURCE_LABEL': widgetUtilityService.translate('recordDistribution.RELATED_DATA_SOURCE_LABEL'),
            'SELECT_AN_OPTION': widgetUtilityService.translate('recordDistribution.SELECT_AN_OPTION'),
            'SELECT_FIELD': widgetUtilityService.translate('recordDistribution.SELECT_FIELD'),
            'TOOLTIP_ICON_RECORD_VIEW': widgetUtilityService.translate('recordDistribution.TOOLTIP_ICON_RECORD_VIEW'),
            'TOOLTIP_PICKLIST': widgetUtilityService.translate('recordDistribution.TOOLTIP_PICKLIST'),
            'TOOLTIP_PICKLIST_ITEMS': widgetUtilityService.translate('recordDistribution.TOOLTIP_PICKLIST_ITEMS'),
            'TOOLTIP_SOURCE_LABEL': widgetUtilityService.translate('recordDistribution.TOOLTIP_SOURCE_LABEL'),
            'TOOLTIP_SHOW_CO_REL_EDGES': widgetUtilityService.translate('recordDistribution.TOOLTIP_SHOW_CO_REL_EDGES'),
            'TOOLTIP_TITLE_RECORD_VIEW': widgetUtilityService.translate('recordDistribution.TOOLTIP_TITLE_RECORD_VIEW')
          };
          $scope.sourceLabel = $scope.isDetailView ? $scope.viewWidgetVars.RELATED_DATA_SOURCE_LABEL : $scope.viewWidgetVars.DATA_SOURCE_LABEL;
        });
      } else {
        $timeout(function() {
          $scope.cancel();
        });
      }
    }

    /*
     * The purpose of this initialize method is to create module list for populate
     * on configuration screen.
     * For Dashboard or Reports, all modules are listed for selection.
     * For View panel, only related modules of selected records are listed.
     */
    function _init() {
      // To handle backward compatibility for widget
      _handleTranslations();
      appModulesService.load(true).then(function (modules) {
        if ($scope.isDetailView) {
          var viewPanelEntity = FormEntityService.get();
          var relationshipModules = angular.isDefined(viewPanelEntity) ? viewPanelEntity.getRelationshipFieldsArray() : [];
          var list = [];
          if (angular.isDefined(relationshipModules)) {
            angular.forEach(relationshipModules, function (module) {
              list.push(module.name);
            });
            $scope.modules = _.filter(modules, function (module) {
              return list.includes(module.type);
            });
          }
        } else {
          $scope.modules = modules;
        }
      });
    }

    /*
     * This method loads all initial attributes and lists.
     */
    function loadAttributes() {
      $scope.pickListFields = [];
      $scope.iconFields = [];
      var entity = new Entity($scope.config.resource);
      entity.loadFields().then(function () {
        $scope.fieldsArray = entity.getFormFieldsArray();
        $scope.pickListFields = _.filter($scope.fieldsArray, function (field) {
          return field.type === 'picklist' && field.options;
        });
        $scope.iconFields = _.filter($scope.fieldsArray, function (field) {
          return field.type === 'lookup';
        });
        $scope.userField = _.filter($scope.fieldsArray, function (field) {
          return field.type !== 'manyToMany' && field.model === 'people';
        });
        if ($scope.config.pickListField) {
          getPicklistItems();
        }
        $scope.titleFields = _.filter($scope.fieldsArray, function (field) {
          return field.type === 'text';
        });
        $scope.fields = entity.getFormFields();
        angular.extend($scope.fields, entity.getRelationshipFields());
      });
    }

    /*
     * The purpose of method is to update picklist items on picklist selection change.
     */
    function updatePicklistItems() {
      $scope.config.pickListFieldItems = undefined;
      getPicklistItems();
      $scope.config.pickListFieldItems = $scope.pickListFieldItems;
    }

    /*
     * This method fetch picklist items as per picklist selection.
     */
    function getPicklistItems() {
      $scope.pickListFieldItems = [];
      if ($scope.pickListFields.length > 0 && $scope.config.pickListField) {
        for (var key in $scope.pickListFields) {
          if ($scope.config.pickListField === $scope.pickListFields[key].name) {
            $scope.pickListFieldItems = $scope.pickListFields[key].options;
            break;
          }
        }
      }
    }

    function cancel() {
      $uibModalInstance.dismiss('cancel');
    }

    function save() {
      if ($scope.editRecordDistributionForm.$invalid) {
        $scope.editRecordDistributionForm.$setTouched();
        $scope.editRecordDistributionForm.$focusOnFirstError();
        return;
      }
      $uibModalInstance.close($scope.config);
    }
  }
})();
