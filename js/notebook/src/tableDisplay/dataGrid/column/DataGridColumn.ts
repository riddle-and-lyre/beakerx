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

import ColumnMenu from "../headerMenu/ColumnMenu";
import IndexMenu from "../headerMenu/IndexMenu";
import { BeakerxDataGrid } from "../BeakerxDataGrid";
import {IColumnOptions, IColumnState} from "../interface/IColumn";
import { ICellData } from "../interface/ICell";
import { getAlignmentByChar, getAlignmentByType } from "./columnAlignment";
import { CellRenderer, DataModel, TextRenderer } from "@phosphor/datagrid";
import { ALL_TYPES, getDisplayType, getTypeByName } from "../dataTypes";
import { minmax, MapIterator } from '@phosphor/algorithm';
import { HIGHLIGHTER_TYPE } from "../interface/IHighlighterState";
import ColumnManager, { COLUMN_CHANGED_TYPES, IBkoColumnsChangedArgs } from "./ColumnManager";
import ColumnFilter from "./ColumnFilter";

export enum COLUMN_TYPES {
  index,
  body
}

export enum SORT_ORDER {
  ASC,
  DESC,
  NO_SORT
}

export default class DataGridColumn {
  index: number;
  name: string;
  type: COLUMN_TYPES;
  menu: ColumnMenu|IndexMenu;
  dataGrid: BeakerxDataGrid;
  columnManager: ColumnManager;
  columnFilter: ColumnFilter;
  formatFn: CellRenderer.ConfigFunc<string>;
  valuesIterator: MapIterator<number, any>;
  minValue: any;
  maxValue: any;

  state: IColumnState;

  constructor(options: IColumnOptions, dataGrid: BeakerxDataGrid, columnManager: ColumnManager) {
    this.index = options.index;
    this.name = options.name;
    this.type = options.type;
    this.dataGrid = dataGrid;
    this.columnManager = columnManager;
    this.valuesIterator = this.dataGrid.model.getColumnValuesIterator(this);

    this.setInitialState();
    this.assignFormatFn();
    this.handleHeaderCellHovered = this.handleHeaderCellHovered.bind(this);
    this.createMenu(options.menuOptions);
    this.addColumnFilter(options.menuOptions);
    this.connectToHeaderCellHovered();
    this.connectToColumnsChanged();
    this.addMinMaxValues();
  }

  static getColumnTypeByRegion(region: DataModel.CellRegion) {
    if (region === 'row-header' || region === 'corner-header') {
      return COLUMN_TYPES.index;
    }

    return COLUMN_TYPES.body;
  }

  setInitialState() {
    const dataType = this.getDataType();
    const displayType = getDisplayType(
      dataType,
      this.dataGrid.model.dataFormatter.stringFormatForType,
      this.dataGrid.model.dataFormatter.stringFormatForColumn[this.name]
    );

    this.state = {
      dataType,
      displayType,
      keepTrigger: this.type === COLUMN_TYPES.index,
      horizontalAlignment: this.getInitialAlignment(dataType),
      formatForTimes: {},
      visible: true,
      sortOrder: SORT_ORDER.NO_SORT,
      filter: null
    };
  }

  assignFormatFn() {
    this.formatFn = this.dataGrid.model.dataFormatter
      .getFormatFnByDisplayType(this.state.displayType, this.state);
  }

  setState(state) {
    this.state = {
      ...this.state,
      ...state,
    };

    this.dataGrid['repaint']();
  }
  
  setDisplayType(displayType: ALL_TYPES|string) {
    this.setState({ displayType });
    this.assignFormatFn();
    this.dataGrid.repaint();
  }

  setTimeDisplayType(timeUnit) {
    this.setState({ formatForTimes: timeUnit });
    this.setDisplayType(ALL_TYPES.datetime);
  }

  hide() {
    const args: DataModel.IColumnsChangedArgs = {
      type: 'columns-removed',
      region: 'body',
      index: this.index,
      span: 0
    };

    this.setState({ visible: false });
    this.menu.hideTrigger();
    this.dataGrid.model.emitChanged(args);
    this.columnManager.columnsChanged.emit({
      type: COLUMN_CHANGED_TYPES.columnVisible,
      value: false,
      column: this
    });
  }

  show() {
    const args: DataModel.IColumnsChangedArgs = {
      type: 'columns-inserted',
      region: 'body',
      index: this.index,
      span: 0
    };

    this.setState({ visible: true });
    this.dataGrid.model.emitChanged(args);
    this.columnManager.columnsChanged.emit({
      type: COLUMN_CHANGED_TYPES.columnVisible,
      value: true,
      column: this
    });
  }

  createMenu(menuOptions): void {
    if (this.type === COLUMN_TYPES.index) {
      this.menu = new IndexMenu(this, menuOptions);

      return;
    }

    this.menu = new ColumnMenu(this, menuOptions);
  }

  addColumnFilter(menuOptions) {
    this.columnFilter = new ColumnFilter(
      this.dataGrid,
      this,
      {
        ...menuOptions,
        y: this.dataGrid.baseColumnHeaderSize - 1,
        width: this.dataGrid.columnSections.sectionSize(this.index)
      }
    );
  }

