/* Copyright start
  MIT License
  Copyright (c) 2026 Fortinet Inc
  Copyright end */

'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('recordDistribution106Ctrl', recordDistribution106Ctrl);

  recordDistribution106Ctrl.$inject = ['$scope', '$rootScope', 'config', '$state', '_', 'Entity', 'localStorageService', 'Query', 'API', '$resource', 'recordDistributionService', 'ViewTemplateService', 'appModulesService', '$interpolate', 'CommonUtils', 'Modules', 'widgetUtilityService', 'versionService', 'compressionService'];

  function recordDistribution106Ctrl($scope, $rootScope, config, $state, _, Entity, localStorageService, Query, API, $resource, recordDistributionService, ViewTemplateService, appModulesService, $interpolate, CommonUtils, Modules, widgetUtilityService, versionService, compressionService) {
    var entity = null;
    var chartData = { 'data': [], 'edges': [] };
    var _config = angular.copy(config);
    $scope.processing = false;
    $scope.assignedFieldName = '';
    $scope.filterByAssignedToPerson = false;
    config.assignedToSetting = config.assignedToSetting || 'onlyMe';
    $scope.filterByMe = config.assignedToSetting === 'onlyMe';
    if ($state.params) {
      $scope.page = $state.params.page;
    }

    function _handleTranslations() {
      widgetUtilityService.checkTranslationMode($scope.$parent.model.type).then(function () {
        $scope.viewWidgetVars = {
          // Create your translating static string variables here
          'TXT_NO_RECS_FOUND': widgetUtilityService.translate('recordDistribution.TXT_NO_RECS_FOUND'),
          'TXT_VIEW_ALL_RECS': widgetUtilityService.translate('recordDistribution.TXT_VIEW_ALL_RECS')
        };
      });
    }

    /*
     * This method initialize required attributes, retrives icon field lookup modules.
     */
    function _init() {
      // To handle backward compatibility for widget
      _handleTranslations();

      if (entity) {
        var assignedToPerson = config.mapping.assignedToPerson;
        if (!angular.isUndefined(assignedToPerson) && !angular.isUndefined(entity.fields[assignedToPerson])) {
          $scope.filterByAssignedToPerson = true;
          $scope.assignedFieldName = entity.fields[assignedToPerson].title;
        }
        let iconFieldArray = _.filter(entity.getFormFieldsArray(), function (field) {
          return field.type === 'lookup' && field.name === config.iconField;
        });
        if (iconFieldArray.length > 0) {
          $scope.iconFieldModule = iconFieldArray[0].module;
        }
      }

      versionService.get('cyops_version').then(function (version) {
        $scope.cyopsVersion = parseInt(version.version.split('.').join(''));
      }).finally(function() {
        $scope.getList();
      });
    }

    /*
     * This method create filter JSON as per selection in configuration to send
     * as a part of request payload.
     */
    var setFilter = function () {
      _config = angular.copy(config);
      var selfFilter = '';
      if ($scope.filterByAssignedToPerson && $scope.filterByMe) {
        selfFilter = {
          field: config.mapping.assignedToPerson,
          operator: 'eq',
          value: localStorageService.get(API.API_3_BASE + API.CURRENT_ACTOR)
        };
      }
      if (config.query.logic === 'OR') {
        _config.query.logic = 'AND';
        _config.query.filters = [];
        if (selfFilter !== '') {
          _config.query.filters.push(selfFilter);
        }
        _config.query.filters.push({
          logic: config.query.logic,
          filters: config.query.filters
        });
      }
      else {
        if (selfFilter !== '') {
          _config.query.filters.push(selfFilter);
        }
      }
    };

    function _objectCopy(filterValue) {
      var returnValue = filterValue['@id'] ? { '@id': filterValue['@id'], '@type': filterValue['@type'], itemValue: filterValue.itemValue, id: filterValue.id } : filterValue;
      return returnValue;
    }

    /*
     * This method is responsible for managing filters to view more records on
     * specific selection/click on rendered chart.
     */
    $scope._minify = function (qFilters) {
      var filters = [];
      qFilters.forEach(function (filter) {
        var cFilter = angular.copy(filter);
        if (!angular.isUndefined(filter.logic) && filter.logic.length > 0) {
          cFilter.filters = $scope._minify(filter.filters);
        }
        else if (angular.isArray(filter.value)) {
          cFilter.value = [];
          filter.value.forEach(function (fValue) {
            cFilter.value.push(_objectCopy(fValue));
          });
        }
        else if (angular.isObject(filter.value)) {
          cFilter.value = _objectCopy(filter.value);
          if (filter.value.displayName) {
            cFilter.display = filter.value.displayName;
          } else {
            cFilter.display = $interpolate(filter.displayTemplate)(filter.value);
            if (cFilter.display) {
              delete cFilter.displayTemplate;
            }
          }
        }
        else if (filter._value) {
          if (filter._value.display) {
            cFilter.display = filter._value.display;
          }
          if (filter._value.itemValue) {
            cFilter.itemValue = filter._value.itemValue;
            cFilter.display = filter._value.itemValue;
          }
        }
        filters.push(cFilter);
      });
      return filters;
    };

    /*
     * This method fetch records to render record distribution chart as per configuration selection.
     */
    $scope.getList = function () {
      setFilter();
      $scope.processing = true;

      if (entity) {
        var displayFieldKeys = CommonUtils.getDisplayTemplateKey(entity.displayTemplate);
        displayFieldKeys.push(_config.titleField)
        var selectFields = displayFieldKeys.concat(['@id', 'uuid', _config.pickListField, _config.iconField]);
        _config.query.relationships = _config.showCorrelation;
        _config.query.__selectFields = _config.showCorrelation ? selectFields.concat([_config.resource]) : selectFields;
        var query = new Query(_config.query);
        var _query = query.getQueryModifiers();
        _query.$export = true;

        var url = API.QUERY;
        if ($state.current.name && $state.current.name.indexOf('viewPanel') !== -1) {
          url += $state.params.module + '/' + $state.params.id + '/';
        }
        url += _config.resource;
        $resource(url).save(_query, query.getQuery(true)).$promise.then(function (result) {
          if (result['hydra:member'].length > 0) {
            generateChartData(result['hydra:member']);
          } else {
            renderDistributionChart();
            $scope.processing = false;
          }
        }, function (error) {
          renderDistributionChart();
          $scope.processing = false;
        });
      }
    };

    /*
     * This method fetch lookup module data to get icons for record rendering
     * and calls record distribution service method to form chart data in required JSON format.
     */
    function generateChartData(records) {
      var iconDataCollections = [];
      var params = {
        module: $scope.iconFieldModule,
        $limit: 30,
        __selectFields: '@id,icon'
      };
      Modules.get(params).$promise.then(function (data) {
        iconDataCollections = data['hydra:member'] ? data['hydra:member'] : [];
      }).finally(function () {
        recordDistributionService.getChartData(entity, _config, records, iconDataCollections).then(function (response) {
          chartData = response;
        }).finally(function () {
            let viewTemplatePromise;
            if($scope.cyopsVersion < 762) {
              viewTemplatePromise = ViewTemplateService.getSystemViewTemplates('', 'settings');
            }else {
              let selectedFields = ['uuid','name','isDefault','importedBy', 'config', 'module'];
              viewTemplatePromise = ViewTemplateService.getSystemViewTemplateList('', ['settings'], selectedFields);
            }
            viewTemplatePromise.then(function(response) {
              let result;
              if($scope.cyopsVersion < 762) {
                result = response.data['hydra:member'];
              }else {
                result = response['hydra:member'];
              }
              if (result.length > 0) {
              _.each(result, function (setting) {
                var moduleType = setting.module ? setting.module : setting.uuid.split('-')[1];
                if (_config.resource === moduleType && setting.config && setting.config.correlationConfig && setting.config.correlationConfig.$image) {
                  $scope.defaultImg = setting.config.correlationConfig.$image;
                }
              });
            }
          }).finally(function () {
            renderDistributionChart();
            $scope.processing = false;
          });
        });
      });
    }

    /*
     * The purpose of this method is to truncate string with ellipsis if text length
     * is more than 180.
     */
    function wrap() {
      var self = d3.select(this),
        textLength = self.node().getComputedTextLength(),
        text = self.text();
      while (textLength > (180) && text.length > 0) {
        text = text.slice(0, -1);
        self.text(text + '...');
        textLength = self.node().getComputedTextLength();
      }
    }

    /*
     * The purpose of this method is to update edge object entries with X and Y coordinates
     * to render lines on chart.
     */
    function updateCoordinates() {
      var self = d3.select(this);
      var x = +self.attr('x') + 20;
      var y = +self.attr('y') + 20;
      var selfData = self.data()[0];
      var edges = chartData.edges;
      angular.forEach(edges, (edge, index) => {
        if (edge.from === selfData.uuid) {
          chartData.edges[index].x1 = x;
          chartData.edges[index].y1 = y;
        } else if (edge.to === selfData.uuid) {
          chartData.edges[index].x2 = x;
          chartData.edges[index].y2 = y;
        }
      });
    }

    /*
     * This method is responsible for rendering record distribution chart as per chartData
     * using d3 library API's.
     */
    function renderDistributionChart() {
      const categoryWidth = 200;
      const categoryHeight = 100;
      const height = chartData.data.length > 0 ? chartData.data.length * categoryHeight : 50;
      const width = angular.element(document.querySelector('#distributionChart-' + _config.wid))[0].clientWidth;
      const viewMoreWidth = 25;
      const viewMoreImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAUNJREFUaEPtlLtKBEEQRc+C4gcY+msGJj4y0TVQwTcoGhm6iYmIP2XsN4iJUlDIBjvuNGcXGahJu+pO3Xu6esTAv9HA56cM/DfBIlAEZAJ1hWSAur0I6AilQBGQAer2IqAjlAJFQAao24uAjlAKFAEZoG7vS2AVuAC2gBXgDTgBPjsmWANugM08fwHOgK8F1f/K9DVwCRwCVzlEmHkF9jsGegC2sz5Kon4CHC+ovtnAO/AM3GbnLnAHrAPfM4b6AMLEY54dAEfARoeB1nptYC/NDMZAXIExcJ1X6HzOFboHdrI+0or6p9ybWRBa65sJxBLHENNLfDpnicPs9BJH/19L3FLfbEA/d8sS6PsKLev/WrcM6AilQBGQAer2IqAjlAJFQAao24uAjlAKFAEZoG4vAjpCKVAEZIC6vQjoCKXA4An8AA8LOjFG6YpKAAAAAElFTkSuQmCC';
      const backgroundColor = $rootScope.theme.id === 'light' ? '#f2f2f3' : $rootScope.theme.id === 'dark' ? '#1d1d1d' : '#212c3a';
      const textColor = $rootScope.theme.id === 'light' ? '#000000' : '#ffffff';
      const strokeColor = $rootScope.theme.id === 'light' ? '#e4e4e4' : '#000000';

      // Calculate max items in a row can be render
      const itemWidth = 160;
      const maxItems = Math.floor((width - categoryWidth) / itemWidth);
      var state = appModulesService.getState(_config.resource);

      d3.select('#distributionChart-' + _config.wid).selectAll('svg').remove();

      const svg = d3.selectAll('#distributionChart-' + _config.wid)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      // Display message and return if no records found
      if (chartData.data.length < 1) {
        svg.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('rx', 4)
          .attr('width', width)
          .attr('height', height)
          .attr('stroke', strokeColor)
          .attr('fill', backgroundColor);

        svg.append('text')
          .text($scope.viewWidgetVars.TXT_NO_RECS_FOUND)
          .attr('x', 20)
          .attr('y', 30)
          .attr('font-size', 16)
          .attr('text-anchor', 'start')
          .attr('text-height', 20)
          .attr('fill', textColor);

        return;
      }

      // If color is not provided as a part of data, then scale will be used
      var colorScale = d3.scaleLinear()
        .domain([0, chartData.data.length])
        .range(['#00B9FA', '#F95002'])
        .interpolate(d3.interpolateHcl);

      // Row rendering
      var categoryRect = svg.append('g')
        .selectAll('rect')
        .data(chartData.data)
        .enter();

      // Category Rectangle
      categoryRect.append('rect')
        .attr('x', 0)
        .attr('y', function (d, i) {
          return i * (categoryHeight);
        })
        .attr('width', function (d) {
          return categoryWidth;
        })
        .attr('height', categoryHeight)
        .attr('stroke', '#808080')
        .attr('fill', '#000');

      // Content rectangle
      categoryRect.append('rect')
        .attr('x', categoryWidth + 5)
        .attr('y', function (d, i) {
          return i * (categoryHeight);
        })
        .attr('width', function (d) {
          return width - categoryWidth - 5;
        })
        .attr('height', categoryHeight)
        .attr('stroke', '#000')
        .attr('fill', function (d) {
          if (d.color) {
            return d.color;
          } else {
            for (var i = 0; i < chartData.data.length; i++) {
              if (d.itemValue === chartData.data[i].itemValue) {
                return d3.rgb(colorScale(i));
              }
            }
          }
        })
        .attr('opacity', 0.7);

      // View All Records option
      var viewMoreImage = categoryRect.append('svg:image')
        .attr('x', width - viewMoreWidth)
        .attr('y', function (d, i) {
          return i * (categoryHeight) + 40;
        })
        .attr('width', 20)
        .attr('height', 20)
        .attr('class', function (d) {
          return (d.json.length > maxItems) ? 'cursorPointer' : 'hide';
        })
        .attr('xlink:href', viewMoreImg)
        .on('click', function (d) {
          var query = angular.copy(_config.query);
          var addFilter = {
            field: _config.pickListField,
            displayTemplate: entity.fields[_config.pickListField].displayTemplate,
            display: d.picklist.itemValue,
            value: d.picklist,
            operator: 'eq'
          };
          query.filters = query.filters.concat(addFilter);
          var widgetQuery = new Query();
          widgetQuery.widgetQuery = { filters: $scope._minify(query.filters), logic: query.logic };
          if(widgetQuery.widgetQuery && widgetQuery.widgetQuery.filters && widgetQuery.widgetQuery.filters.length > 0) {
            angular.forEach(widgetQuery.widgetQuery.filters, function (filter) {
              if(filter.type === 'object' && filter._value) {
                delete filter._value;
              }
            });
          }
          $state.go('main.modules.list', {
            module: _config.resource,
            query: compressionService.compressForUrl(widgetQuery),
            qparam: $state.params.qparam,
            widgetParams: true
          });
        });

      // View All Records Image Title
      viewMoreImage.append('title')
        .text($scope.viewWidgetVars.TXT_VIEW_ALL_RECS);

      // Category Text Rendering
      categoryRect.append('text')
        .text(function (d) {
          return d.itemValue;
        })
        .attr('x', 20)
        .attr('y', function (d, i) {
          return i * (categoryHeight) + (categoryHeight / 2);
        })
        .attr('font-size', 16)
        .attr('text-anchor', 'start')
        .attr('text-height', 20)
        .attr('fill', '#fff');

      var contents = svg.append('g')
        .attr('id', 'content-' + _config.wid);

      // Render data in rows
      angular.forEach(chartData.data, (data, index) => {
        var filteredData = _.filter(data.json, (item, index) => {
          return index < maxItems;
        });
        var item = contents.append('g')
          .attr('id', 'content-' + _config.wid + '-' + data.itemValue)
          .selectAll('g')
          .data(filteredData)
          .enter()
          .append('g')
          .attr('id', function (d) {
            return d.uuid;
          });

        item.append('svg:image')
          .attr('x', function (d, i) {
            return categoryWidth + 60 + i * 150;
          })
          .attr('y', function (d) {
            return index * (categoryHeight) + (categoryHeight / 3) - 20;
          })
          .attr('width', 40)
          .attr('height', 40)
          .attr('class', 'cursorPointer')
          .attr('xlink:href', function (d) {
            return d.image ? d.image : $scope.defaultImg;
          })
          .each(updateCoordinates)
          .on('mouseover', function (e) {
            var tag = '';

            tag = 'Name: ' + d3.select(this).data()[0].name + '<br/>' +
              'ID: ' + d3.select(this).data()[0].id;
            var output = document.getElementById('tag-' + _config.wid);

            var x = this.x.animVal.value + 'px';
            var y = this.y.animVal.value + 50 + 'px';

            output.innerHTML = tag;
            output.style.top = y;
            output.style.left = x;
            output.style.display = 'block';
            output.style.position = 'absolute';
            output.style.pointerEvents = 'none';
          })
          .on('mouseout', function () {
            var output = document.getElementById('tag-' + _config.wid);
            output.style.display = 'none';
          })
          .on('click', function (d) {
            $state.go(state, {
              module: _config.resource,
              id: d.uuid,
              previousParams: JSON.stringify($state.params),
              previousState: $state.current.name
            });
          });

        // Add Text To Records
        var itemText = item.append('text')
          .text(function (d) {
            return d.name;
          })
          .each(wrap)
          .attr('x', function (d, i) {
            return categoryWidth + 20 + i * 150 + 60; // Middle of Image
          })
          .attr('y', function (d, i) {
            return index * (categoryHeight) + (categoryHeight / 2) + 20; // For labelling below image
          })
          .attr('font-size', 11)
          .attr('width', 150)
          .attr('text-anchor', 'middle')
          .attr('text-height', 20)
          .attr('fill', '#fff');
      });

      var filteredEdges = _.filter(chartData.edges, (edge) => {
        return edge.x1 && edge.y1 && edge.x2 && edge.y2;
      });

      // Render edges
      svg.append('g').selectAll('line')
        .append('g')
        .data(filteredEdges)
        .enter()
        .append('line')
        .attr('x1', function (d) {
          return d.x1;
        })
        .attr('y1', function (d) {
          return d.y1;
        })
        .attr('x2', function (d) {
          return d.x2;
        })
        .attr('y2', function (d) {
          return d.y2;
        })
        .attr('stroke', '#000');

      // Setting z-index for content to display line below record image and text
      svg.append('use')
        .attr('xlink:href', '#content-' + _config.wid);
    }

    entity = new Entity(config.resource);
    if (entity) {
      entity.loadFields().then(function () {
        _init();
      });
    }
  }
})();
