/* Copyright start
  MIT License
  Copyright (c) 2026 Fortinet Inc
  Copyright end */
  
'use strict';

(function () {
  angular
    .module('cybersponse')
    .factory('recordDistributionService', recordDistributionService);

  recordDistributionService.$inject = ['_', '$q', '$interpolate', 'fileService'];

  function recordDistributionService(_, $q, $interpolate, fileService) {
    var service = {
      getChartData: getChartData,
    };
    return service;

    /*
     * This method fetch icon file data and creates mapping.
     */
    function getIconFile(iri, id, mimeType) {
      var defer = $q.defer();
      fileService.getImageFile(id, mimeType).then(function (response) {
        var config = {};
        response.reader.readAsDataURL(response.blob);
        response.reader.onloadend = function () {
          config[iri] = response.reader.result;
          defer.resolve(config);
        };
      }, function (error) {
        defer.reject(error);
      });
      return defer.promise;
    }

    /*
     * This method creates map of picklist id and item value.
     */
    function _getPicklistMap(pickListFieldItems) {
      var itemValues = {};
      angular.forEach(pickListFieldItems, function (picklistField) {
        itemValues[picklistField['@id']] = picklistField.itemValue;
      });
      return itemValues;
    }

    /*
     * This method is responsible for forming chart data for rendering.
     *
     */
    function getChartData(entity, config, records, recordCollection) {
      var chartData = { 'data': [], 'edges': [] };
      var defer = $q.defer();
      if (config.pickListField && (config.pickListFieldItems && config.pickListFieldItems.length > 0) && records.length > 0) {
        let picklistMap = _getPicklistMap(config.pickListFieldItems);
        let iconMap = {};
        var promises = [];
        recordCollection.forEach(function (record) {
          if (record.icon) {
            var promise = getIconFile(record['@id'], record.icon.id, record.icon.mimeType);
            promises.push(promise);
          }
        });
        $q.all(promises).then(function (response) {
          iconMap = response.reduce(((r, c) => Object.assign(r, c)), {});
          // Form initial list of pick list items and color
          angular.forEach(config.pickListFieldItems, function (fieldItem) {
            var chartItem = {};
            chartItem.itemValue = fieldItem.itemValue;
            if (fieldItem.color) {
              chartItem.color = fieldItem.color;
            }
            chartItem.json = [];
            // Insert records data as per items
            var itemRecords = _.filter(records, function (record) {
              return record[config.pickListField] && picklistMap[record[config.pickListField]] ? picklistMap[record[config.pickListField]] === fieldItem.itemValue : false;
            });
            // Get picklist details
            if (itemRecords.length > 0) {
              chartItem.picklist = itemRecords[0][config.pickListField];
            }
            angular.forEach(itemRecords, function (itemRecord) {
              var recordJson = {};
              recordJson.name = $interpolate(entity.displayTemplate)(itemRecord);
              if (config.titleField) {
                recordJson.name = $interpolate('{{ ' + config.titleField + ' }}')(itemRecord);
              }
              recordJson.id = itemRecord.id;
              recordJson.uuid = itemRecord.uuid;
              recordJson.image = itemRecord[config.iconField] && iconMap[itemRecord[config.iconField]] ? iconMap[itemRecord[config.iconField]] : null;
              chartItem.json.push(recordJson);

              // Handling for Edge Data
              if (itemRecord[config.resource] && itemRecord[config.resource].length > 0) {
                angular.forEach(itemRecord[config.resource], function (relation) {
                  var edge = {};
                  edge.from = itemRecord.uuid;
                  edge.to = relation.split('/')[4];
                  edge.id = edge.from + '-' + edge.to;
                  if (!chartData.edges.some(item => item.id === edge.to + '-' + edge.from)) {
                    chartData.edges.push(edge);
                  }
                });
              }
            });
            if (chartItem.json.length > 0) {
              chartData.data.push(chartItem);
            }
          });
          defer.resolve(chartData);
        }, function (error) {
          defer.resolve(chartData);
        });
      } else {
        defer.resolve(chartData);
      }
      return defer.promise;
    }
  }
})();