  search(filter: string) {
    if (filter === this.state.filter) {
      return;
    }

    this.setState({ filter });
    this.dataGrid.rowManager.searchRows();
    this.dataGrid.model.reset();
  }

  filter(filter: string) {
    if (filter === this.state.filter) {
      return;
    }

    this.setState({ filter });
    this.dataGrid.rowManager.filterRows();
    this.dataGrid.model.reset();
  }

  resetFilter() {
    this.setState({ filter: '' });
    this.dataGrid.rowManager.filterRows();
    this.dataGrid.model.reset();
  }

  destroy() {
    this.menu.destroy();
  }

  connectToColumnsChanged() {
    this.columnManager.columnsChanged.connect(this.onColumnsChanged.bind(this));
  }

  connectToHeaderCellHovered() {
    this.dataGrid.headerCellHovered.connect(this.handleHeaderCellHovered);
  }

  handleHeaderCellHovered(sender: BeakerxDataGrid, data: ICellData) {
    if(!data) {
      return;
    }

    const column = this.columnManager.indexResolver.resolveIndex(data.column, data.type);

    if (column !== this.index || data.type !== this.type) {
      this.menu.hideTrigger();

      return;
    }

    this.menu.showTrigger(data.offset);
  }

  getInitialAlignment(dataType) {
    let config = this.dataGrid.model.getAlignmentConfig();
    let alignmentForType = config.alignmentForType[ALL_TYPES[dataType]];
    let alignmentForColumn = config.alignmentForColumn[this.name];

    if (alignmentForType) {
      return getAlignmentByChar(alignmentForType);
    }

    if (alignmentForColumn) {
      return getAlignmentByChar(alignmentForColumn);
    }

    return getAlignmentByType(dataType);
  }

  getAlignment() {
    return this.state.horizontalAlignment;
  }

  setAlignment(horizontalAlignment: TextRenderer.HorizontalAlignment) {
    this.setState({ horizontalAlignment });
  }

  resetAlignment() {
    this.setState({
      horizontalAlignment: this.getInitialAlignment(this.state.dataType)
    });
  }

  getHighlighter(highlighterType: HIGHLIGHTER_TYPE) {
    return this.dataGrid.highlighterManager.getColumnHighlighters(this, highlighterType);
  }

  toggleHighlighter(highlighterType: HIGHLIGHTER_TYPE) {
    this.dataGrid.highlighterManager.toggleColumnHighlighter(this, highlighterType);
  }

  resetHighlighters() {
    this.dataGrid.highlighterManager.removeColumnHighlighter(this);
  }

  sort(sortOrder: SORT_ORDER) {
    this.columnManager.sortByColumn(this, sortOrder);
  }

  toggleSort() {
    if (this.state.sortOrder !== SORT_ORDER.ASC) {
      return this.sort(SORT_ORDER.ASC);
    }

    this.sort(SORT_ORDER.DESC);
  }

  getValueResolver(): Function {
    if(this.state.dataType === ALL_TYPES.datetime || this.state.dataType === ALL_TYPES.time) {
      return this.dateValueResolver;
    }

    return this.defaultValueResolver;
  }

  move(destination: number) {
    this.columnManager.moveColumn(this, destination);
  }

  getResolvedIndex() {
    return this.columnManager.indexResolver.resolveIndex(this.index, this.type);
  }

  private dateValueResolver(value) {
    return value.timestamp;
  }

  private defaultValueResolver(value) {
    return value;
  }

  private onColumnsChanged(sender: ColumnManager, args: IBkoColumnsChangedArgs) {
    if (args.type !== COLUMN_CHANGED_TYPES.columnSort) {
      return;
    }

    if (args.column === this && args.value !== SORT_ORDER.NO_SORT) {
      this.setState({ sortOrder: args.value });
      this.dataGrid.highlighterManager.addColumnHighlighter(this, HIGHLIGHTER_TYPE.sort);
      this.menu.showTrigger();
    } else {
      this.setState({ sortOrder: SORT_ORDER.NO_SORT });
      this.dataGrid.highlighterManager.removeColumnHighlighter(this, HIGHLIGHTER_TYPE.sort);
      this.menu.hideTrigger();
    }
  }

  private getDataTypeName(): string {
    return this.type === COLUMN_TYPES.index
      ? this.dataGrid.columnManager.columnsState[COLUMN_TYPES.index].types[this.index]
      : this.dataGrid.columnManager.columnsState[COLUMN_TYPES.body].types[this.index];
  }

  private getDataType(): ALL_TYPES {
    return getTypeByName(this.getDataTypeName());
  }

  private addMinMaxValues() {
    let valueResolver = this.getValueResolver();
    let minMax = minmax(this.valuesIterator.clone(), (a:any, b:any) => {
      let value1 = valueResolver(a);
      let value2 = valueResolver(b);

      if (value1 === value2) {
        return 0;
      }

      return value1 < value2 ? -1 : 1;
    });

    this.minValue = minMax ? minMax[0] : null;
    this.maxValue = minMax ? minMax[1] : null;
  }
}
