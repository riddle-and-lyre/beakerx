/*
 *  Copyright 2017 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var BeakerXPageObject = require('../beakerx.po.js');
var PlotHelperObject = require('../plot.helper.js');
var beakerxPO;
var plotHelper;

describe('Plot groovy js', function () {

  beforeAll(function () {
    beakerxPO = new BeakerXPageObject();
    plotHelper = new PlotHelperObject();
    beakerxPO.runNotebookByUrl('/test/ipynb/groovy/PlotGroovyTest.ipynb');
  });

  afterAll(function () {
    beakerxPO.closeAndHaltNotebook();
  });

  describe('Run "Title and Axis Labels" cell. ', function () {
    var dtContainer;

    it('Widget area has dtcontainer', function () {
      dtContainer = beakerxPO.runCellToGetDtContainer(0);
      expect(dtContainer.isEnabled()).toBeTruthy();
    });

    it('Plot has Title and Axes Labels', function () {
      plotHelper.checkPlotTitle(dtContainer, 'We Will Control the Title');
      plotHelper.checkXLabel(dtContainer, 'Horizontal');
      plotHelper.checkYLabel(dtContainer, 'Vertical');
    });
  });

  describe('Run cells with lines', function(){
    it('Plot has line', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(1);
      expect(plotHelper.getLineByGIndex(svgElement, 0).getAttribute('d')).not.toBeNull();
    });

    it('Should specify color, width and style of line', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(2);
      var plotLine = plotHelper.getLineByGIndex(svgElement, 3);
      expect(plotLine.getCssProperty('stroke').value).toEqual('rgb(212,57,59)');
      expect(plotLine.getCssProperty('stroke-width').value).toEqual('2px');
      expect(plotLine.getCssProperty('stroke-dasharray').value).toEqual('2px, 2px');
    });
  });

  describe('Run cell with stems', function(){
    it('Plot has 6 stems', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(3);
      expect(plotHelper.getAllGStemLines(svgElement, 0).length).toEqual(6);
    });

    it('Should set the base of stems', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(4);
      var baseY1 = Math.round(svgElement.$('#gridline_y_0').getAttribute('y1'));
      var stemY1 = Math.round(plotHelper.getStemByGAndLineIndexes(svgElement, 0, 1).getAttribute('y1'));
      expect(baseY1).toEqual(stemY1);
    });
  });

  describe('Run cell with bars', function(){
    it('Plot has 5 bars', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(5);
      expect(plotHelper.getAllGBarRects(svgElement, 0).length).toEqual(5);
    });
  });

  describe('Run cell with points', function(){
    it('Plot has points', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(6);
      expect(plotHelper.getAllPointsByGIndexAndType(svgElement, 0, 'rect').length).toBeGreaterThan(0);
    });

    it('Should sets point colors using lists', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(7);
      expect(svgElement.$('rect#i0_0').getCssProperty('fill').value).toEqual('rgb(0,0,0)');
      expect(svgElement.$('rect#i0_1').getCssProperty('fill').value).toEqual('rgb(255,0,0)');
    });
  });

  describe('Run cell with areas', function(){
    it('Plot has 2 areas', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(8);
      expect(plotHelper.getAllAreas(svgElement).length).toEqual(2);
    });

    it('Plot has area with base', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(9);
      expect(plotHelper.getAllAreas(svgElement).length).toEqual(1);
    });
  });

  describe('Run cell with stacking', function(){
    it('Plot has 2 areas', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(10);
      expect(plotHelper.getAllAreas(svgElement).length).toEqual(2);
    });
  });

  describe('Run cell with constant lines', function(){
    it('Plot has 4 constant lines', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(11);
      expect(plotHelper.getAllConstLines(svgElement).length).toEqual(4);
    });
  });

  describe('Run cell with constant bands', function(){
    it('Plot has constant band', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(12);
      expect(plotHelper.getAllConstBands(svgElement).length).toBeGreaterThan(0);
    });

    it('Should sets constant band color', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(13);
      expect(svgElement.$('#i1.plot-constband').getCssProperty('fill').value).toEqual('rgb(128,128,128)');
    });
  });

  describe('Run cell with text', function(){
    it('Plot has 8 text elements', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(14);
      expect(plotHelper.getAllTexts(svgElement).length).toEqual(8);
    });
  });

  describe('Run cell with crosshair', function(){
    it('Plot has crosshair', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(15);
      var pointElement = svgElement.$('rect#i2_0');
      pointElement.scroll();
      pointElement.click();
      svgElement.moveToObject('rect#i2_1');
      var divPlot = beakerxPO.getCodeCellByIndex(15).$('#svgg');
      expect(divPlot.$('#cursor_xlabel').isVisible()).toBeTruthy();
      expect(divPlot.$('#cursor_ylabel').isVisible()).toBeTruthy();
    });
  });

  describe('Run "Simple Time Plot" cell', function(){
    it('Time Plot has points elements', function(){
      beakerxPO.runCodeCellByIndex(17);
      beakerxPO.kernelIdleIcon.waitForEnabled();
      var svgElement = beakerxPO.runCellToGetSvgElement(18);
      expect(svgElement.$('#i0.plot-point').isVisible()).toBeTruthy();
      expect(svgElement.$('#i1.plot-point').isVisible()).toBeTruthy();
    });
  });

  describe('Run "Second Y Axis" cell', function(){
    it('Plot has second Y Axis', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(19);
      expect(svgElement.$('#yrlabel').isVisible()).toBeTruthy();
      expect(svgElement.$('#label_yr_1').isVisible()).toBeTruthy();
    });
  });

  describe('Run "Logarithmic Scale" cells', function(){
    it('Plot has 2 lines', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(20);
      expect(plotHelper.getAllLines(svgElement).length).toEqual(2);
      svgElement = beakerxPO.runCellToGetSvgElement(21);
      expect(plotHelper.getAllLines(svgElement).length).toEqual(2);
    });
  });

  describe('Run "Date Objects for the Time Coordinate" cell', function(){
    it('Plot has points elements', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(22);
      expect(svgElement.$('#i0.plot-point').isVisible()).toBeTruthy();
      expect(svgElement.$('#i1.plot-point').isVisible()).toBeTruthy();
    });
  });

  describe('Run "Nanosecond Resolution" cell', function(){
    it('Plot has points elements', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(23);
      expect(svgElement.$('#i0.plot-point').isVisible()).toBeTruthy();
    });
  });

  describe('Run "Formating control" cells', function(){
    it("Plot doesn't have tick labels", function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(24);
      expect(svgElement.$$('g#labelg > text.plot-label').length).toEqual(0);
    });

    it("Plot has advanced styling", function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(25);
      expect(svgElement.$$('g#labelg > text.plot-label')[0].getCssProperty('fill').value).toEqual('rgb(0,128,0)');
    });
  });

  describe('Run "Raster" cell', function(){
    it('Plot has 3 raster elements', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(26);
      expect(plotHelper.getAllRasters(svgElement).length).toBeGreaterThan(0);
    });
  });

  describe('Run cell with axis bounds', function(){
    it('Plot has 2 axis bounds', function(){
      var svgElement = beakerxPO.runCellToGetSvgElement(27);
      expect(svgElement.$('text#label_y_0').getText()).toEqual('1\.0');
      expect(svgElement.$('text#label_yr_0').getText()).toEqual('3\.0');
    });
  });

});