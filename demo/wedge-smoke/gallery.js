var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/inspector/registry/inspector-registry.ts
var InspectorRegistry = class {
  components = /* @__PURE__ */ new Map();
  /**
   * Register a component for inspection. A later register for the same
   * type replaces the earlier entry.
   */
  register(component) {
    this.components.set(
      component.type,
      component
    );
  }
  /** Get a registered component by type, or undefined. */
  getComponent(type) {
    return this.components.get(type);
  }
  /** All registered components, ordered by name (sidebar order). */
  listComponents() {
    return [...this.components.values()].sort((a, b2) => a.name.localeCompare(b2.name));
  }
};
var inspectorRegistry = new InspectorRegistry();

// node_modules/.pnpm/@tanstack+table-core@8.21.3/node_modules/@tanstack/table-core/build/lib/index.mjs
function functionalUpdate(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
function makeStateUpdater(key, instance) {
  return (updater) => {
    instance.setState((old) => {
      return {
        ...old,
        [key]: functionalUpdate(updater, old[key])
      };
    });
  };
}
function isFunction(d) {
  return d instanceof Function;
}
function isNumberArray(d) {
  return Array.isArray(d) && d.every((val) => typeof val === "number");
}
function flattenBy(arr, getChildren) {
  const flat = [];
  const recurse = (subArr) => {
    subArr.forEach((item) => {
      flat.push(item);
      const children = getChildren(item);
      if (children != null && children.length) {
        recurse(children);
      }
    });
  };
  recurse(arr);
  return flat;
}
function memo(getDeps, fn, opts) {
  let deps = [];
  let result;
  return (depArgs) => {
    let depTime;
    if (opts.key && opts.debug) depTime = Date.now();
    const newDeps = getDeps(depArgs);
    const depsChanged = newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep);
    if (!depsChanged) {
      return result;
    }
    deps = newDeps;
    let resultTime;
    if (opts.key && opts.debug) resultTime = Date.now();
    result = fn(...newDeps);
    opts == null || opts.onChange == null || opts.onChange(result);
    if (opts.key && opts.debug) {
      if (opts != null && opts.debug()) {
        const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
        const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
        const resultFpsPercentage = resultEndTime / 16;
        const pad = (str, num) => {
          str = String(str);
          while (str.length < num) {
            str = " " + str;
          }
          return str;
        };
        console.info(`%c\u23F1 ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`, opts == null ? void 0 : opts.key);
      }
    }
    return result;
  };
}
function getMemoOptions(tableOptions, debugLevel, key, onChange) {
  return {
    debug: () => {
      var _tableOptions$debugAl;
      return (_tableOptions$debugAl = tableOptions == null ? void 0 : tableOptions.debugAll) != null ? _tableOptions$debugAl : tableOptions[debugLevel];
    },
    key,
    onChange
  };
}
function createCell(table, row, column, columnId) {
  const getRenderValue = () => {
    var _cell$getValue;
    return (_cell$getValue = cell.getValue()) != null ? _cell$getValue : table.options.renderFallbackValue;
  };
  const cell = {
    id: `${row.id}_${column.id}`,
    row,
    column,
    getValue: () => row.getValue(columnId),
    renderValue: getRenderValue,
    getContext: memo(() => [table, column, row, cell], (table2, column2, row2, cell2) => ({
      table: table2,
      column: column2,
      row: row2,
      cell: cell2,
      getValue: cell2.getValue,
      renderValue: cell2.renderValue
    }), getMemoOptions(table.options, "debugCells", "cell.getContext"))
  };
  table._features.forEach((feature) => {
    feature.createCell == null || feature.createCell(cell, column, row, table);
  }, {});
  return cell;
}
function createColumn(table, columnDef, depth, parent) {
  var _ref, _resolvedColumnDef$id;
  const defaultColumn = table._getDefaultColumnDef();
  const resolvedColumnDef = {
    ...defaultColumn,
    ...columnDef
  };
  const accessorKey = resolvedColumnDef.accessorKey;
  let id = (_ref = (_resolvedColumnDef$id = resolvedColumnDef.id) != null ? _resolvedColumnDef$id : accessorKey ? typeof String.prototype.replaceAll === "function" ? accessorKey.replaceAll(".", "_") : accessorKey.replace(/\./g, "_") : void 0) != null ? _ref : typeof resolvedColumnDef.header === "string" ? resolvedColumnDef.header : void 0;
  let accessorFn;
  if (resolvedColumnDef.accessorFn) {
    accessorFn = resolvedColumnDef.accessorFn;
  } else if (accessorKey) {
    if (accessorKey.includes(".")) {
      accessorFn = (originalRow) => {
        let result = originalRow;
        for (const key of accessorKey.split(".")) {
          var _result;
          result = (_result = result) == null ? void 0 : _result[key];
          if (result === void 0) {
            console.warn(`"${key}" in deeply nested key "${accessorKey}" returned undefined.`);
          }
        }
        return result;
      };
    } else {
      accessorFn = (originalRow) => originalRow[resolvedColumnDef.accessorKey];
    }
  }
  if (!id) {
    if (true) {
      throw new Error(resolvedColumnDef.accessorFn ? `Columns require an id when using an accessorFn` : `Columns require an id when using a non-string header`);
    }
    throw new Error();
  }
  let column = {
    id: `${String(id)}`,
    accessorFn,
    parent,
    depth,
    columnDef: resolvedColumnDef,
    columns: [],
    getFlatColumns: memo(() => [true], () => {
      var _column$columns;
      return [column, ...(_column$columns = column.columns) == null ? void 0 : _column$columns.flatMap((d) => d.getFlatColumns())];
    }, getMemoOptions(table.options, "debugColumns", "column.getFlatColumns")),
    getLeafColumns: memo(() => [table._getOrderColumnsFn()], (orderColumns2) => {
      var _column$columns2;
      if ((_column$columns2 = column.columns) != null && _column$columns2.length) {
        let leafColumns = column.columns.flatMap((column2) => column2.getLeafColumns());
        return orderColumns2(leafColumns);
      }
      return [column];
    }, getMemoOptions(table.options, "debugColumns", "column.getLeafColumns"))
  };
  for (const feature of table._features) {
    feature.createColumn == null || feature.createColumn(column, table);
  }
  return column;
}
var debug = "debugHeaders";
function createHeader(table, column, options) {
  var _options$id;
  const id = (_options$id = options.id) != null ? _options$id : column.id;
  let header = {
    id,
    column,
    index: options.index,
    isPlaceholder: !!options.isPlaceholder,
    placeholderId: options.placeholderId,
    depth: options.depth,
    subHeaders: [],
    colSpan: 0,
    rowSpan: 0,
    headerGroup: null,
    getLeafHeaders: () => {
      const leafHeaders = [];
      const recurseHeader = (h) => {
        if (h.subHeaders && h.subHeaders.length) {
          h.subHeaders.map(recurseHeader);
        }
        leafHeaders.push(h);
      };
      recurseHeader(header);
      return leafHeaders;
    },
    getContext: () => ({
      table,
      header,
      column
    })
  };
  table._features.forEach((feature) => {
    feature.createHeader == null || feature.createHeader(header, table);
  });
  return header;
}
var Headers = {
  createTable: (table) => {
    table.getHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allColumns, leafColumns, left, right) => {
      var _left$map$filter, _right$map$filter;
      const leftColumns = (_left$map$filter = left == null ? void 0 : left.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _left$map$filter : [];
      const rightColumns = (_right$map$filter = right == null ? void 0 : right.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _right$map$filter : [];
      const centerColumns = leafColumns.filter((column) => !(left != null && left.includes(column.id)) && !(right != null && right.includes(column.id)));
      const headerGroups = buildHeaderGroups(allColumns, [...leftColumns, ...centerColumns, ...rightColumns], table);
      return headerGroups;
    }, getMemoOptions(table.options, debug, "getHeaderGroups"));
    table.getCenterHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allColumns, leafColumns, left, right) => {
      leafColumns = leafColumns.filter((column) => !(left != null && left.includes(column.id)) && !(right != null && right.includes(column.id)));
      return buildHeaderGroups(allColumns, leafColumns, table, "center");
    }, getMemoOptions(table.options, debug, "getCenterHeaderGroups"));
    table.getLeftHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.left], (allColumns, leafColumns, left) => {
      var _left$map$filter2;
      const orderedLeafColumns = (_left$map$filter2 = left == null ? void 0 : left.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _left$map$filter2 : [];
      return buildHeaderGroups(allColumns, orderedLeafColumns, table, "left");
    }, getMemoOptions(table.options, debug, "getLeftHeaderGroups"));
    table.getRightHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.right], (allColumns, leafColumns, right) => {
      var _right$map$filter2;
      const orderedLeafColumns = (_right$map$filter2 = right == null ? void 0 : right.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _right$map$filter2 : [];
      return buildHeaderGroups(allColumns, orderedLeafColumns, table, "right");
    }, getMemoOptions(table.options, debug, "getRightHeaderGroups"));
    table.getFooterGroups = memo(() => [table.getHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getFooterGroups"));
    table.getLeftFooterGroups = memo(() => [table.getLeftHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getLeftFooterGroups"));
    table.getCenterFooterGroups = memo(() => [table.getCenterHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getCenterFooterGroups"));
    table.getRightFooterGroups = memo(() => [table.getRightHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getRightFooterGroups"));
    table.getFlatHeaders = memo(() => [table.getHeaderGroups()], (headerGroups) => {
      return headerGroups.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getFlatHeaders"));
    table.getLeftFlatHeaders = memo(() => [table.getLeftHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getLeftFlatHeaders"));
    table.getCenterFlatHeaders = memo(() => [table.getCenterHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getCenterFlatHeaders"));
    table.getRightFlatHeaders = memo(() => [table.getRightHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getRightFlatHeaders"));
    table.getCenterLeafHeaders = memo(() => [table.getCenterFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders;
        return !((_header$subHeaders = header.subHeaders) != null && _header$subHeaders.length);
      });
    }, getMemoOptions(table.options, debug, "getCenterLeafHeaders"));
    table.getLeftLeafHeaders = memo(() => [table.getLeftFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders2;
        return !((_header$subHeaders2 = header.subHeaders) != null && _header$subHeaders2.length);
      });
    }, getMemoOptions(table.options, debug, "getLeftLeafHeaders"));
    table.getRightLeafHeaders = memo(() => [table.getRightFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders3;
        return !((_header$subHeaders3 = header.subHeaders) != null && _header$subHeaders3.length);
      });
    }, getMemoOptions(table.options, debug, "getRightLeafHeaders"));
    table.getLeafHeaders = memo(() => [table.getLeftHeaderGroups(), table.getCenterHeaderGroups(), table.getRightHeaderGroups()], (left, center, right) => {
      var _left$0$headers, _left$, _center$0$headers, _center$, _right$0$headers, _right$;
      return [...(_left$0$headers = (_left$ = left[0]) == null ? void 0 : _left$.headers) != null ? _left$0$headers : [], ...(_center$0$headers = (_center$ = center[0]) == null ? void 0 : _center$.headers) != null ? _center$0$headers : [], ...(_right$0$headers = (_right$ = right[0]) == null ? void 0 : _right$.headers) != null ? _right$0$headers : []].map((header) => {
        return header.getLeafHeaders();
      }).flat();
    }, getMemoOptions(table.options, debug, "getLeafHeaders"));
  }
};
function buildHeaderGroups(allColumns, columnsToGroup, table, headerFamily) {
  var _headerGroups$0$heade, _headerGroups$;
  let maxDepth = 0;
  const findMaxDepth = function(columns, depth) {
    if (depth === void 0) {
      depth = 1;
    }
    maxDepth = Math.max(maxDepth, depth);
    columns.filter((column) => column.getIsVisible()).forEach((column) => {
      var _column$columns;
      if ((_column$columns = column.columns) != null && _column$columns.length) {
        findMaxDepth(column.columns, depth + 1);
      }
    }, 0);
  };
  findMaxDepth(allColumns);
  let headerGroups = [];
  const createHeaderGroup = (headersToGroup, depth) => {
    const headerGroup = {
      depth,
      id: [headerFamily, `${depth}`].filter(Boolean).join("_"),
      headers: []
    };
    const pendingParentHeaders = [];
    headersToGroup.forEach((headerToGroup) => {
      const latestPendingParentHeader = [...pendingParentHeaders].reverse()[0];
      const isLeafHeader = headerToGroup.column.depth === headerGroup.depth;
      let column;
      let isPlaceholder = false;
      if (isLeafHeader && headerToGroup.column.parent) {
        column = headerToGroup.column.parent;
      } else {
        column = headerToGroup.column;
        isPlaceholder = true;
      }
      if (latestPendingParentHeader && (latestPendingParentHeader == null ? void 0 : latestPendingParentHeader.column) === column) {
        latestPendingParentHeader.subHeaders.push(headerToGroup);
      } else {
        const header = createHeader(table, column, {
          id: [headerFamily, depth, column.id, headerToGroup == null ? void 0 : headerToGroup.id].filter(Boolean).join("_"),
          isPlaceholder,
          placeholderId: isPlaceholder ? `${pendingParentHeaders.filter((d) => d.column === column).length}` : void 0,
          depth,
          index: pendingParentHeaders.length
        });
        header.subHeaders.push(headerToGroup);
        pendingParentHeaders.push(header);
      }
      headerGroup.headers.push(headerToGroup);
      headerToGroup.headerGroup = headerGroup;
    });
    headerGroups.push(headerGroup);
    if (depth > 0) {
      createHeaderGroup(pendingParentHeaders, depth - 1);
    }
  };
  const bottomHeaders = columnsToGroup.map((column, index) => createHeader(table, column, {
    depth: maxDepth,
    index
  }));
  createHeaderGroup(bottomHeaders, maxDepth - 1);
  headerGroups.reverse();
  const recurseHeadersForSpans = (headers) => {
    const filteredHeaders = headers.filter((header) => header.column.getIsVisible());
    return filteredHeaders.map((header) => {
      let colSpan = 0;
      let rowSpan = 0;
      let childRowSpans = [0];
      if (header.subHeaders && header.subHeaders.length) {
        childRowSpans = [];
        recurseHeadersForSpans(header.subHeaders).forEach((_ref) => {
          let {
            colSpan: childColSpan,
            rowSpan: childRowSpan
          } = _ref;
          colSpan += childColSpan;
          childRowSpans.push(childRowSpan);
        });
      } else {
        colSpan = 1;
      }
      const minChildRowSpan = Math.min(...childRowSpans);
      rowSpan = rowSpan + minChildRowSpan;
      header.colSpan = colSpan;
      header.rowSpan = rowSpan;
      return {
        colSpan,
        rowSpan
      };
    });
  };
  recurseHeadersForSpans((_headerGroups$0$heade = (_headerGroups$ = headerGroups[0]) == null ? void 0 : _headerGroups$.headers) != null ? _headerGroups$0$heade : []);
  return headerGroups;
}
var createRow = (table, id, original, rowIndex, depth, subRows, parentId) => {
  let row = {
    id,
    index: rowIndex,
    original,
    depth,
    parentId,
    _valuesCache: {},
    _uniqueValuesCache: {},
    getValue: (columnId) => {
      if (row._valuesCache.hasOwnProperty(columnId)) {
        return row._valuesCache[columnId];
      }
      const column = table.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      row._valuesCache[columnId] = column.accessorFn(row.original, rowIndex);
      return row._valuesCache[columnId];
    },
    getUniqueValues: (columnId) => {
      if (row._uniqueValuesCache.hasOwnProperty(columnId)) {
        return row._uniqueValuesCache[columnId];
      }
      const column = table.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      if (!column.columnDef.getUniqueValues) {
        row._uniqueValuesCache[columnId] = [row.getValue(columnId)];
        return row._uniqueValuesCache[columnId];
      }
      row._uniqueValuesCache[columnId] = column.columnDef.getUniqueValues(row.original, rowIndex);
      return row._uniqueValuesCache[columnId];
    },
    renderValue: (columnId) => {
      var _row$getValue;
      return (_row$getValue = row.getValue(columnId)) != null ? _row$getValue : table.options.renderFallbackValue;
    },
    subRows: subRows != null ? subRows : [],
    getLeafRows: () => flattenBy(row.subRows, (d) => d.subRows),
    getParentRow: () => row.parentId ? table.getRow(row.parentId, true) : void 0,
    getParentRows: () => {
      let parentRows = [];
      let currentRow = row;
      while (true) {
        const parentRow = currentRow.getParentRow();
        if (!parentRow) break;
        parentRows.push(parentRow);
        currentRow = parentRow;
      }
      return parentRows.reverse();
    },
    getAllCells: memo(() => [table.getAllLeafColumns()], (leafColumns) => {
      return leafColumns.map((column) => {
        return createCell(table, row, column, column.id);
      });
    }, getMemoOptions(table.options, "debugRows", "getAllCells")),
    _getAllCellsByColumnId: memo(() => [row.getAllCells()], (allCells) => {
      return allCells.reduce((acc, cell) => {
        acc[cell.column.id] = cell;
        return acc;
      }, {});
    }, getMemoOptions(table.options, "debugRows", "getAllCellsByColumnId"))
  };
  for (let i = 0; i < table._features.length; i++) {
    const feature = table._features[i];
    feature == null || feature.createRow == null || feature.createRow(row, table);
  }
  return row;
};
var ColumnFaceting = {
  createColumn: (column, table) => {
    column._getFacetedRowModel = table.options.getFacetedRowModel && table.options.getFacetedRowModel(table, column.id);
    column.getFacetedRowModel = () => {
      if (!column._getFacetedRowModel) {
        return table.getPreFilteredRowModel();
      }
      return column._getFacetedRowModel();
    };
    column._getFacetedUniqueValues = table.options.getFacetedUniqueValues && table.options.getFacetedUniqueValues(table, column.id);
    column.getFacetedUniqueValues = () => {
      if (!column._getFacetedUniqueValues) {
        return /* @__PURE__ */ new Map();
      }
      return column._getFacetedUniqueValues();
    };
    column._getFacetedMinMaxValues = table.options.getFacetedMinMaxValues && table.options.getFacetedMinMaxValues(table, column.id);
    column.getFacetedMinMaxValues = () => {
      if (!column._getFacetedMinMaxValues) {
        return void 0;
      }
      return column._getFacetedMinMaxValues();
    };
  }
};
var includesString = (row, columnId, filterValue) => {
  var _filterValue$toString, _row$getValue;
  const search = filterValue == null || (_filterValue$toString = filterValue.toString()) == null ? void 0 : _filterValue$toString.toLowerCase();
  return Boolean((_row$getValue = row.getValue(columnId)) == null || (_row$getValue = _row$getValue.toString()) == null || (_row$getValue = _row$getValue.toLowerCase()) == null ? void 0 : _row$getValue.includes(search));
};
includesString.autoRemove = (val) => testFalsey(val);
var includesStringSensitive = (row, columnId, filterValue) => {
  var _row$getValue2;
  return Boolean((_row$getValue2 = row.getValue(columnId)) == null || (_row$getValue2 = _row$getValue2.toString()) == null ? void 0 : _row$getValue2.includes(filterValue));
};
includesStringSensitive.autoRemove = (val) => testFalsey(val);
var equalsString = (row, columnId, filterValue) => {
  var _row$getValue3;
  return ((_row$getValue3 = row.getValue(columnId)) == null || (_row$getValue3 = _row$getValue3.toString()) == null ? void 0 : _row$getValue3.toLowerCase()) === (filterValue == null ? void 0 : filterValue.toLowerCase());
};
equalsString.autoRemove = (val) => testFalsey(val);
var arrIncludes = (row, columnId, filterValue) => {
  var _row$getValue4;
  return (_row$getValue4 = row.getValue(columnId)) == null ? void 0 : _row$getValue4.includes(filterValue);
};
arrIncludes.autoRemove = (val) => testFalsey(val);
var arrIncludesAll = (row, columnId, filterValue) => {
  return !filterValue.some((val) => {
    var _row$getValue5;
    return !((_row$getValue5 = row.getValue(columnId)) != null && _row$getValue5.includes(val));
  });
};
arrIncludesAll.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
var arrIncludesSome = (row, columnId, filterValue) => {
  return filterValue.some((val) => {
    var _row$getValue6;
    return (_row$getValue6 = row.getValue(columnId)) == null ? void 0 : _row$getValue6.includes(val);
  });
};
arrIncludesSome.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
var equals = (row, columnId, filterValue) => {
  return row.getValue(columnId) === filterValue;
};
equals.autoRemove = (val) => testFalsey(val);
var weakEquals = (row, columnId, filterValue) => {
  return row.getValue(columnId) == filterValue;
};
weakEquals.autoRemove = (val) => testFalsey(val);
var inNumberRange = (row, columnId, filterValue) => {
  let [min2, max2] = filterValue;
  const rowValue = row.getValue(columnId);
  return rowValue >= min2 && rowValue <= max2;
};
inNumberRange.resolveFilterValue = (val) => {
  let [unsafeMin, unsafeMax] = val;
  let parsedMin = typeof unsafeMin !== "number" ? parseFloat(unsafeMin) : unsafeMin;
  let parsedMax = typeof unsafeMax !== "number" ? parseFloat(unsafeMax) : unsafeMax;
  let min2 = unsafeMin === null || Number.isNaN(parsedMin) ? -Infinity : parsedMin;
  let max2 = unsafeMax === null || Number.isNaN(parsedMax) ? Infinity : parsedMax;
  if (min2 > max2) {
    const temp = min2;
    min2 = max2;
    max2 = temp;
  }
  return [min2, max2];
};
inNumberRange.autoRemove = (val) => testFalsey(val) || testFalsey(val[0]) && testFalsey(val[1]);
var filterFns = {
  includesString,
  includesStringSensitive,
  equalsString,
  arrIncludes,
  arrIncludesAll,
  arrIncludesSome,
  equals,
  weakEquals,
  inNumberRange
};
function testFalsey(val) {
  return val === void 0 || val === null || val === "";
}
var ColumnFiltering = {
  getDefaultColumnDef: () => {
    return {
      filterFn: "auto"
    };
  },
  getInitialState: (state) => {
    return {
      columnFilters: [],
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnFiltersChange: makeStateUpdater("columnFilters", table),
      filterFromLeafRows: false,
      maxLeafRowFilterDepth: 100
    };
  },
  createColumn: (column, table) => {
    column.getAutoFilterFn = () => {
      const firstRow = table.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return filterFns.includesString;
      }
      if (typeof value === "number") {
        return filterFns.inNumberRange;
      }
      if (typeof value === "boolean") {
        return filterFns.equals;
      }
      if (value !== null && typeof value === "object") {
        return filterFns.equals;
      }
      if (Array.isArray(value)) {
        return filterFns.arrIncludes;
      }
      return filterFns.weakEquals;
    };
    column.getFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      return isFunction(column.columnDef.filterFn) ? column.columnDef.filterFn : column.columnDef.filterFn === "auto" ? column.getAutoFilterFn() : (
        // @ts-ignore
        (_table$options$filter = (_table$options$filter2 = table.options.filterFns) == null ? void 0 : _table$options$filter2[column.columnDef.filterFn]) != null ? _table$options$filter : filterFns[column.columnDef.filterFn]
      );
    };
    column.getCanFilter = () => {
      var _column$columnDef$ena, _table$options$enable, _table$options$enable2;
      return ((_column$columnDef$ena = column.columnDef.enableColumnFilter) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableColumnFilters) != null ? _table$options$enable : true) && ((_table$options$enable2 = table.options.enableFilters) != null ? _table$options$enable2 : true) && !!column.accessorFn;
    };
    column.getIsFiltered = () => column.getFilterIndex() > -1;
    column.getFilterValue = () => {
      var _table$getState$colum;
      return (_table$getState$colum = table.getState().columnFilters) == null || (_table$getState$colum = _table$getState$colum.find((d) => d.id === column.id)) == null ? void 0 : _table$getState$colum.value;
    };
    column.getFilterIndex = () => {
      var _table$getState$colum2, _table$getState$colum3;
      return (_table$getState$colum2 = (_table$getState$colum3 = table.getState().columnFilters) == null ? void 0 : _table$getState$colum3.findIndex((d) => d.id === column.id)) != null ? _table$getState$colum2 : -1;
    };
    column.setFilterValue = (value) => {
      table.setColumnFilters((old) => {
        const filterFn = column.getFilterFn();
        const previousFilter = old == null ? void 0 : old.find((d) => d.id === column.id);
        const newFilter = functionalUpdate(value, previousFilter ? previousFilter.value : void 0);
        if (shouldAutoRemoveFilter(filterFn, newFilter, column)) {
          var _old$filter;
          return (_old$filter = old == null ? void 0 : old.filter((d) => d.id !== column.id)) != null ? _old$filter : [];
        }
        const newFilterObj = {
          id: column.id,
          value: newFilter
        };
        if (previousFilter) {
          var _old$map;
          return (_old$map = old == null ? void 0 : old.map((d) => {
            if (d.id === column.id) {
              return newFilterObj;
            }
            return d;
          })) != null ? _old$map : [];
        }
        if (old != null && old.length) {
          return [...old, newFilterObj];
        }
        return [newFilterObj];
      });
    };
  },
  createRow: (row, _table) => {
    row.columnFilters = {};
    row.columnFiltersMeta = {};
  },
  createTable: (table) => {
    table.setColumnFilters = (updater) => {
      const leafColumns = table.getAllLeafColumns();
      const updateFn = (old) => {
        var _functionalUpdate;
        return (_functionalUpdate = functionalUpdate(updater, old)) == null ? void 0 : _functionalUpdate.filter((filter) => {
          const column = leafColumns.find((d) => d.id === filter.id);
          if (column) {
            const filterFn = column.getFilterFn();
            if (shouldAutoRemoveFilter(filterFn, filter.value, column)) {
              return false;
            }
          }
          return true;
        });
      };
      table.options.onColumnFiltersChange == null || table.options.onColumnFiltersChange(updateFn);
    };
    table.resetColumnFilters = (defaultState) => {
      var _table$initialState$c, _table$initialState;
      table.setColumnFilters(defaultState ? [] : (_table$initialState$c = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.columnFilters) != null ? _table$initialState$c : []);
    };
    table.getPreFilteredRowModel = () => table.getCoreRowModel();
    table.getFilteredRowModel = () => {
      if (!table._getFilteredRowModel && table.options.getFilteredRowModel) {
        table._getFilteredRowModel = table.options.getFilteredRowModel(table);
      }
      if (table.options.manualFiltering || !table._getFilteredRowModel) {
        return table.getPreFilteredRowModel();
      }
      return table._getFilteredRowModel();
    };
  }
};
function shouldAutoRemoveFilter(filterFn, value, column) {
  return (filterFn && filterFn.autoRemove ? filterFn.autoRemove(value, column) : false) || typeof value === "undefined" || typeof value === "string" && !value;
}
var sum = (columnId, _leafRows, childRows) => {
  return childRows.reduce((sum2, next) => {
    const nextValue = next.getValue(columnId);
    return sum2 + (typeof nextValue === "number" ? nextValue : 0);
  }, 0);
};
var min = (columnId, _leafRows, childRows) => {
  let min2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (min2 > value || min2 === void 0 && value >= value)) {
      min2 = value;
    }
  });
  return min2;
};
var max = (columnId, _leafRows, childRows) => {
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (max2 < value || max2 === void 0 && value >= value)) {
      max2 = value;
    }
  });
  return max2;
};
var extent = (columnId, _leafRows, childRows) => {
  let min2;
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null) {
      if (min2 === void 0) {
        if (value >= value) min2 = max2 = value;
      } else {
        if (min2 > value) min2 = value;
        if (max2 < value) max2 = value;
      }
    }
  });
  return [min2, max2];
};
var mean = (columnId, leafRows) => {
  let count3 = 0;
  let sum2 = 0;
  leafRows.forEach((row) => {
    let value = row.getValue(columnId);
    if (value != null && (value = +value) >= value) {
      ++count3, sum2 += value;
    }
  });
  if (count3) return sum2 / count3;
  return;
};
var median = (columnId, leafRows) => {
  if (!leafRows.length) {
    return;
  }
  const values = leafRows.map((row) => row.getValue(columnId));
  if (!isNumberArray(values)) {
    return;
  }
  if (values.length === 1) {
    return values[0];
  }
  const mid = Math.floor(values.length / 2);
  const nums = values.sort((a, b2) => a - b2);
  return values.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};
var unique = (columnId, leafRows) => {
  return Array.from(new Set(leafRows.map((d) => d.getValue(columnId))).values());
};
var uniqueCount = (columnId, leafRows) => {
  return new Set(leafRows.map((d) => d.getValue(columnId))).size;
};
var count = (_columnId, leafRows) => {
  return leafRows.length;
};
var aggregationFns = {
  sum,
  min,
  max,
  extent,
  mean,
  median,
  unique,
  uniqueCount,
  count
};
var ColumnGrouping = {
  getDefaultColumnDef: () => {
    return {
      aggregatedCell: (props) => {
        var _toString, _props$getValue;
        return (_toString = (_props$getValue = props.getValue()) == null || _props$getValue.toString == null ? void 0 : _props$getValue.toString()) != null ? _toString : null;
      },
      aggregationFn: "auto"
    };
  },
  getInitialState: (state) => {
    return {
      grouping: [],
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onGroupingChange: makeStateUpdater("grouping", table),
      groupedColumnMode: "reorder"
    };
  },
  createColumn: (column, table) => {
    column.toggleGrouping = () => {
      table.setGrouping((old) => {
        if (old != null && old.includes(column.id)) {
          return old.filter((d) => d !== column.id);
        }
        return [...old != null ? old : [], column.id];
      });
    };
    column.getCanGroup = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableGrouping) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableGrouping) != null ? _table$options$enable : true) && (!!column.accessorFn || !!column.columnDef.getGroupingValue);
    };
    column.getIsGrouped = () => {
      var _table$getState$group;
      return (_table$getState$group = table.getState().grouping) == null ? void 0 : _table$getState$group.includes(column.id);
    };
    column.getGroupedIndex = () => {
      var _table$getState$group2;
      return (_table$getState$group2 = table.getState().grouping) == null ? void 0 : _table$getState$group2.indexOf(column.id);
    };
    column.getToggleGroupingHandler = () => {
      const canGroup = column.getCanGroup();
      return () => {
        if (!canGroup) return;
        column.toggleGrouping();
      };
    };
    column.getAutoAggregationFn = () => {
      const firstRow = table.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "number") {
        return aggregationFns.sum;
      }
      if (Object.prototype.toString.call(value) === "[object Date]") {
        return aggregationFns.extent;
      }
    };
    column.getAggregationFn = () => {
      var _table$options$aggreg, _table$options$aggreg2;
      if (!column) {
        throw new Error();
      }
      return isFunction(column.columnDef.aggregationFn) ? column.columnDef.aggregationFn : column.columnDef.aggregationFn === "auto" ? column.getAutoAggregationFn() : (_table$options$aggreg = (_table$options$aggreg2 = table.options.aggregationFns) == null ? void 0 : _table$options$aggreg2[column.columnDef.aggregationFn]) != null ? _table$options$aggreg : aggregationFns[column.columnDef.aggregationFn];
    };
  },
  createTable: (table) => {
    table.setGrouping = (updater) => table.options.onGroupingChange == null ? void 0 : table.options.onGroupingChange(updater);
    table.resetGrouping = (defaultState) => {
      var _table$initialState$g, _table$initialState;
      table.setGrouping(defaultState ? [] : (_table$initialState$g = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.grouping) != null ? _table$initialState$g : []);
    };
    table.getPreGroupedRowModel = () => table.getFilteredRowModel();
    table.getGroupedRowModel = () => {
      if (!table._getGroupedRowModel && table.options.getGroupedRowModel) {
        table._getGroupedRowModel = table.options.getGroupedRowModel(table);
      }
      if (table.options.manualGrouping || !table._getGroupedRowModel) {
        return table.getPreGroupedRowModel();
      }
      return table._getGroupedRowModel();
    };
  },
  createRow: (row, table) => {
    row.getIsGrouped = () => !!row.groupingColumnId;
    row.getGroupingValue = (columnId) => {
      if (row._groupingValuesCache.hasOwnProperty(columnId)) {
        return row._groupingValuesCache[columnId];
      }
      const column = table.getColumn(columnId);
      if (!(column != null && column.columnDef.getGroupingValue)) {
        return row.getValue(columnId);
      }
      row._groupingValuesCache[columnId] = column.columnDef.getGroupingValue(row.original);
      return row._groupingValuesCache[columnId];
    };
    row._groupingValuesCache = {};
  },
  createCell: (cell, column, row, table) => {
    cell.getIsGrouped = () => column.getIsGrouped() && column.id === row.groupingColumnId;
    cell.getIsPlaceholder = () => !cell.getIsGrouped() && column.getIsGrouped();
    cell.getIsAggregated = () => {
      var _row$subRows;
      return !cell.getIsGrouped() && !cell.getIsPlaceholder() && !!((_row$subRows = row.subRows) != null && _row$subRows.length);
    };
  }
};
function orderColumns(leafColumns, grouping, groupedColumnMode) {
  if (!(grouping != null && grouping.length) || !groupedColumnMode) {
    return leafColumns;
  }
  const nonGroupingColumns = leafColumns.filter((col) => !grouping.includes(col.id));
  if (groupedColumnMode === "remove") {
    return nonGroupingColumns;
  }
  const groupingColumns = grouping.map((g) => leafColumns.find((col) => col.id === g)).filter(Boolean);
  return [...groupingColumns, ...nonGroupingColumns];
}
var ColumnOrdering = {
  getInitialState: (state) => {
    return {
      columnOrder: [],
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnOrderChange: makeStateUpdater("columnOrder", table)
    };
  },
  createColumn: (column, table) => {
    column.getIndex = memo((position) => [_getVisibleLeafColumns(table, position)], (columns) => columns.findIndex((d) => d.id === column.id), getMemoOptions(table.options, "debugColumns", "getIndex"));
    column.getIsFirstColumn = (position) => {
      var _columns$;
      const columns = _getVisibleLeafColumns(table, position);
      return ((_columns$ = columns[0]) == null ? void 0 : _columns$.id) === column.id;
    };
    column.getIsLastColumn = (position) => {
      var _columns;
      const columns = _getVisibleLeafColumns(table, position);
      return ((_columns = columns[columns.length - 1]) == null ? void 0 : _columns.id) === column.id;
    };
  },
  createTable: (table) => {
    table.setColumnOrder = (updater) => table.options.onColumnOrderChange == null ? void 0 : table.options.onColumnOrderChange(updater);
    table.resetColumnOrder = (defaultState) => {
      var _table$initialState$c;
      table.setColumnOrder(defaultState ? [] : (_table$initialState$c = table.initialState.columnOrder) != null ? _table$initialState$c : []);
    };
    table._getOrderColumnsFn = memo(() => [table.getState().columnOrder, table.getState().grouping, table.options.groupedColumnMode], (columnOrder, grouping, groupedColumnMode) => (columns) => {
      let orderedColumns = [];
      if (!(columnOrder != null && columnOrder.length)) {
        orderedColumns = columns;
      } else {
        const columnOrderCopy = [...columnOrder];
        const columnsCopy = [...columns];
        while (columnsCopy.length && columnOrderCopy.length) {
          const targetColumnId = columnOrderCopy.shift();
          const foundIndex = columnsCopy.findIndex((d) => d.id === targetColumnId);
          if (foundIndex > -1) {
            orderedColumns.push(columnsCopy.splice(foundIndex, 1)[0]);
          }
        }
        orderedColumns = [...orderedColumns, ...columnsCopy];
      }
      return orderColumns(orderedColumns, grouping, groupedColumnMode);
    }, getMemoOptions(table.options, "debugTable", "_getOrderColumnsFn"));
  }
};
var getDefaultColumnPinningState = () => ({
  left: [],
  right: []
});
var ColumnPinning = {
  getInitialState: (state) => {
    return {
      columnPinning: getDefaultColumnPinningState(),
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnPinningChange: makeStateUpdater("columnPinning", table)
    };
  },
  createColumn: (column, table) => {
    column.pin = (position) => {
      const columnIds = column.getLeafColumns().map((d) => d.id).filter(Boolean);
      table.setColumnPinning((old) => {
        var _old$left3, _old$right3;
        if (position === "right") {
          var _old$left, _old$right;
          return {
            left: ((_old$left = old == null ? void 0 : old.left) != null ? _old$left : []).filter((d) => !(columnIds != null && columnIds.includes(d))),
            right: [...((_old$right = old == null ? void 0 : old.right) != null ? _old$right : []).filter((d) => !(columnIds != null && columnIds.includes(d))), ...columnIds]
          };
        }
        if (position === "left") {
          var _old$left2, _old$right2;
          return {
            left: [...((_old$left2 = old == null ? void 0 : old.left) != null ? _old$left2 : []).filter((d) => !(columnIds != null && columnIds.includes(d))), ...columnIds],
            right: ((_old$right2 = old == null ? void 0 : old.right) != null ? _old$right2 : []).filter((d) => !(columnIds != null && columnIds.includes(d)))
          };
        }
        return {
          left: ((_old$left3 = old == null ? void 0 : old.left) != null ? _old$left3 : []).filter((d) => !(columnIds != null && columnIds.includes(d))),
          right: ((_old$right3 = old == null ? void 0 : old.right) != null ? _old$right3 : []).filter((d) => !(columnIds != null && columnIds.includes(d)))
        };
      });
    };
    column.getCanPin = () => {
      const leafColumns = column.getLeafColumns();
      return leafColumns.some((d) => {
        var _d$columnDef$enablePi, _ref, _table$options$enable;
        return ((_d$columnDef$enablePi = d.columnDef.enablePinning) != null ? _d$columnDef$enablePi : true) && ((_ref = (_table$options$enable = table.options.enableColumnPinning) != null ? _table$options$enable : table.options.enablePinning) != null ? _ref : true);
      });
    };
    column.getIsPinned = () => {
      const leafColumnIds = column.getLeafColumns().map((d) => d.id);
      const {
        left,
        right
      } = table.getState().columnPinning;
      const isLeft = leafColumnIds.some((d) => left == null ? void 0 : left.includes(d));
      const isRight = leafColumnIds.some((d) => right == null ? void 0 : right.includes(d));
      return isLeft ? "left" : isRight ? "right" : false;
    };
    column.getPinnedIndex = () => {
      var _table$getState$colum, _table$getState$colum2;
      const position = column.getIsPinned();
      return position ? (_table$getState$colum = (_table$getState$colum2 = table.getState().columnPinning) == null || (_table$getState$colum2 = _table$getState$colum2[position]) == null ? void 0 : _table$getState$colum2.indexOf(column.id)) != null ? _table$getState$colum : -1 : 0;
    };
  },
  createRow: (row, table) => {
    row.getCenterVisibleCells = memo(() => [row._getAllVisibleCells(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allCells, left, right) => {
      const leftAndRight = [...left != null ? left : [], ...right != null ? right : []];
      return allCells.filter((d) => !leftAndRight.includes(d.column.id));
    }, getMemoOptions(table.options, "debugRows", "getCenterVisibleCells"));
    row.getLeftVisibleCells = memo(() => [row._getAllVisibleCells(), table.getState().columnPinning.left], (allCells, left) => {
      const cells = (left != null ? left : []).map((columnId) => allCells.find((cell) => cell.column.id === columnId)).filter(Boolean).map((d) => ({
        ...d,
        position: "left"
      }));
      return cells;
    }, getMemoOptions(table.options, "debugRows", "getLeftVisibleCells"));
    row.getRightVisibleCells = memo(() => [row._getAllVisibleCells(), table.getState().columnPinning.right], (allCells, right) => {
      const cells = (right != null ? right : []).map((columnId) => allCells.find((cell) => cell.column.id === columnId)).filter(Boolean).map((d) => ({
        ...d,
        position: "right"
      }));
      return cells;
    }, getMemoOptions(table.options, "debugRows", "getRightVisibleCells"));
  },
  createTable: (table) => {
    table.setColumnPinning = (updater) => table.options.onColumnPinningChange == null ? void 0 : table.options.onColumnPinningChange(updater);
    table.resetColumnPinning = (defaultState) => {
      var _table$initialState$c, _table$initialState;
      return table.setColumnPinning(defaultState ? getDefaultColumnPinningState() : (_table$initialState$c = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.columnPinning) != null ? _table$initialState$c : getDefaultColumnPinningState());
    };
    table.getIsSomeColumnsPinned = (position) => {
      var _pinningState$positio;
      const pinningState = table.getState().columnPinning;
      if (!position) {
        var _pinningState$left, _pinningState$right;
        return Boolean(((_pinningState$left = pinningState.left) == null ? void 0 : _pinningState$left.length) || ((_pinningState$right = pinningState.right) == null ? void 0 : _pinningState$right.length));
      }
      return Boolean((_pinningState$positio = pinningState[position]) == null ? void 0 : _pinningState$positio.length);
    };
    table.getLeftLeafColumns = memo(() => [table.getAllLeafColumns(), table.getState().columnPinning.left], (allColumns, left) => {
      return (left != null ? left : []).map((columnId) => allColumns.find((column) => column.id === columnId)).filter(Boolean);
    }, getMemoOptions(table.options, "debugColumns", "getLeftLeafColumns"));
    table.getRightLeafColumns = memo(() => [table.getAllLeafColumns(), table.getState().columnPinning.right], (allColumns, right) => {
      return (right != null ? right : []).map((columnId) => allColumns.find((column) => column.id === columnId)).filter(Boolean);
    }, getMemoOptions(table.options, "debugColumns", "getRightLeafColumns"));
    table.getCenterLeafColumns = memo(() => [table.getAllLeafColumns(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allColumns, left, right) => {
      const leftAndRight = [...left != null ? left : [], ...right != null ? right : []];
      return allColumns.filter((d) => !leftAndRight.includes(d.id));
    }, getMemoOptions(table.options, "debugColumns", "getCenterLeafColumns"));
  }
};
function safelyAccessDocument(_document) {
  return _document || (typeof document !== "undefined" ? document : null);
}
var defaultColumnSizing = {
  size: 150,
  minSize: 20,
  maxSize: Number.MAX_SAFE_INTEGER
};
var getDefaultColumnSizingInfoState = () => ({
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: []
});
var ColumnSizing = {
  getDefaultColumnDef: () => {
    return defaultColumnSizing;
  },
  getInitialState: (state) => {
    return {
      columnSizing: {},
      columnSizingInfo: getDefaultColumnSizingInfoState(),
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      columnResizeMode: "onEnd",
      columnResizeDirection: "ltr",
      onColumnSizingChange: makeStateUpdater("columnSizing", table),
      onColumnSizingInfoChange: makeStateUpdater("columnSizingInfo", table)
    };
  },
  createColumn: (column, table) => {
    column.getSize = () => {
      var _column$columnDef$min, _ref, _column$columnDef$max;
      const columnSize = table.getState().columnSizing[column.id];
      return Math.min(Math.max((_column$columnDef$min = column.columnDef.minSize) != null ? _column$columnDef$min : defaultColumnSizing.minSize, (_ref = columnSize != null ? columnSize : column.columnDef.size) != null ? _ref : defaultColumnSizing.size), (_column$columnDef$max = column.columnDef.maxSize) != null ? _column$columnDef$max : defaultColumnSizing.maxSize);
    };
    column.getStart = memo((position) => [position, _getVisibleLeafColumns(table, position), table.getState().columnSizing], (position, columns) => columns.slice(0, column.getIndex(position)).reduce((sum2, column2) => sum2 + column2.getSize(), 0), getMemoOptions(table.options, "debugColumns", "getStart"));
    column.getAfter = memo((position) => [position, _getVisibleLeafColumns(table, position), table.getState().columnSizing], (position, columns) => columns.slice(column.getIndex(position) + 1).reduce((sum2, column2) => sum2 + column2.getSize(), 0), getMemoOptions(table.options, "debugColumns", "getAfter"));
    column.resetSize = () => {
      table.setColumnSizing((_ref2) => {
        let {
          [column.id]: _,
          ...rest
        } = _ref2;
        return rest;
      });
    };
    column.getCanResize = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableResizing) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableColumnResizing) != null ? _table$options$enable : true);
    };
    column.getIsResizing = () => {
      return table.getState().columnSizingInfo.isResizingColumn === column.id;
    };
  },
  createHeader: (header, table) => {
    header.getSize = () => {
      let sum2 = 0;
      const recurse = (header2) => {
        if (header2.subHeaders.length) {
          header2.subHeaders.forEach(recurse);
        } else {
          var _header$column$getSiz;
          sum2 += (_header$column$getSiz = header2.column.getSize()) != null ? _header$column$getSiz : 0;
        }
      };
      recurse(header);
      return sum2;
    };
    header.getStart = () => {
      if (header.index > 0) {
        const prevSiblingHeader = header.headerGroup.headers[header.index - 1];
        return prevSiblingHeader.getStart() + prevSiblingHeader.getSize();
      }
      return 0;
    };
    header.getResizeHandler = (_contextDocument) => {
      const column = table.getColumn(header.column.id);
      const canResize = column == null ? void 0 : column.getCanResize();
      return (e) => {
        if (!column || !canResize) {
          return;
        }
        e.persist == null || e.persist();
        if (isTouchStartEvent(e)) {
          if (e.touches && e.touches.length > 1) {
            return;
          }
        }
        const startSize = header.getSize();
        const columnSizingStart = header ? header.getLeafHeaders().map((d) => [d.column.id, d.column.getSize()]) : [[column.id, column.getSize()]];
        const clientX = isTouchStartEvent(e) ? Math.round(e.touches[0].clientX) : e.clientX;
        const newColumnSizing = {};
        const updateOffset = (eventType, clientXPos) => {
          if (typeof clientXPos !== "number") {
            return;
          }
          table.setColumnSizingInfo((old) => {
            var _old$startOffset, _old$startSize;
            const deltaDirection = table.options.columnResizeDirection === "rtl" ? -1 : 1;
            const deltaOffset = (clientXPos - ((_old$startOffset = old == null ? void 0 : old.startOffset) != null ? _old$startOffset : 0)) * deltaDirection;
            const deltaPercentage = Math.max(deltaOffset / ((_old$startSize = old == null ? void 0 : old.startSize) != null ? _old$startSize : 0), -0.999999);
            old.columnSizingStart.forEach((_ref3) => {
              let [columnId, headerSize] = _ref3;
              newColumnSizing[columnId] = Math.round(Math.max(headerSize + headerSize * deltaPercentage, 0) * 100) / 100;
            });
            return {
              ...old,
              deltaOffset,
              deltaPercentage
            };
          });
          if (table.options.columnResizeMode === "onChange" || eventType === "end") {
            table.setColumnSizing((old) => ({
              ...old,
              ...newColumnSizing
            }));
          }
        };
        const onMove = (clientXPos) => updateOffset("move", clientXPos);
        const onEnd = (clientXPos) => {
          updateOffset("end", clientXPos);
          table.setColumnSizingInfo((old) => ({
            ...old,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
            deltaOffset: null,
            deltaPercentage: null,
            columnSizingStart: []
          }));
        };
        const contextDocument = safelyAccessDocument(_contextDocument);
        const mouseEvents = {
          moveHandler: (e2) => onMove(e2.clientX),
          upHandler: (e2) => {
            contextDocument == null || contextDocument.removeEventListener("mousemove", mouseEvents.moveHandler);
            contextDocument == null || contextDocument.removeEventListener("mouseup", mouseEvents.upHandler);
            onEnd(e2.clientX);
          }
        };
        const touchEvents = {
          moveHandler: (e2) => {
            if (e2.cancelable) {
              e2.preventDefault();
              e2.stopPropagation();
            }
            onMove(e2.touches[0].clientX);
            return false;
          },
          upHandler: (e2) => {
            var _e$touches$;
            contextDocument == null || contextDocument.removeEventListener("touchmove", touchEvents.moveHandler);
            contextDocument == null || contextDocument.removeEventListener("touchend", touchEvents.upHandler);
            if (e2.cancelable) {
              e2.preventDefault();
              e2.stopPropagation();
            }
            onEnd((_e$touches$ = e2.touches[0]) == null ? void 0 : _e$touches$.clientX);
          }
        };
        const passiveIfSupported = passiveEventSupported() ? {
          passive: false
        } : false;
        if (isTouchStartEvent(e)) {
          contextDocument == null || contextDocument.addEventListener("touchmove", touchEvents.moveHandler, passiveIfSupported);
          contextDocument == null || contextDocument.addEventListener("touchend", touchEvents.upHandler, passiveIfSupported);
        } else {
          contextDocument == null || contextDocument.addEventListener("mousemove", mouseEvents.moveHandler, passiveIfSupported);
          contextDocument == null || contextDocument.addEventListener("mouseup", mouseEvents.upHandler, passiveIfSupported);
        }
        table.setColumnSizingInfo((old) => ({
          ...old,
          startOffset: clientX,
          startSize,
          deltaOffset: 0,
          deltaPercentage: 0,
          columnSizingStart,
          isResizingColumn: column.id
        }));
      };
    };
  },
  createTable: (table) => {
    table.setColumnSizing = (updater) => table.options.onColumnSizingChange == null ? void 0 : table.options.onColumnSizingChange(updater);
    table.setColumnSizingInfo = (updater) => table.options.onColumnSizingInfoChange == null ? void 0 : table.options.onColumnSizingInfoChange(updater);
    table.resetColumnSizing = (defaultState) => {
      var _table$initialState$c;
      table.setColumnSizing(defaultState ? {} : (_table$initialState$c = table.initialState.columnSizing) != null ? _table$initialState$c : {});
    };
    table.resetHeaderSizeInfo = (defaultState) => {
      var _table$initialState$c2;
      table.setColumnSizingInfo(defaultState ? getDefaultColumnSizingInfoState() : (_table$initialState$c2 = table.initialState.columnSizingInfo) != null ? _table$initialState$c2 : getDefaultColumnSizingInfoState());
    };
    table.getTotalSize = () => {
      var _table$getHeaderGroup, _table$getHeaderGroup2;
      return (_table$getHeaderGroup = (_table$getHeaderGroup2 = table.getHeaderGroups()[0]) == null ? void 0 : _table$getHeaderGroup2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getHeaderGroup : 0;
    };
    table.getLeftTotalSize = () => {
      var _table$getLeftHeaderG, _table$getLeftHeaderG2;
      return (_table$getLeftHeaderG = (_table$getLeftHeaderG2 = table.getLeftHeaderGroups()[0]) == null ? void 0 : _table$getLeftHeaderG2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getLeftHeaderG : 0;
    };
    table.getCenterTotalSize = () => {
      var _table$getCenterHeade, _table$getCenterHeade2;
      return (_table$getCenterHeade = (_table$getCenterHeade2 = table.getCenterHeaderGroups()[0]) == null ? void 0 : _table$getCenterHeade2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getCenterHeade : 0;
    };
    table.getRightTotalSize = () => {
      var _table$getRightHeader, _table$getRightHeader2;
      return (_table$getRightHeader = (_table$getRightHeader2 = table.getRightHeaderGroups()[0]) == null ? void 0 : _table$getRightHeader2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getRightHeader : 0;
    };
  }
};
var passiveSupported = null;
function passiveEventSupported() {
  if (typeof passiveSupported === "boolean") return passiveSupported;
  let supported = false;
  try {
    const options = {
      get passive() {
        supported = true;
        return false;
      }
    };
    const noop = () => {
    };
    window.addEventListener("test", noop, options);
    window.removeEventListener("test", noop);
  } catch (err) {
    supported = false;
  }
  passiveSupported = supported;
  return passiveSupported;
}
function isTouchStartEvent(e) {
  return e.type === "touchstart";
}
var ColumnVisibility = {
  getInitialState: (state) => {
    return {
      columnVisibility: {},
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnVisibilityChange: makeStateUpdater("columnVisibility", table)
    };
  },
  createColumn: (column, table) => {
    column.toggleVisibility = (value) => {
      if (column.getCanHide()) {
        table.setColumnVisibility((old) => ({
          ...old,
          [column.id]: value != null ? value : !column.getIsVisible()
        }));
      }
    };
    column.getIsVisible = () => {
      var _ref, _table$getState$colum;
      const childColumns = column.columns;
      return (_ref = childColumns.length ? childColumns.some((c) => c.getIsVisible()) : (_table$getState$colum = table.getState().columnVisibility) == null ? void 0 : _table$getState$colum[column.id]) != null ? _ref : true;
    };
    column.getCanHide = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableHiding) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableHiding) != null ? _table$options$enable : true);
    };
    column.getToggleVisibilityHandler = () => {
      return (e) => {
        column.toggleVisibility == null || column.toggleVisibility(e.target.checked);
      };
    };
  },
  createRow: (row, table) => {
    row._getAllVisibleCells = memo(() => [row.getAllCells(), table.getState().columnVisibility], (cells) => {
      return cells.filter((cell) => cell.column.getIsVisible());
    }, getMemoOptions(table.options, "debugRows", "_getAllVisibleCells"));
    row.getVisibleCells = memo(() => [row.getLeftVisibleCells(), row.getCenterVisibleCells(), row.getRightVisibleCells()], (left, center, right) => [...left, ...center, ...right], getMemoOptions(table.options, "debugRows", "getVisibleCells"));
  },
  createTable: (table) => {
    const makeVisibleColumnsMethod = (key, getColumns) => {
      return memo(() => [getColumns(), getColumns().filter((d) => d.getIsVisible()).map((d) => d.id).join("_")], (columns) => {
        return columns.filter((d) => d.getIsVisible == null ? void 0 : d.getIsVisible());
      }, getMemoOptions(table.options, "debugColumns", key));
    };
    table.getVisibleFlatColumns = makeVisibleColumnsMethod("getVisibleFlatColumns", () => table.getAllFlatColumns());
    table.getVisibleLeafColumns = makeVisibleColumnsMethod("getVisibleLeafColumns", () => table.getAllLeafColumns());
    table.getLeftVisibleLeafColumns = makeVisibleColumnsMethod("getLeftVisibleLeafColumns", () => table.getLeftLeafColumns());
    table.getRightVisibleLeafColumns = makeVisibleColumnsMethod("getRightVisibleLeafColumns", () => table.getRightLeafColumns());
    table.getCenterVisibleLeafColumns = makeVisibleColumnsMethod("getCenterVisibleLeafColumns", () => table.getCenterLeafColumns());
    table.setColumnVisibility = (updater) => table.options.onColumnVisibilityChange == null ? void 0 : table.options.onColumnVisibilityChange(updater);
    table.resetColumnVisibility = (defaultState) => {
      var _table$initialState$c;
      table.setColumnVisibility(defaultState ? {} : (_table$initialState$c = table.initialState.columnVisibility) != null ? _table$initialState$c : {});
    };
    table.toggleAllColumnsVisible = (value) => {
      var _value;
      value = (_value = value) != null ? _value : !table.getIsAllColumnsVisible();
      table.setColumnVisibility(table.getAllLeafColumns().reduce((obj, column) => ({
        ...obj,
        [column.id]: !value ? !(column.getCanHide != null && column.getCanHide()) : value
      }), {}));
    };
    table.getIsAllColumnsVisible = () => !table.getAllLeafColumns().some((column) => !(column.getIsVisible != null && column.getIsVisible()));
    table.getIsSomeColumnsVisible = () => table.getAllLeafColumns().some((column) => column.getIsVisible == null ? void 0 : column.getIsVisible());
    table.getToggleAllColumnsVisibilityHandler = () => {
      return (e) => {
        var _target;
        table.toggleAllColumnsVisible((_target = e.target) == null ? void 0 : _target.checked);
      };
    };
  }
};
function _getVisibleLeafColumns(table, position) {
  return !position ? table.getVisibleLeafColumns() : position === "center" ? table.getCenterVisibleLeafColumns() : position === "left" ? table.getLeftVisibleLeafColumns() : table.getRightVisibleLeafColumns();
}
var GlobalFaceting = {
  createTable: (table) => {
    table._getGlobalFacetedRowModel = table.options.getFacetedRowModel && table.options.getFacetedRowModel(table, "__global__");
    table.getGlobalFacetedRowModel = () => {
      if (table.options.manualFiltering || !table._getGlobalFacetedRowModel) {
        return table.getPreFilteredRowModel();
      }
      return table._getGlobalFacetedRowModel();
    };
    table._getGlobalFacetedUniqueValues = table.options.getFacetedUniqueValues && table.options.getFacetedUniqueValues(table, "__global__");
    table.getGlobalFacetedUniqueValues = () => {
      if (!table._getGlobalFacetedUniqueValues) {
        return /* @__PURE__ */ new Map();
      }
      return table._getGlobalFacetedUniqueValues();
    };
    table._getGlobalFacetedMinMaxValues = table.options.getFacetedMinMaxValues && table.options.getFacetedMinMaxValues(table, "__global__");
    table.getGlobalFacetedMinMaxValues = () => {
      if (!table._getGlobalFacetedMinMaxValues) {
        return;
      }
      return table._getGlobalFacetedMinMaxValues();
    };
  }
};
var GlobalFiltering = {
  getInitialState: (state) => {
    return {
      globalFilter: void 0,
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onGlobalFilterChange: makeStateUpdater("globalFilter", table),
      globalFilterFn: "auto",
      getColumnCanGlobalFilter: (column) => {
        var _table$getCoreRowMode;
        const value = (_table$getCoreRowMode = table.getCoreRowModel().flatRows[0]) == null || (_table$getCoreRowMode = _table$getCoreRowMode._getAllCellsByColumnId()[column.id]) == null ? void 0 : _table$getCoreRowMode.getValue();
        return typeof value === "string" || typeof value === "number";
      }
    };
  },
  createColumn: (column, table) => {
    column.getCanGlobalFilter = () => {
      var _column$columnDef$ena, _table$options$enable, _table$options$enable2, _table$options$getCol;
      return ((_column$columnDef$ena = column.columnDef.enableGlobalFilter) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableGlobalFilter) != null ? _table$options$enable : true) && ((_table$options$enable2 = table.options.enableFilters) != null ? _table$options$enable2 : true) && ((_table$options$getCol = table.options.getColumnCanGlobalFilter == null ? void 0 : table.options.getColumnCanGlobalFilter(column)) != null ? _table$options$getCol : true) && !!column.accessorFn;
    };
  },
  createTable: (table) => {
    table.getGlobalAutoFilterFn = () => {
      return filterFns.includesString;
    };
    table.getGlobalFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      const {
        globalFilterFn
      } = table.options;
      return isFunction(globalFilterFn) ? globalFilterFn : globalFilterFn === "auto" ? table.getGlobalAutoFilterFn() : (_table$options$filter = (_table$options$filter2 = table.options.filterFns) == null ? void 0 : _table$options$filter2[globalFilterFn]) != null ? _table$options$filter : filterFns[globalFilterFn];
    };
    table.setGlobalFilter = (updater) => {
      table.options.onGlobalFilterChange == null || table.options.onGlobalFilterChange(updater);
    };
    table.resetGlobalFilter = (defaultState) => {
      table.setGlobalFilter(defaultState ? void 0 : table.initialState.globalFilter);
    };
  }
};
var RowExpanding = {
  getInitialState: (state) => {
    return {
      expanded: {},
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onExpandedChange: makeStateUpdater("expanded", table),
      paginateExpandedRows: true
    };
  },
  createTable: (table) => {
    let registered = false;
    let queued = false;
    table._autoResetExpanded = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table._queue(() => {
          registered = true;
        });
        return;
      }
      if ((_ref = (_table$options$autoRe = table.options.autoResetAll) != null ? _table$options$autoRe : table.options.autoResetExpanded) != null ? _ref : !table.options.manualExpanding) {
        if (queued) return;
        queued = true;
        table._queue(() => {
          table.resetExpanded();
          queued = false;
        });
      }
    };
    table.setExpanded = (updater) => table.options.onExpandedChange == null ? void 0 : table.options.onExpandedChange(updater);
    table.toggleAllRowsExpanded = (expanded) => {
      if (expanded != null ? expanded : !table.getIsAllRowsExpanded()) {
        table.setExpanded(true);
      } else {
        table.setExpanded({});
      }
    };
    table.resetExpanded = (defaultState) => {
      var _table$initialState$e, _table$initialState;
      table.setExpanded(defaultState ? {} : (_table$initialState$e = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.expanded) != null ? _table$initialState$e : {});
    };
    table.getCanSomeRowsExpand = () => {
      return table.getPrePaginationRowModel().flatRows.some((row) => row.getCanExpand());
    };
    table.getToggleAllRowsExpandedHandler = () => {
      return (e) => {
        e.persist == null || e.persist();
        table.toggleAllRowsExpanded();
      };
    };
    table.getIsSomeRowsExpanded = () => {
      const expanded = table.getState().expanded;
      return expanded === true || Object.values(expanded).some(Boolean);
    };
    table.getIsAllRowsExpanded = () => {
      const expanded = table.getState().expanded;
      if (typeof expanded === "boolean") {
        return expanded === true;
      }
      if (!Object.keys(expanded).length) {
        return false;
      }
      if (table.getRowModel().flatRows.some((row) => !row.getIsExpanded())) {
        return false;
      }
      return true;
    };
    table.getExpandedDepth = () => {
      let maxDepth = 0;
      const rowIds = table.getState().expanded === true ? Object.keys(table.getRowModel().rowsById) : Object.keys(table.getState().expanded);
      rowIds.forEach((id) => {
        const splitId = id.split(".");
        maxDepth = Math.max(maxDepth, splitId.length);
      });
      return maxDepth;
    };
    table.getPreExpandedRowModel = () => table.getSortedRowModel();
    table.getExpandedRowModel = () => {
      if (!table._getExpandedRowModel && table.options.getExpandedRowModel) {
        table._getExpandedRowModel = table.options.getExpandedRowModel(table);
      }
      if (table.options.manualExpanding || !table._getExpandedRowModel) {
        return table.getPreExpandedRowModel();
      }
      return table._getExpandedRowModel();
    };
  },
  createRow: (row, table) => {
    row.toggleExpanded = (expanded) => {
      table.setExpanded((old) => {
        var _expanded;
        const exists = old === true ? true : !!(old != null && old[row.id]);
        let oldExpanded = {};
        if (old === true) {
          Object.keys(table.getRowModel().rowsById).forEach((rowId) => {
            oldExpanded[rowId] = true;
          });
        } else {
          oldExpanded = old;
        }
        expanded = (_expanded = expanded) != null ? _expanded : !exists;
        if (!exists && expanded) {
          return {
            ...oldExpanded,
            [row.id]: true
          };
        }
        if (exists && !expanded) {
          const {
            [row.id]: _,
            ...rest
          } = oldExpanded;
          return rest;
        }
        return old;
      });
    };
    row.getIsExpanded = () => {
      var _table$options$getIsR;
      const expanded = table.getState().expanded;
      return !!((_table$options$getIsR = table.options.getIsRowExpanded == null ? void 0 : table.options.getIsRowExpanded(row)) != null ? _table$options$getIsR : expanded === true || (expanded == null ? void 0 : expanded[row.id]));
    };
    row.getCanExpand = () => {
      var _table$options$getRow, _table$options$enable, _row$subRows;
      return (_table$options$getRow = table.options.getRowCanExpand == null ? void 0 : table.options.getRowCanExpand(row)) != null ? _table$options$getRow : ((_table$options$enable = table.options.enableExpanding) != null ? _table$options$enable : true) && !!((_row$subRows = row.subRows) != null && _row$subRows.length);
    };
    row.getIsAllParentsExpanded = () => {
      let isFullyExpanded = true;
      let currentRow = row;
      while (isFullyExpanded && currentRow.parentId) {
        currentRow = table.getRow(currentRow.parentId, true);
        isFullyExpanded = currentRow.getIsExpanded();
      }
      return isFullyExpanded;
    };
    row.getToggleExpandedHandler = () => {
      const canExpand = row.getCanExpand();
      return () => {
        if (!canExpand) return;
        row.toggleExpanded();
      };
    };
  }
};
var defaultPageIndex = 0;
var defaultPageSize = 10;
var getDefaultPaginationState = () => ({
  pageIndex: defaultPageIndex,
  pageSize: defaultPageSize
});
var RowPagination = {
  getInitialState: (state) => {
    return {
      ...state,
      pagination: {
        ...getDefaultPaginationState(),
        ...state == null ? void 0 : state.pagination
      }
    };
  },
  getDefaultOptions: (table) => {
    return {
      onPaginationChange: makeStateUpdater("pagination", table)
    };
  },
  createTable: (table) => {
    let registered = false;
    let queued = false;
    table._autoResetPageIndex = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table._queue(() => {
          registered = true;
        });
        return;
      }
      if ((_ref = (_table$options$autoRe = table.options.autoResetAll) != null ? _table$options$autoRe : table.options.autoResetPageIndex) != null ? _ref : !table.options.manualPagination) {
        if (queued) return;
        queued = true;
        table._queue(() => {
          table.resetPageIndex();
          queued = false;
        });
      }
    };
    table.setPagination = (updater) => {
      const safeUpdater = (old) => {
        let newState = functionalUpdate(updater, old);
        return newState;
      };
      return table.options.onPaginationChange == null ? void 0 : table.options.onPaginationChange(safeUpdater);
    };
    table.resetPagination = (defaultState) => {
      var _table$initialState$p;
      table.setPagination(defaultState ? getDefaultPaginationState() : (_table$initialState$p = table.initialState.pagination) != null ? _table$initialState$p : getDefaultPaginationState());
    };
    table.setPageIndex = (updater) => {
      table.setPagination((old) => {
        let pageIndex = functionalUpdate(updater, old.pageIndex);
        const maxPageIndex = typeof table.options.pageCount === "undefined" || table.options.pageCount === -1 ? Number.MAX_SAFE_INTEGER : table.options.pageCount - 1;
        pageIndex = Math.max(0, Math.min(pageIndex, maxPageIndex));
        return {
          ...old,
          pageIndex
        };
      });
    };
    table.resetPageIndex = (defaultState) => {
      var _table$initialState$p2, _table$initialState;
      table.setPageIndex(defaultState ? defaultPageIndex : (_table$initialState$p2 = (_table$initialState = table.initialState) == null || (_table$initialState = _table$initialState.pagination) == null ? void 0 : _table$initialState.pageIndex) != null ? _table$initialState$p2 : defaultPageIndex);
    };
    table.resetPageSize = (defaultState) => {
      var _table$initialState$p3, _table$initialState2;
      table.setPageSize(defaultState ? defaultPageSize : (_table$initialState$p3 = (_table$initialState2 = table.initialState) == null || (_table$initialState2 = _table$initialState2.pagination) == null ? void 0 : _table$initialState2.pageSize) != null ? _table$initialState$p3 : defaultPageSize);
    };
    table.setPageSize = (updater) => {
      table.setPagination((old) => {
        const pageSize = Math.max(1, functionalUpdate(updater, old.pageSize));
        const topRowIndex = old.pageSize * old.pageIndex;
        const pageIndex = Math.floor(topRowIndex / pageSize);
        return {
          ...old,
          pageIndex,
          pageSize
        };
      });
    };
    table.setPageCount = (updater) => table.setPagination((old) => {
      var _table$options$pageCo;
      let newPageCount = functionalUpdate(updater, (_table$options$pageCo = table.options.pageCount) != null ? _table$options$pageCo : -1);
      if (typeof newPageCount === "number") {
        newPageCount = Math.max(-1, newPageCount);
      }
      return {
        ...old,
        pageCount: newPageCount
      };
    });
    table.getPageOptions = memo(() => [table.getPageCount()], (pageCount) => {
      let pageOptions = [];
      if (pageCount && pageCount > 0) {
        pageOptions = [...new Array(pageCount)].fill(null).map((_, i) => i);
      }
      return pageOptions;
    }, getMemoOptions(table.options, "debugTable", "getPageOptions"));
    table.getCanPreviousPage = () => table.getState().pagination.pageIndex > 0;
    table.getCanNextPage = () => {
      const {
        pageIndex
      } = table.getState().pagination;
      const pageCount = table.getPageCount();
      if (pageCount === -1) {
        return true;
      }
      if (pageCount === 0) {
        return false;
      }
      return pageIndex < pageCount - 1;
    };
    table.previousPage = () => {
      return table.setPageIndex((old) => old - 1);
    };
    table.nextPage = () => {
      return table.setPageIndex((old) => {
        return old + 1;
      });
    };
    table.firstPage = () => {
      return table.setPageIndex(0);
    };
    table.lastPage = () => {
      return table.setPageIndex(table.getPageCount() - 1);
    };
    table.getPrePaginationRowModel = () => table.getExpandedRowModel();
    table.getPaginationRowModel = () => {
      if (!table._getPaginationRowModel && table.options.getPaginationRowModel) {
        table._getPaginationRowModel = table.options.getPaginationRowModel(table);
      }
      if (table.options.manualPagination || !table._getPaginationRowModel) {
        return table.getPrePaginationRowModel();
      }
      return table._getPaginationRowModel();
    };
    table.getPageCount = () => {
      var _table$options$pageCo2;
      return (_table$options$pageCo2 = table.options.pageCount) != null ? _table$options$pageCo2 : Math.ceil(table.getRowCount() / table.getState().pagination.pageSize);
    };
    table.getRowCount = () => {
      var _table$options$rowCou;
      return (_table$options$rowCou = table.options.rowCount) != null ? _table$options$rowCou : table.getPrePaginationRowModel().rows.length;
    };
  }
};
var getDefaultRowPinningState = () => ({
  top: [],
  bottom: []
});
var RowPinning = {
  getInitialState: (state) => {
    return {
      rowPinning: getDefaultRowPinningState(),
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onRowPinningChange: makeStateUpdater("rowPinning", table)
    };
  },
  createRow: (row, table) => {
    row.pin = (position, includeLeafRows, includeParentRows) => {
      const leafRowIds = includeLeafRows ? row.getLeafRows().map((_ref) => {
        let {
          id
        } = _ref;
        return id;
      }) : [];
      const parentRowIds = includeParentRows ? row.getParentRows().map((_ref2) => {
        let {
          id
        } = _ref2;
        return id;
      }) : [];
      const rowIds = /* @__PURE__ */ new Set([...parentRowIds, row.id, ...leafRowIds]);
      table.setRowPinning((old) => {
        var _old$top3, _old$bottom3;
        if (position === "bottom") {
          var _old$top, _old$bottom;
          return {
            top: ((_old$top = old == null ? void 0 : old.top) != null ? _old$top : []).filter((d) => !(rowIds != null && rowIds.has(d))),
            bottom: [...((_old$bottom = old == null ? void 0 : old.bottom) != null ? _old$bottom : []).filter((d) => !(rowIds != null && rowIds.has(d))), ...Array.from(rowIds)]
          };
        }
        if (position === "top") {
          var _old$top2, _old$bottom2;
          return {
            top: [...((_old$top2 = old == null ? void 0 : old.top) != null ? _old$top2 : []).filter((d) => !(rowIds != null && rowIds.has(d))), ...Array.from(rowIds)],
            bottom: ((_old$bottom2 = old == null ? void 0 : old.bottom) != null ? _old$bottom2 : []).filter((d) => !(rowIds != null && rowIds.has(d)))
          };
        }
        return {
          top: ((_old$top3 = old == null ? void 0 : old.top) != null ? _old$top3 : []).filter((d) => !(rowIds != null && rowIds.has(d))),
          bottom: ((_old$bottom3 = old == null ? void 0 : old.bottom) != null ? _old$bottom3 : []).filter((d) => !(rowIds != null && rowIds.has(d)))
        };
      });
    };
    row.getCanPin = () => {
      var _ref3;
      const {
        enableRowPinning,
        enablePinning
      } = table.options;
      if (typeof enableRowPinning === "function") {
        return enableRowPinning(row);
      }
      return (_ref3 = enableRowPinning != null ? enableRowPinning : enablePinning) != null ? _ref3 : true;
    };
    row.getIsPinned = () => {
      const rowIds = [row.id];
      const {
        top,
        bottom
      } = table.getState().rowPinning;
      const isTop = rowIds.some((d) => top == null ? void 0 : top.includes(d));
      const isBottom = rowIds.some((d) => bottom == null ? void 0 : bottom.includes(d));
      return isTop ? "top" : isBottom ? "bottom" : false;
    };
    row.getPinnedIndex = () => {
      var _ref4, _visiblePinnedRowIds$;
      const position = row.getIsPinned();
      if (!position) return -1;
      const visiblePinnedRowIds = (_ref4 = position === "top" ? table.getTopRows() : table.getBottomRows()) == null ? void 0 : _ref4.map((_ref5) => {
        let {
          id
        } = _ref5;
        return id;
      });
      return (_visiblePinnedRowIds$ = visiblePinnedRowIds == null ? void 0 : visiblePinnedRowIds.indexOf(row.id)) != null ? _visiblePinnedRowIds$ : -1;
    };
  },
  createTable: (table) => {
    table.setRowPinning = (updater) => table.options.onRowPinningChange == null ? void 0 : table.options.onRowPinningChange(updater);
    table.resetRowPinning = (defaultState) => {
      var _table$initialState$r, _table$initialState;
      return table.setRowPinning(defaultState ? getDefaultRowPinningState() : (_table$initialState$r = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.rowPinning) != null ? _table$initialState$r : getDefaultRowPinningState());
    };
    table.getIsSomeRowsPinned = (position) => {
      var _pinningState$positio;
      const pinningState = table.getState().rowPinning;
      if (!position) {
        var _pinningState$top, _pinningState$bottom;
        return Boolean(((_pinningState$top = pinningState.top) == null ? void 0 : _pinningState$top.length) || ((_pinningState$bottom = pinningState.bottom) == null ? void 0 : _pinningState$bottom.length));
      }
      return Boolean((_pinningState$positio = pinningState[position]) == null ? void 0 : _pinningState$positio.length);
    };
    table._getPinnedRows = (visibleRows, pinnedRowIds, position) => {
      var _table$options$keepPi;
      const rows = ((_table$options$keepPi = table.options.keepPinnedRows) != null ? _table$options$keepPi : true) ? (
        //get all rows that are pinned even if they would not be otherwise visible
        //account for expanded parent rows, but not pagination or filtering
        (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) => {
          const row = table.getRow(rowId, true);
          return row.getIsAllParentsExpanded() ? row : null;
        })
      ) : (
        //else get only visible rows that are pinned
        (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) => visibleRows.find((row) => row.id === rowId))
      );
      return rows.filter(Boolean).map((d) => ({
        ...d,
        position
      }));
    };
    table.getTopRows = memo(() => [table.getRowModel().rows, table.getState().rowPinning.top], (allRows, topPinnedRowIds) => table._getPinnedRows(allRows, topPinnedRowIds, "top"), getMemoOptions(table.options, "debugRows", "getTopRows"));
    table.getBottomRows = memo(() => [table.getRowModel().rows, table.getState().rowPinning.bottom], (allRows, bottomPinnedRowIds) => table._getPinnedRows(allRows, bottomPinnedRowIds, "bottom"), getMemoOptions(table.options, "debugRows", "getBottomRows"));
    table.getCenterRows = memo(() => [table.getRowModel().rows, table.getState().rowPinning.top, table.getState().rowPinning.bottom], (allRows, top, bottom) => {
      const topAndBottom = /* @__PURE__ */ new Set([...top != null ? top : [], ...bottom != null ? bottom : []]);
      return allRows.filter((d) => !topAndBottom.has(d.id));
    }, getMemoOptions(table.options, "debugRows", "getCenterRows"));
  }
};
var RowSelection = {
  getInitialState: (state) => {
    return {
      rowSelection: {},
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onRowSelectionChange: makeStateUpdater("rowSelection", table),
      enableRowSelection: true,
      enableMultiRowSelection: true,
      enableSubRowSelection: true
      // enableGroupingRowSelection: false,
      // isAdditiveSelectEvent: (e: unknown) => !!e.metaKey,
      // isInclusiveSelectEvent: (e: unknown) => !!e.shiftKey,
    };
  },
  createTable: (table) => {
    table.setRowSelection = (updater) => table.options.onRowSelectionChange == null ? void 0 : table.options.onRowSelectionChange(updater);
    table.resetRowSelection = (defaultState) => {
      var _table$initialState$r;
      return table.setRowSelection(defaultState ? {} : (_table$initialState$r = table.initialState.rowSelection) != null ? _table$initialState$r : {});
    };
    table.toggleAllRowsSelected = (value) => {
      table.setRowSelection((old) => {
        value = typeof value !== "undefined" ? value : !table.getIsAllRowsSelected();
        const rowSelection = {
          ...old
        };
        const preGroupedFlatRows = table.getPreGroupedRowModel().flatRows;
        if (value) {
          preGroupedFlatRows.forEach((row) => {
            if (!row.getCanSelect()) {
              return;
            }
            rowSelection[row.id] = true;
          });
        } else {
          preGroupedFlatRows.forEach((row) => {
            delete rowSelection[row.id];
          });
        }
        return rowSelection;
      });
    };
    table.toggleAllPageRowsSelected = (value) => table.setRowSelection((old) => {
      const resolvedValue = typeof value !== "undefined" ? value : !table.getIsAllPageRowsSelected();
      const rowSelection = {
        ...old
      };
      table.getRowModel().rows.forEach((row) => {
        mutateRowIsSelected(rowSelection, row.id, resolvedValue, true, table);
      });
      return rowSelection;
    });
    table.getPreSelectedRowModel = () => table.getCoreRowModel();
    table.getSelectedRowModel = memo(() => [table.getState().rowSelection, table.getCoreRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table, rowModel);
    }, getMemoOptions(table.options, "debugTable", "getSelectedRowModel"));
    table.getFilteredSelectedRowModel = memo(() => [table.getState().rowSelection, table.getFilteredRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table, rowModel);
    }, getMemoOptions(table.options, "debugTable", "getFilteredSelectedRowModel"));
    table.getGroupedSelectedRowModel = memo(() => [table.getState().rowSelection, table.getSortedRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table, rowModel);
    }, getMemoOptions(table.options, "debugTable", "getGroupedSelectedRowModel"));
    table.getIsAllRowsSelected = () => {
      const preGroupedFlatRows = table.getFilteredRowModel().flatRows;
      const {
        rowSelection
      } = table.getState();
      let isAllRowsSelected = Boolean(preGroupedFlatRows.length && Object.keys(rowSelection).length);
      if (isAllRowsSelected) {
        if (preGroupedFlatRows.some((row) => row.getCanSelect() && !rowSelection[row.id])) {
          isAllRowsSelected = false;
        }
      }
      return isAllRowsSelected;
    };
    table.getIsAllPageRowsSelected = () => {
      const paginationFlatRows = table.getPaginationRowModel().flatRows.filter((row) => row.getCanSelect());
      const {
        rowSelection
      } = table.getState();
      let isAllPageRowsSelected = !!paginationFlatRows.length;
      if (isAllPageRowsSelected && paginationFlatRows.some((row) => !rowSelection[row.id])) {
        isAllPageRowsSelected = false;
      }
      return isAllPageRowsSelected;
    };
    table.getIsSomeRowsSelected = () => {
      var _table$getState$rowSe;
      const totalSelected = Object.keys((_table$getState$rowSe = table.getState().rowSelection) != null ? _table$getState$rowSe : {}).length;
      return totalSelected > 0 && totalSelected < table.getFilteredRowModel().flatRows.length;
    };
    table.getIsSomePageRowsSelected = () => {
      const paginationFlatRows = table.getPaginationRowModel().flatRows;
      return table.getIsAllPageRowsSelected() ? false : paginationFlatRows.filter((row) => row.getCanSelect()).some((d) => d.getIsSelected() || d.getIsSomeSelected());
    };
    table.getToggleAllRowsSelectedHandler = () => {
      return (e) => {
        table.toggleAllRowsSelected(e.target.checked);
      };
    };
    table.getToggleAllPageRowsSelectedHandler = () => {
      return (e) => {
        table.toggleAllPageRowsSelected(e.target.checked);
      };
    };
  },
  createRow: (row, table) => {
    row.toggleSelected = (value, opts) => {
      const isSelected = row.getIsSelected();
      table.setRowSelection((old) => {
        var _opts$selectChildren;
        value = typeof value !== "undefined" ? value : !isSelected;
        if (row.getCanSelect() && isSelected === value) {
          return old;
        }
        const selectedRowIds = {
          ...old
        };
        mutateRowIsSelected(selectedRowIds, row.id, value, (_opts$selectChildren = opts == null ? void 0 : opts.selectChildren) != null ? _opts$selectChildren : true, table);
        return selectedRowIds;
      });
    };
    row.getIsSelected = () => {
      const {
        rowSelection
      } = table.getState();
      return isRowSelected(row, rowSelection);
    };
    row.getIsSomeSelected = () => {
      const {
        rowSelection
      } = table.getState();
      return isSubRowSelected(row, rowSelection) === "some";
    };
    row.getIsAllSubRowsSelected = () => {
      const {
        rowSelection
      } = table.getState();
      return isSubRowSelected(row, rowSelection) === "all";
    };
    row.getCanSelect = () => {
      var _table$options$enable;
      if (typeof table.options.enableRowSelection === "function") {
        return table.options.enableRowSelection(row);
      }
      return (_table$options$enable = table.options.enableRowSelection) != null ? _table$options$enable : true;
    };
    row.getCanSelectSubRows = () => {
      var _table$options$enable2;
      if (typeof table.options.enableSubRowSelection === "function") {
        return table.options.enableSubRowSelection(row);
      }
      return (_table$options$enable2 = table.options.enableSubRowSelection) != null ? _table$options$enable2 : true;
    };
    row.getCanMultiSelect = () => {
      var _table$options$enable3;
      if (typeof table.options.enableMultiRowSelection === "function") {
        return table.options.enableMultiRowSelection(row);
      }
      return (_table$options$enable3 = table.options.enableMultiRowSelection) != null ? _table$options$enable3 : true;
    };
    row.getToggleSelectedHandler = () => {
      const canSelect = row.getCanSelect();
      return (e) => {
        var _target;
        if (!canSelect) return;
        row.toggleSelected((_target = e.target) == null ? void 0 : _target.checked);
      };
    };
  }
};
var mutateRowIsSelected = (selectedRowIds, id, value, includeChildren, table) => {
  var _row$subRows;
  const row = table.getRow(id, true);
  if (value) {
    if (!row.getCanMultiSelect()) {
      Object.keys(selectedRowIds).forEach((key) => delete selectedRowIds[key]);
    }
    if (row.getCanSelect()) {
      selectedRowIds[id] = true;
    }
  } else {
    delete selectedRowIds[id];
  }
  if (includeChildren && (_row$subRows = row.subRows) != null && _row$subRows.length && row.getCanSelectSubRows()) {
    row.subRows.forEach((row2) => mutateRowIsSelected(selectedRowIds, row2.id, value, includeChildren, table));
  }
};
function selectRowsFn(table, rowModel) {
  const rowSelection = table.getState().rowSelection;
  const newSelectedFlatRows = [];
  const newSelectedRowsById = {};
  const recurseRows = function(rows, depth) {
    return rows.map((row) => {
      var _row$subRows2;
      const isSelected = isRowSelected(row, rowSelection);
      if (isSelected) {
        newSelectedFlatRows.push(row);
        newSelectedRowsById[row.id] = row;
      }
      if ((_row$subRows2 = row.subRows) != null && _row$subRows2.length) {
        row = {
          ...row,
          subRows: recurseRows(row.subRows)
        };
      }
      if (isSelected) {
        return row;
      }
    }).filter(Boolean);
  };
  return {
    rows: recurseRows(rowModel.rows),
    flatRows: newSelectedFlatRows,
    rowsById: newSelectedRowsById
  };
}
function isRowSelected(row, selection) {
  var _selection$row$id;
  return (_selection$row$id = selection[row.id]) != null ? _selection$row$id : false;
}
function isSubRowSelected(row, selection, table) {
  var _row$subRows3;
  if (!((_row$subRows3 = row.subRows) != null && _row$subRows3.length)) return false;
  let allChildrenSelected = true;
  let someSelected = false;
  row.subRows.forEach((subRow) => {
    if (someSelected && !allChildrenSelected) {
      return;
    }
    if (subRow.getCanSelect()) {
      if (isRowSelected(subRow, selection)) {
        someSelected = true;
      } else {
        allChildrenSelected = false;
      }
    }
    if (subRow.subRows && subRow.subRows.length) {
      const subRowChildrenSelected = isSubRowSelected(subRow, selection);
      if (subRowChildrenSelected === "all") {
        someSelected = true;
      } else if (subRowChildrenSelected === "some") {
        someSelected = true;
        allChildrenSelected = false;
      } else {
        allChildrenSelected = false;
      }
    }
  });
  return allChildrenSelected ? "all" : someSelected ? "some" : false;
}
var reSplitAlphaNumeric = /([0-9]+)/gm;
var alphanumeric = (rowA, rowB, columnId) => {
  return compareAlphanumeric(toString(rowA.getValue(columnId)).toLowerCase(), toString(rowB.getValue(columnId)).toLowerCase());
};
var alphanumericCaseSensitive = (rowA, rowB, columnId) => {
  return compareAlphanumeric(toString(rowA.getValue(columnId)), toString(rowB.getValue(columnId)));
};
var text = (rowA, rowB, columnId) => {
  return compareBasic(toString(rowA.getValue(columnId)).toLowerCase(), toString(rowB.getValue(columnId)).toLowerCase());
};
var textCaseSensitive = (rowA, rowB, columnId) => {
  return compareBasic(toString(rowA.getValue(columnId)), toString(rowB.getValue(columnId)));
};
var datetime = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId);
  const b2 = rowB.getValue(columnId);
  return a > b2 ? 1 : a < b2 ? -1 : 0;
};
var basic = (rowA, rowB, columnId) => {
  return compareBasic(rowA.getValue(columnId), rowB.getValue(columnId));
};
function compareBasic(a, b2) {
  return a === b2 ? 0 : a > b2 ? 1 : -1;
}
function toString(a) {
  if (typeof a === "number") {
    if (isNaN(a) || a === Infinity || a === -Infinity) {
      return "";
    }
    return String(a);
  }
  if (typeof a === "string") {
    return a;
  }
  return "";
}
function compareAlphanumeric(aStr, bStr) {
  const a = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b2 = bStr.split(reSplitAlphaNumeric).filter(Boolean);
  while (a.length && b2.length) {
    const aa = a.shift();
    const bb = b2.shift();
    const an = parseInt(aa, 10);
    const bn = parseInt(bb, 10);
    const combo = [an, bn].sort();
    if (isNaN(combo[0])) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }
    if (isNaN(combo[1])) {
      return isNaN(an) ? -1 : 1;
    }
    if (an > bn) {
      return 1;
    }
    if (bn > an) {
      return -1;
    }
  }
  return a.length - b2.length;
}
var sortingFns = {
  alphanumeric,
  alphanumericCaseSensitive,
  text,
  textCaseSensitive,
  datetime,
  basic
};
var RowSorting = {
  getInitialState: (state) => {
    return {
      sorting: [],
      ...state
    };
  },
  getDefaultColumnDef: () => {
    return {
      sortingFn: "auto",
      sortUndefined: 1
    };
  },
  getDefaultOptions: (table) => {
    return {
      onSortingChange: makeStateUpdater("sorting", table),
      isMultiSortEvent: (e) => {
        return e.shiftKey;
      }
    };
  },
  createColumn: (column, table) => {
    column.getAutoSortingFn = () => {
      const firstRows = table.getFilteredRowModel().flatRows.slice(10);
      let isString = false;
      for (const row of firstRows) {
        const value = row == null ? void 0 : row.getValue(column.id);
        if (Object.prototype.toString.call(value) === "[object Date]") {
          return sortingFns.datetime;
        }
        if (typeof value === "string") {
          isString = true;
          if (value.split(reSplitAlphaNumeric).length > 1) {
            return sortingFns.alphanumeric;
          }
        }
      }
      if (isString) {
        return sortingFns.text;
      }
      return sortingFns.basic;
    };
    column.getAutoSortDir = () => {
      const firstRow = table.getFilteredRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return "asc";
      }
      return "desc";
    };
    column.getSortingFn = () => {
      var _table$options$sortin, _table$options$sortin2;
      if (!column) {
        throw new Error();
      }
      return isFunction(column.columnDef.sortingFn) ? column.columnDef.sortingFn : column.columnDef.sortingFn === "auto" ? column.getAutoSortingFn() : (_table$options$sortin = (_table$options$sortin2 = table.options.sortingFns) == null ? void 0 : _table$options$sortin2[column.columnDef.sortingFn]) != null ? _table$options$sortin : sortingFns[column.columnDef.sortingFn];
    };
    column.toggleSorting = (desc, multi) => {
      const nextSortingOrder = column.getNextSortingOrder();
      const hasManualValue = typeof desc !== "undefined" && desc !== null;
      table.setSorting((old) => {
        const existingSorting = old == null ? void 0 : old.find((d) => d.id === column.id);
        const existingIndex = old == null ? void 0 : old.findIndex((d) => d.id === column.id);
        let newSorting = [];
        let sortAction;
        let nextDesc = hasManualValue ? desc : nextSortingOrder === "desc";
        if (old != null && old.length && column.getCanMultiSort() && multi) {
          if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "add";
          }
        } else {
          if (old != null && old.length && existingIndex !== old.length - 1) {
            sortAction = "replace";
          } else if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "replace";
          }
        }
        if (sortAction === "toggle") {
          if (!hasManualValue) {
            if (!nextSortingOrder) {
              sortAction = "remove";
            }
          }
        }
        if (sortAction === "add") {
          var _table$options$maxMul;
          newSorting = [...old, {
            id: column.id,
            desc: nextDesc
          }];
          newSorting.splice(0, newSorting.length - ((_table$options$maxMul = table.options.maxMultiSortColCount) != null ? _table$options$maxMul : Number.MAX_SAFE_INTEGER));
        } else if (sortAction === "toggle") {
          newSorting = old.map((d) => {
            if (d.id === column.id) {
              return {
                ...d,
                desc: nextDesc
              };
            }
            return d;
          });
        } else if (sortAction === "remove") {
          newSorting = old.filter((d) => d.id !== column.id);
        } else {
          newSorting = [{
            id: column.id,
            desc: nextDesc
          }];
        }
        return newSorting;
      });
    };
    column.getFirstSortDir = () => {
      var _ref, _column$columnDef$sor;
      const sortDescFirst = (_ref = (_column$columnDef$sor = column.columnDef.sortDescFirst) != null ? _column$columnDef$sor : table.options.sortDescFirst) != null ? _ref : column.getAutoSortDir() === "desc";
      return sortDescFirst ? "desc" : "asc";
    };
    column.getNextSortingOrder = (multi) => {
      var _table$options$enable, _table$options$enable2;
      const firstSortDirection = column.getFirstSortDir();
      const isSorted = column.getIsSorted();
      if (!isSorted) {
        return firstSortDirection;
      }
      if (isSorted !== firstSortDirection && ((_table$options$enable = table.options.enableSortingRemoval) != null ? _table$options$enable : true) && // If enableSortRemove, enable in general
      (multi ? (_table$options$enable2 = table.options.enableMultiRemove) != null ? _table$options$enable2 : true : true)) {
        return false;
      }
      return isSorted === "desc" ? "asc" : "desc";
    };
    column.getCanSort = () => {
      var _column$columnDef$ena, _table$options$enable3;
      return ((_column$columnDef$ena = column.columnDef.enableSorting) != null ? _column$columnDef$ena : true) && ((_table$options$enable3 = table.options.enableSorting) != null ? _table$options$enable3 : true) && !!column.accessorFn;
    };
    column.getCanMultiSort = () => {
      var _ref2, _column$columnDef$ena2;
      return (_ref2 = (_column$columnDef$ena2 = column.columnDef.enableMultiSort) != null ? _column$columnDef$ena2 : table.options.enableMultiSort) != null ? _ref2 : !!column.accessorFn;
    };
    column.getIsSorted = () => {
      var _table$getState$sorti;
      const columnSort = (_table$getState$sorti = table.getState().sorting) == null ? void 0 : _table$getState$sorti.find((d) => d.id === column.id);
      return !columnSort ? false : columnSort.desc ? "desc" : "asc";
    };
    column.getSortIndex = () => {
      var _table$getState$sorti2, _table$getState$sorti3;
      return (_table$getState$sorti2 = (_table$getState$sorti3 = table.getState().sorting) == null ? void 0 : _table$getState$sorti3.findIndex((d) => d.id === column.id)) != null ? _table$getState$sorti2 : -1;
    };
    column.clearSorting = () => {
      table.setSorting((old) => old != null && old.length ? old.filter((d) => d.id !== column.id) : []);
    };
    column.getToggleSortingHandler = () => {
      const canSort = column.getCanSort();
      return (e) => {
        if (!canSort) return;
        e.persist == null || e.persist();
        column.toggleSorting == null || column.toggleSorting(void 0, column.getCanMultiSort() ? table.options.isMultiSortEvent == null ? void 0 : table.options.isMultiSortEvent(e) : false);
      };
    };
  },
  createTable: (table) => {
    table.setSorting = (updater) => table.options.onSortingChange == null ? void 0 : table.options.onSortingChange(updater);
    table.resetSorting = (defaultState) => {
      var _table$initialState$s, _table$initialState;
      table.setSorting(defaultState ? [] : (_table$initialState$s = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.sorting) != null ? _table$initialState$s : []);
    };
    table.getPreSortedRowModel = () => table.getGroupedRowModel();
    table.getSortedRowModel = () => {
      if (!table._getSortedRowModel && table.options.getSortedRowModel) {
        table._getSortedRowModel = table.options.getSortedRowModel(table);
      }
      if (table.options.manualSorting || !table._getSortedRowModel) {
        return table.getPreSortedRowModel();
      }
      return table._getSortedRowModel();
    };
  }
};
var builtInFeatures = [
  Headers,
  ColumnVisibility,
  ColumnOrdering,
  ColumnPinning,
  ColumnFaceting,
  ColumnFiltering,
  GlobalFaceting,
  //depends on ColumnFaceting
  GlobalFiltering,
  //depends on ColumnFiltering
  RowSorting,
  ColumnGrouping,
  //depends on RowSorting
  RowExpanding,
  RowPagination,
  RowPinning,
  RowSelection,
  ColumnSizing
];
function createTable(options) {
  var _options$_features, _options$initialState;
  if (options.debugAll || options.debugTable) {
    console.info("Creating Table Instance...");
  }
  const _features = [...builtInFeatures, ...(_options$_features = options._features) != null ? _options$_features : []];
  let table = {
    _features
  };
  const defaultOptions = table._features.reduce((obj, feature) => {
    return Object.assign(obj, feature.getDefaultOptions == null ? void 0 : feature.getDefaultOptions(table));
  }, {});
  const mergeOptions = (options2) => {
    if (table.options.mergeOptions) {
      return table.options.mergeOptions(defaultOptions, options2);
    }
    return {
      ...defaultOptions,
      ...options2
    };
  };
  const coreInitialState = {};
  let initialState = {
    ...coreInitialState,
    ...(_options$initialState = options.initialState) != null ? _options$initialState : {}
  };
  table._features.forEach((feature) => {
    var _feature$getInitialSt;
    initialState = (_feature$getInitialSt = feature.getInitialState == null ? void 0 : feature.getInitialState(initialState)) != null ? _feature$getInitialSt : initialState;
  });
  const queued = [];
  let queuedTimeout = false;
  const coreInstance = {
    _features,
    options: {
      ...defaultOptions,
      ...options
    },
    initialState,
    _queue: (cb) => {
      queued.push(cb);
      if (!queuedTimeout) {
        queuedTimeout = true;
        Promise.resolve().then(() => {
          while (queued.length) {
            queued.shift()();
          }
          queuedTimeout = false;
        }).catch((error) => setTimeout(() => {
          throw error;
        }));
      }
    },
    reset: () => {
      table.setState(table.initialState);
    },
    setOptions: (updater) => {
      const newOptions = functionalUpdate(updater, table.options);
      table.options = mergeOptions(newOptions);
    },
    getState: () => {
      return table.options.state;
    },
    setState: (updater) => {
      table.options.onStateChange == null || table.options.onStateChange(updater);
    },
    _getRowId: (row, index, parent) => {
      var _table$options$getRow;
      return (_table$options$getRow = table.options.getRowId == null ? void 0 : table.options.getRowId(row, index, parent)) != null ? _table$options$getRow : `${parent ? [parent.id, index].join(".") : index}`;
    },
    getCoreRowModel: () => {
      if (!table._getCoreRowModel) {
        table._getCoreRowModel = table.options.getCoreRowModel(table);
      }
      return table._getCoreRowModel();
    },
    // The final calls start at the bottom of the model,
    // expanded rows, which then work their way up
    getRowModel: () => {
      return table.getPaginationRowModel();
    },
    //in next version, we should just pass in the row model as the optional 2nd arg
    getRow: (id, searchAll) => {
      let row = (searchAll ? table.getPrePaginationRowModel() : table.getRowModel()).rowsById[id];
      if (!row) {
        row = table.getCoreRowModel().rowsById[id];
        if (!row) {
          if (true) {
            throw new Error(`getRow could not find row with ID: ${id}`);
          }
          throw new Error();
        }
      }
      return row;
    },
    _getDefaultColumnDef: memo(() => [table.options.defaultColumn], (defaultColumn) => {
      var _defaultColumn;
      defaultColumn = (_defaultColumn = defaultColumn) != null ? _defaultColumn : {};
      return {
        header: (props) => {
          const resolvedColumnDef = props.header.column.columnDef;
          if (resolvedColumnDef.accessorKey) {
            return resolvedColumnDef.accessorKey;
          }
          if (resolvedColumnDef.accessorFn) {
            return resolvedColumnDef.id;
          }
          return null;
        },
        // footer: props => props.header.column.id,
        cell: (props) => {
          var _props$renderValue$to, _props$renderValue;
          return (_props$renderValue$to = (_props$renderValue = props.renderValue()) == null || _props$renderValue.toString == null ? void 0 : _props$renderValue.toString()) != null ? _props$renderValue$to : null;
        },
        ...table._features.reduce((obj, feature) => {
          return Object.assign(obj, feature.getDefaultColumnDef == null ? void 0 : feature.getDefaultColumnDef());
        }, {}),
        ...defaultColumn
      };
    }, getMemoOptions(options, "debugColumns", "_getDefaultColumnDef")),
    _getColumnDefs: () => table.options.columns,
    getAllColumns: memo(() => [table._getColumnDefs()], (columnDefs) => {
      const recurseColumns = function(columnDefs2, parent, depth) {
        if (depth === void 0) {
          depth = 0;
        }
        return columnDefs2.map((columnDef) => {
          const column = createColumn(table, columnDef, depth, parent);
          const groupingColumnDef = columnDef;
          column.columns = groupingColumnDef.columns ? recurseColumns(groupingColumnDef.columns, column, depth + 1) : [];
          return column;
        });
      };
      return recurseColumns(columnDefs);
    }, getMemoOptions(options, "debugColumns", "getAllColumns")),
    getAllFlatColumns: memo(() => [table.getAllColumns()], (allColumns) => {
      return allColumns.flatMap((column) => {
        return column.getFlatColumns();
      });
    }, getMemoOptions(options, "debugColumns", "getAllFlatColumns")),
    _getAllFlatColumnsById: memo(() => [table.getAllFlatColumns()], (flatColumns) => {
      return flatColumns.reduce((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {});
    }, getMemoOptions(options, "debugColumns", "getAllFlatColumnsById")),
    getAllLeafColumns: memo(() => [table.getAllColumns(), table._getOrderColumnsFn()], (allColumns, orderColumns2) => {
      let leafColumns = allColumns.flatMap((column) => column.getLeafColumns());
      return orderColumns2(leafColumns);
    }, getMemoOptions(options, "debugColumns", "getAllLeafColumns")),
    getColumn: (columnId) => {
      const column = table._getAllFlatColumnsById()[columnId];
      if (!column) {
        console.error(`[Table] Column with id '${columnId}' does not exist.`);
      }
      return column;
    }
  };
  Object.assign(table, coreInstance);
  for (let index = 0; index < table._features.length; index++) {
    const feature = table._features[index];
    feature == null || feature.createTable == null || feature.createTable(table);
  }
  return table;
}
function getCoreRowModel() {
  return (table) => memo(() => [table.options.data], (data) => {
    const rowModel = {
      rows: [],
      flatRows: [],
      rowsById: {}
    };
    const accessRows = function(originalRows, depth, parentRow) {
      if (depth === void 0) {
        depth = 0;
      }
      const rows = [];
      for (let i = 0; i < originalRows.length; i++) {
        const row = createRow(table, table._getRowId(originalRows[i], i, parentRow), originalRows[i], i, depth, void 0, parentRow == null ? void 0 : parentRow.id);
        rowModel.flatRows.push(row);
        rowModel.rowsById[row.id] = row;
        rows.push(row);
        if (table.options.getSubRows) {
          var _row$originalSubRows;
          row.originalSubRows = table.options.getSubRows(originalRows[i], i);
          if ((_row$originalSubRows = row.originalSubRows) != null && _row$originalSubRows.length) {
            row.subRows = accessRows(row.originalSubRows, depth + 1, row);
          }
        }
      }
      return rows;
    };
    rowModel.rows = accessRows(data);
    return rowModel;
  }, getMemoOptions(table.options, "debugTable", "getRowModel", () => table._autoResetPageIndex()));
}
function expandRows(rowModel) {
  const expandedRows = [];
  const handleRow = (row) => {
    var _row$subRows;
    expandedRows.push(row);
    if ((_row$subRows = row.subRows) != null && _row$subRows.length && row.getIsExpanded()) {
      row.subRows.forEach(handleRow);
    }
  };
  rowModel.rows.forEach(handleRow);
  return {
    rows: expandedRows,
    flatRows: rowModel.flatRows,
    rowsById: rowModel.rowsById
  };
}
function filterRows(rows, filterRowImpl, table) {
  if (table.options.filterFromLeafRows) {
    return filterRowModelFromLeafs(rows, filterRowImpl, table);
  }
  return filterRowModelFromRoot(rows, filterRowImpl, table);
}
function filterRowModelFromLeafs(rowsToFilter, filterRow, table) {
  var _table$options$maxLea;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea = table.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea : 100;
  const recurseFilterRows = function(rowsToFilter2, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    const rows = [];
    for (let i = 0; i < rowsToFilter2.length; i++) {
      var _row$subRows;
      let row = rowsToFilter2[i];
      const newRow = createRow(table, row.id, row.original, row.index, row.depth, void 0, row.parentId);
      newRow.columnFilters = row.columnFilters;
      if ((_row$subRows = row.subRows) != null && _row$subRows.length && depth < maxDepth) {
        newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
        row = newRow;
        if (filterRow(row) && !newRow.subRows.length) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
        if (filterRow(row) || newRow.subRows.length) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
      } else {
        row = newRow;
        if (filterRow(row)) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
        }
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function filterRowModelFromRoot(rowsToFilter, filterRow, table) {
  var _table$options$maxLea2;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea2 = table.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea2 : 100;
  const recurseFilterRows = function(rowsToFilter2, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    const rows = [];
    for (let i = 0; i < rowsToFilter2.length; i++) {
      let row = rowsToFilter2[i];
      const pass = filterRow(row);
      if (pass) {
        var _row$subRows2;
        if ((_row$subRows2 = row.subRows) != null && _row$subRows2.length && depth < maxDepth) {
          const newRow = createRow(table, row.id, row.original, row.index, row.depth, void 0, row.parentId);
          newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
          row = newRow;
        }
        rows.push(row);
        newFilteredFlatRows.push(row);
        newFilteredRowsById[row.id] = row;
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function getFilteredRowModel() {
  return (table) => memo(() => [table.getPreFilteredRowModel(), table.getState().columnFilters, table.getState().globalFilter], (rowModel, columnFilters, globalFilter) => {
    if (!rowModel.rows.length || !(columnFilters != null && columnFilters.length) && !globalFilter) {
      for (let i = 0; i < rowModel.flatRows.length; i++) {
        rowModel.flatRows[i].columnFilters = {};
        rowModel.flatRows[i].columnFiltersMeta = {};
      }
      return rowModel;
    }
    const resolvedColumnFilters = [];
    const resolvedGlobalFilters = [];
    (columnFilters != null ? columnFilters : []).forEach((d) => {
      var _filterFn$resolveFilt;
      const column = table.getColumn(d.id);
      if (!column) {
        return;
      }
      const filterFn = column.getFilterFn();
      if (!filterFn) {
        if (true) {
          console.warn(`Could not find a valid 'column.filterFn' for column with the ID: ${column.id}.`);
        }
        return;
      }
      resolvedColumnFilters.push({
        id: d.id,
        filterFn,
        resolvedValue: (_filterFn$resolveFilt = filterFn.resolveFilterValue == null ? void 0 : filterFn.resolveFilterValue(d.value)) != null ? _filterFn$resolveFilt : d.value
      });
    });
    const filterableIds = (columnFilters != null ? columnFilters : []).map((d) => d.id);
    const globalFilterFn = table.getGlobalFilterFn();
    const globallyFilterableColumns = table.getAllLeafColumns().filter((column) => column.getCanGlobalFilter());
    if (globalFilter && globalFilterFn && globallyFilterableColumns.length) {
      filterableIds.push("__global__");
      globallyFilterableColumns.forEach((column) => {
        var _globalFilterFn$resol;
        resolvedGlobalFilters.push({
          id: column.id,
          filterFn: globalFilterFn,
          resolvedValue: (_globalFilterFn$resol = globalFilterFn.resolveFilterValue == null ? void 0 : globalFilterFn.resolveFilterValue(globalFilter)) != null ? _globalFilterFn$resol : globalFilter
        });
      });
    }
    let currentColumnFilter;
    let currentGlobalFilter;
    for (let j2 = 0; j2 < rowModel.flatRows.length; j2++) {
      const row = rowModel.flatRows[j2];
      row.columnFilters = {};
      if (resolvedColumnFilters.length) {
        for (let i = 0; i < resolvedColumnFilters.length; i++) {
          currentColumnFilter = resolvedColumnFilters[i];
          const id = currentColumnFilter.id;
          row.columnFilters[id] = currentColumnFilter.filterFn(row, id, currentColumnFilter.resolvedValue, (filterMeta) => {
            row.columnFiltersMeta[id] = filterMeta;
          });
        }
      }
      if (resolvedGlobalFilters.length) {
        for (let i = 0; i < resolvedGlobalFilters.length; i++) {
          currentGlobalFilter = resolvedGlobalFilters[i];
          const id = currentGlobalFilter.id;
          if (currentGlobalFilter.filterFn(row, id, currentGlobalFilter.resolvedValue, (filterMeta) => {
            row.columnFiltersMeta[id] = filterMeta;
          })) {
            row.columnFilters.__global__ = true;
            break;
          }
        }
        if (row.columnFilters.__global__ !== true) {
          row.columnFilters.__global__ = false;
        }
      }
    }
    const filterRowsImpl = (row) => {
      for (let i = 0; i < filterableIds.length; i++) {
        if (row.columnFilters[filterableIds[i]] === false) {
          return false;
        }
      }
      return true;
    };
    return filterRows(rowModel.rows, filterRowsImpl, table);
  }, getMemoOptions(table.options, "debugTable", "getFilteredRowModel", () => table._autoResetPageIndex()));
}
function getPaginationRowModel(opts) {
  return (table) => memo(() => [table.getState().pagination, table.getPrePaginationRowModel(), table.options.paginateExpandedRows ? void 0 : table.getState().expanded], (pagination, rowModel) => {
    if (!rowModel.rows.length) {
      return rowModel;
    }
    const {
      pageSize,
      pageIndex
    } = pagination;
    let {
      rows,
      flatRows,
      rowsById
    } = rowModel;
    const pageStart = pageSize * pageIndex;
    const pageEnd = pageStart + pageSize;
    rows = rows.slice(pageStart, pageEnd);
    let paginatedRowModel;
    if (!table.options.paginateExpandedRows) {
      paginatedRowModel = expandRows({
        rows,
        flatRows,
        rowsById
      });
    } else {
      paginatedRowModel = {
        rows,
        flatRows,
        rowsById
      };
    }
    paginatedRowModel.flatRows = [];
    const handleRow = (row) => {
      paginatedRowModel.flatRows.push(row);
      if (row.subRows.length) {
        row.subRows.forEach(handleRow);
      }
    };
    paginatedRowModel.rows.forEach(handleRow);
    return paginatedRowModel;
  }, getMemoOptions(table.options, "debugTable", "getPaginationRowModel"));
}
function getSortedRowModel() {
  return (table) => memo(() => [table.getState().sorting, table.getPreSortedRowModel()], (sorting, rowModel) => {
    if (!rowModel.rows.length || !(sorting != null && sorting.length)) {
      return rowModel;
    }
    const sortingState = table.getState().sorting;
    const sortedFlatRows = [];
    const availableSorting = sortingState.filter((sort) => {
      var _table$getColumn;
      return (_table$getColumn = table.getColumn(sort.id)) == null ? void 0 : _table$getColumn.getCanSort();
    });
    const columnInfoById = {};
    availableSorting.forEach((sortEntry) => {
      const column = table.getColumn(sortEntry.id);
      if (!column) return;
      columnInfoById[sortEntry.id] = {
        sortUndefined: column.columnDef.sortUndefined,
        invertSorting: column.columnDef.invertSorting,
        sortingFn: column.getSortingFn()
      };
    });
    const sortData = (rows) => {
      const sortedData = rows.map((row) => ({
        ...row
      }));
      sortedData.sort((rowA, rowB) => {
        for (let i = 0; i < availableSorting.length; i += 1) {
          var _sortEntry$desc;
          const sortEntry = availableSorting[i];
          const columnInfo = columnInfoById[sortEntry.id];
          const sortUndefined = columnInfo.sortUndefined;
          const isDesc = (_sortEntry$desc = sortEntry == null ? void 0 : sortEntry.desc) != null ? _sortEntry$desc : false;
          let sortInt = 0;
          if (sortUndefined) {
            const aValue = rowA.getValue(sortEntry.id);
            const bValue = rowB.getValue(sortEntry.id);
            const aUndefined = aValue === void 0;
            const bUndefined = bValue === void 0;
            if (aUndefined || bUndefined) {
              if (sortUndefined === "first") return aUndefined ? -1 : 1;
              if (sortUndefined === "last") return aUndefined ? 1 : -1;
              sortInt = aUndefined && bUndefined ? 0 : aUndefined ? sortUndefined : -sortUndefined;
            }
          }
          if (sortInt === 0) {
            sortInt = columnInfo.sortingFn(rowA, rowB, sortEntry.id);
          }
          if (sortInt !== 0) {
            if (isDesc) {
              sortInt *= -1;
            }
            if (columnInfo.invertSorting) {
              sortInt *= -1;
            }
            return sortInt;
          }
        }
        return rowA.index - rowB.index;
      });
      sortedData.forEach((row) => {
        var _row$subRows;
        sortedFlatRows.push(row);
        if ((_row$subRows = row.subRows) != null && _row$subRows.length) {
          row.subRows = sortData(row.subRows);
        }
      });
      return sortedData;
    };
    return {
      rows: sortData(rowModel.rows),
      flatRows: sortedFlatRows,
      rowsById: rowModel.rowsById
    };
  }, getMemoOptions(table.options, "debugTable", "getSortedRowModel", () => table._autoResetPageIndex()));
}

// src/table/core/index.ts
function coerce(type, draft) {
  switch (type) {
    case "number": {
      const text2 = draft.trim();
      if (text2 === "") return { ok: true, value: null };
      const n = Number(text2);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
    }
    case "boolean":
      return { ok: true, value: draft === "true" || draft === "1" };
    default:
      return { ok: true, value: draft };
  }
}
function createTableCore(config) {
  const paginated = config.enablePagination ?? true;
  const pageSize = config.initialState?.pageSize ?? (paginated ? 10 : Number.POSITIVE_INFINITY);
  const getRowId = (row, index) => {
    if (config.getRowId) return config.getRowId(row, index);
    const id = row.id;
    return String(id ?? index);
  };
  const columnViews = config.columns.map((col) => ({
    id: col.id,
    header: col.header ?? col.id,
    editable: col.editable ?? col.accessorFn === void 0,
    type: col.type ?? "text",
    ...col.width !== void 0 ? { width: col.width } : {},
    ...col.align !== void 0 ? { align: col.align } : {}
  }));
  let rows = [...config.data];
  const tsState = {};
  const tsColumns = config.columns.map((col) => ({
    id: col.id,
    header: col.header ?? col.id,
    ...col.accessorKey !== void 0 ? { accessorKey: col.accessorKey } : {},
    ...col.accessorFn !== void 0 ? { accessorFn: col.accessorFn } : {}
  }));
  const table = createTable({
    data: rows,
    columns: tsColumns,
    state: tsState,
    onStateChange: (updater) => {
      Object.assign(
        tsState,
        typeof updater === "function" ? updater(tsState) : updater
      );
    },
    getRowId,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}
  });
  Object.assign(tsState, table.initialState, {
    sorting: [...config.initialState?.sorting ?? []],
    globalFilter: config.initialState?.globalFilter ?? "",
    pagination: {
      pageIndex: config.initialState?.pageIndex ?? 0,
      pageSize
    },
    rowSelection: {}
  });
  const undoHistory = config.undoHistory ?? null;
  let editing = null;
  let editDraft = null;
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function valueOf(row, columnId) {
    const col = config.columns.find((c) => c.id === columnId);
    if (!col) return void 0;
    if (col.accessorKey !== void 0) {
      return row[col.accessorKey];
    }
    return col.accessorFn ? col.accessorFn(row) : void 0;
  }
  function indexOfRow(rowId) {
    return rows.findIndex((row, i) => getRowId(row, i) === rowId);
  }
  function syncData() {
    table.setOptions((prev) => ({ ...prev, data: rows }));
    clampPage();
    refresh();
  }
  function clampPage() {
    if (!paginated) return;
    const pi = table.getState().pagination.pageIndex;
    const last = Math.max(0, table.getPageCount() - 1);
    if (pi > last) {
      table.setPagination({ ...table.getState().pagination, pageIndex: last });
    }
  }
  function cancelEditing() {
    if (editing === null) return false;
    editing = null;
    editDraft = null;
    return true;
  }
  function applyCellValue(rowId, columnId, value) {
    const index = indexOfRow(rowId);
    if (index === -1) return;
    const col = config.columns.find((c) => c.id === columnId);
    if (!col || col.accessorKey === void 0) return;
    const row = rows[index];
    rows = rows.map(
      (r, i) => i === index ? { ...row, [col.accessorKey]: value } : r
    );
    syncData();
  }
  function makeEditCommand(rowId, columnId, to, from, label) {
    const command = {
      label,
      execute: () => applyCellValue(rowId, columnId, to),
      invert: () => ({
        label,
        execute: () => applyCellValue(rowId, columnId, from),
        invert: () => command
      })
    };
    return command;
  }
  function deriveState2() {
    const rowModel = table.getRowModel();
    const pageRows = rowModel.rows;
    const filteredCount = table.getFilteredRowModel().rows.length;
    const selection = tsState.rowSelection;
    const selectedIds = Object.keys(selection).filter((id) => selection[id]);
    return {
      columns: columnViews,
      rows: pageRows.map(
        (r) => ({
          id: r.id,
          cells: Object.fromEntries(
            r.getVisibleCells().map((c) => [c.column.id, c.getValue()])
          ),
          selected: r.getIsSelected()
        })
      ),
      totalRows: filteredCount,
      pageCount: paginated ? table.getPageCount() : 1,
      pageIndex: paginated ? tsState.pagination.pageIndex : 0,
      pageSize: paginated ? tsState.pagination.pageSize : filteredCount,
      paginated,
      sorting: tsState.sorting.map((s) => ({ ...s })),
      globalFilter: tsState.globalFilter,
      selectedRows: selectedIds,
      allSelected: pageRows.length > 0 && pageRows.every((r) => r.getIsSelected()),
      someSelected: pageRows.some((r) => r.getIsSelected()),
      editing,
      editDraft,
      canUndo: undoHistory?.state.canUndo ?? false,
      canRedo: undoHistory?.state.canRedo ?? false
    };
  }
  let state = deriveState2();
  function refresh() {
    clampPage();
    state = deriveState2();
    notify();
  }
  if (undoHistory) {
    undoHistory.subscribe(() => {
      clampPage();
      state = deriveState2();
      notify();
    });
  }
  const actions = {
    sort: (columnId, dir) => {
      const cancelled = cancelEditing();
      const current = tsState.sorting[0];
      const next = (() => {
        if (dir !== void 0) {
          if (dir === "none") {
            return current?.id === columnId ? [] : tsState.sorting;
          }
          return [{ id: columnId, desc: dir === "desc" }];
        }
        if (!current || current.id !== columnId) {
          return [{ id: columnId, desc: false }];
        }
        if (current.desc) return [];
        return [{ id: columnId, desc: true }];
      })();
      if (JSON.stringify(next) === JSON.stringify(tsState.sorting)) {
        if (cancelled) refresh();
        return;
      }
      table.setSorting(next);
      table.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },
    clearSorting: () => {
      const cancelled = cancelEditing();
      if (tsState.sorting.length === 0) {
        if (cancelled) refresh();
        return;
      }
      table.setSorting([]);
      table.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },
    setGlobalFilter: (text2) => {
      const cancelled = cancelEditing();
      if (text2 === tsState.globalFilter) {
        if (cancelled) refresh();
        return;
      }
      table.setGlobalFilter(text2);
      table.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },
    setPageSize: (size) => {
      if (size <= 0 || !paginated) return;
      const cancelled = cancelEditing();
      if (size === tsState.pagination.pageSize) {
        if (cancelled) refresh();
        return;
      }
      table.setPageSize(size);
      clampPage();
      refresh();
    },
    nextPage: () => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      const last = Math.max(0, table.getPageCount() - 1);
      if (tsState.pagination.pageIndex >= last) {
        if (cancelled) refresh();
        return;
      }
      table.setPagination({ ...tsState.pagination, pageIndex: tsState.pagination.pageIndex + 1 });
      refresh();
    },
    previousPage: () => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      if (tsState.pagination.pageIndex <= 0) {
        if (cancelled) refresh();
        return;
      }
      table.setPagination({ ...tsState.pagination, pageIndex: tsState.pagination.pageIndex - 1 });
      refresh();
    },
    setPageIndex: (index) => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      const last = Math.max(0, table.getPageCount() - 1);
      const clamped = Math.max(0, Math.min(index, last));
      if (clamped === tsState.pagination.pageIndex) {
        if (cancelled) refresh();
        return;
      }
      table.setPagination({ ...tsState.pagination, pageIndex: clamped });
      refresh();
    },
    toggleRowSelected: (rowId, force) => {
      const row = table.getCoreRowModel().rows.find((r) => r.id === rowId);
      if (!row) return;
      if (force !== void 0 && force === row.getIsSelected()) return;
      row.toggleSelected(force);
      refresh();
    },
    toggleAllSelected: (force) => {
      const pageRows = table.getRowModel().rows;
      const target = force ?? !(pageRows.length > 0 && pageRows.every((r) => r.getIsSelected()));
      for (const row of pageRows) row.toggleSelected(target);
      refresh();
    },
    startEdit: (rowId, columnId) => {
      const col = columnViews.find((c) => c.id === columnId);
      if (!col || !col.editable) return;
      if (indexOfRow(rowId) === -1) return;
      editing = { rowId, columnId };
      editDraft = String(valueOf(rows[indexOfRow(rowId)], columnId) ?? "");
      refresh();
    },
    setEditDraft: (value) => {
      if (editing === null) return;
      if (value === editDraft) return;
      editDraft = value;
      refresh();
    },
    commitEdit: () => {
      if (editing === null) return false;
      const { rowId, columnId } = editing;
      const col = columnViews.find((c) => c.id === columnId);
      const index = indexOfRow(rowId);
      if (!col || index === -1) {
        cancelEditing();
        refresh();
        return false;
      }
      const row = rows[index];
      const oldValue = valueOf(row, columnId);
      const draft = editDraft ?? "";
      const coerced = coerce(col.type, draft);
      if (!coerced.ok) return false;
      if (coerced.value === oldValue) {
        cancelEditing();
        refresh();
        return true;
      }
      if (config.onCellEdit && config.onCellEdit(rowId, columnId, coerced.value, row) === false) {
        return false;
      }
      applyCellValue(rowId, columnId, coerced.value);
      if (undoHistory) {
        undoHistory.actions.push(
          makeEditCommand(
            rowId,
            columnId,
            coerced.value,
            oldValue,
            `Edit ${col.header}`
          )
        );
      }
      cancelEditing();
      refresh();
      return true;
    },
    cancelEdit: () => {
      if (editing === null) return;
      cancelEditing();
      refresh();
    },
    updateRow: (rowId, patch) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      rows = rows.map(
        (r, i) => i === index ? { ...r, ...patch } : r
      );
      syncData();
      return true;
    },
    addRow: (row) => {
      const id = getRowId(row, rows.length);
      rows = [...rows, row];
      syncData();
      if (undoHistory) {
        const command = {
          label: "Add row",
          execute: () => {
            rows = [...rows, row];
            syncData();
          },
          invert: () => ({
            label: "Remove row",
            execute: () => {
              rows = rows.filter((r) => r !== row);
              syncData();
            },
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return id;
    },
    removeRow: (rowId) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      const row = rows[index];
      if (editing?.rowId === rowId) cancelEditing();
      rows = rows.filter((_, i) => i !== index);
      syncData();
      if (undoHistory) {
        const command = {
          label: "Remove row",
          execute: () => {
            const i = indexOfRow(rowId);
            if (i === -1) return;
            rows = rows.filter((_, x2) => x2 !== i);
            syncData();
          },
          invert: () => ({
            label: "Add row",
            execute: () => {
              rows = [...rows.slice(0, index), row, ...rows.slice(index)];
              syncData();
            },
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return true;
    },
    undo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.undo();
    },
    redo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.redo();
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/undo-history/core/index.ts
function createUndoHistoryCore(config = {}) {
  const maxDepth = config.maxDepth ?? 100;
  const undoStack = [];
  const redoStack = [];
  const groupStack = [];
  let lastCoalesce = null;
  let state = deriveState2();
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function deriveState2() {
    const top = undoStack[undoStack.length - 1];
    const redoTop = redoStack[redoStack.length - 1];
    return {
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoCount: undoStack.length,
      redoCount: redoStack.length,
      undoLabel: top?.label ?? null,
      redoLabel: redoTop?.label ?? null
    };
  }
  function enforceDepth() {
    if (maxDepth <= 0) return;
    while (undoStack.length > maxDepth) undoStack.shift();
  }
  function commitEntry(entry) {
    undoStack.push(entry);
    enforceDepth();
    lastCoalesce = null;
    state = deriveState2();
    notify();
  }
  function commitGroup(label, commands) {
    if (commands.length === 0) return;
    commitEntry({
      commands,
      label: label ?? commands[0]?.label ?? null
    });
  }
  const actions = {
    push: (command, opts) => {
      redoStack.length = 0;
      if (groupStack.length > 0) {
        const frame = groupStack[groupStack.length - 1];
        if (!frame.label && command.label) frame.label = command.label;
        frame.commands.push(command);
        lastCoalesce = null;
        state = deriveState2();
        notify();
        return;
      }
      const key = opts?.coalesceKey ?? command.coalesceKey ?? command.label ?? null;
      const canCoalesce = key !== null && opts?.coalesce === true && lastCoalesce?.eligible === true && lastCoalesce.key === key;
      if (canCoalesce) {
        const top = undoStack[undoStack.length - 1];
        top.commands.push(command);
        if (!top.label && command.label) top.label = command.label;
        state = deriveState2();
        notify();
        return;
      }
      commitEntry({
        commands: [command],
        label: command.label ?? null,
        ...key !== null && opts?.coalesce === true ? { coalesceKey: key } : {}
      });
      lastCoalesce = key !== null ? { key, eligible: opts?.coalesce === true } : null;
    },
    pushGroup: (commands, label) => {
      if (commands.length === 0) return;
      redoStack.length = 0;
      commitGroup(label ?? null, commands);
    },
    beginGroup: (label) => {
      groupStack.push({ label: label ?? null, commands: [] });
      lastCoalesce = null;
      state = deriveState2();
      notify();
    },
    endGroup: () => {
      if (groupStack.length === 0) return;
      const frame = groupStack.pop();
      if (groupStack.length > 0) {
        const parent = groupStack[groupStack.length - 1];
        parent.commands.push(...frame.commands);
        if (!parent.label && frame.label) parent.label = frame.label;
        lastCoalesce = null;
        state = deriveState2();
        notify();
        return;
      }
      commitGroup(frame.label, frame.commands);
    },
    undo: () => {
      const entry = undoStack.pop();
      if (!entry) return false;
      for (let i = entry.commands.length - 1; i >= 0; i--) {
        const command = entry.commands[i];
        command.invert().execute();
      }
      redoStack.push(entry);
      lastCoalesce = null;
      state = deriveState2();
      notify();
      return true;
    },
    redo: () => {
      const entry = redoStack.pop();
      if (!entry) return false;
      for (const command of entry.commands) command.execute();
      undoStack.push(entry);
      enforceDepth();
      lastCoalesce = null;
      state = deriveState2();
      notify();
      return true;
    },
    clear: () => {
      undoStack.length = 0;
      redoStack.length = 0;
      groupStack.length = 0;
      lastCoalesce = null;
      state = deriveState2();
      notify();
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/dom.ts
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k2, v2] of Object.entries(attrs)) {
    if (v2 === void 0 || v2 === null || v2 === false) continue;
    if (k2 === "class") node.className = String(v2);
    else if (k2 === "style") node.setAttribute("style", String(v2));
    else if (k2.startsWith("on") && typeof v2 === "function") {
      node.addEventListener(k2.slice(2), v2);
    } else if (v2 === true) node.setAttribute(k2, "");
    else node.setAttribute(k2, String(v2));
  }
  for (const c of children) {
    if (c === null || c === void 0) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

// src/inspector/entries/table.ts
var TASKS = [
  { id: "t1", title: "Ship the composer wedge", status: "todo", priority: 1, owner: "trent" },
  { id: "t2", title: "Iroh sync flake on reconnect", status: "doing", priority: 3, owner: "trent" },
  { id: "t3", title: "EQL-S window functions", status: "todo", priority: 2, owner: "ada" },
  { id: "t4", title: "ADR 0034 wedge smoke test", status: "done", priority: 1, owner: "trent" },
  { id: "t5", title: "Migrate studio to headless cores", status: "todo", priority: 2, owner: "ada" },
  { id: "t6", title: "Op-log compaction policy", status: "doing", priority: 3, owner: "lin" },
  { id: "t7", title: "Iroh doc key hygiene", status: "todo", priority: 1, owner: "lin" },
  { id: "t8", title: "Deno edge deployment doc", status: "todo", priority: 2, owner: "ada" },
  { id: "t9", title: "Semantic diff for table ops", status: "todo", priority: 1, owner: "trent" },
  { id: "t10", title: "Raster.tv studio session", status: "done", priority: 1, owner: "trent" },
  { id: "t11", title: "Whop checkout verification", status: "todo", priority: 2, owner: "ada" }
];
var tableEntry = {
  type: "table",
  name: "Table",
  description: "Headless data grid \u2014 sorting, global filter, paging, row selection, inline edit (dbl-click a cell), row add/remove, all undoable.",
  defaultConfig: {},
  create: (config) => createTableCore({
    data: TASKS,
    columns: [
      { id: "title", accessorKey: "title", header: "Title", width: "60%" },
      { id: "status", accessorKey: "status", header: "Status", width: 96 },
      { id: "priority", accessorKey: "priority", header: "Pri", type: "number", width: 56, align: "center" },
      { id: "owner", accessorKey: "owner", header: "Owner", width: 84 }
    ],
    initialState: { pageSize: 10, sorting: [{ id: "priority", desc: false }] },
    undoHistory: config.undoHistory ?? createUndoHistoryCore()
  }),
  actions: [
    { label: "Sort (toggle)", run: (c) => {
      const s = c.state;
      c.actions.sort(s.sorting[0]?.id ?? "title");
    } },
    { label: "Clear sort", enabled: (c) => c.state.sorting.length > 0, run: (c) => c.actions.clearSorting() },
    { label: "Filter \u201Csync\u201D", run: (c) => c.actions.setGlobalFilter("sync") },
    { label: "Clear filter", enabled: (c) => c.state.globalFilter !== "", run: (c) => c.actions.setGlobalFilter("") },
    {
      label: "Add row",
      run: (c) => c.actions.addRow({
        id: `new-${Date.now()}`,
        title: "Untitled task",
        status: "todo",
        priority: 2,
        owner: "you"
      })
    },
    {
      label: "Remove selected",
      enabled: (c) => c.state.selectedRows.length > 0,
      run: (c) => {
        for (const r of c.state.selectedRows) c.actions.removeRow(r);
      }
    },
    { label: "Select all", run: (c) => c.actions.toggleAllSelected(true) },
    { label: "Select none", enabled: (c) => c.state.selectedRows.length > 0, run: (c) => c.actions.toggleAllSelected(false) },
    { label: "Next page", enabled: (c) => c.state.pageIndex < c.state.pageCount - 1, run: (c) => c.actions.nextPage() },
    { label: "Prev page", enabled: (c) => c.state.pageIndex > 0, run: (c) => c.actions.previousPage() },
    { label: "Undo", enabled: (c) => c.state.canUndo, run: (c) => c.actions.undo() },
    { label: "Redo", enabled: (c) => c.state.canRedo, run: (c) => c.actions.redo() }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const root = el("div", { class: "table-wrap" });
        const status = el("div", { class: "status-line" });
        const pageInfo = el("span", { class: "chip" });
        const undoLabel = el("span", { class: "chip" });
        let editInput = null;
        let editKey = "";
        let suppressNextBlur = false;
        const render = () => {
          const s = core.state;
          let pendingFocus = null;
          let freshEditor = false;
          if (s.editing) {
            suppressNextBlur = true;
            window.setTimeout(() => {
              suppressNextBlur = false;
            }, 0);
          }
          const grid = el("table", { class: "grid" });
          const thead = el("thead");
          const headRow = el("tr");
          headRow.append(
            el(
              "th",
              {},
              el("input", {
                type: "checkbox",
                checked: s.allSelected,
                indeterminate: s.someSelected && !s.allSelected,
                onchange: (e) => core.actions.toggleAllSelected(e.target.checked)
              })
            )
          );
          for (const col of s.columns) {
            const sort = s.sorting.find((x2) => x2.id === col.id);
            const marker = sort ? sort.desc ? " \u2193" : " \u2191" : "";
            headRow.append(
              el(
                "th",
                { onclick: () => core.actions.sort(col.id), title: col.header },
                col.header,
                el("span", { class: "marker" }, marker)
              )
            );
          }
          thead.append(headRow);
          grid.append(thead);
          const tbody = el("tbody");
          for (const row of s.rows) {
            const tr = el("tr");
            tr.append(
              el(
                "td",
                {},
                el("input", {
                  type: "checkbox",
                  checked: row.selected,
                  onchange: (e) => core.actions.toggleRowSelected(row.id, e.target.checked)
                })
              )
            );
            for (const col of s.columns) {
              const editing = s.editing && s.editing.rowId === row.id && s.editing.columnId === col.id;
              if (editing) {
                const key = `${row.id}:${col.id}`;
                let input;
                if (key === editKey && editInput) {
                  input = editInput;
                  if (input.value !== s.editDraft) input.value = s.editDraft ?? "";
                } else {
                  input = el("input", {
                    type: "text",
                    class: "cell-input",
                    value: s.editDraft ?? "",
                    oninput: (e) => core.actions.setEditDraft(e.target.value),
                    onkeydown: (e) => {
                      if (e.key === "Enter") core.actions.commitEdit();
                      if (e.key === "Escape") core.actions.cancelEdit();
                    },
                    // Deferred: committing inside blur removes this input mid-event.
                    onblur: () => {
                      if (suppressNextBlur) {
                        suppressNextBlur = false;
                        return;
                      }
                      window.setTimeout(() => core.actions.commitEdit(), 0);
                    }
                  });
                  editInput = input;
                  editKey = key;
                  freshEditor = true;
                }
                tr.append(el("td", {}, input));
                pendingFocus = input;
              } else {
                const value = row.cells[col.id];
                tr.append(
                  el(
                    "td",
                    {
                      class: col.editable ? "editable" : "",
                      ondblclick: () => col.editable && core.actions.startEdit(row.id, col.id),
                      style: `text-align:${col.align ?? "left"}`
                    },
                    value === null ? "" : String(value)
                  )
                );
              }
            }
            tbody.append(tr);
          }
          grid.append(tbody);
          root.replaceChildren(grid);
          if (pendingFocus) {
            pendingFocus.focus();
            if (freshEditor) pendingFocus.select();
          }
          if (!s.editing) {
            editInput = null;
            editKey = "";
          }
          undoLabel.textContent = s.canUndo ? "undo: \u2318Z" : s.canRedo ? "redo: \u2318\u21E7Z" : "history: clean";
          pageInfo.textContent = `${s.pageIndex + 1} / ${Math.max(s.pageCount, 1)}`;
          status.textContent = `${s.totalRows} rows \xB7 ${s.selectedRows.length} selected \xB7 filter ${s.globalFilter ? `\u201C${s.globalFilter}\u201D` : "\u2014"} \xB7 ` + (s.sorting.length ? `sorted by ${s.sorting[0].id} ${s.sorting[0].desc ? "\u2193" : "\u2191"}` : "no sort");
        };
        const toolbar = el(
          "div",
          { class: "toolbar" },
          el("input", {
            type: "text",
            placeholder: "filter\u2026",
            class: "mini-input",
            value: core.state.globalFilter,
            oninput: (e) => core.actions.setGlobalFilter(e.target.value)
          }),
          el("button", { class: "mini", onclick: () => core.actions.previousPage() }, "\u2039"),
          pageInfo,
          el("button", { class: "mini", onclick: () => core.actions.nextPage() }, "\u203A"),
          undoLabel,
          el("span", { class: "dim", style: "font-size:11px" }, "dbl-click cell to edit")
        );
        const unsub = core.subscribe(render);
        render();
        host.append(toolbar, root, status);
        return unsub;
      }
    }
  ]
};

// node_modules/.pnpm/orderedmap@2.1.1/node_modules/orderedmap/dist/index.js
function OrderedMap(content) {
  this.content = content;
}
OrderedMap.prototype = {
  constructor: OrderedMap,
  find: function(key) {
    for (var i = 0; i < this.content.length; i += 2)
      if (this.content[i] === key) return i;
    return -1;
  },
  // :: (string) → ?any
  // Retrieve the value stored under `key`, or return undefined when
  // no such key exists.
  get: function(key) {
    var found2 = this.find(key);
    return found2 == -1 ? void 0 : this.content[found2 + 1];
  },
  // :: (string, any, ?string) → OrderedMap
  // Create a new map by replacing the value of `key` with a new
  // value, or adding a binding to the end of the map. If `newKey` is
  // given, the key of the binding will be replaced with that key.
  update: function(key, value, newKey) {
    var self = newKey && newKey != key ? this.remove(newKey) : this;
    var found2 = self.find(key), content = self.content.slice();
    if (found2 == -1) {
      content.push(newKey || key, value);
    } else {
      content[found2 + 1] = value;
      if (newKey) content[found2] = newKey;
    }
    return new OrderedMap(content);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(key) {
    var found2 = this.find(key);
    if (found2 == -1) return this;
    var content = this.content.slice();
    content.splice(found2, 2);
    return new OrderedMap(content);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(key, value) {
    return new OrderedMap([key, value].concat(this.remove(key).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(key, value) {
    var content = this.remove(key).content.slice();
    content.push(key, value);
    return new OrderedMap(content);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(place, key, value) {
    var without = this.remove(key), content = without.content.slice();
    var found2 = without.find(place);
    content.splice(found2 == -1 ? content.length : found2, 0, key, value);
    return new OrderedMap(content);
  },
  // :: ((key: string, value: any))
  // Call the given function for each key/value pair in the map, in
  // order.
  forEach: function(f) {
    for (var i = 0; i < this.content.length; i += 2)
      f(this.content[i], this.content[i + 1]);
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by prepending the keys in this map that don't
  // appear in `map` before the keys in `map`.
  prepend: function(map) {
    map = OrderedMap.from(map);
    if (!map.size) return this;
    return new OrderedMap(map.content.concat(this.subtract(map).content));
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(map) {
    map = OrderedMap.from(map);
    if (!map.size) return this;
    return new OrderedMap(this.subtract(map).content.concat(map.content));
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(map) {
    var result = this;
    map = OrderedMap.from(map);
    for (var i = 0; i < map.content.length; i += 2)
      result = result.remove(map.content[i]);
    return result;
  },
  // :: () → Object
  // Turn ordered map into a plain object.
  toObject: function() {
    var result = {};
    this.forEach(function(key, value) {
      result[key] = value;
    });
    return result;
  },
  // :: number
  // The amount of keys in this map.
  get size() {
    return this.content.length >> 1;
  }
};
OrderedMap.from = function(value) {
  if (value instanceof OrderedMap) return value;
  var content = [];
  if (value) for (var prop in value) content.push(prop, value[prop]);
  return new OrderedMap(content);
};
var dist_default = OrderedMap;

// node_modules/.pnpm/prosemirror-model@1.25.11/node_modules/prosemirror-model/dist/index.js
function findDiffStart(a, b2, pos) {
  for (let i = 0; ; i++) {
    if (i == a.childCount || i == b2.childCount)
      return a.childCount == b2.childCount ? null : pos;
    let childA = a.child(i), childB = b2.child(i);
    if (childA == childB) {
      pos += childA.nodeSize;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return pos;
    if (childA.isText && childA.text != childB.text) {
      let tA = childA.text, tB = childB.text, j2 = 0;
      for (; tA[j2] == tB[j2]; j2++)
        pos++;
      if (j2 && j2 < tA.length && j2 < tB.length && surrogateHigh(tA.charCodeAt(j2 - 1)) && surrogateLow(tA.charCodeAt(j2)))
        pos--;
      return pos;
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffStart(childA.content, childB.content, pos + 1);
      if (inner != null)
        return inner;
    }
    pos += childA.nodeSize;
  }
}
function findDiffEnd(a, b2, posA, posB) {
  for (let iA = a.childCount, iB = b2.childCount; ; ) {
    if (iA == 0 || iB == 0)
      return iA == iB ? null : { a: posA, b: posB };
    let childA = a.child(--iA), childB = b2.child(--iB), size = childA.nodeSize;
    if (childA == childB) {
      posA -= size;
      posB -= size;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return { a: posA, b: posB };
    if (childA.isText && childA.text != childB.text) {
      let tA = childA.text, tB = childB.text, iA2 = tA.length, iB2 = tB.length;
      while (iA2 > 0 && iB2 > 0 && tA[iA2 - 1] == tB[iB2 - 1]) {
        iA2--;
        iB2--;
        posA--;
        posB--;
      }
      if (iA2 && iB2 && iA2 < tA.length && surrogateHigh(tA.charCodeAt(iA2 - 1)) && surrogateLow(tA.charCodeAt(iA2))) {
        posA++;
        posB++;
      }
      return { a: posA, b: posB };
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
      if (inner)
        return inner;
    }
    posA -= size;
    posB -= size;
  }
}
function surrogateLow(ch) {
  return ch >= 56320 && ch < 57344;
}
function surrogateHigh(ch) {
  return ch >= 55296 && ch < 56320;
}
var Fragment = class _Fragment {
  /**
  @internal
  */
  constructor(content, size) {
    this.content = content;
    this.size = size || 0;
    if (size == null)
      for (let i = 0; i < content.length; i++)
        this.size += content[i].nodeSize;
  }
  /**
  Invoke a callback for all descendant nodes between the given two
  positions (relative to start of this fragment). Doesn't descend
  into a node when the callback returns `false`.
  */
  nodesBetween(from, to, f, nodeStart = 0, parent) {
    for (let i = 0, pos = 0; pos < to; i++) {
      let child = this.content[i], end = pos + child.nodeSize;
      if (end > from && f(child, nodeStart + pos, parent || null, i) !== false && child.content.size) {
        let start = pos + 1;
        child.nodesBetween(Math.max(0, from - start), Math.min(child.content.size, to - start), f, nodeStart + start);
      }
      pos = end;
    }
  }
  /**
  Call the given callback for every descendant node. `pos` will be
  relative to the start of the fragment. The callback may return
  `false` to prevent traversal of a given node's children.
  */
  descendants(f) {
    this.nodesBetween(0, this.size, f);
  }
  /**
  Extract the text between `from` and `to`. See the same method on
  [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
  */
  textBetween(from, to, blockSeparator, leafText) {
    let text2 = "", first = true;
    this.nodesBetween(from, to, (node, pos) => {
      let nodeText = node.isText ? node.text.slice(Math.max(from, pos) - pos, to - pos) : !node.isLeaf ? "" : leafText ? typeof leafText === "function" ? leafText(node) : leafText : node.type.spec.leafText ? node.type.spec.leafText(node) : "";
      if (node.isBlock && (node.isLeaf && nodeText || node.isTextblock) && blockSeparator) {
        if (first)
          first = false;
        else
          text2 += blockSeparator;
      }
      text2 += nodeText;
    }, 0);
    return text2;
  }
  /**
  Create a new fragment containing the combined content of this
  fragment and the other.
  */
  append(other) {
    if (!other.size)
      return this;
    if (!this.size)
      return other;
    let last = this.lastChild, first = other.firstChild, content = this.content.slice(), i = 0;
    if (last.isText && last.sameMarkup(first)) {
      content[content.length - 1] = last.withText(last.text + first.text);
      i = 1;
    }
    for (; i < other.content.length; i++)
      content.push(other.content[i]);
    return new _Fragment(content, this.size + other.size);
  }
  /**
  Cut out the sub-fragment between the two given positions.
  */
  cut(from, to = this.size) {
    if (from == 0 && to == this.size)
      return this;
    let result = [], size = 0;
    if (to > from)
      for (let i = 0, pos = 0; pos < to; i++) {
        let child = this.content[i], end = pos + child.nodeSize;
        if (end > from) {
          if (pos < from || end > to) {
            if (child.isText)
              child = child.cut(Math.max(0, from - pos), Math.min(child.text.length, to - pos));
            else
              child = child.cut(Math.max(0, from - pos - 1), Math.min(child.content.size, to - pos - 1));
          }
          result.push(child);
          size += child.nodeSize;
        }
        pos = end;
      }
    return new _Fragment(result, size);
  }
  /**
  @internal
  */
  cutByIndex(from, to) {
    if (from == to)
      return _Fragment.empty;
    if (from == 0 && to == this.content.length)
      return this;
    return new _Fragment(this.content.slice(from, to));
  }
  /**
  Create a new fragment in which the node at the given index is
  replaced by the given node.
  */
  replaceChild(index, node) {
    let current = this.content[index];
    if (current == node)
      return this;
    let copy = this.content.slice();
    let size = this.size + node.nodeSize - current.nodeSize;
    copy[index] = node;
    return new _Fragment(copy, size);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(node) {
    return new _Fragment([node].concat(this.content), this.size + node.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(node) {
    return new _Fragment(this.content.concat(node), this.size + node.nodeSize);
  }
  /**
  Compare this fragment to another one.
  */
  eq(other) {
    if (this.content.length != other.content.length)
      return false;
    for (let i = 0; i < this.content.length; i++)
      if (!this.content[i].eq(other.content[i]))
        return false;
    return true;
  }
  /**
  The first child of the fragment, or `null` if it is empty.
  */
  get firstChild() {
    return this.content.length ? this.content[0] : null;
  }
  /**
  The last child of the fragment, or `null` if it is empty.
  */
  get lastChild() {
    return this.content.length ? this.content[this.content.length - 1] : null;
  }
  /**
  The number of child nodes in this fragment.
  */
  get childCount() {
    return this.content.length;
  }
  /**
  Get the child node at the given index. Raise an error when the
  index is out of range.
  */
  child(index) {
    let found2 = this.content[index];
    if (!found2)
      throw new RangeError("Index " + index + " out of range for " + this);
    return found2;
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content[index] || null;
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    for (let i = 0, p = 0; i < this.content.length; i++) {
      let child = this.content[i];
      f(child, p, i);
      p += child.nodeSize;
    }
  }
  /**
  Find the first position at which this fragment and another
  fragment differ, or `null` if they are the same.
  */
  findDiffStart(other, pos = 0) {
    return findDiffStart(this, other, pos);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(other, pos = this.size, otherPos = other.size) {
    return findDiffEnd(this, other, pos, otherPos);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(pos) {
    if (pos == 0)
      return retIndex(0, pos);
    if (pos == this.size)
      return retIndex(this.content.length, pos);
    if (pos > this.size || pos < 0)
      throw new RangeError(`Position ${pos} outside of fragment (${this})`);
    for (let i = 0, curPos = 0; ; i++) {
      let cur = this.child(i), end = curPos + cur.nodeSize;
      if (end >= pos) {
        if (end == pos)
          return retIndex(i + 1, end);
        return retIndex(i, curPos);
      }
      curPos = end;
    }
  }
  /**
  Return a debugging string that describes this fragment.
  */
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  /**
  @internal
  */
  toStringInner() {
    return this.content.join(", ");
  }
  /**
  Create a JSON-serializeable representation of this fragment.
  */
  toJSON() {
    return this.content.length ? this.content.map((n) => n.toJSON()) : null;
  }
  /**
  Deserialize a fragment from its JSON representation.
  */
  static fromJSON(schema3, value) {
    if (!value)
      return _Fragment.empty;
    if (!Array.isArray(value))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return _Fragment.fromArray(value.map(schema3.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(array) {
    if (!array.length)
      return _Fragment.empty;
    let joined, size = 0;
    for (let i = 0; i < array.length; i++) {
      let node = array[i];
      size += node.nodeSize;
      if (i && node.isText && array[i - 1].sameMarkup(node)) {
        if (!joined)
          joined = array.slice(0, i);
        joined[joined.length - 1] = node.withText(joined[joined.length - 1].text + node.text);
      } else if (joined) {
        joined.push(node);
      }
    }
    return new _Fragment(joined || array, size);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(nodes2) {
    if (!nodes2)
      return _Fragment.empty;
    if (nodes2 instanceof _Fragment)
      return nodes2;
    if (Array.isArray(nodes2))
      return this.fromArray(nodes2);
    if (nodes2.attrs)
      return new _Fragment([nodes2], nodes2.nodeSize);
    throw new RangeError("Can not convert " + nodes2 + " to a Fragment" + (nodes2.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
};
Fragment.empty = new Fragment([], 0);
var found = { index: 0, offset: 0 };
function retIndex(index, offset) {
  found.index = index;
  found.offset = offset;
  return found;
}
function compareDeep(a, b2) {
  if (a === b2)
    return true;
  if (!(a && typeof a == "object") || !(b2 && typeof b2 == "object"))
    return false;
  let array = Array.isArray(a);
  if (Array.isArray(b2) != array)
    return false;
  if (array) {
    if (a.length != b2.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!compareDeep(a[i], b2[i]))
        return false;
  } else {
    for (let p in a)
      if (!(p in b2) || !compareDeep(a[p], b2[p]))
        return false;
    for (let p in b2)
      if (!(p in a))
        return false;
  }
  return true;
}
var Mark = class _Mark {
  /**
  @internal
  */
  constructor(type, attrs) {
    this.type = type;
    this.attrs = attrs;
  }
  /**
  Given a set of marks, create a new set which contains this one as
  well, in the right position. If this mark is already in the set,
  the set itself is returned. If any marks that are set to be
  [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
  those are replaced by this one.
  */
  addToSet(set) {
    let copy, placed = false;
    for (let i = 0; i < set.length; i++) {
      let other = set[i];
      if (this.eq(other))
        return set;
      if (this.type.excludes(other.type)) {
        if (!copy)
          copy = set.slice(0, i);
      } else if (other.type.excludes(this.type)) {
        return set;
      } else {
        if (!placed && other.type.rank > this.type.rank) {
          if (!copy)
            copy = set.slice(0, i);
          copy.push(this);
          placed = true;
        }
        if (copy)
          copy.push(other);
      }
    }
    if (!copy)
      copy = set.slice();
    if (!placed)
      copy.push(this);
    return copy;
  }
  /**
  Remove this mark from the given set, returning a new set. If this
  mark is not in the set, the set itself is returned.
  */
  removeFromSet(set) {
    for (let i = 0; i < set.length; i++)
      if (this.eq(set[i]))
        return set.slice(0, i).concat(set.slice(i + 1));
    return set;
  }
  /**
  Test whether this mark is in the given set of marks.
  */
  isInSet(set) {
    for (let i = 0; i < set.length; i++)
      if (this.eq(set[i]))
        return true;
    return false;
  }
  /**
  Test whether this mark has the same type and attributes as
  another mark.
  */
  eq(other) {
    return this == other || this.type == other.type && compareDeep(this.attrs, other.attrs);
  }
  /**
  Convert this mark to a JSON-serializeable representation.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    return obj;
  }
  /**
  Deserialize a mark from JSON.
  */
  static fromJSON(schema3, json) {
    if (!json)
      throw new RangeError("Invalid input for Mark.fromJSON");
    let type = schema3.marks[json.type];
    if (!type)
      throw new RangeError(`There is no mark type ${json.type} in this schema`);
    let mark = type.create(json.attrs);
    type.checkAttrs(mark.attrs);
    return mark;
  }
  /**
  Test whether two sets of marks are identical.
  */
  static sameSet(a, b2) {
    if (a == b2)
      return true;
    if (a.length != b2.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!a[i].eq(b2[i]))
        return false;
    return true;
  }
  /**
  Create a properly sorted mark set from null, a single mark, or an
  unsorted array of marks.
  */
  static setFrom(marks3) {
    if (!marks3 || Array.isArray(marks3) && marks3.length == 0)
      return _Mark.none;
    if (marks3 instanceof _Mark)
      return [marks3];
    let copy = marks3.slice();
    copy.sort((a, b2) => a.type.rank - b2.type.rank);
    return copy;
  }
};
Mark.none = [];
var ReplaceError = class extends Error {
};
var Slice = class _Slice {
  /**
  Create a slice. When specifying a non-zero open depth, you must
  make sure that there are nodes of at least that depth at the
  appropriate side of the fragment—i.e. if the fragment is an
  empty paragraph node, `openStart` and `openEnd` can't be greater
  than 1.
  
  It is not necessary for the content of open nodes to conform to
  the schema's content constraints, though it should be a valid
  start/end/middle for such a node, depending on which sides are
  open.
  */
  constructor(content, openStart, openEnd) {
    this.content = content;
    this.openStart = openStart;
    this.openEnd = openEnd;
  }
  /**
  The size this slice would add when inserted into a document.
  */
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  /**
  @internal
  */
  insertAt(pos, fragment) {
    let content = insertInto(this.content, pos + this.openStart, fragment, this.openStart + 1, this.openEnd + 1);
    return content && new _Slice(content, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(from, to) {
    return new _Slice(removeRange(this.content, from + this.openStart, to + this.openStart), this.openStart, this.openEnd);
  }
  /**
  Tests whether this slice is equal to another slice.
  */
  eq(other) {
    return this.content.eq(other.content) && this.openStart == other.openStart && this.openEnd == other.openEnd;
  }
  /**
  @internal
  */
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  /**
  Convert a slice to a JSON-serializable representation.
  */
  toJSON() {
    if (!this.content.size)
      return null;
    let json = { content: this.content.toJSON() };
    if (this.openStart > 0)
      json.openStart = this.openStart;
    if (this.openEnd > 0)
      json.openEnd = this.openEnd;
    return json;
  }
  /**
  Deserialize a slice from its JSON representation.
  */
  static fromJSON(schema3, json) {
    if (!json)
      return _Slice.empty;
    let openStart = json.openStart || 0, openEnd = json.openEnd || 0;
    if (typeof openStart != "number" || typeof openEnd != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new _Slice(Fragment.fromJSON(schema3, json.content), openStart, openEnd);
  }
  /**
  Create a slice from a fragment by taking the maximum possible
  open value on both side of the fragment.
  */
  static maxOpen(fragment, openIsolating = true) {
    let openStart = 0, openEnd = 0;
    for (let n = fragment.firstChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.firstChild)
      openStart++;
    for (let n = fragment.lastChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.lastChild)
      openEnd++;
    return new _Slice(fragment, openStart, openEnd);
  }
};
Slice.empty = new Slice(Fragment.empty, 0, 0);
function removeRange(content, from, to) {
  let { index, offset } = content.findIndex(from), child = content.maybeChild(index);
  let { index: indexTo, offset: offsetTo } = content.findIndex(to);
  if (offset == from || child.isText) {
    if (offsetTo != to && !content.child(indexTo).isText)
      throw new RangeError("Removing non-flat range");
    return content.cut(0, from).append(content.cut(to));
  }
  if (index != indexTo)
    throw new RangeError("Removing non-flat range");
  return content.replaceChild(index, child.copy(removeRange(child.content, from - offset - 1, to - offset - 1)));
}
function insertInto(content, dist, insert, openStart, openEnd, parent) {
  let { index, offset } = content.findIndex(dist), child = content.maybeChild(index);
  if (offset == dist || child.isText) {
    if (parent && openStart <= 0 && openEnd <= 0 && !parent.canReplace(index, index, insert))
      return null;
    return content.cut(0, dist).append(insert).append(content.cut(dist));
  }
  let inner = insertInto(child.content, dist - offset - 1, insert, index == 0 ? openStart - 1 : 0, index == content.childCount - 1 ? openEnd - 1 : 0, child);
  return inner && content.replaceChild(index, child.copy(inner));
}
function replace($from, $to, slice) {
  if (slice.openStart > $from.depth)
    throw new ReplaceError("Inserted content deeper than insertion position");
  if ($from.depth - slice.openStart != $to.depth - slice.openEnd)
    throw new ReplaceError("Inconsistent open depths");
  return replaceOuter($from, $to, slice, 0);
}
function replaceOuter($from, $to, slice, depth) {
  let index = $from.index(depth), node = $from.node(depth);
  if (index == $to.index(depth) && depth < $from.depth - slice.openStart) {
    let inner = replaceOuter($from, $to, slice, depth + 1);
    return node.copy(node.content.replaceChild(index, inner));
  } else if (!slice.content.size) {
    return close(node, replaceTwoWay($from, $to, depth));
  } else if (!slice.openStart && !slice.openEnd && $from.depth == depth && $to.depth == depth) {
    let parent = $from.parent, content = parent.content;
    return close(parent, content.cut(0, $from.parentOffset).append(slice.content).append(content.cut($to.parentOffset)));
  } else {
    let { start, end } = prepareSliceForReplace(slice, $from);
    return close(node, replaceThreeWay($from, start, end, $to, depth));
  }
}
function checkJoin(main, sub) {
  if (!sub.type.compatibleContent(main.type))
    throw new ReplaceError("Cannot join " + sub.type.name + " onto " + main.type.name);
}
function joinable($before, $after, depth) {
  let node = $before.node(depth);
  checkJoin(node, $after.node(depth));
  return node;
}
function addNode(child, target) {
  let last = target.length - 1;
  if (last >= 0 && child.isText && child.sameMarkup(target[last]))
    target[last] = child.withText(target[last].text + child.text);
  else
    target.push(child);
}
function addRange($start, $end, depth, target) {
  let node = ($end || $start).node(depth);
  let startIndex = 0, endIndex = $end ? $end.index(depth) : node.childCount;
  if ($start) {
    startIndex = $start.index(depth);
    if ($start.depth > depth) {
      startIndex++;
    } else if ($start.textOffset) {
      addNode($start.nodeAfter, target);
      startIndex++;
    }
  }
  for (let i = startIndex; i < endIndex; i++)
    addNode(node.child(i), target);
  if ($end && $end.depth == depth && $end.textOffset)
    addNode($end.nodeBefore, target);
}
function close(node, content) {
  if (!node.type.validContent(content))
    throw new ReplaceError("Invalid content for node " + node.type.name);
  return node.copy(content);
}
function replaceThreeWay($from, $start, $end, $to, depth) {
  let openStart = $from.depth > depth && joinable($from, $start, depth + 1);
  let openEnd = $to.depth > depth && joinable($end, $to, depth + 1);
  let content = [];
  addRange(null, $from, depth, content);
  if (openStart && openEnd && $start.index(depth) == $end.index(depth)) {
    checkJoin(openStart, openEnd);
    addNode(close(openStart, replaceThreeWay($from, $start, $end, $to, depth + 1)), content);
  } else {
    if (openStart)
      addNode(close(openStart, replaceTwoWay($from, $start, depth + 1)), content);
    addRange($start, $end, depth, content);
    if (openEnd)
      addNode(close(openEnd, replaceTwoWay($end, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment(content);
}
function replaceTwoWay($from, $to, depth) {
  let content = [];
  addRange(null, $from, depth, content);
  if ($from.depth > depth) {
    let type = joinable($from, $to, depth + 1);
    addNode(close(type, replaceTwoWay($from, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment(content);
}
function prepareSliceForReplace(slice, $along) {
  let extra = $along.depth - slice.openStart, parent = $along.node(extra);
  let node = parent.copy(slice.content);
  for (let i = extra - 1; i >= 0; i--)
    node = $along.node(i).copy(Fragment.from(node));
  return {
    start: node.resolveNoCache(slice.openStart + extra),
    end: node.resolveNoCache(node.content.size - slice.openEnd - extra)
  };
}
var ResolvedPos = class _ResolvedPos {
  /**
  @internal
  */
  constructor(pos, path, parentOffset) {
    this.pos = pos;
    this.path = path;
    this.parentOffset = parentOffset;
    this.depth = path.length / 3 - 1;
  }
  /**
  @internal
  */
  resolveDepth(val) {
    if (val == null)
      return this.depth;
    if (val < 0)
      return this.depth + val;
    return val;
  }
  /**
  The parent node that the position points into. Note that even if
  a position points into a text node, that node is not considered
  the parent—text nodes are ‘flat’ in this model, and have no content.
  */
  get parent() {
    return this.node(this.depth);
  }
  /**
  The root node in which the position was resolved.
  */
  get doc() {
    return this.node(0);
  }
  /**
  The ancestor node at the given level. `p.node(p.depth)` is the
  same as `p.parent`.
  */
  node(depth) {
    return this.path[this.resolveDepth(depth) * 3];
  }
  /**
  The index into the ancestor at the given level. If this points
  at the 3rd node in the 2nd paragraph on the top level, for
  example, `p.index(0)` is 1 and `p.index(1)` is 2.
  */
  index(depth) {
    return this.path[this.resolveDepth(depth) * 3 + 1];
  }
  /**
  The index pointing after this position into the ancestor at the
  given level.
  */
  indexAfter(depth) {
    depth = this.resolveDepth(depth);
    return this.index(depth) + (depth == this.depth && !this.textOffset ? 0 : 1);
  }
  /**
  The (absolute) position at the start of the node at the given
  level.
  */
  start(depth) {
    depth = this.resolveDepth(depth);
    return depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
  }
  /**
  The (absolute) position at the end of the node at the given
  level.
  */
  end(depth) {
    depth = this.resolveDepth(depth);
    return this.start(depth) + this.node(depth).content.size;
  }
  /**
  The (absolute) position directly before the wrapping node at the
  given level, or, when `depth` is `this.depth + 1`, the original
  position.
  */
  before(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position before the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
  }
  /**
  The (absolute) position directly after the wrapping node at the
  given level, or the original position when `depth` is `this.depth + 1`.
  */
  after(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position after the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1] + this.path[depth * 3].nodeSize;
  }
  /**
  When this position points into a text node, this returns the
  distance between the position and the start of the text node.
  Will be zero for positions that point between nodes.
  */
  get textOffset() {
    return this.pos - this.path[this.path.length - 1];
  }
  /**
  Get the node directly after the position, if any. If the position
  points into a text node, only the part of that node after the
  position is returned.
  */
  get nodeAfter() {
    let parent = this.parent, index = this.index(this.depth);
    if (index == parent.childCount)
      return null;
    let dOff = this.pos - this.path[this.path.length - 1], child = parent.child(index);
    return dOff ? parent.child(index).cut(dOff) : child;
  }
  /**
  Get the node directly before the position, if any. If the
  position points into a text node, only the part of that node
  before the position is returned.
  */
  get nodeBefore() {
    let index = this.index(this.depth);
    let dOff = this.pos - this.path[this.path.length - 1];
    if (dOff)
      return this.parent.child(index).cut(0, dOff);
    return index == 0 ? null : this.parent.child(index - 1);
  }
  /**
  Get the position at the given index in the parent node at the
  given depth (which defaults to `this.depth`).
  */
  posAtIndex(index, depth) {
    depth = this.resolveDepth(depth);
    let node = this.path[depth * 3], pos = depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
    for (let i = 0; i < index; i++)
      pos += node.child(i).nodeSize;
    return pos;
  }
  /**
  Get the marks at this position, factoring in the surrounding
  marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
  position is at the start of a non-empty node, the marks of the
  node after it (if any) are returned.
  */
  marks() {
    let parent = this.parent, index = this.index();
    if (parent.content.size == 0)
      return Mark.none;
    if (this.textOffset)
      return parent.child(index).marks;
    let main = parent.maybeChild(index - 1), other = parent.maybeChild(index);
    if (!main) {
      let tmp = main;
      main = other;
      other = tmp;
    }
    let marks3 = main.marks;
    for (var i = 0; i < marks3.length; i++)
      if (marks3[i].type.spec.inclusive === false && (!other || !marks3[i].isInSet(other.marks)))
        marks3 = marks3[i--].removeFromSet(marks3);
    return marks3;
  }
  /**
  Get the marks after the current position, if any, except those
  that are non-inclusive and not present at position `$end`. This
  is mostly useful for getting the set of marks to preserve after a
  deletion. Will return `null` if this position is at the end of
  its parent node or its parent node isn't a textblock (in which
  case no marks should be preserved).
  */
  marksAcross($end) {
    let after = this.parent.maybeChild(this.index());
    if (!after || !after.isInline)
      return null;
    let marks3 = after.marks, next = $end.parent.maybeChild($end.index());
    for (var i = 0; i < marks3.length; i++)
      if (marks3[i].type.spec.inclusive === false && (!next || !marks3[i].isInSet(next.marks)))
        marks3 = marks3[i--].removeFromSet(marks3);
    return marks3;
  }
  /**
  The depth up to which this position and the given (non-resolved)
  position share the same parent nodes.
  */
  sharedDepth(pos) {
    for (let depth = this.depth; depth > 0; depth--)
      if (this.start(depth) <= pos && this.end(depth) >= pos)
        return depth;
    return 0;
  }
  /**
  Returns a range based on the place where this position and the
  given position diverge around block content. If both point into
  the same textblock, for example, a range around that textblock
  will be returned. If they point into different blocks, the range
  around those blocks in their shared ancestor is returned. You can
  pass in an optional predicate that will be called with a parent
  node to see if a range into that parent is acceptable.
  */
  blockRange(other = this, pred) {
    if (other.pos < this.pos)
      return other.blockRange(this);
    for (let d = this.depth - (this.parent.inlineContent || this.pos == other.pos ? 1 : 0); d >= 0; d--)
      if (other.pos <= this.end(d) && (!pred || pred(this.node(d))))
        return new NodeRange(this, other, d);
    return null;
  }
  /**
  Query whether the given position shares the same parent node.
  */
  sameParent(other) {
    return this.pos - this.parentOffset == other.pos - other.parentOffset;
  }
  /**
  Return the greater of this and the given position.
  */
  max(other) {
    return other.pos > this.pos ? other : this;
  }
  /**
  Return the smaller of this and the given position.
  */
  min(other) {
    return other.pos < this.pos ? other : this;
  }
  /**
  @internal
  */
  toString() {
    let str = "";
    for (let i = 1; i <= this.depth; i++)
      str += (str ? "/" : "") + this.node(i).type.name + "_" + this.index(i - 1);
    return str + ":" + this.parentOffset;
  }
  /**
  @internal
  */
  static resolve(doc2, pos) {
    if (!(pos >= 0 && pos <= doc2.content.size))
      throw new RangeError("Position " + pos + " out of range");
    let path = [];
    let start = 0, parentOffset = pos;
    for (let node = doc2; ; ) {
      let { index, offset } = node.content.findIndex(parentOffset);
      let rem = parentOffset - offset;
      path.push(node, index, start + offset);
      if (!rem)
        break;
      node = node.child(index);
      if (node.isText)
        break;
      parentOffset = rem - 1;
      start += offset + 1;
    }
    return new _ResolvedPos(pos, path, parentOffset);
  }
  /**
  @internal
  */
  static resolveCached(doc2, pos) {
    let cache = resolveCache.get(doc2);
    if (cache) {
      for (let i = 0; i < cache.elts.length; i++) {
        let elt = cache.elts[i];
        if (elt.pos == pos)
          return elt;
      }
    } else {
      resolveCache.set(doc2, cache = new ResolveCache());
    }
    let result = cache.elts[cache.i] = _ResolvedPos.resolve(doc2, pos);
    cache.i = (cache.i + 1) % resolveCacheSize;
    return result;
  }
};
var ResolveCache = class {
  constructor() {
    this.elts = [];
    this.i = 0;
  }
};
var resolveCacheSize = 12;
var resolveCache = /* @__PURE__ */ new WeakMap();
var NodeRange = class {
  /**
  Construct a node range. `$from` and `$to` should point into the
  same node until at least the given `depth`, since a node range
  denotes an adjacent set of nodes in a single parent node.
  */
  constructor($from, $to, depth) {
    this.$from = $from;
    this.$to = $to;
    this.depth = depth;
  }
  /**
  The position at the start of the range.
  */
  get start() {
    return this.$from.before(this.depth + 1);
  }
  /**
  The position at the end of the range.
  */
  get end() {
    return this.$to.after(this.depth + 1);
  }
  /**
  The parent node that the range points into.
  */
  get parent() {
    return this.$from.node(this.depth);
  }
  /**
  The start index of the range in the parent node.
  */
  get startIndex() {
    return this.$from.index(this.depth);
  }
  /**
  The end index of the range in the parent node.
  */
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
};
var emptyAttrs = /* @__PURE__ */ Object.create(null);
var Node2 = class _Node {
  /**
  @internal
  */
  constructor(type, attrs, content, marks3 = Mark.none) {
    this.type = type;
    this.attrs = attrs;
    this.marks = marks3;
    this.content = content || Fragment.empty;
  }
  /**
  The array of this node's child nodes.
  */
  get children() {
    return this.content.content;
  }
  /**
  The size of this node, as defined by the integer-based [indexing
  scheme](https://prosemirror.net/docs/guide/#doc.indexing). For text nodes, this is the
  amount of characters. For other leaf nodes, it is one. For
  non-leaf nodes, it is the size of the content plus two (the
  start and end token).
  */
  get nodeSize() {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }
  /**
  The number of children that the node has.
  */
  get childCount() {
    return this.content.childCount;
  }
  /**
  Get the child node at the given index. Raises an error when the
  index is out of range.
  */
  child(index) {
    return this.content.child(index);
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content.maybeChild(index);
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    this.content.forEach(f);
  }
  /**
  Invoke a callback for all descendant nodes recursively overlapping
  the given two positions that are relative to start of this
  node's content. This includes all ancestors of the nodes
  containing the two positions. The callback is invoked with the
  node, its position relative to the original node (method receiver),
  its parent node, and its child index. When the callback returns
  false for a given node, that node's children will not be
  recursed over. The last parameter can be used to specify a
  starting position to count from.
  */
  nodesBetween(from, to, f, startPos = 0) {
    this.content.nodesBetween(from, to, f, startPos, this);
  }
  /**
  Call the given callback for every descendant node. Doesn't
  descend into a node when the callback returns `false`.
  */
  descendants(f) {
    this.nodesBetween(0, this.content.size, f);
  }
  /**
  Concatenates all the text nodes found in this fragment and its
  children.
  */
  get textContent() {
    return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
  }
  /**
  Get all text between positions `from` and `to`. When
  `blockSeparator` is given, it will be inserted to separate text
  from different block nodes. If `leafText` is given, it'll be
  inserted for every non-text leaf node encountered, otherwise
  [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec.leafText) will be used.
  */
  textBetween(from, to, blockSeparator, leafText) {
    return this.content.textBetween(from, to, blockSeparator, leafText);
  }
  /**
  Returns this node's first child, or `null` if there are no
  children.
  */
  get firstChild() {
    return this.content.firstChild;
  }
  /**
  Returns this node's last child, or `null` if there are no
  children.
  */
  get lastChild() {
    return this.content.lastChild;
  }
  /**
  Test whether two nodes represent the same piece of document.
  */
  eq(other) {
    return this == other || this.sameMarkup(other) && this.content.eq(other.content);
  }
  /**
  Compare the markup (type, attributes, and marks) of this node to
  those of another. Returns `true` if both have the same markup.
  */
  sameMarkup(other) {
    return this.hasMarkup(other.type, other.attrs, other.marks);
  }
  /**
  Check whether this node's markup correspond to the given type,
  attributes, and marks.
  */
  hasMarkup(type, attrs, marks3) {
    return this.type == type && compareDeep(this.attrs, attrs || type.defaultAttrs || emptyAttrs) && Mark.sameSet(this.marks, marks3 || Mark.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(content = null) {
    if (content == this.content)
      return this;
    return new _Node(this.type, this.attrs, content, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(marks3) {
    return marks3 == this.marks ? this : new _Node(this.type, this.attrs, this.content, marks3);
  }
  /**
  Create a copy of this node with only the content between the
  given positions. If `to` is not given, it defaults to the end of
  the node.
  */
  cut(from, to = this.content.size) {
    if (from == 0 && to == this.content.size)
      return this;
    return this.copy(this.content.cut(from, to));
  }
  /**
  Cut out the part of the document between the given positions, and
  return it as a `Slice` object.
  */
  slice(from, to = this.content.size, includeParents = false) {
    if (from == to)
      return Slice.empty;
    let $from = this.resolve(from), $to = this.resolve(to);
    let depth = includeParents ? 0 : $from.sharedDepth(to);
    let start = $from.start(depth), node = $from.node(depth);
    let content = node.content.cut($from.pos - start, $to.pos - start);
    return new Slice(content, $from.depth - depth, $to.depth - depth);
  }
  /**
  Replace the part of the document between the given positions with
  the given slice. The slice must 'fit', meaning its open sides
  must be able to connect to the surrounding content, and its
  content nodes must be valid children for the node they are placed
  into. If any of this is violated, an error of type
  [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
  */
  replace(from, to, slice) {
    return replace(this.resolve(from), this.resolve(to), slice);
  }
  /**
  Find the node directly after the given position.
  */
  nodeAt(pos) {
    for (let node = this; ; ) {
      let { index, offset } = node.content.findIndex(pos);
      node = node.maybeChild(index);
      if (!node)
        return null;
      if (offset == pos || node.isText)
        return node;
      pos -= offset + 1;
    }
  }
  /**
  Find the (direct) child node after the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childAfter(pos) {
    let { index, offset } = this.content.findIndex(pos);
    return { node: this.content.maybeChild(index), index, offset };
  }
  /**
  Find the (direct) child node before the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childBefore(pos) {
    if (pos == 0)
      return { node: null, index: 0, offset: 0 };
    let { index, offset } = this.content.findIndex(pos);
    if (offset < pos)
      return { node: this.content.child(index), index, offset };
    let node = this.content.child(index - 1);
    return { node, index: index - 1, offset: offset - node.nodeSize };
  }
  /**
  Resolve the given position in the document, returning an
  [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
  */
  resolve(pos) {
    return ResolvedPos.resolveCached(this, pos);
  }
  /**
  @internal
  */
  resolveNoCache(pos) {
    return ResolvedPos.resolve(this, pos);
  }
  /**
  Test whether a given mark or mark type occurs in this document
  between the two given positions.
  */
  rangeHasMark(from, to, type) {
    let found2 = false;
    if (to > from)
      this.nodesBetween(from, to, (node) => {
        if (type.isInSet(node.marks))
          found2 = true;
        return !found2;
      });
    return found2;
  }
  /**
  True when this is a block (non-inline node)
  */
  get isBlock() {
    return this.type.isBlock;
  }
  /**
  True when this is a textblock node, a block node with inline
  content.
  */
  get isTextblock() {
    return this.type.isTextblock;
  }
  /**
  True when this node allows inline content.
  */
  get inlineContent() {
    return this.type.inlineContent;
  }
  /**
  True when this is an inline node (a text node or a node that can
  appear among text).
  */
  get isInline() {
    return this.type.isInline;
  }
  /**
  True when this is a text node.
  */
  get isText() {
    return this.type.isText;
  }
  /**
  True when this is a leaf node.
  */
  get isLeaf() {
    return this.type.isLeaf;
  }
  /**
  True when this is an atom, i.e. when it does not have directly
  editable content. This is usually the same as `isLeaf`, but can
  be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
  on a node's spec (typically used when the node is displayed as
  an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
  */
  get isAtom() {
    return this.type.isAtom;
  }
  /**
  Return a string representation of this node for debugging
  purposes.
  */
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    let name = this.type.name;
    if (this.content.size)
      name += "(" + this.content.toStringInner() + ")";
    return wrapMarks(this.marks, name);
  }
  /**
  Get the content match in this node at the given index.
  */
  contentMatchAt(index) {
    let match = this.type.contentMatch.matchFragment(this.content, 0, index);
    if (!match)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return match;
  }
  /**
  Test whether replacing the range between `from` and `to` (by
  child index) with the given replacement fragment (which defaults
  to the empty fragment) would leave the node's content valid. You
  can optionally pass `start` and `end` indices into the
  replacement fragment.
  */
  canReplace(from, to, replacement = Fragment.empty, start = 0, end = replacement.childCount) {
    let one = this.contentMatchAt(from).matchFragment(replacement, start, end);
    let two = one && one.matchFragment(this.content, to);
    if (!two || !two.validEnd)
      return false;
    for (let i = start; i < end; i++)
      if (!this.type.allowsMarks(replacement.child(i).marks))
        return false;
    return true;
  }
  /**
  Test whether replacing the range `from` to `to` (by index) with
  a node of the given type would leave the node's content valid.
  */
  canReplaceWith(from, to, type, marks3) {
    if (marks3 && !this.type.allowsMarks(marks3))
      return false;
    let start = this.contentMatchAt(from).matchType(type);
    let end = start && start.matchFragment(this.content, to);
    return end ? end.validEnd : false;
  }
  /**
  Test whether the given node's content could be appended to this
  node. If that node is empty, this will only return true if there
  is at least one node type that can appear in both nodes (to avoid
  merging completely incompatible nodes).
  */
  canAppend(other) {
    if (other.content.size)
      return this.canReplace(this.childCount, this.childCount, other.content);
    else
      return this.type.compatibleContent(other.type);
  }
  /**
  Check whether this node and its descendants conform to the
  schema, and raise an exception when they do not.
  */
  check() {
    this.type.checkContent(this.content);
    this.type.checkAttrs(this.attrs);
    let copy = Mark.none;
    for (let i = 0; i < this.marks.length; i++) {
      let mark = this.marks[i];
      mark.type.checkAttrs(mark.attrs);
      copy = mark.addToSet(copy);
    }
    if (!Mark.sameSet(copy, this.marks))
      throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((m2) => m2.type.name)}`);
    this.content.forEach((node) => node.check());
  }
  /**
  Return a JSON-serializeable representation of this node.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    if (this.content.size)
      obj.content = this.content.toJSON();
    if (this.marks.length)
      obj.marks = this.marks.map((n) => n.toJSON());
    return obj;
  }
  /**
  Deserialize a node from its JSON representation.
  */
  static fromJSON(schema3, json) {
    if (!json)
      throw new RangeError("Invalid input for Node.fromJSON");
    let marks3 = void 0;
    if (json.marks) {
      if (!Array.isArray(json.marks))
        throw new RangeError("Invalid mark data for Node.fromJSON");
      marks3 = json.marks.map(schema3.markFromJSON);
    }
    if (json.type == "text") {
      if (typeof json.text != "string")
        throw new RangeError("Invalid text node in JSON");
      return schema3.text(json.text, marks3);
    }
    let content = Fragment.fromJSON(schema3, json.content);
    let node = schema3.nodeType(json.type).create(json.attrs, content, marks3);
    node.type.checkAttrs(node.attrs);
    return node;
  }
};
Node2.prototype.text = void 0;
var TextNode = class _TextNode extends Node2 {
  /**
  @internal
  */
  constructor(type, attrs, content, marks3) {
    super(type, attrs, null, marks3);
    if (!content)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = content;
  }
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    return wrapMarks(this.marks, JSON.stringify(this.text));
  }
  get textContent() {
    return this.text;
  }
  textBetween(from, to) {
    return this.text.slice(from, to);
  }
  get nodeSize() {
    return this.text.length;
  }
  mark(marks3) {
    return marks3 == this.marks ? this : new _TextNode(this.type, this.attrs, this.text, marks3);
  }
  withText(text2) {
    if (text2 == this.text)
      return this;
    return new _TextNode(this.type, this.attrs, text2, this.marks);
  }
  cut(from = 0, to = this.text.length) {
    if (from == 0 && to == this.text.length)
      return this;
    return this.withText(this.text.slice(from, to));
  }
  eq(other) {
    return this.sameMarkup(other) && this.text == other.text;
  }
  toJSON() {
    let base = super.toJSON();
    base.text = this.text;
    return base;
  }
};
function wrapMarks(marks3, str) {
  for (let i = marks3.length - 1; i >= 0; i--)
    str = marks3[i].type.name + "(" + str + ")";
  return str;
}
var ContentMatch = class _ContentMatch {
  /**
  @internal
  */
  constructor(validEnd) {
    this.validEnd = validEnd;
    this.next = [];
    this.wrapCache = [];
  }
  /**
  @internal
  */
  static parse(string, nodeTypes) {
    let stream = new TokenStream(string, nodeTypes);
    if (stream.next == null)
      return _ContentMatch.empty;
    let expr = parseExpr(stream);
    if (stream.next)
      stream.err("Unexpected trailing text");
    let match = dfa(nfa(expr));
    checkForDeadEnds(match, stream);
    return match;
  }
  /**
  Match a node type, returning a match after that node if
  successful.
  */
  matchType(type) {
    for (let i = 0; i < this.next.length; i++)
      if (this.next[i].type == type)
        return this.next[i].next;
    return null;
  }
  /**
  Try to match a fragment. Returns the resulting match when
  successful.
  */
  matchFragment(frag, start = 0, end = frag.childCount) {
    let cur = this;
    for (let i = start; cur && i < end; i++)
      cur = cur.matchType(frag.child(i).type);
    return cur;
  }
  /**
  @internal
  */
  get inlineContent() {
    return this.next.length != 0 && this.next[0].type.isInline;
  }
  /**
  Get the first matching node type at this match position that can
  be generated.
  */
  get defaultType() {
    for (let i = 0; i < this.next.length; i++) {
      let { type } = this.next[i];
      if (!(type.isText || type.hasRequiredAttrs()))
        return type;
    }
    return null;
  }
  /**
  @internal
  */
  compatible(other) {
    for (let i = 0; i < this.next.length; i++)
      for (let j2 = 0; j2 < other.next.length; j2++)
        if (this.next[i].type == other.next[j2].type)
          return true;
    return false;
  }
  /**
  Try to match the given fragment, and if that fails, see if it can
  be made to match by inserting nodes in front of it. When
  successful, return a fragment of inserted nodes (which may be
  empty if nothing had to be inserted). When `toEnd` is true, only
  return a fragment if the resulting match goes to the end of the
  content expression.
  */
  fillBefore(after, toEnd = false, startIndex = 0) {
    let seen = [this];
    function search(match, types) {
      let finished = match.matchFragment(after, startIndex);
      if (finished && (!toEnd || finished.validEnd))
        return Fragment.from(types.map((tp) => tp.createAndFill()));
      for (let i = 0; i < match.next.length; i++) {
        let { type, next } = match.next[i];
        if (!(type.isText || type.hasRequiredAttrs()) && seen.indexOf(next) == -1) {
          seen.push(next);
          let found2 = search(next, types.concat(type));
          if (found2)
            return found2;
        }
      }
      return null;
    }
    return search(this, []);
  }
  /**
  Find a set of wrapping node types that would allow a node of the
  given type to appear at this position. The result may be empty
  (when it fits directly) and will be null when no such wrapping
  exists.
  */
  findWrapping(target) {
    for (let i = 0; i < this.wrapCache.length; i += 2)
      if (this.wrapCache[i] == target)
        return this.wrapCache[i + 1];
    let computed = this.computeWrapping(target);
    this.wrapCache.push(target, computed);
    return computed;
  }
  /**
  @internal
  */
  computeWrapping(target) {
    let seen = /* @__PURE__ */ Object.create(null), active = [{ match: this, type: null, via: null }];
    while (active.length) {
      let current = active.shift(), match = current.match;
      if (match.matchType(target)) {
        let result = [];
        for (let obj = current; obj.type; obj = obj.via)
          result.push(obj.type);
        return result.reverse();
      }
      for (let i = 0; i < match.next.length; i++) {
        let { type, next } = match.next[i];
        if (!type.isLeaf && !type.hasRequiredAttrs() && !(type.name in seen) && (!current.type || next.validEnd)) {
          active.push({ match: type.contentMatch, type, via: current });
          seen[type.name] = true;
        }
      }
    }
    return null;
  }
  /**
  The number of outgoing edges this node has in the finite
  automaton that describes the content expression.
  */
  get edgeCount() {
    return this.next.length;
  }
  /**
  Get the _n_​th outgoing edge from this node in the finite
  automaton that describes the content expression.
  */
  edge(n) {
    if (n >= this.next.length)
      throw new RangeError(`There's no ${n}th edge in this content match`);
    return this.next[n];
  }
  /**
  @internal
  */
  toString() {
    let seen = [];
    function scan(m2) {
      seen.push(m2);
      for (let i = 0; i < m2.next.length; i++)
        if (seen.indexOf(m2.next[i].next) == -1)
          scan(m2.next[i].next);
    }
    scan(this);
    return seen.map((m2, i) => {
      let out = i + (m2.validEnd ? "*" : " ") + " ";
      for (let i2 = 0; i2 < m2.next.length; i2++)
        out += (i2 ? ", " : "") + m2.next[i2].type.name + "->" + seen.indexOf(m2.next[i2].next);
      return out;
    }).join("\n");
  }
};
ContentMatch.empty = new ContentMatch(true);
var TokenStream = class {
  constructor(string, nodeTypes) {
    this.string = string;
    this.nodeTypes = nodeTypes;
    this.inline = null;
    this.pos = 0;
    this.tokens = string.split(/\s*(?=\b|\W|$)/);
    if (this.tokens[this.tokens.length - 1] == "")
      this.tokens.pop();
    if (this.tokens[0] == "")
      this.tokens.shift();
  }
  get next() {
    return this.tokens[this.pos];
  }
  eat(tok) {
    return this.next == tok && (this.pos++ || true);
  }
  err(str) {
    throw new SyntaxError(str + " (in content expression '" + this.string + "')");
  }
};
function parseExpr(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSeq(stream));
  } while (stream.eat("|"));
  return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
}
function parseExprSeq(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSubscript(stream));
  } while (stream.next && stream.next != ")" && stream.next != "|");
  return exprs.length == 1 ? exprs[0] : { type: "seq", exprs };
}
function parseExprSubscript(stream) {
  let expr = parseExprAtom(stream);
  for (; ; ) {
    if (stream.eat("+"))
      expr = { type: "plus", expr };
    else if (stream.eat("*"))
      expr = { type: "star", expr };
    else if (stream.eat("?"))
      expr = { type: "opt", expr };
    else if (stream.eat("{"))
      expr = parseExprRange(stream, expr);
    else
      break;
  }
  return expr;
}
function parseNum(stream) {
  if (/\D/.test(stream.next))
    stream.err("Expected number, got '" + stream.next + "'");
  let result = Number(stream.next);
  stream.pos++;
  return result;
}
function parseExprRange(stream, expr) {
  let min2 = parseNum(stream), max2 = min2;
  if (stream.eat(",")) {
    if (stream.next != "}")
      max2 = parseNum(stream);
    else
      max2 = -1;
  }
  if (!stream.eat("}"))
    stream.err("Unclosed braced range");
  return { type: "range", min: min2, max: max2, expr };
}
function resolveName(stream, name) {
  let types = stream.nodeTypes, type = types[name];
  if (type)
    return [type];
  let result = [];
  for (let typeName in types) {
    let type2 = types[typeName];
    if (type2.isInGroup(name))
      result.push(type2);
  }
  if (result.length == 0)
    stream.err("No node type or group '" + name + "' found");
  return result;
}
function parseExprAtom(stream) {
  if (stream.eat("(")) {
    let expr = parseExpr(stream);
    if (!stream.eat(")"))
      stream.err("Missing closing paren");
    return expr;
  } else if (!/\W/.test(stream.next)) {
    let exprs = resolveName(stream, stream.next).map((type) => {
      if (stream.inline == null)
        stream.inline = type.isInline;
      else if (stream.inline != type.isInline)
        stream.err("Mixing inline and block content");
      return { type: "name", value: type };
    });
    stream.pos++;
    return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
  } else {
    stream.err("Unexpected token '" + stream.next + "'");
  }
}
function nfa(expr) {
  let nfa2 = [[]];
  connect(compile(expr, 0), node());
  return nfa2;
  function node() {
    return nfa2.push([]) - 1;
  }
  function edge(from, to, term) {
    let edge2 = { term, to };
    nfa2[from].push(edge2);
    return edge2;
  }
  function connect(edges, to) {
    edges.forEach((edge2) => edge2.to = to);
  }
  function compile(expr2, from) {
    if (expr2.type == "choice") {
      return expr2.exprs.reduce((out, expr3) => out.concat(compile(expr3, from)), []);
    } else if (expr2.type == "seq") {
      for (let i = 0; ; i++) {
        let next = compile(expr2.exprs[i], from);
        if (i == expr2.exprs.length - 1)
          return next;
        connect(next, from = node());
      }
    } else if (expr2.type == "star") {
      let loop = node();
      edge(from, loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "plus") {
      let loop = node();
      connect(compile(expr2.expr, from), loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "opt") {
      return [edge(from)].concat(compile(expr2.expr, from));
    } else if (expr2.type == "range") {
      let cur = from;
      for (let i = 0; i < expr2.min; i++) {
        let next = node();
        connect(compile(expr2.expr, cur), next);
        cur = next;
      }
      if (expr2.max == -1) {
        connect(compile(expr2.expr, cur), cur);
      } else {
        for (let i = expr2.min; i < expr2.max; i++) {
          let next = node();
          edge(cur, next);
          connect(compile(expr2.expr, cur), next);
          cur = next;
        }
      }
      return [edge(cur)];
    } else if (expr2.type == "name") {
      return [edge(from, void 0, expr2.value)];
    } else {
      throw new Error("Unknown expr type");
    }
  }
}
function cmp(a, b2) {
  return b2 - a;
}
function nullFrom(nfa2, node) {
  let result = [];
  scan(node);
  return result.sort(cmp);
  function scan(node2) {
    let edges = nfa2[node2];
    if (edges.length == 1 && !edges[0].term)
      return scan(edges[0].to);
    result.push(node2);
    for (let i = 0; i < edges.length; i++) {
      let { term, to } = edges[i];
      if (!term && result.indexOf(to) == -1)
        scan(to);
    }
  }
}
function dfa(nfa2) {
  let labeled = /* @__PURE__ */ Object.create(null);
  return explore(nullFrom(nfa2, 0));
  function explore(states) {
    let out = [];
    states.forEach((node) => {
      nfa2[node].forEach(({ term, to }) => {
        if (!term)
          return;
        let set;
        for (let i = 0; i < out.length; i++)
          if (out[i][0] == term)
            set = out[i][1];
        nullFrom(nfa2, to).forEach((node2) => {
          if (!set)
            out.push([term, set = []]);
          if (set.indexOf(node2) == -1)
            set.push(node2);
        });
      });
    });
    let state = labeled[states.join(",")] = new ContentMatch(states.indexOf(nfa2.length - 1) > -1);
    for (let i = 0; i < out.length; i++) {
      let states2 = out[i][1].sort(cmp);
      state.next.push({ type: out[i][0], next: labeled[states2.join(",")] || explore(states2) });
    }
    return state;
  }
}
function checkForDeadEnds(match, stream) {
  for (let i = 0, work = [match]; i < work.length; i++) {
    let state = work[i], dead = !state.validEnd, nodes2 = [];
    for (let j2 = 0; j2 < state.next.length; j2++) {
      let { type, next } = state.next[j2];
      nodes2.push(type.name);
      if (dead && !(type.isText || type.hasRequiredAttrs()))
        dead = false;
      if (work.indexOf(next) == -1)
        work.push(next);
    }
    if (dead)
      stream.err("Only non-generatable nodes (" + nodes2.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function defaultAttrs(attrs) {
  let defaults = /* @__PURE__ */ Object.create(null);
  for (let attrName in attrs) {
    let attr = attrs[attrName];
    if (!attr.hasDefault)
      return null;
    defaults[attrName] = attr.default;
  }
  return defaults;
}
function computeAttrs(attrs, value) {
  let built = /* @__PURE__ */ Object.create(null);
  for (let name in attrs) {
    let given = value && value[name];
    if (given === void 0) {
      let attr = attrs[name];
      if (attr.hasDefault)
        given = attr.default;
      else
        throw new RangeError("No value supplied for attribute " + name);
    }
    built[name] = given;
  }
  return built;
}
function checkAttrs(attrs, values, type, name) {
  for (let attr in values)
    if (!(attr in attrs))
      throw new RangeError(`Unsupported attribute ${attr} for ${type} of type ${name}`);
  for (let attr in attrs) {
    if (attrs[attr].validate)
      attrs[attr].validate(values[attr]);
  }
}
function initAttrs(typeName, attrs) {
  let result = /* @__PURE__ */ Object.create(null);
  if (attrs)
    for (let name in attrs)
      result[name] = new Attribute(typeName, name, attrs[name]);
  return result;
}
var NodeType = class _NodeType {
  /**
  @internal
  */
  constructor(name, schema3, spec) {
    this.name = name;
    this.schema = schema3;
    this.spec = spec;
    this.markSet = null;
    this.groups = spec.group ? spec.group.split(" ") : [];
    this.attrs = initAttrs(name, spec.attrs);
    this.defaultAttrs = defaultAttrs(this.attrs);
    this.contentMatch = null;
    this.inlineContent = null;
    this.isBlock = !(spec.inline || name == "text");
    this.isText = name == "text";
  }
  /**
  True if this is an inline type.
  */
  get isInline() {
    return !this.isBlock;
  }
  /**
  True if this is a textblock type, a block that contains inline
  content.
  */
  get isTextblock() {
    return this.isBlock && this.inlineContent;
  }
  /**
  True for node types that allow no content.
  */
  get isLeaf() {
    return this.contentMatch == ContentMatch.empty;
  }
  /**
  True when this node is an atom, i.e. when it does not have
  directly editable content.
  */
  get isAtom() {
    return this.isLeaf || !!this.spec.atom;
  }
  /**
  Return true when this node type is part of the given
  [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group).
  */
  isInGroup(group) {
    return this.groups.indexOf(group) > -1;
  }
  /**
  The node type's [whitespace](https://prosemirror.net/docs/ref/#model.NodeSpec.whitespace) option.
  */
  get whitespace() {
    return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
  }
  /**
  Tells you whether this node type has any required attributes.
  */
  hasRequiredAttrs() {
    for (let n in this.attrs)
      if (this.attrs[n].isRequired)
        return true;
    return false;
  }
  /**
  Indicates whether this node allows some of the same content as
  the given node type.
  */
  compatibleContent(other) {
    return this == other || this.contentMatch.compatible(other.contentMatch);
  }
  /**
  @internal
  */
  computeAttrs(attrs) {
    if (!attrs && this.defaultAttrs)
      return this.defaultAttrs;
    else
      return computeAttrs(this.attrs, attrs);
  }
  /**
  Create a `Node` of this type. The given attributes are
  checked and defaulted (you can pass `null` to use the type's
  defaults entirely, if no required attributes exist). `content`
  may be a `Fragment`, a node, an array of nodes, or
  `null`. Similarly `marks` may be `null` to default to the empty
  set of marks.
  */
  create(attrs = null, content, marks3) {
    if (this.isText)
      throw new Error("NodeType.create can't construct text nodes");
    return new Node2(this, this.computeAttrs(attrs), Fragment.from(content), Mark.setFrom(marks3));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(attrs = null, content, marks3) {
    content = Fragment.from(content);
    this.checkContent(content);
    return new Node2(this, this.computeAttrs(attrs), content, Mark.setFrom(marks3));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but see if it is
  necessary to add nodes to the start or end of the given fragment
  to make it fit the node. If no fitting wrapping can be found,
  return null. Note that, due to the fact that required nodes can
  always be created, this will always succeed if you pass null or
  `Fragment.empty` as content.
  */
  createAndFill(attrs = null, content, marks3) {
    attrs = this.computeAttrs(attrs);
    content = Fragment.from(content);
    if (content.size) {
      let before = this.contentMatch.fillBefore(content);
      if (!before)
        return null;
      content = before.append(content);
    }
    let matched = this.contentMatch.matchFragment(content);
    let after = matched && matched.fillBefore(Fragment.empty, true);
    if (!after)
      return null;
    return new Node2(this, attrs, content.append(after), Mark.setFrom(marks3));
  }
  /**
  Returns true if the given fragment is valid content for this node
  type.
  */
  validContent(content) {
    let result = this.contentMatch.matchFragment(content);
    if (!result || !result.validEnd)
      return false;
    for (let i = 0; i < content.childCount; i++)
      if (!this.allowsMarks(content.child(i).marks))
        return false;
    return true;
  }
  /**
  Throws a RangeError if the given fragment is not valid content for this
  node type.
  @internal
  */
  checkContent(content) {
    if (!this.validContent(content))
      throw new RangeError(`Invalid content for node ${this.name}: ${content.toString().slice(0, 50)}`);
  }
  /**
  @internal
  */
  checkAttrs(attrs) {
    checkAttrs(this.attrs, attrs, "node", this.name);
  }
  /**
  Check whether the given mark type is allowed in this node.
  */
  allowsMarkType(markType) {
    return this.markSet == null || this.markSet.indexOf(markType) > -1;
  }
  /**
  Test whether the given set of marks are allowed in this node.
  */
  allowsMarks(marks3) {
    if (this.markSet == null)
      return true;
    for (let i = 0; i < marks3.length; i++)
      if (!this.allowsMarkType(marks3[i].type))
        return false;
    return true;
  }
  /**
  Removes the marks that are not allowed in this node from the given set.
  */
  allowedMarks(marks3) {
    if (this.markSet == null)
      return marks3;
    let copy;
    for (let i = 0; i < marks3.length; i++) {
      if (!this.allowsMarkType(marks3[i].type)) {
        if (!copy)
          copy = marks3.slice(0, i);
      } else if (copy) {
        copy.push(marks3[i]);
      }
    }
    return !copy ? marks3 : copy.length ? copy : Mark.none;
  }
  /**
  @internal
  */
  static compile(nodes2, schema3) {
    let result = /* @__PURE__ */ Object.create(null);
    nodes2.forEach((name, spec) => result[name] = new _NodeType(name, schema3, spec));
    let topType = schema3.spec.topNode || "doc";
    if (!result[topType])
      throw new RangeError("Schema is missing its top node type ('" + topType + "')");
    if (!result.text)
      throw new RangeError("Every schema needs a 'text' type");
    for (let _ in result.text.attrs)
      throw new RangeError("The text node type should not have attributes");
    return result;
  }
};
function validateType(typeName, attrName, type) {
  let types = type.split("|");
  return (value) => {
    let name = value === null ? "null" : typeof value;
    if (types.indexOf(name) < 0)
      throw new RangeError(`Expected value of type ${types} for attribute ${attrName} on type ${typeName}, got ${name}`);
  };
}
var Attribute = class {
  constructor(typeName, attrName, options) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(options, "default");
    this.default = options.default;
    this.validate = typeof options.validate == "string" ? validateType(typeName, attrName, options.validate) : options.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
};
var MarkType = class _MarkType {
  /**
  @internal
  */
  constructor(name, rank, schema3, spec) {
    this.name = name;
    this.rank = rank;
    this.schema = schema3;
    this.spec = spec;
    this.attrs = initAttrs(name, spec.attrs);
    this.excluded = null;
    let defaults = defaultAttrs(this.attrs);
    this.instance = defaults ? new Mark(this, defaults) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(attrs = null) {
    if (!attrs && this.instance)
      return this.instance;
    return new Mark(this, computeAttrs(this.attrs, attrs));
  }
  /**
  @internal
  */
  static compile(marks3, schema3) {
    let result = /* @__PURE__ */ Object.create(null), rank = 0;
    marks3.forEach((name, spec) => result[name] = new _MarkType(name, rank++, schema3, spec));
    return result;
  }
  /**
  When there is a mark of this type in the given set, a new set
  without it is returned. Otherwise, the input set is returned.
  */
  removeFromSet(set) {
    for (var i = 0; i < set.length; i++)
      if (set[i].type == this) {
        set = set.slice(0, i).concat(set.slice(i + 1));
        i--;
      }
    return set;
  }
  /**
  Tests whether there is a mark of this type in the given set.
  */
  isInSet(set) {
    for (let i = 0; i < set.length; i++)
      if (set[i].type == this)
        return set[i];
  }
  /**
  @internal
  */
  checkAttrs(attrs) {
    checkAttrs(this.attrs, attrs, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(other) {
    return this.excluded.indexOf(other) > -1;
  }
};
var Schema = class {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(spec) {
    this.linebreakReplacement = null;
    this.cached = /* @__PURE__ */ Object.create(null);
    let instanceSpec = this.spec = {};
    for (let prop in spec)
      instanceSpec[prop] = spec[prop];
    instanceSpec.nodes = dist_default.from(spec.nodes), instanceSpec.marks = dist_default.from(spec.marks || {}), this.nodes = NodeType.compile(this.spec.nodes, this);
    this.marks = MarkType.compile(this.spec.marks, this);
    let contentExprCache = /* @__PURE__ */ Object.create(null);
    for (let prop in this.nodes) {
      if (prop in this.marks)
        throw new RangeError(prop + " can not be both a node and a mark");
      let type = this.nodes[prop], contentExpr = type.spec.content || "", markExpr = type.spec.marks;
      type.contentMatch = contentExprCache[contentExpr] || (contentExprCache[contentExpr] = ContentMatch.parse(contentExpr, this.nodes));
      type.inlineContent = type.contentMatch.inlineContent;
      if (type.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!type.isInline || !type.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = type;
      }
      type.markSet = markExpr == "_" ? null : markExpr ? gatherMarks(this, markExpr.split(" ")) : markExpr == "" || !type.inlineContent ? [] : null;
    }
    for (let prop in this.marks) {
      let type = this.marks[prop], excl = type.spec.excludes;
      type.excluded = excl == null ? [type] : excl == "" ? [] : gatherMarks(this, excl.split(" "));
    }
    this.nodeFromJSON = (json) => Node2.fromJSON(this, json);
    this.markFromJSON = (json) => Mark.fromJSON(this, json);
    this.topNodeType = this.nodes[this.spec.topNode || "doc"];
    this.cached.wrappings = /* @__PURE__ */ Object.create(null);
  }
  /**
  Create a node in this schema. The `type` may be a string or a
  `NodeType` instance. Attributes will be extended with defaults,
  `content` may be a `Fragment`, `null`, a `Node`, or an array of
  nodes.
  */
  node(type, attrs = null, content, marks3) {
    if (typeof type == "string")
      type = this.nodeType(type);
    else if (!(type instanceof NodeType))
      throw new RangeError("Invalid node type: " + type);
    else if (type.schema != this)
      throw new RangeError("Node type from different schema used (" + type.name + ")");
    return type.createChecked(attrs, content, marks3);
  }
  /**
  Create a text node in the schema. Empty text nodes are not
  allowed.
  */
  text(text2, marks3) {
    let type = this.nodes.text;
    return new TextNode(type, type.defaultAttrs, text2, Mark.setFrom(marks3));
  }
  /**
  Create a mark with the given type and attributes.
  */
  mark(type, attrs) {
    if (typeof type == "string")
      type = this.marks[type];
    return type.create(attrs);
  }
  /**
  @internal
  */
  nodeType(name) {
    let found2 = this.nodes[name];
    if (!found2)
      throw new RangeError("Unknown node type: " + name);
    return found2;
  }
};
function gatherMarks(schema3, marks3) {
  let found2 = [];
  for (let i = 0; i < marks3.length; i++) {
    let name = marks3[i], mark = schema3.marks[name], ok = mark;
    if (mark) {
      found2.push(mark);
    } else {
      for (let prop in schema3.marks) {
        let mark2 = schema3.marks[prop];
        if (name == "_" || mark2.spec.group && mark2.spec.group.split(" ").indexOf(name) > -1)
          found2.push(ok = mark2);
      }
    }
    if (!ok)
      throw new SyntaxError("Unknown mark type: '" + marks3[i] + "'");
  }
  return found2;
}

// node_modules/.pnpm/prosemirror-transform@1.12.0/node_modules/prosemirror-transform/dist/index.js
var lower16 = 65535;
var factor16 = Math.pow(2, 16);
function makeRecover(index, offset) {
  return index + offset * factor16;
}
function recoverIndex(value) {
  return value & lower16;
}
function recoverOffset(value) {
  return (value - (value & lower16)) / factor16;
}
var DEL_BEFORE = 1;
var DEL_AFTER = 2;
var DEL_ACROSS = 4;
var DEL_SIDE = 8;
var MapResult = class {
  /**
  @internal
  */
  constructor(pos, delInfo, recover) {
    this.pos = pos;
    this.delInfo = delInfo;
    this.recover = recover;
  }
  /**
  Tells you whether the position was deleted, that is, whether the
  step removed the token on the side queried (via the `assoc`)
  argument from the document.
  */
  get deleted() {
    return (this.delInfo & DEL_SIDE) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (DEL_BEFORE | DEL_ACROSS)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (DEL_AFTER | DEL_ACROSS)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & DEL_ACROSS) > 0;
  }
};
var StepMap = class _StepMap {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(ranges, inverted = false) {
    this.ranges = ranges;
    this.inverted = inverted;
    if (!ranges.length && _StepMap.empty)
      return _StepMap.empty;
  }
  /**
  @internal
  */
  recover(value) {
    let diff = 0, index = recoverIndex(value);
    if (!this.inverted)
      for (let i = 0; i < index; i++)
        diff += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[index * 3] + diff + recoverOffset(value);
  }
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  map(pos, assoc = 1) {
    return this._map(pos, assoc, true);
  }
  /**
  @internal
  */
  _map(pos, assoc, simple) {
    let diff = 0, oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i] - (this.inverted ? diff : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex], end = start + oldSize;
      if (pos <= end) {
        let side = !oldSize ? assoc : pos == start ? -1 : pos == end ? 1 : assoc;
        let result = start + diff + (side < 0 ? 0 : newSize);
        if (simple)
          return result;
        let recover = pos == (assoc < 0 ? start : end) ? null : makeRecover(i / 3, pos - start);
        let del2 = pos == start ? DEL_AFTER : pos == end ? DEL_BEFORE : DEL_ACROSS;
        if (assoc < 0 ? pos != start : pos != end)
          del2 |= DEL_SIDE;
        return new MapResult(result, del2, recover);
      }
      diff += newSize - oldSize;
    }
    return simple ? pos + diff : new MapResult(pos + diff, 0, null);
  }
  /**
  @internal
  */
  touches(pos, recover) {
    let diff = 0, index = recoverIndex(recover);
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i] - (this.inverted ? diff : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i + oldIndex], end = start + oldSize;
      if (pos <= end && i == index * 3)
        return true;
      diff += this.ranges[i + newIndex] - oldSize;
    }
    return false;
  }
  /**
  Calls the given function on each of the changed ranges included in
  this map.
  */
  forEach(f) {
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0, diff = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i], oldStart = start - (this.inverted ? diff : 0), newStart = start + (this.inverted ? 0 : diff);
      let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex];
      f(oldStart, oldStart + oldSize, newStart, newStart + newSize);
      diff += newSize - oldSize;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new _StepMap(this.ranges, !this.inverted);
  }
  /**
  @internal
  */
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  /**
  Create a map that moves all positions by offset `n` (which may be
  negative). This can be useful when applying steps meant for a
  sub-document to a larger document, or vice-versa.
  */
  static offset(n) {
    return n == 0 ? _StepMap.empty : new _StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
  }
};
StepMap.empty = new StepMap([]);
var Mapping = class _Mapping {
  /**
  Create a new mapping with the given position maps.
  */
  constructor(maps, mirror, from = 0, to = maps ? maps.length : 0) {
    this.mirror = mirror;
    this.from = from;
    this.to = to;
    this._maps = maps || [];
    this.ownData = !(maps || mirror);
  }
  /**
  The step maps in this mapping.
  */
  get maps() {
    return this._maps;
  }
  /**
  Create a mapping that maps only through a part of this one.
  */
  slice(from = 0, to = this.maps.length) {
    return new _Mapping(this._maps, this.mirror, from, to);
  }
  /**
  Add a step map to the end of this mapping. If `mirrors` is
  given, it should be the index of the step map that is the mirror
  image of this one.
  */
  appendMap(map, mirrors) {
    if (!this.ownData) {
      this._maps = this._maps.slice();
      this.mirror = this.mirror && this.mirror.slice();
      this.ownData = true;
    }
    this.to = this._maps.push(map);
    if (mirrors != null)
      this.setMirror(this._maps.length - 1, mirrors);
  }
  /**
  Add all the step maps in a given mapping to this one (preserving
  mirroring information).
  */
  appendMapping(mapping) {
    for (let i = 0, startSize = this._maps.length; i < mapping._maps.length; i++) {
      let mirr = mapping.getMirror(i);
      this.appendMap(mapping._maps[i], mirr != null && mirr < i ? startSize + mirr : void 0);
    }
  }
  /**
  Finds the offset of the step map that mirrors the map at the
  given offset, in this mapping (as per the second argument to
  `appendMap`).
  */
  getMirror(n) {
    if (this.mirror) {
      for (let i = 0; i < this.mirror.length; i++)
        if (this.mirror[i] == n)
          return this.mirror[i + (i % 2 ? -1 : 1)];
    }
  }
  /**
  @internal
  */
  setMirror(n, m2) {
    if (!this.mirror)
      this.mirror = [];
    this.mirror.push(n, m2);
  }
  /**
  Append the inverse of the given mapping to this one.
  */
  appendMappingInverted(mapping) {
    for (let i = mapping.maps.length - 1, totalSize = this._maps.length + mapping._maps.length; i >= 0; i--) {
      let mirr = mapping.getMirror(i);
      this.appendMap(mapping._maps[i].invert(), mirr != null && mirr > i ? totalSize - mirr - 1 : void 0);
    }
  }
  /**
  Create an inverted version of this mapping.
  */
  invert() {
    let inverse = new _Mapping();
    inverse.appendMappingInverted(this);
    return inverse;
  }
  /**
  Map a position through this mapping.
  */
  map(pos, assoc = 1) {
    if (this.mirror)
      return this._map(pos, assoc, true);
    for (let i = this.from; i < this.to; i++)
      pos = this._maps[i].map(pos, assoc);
    return pos;
  }
  /**
  Map a position through this mapping, returning a mapping
  result.
  */
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  /**
  @internal
  */
  _map(pos, assoc, simple) {
    let delInfo = 0;
    for (let i = this.from; i < this.to; i++) {
      let map = this._maps[i], result = map.mapResult(pos, assoc);
      if (result.recover != null) {
        let corr = this.getMirror(i);
        if (corr != null && corr > i && corr < this.to) {
          i = corr;
          pos = this._maps[corr].recover(result.recover);
          continue;
        }
      }
      delInfo |= result.delInfo;
      pos = result.pos;
    }
    return simple ? pos : new MapResult(pos, delInfo, null);
  }
};
var stepsByID = /* @__PURE__ */ Object.create(null);
var Step = class {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return StepMap.empty;
  }
  /**
  Try to merge this step with another one, to be applied directly
  after it. Returns the merged step when possible, null if the
  steps can't be merged.
  */
  merge(other) {
    return null;
  }
  /**
  Deserialize a step from its JSON representation. Will call
  through to the step class' own implementation of this method.
  */
  static fromJSON(schema3, json) {
    if (!json || !json.stepType)
      throw new RangeError("Invalid input for Step.fromJSON");
    let type = stepsByID[json.stepType];
    if (!type)
      throw new RangeError(`No step type ${json.stepType} defined`);
    return type.fromJSON(schema3, json);
  }
  /**
  To be able to serialize steps to JSON, each step needs a string
  ID to attach to its JSON representation. Use this method to
  register an ID for your step classes. Try to pick something
  that's unlikely to clash with steps from other modules.
  */
  static jsonID(id, stepClass) {
    if (id in stepsByID)
      throw new RangeError("Duplicate use of step JSON ID " + id);
    stepsByID[id] = stepClass;
    stepClass.prototype.jsonID = id;
    return stepClass;
  }
};
var StepResult = class _StepResult {
  /**
  @internal
  */
  constructor(doc2, failed) {
    this.doc = doc2;
    this.failed = failed;
  }
  /**
  Create a successful step result.
  */
  static ok(doc2) {
    return new _StepResult(doc2, null);
  }
  /**
  Create a failed step result.
  */
  static fail(message) {
    return new _StepResult(null, message);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(doc2, from, to, slice) {
    try {
      return _StepResult.ok(doc2.replace(from, to, slice));
    } catch (e) {
      if (e instanceof ReplaceError)
        return _StepResult.fail(e.message);
      throw e;
    }
  }
};
function mapFragment(fragment, f, parent) {
  let mapped = [];
  for (let i = 0; i < fragment.childCount; i++) {
    let child = fragment.child(i);
    if (child.content.size)
      child = child.copy(mapFragment(child.content, f, child));
    if (child.isInline)
      child = f(child, parent, i);
    mapped.push(child);
  }
  return Fragment.fromArray(mapped);
}
var AddMarkStep = class _AddMarkStep extends Step {
  /**
  Create a mark step.
  */
  constructor(from, to, mark) {
    super();
    this.from = from;
    this.to = to;
    this.mark = mark;
  }
  apply(doc2) {
    let oldSlice = doc2.slice(this.from, this.to), $from = doc2.resolve(this.from);
    let parent = $from.node($from.sharedDepth(this.to));
    let slice = new Slice(mapFragment(oldSlice.content, (node, parent2) => {
      if (!node.isAtom || !parent2.type.allowsMarkType(this.mark.type))
        return node;
      return node.mark(this.mark.addToSet(node.marks));
    }, parent), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc2, this.from, this.to, slice);
  }
  invert() {
    return new RemoveMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deleted && to.deleted || from.pos >= to.pos)
      return null;
    return new _AddMarkStep(from.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof _AddMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new _AddMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "addMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema3, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for AddMarkStep.fromJSON");
    return new _AddMarkStep(json.from, json.to, schema3.markFromJSON(json.mark));
  }
};
Step.jsonID("addMark", AddMarkStep);
var RemoveMarkStep = class _RemoveMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(from, to, mark) {
    super();
    this.from = from;
    this.to = to;
    this.mark = mark;
  }
  apply(doc2) {
    let oldSlice = doc2.slice(this.from, this.to);
    let slice = new Slice(mapFragment(oldSlice.content, (node) => {
      return node.mark(this.mark.removeFromSet(node.marks));
    }, doc2), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc2, this.from, this.to, slice);
  }
  invert() {
    return new AddMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deleted && to.deleted || from.pos >= to.pos)
      return null;
    return new _RemoveMarkStep(from.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof _RemoveMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new _RemoveMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "removeMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema3, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
    return new _RemoveMarkStep(json.from, json.to, schema3.markFromJSON(json.mark));
  }
};
Step.jsonID("removeMark", RemoveMarkStep);
var AddNodeMarkStep = class _AddNodeMarkStep extends Step {
  /**
  Create a node mark step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.addToSet(node.marks));
    return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (node) {
      let newSet = this.mark.addToSet(node.marks);
      if (newSet.length == node.marks.length) {
        for (let i = 0; i < node.marks.length; i++)
          if (!node.marks[i].isInSet(newSet))
            return new _AddNodeMarkStep(this.pos, node.marks[i]);
        return new _AddNodeMarkStep(this.pos, this.mark);
      }
    }
    return new RemoveNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _AddNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema3, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
    return new _AddNodeMarkStep(json.pos, schema3.markFromJSON(json.mark));
  }
};
Step.jsonID("addNodeMark", AddNodeMarkStep);
var RemoveNodeMarkStep = class _RemoveNodeMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.removeFromSet(node.marks));
    return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node || !this.mark.isInSet(node.marks))
      return this;
    return new AddNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _RemoveNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema3, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
    return new _RemoveNodeMarkStep(json.pos, schema3.markFromJSON(json.mark));
  }
};
Step.jsonID("removeNodeMark", RemoveNodeMarkStep);
var ReplaceStep = class _ReplaceStep extends Step {
  /**
  The given `slice` should fit the 'gap' between `from` and
  `to`—the depths must line up, and the surrounding nodes must be
  able to be joined with the open sides of the slice. When
  `structure` is true, the step will fail if the content between
  from and to is not just a sequence of closing and then opening
  tokens (this is to guard against rebased replace steps
  overwriting something they weren't supposed to).
  */
  constructor(from, to, slice, structure = false) {
    super();
    this.from = from;
    this.to = to;
    this.slice = slice;
    this.structure = structure;
  }
  apply(doc2) {
    if (this.structure && contentBetween(doc2, this.from, this.to))
      return StepResult.fail("Structure replace would overwrite content");
    return StepResult.fromReplace(doc2, this.from, this.to, this.slice);
  }
  getMap() {
    return new StepMap([this.from, this.to - this.from, this.slice.size]);
  }
  invert(doc2) {
    return new _ReplaceStep(this.from, this.from + this.slice.size, doc2.slice(this.from, this.to));
  }
  map(mapping) {
    let to = mapping.mapResult(this.to, -1);
    let from = this.from == this.to && _ReplaceStep.MAP_BIAS < 0 ? to : mapping.mapResult(this.from, 1);
    if (from.deletedAcross && to.deletedAcross)
      return null;
    return new _ReplaceStep(from.pos, Math.max(from.pos, to.pos), this.slice, this.structure);
  }
  merge(other) {
    if (!(other instanceof _ReplaceStep) || other.structure || this.structure)
      return null;
    if (this.from + this.slice.size == other.from && !this.slice.openEnd && !other.slice.openStart) {
      let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(this.slice.content.append(other.slice.content), this.slice.openStart, other.slice.openEnd);
      return new _ReplaceStep(this.from, this.to + (other.to - other.from), slice, this.structure);
    } else if (other.to == this.from && !this.slice.openStart && !other.slice.openEnd) {
      let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(other.slice.content.append(this.slice.content), other.slice.openStart, this.slice.openEnd);
      return new _ReplaceStep(other.from, this.to, slice, this.structure);
    } else {
      return null;
    }
  }
  toJSON() {
    let json = { stepType: "replace", from: this.from, to: this.to };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema3, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for ReplaceStep.fromJSON");
    return new _ReplaceStep(json.from, json.to, Slice.fromJSON(schema3, json.slice), !!json.structure);
  }
};
ReplaceStep.MAP_BIAS = 1;
Step.jsonID("replace", ReplaceStep);
var ReplaceAroundStep = class _ReplaceAroundStep extends Step {
  /**
  Create a replace-around step with the given range and gap.
  `insert` should be the point in the slice into which the content
  of the gap should be moved. `structure` has the same meaning as
  it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
  */
  constructor(from, to, gapFrom, gapTo, slice, insert, structure = false) {
    super();
    this.from = from;
    this.to = to;
    this.gapFrom = gapFrom;
    this.gapTo = gapTo;
    this.slice = slice;
    this.insert = insert;
    this.structure = structure;
  }
  apply(doc2) {
    if (this.structure && (contentBetween(doc2, this.from, this.gapFrom) || contentBetween(doc2, this.gapTo, this.to)))
      return StepResult.fail("Structure gap-replace would overwrite content");
    let gap = doc2.slice(this.gapFrom, this.gapTo);
    if (gap.openStart || gap.openEnd)
      return StepResult.fail("Gap is not a flat range");
    let inserted = this.slice.insertAt(this.insert, gap.content);
    if (!inserted)
      return StepResult.fail("Content does not fit in gap");
    return StepResult.fromReplace(doc2, this.from, this.to, inserted);
  }
  getMap() {
    return new StepMap([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert
    ]);
  }
  invert(doc2) {
    let gap = this.gapTo - this.gapFrom;
    return new _ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc2.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    let gapFrom = this.from == this.gapFrom ? from.pos : mapping.map(this.gapFrom, -1);
    let gapTo = this.to == this.gapTo ? to.pos : mapping.map(this.gapTo, 1);
    if (from.deletedAcross && to.deletedAcross || gapFrom < from.pos || gapTo > to.pos)
      return null;
    return new _ReplaceAroundStep(from.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
  }
  toJSON() {
    let json = {
      stepType: "replaceAround",
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert
    };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema3, json) {
    if (typeof json.from != "number" || typeof json.to != "number" || typeof json.gapFrom != "number" || typeof json.gapTo != "number" || typeof json.insert != "number")
      throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
    return new _ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, Slice.fromJSON(schema3, json.slice), json.insert, !!json.structure);
  }
};
Step.jsonID("replaceAround", ReplaceAroundStep);
function contentBetween(doc2, from, to) {
  let $from = doc2.resolve(from), dist = to - from, depth = $from.depth;
  while (dist > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
    depth--;
    dist--;
  }
  if (dist > 0) {
    let next = $from.node(depth).maybeChild($from.indexAfter(depth));
    while (dist > 0) {
      if (!next || next.isLeaf)
        return true;
      next = next.firstChild;
      dist--;
    }
  }
  return false;
}
function addMark(tr, from, to, mark) {
  let removed = [], added = [];
  let removing, adding;
  tr.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (!node.isInline)
      return;
    let marks3 = node.marks;
    if (!mark.isInSet(marks3) && parent.type.allowsMarkType(mark.type)) {
      let start = Math.max(pos, from), end = Math.min(pos + node.nodeSize, to);
      let newSet = mark.addToSet(marks3);
      for (let i = 0; i < marks3.length; i++) {
        if (!marks3[i].isInSet(newSet)) {
          if (removing && removing.to == start && removing.mark.eq(marks3[i]))
            removing.to = end;
          else
            removed.push(removing = new RemoveMarkStep(start, end, marks3[i]));
        }
      }
      if (adding && adding.to == start)
        adding.to = end;
      else
        added.push(adding = new AddMarkStep(start, end, mark));
    }
  });
  removed.forEach((s) => tr.step(s));
  added.forEach((s) => tr.step(s));
}
function removeMark(tr, from, to, mark) {
  let matched = [], step2 = 0;
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isInline)
      return;
    step2++;
    let toRemove = null;
    if (mark instanceof MarkType) {
      let set = node.marks, found2;
      while (found2 = mark.isInSet(set)) {
        (toRemove || (toRemove = [])).push(found2);
        set = found2.removeFromSet(set);
      }
    } else if (mark) {
      if (mark.isInSet(node.marks))
        toRemove = [mark];
    } else {
      toRemove = node.marks;
    }
    if (toRemove && toRemove.length) {
      let end = Math.min(pos + node.nodeSize, to);
      for (let i = 0; i < toRemove.length; i++) {
        let style = toRemove[i], found2;
        for (let j2 = 0; j2 < matched.length; j2++) {
          let m2 = matched[j2];
          if (m2.step == step2 - 1 && style.eq(matched[j2].style))
            found2 = m2;
        }
        if (found2) {
          found2.to = end;
          found2.step = step2;
        } else {
          matched.push({ style, from: Math.max(pos, from), to: end, step: step2 });
        }
      }
    }
  });
  matched.forEach((m2) => tr.step(new RemoveMarkStep(m2.from, m2.to, m2.style)));
}
function clearIncompatible(tr, pos, parentType, match = parentType.contentMatch, clearNewlines = true) {
  let node = tr.doc.nodeAt(pos);
  let replSteps = [], cur = pos + 1;
  for (let i = 0; i < node.childCount; i++) {
    let child = node.child(i), end = cur + child.nodeSize;
    let allowed = match.matchType(child.type);
    if (!allowed) {
      replSteps.push(new ReplaceStep(cur, end, Slice.empty));
    } else {
      match = allowed;
      for (let j2 = 0; j2 < child.marks.length; j2++)
        if (!parentType.allowsMarkType(child.marks[j2].type))
          tr.step(new RemoveMarkStep(cur, end, child.marks[j2]));
      if (clearNewlines && child.isText && parentType.whitespace != "pre") {
        let m2, newline = /\r?\n|\r/g, slice;
        while (m2 = newline.exec(child.text)) {
          if (!slice)
            slice = new Slice(Fragment.from(parentType.schema.text(" ", parentType.allowedMarks(child.marks))), 0, 0);
          replSteps.push(new ReplaceStep(cur + m2.index, cur + m2.index + m2[0].length, slice));
        }
      }
    }
    cur = end;
  }
  if (!match.validEnd) {
    let fill = match.fillBefore(Fragment.empty, true);
    tr.replace(cur, cur, new Slice(fill, 0, 0));
  }
  for (let i = replSteps.length - 1; i >= 0; i--)
    tr.step(replSteps[i]);
}
function canCut(node, start, end) {
  return (start == 0 || node.canReplace(start, node.childCount)) && (end == node.childCount || node.canReplace(0, end));
}
function liftTarget(range) {
  let parent = range.parent;
  let content = parent.content.cutByIndex(range.startIndex, range.endIndex);
  for (let depth = range.depth, contentBefore = 0, contentAfter = 0; ; --depth) {
    let node = range.$from.node(depth);
    let index = range.$from.index(depth) + contentBefore, endIndex = range.$to.indexAfter(depth) - contentAfter;
    if (depth < range.depth && node.canReplace(index, endIndex, content))
      return depth;
    if (depth == 0 || node.type.spec.isolating || !canCut(node, index, endIndex))
      break;
    if (index)
      contentBefore = 1;
    if (endIndex < node.childCount)
      contentAfter = 1;
  }
  return null;
}
function lift(tr, range, target) {
  let { $from, $to, depth } = range;
  let gapStart = $from.before(depth + 1), gapEnd = $to.after(depth + 1);
  let start = gapStart, end = gapEnd;
  let before = Fragment.empty, openStart = 0;
  for (let d = depth, splitting = false; d > target; d--)
    if (splitting || $from.index(d) > 0) {
      splitting = true;
      before = Fragment.from($from.node(d).copy(before));
      openStart++;
    } else {
      start--;
    }
  let after = Fragment.empty, openEnd = 0;
  for (let d = depth, splitting = false; d > target; d--)
    if (splitting || $to.after(d + 1) < $to.end(d)) {
      splitting = true;
      after = Fragment.from($to.node(d).copy(after));
      openEnd++;
    } else {
      end++;
    }
  tr.step(new ReplaceAroundStep(start, end, gapStart, gapEnd, new Slice(before.append(after), openStart, openEnd), before.size - openStart, true));
}
function findWrapping(range, nodeType, attrs = null, innerRange = range) {
  let around = findWrappingOutside(range, nodeType);
  let inner = around && findWrappingInside(innerRange, nodeType);
  if (!inner)
    return null;
  return around.map(withAttrs).concat({ type: nodeType, attrs }).concat(inner.map(withAttrs));
}
function withAttrs(type) {
  return { type, attrs: null };
}
function findWrappingOutside(range, type) {
  let { parent, startIndex, endIndex } = range;
  let around = parent.contentMatchAt(startIndex).findWrapping(type);
  if (!around)
    return null;
  let outer = around.length ? around[0] : type;
  return parent.canReplaceWith(startIndex, endIndex, outer) ? around : null;
}
function findWrappingInside(range, type) {
  let { parent, startIndex, endIndex } = range;
  let inner = parent.child(startIndex);
  let inside = type.contentMatch.findWrapping(inner.type);
  if (!inside)
    return null;
  let lastType = inside.length ? inside[inside.length - 1] : type;
  let innerMatch = lastType.contentMatch;
  for (let i = startIndex; innerMatch && i < endIndex; i++)
    innerMatch = innerMatch.matchType(parent.child(i).type);
  if (!innerMatch || !innerMatch.validEnd)
    return null;
  return inside;
}
function wrap(tr, range, wrappers) {
  let content = Fragment.empty;
  for (let i = wrappers.length - 1; i >= 0; i--) {
    if (content.size) {
      let match = wrappers[i].type.contentMatch.matchFragment(content);
      if (!match || !match.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    content = Fragment.from(wrappers[i].type.create(wrappers[i].attrs, content));
  }
  let start = range.start, end = range.end;
  tr.step(new ReplaceAroundStep(start, end, start, end, new Slice(content, 0, 0), wrappers.length, true));
}
function setBlockType(tr, from, to, type, attrs) {
  if (!type.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let mapFrom = tr.steps.length;
  tr.doc.nodesBetween(from, to, (node, pos) => {
    let attrsHere = typeof attrs == "function" ? attrs(node) : attrs;
    if (node.isTextblock && !node.hasMarkup(type, attrsHere) && canChangeType(tr.doc, tr.mapping.slice(mapFrom).map(pos), type)) {
      let convertNewlines = null;
      if (type.schema.linebreakReplacement) {
        let pre = type.whitespace == "pre", supportLinebreak = !!type.contentMatch.matchType(type.schema.linebreakReplacement);
        if (pre && !supportLinebreak)
          convertNewlines = false;
        else if (!pre && supportLinebreak)
          convertNewlines = true;
      }
      if (convertNewlines === false)
        replaceLinebreaks(tr, node, pos, mapFrom);
      clearIncompatible(tr, tr.mapping.slice(mapFrom).map(pos, 1), type, void 0, convertNewlines === null);
      let mapping = tr.mapping.slice(mapFrom);
      let startM = mapping.map(pos, 1), endM = mapping.map(pos + node.nodeSize, 1);
      tr.step(new ReplaceAroundStep(startM, endM, startM + 1, endM - 1, new Slice(Fragment.from(type.create(attrsHere, null, node.marks)), 0, 0), 1, true));
      if (convertNewlines === true)
        replaceNewlines(tr, node, pos, mapFrom);
      return false;
    }
  });
}
function replaceNewlines(tr, node, pos, mapFrom) {
  node.forEach((child, offset) => {
    if (child.isText) {
      let m2, newline = /\r?\n|\r/g;
      while (m2 = newline.exec(child.text)) {
        let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset + m2.index);
        tr.replaceWith(start, start + 1, node.type.schema.linebreakReplacement.create());
      }
    }
  });
}
function replaceLinebreaks(tr, node, pos, mapFrom) {
  node.forEach((child, offset) => {
    if (child.type == child.type.schema.linebreakReplacement) {
      let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset);
      tr.replaceWith(start, start + 1, node.type.schema.text("\n"));
    }
  });
}
function canChangeType(doc2, pos, type) {
  let $pos = doc2.resolve(pos), index = $pos.index();
  return $pos.parent.canReplaceWith(index, index + 1, type);
}
function setNodeMarkup(tr, pos, type, attrs, marks3) {
  let node = tr.doc.nodeAt(pos);
  if (!node)
    throw new RangeError("No node at given position");
  if (!type)
    type = node.type;
  let newNode = type.create(attrs, null, marks3 || node.marks);
  if (node.isLeaf)
    return tr.replaceWith(pos, pos + node.nodeSize, newNode);
  if (!type.validContent(node.content))
    throw new RangeError("Invalid content for node type " + type.name);
  tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + node.nodeSize - 1, new Slice(Fragment.from(newNode), 0, 0), 1, true));
}
function canSplit(doc2, pos, depth = 1, typesAfter) {
  let $pos = doc2.resolve(pos), base = $pos.depth - depth;
  let innerType = typesAfter && typesAfter[typesAfter.length - 1] || $pos.parent;
  if (base < 0 || $pos.parent.type.spec.isolating || !$pos.parent.canReplace($pos.index(), $pos.parent.childCount) || !innerType.type.validContent($pos.parent.content.cutByIndex($pos.index(), $pos.parent.childCount)))
    return false;
  for (let d = $pos.depth - 1, i = depth - 2; d > base; d--, i--) {
    let node = $pos.node(d), index2 = $pos.index(d);
    if (node.type.spec.isolating)
      return false;
    let rest = node.content.cutByIndex(index2, node.childCount);
    let overrideChild = typesAfter && typesAfter[i + 1];
    if (overrideChild)
      rest = rest.replaceChild(0, overrideChild.type.create(overrideChild.attrs));
    let after = typesAfter && typesAfter[i] || node;
    if (!node.canReplace(index2 + 1, node.childCount) || !after.type.validContent(rest))
      return false;
  }
  let index = $pos.indexAfter(base);
  let baseType = typesAfter && typesAfter[0];
  return $pos.node(base).canReplaceWith(index, index, baseType ? baseType.type : $pos.node(base + 1).type);
}
function split(tr, pos, depth = 1, typesAfter) {
  let $pos = tr.doc.resolve(pos), before = Fragment.empty, after = Fragment.empty;
  for (let d = $pos.depth, e = $pos.depth - depth, i = depth - 1; d > e; d--, i--) {
    before = Fragment.from($pos.node(d).copy(before));
    let typeAfter = typesAfter && typesAfter[i];
    after = Fragment.from(typeAfter ? typeAfter.type.create(typeAfter.attrs, after) : $pos.node(d).copy(after));
  }
  tr.step(new ReplaceStep(pos, pos, new Slice(before.append(after), depth, depth), true));
}
function canJoin(doc2, pos) {
  let $pos = doc2.resolve(pos), index = $pos.index();
  return joinable2($pos.nodeBefore, $pos.nodeAfter) && $pos.parent.canReplace(index, index + 1);
}
function canAppendWithSubstitutedLinebreaks(a, b2) {
  if (!b2.content.size)
    a.type.compatibleContent(b2.type);
  let match = a.contentMatchAt(a.childCount);
  let { linebreakReplacement } = a.type.schema;
  for (let i = 0; i < b2.childCount; i++) {
    let child = b2.child(i);
    let type = child.type == linebreakReplacement ? a.type.schema.nodes.text : child.type;
    match = match.matchType(type);
    if (!match)
      return false;
    if (!a.type.allowsMarks(child.marks))
      return false;
  }
  return match.validEnd;
}
function joinable2(a, b2) {
  return !!(a && b2 && !a.isLeaf && canAppendWithSubstitutedLinebreaks(a, b2));
}
function join(tr, pos, depth) {
  let convertNewlines = null;
  let { linebreakReplacement } = tr.doc.type.schema;
  let $before = tr.doc.resolve(pos - depth), beforeType = $before.node().type;
  if (linebreakReplacement && beforeType.inlineContent) {
    let pre = beforeType.whitespace == "pre";
    let supportLinebreak = !!beforeType.contentMatch.matchType(linebreakReplacement);
    if (pre && !supportLinebreak)
      convertNewlines = false;
    else if (!pre && supportLinebreak)
      convertNewlines = true;
  }
  let mapFrom = tr.steps.length;
  if (convertNewlines === false) {
    let $after = tr.doc.resolve(pos + depth);
    replaceLinebreaks(tr, $after.node(), $after.before(), mapFrom);
  }
  if (beforeType.inlineContent)
    clearIncompatible(tr, pos + depth - 1, beforeType, $before.node().contentMatchAt($before.index()), convertNewlines == null);
  let mapping = tr.mapping.slice(mapFrom), start = mapping.map(pos - depth);
  tr.step(new ReplaceStep(start, mapping.map(pos + depth, -1), Slice.empty, true));
  if (convertNewlines === true) {
    let $full = tr.doc.resolve(start);
    replaceNewlines(tr, $full.node(), $full.before(), tr.steps.length);
  }
  return tr;
}
function insertPoint(doc2, pos, nodeType) {
  let $pos = doc2.resolve(pos);
  if ($pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType))
    return pos;
  if ($pos.parentOffset == 0)
    for (let d = $pos.depth - 1; d >= 0; d--) {
      let index = $pos.index(d);
      if ($pos.node(d).canReplaceWith(index, index, nodeType))
        return $pos.before(d + 1);
      if (index > 0)
        return null;
    }
  if ($pos.parentOffset == $pos.parent.content.size)
    for (let d = $pos.depth - 1; d >= 0; d--) {
      let index = $pos.indexAfter(d);
      if ($pos.node(d).canReplaceWith(index, index, nodeType))
        return $pos.after(d + 1);
      if (index < $pos.node(d).childCount)
        return null;
    }
  return null;
}
function replaceStep(doc2, from, to = from, slice = Slice.empty) {
  if (from == to && !slice.size)
    return null;
  let $from = doc2.resolve(from), $to = doc2.resolve(to);
  if (fitsTrivially($from, $to, slice))
    return new ReplaceStep(from, to, slice);
  return new Fitter($from, $to, slice).fit();
}
function fitsTrivially($from, $to, slice) {
  return !slice.openStart && !slice.openEnd && $from.start() == $to.start() && $from.parent.canReplace($from.index(), $to.index(), slice.content);
}
var Fitter = class {
  constructor($from, $to, unplaced) {
    this.$from = $from;
    this.$to = $to;
    this.unplaced = unplaced;
    this.frontier = [];
    this.placed = Fragment.empty;
    for (let i = 0; i <= $from.depth; i++) {
      let node = $from.node(i);
      this.frontier.push({
        type: node.type,
        match: node.contentMatchAt($from.indexAfter(i))
      });
    }
    for (let i = $from.depth; i > 0; i--)
      this.placed = Fragment.from($from.node(i).copy(this.placed));
  }
  get depth() {
    return this.frontier.length - 1;
  }
  fit() {
    while (this.unplaced.size) {
      let fit = this.findFittable();
      if (fit)
        this.placeNodes(fit);
      else
        this.openMore() || this.dropNode();
    }
    let moveInline = this.mustMoveInline(), placedSize = this.placed.size - this.depth - this.$from.depth;
    let $from = this.$from, $to = this.close(moveInline < 0 ? this.$to : $from.doc.resolve(moveInline));
    if (!$to)
      return null;
    let content = this.placed, openStart = $from.depth, openEnd = $to.depth;
    while (openStart && openEnd && content.childCount == 1) {
      content = content.firstChild.content;
      openStart--;
      openEnd--;
    }
    let slice = new Slice(content, openStart, openEnd);
    if (moveInline > -1)
      return new ReplaceAroundStep($from.pos, moveInline, this.$to.pos, this.$to.end(), slice, placedSize);
    if (slice.size || $from.pos != this.$to.pos)
      return new ReplaceStep($from.pos, $to.pos, slice);
    return null;
  }
  // Find a position on the start spine of `this.unplaced` that has
  // content that can be moved somewhere on the frontier. Returns two
  // depths, one for the slice and one for the frontier.
  findFittable() {
    let startDepth = this.unplaced.openStart;
    for (let cur = this.unplaced.content, d = 0, openEnd = this.unplaced.openEnd; d < startDepth; d++) {
      let node = cur.firstChild;
      if (cur.childCount > 1)
        openEnd = 0;
      if (node.type.spec.isolating && openEnd <= d) {
        startDepth = d;
        break;
      }
      cur = node.content;
    }
    for (let pass = 1; pass <= 2; pass++) {
      for (let sliceDepth = pass == 1 ? startDepth : this.unplaced.openStart; sliceDepth >= 0; sliceDepth--) {
        let fragment, parent = null;
        if (sliceDepth) {
          parent = contentAt(this.unplaced.content, sliceDepth - 1).firstChild;
          fragment = parent.content;
        } else {
          fragment = this.unplaced.content;
        }
        let first = fragment.firstChild;
        for (let frontierDepth = this.depth; frontierDepth >= 0; frontierDepth--) {
          let { type, match } = this.frontier[frontierDepth], wrap2, inject = null;
          if (pass == 1 && (first ? match.matchType(first.type) || (inject = match.fillBefore(Fragment.from(first), false)) : parent && type.compatibleContent(parent.type)))
            return { sliceDepth, frontierDepth, parent, inject };
          else if (pass == 2 && first && (wrap2 = match.findWrapping(first.type)))
            return { sliceDepth, frontierDepth, parent, wrap: wrap2 };
          if (parent && match.matchType(parent.type))
            break;
        }
      }
    }
  }
  openMore() {
    let { content, openStart, openEnd } = this.unplaced;
    let inner = contentAt(content, openStart);
    if (!inner.childCount || inner.firstChild.isLeaf)
      return false;
    this.unplaced = new Slice(content, openStart + 1, Math.max(openEnd, inner.size + openStart >= content.size - openEnd ? openStart + 1 : 0));
    return true;
  }
  dropNode() {
    let { content, openStart, openEnd } = this.unplaced;
    let inner = contentAt(content, openStart);
    if (inner.childCount <= 1 && openStart > 0) {
      let openAtEnd = content.size - openStart <= openStart + inner.size;
      this.unplaced = new Slice(dropFromFragment(content, openStart - 1, 1), openStart - 1, openAtEnd ? openStart - 1 : openEnd);
    } else {
      this.unplaced = new Slice(dropFromFragment(content, openStart, 1), openStart, openEnd);
    }
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth, frontierDepth, parent, inject, wrap: wrap2 }) {
    while (this.depth > frontierDepth)
      this.closeFrontierNode();
    if (wrap2)
      for (let i = 0; i < wrap2.length; i++)
        this.openFrontierNode(wrap2[i]);
    let slice = this.unplaced, fragment = parent ? parent.content : slice.content;
    let openStart = slice.openStart - sliceDepth;
    let taken = 0, add = [];
    let { match, type } = this.frontier[frontierDepth];
    if (inject) {
      for (let i = 0; i < inject.childCount; i++)
        add.push(inject.child(i));
      match = match.matchFragment(inject);
    }
    let openEndCount = fragment.size + sliceDepth - (slice.content.size - slice.openEnd);
    while (taken < fragment.childCount) {
      let next = fragment.child(taken), matches = match.matchType(next.type);
      if (!matches)
        break;
      taken++;
      if (taken > 1 || openStart == 0 || next.content.size) {
        match = matches;
        add.push(closeNodeStart(next.mark(type.allowedMarks(next.marks)), taken == 1 ? openStart : 0, taken == fragment.childCount ? openEndCount : -1));
      }
    }
    let toEnd = taken == fragment.childCount;
    if (!toEnd)
      openEndCount = -1;
    this.placed = addToFragment(this.placed, frontierDepth, Fragment.from(add));
    this.frontier[frontierDepth].match = match;
    if (toEnd && openEndCount < 0 && parent && parent.type == this.frontier[this.depth].type && this.frontier.length > 1)
      this.closeFrontierNode();
    for (let i = 0, cur = fragment; i < openEndCount; i++) {
      let node = cur.lastChild;
      this.frontier.push({ type: node.type, match: node.contentMatchAt(node.childCount) });
      cur = node.content;
    }
    this.unplaced = !toEnd ? new Slice(dropFromFragment(slice.content, sliceDepth, taken), slice.openStart, slice.openEnd) : sliceDepth == 0 ? Slice.empty : new Slice(dropFromFragment(slice.content, sliceDepth - 1, 1), sliceDepth - 1, openEndCount < 0 ? slice.openEnd : sliceDepth - 1);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let top = this.frontier[this.depth], level;
    if (!top.type.isTextblock || !contentAfterFits(this.$to, this.$to.depth, top.type, top.match, false) || this.$to.depth == this.depth && (level = this.findCloseLevel(this.$to)) && level.depth == this.depth)
      return -1;
    let { depth } = this.$to, after = this.$to.after(depth);
    while (depth > 1 && after == this.$to.end(--depth))
      ++after;
    return after;
  }
  findCloseLevel($to) {
    scan: for (let i = Math.min(this.depth, $to.depth); i >= 0; i--) {
      let { match, type } = this.frontier[i];
      let dropInner = i < $to.depth && $to.end(i + 1) == $to.pos + ($to.depth - (i + 1));
      let fit = contentAfterFits($to, i, type, match, dropInner);
      if (!fit)
        continue;
      for (let d = i - 1; d >= 0; d--) {
        let { match: match2, type: type2 } = this.frontier[d];
        let matches = contentAfterFits($to, d, type2, match2, true);
        if (!matches || matches.childCount)
          continue scan;
      }
      return { depth: i, fit, move: dropInner ? $to.doc.resolve($to.after(i + 1)) : $to };
    }
  }
  close($to) {
    let close2 = this.findCloseLevel($to);
    if (!close2)
      return null;
    while (this.depth > close2.depth)
      this.closeFrontierNode();
    if (close2.fit.childCount)
      this.placed = addToFragment(this.placed, close2.depth, close2.fit);
    $to = close2.move;
    for (let d = close2.depth + 1; d <= $to.depth; d++) {
      let node = $to.node(d), add = node.type.contentMatch.fillBefore(node.content, true, $to.index(d));
      this.openFrontierNode(node.type, node.attrs, add);
    }
    return $to;
  }
  openFrontierNode(type, attrs = null, content) {
    let top = this.frontier[this.depth];
    top.match = top.match.matchType(type);
    this.placed = addToFragment(this.placed, this.depth, Fragment.from(type.create(attrs, content)));
    this.frontier.push({ type, match: type.contentMatch });
  }
  closeFrontierNode() {
    let open = this.frontier.pop();
    let add = open.match.fillBefore(Fragment.empty, true);
    if (add.childCount)
      this.placed = addToFragment(this.placed, this.frontier.length, add);
  }
};
function dropFromFragment(fragment, depth, count3) {
  if (depth == 0)
    return fragment.cutByIndex(count3, fragment.childCount);
  return fragment.replaceChild(0, fragment.firstChild.copy(dropFromFragment(fragment.firstChild.content, depth - 1, count3)));
}
function addToFragment(fragment, depth, content) {
  if (depth == 0)
    return fragment.append(content);
  return fragment.replaceChild(fragment.childCount - 1, fragment.lastChild.copy(addToFragment(fragment.lastChild.content, depth - 1, content)));
}
function contentAt(fragment, depth) {
  for (let i = 0; i < depth; i++)
    fragment = fragment.firstChild.content;
  return fragment;
}
function closeNodeStart(node, openStart, openEnd) {
  if (openStart <= 0)
    return node;
  let frag = node.content;
  if (openStart > 1)
    frag = frag.replaceChild(0, closeNodeStart(frag.firstChild, openStart - 1, frag.childCount == 1 ? openEnd - 1 : 0));
  if (openStart > 0) {
    frag = node.type.contentMatch.fillBefore(frag).append(frag);
    if (openEnd <= 0)
      frag = frag.append(node.type.contentMatch.matchFragment(frag).fillBefore(Fragment.empty, true));
  }
  return node.copy(frag);
}
function contentAfterFits($to, depth, type, match, open) {
  let node = $to.node(depth), index = open ? $to.indexAfter(depth) : $to.index(depth);
  if (index == node.childCount && !type.compatibleContent(node.type))
    return null;
  let fit = match.fillBefore(node.content, true, index);
  return fit && !invalidMarks(type, node.content, index) ? fit : null;
}
function invalidMarks(type, fragment, start) {
  for (let i = start; i < fragment.childCount; i++)
    if (!type.allowsMarks(fragment.child(i).marks))
      return true;
  return false;
}
function definesContent(type) {
  return type.spec.defining || type.spec.definingForContent;
}
function replaceRange(tr, from, to, slice) {
  if (!slice.size)
    return tr.deleteRange(from, to);
  let $from = tr.doc.resolve(from), $to = tr.doc.resolve(to);
  if (fitsTrivially($from, $to, slice))
    return tr.step(new ReplaceStep(from, to, slice));
  let targetDepths = coveredDepths($from, $to);
  if (targetDepths[targetDepths.length - 1] == 0)
    targetDepths.pop();
  let preferredTarget = -($from.depth + 1);
  targetDepths.unshift(preferredTarget);
  for (let d = $from.depth, pos = $from.pos - 1; d > 0; d--, pos--) {
    let spec = $from.node(d).type.spec;
    if (spec.defining || spec.definingAsContext || spec.isolating)
      break;
    if (targetDepths.indexOf(d) > -1)
      preferredTarget = d;
    else if ($from.before(d) == pos)
      targetDepths.splice(1, 0, -d);
  }
  let preferredTargetIndex = targetDepths.indexOf(preferredTarget);
  let leftNodes = [], preferredDepth = slice.openStart;
  for (let content = slice.content, i = 0; ; i++) {
    let node = content.firstChild;
    leftNodes.push(node);
    if (i == slice.openStart)
      break;
    content = node.content;
  }
  for (let d = preferredDepth - 1; d >= 0; d--) {
    let leftNode = leftNodes[d], def = definesContent(leftNode.type);
    if (def && !leftNode.sameMarkup($from.node(Math.abs(preferredTarget) - 1)))
      preferredDepth = d;
    else if (def || !leftNode.type.isTextblock)
      break;
  }
  for (let j2 = slice.openStart; j2 >= 0; j2--) {
    let openDepth = (j2 + preferredDepth + 1) % (slice.openStart + 1);
    let insert = leftNodes[openDepth];
    if (!insert)
      continue;
    for (let i = 0; i < targetDepths.length; i++) {
      let targetDepth = targetDepths[(i + preferredTargetIndex) % targetDepths.length], expand = true;
      if (targetDepth < 0) {
        expand = false;
        targetDepth = -targetDepth;
      }
      let parent = $from.node(targetDepth - 1), index = $from.index(targetDepth - 1);
      if (parent.canReplaceWith(index, index, insert.type, insert.marks))
        return tr.replace($from.before(targetDepth), expand ? $to.after(targetDepth) : to, new Slice(closeFragment(slice.content, 0, slice.openStart, openDepth), openDepth, slice.openEnd));
    }
  }
  let startSteps = tr.steps.length;
  for (let i = targetDepths.length - 1; i >= 0; i--) {
    tr.replace(from, to, slice);
    if (tr.steps.length > startSteps)
      break;
    let depth = targetDepths[i];
    if (depth < 0)
      continue;
    from = $from.before(depth);
    to = $to.after(depth);
  }
}
function closeFragment(fragment, depth, oldOpen, newOpen, parent) {
  if (depth < oldOpen) {
    let first = fragment.firstChild;
    fragment = fragment.replaceChild(0, first.copy(closeFragment(first.content, depth + 1, oldOpen, newOpen, first)));
  }
  if (depth > newOpen) {
    let match = parent.contentMatchAt(0);
    let start = match.fillBefore(fragment).append(fragment);
    fragment = start.append(match.matchFragment(start).fillBefore(Fragment.empty, true));
  }
  return fragment;
}
function replaceRangeWith(tr, from, to, node) {
  if (!node.isInline && from == to && tr.doc.resolve(from).parent.content.size) {
    let point = insertPoint(tr.doc, from, node.type);
    if (point != null)
      from = to = point;
  }
  tr.replaceRange(from, to, new Slice(Fragment.from(node), 0, 0));
}
function deleteRange(tr, from, to) {
  let $from = tr.doc.resolve(from), $to = tr.doc.resolve(to);
  if ($from.parent.isTextblock && $to.parent.isTextblock && $from.start() != $to.start() && $from.parentOffset == 0 && $to.parentOffset == 0) {
    let shared = $from.sharedDepth(to), isolated = false;
    for (let d = $from.depth; d > shared; d--)
      if ($from.node(d).type.spec.isolating)
        isolated = true;
    for (let d = $to.depth; d > shared; d--)
      if ($to.node(d).type.spec.isolating)
        isolated = true;
    if (!isolated) {
      for (let d = $from.depth; d > 0 && from == $from.start(d); d--)
        from = $from.before(d);
      for (let d = $to.depth; d > 0 && to == $to.start(d); d--)
        to = $to.before(d);
      $from = tr.doc.resolve(from);
      $to = tr.doc.resolve(to);
    }
  }
  let covered = coveredDepths($from, $to);
  for (let i = 0; i < covered.length; i++) {
    let depth = covered[i], last = i == covered.length - 1;
    if (last && depth == 0 || $from.node(depth).type.contentMatch.validEnd)
      return tr.delete($from.start(depth), $to.end(depth));
    if (depth > 0 && (last || $from.node(depth - 1).canReplace($from.index(depth - 1), $to.indexAfter(depth - 1))))
      return tr.delete($from.before(depth), $to.after(depth));
  }
  for (let d = 1; d <= $from.depth && d <= $to.depth; d++) {
    if (from - $from.start(d) == $from.depth - d && to > $from.end(d) && $to.end(d) - to != $to.depth - d && $from.start(d - 1) == $to.start(d - 1) && $from.node(d - 1).canReplace($from.index(d - 1), $to.index(d - 1)))
      return tr.delete($from.before(d), to);
  }
  tr.delete(from, to);
}
function coveredDepths($from, $to) {
  let result = [], minDepth = Math.min($from.depth, $to.depth);
  for (let d = minDepth; d >= 0; d--) {
    let start = $from.start(d);
    if (start < $from.pos - ($from.depth - d) || $to.end(d) > $to.pos + ($to.depth - d) || $from.node(d).type.spec.isolating || $to.node(d).type.spec.isolating)
      break;
    if (start == $to.start(d) || d == $from.depth && d == $to.depth && $from.parent.inlineContent && $to.parent.inlineContent && d && $to.start(d - 1) == start - 1)
      result.push(d);
  }
  return result;
}
var AttrStep = class _AttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(pos, attr, value) {
    super();
    this.pos = pos;
    this.attr = attr;
    this.value = value;
  }
  apply(doc2) {
    let node = doc2.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at attribute step's position");
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name in node.attrs)
      attrs[name] = node.attrs[name];
    attrs[this.attr] = this.value;
    let updated = node.type.create(attrs, null, node.marks);
    return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc2) {
    return new _AttrStep(this.pos, this.attr, doc2.nodeAt(this.pos).attrs[this.attr]);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _AttrStep(pos.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(schema3, json) {
    if (typeof json.pos != "number" || typeof json.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new _AttrStep(json.pos, json.attr, json.value);
  }
};
Step.jsonID("attr", AttrStep);
var DocAttrStep = class _DocAttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(attr, value) {
    super();
    this.attr = attr;
    this.value = value;
  }
  apply(doc2) {
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name in doc2.attrs)
      attrs[name] = doc2.attrs[name];
    attrs[this.attr] = this.value;
    let updated = doc2.type.create(attrs, doc2.content, doc2.marks);
    return StepResult.ok(updated);
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc2) {
    return new _DocAttrStep(this.attr, doc2.attrs[this.attr]);
  }
  map(mapping) {
    return this;
  }
  toJSON() {
    return { stepType: "docAttr", attr: this.attr, value: this.value };
  }
  static fromJSON(schema3, json) {
    if (typeof json.attr != "string")
      throw new RangeError("Invalid input for DocAttrStep.fromJSON");
    return new _DocAttrStep(json.attr, json.value);
  }
};
Step.jsonID("docAttr", DocAttrStep);
var TransformError = class extends Error {
};
TransformError = function TransformError2(message) {
  let err = Error.call(this, message);
  err.__proto__ = TransformError2.prototype;
  return err;
};
TransformError.prototype = Object.create(Error.prototype);
TransformError.prototype.constructor = TransformError;
TransformError.prototype.name = "TransformError";
var Transform = class {
  /**
  Create a transform that starts with the given document.
  */
  constructor(doc2) {
    this.doc = doc2;
    this.steps = [];
    this.docs = [];
    this.mapping = new Mapping();
  }
  /**
  The starting document.
  */
  get before() {
    return this.docs.length ? this.docs[0] : this.doc;
  }
  /**
  Apply a new step in this transform, saving the result. Throws an
  error when the step fails.
  */
  step(step2) {
    let result = this.maybeStep(step2);
    if (result.failed)
      throw new TransformError(result.failed);
    return this;
  }
  /**
  Try to apply a step in this transformation, ignoring it if it
  fails. Returns the step result.
  */
  maybeStep(step2) {
    let result = step2.apply(this.doc);
    if (!result.failed)
      this.addStep(step2, result.doc);
    return result;
  }
  /**
  True when the document has been changed (when there are any
  steps).
  */
  get docChanged() {
    return this.steps.length > 0;
  }
  /**
  Return a single range, in post-transform document positions,
  that covers all content changed by this transform. Returns null
  if no replacements are made. Note that this will ignore changes
  that add/remove marks without replacing the underlying content.
  */
  changedRange() {
    let from = 1e9, to = -1e9;
    for (let i = 0; i < this.mapping.maps.length; i++) {
      let map = this.mapping.maps[i];
      if (i) {
        from = map.map(from, 1);
        to = map.map(to, -1);
      }
      map.forEach((_f, _t2, fromB, toB) => {
        from = Math.min(from, fromB);
        to = Math.max(to, toB);
      });
    }
    return from == 1e9 ? null : { from, to };
  }
  /**
  @internal
  */
  addStep(step2, doc2) {
    this.docs.push(this.doc);
    this.steps.push(step2);
    this.mapping.appendMap(step2.getMap());
    this.doc = doc2;
  }
  /**
  Replace the part of the document between `from` and `to` with the
  given `slice`.
  */
  replace(from, to = from, slice = Slice.empty) {
    let step2 = replaceStep(this.doc, from, to, slice);
    if (step2)
      this.step(step2);
    return this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(from, to, content) {
    return this.replace(from, to, new Slice(Fragment.from(content), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(from, to) {
    return this.replace(from, to, Slice.empty);
  }
  /**
  Insert the given content at the given position.
  */
  insert(pos, content) {
    return this.replaceWith(pos, pos, content);
  }
  /**
  Replace a range of the document with a given slice, using
  `from`, `to`, and the slice's
  [`openStart`](https://prosemirror.net/docs/ref/#model.Slice.openStart) property as hints, rather
  than fixed start and end points. This method may grow the
  replaced area or close open nodes in the slice in order to get a
  fit that is more in line with WYSIWYG expectations, by dropping
  fully covered parent nodes of the replaced region when they are
  marked [non-defining as
  context](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext), or including an
  open parent node from the slice that _is_ marked as [defining
  its content](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
  
  This is the method, for example, to handle paste. The similar
  [`replace`](https://prosemirror.net/docs/ref/#transform.Transform.replace) method is a more
  primitive tool which will _not_ move the start and end of its given
  range, and is useful in situations where you need more precise
  control over what happens.
  */
  replaceRange(from, to, slice) {
    replaceRange(this, from, to, slice);
    return this;
  }
  /**
  Replace the given range with a node, but use `from` and `to` as
  hints, rather than precise positions. When from and to are the same
  and are at the start or end of a parent node in which the given
  node doesn't fit, this method may _move_ them out towards a parent
  that does allow the given node to be placed. When the given range
  completely covers a parent node, this method may completely replace
  that parent node.
  */
  replaceRangeWith(from, to, node) {
    replaceRangeWith(this, from, to, node);
    return this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(from, to) {
    deleteRange(this, from, to);
    return this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(range, target) {
    lift(this, range, target);
    return this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(pos, depth = 1) {
    join(this, pos, depth);
    return this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(range, wrappers) {
    wrap(this, range, wrappers);
    return this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(from, to = from, type, attrs = null) {
    setBlockType(this, from, to, type, attrs);
    return this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(pos, type, attrs = null, marks3) {
    setNodeMarkup(this, pos, type, attrs, marks3);
    return this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(pos, attr, value) {
    this.step(new AttrStep(pos, attr, value));
    return this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(attr, value) {
    this.step(new DocAttrStep(attr, value));
    return this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(pos, mark) {
    this.step(new AddNodeMarkStep(pos, mark));
    return this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(pos, mark) {
    let node = this.doc.nodeAt(pos);
    if (!node)
      throw new RangeError("No node at position " + pos);
    if (mark instanceof Mark) {
      if (mark.isInSet(node.marks))
        this.step(new RemoveNodeMarkStep(pos, mark));
    } else {
      let set = node.marks, found2, steps = [];
      while (found2 = mark.isInSet(set)) {
        steps.push(new RemoveNodeMarkStep(pos, found2));
        set = found2.removeFromSet(set);
      }
      for (let i = steps.length - 1; i >= 0; i--)
        this.step(steps[i]);
    }
    return this;
  }
  /**
  Split the node at the given position, and optionally, if `depth` is
  greater than one, any number of nodes above that. By default, the
  parts split off will inherit the node type of the original node.
  This can be changed by passing an array of types and attributes to
  use after the split (with the outermost nodes coming first).
  */
  split(pos, depth = 1, typesAfter) {
    split(this, pos, depth, typesAfter);
    return this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(from, to, mark) {
    addMark(this, from, to, mark);
    return this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(from, to, mark) {
    removeMark(this, from, to, mark);
    return this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(pos, parentType, match) {
    clearIncompatible(this, pos, parentType, match);
    return this;
  }
};

// node_modules/.pnpm/prosemirror-state@1.4.4/node_modules/prosemirror-state/dist/index.js
var classesById = /* @__PURE__ */ Object.create(null);
var Selection = class {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor($anchor, $head, ranges) {
    this.$anchor = $anchor;
    this.$head = $head;
    this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++)
      if (ranges[i].$from.pos != ranges[i].$to.pos)
        return false;
    return true;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, true);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(tr, content = Slice.empty) {
    let lastNode = content.content.lastChild, lastParent = null;
    for (let i = 0; i < content.openEnd; i++) {
      lastParent = lastNode;
      lastNode = lastNode.lastChild;
    }
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      tr.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content);
      if (i == 0)
        selectionToInsertionEnd(tr, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(tr, node) {
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      let from = mapping.map($from.pos), to = mapping.map($to.pos);
      if (i) {
        tr.deleteRange(from, to);
      } else {
        tr.replaceRangeWith(from, to, node);
        selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1);
      }
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom($pos, dir, textOnly = false) {
    let inner = $pos.parent.inlineContent ? new TextSelection($pos) : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
    if (inner)
      return inner;
    for (let depth = $pos.depth - 1; depth >= 0; depth--) {
      let found2 = dir < 0 ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly) : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
      if (found2)
        return found2;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near($pos, bias = 1) {
    return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(doc2) {
    return findSelectionIn(doc2, doc2, 0, 0, 1) || new AllSelection(doc2);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(doc2) {
    return findSelectionIn(doc2, doc2, doc2.content.size, doc2.childCount, -1) || new AllSelection(doc2);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(doc2, json) {
    if (!json || !json.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let cls = classesById[json.type];
    if (!cls)
      throw new RangeError(`No selection type ${json.type} defined`);
    return cls.fromJSON(doc2, json);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(id, selectionClass) {
    if (id in classesById)
      throw new RangeError("Duplicate use of selection JSON ID " + id);
    classesById[id] = selectionClass;
    selectionClass.prototype.jsonID = id;
    return selectionClass;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return TextSelection.between(this.$anchor, this.$head).getBookmark();
  }
};
Selection.prototype.visible = true;
var SelectionRange = class {
  /**
  Create a range.
  */
  constructor($from, $to) {
    this.$from = $from;
    this.$to = $to;
  }
};
var warnedAboutTextSelection = false;
function checkTextSelection($pos) {
  if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
    warnedAboutTextSelection = true;
    console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
  }
}
var TextSelection = class _TextSelection extends Selection {
  /**
  Construct a text selection between the given points.
  */
  constructor($anchor, $head = $anchor) {
    checkTextSelection($anchor);
    checkTextSelection($head);
    super($anchor, $head);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(doc2, mapping) {
    let $head = doc2.resolve(mapping.map(this.head));
    if (!$head.parent.inlineContent)
      return Selection.near($head);
    let $anchor = doc2.resolve(mapping.map(this.anchor));
    return new _TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
  }
  replace(tr, content = Slice.empty) {
    super.replace(tr, content);
    if (content == Slice.empty) {
      let marks3 = this.$from.marksAcross(this.$to);
      if (marks3)
        tr.ensureMarks(marks3);
    }
  }
  eq(other) {
    return other instanceof _TextSelection && other.anchor == this.anchor && other.head == this.head;
  }
  getBookmark() {
    return new TextBookmark(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(doc2, json) {
    if (typeof json.anchor != "number" || typeof json.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new _TextSelection(doc2.resolve(json.anchor), doc2.resolve(json.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(doc2, anchor, head = anchor) {
    let $anchor = doc2.resolve(anchor);
    return new this($anchor, head == anchor ? $anchor : doc2.resolve(head));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between($anchor, $head, bias) {
    let dPos = $anchor.pos - $head.pos;
    if (!bias || dPos)
      bias = dPos >= 0 ? 1 : -1;
    if (!$head.parent.inlineContent) {
      let found2 = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
      if (found2)
        $head = found2.$head;
      else
        return Selection.near($head, bias);
    }
    if (!$anchor.parent.inlineContent) {
      if (dPos == 0) {
        $anchor = $head;
      } else {
        $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
        if ($anchor.pos < $head.pos != dPos < 0)
          $anchor = $head;
      }
    }
    return new _TextSelection($anchor, $head);
  }
};
Selection.jsonID("text", TextSelection);
var TextBookmark = class _TextBookmark {
  constructor(anchor, head) {
    this.anchor = anchor;
    this.head = head;
  }
  map(mapping) {
    return new _TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
  }
  resolve(doc2) {
    return TextSelection.between(doc2.resolve(this.anchor), doc2.resolve(this.head));
  }
};
var NodeSelection = class _NodeSelection extends Selection {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor($pos) {
    let node = $pos.nodeAfter;
    let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
    super($pos, $end);
    this.node = node;
  }
  map(doc2, mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    let $pos = doc2.resolve(pos);
    if (deleted)
      return Selection.near($pos);
    return new _NodeSelection($pos);
  }
  content() {
    return new Slice(Fragment.from(this.node), 0, 0);
  }
  eq(other) {
    return other instanceof _NodeSelection && other.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new NodeBookmark(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(doc2, json) {
    if (typeof json.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new _NodeSelection(doc2.resolve(json.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(doc2, from) {
    return new _NodeSelection(doc2.resolve(from));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(node) {
    return !node.isText && node.type.spec.selectable !== false;
  }
};
NodeSelection.prototype.visible = false;
Selection.jsonID("node", NodeSelection);
var NodeBookmark = class _NodeBookmark {
  constructor(anchor) {
    this.anchor = anchor;
  }
  map(mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    return deleted ? new TextBookmark(pos, pos) : new _NodeBookmark(pos);
  }
  resolve(doc2) {
    let $pos = doc2.resolve(this.anchor), node = $pos.nodeAfter;
    if (node && NodeSelection.isSelectable(node))
      return new NodeSelection($pos);
    return Selection.near($pos);
  }
};
var AllSelection = class _AllSelection extends Selection {
  /**
  Create an all-selection over the given document.
  */
  constructor(doc2) {
    super(doc2.resolve(0), doc2.resolve(doc2.content.size));
  }
  replace(tr, content = Slice.empty) {
    if (content == Slice.empty) {
      tr.delete(0, tr.doc.content.size);
      let sel = Selection.atStart(tr.doc);
      if (!sel.eq(tr.selection))
        tr.setSelection(sel);
    } else {
      super.replace(tr, content);
    }
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(doc2) {
    return new _AllSelection(doc2);
  }
  map(doc2) {
    return new _AllSelection(doc2);
  }
  eq(other) {
    return other instanceof _AllSelection;
  }
  getBookmark() {
    return AllBookmark;
  }
};
Selection.jsonID("all", AllSelection);
var AllBookmark = {
  map() {
    return this;
  },
  resolve(doc2) {
    return new AllSelection(doc2);
  }
};
function findSelectionIn(doc2, node, pos, index, dir, text2 = false) {
  if (node.inlineContent)
    return TextSelection.create(doc2, pos);
  for (let i = index - (dir > 0 ? 0 : 1); dir > 0 ? i < node.childCount : i >= 0; i += dir) {
    let child = node.child(i);
    if (!child.isAtom) {
      let inner = findSelectionIn(doc2, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text2);
      if (inner)
        return inner;
    } else if (!text2 && NodeSelection.isSelectable(child)) {
      return NodeSelection.create(doc2, pos - (dir < 0 ? child.nodeSize : 0));
    }
    pos += child.nodeSize * dir;
  }
  return null;
}
function selectionToInsertionEnd(tr, startLen, bias) {
  let last = tr.steps.length - 1;
  if (last < startLen)
    return;
  let step2 = tr.steps[last];
  if (!(step2 instanceof ReplaceStep || step2 instanceof ReplaceAroundStep))
    return;
  let map = tr.mapping.maps[last], end;
  map.forEach((_from, _to, _newFrom, newTo) => {
    if (end == null)
      end = newTo;
  });
  tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
var UPDATED_SEL = 1;
var UPDATED_MARKS = 2;
var UPDATED_SCROLL = 4;
var Transaction = class extends Transform {
  /**
  @internal
  */
  constructor(state) {
    super(state.doc);
    this.curSelectionFor = 0;
    this.updated = 0;
    this.meta = /* @__PURE__ */ Object.create(null);
    this.time = Date.now();
    this.curSelection = state.selection;
    this.storedMarks = state.storedMarks;
  }
  /**
  The transaction's current selection. This defaults to the editor
  selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
  transaction, but can be overwritten with
  [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
  */
  get selection() {
    if (this.curSelectionFor < this.steps.length) {
      this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor));
      this.curSelectionFor = this.steps.length;
    }
    return this.curSelection;
  }
  /**
  Update the transaction's current selection. Will determine the
  selection that the editor gets when the transaction is applied.
  */
  setSelection(selection) {
    if (selection.$from.doc != this.doc)
      throw new RangeError("Selection passed to setSelection must point at the current document");
    this.curSelection = selection;
    this.curSelectionFor = this.steps.length;
    this.updated = (this.updated | UPDATED_SEL) & ~UPDATED_MARKS;
    this.storedMarks = null;
    return this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & UPDATED_SEL) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(marks3) {
    this.storedMarks = marks3;
    this.updated |= UPDATED_MARKS;
    return this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(marks3) {
    if (!Mark.sameSet(this.storedMarks || this.selection.$from.marks(), marks3))
      this.setStoredMarks(marks3);
    return this;
  }
  /**
  Add a mark to the set of stored marks.
  */
  addStoredMark(mark) {
    return this.ensureMarks(mark.addToSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Remove a mark or mark type from the set of stored marks.
  */
  removeStoredMark(mark) {
    return this.ensureMarks(mark.removeFromSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Whether the stored marks were explicitly set for this transaction.
  */
  get storedMarksSet() {
    return (this.updated & UPDATED_MARKS) > 0;
  }
  /**
  @internal
  */
  addStep(step2, doc2) {
    super.addStep(step2, doc2);
    this.updated = this.updated & ~UPDATED_MARKS;
    this.storedMarks = null;
  }
  /**
  Update the timestamp for the transaction.
  */
  setTime(time) {
    this.time = time;
    return this;
  }
  /**
  Replace the current selection with the given slice.
  */
  replaceSelection(slice) {
    this.selection.replace(this, slice);
    return this;
  }
  /**
  Replace the selection with the given node. When `inheritMarks` is
  true and the content is inline, it inherits the marks from the
  place where it is inserted.
  */
  replaceSelectionWith(node, inheritMarks = true) {
    let selection = this.selection;
    if (inheritMarks)
      node = node.mark(this.storedMarks || (selection.empty ? selection.$from.marks() : selection.$from.marksAcross(selection.$to) || Mark.none));
    selection.replaceWith(this, node);
    return this;
  }
  /**
  Delete the selection.
  */
  deleteSelection() {
    this.selection.replace(this);
    return this;
  }
  /**
  Replace the given range, or the selection if no range is given,
  with a text node containing the given string.
  */
  insertText(text2, from, to) {
    let schema3 = this.doc.type.schema;
    if (from == null) {
      if (!text2)
        return this.deleteSelection();
      return this.replaceSelectionWith(schema3.text(text2), true);
    } else {
      if (to == null)
        to = from;
      if (!text2)
        return this.deleteRange(from, to);
      let marks3 = this.storedMarks;
      if (!marks3) {
        let $from = this.doc.resolve(from);
        marks3 = to == from ? $from.marks() : $from.marksAcross(this.doc.resolve(to));
      }
      this.replaceRangeWith(from, to, schema3.text(text2, marks3));
      if (!this.selection.empty && this.selection.to == from + text2.length)
        this.setSelection(Selection.near(this.selection.$to));
      return this;
    }
  }
  /**
  Store a metadata property in this transaction, keyed either by
  name or by plugin.
  */
  setMeta(key, value) {
    this.meta[typeof key == "string" ? key : key.key] = value;
    return this;
  }
  /**
  Retrieve a metadata property for a given name or plugin.
  */
  getMeta(key) {
    return this.meta[typeof key == "string" ? key : key.key];
  }
  /**
  Returns true if this transaction doesn't contain any metadata,
  and can thus safely be extended.
  */
  get isGeneric() {
    for (let _ in this.meta)
      return false;
    return true;
  }
  /**
  Indicate that the editor should scroll the selection into view
  when updated to the state produced by this transaction.
  */
  scrollIntoView() {
    this.updated |= UPDATED_SCROLL;
    return this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & UPDATED_SCROLL) > 0;
  }
};
function bind(f, self) {
  return !self || !f ? f : f.bind(self);
}
var FieldDesc = class {
  constructor(name, desc, self) {
    this.name = name;
    this.init = bind(desc.init, self);
    this.apply = bind(desc.apply, self);
  }
};
var baseFields = [
  new FieldDesc("doc", {
    init(config) {
      return config.doc || config.schema.topNodeType.createAndFill();
    },
    apply(tr) {
      return tr.doc;
    }
  }),
  new FieldDesc("selection", {
    init(config, instance) {
      return config.selection || Selection.atStart(instance.doc);
    },
    apply(tr) {
      return tr.selection;
    }
  }),
  new FieldDesc("storedMarks", {
    init(config) {
      return config.storedMarks || null;
    },
    apply(tr, _marks, _old, state) {
      return state.selection.$cursor ? tr.storedMarks : null;
    }
  }),
  new FieldDesc("scrollToSelection", {
    init() {
      return 0;
    },
    apply(tr, prev) {
      return tr.scrolledIntoView ? prev + 1 : prev;
    }
  })
];
var Configuration = class {
  constructor(schema3, plugins) {
    this.schema = schema3;
    this.plugins = [];
    this.pluginsByKey = /* @__PURE__ */ Object.create(null);
    this.fields = baseFields.slice();
    if (plugins)
      plugins.forEach((plugin) => {
        if (this.pluginsByKey[plugin.key])
          throw new RangeError("Adding different instances of a keyed plugin (" + plugin.key + ")");
        this.plugins.push(plugin);
        this.pluginsByKey[plugin.key] = plugin;
        if (plugin.spec.state)
          this.fields.push(new FieldDesc(plugin.key, plugin.spec.state, plugin));
      });
  }
};
var EditorState = class _EditorState {
  /**
  @internal
  */
  constructor(config) {
    this.config = config;
  }
  /**
  The schema of the state's document.
  */
  get schema() {
    return this.config.schema;
  }
  /**
  The plugins that are active in this state.
  */
  get plugins() {
    return this.config.plugins;
  }
  /**
  Apply the given transaction to produce a new state.
  */
  apply(tr) {
    return this.applyTransaction(tr).state;
  }
  /**
  @internal
  */
  filterTransaction(tr, ignore = -1) {
    for (let i = 0; i < this.config.plugins.length; i++)
      if (i != ignore) {
        let plugin = this.config.plugins[i];
        if (plugin.spec.filterTransaction && !plugin.spec.filterTransaction.call(plugin, tr, this))
          return false;
      }
    return true;
  }
  /**
  Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
  returns the precise transactions that were applied (which might
  be influenced by the [transaction
  hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
  plugins) along with the new state.
  */
  applyTransaction(rootTr) {
    if (!this.filterTransaction(rootTr))
      return { state: this, transactions: [] };
    let trs = [rootTr], newState = this.applyInner(rootTr), seen = null;
    for (; ; ) {
      let haveNew = false;
      for (let i = 0; i < this.config.plugins.length; i++) {
        let plugin = this.config.plugins[i];
        if (plugin.spec.appendTransaction) {
          let n = seen ? seen[i].n : 0, oldState = seen ? seen[i].state : this;
          let tr = n < trs.length && plugin.spec.appendTransaction.call(plugin, n ? trs.slice(n) : trs, oldState, newState);
          if (tr && newState.filterTransaction(tr, i)) {
            tr.setMeta("appendedTransaction", rootTr);
            if (!seen) {
              seen = [];
              for (let j2 = 0; j2 < this.config.plugins.length; j2++)
                seen.push(j2 < i ? { state: newState, n: trs.length } : { state: this, n: 0 });
            }
            trs.push(tr);
            newState = newState.applyInner(tr);
            haveNew = true;
          }
          if (seen)
            seen[i] = { state: newState, n: trs.length };
        }
      }
      if (!haveNew)
        return { state: newState, transactions: trs };
    }
  }
  /**
  @internal
  */
  applyInner(tr) {
    if (!tr.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    let newInstance = new _EditorState(this.config), fields = this.config.fields;
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i];
      newInstance[field.name] = field.apply(tr, this[field.name], this, newInstance);
    }
    return newInstance;
  }
  /**
  Accessor that constructs and returns a new [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
  */
  get tr() {
    return new Transaction(this);
  }
  /**
  Create a new state.
  */
  static create(config) {
    let $config = new Configuration(config.doc ? config.doc.type.schema : config.schema, config.plugins);
    let instance = new _EditorState($config);
    for (let i = 0; i < $config.fields.length; i++)
      instance[$config.fields[i].name] = $config.fields[i].init(config, instance);
    return instance;
  }
  /**
  Create a new state based on this one, but with an adjusted set
  of active plugins. State fields that exist in both sets of
  plugins are kept unchanged. Those that no longer exist are
  dropped, and those that are new are initialized using their
  [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
  configuration object..
  */
  reconfigure(config) {
    let $config = new Configuration(this.schema, config.plugins);
    let fields = $config.fields, instance = new _EditorState($config);
    for (let i = 0; i < fields.length; i++) {
      let name = fields[i].name;
      instance[name] = this.hasOwnProperty(name) ? this[name] : fields[i].init(config, instance);
    }
    return instance;
  }
  /**
  Serialize this state to JSON. If you want to serialize the state
  of plugins, pass an object mapping property names to use in the
  resulting JSON object to plugin objects. The argument may also be
  a string or number, in which case it is ignored, to support the
  way `JSON.stringify` calls `toString` methods.
  */
  toJSON(pluginFields) {
    let result = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
    if (this.storedMarks)
      result.storedMarks = this.storedMarks.map((m2) => m2.toJSON());
    if (pluginFields && typeof pluginFields == "object")
      for (let prop in pluginFields) {
        if (prop == "doc" || prop == "selection")
          throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let plugin = pluginFields[prop], state = plugin.spec.state;
        if (state && state.toJSON)
          result[prop] = state.toJSON.call(plugin, this[plugin.key]);
      }
    return result;
  }
  /**
  Deserialize a JSON representation of a state. `config` should
  have at least a `schema` field, and should contain array of
  plugins to initialize the state with. `pluginFields` can be used
  to deserialize the state of plugins, by associating plugin
  instances with the property names they use in the JSON object.
  */
  static fromJSON(config, json, pluginFields) {
    if (!json)
      throw new RangeError("Invalid input for EditorState.fromJSON");
    if (!config.schema)
      throw new RangeError("Required config field 'schema' missing");
    let $config = new Configuration(config.schema, config.plugins);
    let instance = new _EditorState($config);
    $config.fields.forEach((field) => {
      if (field.name == "doc") {
        instance.doc = Node2.fromJSON(config.schema, json.doc);
      } else if (field.name == "selection") {
        instance.selection = Selection.fromJSON(instance.doc, json.selection);
      } else if (field.name == "storedMarks") {
        if (json.storedMarks)
          instance.storedMarks = json.storedMarks.map(config.schema.markFromJSON);
      } else {
        if (pluginFields)
          for (let prop in pluginFields) {
            let plugin = pluginFields[prop], state = plugin.spec.state;
            if (plugin.key == field.name && state && state.fromJSON && Object.prototype.hasOwnProperty.call(json, prop)) {
              instance[field.name] = state.fromJSON.call(plugin, config, json[prop], instance);
              return;
            }
          }
        instance[field.name] = field.init(config, instance);
      }
    });
    return instance;
  }
};

// node_modules/.pnpm/prosemirror-commands@1.7.1/node_modules/prosemirror-commands/dist/index.js
var deleteSelection = (state, dispatch) => {
  if (state.selection.empty)
    return false;
  if (dispatch)
    dispatch(state.tr.deleteSelection().scrollIntoView());
  return true;
};
function atBlockStart(state, view) {
  let { $cursor } = state.selection;
  if (!$cursor || (view ? !view.endOfTextblock("backward", state) : $cursor.parentOffset > 0))
    return null;
  return $cursor;
}
var joinBackward = (state, dispatch, view) => {
  let $cursor = atBlockStart(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutBefore($cursor);
  if (!$cut) {
    let range = $cursor.blockRange(), target = range && liftTarget(range);
    if (target == null)
      return false;
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  }
  let before = $cut.nodeBefore;
  if (deleteBarrier(state, $cut, dispatch, -1))
    return true;
  if ($cursor.parent.content.size == 0 && (textblockAt(before, "end") || NodeSelection.isSelectable(before))) {
    for (let depth = $cursor.depth; ; depth--) {
      let delStep = replaceStep(state.doc, $cursor.before(depth), $cursor.after(depth), Slice.empty);
      if (delStep && delStep.slice.size < delStep.to - delStep.from) {
        if (dispatch) {
          let tr = state.tr.step(delStep);
          tr.setSelection(textblockAt(before, "end") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos, -1)), -1) : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize));
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
      if (depth == 1 || $cursor.node(depth - 1).childCount > 1)
        break;
    }
  }
  if (before.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch)
      dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView());
    return true;
  }
  return false;
};
function textblockAt(node, side, only = false) {
  for (let scan = node; scan; scan = side == "start" ? scan.firstChild : scan.lastChild) {
    if (scan.isTextblock)
      return true;
    if (only && scan.childCount != 1)
      return false;
  }
  return false;
}
var selectNodeBackward = (state, dispatch, view) => {
  let { $head, empty } = state.selection, $cut = $head;
  if (!empty)
    return false;
  if ($head.parent.isTextblock) {
    if (view ? !view.endOfTextblock("backward", state) : $head.parentOffset > 0)
      return false;
    $cut = findCutBefore($head);
  }
  let node = $cut && $cut.nodeBefore;
  if (!node || !NodeSelection.isSelectable(node))
    return false;
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos - node.nodeSize)).scrollIntoView());
  return true;
};
function findCutBefore($pos) {
  if (!$pos.parent.type.spec.isolating)
    for (let i = $pos.depth - 1; i >= 0; i--) {
      if ($pos.index(i) > 0)
        return $pos.doc.resolve($pos.before(i + 1));
      if ($pos.node(i).type.spec.isolating)
        break;
    }
  return null;
}
function atBlockEnd(state, view) {
  let { $cursor } = state.selection;
  if (!$cursor || (view ? !view.endOfTextblock("forward", state) : $cursor.parentOffset < $cursor.parent.content.size))
    return null;
  return $cursor;
}
var joinForward = (state, dispatch, view) => {
  let $cursor = atBlockEnd(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutAfter($cursor);
  if (!$cut)
    return false;
  let after = $cut.nodeAfter;
  if (deleteBarrier(state, $cut, dispatch, 1))
    return true;
  if ($cursor.parent.content.size == 0 && (textblockAt(after, "start") || NodeSelection.isSelectable(after))) {
    let delStep = replaceStep(state.doc, $cursor.before(), $cursor.after(), Slice.empty);
    if (delStep && delStep.slice.size < delStep.to - delStep.from) {
      if (dispatch) {
        let tr = state.tr.step(delStep);
        tr.setSelection(textblockAt(after, "start") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1) : NodeSelection.create(tr.doc, tr.mapping.map($cut.pos)));
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }
  if (after.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch)
      dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView());
    return true;
  }
  return false;
};
var selectNodeForward = (state, dispatch, view) => {
  let { $head, empty } = state.selection, $cut = $head;
  if (!empty)
    return false;
  if ($head.parent.isTextblock) {
    if (view ? !view.endOfTextblock("forward", state) : $head.parentOffset < $head.parent.content.size)
      return false;
    $cut = findCutAfter($head);
  }
  let node = $cut && $cut.nodeAfter;
  if (!node || !NodeSelection.isSelectable(node))
    return false;
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos)).scrollIntoView());
  return true;
};
function findCutAfter($pos) {
  if (!$pos.parent.type.spec.isolating)
    for (let i = $pos.depth - 1; i >= 0; i--) {
      let parent = $pos.node(i);
      if ($pos.index(i) + 1 < parent.childCount)
        return $pos.doc.resolve($pos.after(i + 1));
      if (parent.type.spec.isolating)
        break;
    }
  return null;
}
var newlineInCode = (state, dispatch) => {
  let { $head, $anchor } = state.selection;
  if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
    return false;
  if (dispatch)
    dispatch(state.tr.insertText("\n").scrollIntoView());
  return true;
};
function defaultBlockAt(match) {
  for (let i = 0; i < match.edgeCount; i++) {
    let { type } = match.edge(i);
    if (type.isTextblock && !type.hasRequiredAttrs())
      return type;
  }
  return null;
}
var exitCode = (state, dispatch) => {
  let { $head, $anchor } = state.selection;
  if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
    return false;
  let above = $head.node(-1), after = $head.indexAfter(-1), type = defaultBlockAt(above.contentMatchAt(after));
  if (!type || !above.canReplaceWith(after, after, type))
    return false;
  if (dispatch) {
    let pos = $head.after(), tr = state.tr.replaceWith(pos, pos, type.createAndFill());
    tr.setSelection(Selection.near(tr.doc.resolve(pos), 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
var createParagraphNear = (state, dispatch) => {
  let sel = state.selection, { $from, $to } = sel;
  if (sel instanceof AllSelection || $from.parent.inlineContent || $to.parent.inlineContent)
    return false;
  let type = defaultBlockAt($to.parent.contentMatchAt($to.indexAfter()));
  if (!type || !type.isTextblock)
    return false;
  if (dispatch) {
    let side = (!$from.parentOffset && $to.index() < $to.parent.childCount ? $from : $to).pos;
    let tr = state.tr.insert(side, type.createAndFill());
    tr.setSelection(TextSelection.create(tr.doc, side + 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
var liftEmptyBlock = (state, dispatch) => {
  let { $cursor } = state.selection;
  if (!$cursor || $cursor.parent.content.size)
    return false;
  if ($cursor.depth > 1 && $cursor.after() != $cursor.end(-1)) {
    let before = $cursor.before();
    if (canSplit(state.doc, before)) {
      if (dispatch)
        dispatch(state.tr.split(before).scrollIntoView());
      return true;
    }
  }
  let range = $cursor.blockRange(), target = range && liftTarget(range);
  if (target == null)
    return false;
  if (dispatch)
    dispatch(state.tr.lift(range, target).scrollIntoView());
  return true;
};
function splitBlockAs(splitNode) {
  return (state, dispatch) => {
    let { $from, $to } = state.selection;
    if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
      if (!$from.parentOffset || !canSplit(state.doc, $from.pos))
        return false;
      if (dispatch)
        dispatch(state.tr.split($from.pos).scrollIntoView());
      return true;
    }
    if (!$from.depth)
      return false;
    let types = [];
    let splitDepth, deflt, atEnd = false, atStart = false;
    for (let d = $from.depth; ; d--) {
      let node = $from.node(d);
      if (node.isBlock) {
        atEnd = $from.end(d) == $from.pos + ($from.depth - d);
        atStart = $from.start(d) == $from.pos - ($from.depth - d);
        deflt = defaultBlockAt($from.node(d - 1).contentMatchAt($from.indexAfter(d - 1)));
        let splitType = splitNode && splitNode($to.parent, atEnd, $from);
        types.unshift(splitType || (atEnd && deflt ? { type: deflt } : null));
        splitDepth = d;
        break;
      } else {
        if (d == 1)
          return false;
        types.unshift(null);
      }
    }
    let tr = state.tr;
    if (state.selection instanceof TextSelection || state.selection instanceof AllSelection)
      tr.deleteSelection();
    let splitPos = tr.mapping.map($from.pos);
    let can = canSplit(tr.doc, splitPos, types.length, types);
    if (!can) {
      types[0] = deflt ? { type: deflt } : null;
      can = canSplit(tr.doc, splitPos, types.length, types);
    }
    if (!can)
      return false;
    tr.split(splitPos, types.length, types);
    if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
      let first = tr.mapping.map($from.before(splitDepth)), $first = tr.doc.resolve(first);
      if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt))
        tr.setNodeMarkup(tr.mapping.map($from.before(splitDepth)), deflt);
    }
    if (dispatch)
      dispatch(tr.scrollIntoView());
    return true;
  };
}
var splitBlock = splitBlockAs();
var selectAll = (state, dispatch) => {
  if (dispatch)
    dispatch(state.tr.setSelection(new AllSelection(state.doc)));
  return true;
};
function joinMaybeClear(state, $pos, dispatch) {
  let before = $pos.nodeBefore, after = $pos.nodeAfter, index = $pos.index();
  if (!before || !after || !before.type.compatibleContent(after.type))
    return false;
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    if (dispatch)
      dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView());
    return true;
  }
  if (!$pos.parent.canReplace(index, index + 1) || !(after.isTextblock || canJoin(state.doc, $pos.pos)))
    return false;
  if (dispatch)
    dispatch(state.tr.join($pos.pos).scrollIntoView());
  return true;
}
function deleteBarrier(state, $cut, dispatch, dir) {
  let before = $cut.nodeBefore, after = $cut.nodeAfter, conn, match;
  let isolated = before.type.spec.isolating || after.type.spec.isolating;
  if (!isolated && joinMaybeClear(state, $cut, dispatch))
    return true;
  let canDelAfter = !isolated && $cut.parent.canReplace($cut.index(), $cut.index() + 1);
  if (canDelAfter && (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(after.type)) && match.matchType(conn[0] || after.type).validEnd) {
    if (dispatch) {
      let end = $cut.pos + after.nodeSize, wrap2 = Fragment.empty;
      for (let i = conn.length - 1; i >= 0; i--)
        wrap2 = Fragment.from(conn[i].create(null, wrap2));
      wrap2 = Fragment.from(before.copy(wrap2));
      let tr = state.tr.step(new ReplaceAroundStep($cut.pos - 1, end, $cut.pos, end, new Slice(wrap2, 1, 0), conn.length, true));
      let $joinAt = tr.doc.resolve(end + 2 * conn.length);
      if ($joinAt.nodeAfter && $joinAt.nodeAfter.type == before.type && canJoin(tr.doc, $joinAt.pos))
        tr.join($joinAt.pos);
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
  let selAfter = after.type.spec.isolating || dir > 0 && isolated ? null : Selection.findFrom($cut, 1);
  let range = selAfter && selAfter.$from.blockRange(selAfter.$to), target = range && liftTarget(range);
  if (target != null && target >= $cut.depth) {
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  }
  if (canDelAfter && textblockAt(after, "start", true) && textblockAt(before, "end")) {
    let at2 = before, wrap2 = [];
    for (; ; ) {
      wrap2.push(at2);
      if (at2.isTextblock)
        break;
      at2 = at2.lastChild;
    }
    let afterText = after, afterDepth = 1;
    for (; !afterText.isTextblock; afterText = afterText.firstChild)
      afterDepth++;
    if (at2.canReplace(at2.childCount, at2.childCount, afterText.content)) {
      if (dispatch) {
        let end = Fragment.empty;
        for (let i = wrap2.length - 1; i >= 0; i--)
          end = Fragment.from(wrap2[i].copy(end));
        let tr = state.tr.step(new ReplaceAroundStep($cut.pos - wrap2.length, $cut.pos + after.nodeSize, $cut.pos + afterDepth, $cut.pos + after.nodeSize - afterDepth, new Slice(end, wrap2.length, 0), 0, true));
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }
  return false;
}
function selectTextblockSide(side) {
  return function(state, dispatch) {
    let sel = state.selection, $pos = side < 0 ? sel.$from : sel.$to;
    let depth = $pos.depth;
    while ($pos.node(depth).isInline) {
      if (!depth)
        return false;
      depth--;
    }
    if (!$pos.node(depth).isTextblock)
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, side < 0 ? $pos.start(depth) : $pos.end(depth))));
    return true;
  };
}
var selectTextblockStart = selectTextblockSide(-1);
var selectTextblockEnd = selectTextblockSide(1);
function wrapIn(nodeType, attrs = null) {
  return function(state, dispatch) {
    let { $from, $to } = state.selection;
    let range = $from.blockRange($to), wrapping = range && findWrapping(range, nodeType, attrs);
    if (!wrapping)
      return false;
    if (dispatch)
      dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
    return true;
  };
}
function setBlockType2(nodeType, attrs = null) {
  return function(state, dispatch) {
    let applicable = false;
    for (let i = 0; i < state.selection.ranges.length && !applicable; i++) {
      let { $from: { pos: from }, $to: { pos: to } } = state.selection.ranges[i];
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (applicable)
          return false;
        if (!node.isTextblock || node.hasMarkup(nodeType, attrs))
          return;
        if (node.type == nodeType) {
          applicable = true;
        } else {
          let $pos = state.doc.resolve(pos), index = $pos.index();
          applicable = $pos.parent.canReplaceWith(index, index + 1, nodeType);
        }
      });
    }
    if (!applicable)
      return false;
    if (dispatch) {
      let tr = state.tr;
      for (let i = 0; i < state.selection.ranges.length; i++) {
        let { $from: { pos: from }, $to: { pos: to } } = state.selection.ranges[i];
        tr.setBlockType(from, to, nodeType, attrs);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}
function chainCommands(...commands) {
  return function(state, dispatch, view) {
    for (let i = 0; i < commands.length; i++)
      if (commands[i](state, dispatch, view))
        return true;
    return false;
  };
}
var backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward);
var del = chainCommands(deleteSelection, joinForward, selectNodeForward);
var pcBaseKeymap = {
  "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
  "Mod-Enter": exitCode,
  "Backspace": backspace,
  "Mod-Backspace": backspace,
  "Shift-Backspace": backspace,
  "Delete": del,
  "Mod-Delete": del,
  "Mod-a": selectAll
};
var macBaseKeymap = {
  "Ctrl-h": pcBaseKeymap["Backspace"],
  "Alt-Backspace": pcBaseKeymap["Mod-Backspace"],
  "Ctrl-d": pcBaseKeymap["Delete"],
  "Ctrl-Alt-Backspace": pcBaseKeymap["Mod-Delete"],
  "Alt-Delete": pcBaseKeymap["Mod-Delete"],
  "Alt-d": pcBaseKeymap["Mod-Delete"],
  "Ctrl-a": selectTextblockStart,
  "Ctrl-e": selectTextblockEnd
};
for (let key in pcBaseKeymap)
  macBaseKeymap[key] = pcBaseKeymap[key];
var mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os != "undefined" && os.platform ? os.platform() == "darwin" : false;

// node_modules/.pnpm/prosemirror-schema-basic@1.2.4/node_modules/prosemirror-schema-basic/dist/index.js
var pDOM = ["p", 0];
var blockquoteDOM = ["blockquote", 0];
var hrDOM = ["hr"];
var preDOM = ["pre", ["code", 0]];
var brDOM = ["br"];
var nodes = {
  /**
  NodeSpec The top level document node.
  */
  doc: {
    content: "block+"
  },
  /**
  A plain paragraph textblock. Represented in the DOM
  as a `<p>` element.
  */
  paragraph: {
    content: "inline*",
    group: "block",
    parseDOM: [{ tag: "p" }],
    toDOM() {
      return pDOM;
    }
  },
  /**
  A blockquote (`<blockquote>`) wrapping one or more blocks.
  */
  blockquote: {
    content: "block+",
    group: "block",
    defining: true,
    parseDOM: [{ tag: "blockquote" }],
    toDOM() {
      return blockquoteDOM;
    }
  },
  /**
  A horizontal rule (`<hr>`).
  */
  horizontal_rule: {
    group: "block",
    parseDOM: [{ tag: "hr" }],
    toDOM() {
      return hrDOM;
    }
  },
  /**
  A heading textblock, with a `level` attribute that
  should hold the number 1 to 6. Parsed and serialized as `<h1>` to
  `<h6>` elements.
  */
  heading: {
    attrs: { level: { default: 1, validate: "number" } },
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 5 } },
      { tag: "h6", attrs: { level: 6 } }
    ],
    toDOM(node) {
      return ["h" + node.attrs.level, 0];
    }
  },
  /**
  A code listing. Disallows marks or non-text inline
  nodes by default. Represented as a `<pre>` element with a
  `<code>` element inside of it.
  */
  code_block: {
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
    toDOM() {
      return preDOM;
    }
  },
  /**
  The text node.
  */
  text: {
    group: "inline"
  },
  /**
  An inline image (`<img>`) node. Supports `src`,
  `alt`, and `href` attributes. The latter two default to the empty
  string.
  */
  image: {
    inline: true,
    attrs: {
      src: { validate: "string" },
      alt: { default: null, validate: "string|null" },
      title: { default: null, validate: "string|null" }
    },
    group: "inline",
    draggable: true,
    parseDOM: [{ tag: "img[src]", getAttrs(dom) {
      return {
        src: dom.getAttribute("src"),
        title: dom.getAttribute("title"),
        alt: dom.getAttribute("alt")
      };
    } }],
    toDOM(node) {
      let { src, alt, title } = node.attrs;
      return ["img", { src, alt, title }];
    }
  },
  /**
  A hard line break, represented in the DOM as `<br>`.
  */
  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{ tag: "br" }],
    toDOM() {
      return brDOM;
    }
  }
};
var emDOM = ["em", 0];
var strongDOM = ["strong", 0];
var codeDOM = ["code", 0];
var marks = {
  /**
  A link. Has `href` and `title` attributes. `title`
  defaults to the empty string. Rendered and parsed as an `<a>`
  element.
  */
  link: {
    attrs: {
      href: { validate: "string" },
      title: { default: null, validate: "string|null" }
    },
    inclusive: false,
    parseDOM: [{ tag: "a[href]", getAttrs(dom) {
      return { href: dom.getAttribute("href"), title: dom.getAttribute("title") };
    } }],
    toDOM(node) {
      let { href, title } = node.attrs;
      return ["a", { href, title }, 0];
    }
  },
  /**
  An emphasis mark. Rendered as an `<em>` element. Has parse rules
  that also match `<i>` and `font-style: italic`.
  */
  em: {
    parseDOM: [
      { tag: "i" },
      { tag: "em" },
      { style: "font-style=italic" },
      { style: "font-style=normal", clearMark: (m2) => m2.type.name == "em" }
    ],
    toDOM() {
      return emDOM;
    }
  },
  /**
  A strong mark. Rendered as `<strong>`, parse rules also match
  `<b>` and `font-weight: bold`.
  */
  strong: {
    parseDOM: [
      { tag: "strong" },
      // This works around a Google Docs misbehavior where
      // pasted content will be inexplicably wrapped in `<b>`
      // tags with a font-weight normal.
      { tag: "b", getAttrs: (node) => node.style.fontWeight != "normal" && null },
      { style: "font-weight=400", clearMark: (m2) => m2.type.name == "strong" },
      { style: "font-weight", getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null }
    ],
    toDOM() {
      return strongDOM;
    }
  },
  /**
  Code font mark. Represented as a `<code>` element.
  */
  code: {
    code: true,
    parseDOM: [{ tag: "code" }],
    toDOM() {
      return codeDOM;
    }
  }
};
var schema = new Schema({ nodes, marks });

// src/editor/core/index.ts
var BLOCK_KEYS = {
  paragraph: "paragraph",
  blockquote: "blockquote",
  code_block: "code_block",
  heading: "heading",
  horizontal_rule: "horizontal_rule"
};
var MARK_KEYS = {
  strong: "strong",
  em: "em",
  code: "code",
  link: "link"
};
var ALL_BLOCKS = Object.keys(BLOCK_KEYS);
var ALL_MARKS = Object.keys(MARK_KEYS);
function buildSchema(cfg) {
  const blockKeys = cfg?.blocks ?? ALL_BLOCKS;
  const markKeys = cfg?.marks ?? ALL_MARKS;
  const nodeSpecs = {
    doc: nodes.doc,
    paragraph: nodes.paragraph,
    text: nodes.text
  };
  for (const key of blockKeys) nodeSpecs[key] = nodes[BLOCK_KEYS[key]];
  const markSpecs = {};
  for (const key of markKeys) markSpecs[key] = marks[MARK_KEYS[key]];
  return new Schema({ nodes: nodeSpecs, marks: markSpecs });
}
function createEditorCore(config = {}) {
  const schema3 = buildSchema(config.schema);
  const undoHistory = config.undoHistory ?? null;
  let state = EditorState.create({
    schema: schema3,
    ...config.doc ? { doc: Node2.fromJSON(schema3, config.doc) } : {}
  });
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function blockSpans() {
    const spans = [];
    let offset = 0;
    state.doc.content.forEach((block) => {
      if (block.isTextblock) {
        spans.push({ start: offset + 1, end: offset + 1 + block.content.size, len: block.content.size });
      }
      offset += block.nodeSize;
    });
    return spans;
  }
  function pmPosOf(offset) {
    const spans = blockSpans();
    if (spans.length === 0) return 1;
    let acc = 0;
    for (const span of spans) {
      if (offset <= acc + span.len) return span.start + Math.max(0, offset - acc);
      acc += span.len;
    }
    const last = spans[spans.length - 1];
    return last.end;
  }
  function textOffsetOf(pos) {
    let acc = 0;
    for (const span of blockSpans()) {
      if (pos <= span.end) {
        return acc + Math.max(0, Math.min(pos - span.start, span.len));
      }
      acc += span.len;
    }
    return acc;
  }
  function textSelection(from, to) {
    return TextSelection.between(state.doc.resolve(pmPosOf(from)), state.doc.resolve(pmPosOf(to)));
  }
  function snapshot() {
    const sel = state.selection;
    return {
      doc: state.doc.toJSON(),
      from: textOffsetOf(sel.from),
      to: textOffsetOf(sel.to),
      stored: (state.storedMarks ?? []).map((m2) => ({
        type: m2.type.name,
        ...Object.keys(m2.attrs).length > 0 ? { attrs: m2.attrs } : {}
      }))
    };
  }
  function applySnapshot(snap) {
    const doc2 = Node2.fromJSON(schema3, snap.doc);
    const storedMarks = snap.stored.length > 0 ? snap.stored.map((m2) => schema3.marks[m2.type]?.create(m2.attrs)).filter((m2) => m2 !== void 0) : null;
    state = EditorState.create({
      schema: schema3,
      doc: doc2,
      selection: TextSelection.between(
        doc2.resolve(pmPosOf(Math.min(snap.from, snap.to))),
        doc2.resolve(pmPosOf(Math.max(snap.from, snap.to)))
      ),
      storedMarks
    });
  }
  function makeCommand(before, after, label) {
    const command = {
      label,
      execute: () => applySnapshot(after),
      invert: () => ({
        label,
        execute: () => applySnapshot(before),
        invert: () => command
      })
    };
    return command;
  }
  function record(before, label, opts) {
    if (!undoHistory) return;
    undoHistory.actions.push(makeCommand(before, snapshot(), label), opts);
  }
  function runCommand(fn) {
    let applied;
    const changed = fn((tr) => {
      applied = tr;
    });
    if (!changed || applied === void 0) return false;
    if (applied.steps.length === 0) return false;
    state = state.apply(applied);
    return true;
  }
  function deriveMarks() {
    const sel = state.selection;
    if (sel.empty) {
      const marksAt = state.storedMarks && state.storedMarks.length > 0 ? state.storedMarks : sel.$from.marks();
      return marksAt.map((m2) => m2.type.name);
    }
    const names = /* @__PURE__ */ new Set();
    state.doc.nodesBetween(sel.from, sel.to, (node) => {
      if (node.isText) node.marks.forEach((m2) => names.add(m2.type.name));
    });
    return [...names].filter((n) => MARK_KEYS[n]);
  }
  function deriveState2() {
    const sel = state.selection;
    const at2 = sel.$from.node(sel.$from.depth);
    return {
      doc: state.doc.toJSON(),
      text: state.doc.textContent,
      selection: {
        from: textOffsetOf(sel.from),
        to: textOffsetOf(sel.to),
        empty: sel.empty
      },
      activeMarks: deriveMarks(),
      blockType: at2?.type.name ?? "paragraph",
      headingLevel: at2?.type.name === "heading" ? at2.attrs.level : null,
      canUndo: undoHistory?.state.canUndo ?? false,
      canRedo: undoHistory?.state.canRedo ?? false
    };
  }
  let viewState = deriveState2();
  function refresh() {
    viewState = deriveState2();
    notify();
  }
  if (undoHistory) {
    undoHistory.subscribe(() => {
      viewState = deriveState2();
      notify();
    });
  }
  const actions = {
    type: (text2) => {
      if (text2 === "") return;
      const before = snapshot();
      const tr = state.tr;
      if (!state.selection.empty) tr.deleteSelection();
      tr.insertText(text2);
      state = state.apply(tr);
      record(before, "Typing", { coalesce: true, coalesceKey: "type" });
      refresh();
    },
    setSelection: (from, to) => {
      const size = state.doc.textContent.length;
      const f = Math.max(0, Math.min(from, size));
      const raw = to === void 0 ? f : Math.max(0, Math.min(to, size));
      const [lo, hi] = f <= raw ? [f, raw] : [raw, f];
      const cur = state.selection;
      if (textOffsetOf(cur.from) === lo && textOffsetOf(cur.to) === hi) return;
      state = state.apply(state.tr.setSelection(textSelection(lo, hi)));
      refresh();
    },
    toggleMark: (mark, attrs) => {
      const type = schema3.marks[mark];
      if (!type) return;
      const before = snapshot();
      const tr = state.tr;
      const { from, to, empty } = state.selection;
      if (empty) {
        const stored = state.storedMarks ?? [];
        const active = stored.some((m2) => m2.type === type);
        if (active) tr.removeStoredMark(type);
        else tr.addStoredMark(type.create(attrs));
      } else if (deriveMarks().includes(mark)) {
        tr.removeMark(from, to, type);
      } else {
        tr.addMark(from, to, type.create(attrs));
      }
      state = state.apply(tr);
      record(before, `Format ${mark}`);
      refresh();
    },
    setBlock: (block, level) => {
      if (block === "horizontal_rule") {
        actions.insertHorizontalRule();
        return;
      }
      const type = schema3.nodes[block];
      if (!type) return;
      const before = snapshot();
      const changed = runCommand(
        (dispatch) => type.isTextblock ? setBlockType2(
          type,
          block === "heading" && level ? { level } : void 0
        )(state, dispatch) : wrapIn(type)(state, dispatch)
      );
      if (!changed) return;
      record(before, `Set ${block}${block === "heading" && level ? ` ${level}` : ""}`);
      refresh();
    },
    insertBreak: () => {
      const before = snapshot();
      const changed = runCommand((dispatch) => splitBlock(state, dispatch));
      if (!changed) return;
      record(before, "Insert break");
      refresh();
    },
    insertHorizontalRule: () => {
      const type = schema3.nodes.horizontal_rule;
      if (!type) return;
      const before = snapshot();
      const tr = state.tr;
      tr.replaceSelectionWith(type.create());
      state = state.apply(tr);
      record(before, "Insert rule");
      refresh();
    },
    clear: () => {
      if (state.doc.textContent === "" && state.doc.childCount === 1) return;
      const before = snapshot();
      state = EditorState.create({ schema: schema3 });
      record(before, "Clear document");
      refresh();
    },
    undo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.undo();
    },
    redo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.redo();
    }
  };
  const core = {
    get state() {
      return viewState;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/editor.ts
var SAMPLE = "Type here \u2014 the caret is core state.";
var editorEntry = {
  type: "richtext",
  name: "Editor",
  description: "Headless rich text: typing, marks (stored marks carry into new text), block types, rules, and undo composed with the undo-history core (typing bursts coalesce).",
  defaultConfig: {},
  create: (config) => createEditorCore({
    ...config,
    undoHistory: config.undoHistory ?? void 0
  }),
  actions: [
    { label: "Type sample", run: (c) => c.actions.type(SAMPLE) },
    { label: "Bold", run: (c) => c.actions.toggleMark("strong") },
    { label: "Italic", run: (c) => c.actions.toggleMark("em") },
    { label: "Code mark", run: (c) => c.actions.toggleMark("code") },
    {
      label: "Link",
      run: (c) => c.actions.toggleMark("link", { href: "https://trellis.computer" })
    },
    { label: "Paragraph", run: (c) => c.actions.setBlock("paragraph") },
    { label: "H1", run: (c) => c.actions.setBlock("heading", 1) },
    { label: "H2", run: (c) => c.actions.setBlock("heading", 2) },
    { label: "Blockquote", run: (c) => c.actions.setBlock("blockquote") },
    { label: "Code block", run: (c) => c.actions.setBlock("code_block") },
    { label: "Break", run: (c) => c.actions.insertBreak() },
    { label: "Rule", run: (c) => c.actions.insertHorizontalRule() },
    { label: "Clear", run: (c) => c.actions.clear() },
    { label: "Undo", enabled: (c) => c.state.canUndo, run: (c) => void c.actions.undo() },
    { label: "Redo", enabled: (c) => c.state.canRedo, run: (c) => void c.actions.redo() }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const area = el("textarea", {
          class: "editor-area",
          spellcheck: "false",
          placeholder: "Click and type\u2026"
        });
        const chips = el("div", { class: "row" });
        let chipsRender = () => {
        };
        const render = () => {
          const s = core.state;
          area.value = s.text;
          const from = Math.min(s.selection.from, s.text.length);
          const to = Math.min(s.selection.to, s.text.length);
          area.setSelectionRange(from, to);
          chips.replaceChildren(
            el("span", { class: "chip" }, s.blockType + (s.headingLevel ? ` ${s.headingLevel}` : "")),
            ...s.activeMarks.map((m2) => el("span", { class: "chip ok" }, m2))
          );
        };
        area.addEventListener("keydown", (e) => {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          if (e.key === "Enter") {
            e.preventDefault();
            core.actions.insertBreak();
            return;
          }
          if (e.key === "Backspace") return;
          if (e.key.length === 1) {
            e.preventDefault();
            core.actions.type(e.key);
          }
        });
        const unsub = core.subscribe(render);
        render();
        host.append(
          el(
            "div",
            { class: "row" },
            el("span", { class: "status-line", style: "margin:0" }, "live (vanilla view):")
          ),
          area,
          chips,
          el("kbd", {}, "printable keys type \xB7 Enter splits the block \xB7 marks come from core")
        );
        return unsub;
      }
    }
  ]
};

// src/upload/core/index.ts
function createUploadCore(config) {
  const transport2 = config.transport;
  const maxConcurrent = config.maxConcurrent ?? 3;
  const tasks = [];
  const running = /* @__PURE__ */ new Map();
  let state = deriveState2();
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function project(task) {
    const busy = task.status === "uploading" || task.status === "processing";
    return {
      id: task.id,
      key: task.key,
      name: task.name,
      size: task.size,
      type: task.type,
      status: task.status,
      transferred: task.transferred,
      error: task.error,
      progress: task.status === "done" ? 1 : task.size > 0 ? task.transferred / task.size : 0,
      busy,
      canCancel: task.status === "uploading",
      canRetry: task.status === "error"
    };
  }
  function deriveState2() {
    let totalBytes = 0;
    let transferredBytes = 0;
    let busy = false;
    let done = 0;
    let errors = 0;
    for (const task of tasks) {
      totalBytes += task.size;
      transferredBytes += task.transferred;
      busy = busy || project(task).busy;
      if (task.status === "done") done += 1;
      if (task.status === "error") errors += 1;
    }
    return {
      tasks: tasks.map(project),
      uploading: busy,
      progress: totalBytes > 0 ? transferredBytes / totalBytes : 0,
      doneCount: done,
      errorCount: errors
    };
  }
  function refresh() {
    state = deriveState2();
    notify();
  }
  function slotFree() {
    if (maxConcurrent <= 0) return true;
    return running.size < maxConcurrent;
  }
  function startNext() {
    for (const task of tasks) {
      if (task.status !== "idle" || running.has(task.id)) continue;
      if (!slotFree()) return;
      start(task);
    }
  }
  function start(task) {
    const callbacks = {
      onProgress: (bytes) => {
        if (!running.has(task.id)) return;
        task.transferred = Math.min(Math.max(0, bytes), task.size);
        refresh();
      },
      onProcessing: () => {
        if (!running.has(task.id)) return;
        task.status = "processing";
        task.transferred = task.size;
        refresh();
      }
    };
    task.status = "uploading";
    task.transferred = 0;
    task.error = null;
    const handle = transport2.upload(
      {
        id: task.id,
        key: task.key ?? void 0,
        name: task.name,
        size: task.size,
        type: task.type ?? void 0,
        data: task.data
      },
      callbacks
    );
    running.set(task.id, { task, handle });
    handle.promise.then(
      () => {
        if (!running.has(task.id)) return;
        task.status = "done";
        task.transferred = task.size;
        running.delete(task.id);
        refresh();
        startNext();
      },
      (err) => {
        if (!running.has(task.id)) return;
        task.status = "error";
        task.error = err instanceof Error ? err.message : typeof err === "string" ? err : "Upload failed";
        running.delete(task.id);
        refresh();
        startNext();
      }
    );
    refresh();
  }
  const actions = {
    add: (items2) => {
      const batch = Array.isArray(items2) ? items2 : [items2];
      let changed = false;
      for (const item of batch) {
        if (item.key !== void 0 && item.key !== null) {
          const dup = tasks.some(
            (t) => t.key === item.key && t.status !== "error" && t.status !== "done"
          );
          if (dup) continue;
        }
        if (tasks.some((t) => t.id === item.id)) continue;
        tasks.push({
          id: item.id,
          key: item.key ?? null,
          name: item.name,
          size: Math.max(0, item.size),
          type: item.type ?? null,
          status: "idle",
          transferred: 0,
          error: null,
          data: item.data
        });
        changed = true;
      }
      if (!changed) return;
      refresh();
      startNext();
    },
    cancel: (id) => {
      const current = running.get(id);
      if (!current) return false;
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      running.delete(id);
      tasks.splice(index, 1);
      current.handle.cancel();
      refresh();
      startNext();
      return true;
    },
    retry: (id) => {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      const task = tasks[index];
      if (task.status !== "error") return false;
      task.status = "idle";
      task.transferred = 0;
      task.error = null;
      refresh();
      startNext();
      return true;
    },
    remove: (id) => {
      if (running.has(id)) return false;
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      tasks.splice(index, 1);
      refresh();
      return true;
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/upload.ts
var FILES = [
  { name: "launch-recap.mov", size: 142e6, type: "video/quicktime" },
  { name: "oplog-compaction.pdf", size: 34e5, type: "application/pdf" },
  { name: "studio-session.tar.gz", size: 58e6, type: "application/gzip" },
  { name: "adr-0034-wedge-6.md", size: 24e3, type: "text/markdown" }
];
var transport = {
  upload(item, callbacks) {
    let timer = 0;
    let cancelled = false;
    const promise = new Promise((resolve, reject) => {
      const steps = 6 + Math.floor(Math.random() * 8);
      let step2 = 0;
      const tick = () => {
        if (cancelled) {
          reject(new Error("cancelled"));
          return;
        }
        step2 += 1;
        const transferred = Math.round(item.size * step2 / steps);
        callbacks.onProgress(Math.min(transferred, item.size));
        if (step2 >= steps) {
          if (item.type === "video/quicktime") {
            callbacks.onProcessing();
            window.setTimeout(() => resolve(), 600);
          } else {
            resolve();
          }
          return;
        }
        timer = window.setTimeout(tick, 90 + Math.random() * 160);
      };
      timer = window.setTimeout(tick, 60);
    });
    return {
      promise,
      cancel() {
        cancelled = true;
      }
    };
  }
};
var uploadEntry = {
  type: "upload",
  name: "Upload",
  description: "Headless upload queue \u2014 max concurrency, per-task progress, key dedupe (items sharing a key collapse), cancel/retry/remove. The fake transport simulates a server.",
  defaultConfig: { transport },
  create: (config) => createUploadCore({ maxConcurrent: 2, transport: config.transport }),
  actions: [
    {
      label: "Add 3 files",
      run: (c) => {
        const seq = c.state.tasks.length;
        for (let i = 0; i < 3; i++) {
          const f = FILES[i % FILES.length];
          c.actions.add({
            id: `u${Date.now()}-${seq}-${i}`,
            key: `${f.name}#${seq % 3}`,
            name: `${seq + 1}.${i + 1} ${f.name}`,
            size: f.size,
            type: f.type
          });
        }
      }
    },
    {
      label: "Cancel first active",
      enabled: (c) => c.state.tasks.some((t) => t.status === "uploading"),
      run: (c) => {
        const t = c.state.tasks.find((t2) => t2.status === "uploading");
        if (t) c.actions.cancel(t.id);
      }
    },
    {
      label: "Clear finished",
      enabled: (c) => c.state.doneCount + c.state.errorCount > 0,
      run: (c) => {
        for (const t of c.state.tasks) {
          if (t.status === "done" || t.status === "error") c.actions.remove(t.id);
        }
      }
    }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const root = el("div", { class: "upload-list" });
        const agg = el("div", { class: "bar ok" });
        const aggFill = el("i", { style: "width:0%" });
        const aggLabel = el("span", { class: "status-line" });
        agg.append(aggFill);
        const render = () => {
          const s = core.state;
          root.replaceChildren();
          for (const task of s.tasks) {
            const pct = Math.round(task.progress * 100);
            const row = el("div", { class: "task" });
            row.append(
              el("span", { class: "name", title: task.name }, task.name),
              el("span", { class: "meta" }, `${(task.size / 1e6).toFixed(1)} MB`),
              el(
                "div",
                { class: `bar ${task.status === "done" ? "ok" : task.status === "error" ? "err" : ""}` },
                el("i", { style: `width:${pct}%` })
              ),
              el("span", { class: `status status-${task.status}` }, task.status),
              el("span", {}, `${pct}%`)
            );
            if (task.status === "uploading" || task.status === "processing") {
              row.append(el("button", { class: "mini", onclick: () => core.actions.cancel(task.id) }, "cancel"));
            }
            if (task.status === "error") {
              row.append(el("button", { class: "mini", onclick: () => core.actions.retry(task.id) }, "retry"));
              row.append(el("span", { style: "color:var(--red);font-size:12px" }, task.error ?? ""));
            }
            if (task.status === "done" || task.status === "idle") {
              row.append(el("button", { class: "mini", onclick: () => core.actions.remove(task.id) }, "remove"));
            }
            root.append(row);
          }
          aggFill.style.width = `${Math.round(s.progress * 100)}%`;
          aggLabel.textContent = `${s.doneCount} done \xB7 ${s.errorCount} failed` + (s.uploading ? ` \xB7 ${Math.round(s.progress * 100)}%` : " \xB7 idle");
        };
        const unsub = core.subscribe(render);
        render();
        host.append(root, el("div", { class: "toolbar" }, agg, aggLabel));
        return unsub;
      }
    }
  ]
};

// src/colorpicker/core/color.ts
var HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
var RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
var HSL_RE = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/;
function clampByte(n) {
  return Math.min(255, Math.max(0, Math.round(n)));
}
function parseColor(input) {
  const trimmed = input.trim();
  const hex = HEX_RE.exec(trimmed);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3) {
      digits = digits.split("").map((d) => d + d).join("");
    }
    const value = Number.parseInt(digits, 16);
    return {
      r: value >> 16 & 255,
      g: value >> 8 & 255,
      b: value & 255
    };
  }
  const rgb = RGB_RE.exec(trimmed);
  if (rgb) {
    const [r, g, b2] = [rgb[1], rgb[2], rgb[3]].map(Number);
    if ([r, g, b2].some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
      return null;
    }
    return { r, g, b: b2 };
  }
  const hsl = HSL_RE.exec(trimmed);
  if (hsl) {
    const h = Number(hsl[1]);
    const s = Number(hsl[2]);
    const l = Number(hsl[3]);
    if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l) || s < 0 || s > 100 || l < 0 || l > 100) {
      return null;
    }
    return hslToRgb((h % 360 + 360) % 360, s, l);
  }
  return null;
}
function formatHex({ r, g, b: b2 }) {
  const to2 = (n) => clampByte(n).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b2)}`;
}
function formatRgb({ r, g, b: b2 }) {
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b2)})`;
}
function formatHsl(rgb) {
  const { h, s, l } = rgbToHsl(rgb);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l / 100 - 1)) * (s / 100);
  const x2 = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m2 = l / 100 - c / 2;
  let r = 0;
  let g = 0;
  let b2 = 0;
  if (h < 60) [r, g, b2] = [c, x2, 0];
  else if (h < 120) [r, g, b2] = [x2, c, 0];
  else if (h < 180) [r, g, b2] = [0, c, x2];
  else if (h < 240) [r, g, b2] = [0, x2, c];
  else if (h < 300) [r, g, b2] = [x2, 0, c];
  else [r, g, b2] = [c, 0, x2];
  return {
    r: (r + m2) * 255,
    g: (g + m2) * 255,
    b: (b2 + m2) * 255
  };
}
function rgbToHsl({ r, g, b: b2 }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b2 / 255;
  const max2 = Math.max(rn, gn, bn);
  const min2 = Math.min(rn, gn, bn);
  const l = (max2 + min2) / 2;
  const d = max2 - min2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max2 === rn) h = (gn - bn) / d % 6;
    else if (max2 === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
function luminance({ r, g, b: b2 }) {
  const linear = (n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b2);
}
function contrastRatio(a, b2) {
  const la = luminance(a);
  const lb = luminance(b2);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
var WHITE = { r: 255, g: 255, b: 255 };
var BLACK = { r: 0, g: 0, b: 0 };

// src/colorpicker/core/index.ts
function contrastFor(rgb) {
  const white = contrastRatio(rgb, WHITE);
  const black = contrastRatio(rgb, BLACK);
  return {
    white,
    black,
    aaNormal: white >= 4.5 || black >= 4.5,
    aaLarge: white >= 3 || black >= 3,
    aaaNormal: white >= 7 || black >= 7
  };
}
function createColorPickerCore(config = {}) {
  const maxRecent = config.maxRecent ?? 8;
  const initialRgb = parseColor(config.initial ?? "#000000") ?? { r: 0, g: 0, b: 0 };
  let format = config.format ?? "hex";
  const recent = [];
  let valueRgb = initialRgb;
  let open = false;
  let draft = "";
  let draftValid = false;
  let draftRgb = null;
  let state = deriveState2();
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function stringify(rgb, fmt) {
    if (fmt === "rgb") return formatRgb(rgb);
    if (fmt === "hsl") return formatHsl(rgb);
    return formatHex(rgb);
  }
  function previewRgb() {
    if (open && draftValid && draftRgb) return draftRgb;
    if (open) return null;
    return valueRgb;
  }
  function deriveState2() {
    const preview = previewRgb();
    return {
      value: stringify(valueRgb, format),
      format,
      open,
      draft,
      valid: draftValid,
      normalized: preview ? formatHex(preview) : null,
      contrast: preview ? contrastFor(preview) : null,
      recent: [...recent]
    };
  }
  function pushRecent(rgb) {
    if (maxRecent <= 0) return;
    const hex = formatHex(rgb);
    const existing = recent.indexOf(hex);
    if (existing !== -1) recent.splice(existing, 1);
    recent.unshift(hex);
    if (recent.length > maxRecent) recent.length = maxRecent;
  }
  const actions = {
    open: () => {
      if (open) return;
      open = true;
      draft = stringify(valueRgb, format);
      const parsed = parseColor(draft);
      draftValid = parsed !== null;
      draftRgb = parsed;
      state = deriveState2();
      notify();
    },
    setDraft: (color) => {
      if (!open) return;
      if (color === draft && draftValid) return;
      draft = color;
      const parsed = parseColor(color);
      draftValid = parsed !== null;
      draftRgb = parsed;
      state = deriveState2();
      notify();
    },
    commit: () => {
      if (!open || !draftValid || !draftRgb) return false;
      open = false;
      valueRgb = draftRgb;
      pushRecent(valueRgb);
      state = deriveState2();
      notify();
      return true;
    },
    cancel: () => {
      if (!open) return;
      open = false;
      draft = stringify(valueRgb, format);
      draftValid = true;
      draftRgb = valueRgb;
      state = deriveState2();
      notify();
    },
    setValue: (color) => {
      const parsed = parseColor(color);
      if (!parsed) return false;
      if (parsed.r === valueRgb.r && parsed.g === valueRgb.g && parsed.b === valueRgb.b) {
        return true;
      }
      valueRgb = parsed;
      if (open) {
        draft = stringify(valueRgb, format);
        draftValid = true;
        draftRgb = valueRgb;
      }
      pushRecent(valueRgb);
      state = deriveState2();
      notify();
      return true;
    },
    setFormat: (fmt) => {
      if (fmt === format) return;
      format = fmt;
      if (open && draftValid && draftRgb) {
        draft = stringify(draftRgb, fmt);
      }
      state = deriveState2();
      notify();
    },
    clearRecent: () => {
      if (recent.length === 0) return;
      recent.length = 0;
      state = deriveState2();
      notify();
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/colorpicker.ts
var colorpickerEntry = {
  type: "colorpicker",
  name: "Color picker",
  description: "Headless color core \u2014 parse/normalize hex\xB7rgb\xB7hsl, swatch draft + commit/cancel, recents ring, and live WCAG contrast checks.",
  defaultConfig: { initial: "#3366ff", maxRecent: 8 },
  create: (config) => createColorPickerCore({ initial: config.initial, maxRecent: config.maxRecent }),
  actions: [
    { label: "Open", enabled: (c) => !c.state.open, run: (c) => c.actions.open() },
    { label: "Cancel", enabled: (c) => c.state.open, run: (c) => c.actions.cancel() },
    { label: "Set draft \u201C#ffcc00\u201D", run: (c) => c.actions.setDraft("#ffcc00") },
    { label: "Commit draft", enabled: (c) => c.state.valid, run: (c) => c.actions.commit() },
    { label: "Format \u2192 rgb", run: (c) => c.actions.setFormat("rgb") },
    { label: "Format \u2192 hsl", run: (c) => c.actions.setFormat("hsl") },
    { label: "Format \u2192 hex", run: (c) => c.actions.setFormat("hex") },
    { label: "Value #111", run: (c) => c.actions.setValue("#111111") }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const root = el("div", { class: "cp-root" });
        const swatch = el("button", { class: "cp-swatch", onclick: () => core.actions.open() });
        const valueInput = el("input", {
          type: "text",
          spellcheck: "false",
          onkeydown: (e) => {
            if (e.key === "Enter") core.actions.setValue(valueInput.value);
          },
          onblur: () => core.actions.setValue(valueInput.value)
        });
        const formatSelect = el(
          "select",
          { onchange: () => core.actions.setFormat(formatSelect.value) },
          el("option", { value: "hex" }, "hex"),
          el("option", { value: "rgb" }, "rgb"),
          el("option", { value: "hsl" }, "hsl")
        );
        const recentRow = el("div", { class: "row" });
        const contrastRow = el("div", { class: "row" });
        const editor = el("div");
        const render = () => {
          const s = core.state;
          swatch.style.background = s.value;
          swatch.style.color = (s.contrast?.black ?? 0) > (s.contrast?.white ?? 0) ? "#000" : "#fff";
          valueInput.value = s.value;
          formatSelect.value = s.format;
          recentRow.replaceChildren(
            el("span", { class: "status-line", style: "margin:0" }, "recent:"),
            ...s.recent.map(
              (c) => el("button", {
                class: `swatch ${c === s.value ? "active" : ""}`,
                style: `background:${c}`,
                title: c,
                onclick: () => core.actions.setValue(c)
              })
            )
          );
          contrastRow.replaceChildren(
            ...s.contrast ? [
              el("span", { class: "chip" }, `vs white ${s.contrast.white.toFixed(1)}`),
              el("span", { class: "chip" }, `vs black ${s.contrast.black.toFixed(1)}`),
              el("span", { class: `chip ${s.contrast.aaNormal ? "ok" : "no"}` }, `AA normal ${s.contrast.aaNormal ? "\u2713" : "\u2717"}`)
            ] : [el("span", { class: "chip" }, "invalid draft")]
          );
          editor.replaceChildren();
          if (s.open) {
            editor.append(
              el(
                "div",
                { style: "background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:12px" },
                el(
                  "div",
                  { class: "row" },
                  el("input", {
                    type: "text",
                    value: s.draft,
                    spellcheck: "false",
                    oninput: (e) => core.actions.setDraft(e.target.value),
                    onkeydown: (e) => {
                      if (e.key === "Enter") core.actions.commit();
                      if (e.key === "Escape") core.actions.cancel();
                    }
                  }),
                  el("span", { class: "chip", style: `background:${s.normalized ?? "transparent"}` }, s.normalized ?? ""),
                  el("button", { class: "mini", onclick: () => core.actions.commit(), disabled: !s.valid }, "commit"),
                  el("button", { class: "mini", onclick: () => core.actions.cancel() }, "cancel")
                )
              )
            );
          }
        };
        const unsub = core.subscribe(render);
        render();
        root.append(
          el(
            "div",
            { class: "row" },
            swatch,
            valueInput,
            formatSelect,
            el("span", { class: "dim", style: "font-size:11px" }, "enter \u2192 set \xB7 click swatch to edit")
          ),
          recentRow,
          contrastRow,
          editor
        );
        host.append(root);
        return unsub;
      }
    }
  ]
};

// src/inspector/entries/undo-history.ts
var doc = { text: "" };
function cmd(label, doFn, undoFn) {
  return {
    label,
    execute: doFn,
    invert: () => ({ label, execute: undoFn, invert: () => cmd(label, doFn, undoFn) })
  };
}
var pushA = cmd('Insert "a"', () => doc.text += "a", () => doc.text = doc.text.slice(0, -1));
var pushB = cmd('Insert "b"', () => doc.text += "b", () => doc.text = doc.text.slice(0, -1));
var bold = cmd(
  "Bold",
  () => doc.text = `*${doc.text}*`,
  () => doc.text = doc.text.replace(/^\*(.*)\*$/, "$1")
);
var undoHistoryEntry = {
  type: "undo-history",
  name: "Undo history",
  description: "Generic command stack \u2014 one gesture = one step, adjacent same-key pushes coalesce (typing bursts), redo is cut by new edits. Composes into every editable core.",
  defaultConfig: { doc },
  create: () => createUndoHistoryCore(),
  actions: [
    { label: "Push a (coalesce)", run: (c) => c.actions.push(pushA, { coalesce: true, coalesceKey: "type" }) },
    { label: "Push b (coalesce)", run: (c) => c.actions.push(pushB, { coalesce: true, coalesceKey: "type" }) },
    { label: "Push Bold (breaks window)", run: (c) => c.actions.push(bold) },
    {
      label: "Push group",
      run: (c) => {
        c.actions.beginGroup("Two edits");
        c.actions.push(pushA, { coalesce: true, coalesceKey: "type" });
        c.actions.push(pushB, { coalesce: true, coalesceKey: "type" });
        c.actions.endGroup();
      }
    },
    { label: "Undo", enabled: (c) => c.state.canUndo, run: (c) => void c.actions.undo() },
    { label: "Redo", enabled: (c) => c.state.canRedo, run: (c) => void c.actions.redo() },
    { label: "Clear", enabled: (c) => c.state.canUndo || c.state.canRedo, run: (c) => c.actions.clear() }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        let label = el("div", { class: "doc" }, doc.text || "\xB7");
        let stateLine = el("div", { class: "status-line" });
        const render = () => {
          const s = core.state;
          label.textContent = doc.text || "\xB7";
          stateLine.textContent = `${s.undoCount} undo step${s.undoCount === 1 ? "" : "s"} \xB7 ${s.redoCount} redo \xB7 next undo: \u201C${s.undoLabel ?? "\u2014"}\u201D`;
        };
        const unsub = core.subscribe(render);
        render();
        host.append(
          el("div", { class: "toolbar" }, el("span", { class: "chip" }, "demo doc:")),
          label,
          stateLine
        );
        return unsub;
      }
    }
  ]
};

// src/forms/types.ts
var FIELD_CONTROLS = [
  "text",
  "textarea",
  "number",
  "checkbox",
  "select",
  "multi_select",
  "date",
  "relation",
  "people",
  "files",
  "json",
  "readonly"
];

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce2,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items2) => {
    const obj = {};
    for (const item of items2) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k2) => typeof obj[obj[k2]] !== "number");
    const filtered = {};
    for (const k2 of validKeys) {
      filtered[k2] = obj[k2];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el3 = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el3] = curr[el3] || { _errors: [] };
            } else {
              curr[el3] = curr[el3] || { _errors: [] };
              curr[el3]._errors.push(mapper(issue));
            }
            curr = curr[el3];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m2) => !!m2).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x2) => !!x2)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x2) => x2.status === "aborted";
var isDirty = (x2) => x2.status === "dirty";
var isValid = (x2) => x2.status === "valid";
var isAsync = (x2) => typeof Promise !== "undefined" && x2 instanceof Promise;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min2 === null || ch.value > min2)
          min2 = ch.value;
      }
    }
    return min2;
  }
  get maxLength() {
    let max2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max2 === null || ch.value < max2)
          max2 = ch.value;
      }
    }
    return max2;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step2) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step2.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step2.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min2 === null || ch.value > min2)
          min2 = ch.value;
      }
    }
    return min2;
  }
  get maxValue() {
    let max2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max2 === null || ch.value < max2)
          max2 = ch.value;
      }
    }
    return max2;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max2 = null;
    let min2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min2 === null || ch.value > min2)
          min2 = ch.value;
      } else if (ch.kind === "max") {
        if (max2 === null || ch.value < max2)
          max2 = ch.value;
      }
    }
    return Number.isFinite(min2) && Number.isFinite(max2);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min2 === null || ch.value > min2)
          min2 = ch.value;
      }
    }
    return min2;
  }
  get maxValue() {
    let max2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max2 === null || ch.value < max2)
          max2 = ch.value;
      }
    }
    return max2;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min2 === null || ch.value > min2)
          min2 = ch.value;
      }
    }
    return min2 != null ? new Date(min2) : null;
  }
  get maxDate() {
    let max2 = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max2 === null || ch.value < max2)
          max2 = ch.value;
      }
    }
    return max2 != null ? new Date(max2) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema3, params) => {
  return new ZodArray({
    type: schema3,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema3) {
  if (schema3 instanceof ZodObject) {
    const newShape = {};
    for (const key in schema3.shape) {
      const fieldSchema = schema3.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema3._def,
      shape: () => newShape
    });
  } else if (schema3 instanceof ZodArray) {
    return new ZodArray({
      ...schema3._def,
      type: deepPartialify(schema3.element)
    });
  } else if (schema3 instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema3.unwrap()));
  } else if (schema3 instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema3.unwrap()));
  } else if (schema3 instanceof ZodTuple) {
    return ZodTuple.create(schema3.items.map((item) => deepPartialify(item)));
  } else {
    return schema3;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema3) {
    return this.augment({ [key]: schema3 });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b2) {
  const aType = getParsedType(a);
  const bType = getParsedType(b2);
  if (a === b2) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b2);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b2 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b2[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b2.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b2[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b2) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items2 = [...ctx.data].map((item, itemIndex) => {
      const schema3 = this._def.items[itemIndex] || this._def.rest;
      if (!schema3)
        return null;
      return schema3._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x2) => !!x2);
    if (ctx.common.async) {
      return Promise.all(items2).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items2);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me2 = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me2._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me2._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me2 = this;
      return OK(function(...args) {
        const parsedArgs = me2._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me2._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items2) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items2).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema3, params) => {
  return new ZodPromise({
    type: schema3,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema3, effect, params) => {
  return new ZodEffects({
    schema: schema3,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema3, params) => {
  return new ZodEffects({
    schema: schema3,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b2) {
    return new _ZodPipeline({
      in: a,
      out: b2,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce2 = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;

// src/schema/define.ts
function rel(target, cardinality = "one") {
  return { target, cardinality };
}
function defineType(type, shape, opts = {}) {
  const relations = opts.relations ?? {};
  const computed = opts.computed ?? {};
  const fields = [
    ...Object.entries(shape).map(([name, zt2]) => {
      const spec = zodToSpec(name, zt2, name === opts.title);
      const sync = opts.fieldSync?.[name];
      return sync ? { ...spec, sync } : spec;
    }),
    ...Object.entries(relations).map(([name, r]) => relationToSpec(name, r)),
    ...Object.entries(computed).map(
      ([name, c]) => ({ name, required: false, ...c.spec })
    )
  ];
  const definition = {
    "@id": `trellis:${type}`,
    "@type": "trellis:Schema",
    version: opts.version ?? "1.0.0",
    tier: opts.tier ?? "user",
    label: opts.label ?? type,
    fields,
    ...opts.extends ? { subClassOf: opts.extends } : {}
  };
  return {
    type,
    zod: external_exports.object(shape),
    relations,
    computed,
    definition,
    toOntologySchema: () => lowerToLegacy(type, definition, relations)
  };
}
function unwrap(zt2) {
  let t = zt2;
  for (let i = 0; i < 8; i++) {
    if (t instanceof external_exports.ZodOptional || t instanceof external_exports.ZodNullable || t instanceof external_exports.ZodDefault) {
      const inner = t._def.innerType;
      if (!inner) break;
      t = inner;
    } else {
      break;
    }
  }
  return t;
}
function zodToSpec(name, zt2, isTitle) {
  const required = !zt2.isOptional();
  const base = unwrap(zt2);
  let valueType = "rich_text";
  let selectOptions;
  if (isTitle) {
    valueType = "title";
  } else if (base instanceof external_exports.ZodString) {
    const checks = base._def.checks ?? [];
    if (checks.some((c) => c.kind === "email")) valueType = "email";
    else if (checks.some((c) => c.kind === "url")) valueType = "url";
    else if (checks.some((c) => c.kind === "datetime")) valueType = "date";
    else valueType = "rich_text";
  } else if (base instanceof external_exports.ZodNumber) {
    valueType = "number";
  } else if (base instanceof external_exports.ZodBoolean) {
    valueType = "checkbox";
  } else if (base instanceof external_exports.ZodDate) {
    valueType = "date";
  } else if (base instanceof external_exports.ZodEnum) {
    valueType = "select";
    selectOptions = base.options.slice();
  } else if (base instanceof external_exports.ZodArray) {
    const el3 = unwrap(base._def.type);
    valueType = "multi_select";
    if (el3 instanceof external_exports.ZodEnum) {
      selectOptions = el3.options.slice();
    }
  } else {
    valueType = "json";
  }
  const spec = { name, valueType, required };
  if (selectOptions) spec.selectOptions = selectOptions;
  return spec;
}
function targetName(r) {
  return typeof r.target === "string" ? r.target : r.target().type;
}
function relationToSpec(name, r) {
  return {
    name,
    valueType: "relation",
    required: false,
    relation: { targetSchema: targetName(r), cardinality: r.cardinality }
  };
}
function attrType(v2) {
  switch (v2) {
    case "number":
    case "rollup":
      return "number";
    case "checkbox":
      return "boolean";
    case "date":
      return "date";
    case "relation":
      return "ref";
    default:
      return "string";
  }
}
function lowerToLegacy(type, def, relations) {
  const attributes = def.fields.filter((f) => f.valueType !== "relation").map((f) => ({
    name: f.name,
    type: attrType(f.valueType),
    required: f.required ?? false
  }));
  const rels = Object.entries(relations).map(([name, r]) => ({
    name,
    sourceTypes: [type],
    targetTypes: [targetName(r)],
    cardinality: r.cardinality
  }));
  return {
    id: def["@id"],
    name: type,
    version: def.version,
    entities: [{ name: type, attributes }],
    relations: rels
  };
}

// src/forms/ontology.ts
var CONTROL_ENUM = [...FIELD_CONTROLS];
var FormFieldType = defineType("FormField", {
  /** Attribute name in the entity record — must match a schema field. */
  fieldName: external_exports.string(),
  label: external_exports.string().optional(),
  control: external_exports.enum(CONTROL_ENUM).optional(),
  required: external_exports.boolean().optional(),
  readonly: external_exports.boolean().optional(),
  hidden: external_exports.boolean().optional(),
  /** Render order within the section (relative). */
  order: external_exports.number().optional(),
  /** Move the field to a section (created on demand). */
  section: external_exports.string().optional(),
  options: external_exports.array(external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()])).optional(),
  defaultValue: external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()]).optional(),
  placeholder: external_exports.string().optional(),
  description: external_exports.string().optional()
}, { title: "fieldName" });
var FormType = defineType("Form", {
  /** Bare entity type name (e.g. `Task`). */
  entityType: external_exports.string(),
  /** Undefined = applies to all modes. */
  mode: external_exports.enum(["create", "edit", "view"]).optional(),
  /** Overrides the schema label / form title. */
  title: external_exports.string().optional(),
  description: external_exports.string().optional()
}, {
  title: "entityType",
  relations: {
    fields: rel(() => FormFieldType, "many")
  }
});
var FORMS_ONTOLOGY = [FormType.definition, FormFieldType.definition];

// src/forms/core/validate.ts
async function validateWithZod(fieldSchema, value) {
  try {
    await fieldSchema.parseAsync(value);
    return null;
  } catch (err) {
    if (err instanceof external_exports.ZodError) {
      return err.errors[0]?.message ?? "Invalid value";
    }
    return "Validation failed";
  }
}
function isEmpty(value) {
  return value === void 0 || value === null || typeof value === "string" && value.trim() === "" || Array.isArray(value) && value.length === 0;
}
function validateWithMetadata(field, value) {
  if (field.computed) return null;
  if (field.required && isEmpty(value)) {
    return "Required";
  }
  if (isEmpty(value)) return null;
  const v2 = field.validation;
  if (typeof value === "number") {
    if (v2?.min !== void 0 && value < v2.min) {
      return `Must be at least ${v2.min}`;
    }
    if (v2?.max !== void 0 && value > v2.max) {
      return `Must be at most ${v2.max}`;
    }
  }
  if (typeof value === "string") {
    if (v2?.minLength !== void 0 && value.length < v2.minLength) {
      return `Must be at least ${v2.minLength} characters`;
    }
    if (v2?.maxLength !== void 0 && value.length > v2.maxLength) {
      return `Must be at most ${v2.maxLength} characters`;
    }
    if (v2?.pattern !== void 0 && !new RegExp(v2.pattern).test(value)) {
      return "Invalid format";
    }
  }
  if (field.selectOptions && field.selectOptions.length > 0 && !field.selectOptions.includes(value)) {
    return "Invalid option";
  }
  return null;
}
async function validateFieldValue(field, value, zodShape) {
  const fieldSchema = zodShape?.[field.name];
  if (fieldSchema) return validateWithZod(fieldSchema, value);
  return validateWithMetadata(field, value);
}

// src/forms/core/index.ts
function createInitialState(initialValues, fields) {
  const shape = {};
  for (const f of fields) {
    if (initialValues[f.name] !== void 0) {
      shape[f.name] = initialValues[f.name];
    } else if (f.required && f.valueType !== "checkbox") {
      shape[f.name] = "";
    } else {
      shape[f.name] = void 0;
    }
  }
  return {
    values: shape,
    errors: Object.fromEntries(fields.map((f) => [f.name, null])),
    dirty: Object.fromEntries(fields.map((f) => [f.name, false])),
    touched: Object.fromEntries(fields.map((f) => [f.name, false])),
    isSubmitting: false,
    isValid: true,
    isDirty: false
  };
}
function computeIsValid(errors) {
  return Object.values(errors).every((e) => e === null);
}
function computeIsDirty(values, initialValues, dirty) {
  return Object.keys(values).some(
    (k2) => dirty[k2] || values[k2] !== initialValues[k2]
  );
}
function createFormCore(formSchema, initialValues = {}) {
  let state = createInitialState(initialValues, formSchema.fields);
  const initialRef = { current: { ...state.values } };
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  const validateField = async (fieldName, value) => {
    const field = formSchema.fields.find((f) => f.name === fieldName);
    if (!field) return null;
    return validateFieldValue(field, value, formSchema.zod?.shape);
  };
  const validate = async (values) => {
    const toValidate = values ?? state.values;
    const errors = [];
    for (const field of formSchema.fields) {
      if (field.computed) continue;
      const err = await validateField(field.name, toValidate[field.name]);
      if (err) errors.push({ field: field.name, message: err });
    }
    return { valid: errors.length === 0, errors, data: toValidate };
  };
  const actions = {
    setValue: (field, value) => {
      state = {
        ...state,
        values: { ...state.values, [field]: value },
        dirty: { ...state.dirty, [field]: true }
      };
      notify();
    },
    setValues: (values) => {
      const newDirty = { ...state.dirty };
      for (const k2 of Object.keys(values)) newDirty[k2] = true;
      state = { ...state, values: { ...state.values, ...values }, dirty: newDirty };
      notify();
    },
    setError: (field, error) => {
      state = { ...state, errors: { ...state.errors, [field]: error } };
      notify();
    },
    setErrors: (errors) => {
      state = { ...state, errors: { ...state.errors, ...errors } };
      notify();
    },
    setTouched: (field, touched) => {
      state = { ...state, touched: { ...state.touched, [field]: touched } };
      notify();
    },
    setDirty: (field, dirty) => {
      state = { ...state, dirty: { ...state.dirty, [field]: dirty } };
      notify();
    },
    validate: async (values) => {
      const result = await validate(values);
      if (!values) {
        state = {
          ...state,
          errors: Object.fromEntries(
            result.errors.map((e) => [e.field, e.message])
          )
        };
        notify();
      }
      return result;
    },
    validateField: async (field, value) => {
      const err = await validateField(field, value);
      actions.setError(field, err);
      return err;
    },
    reset: (values) => {
      const next = values ? { ...initialRef.current, ...values } : initialRef.current;
      state = createInitialState({ ...next }, formSchema.fields);
      initialRef.current = { ...state.values };
      notify();
    },
    submit: async (onSubmit) => {
      state = { ...state, isSubmitting: true };
      notify();
      const result = await validate();
      if (result.valid) {
        try {
          await onSubmit({ ...state.values });
        } finally {
          state = { ...state, isSubmitting: false };
          notify();
        }
      } else {
        state = {
          ...state,
          isSubmitting: false,
          errors: Object.fromEntries(
            result.errors.map((e) => [e.field, e.message])
          )
        };
        notify();
      }
    }
  };
  const core = {
    get state() {
      return {
        ...state,
        isValid: computeIsValid(state.errors),
        isDirty: computeIsDirty(state.values, initialRef.current, state.dirty)
      };
    },
    actions,
    field: (name) => {
      const s = core.state;
      return {
        value: s.values[name],
        error: s.errors[name],
        dirty: s.dirty[name],
        touched: s.touched[name],
        onChange: (value) => actions.setValue(name, value),
        onBlur: () => actions.setTouched(name, true)
      };
    },
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/forms.ts
var schema2 = {
  typeName: "gallery-task",
  fields: [
    { name: "title", valueType: "title", required: true, isTitle: true, validation: { maxLength: 40 } },
    { name: "notes", valueType: "rich_text", required: false, validation: { maxLength: 200 } },
    { name: "qty", valueType: "number", required: false, validation: { min: 0, max: 99 } },
    { name: "done", valueType: "checkbox", required: false },
    { name: "lane", valueType: "select", required: true, selectOptions: ["todo", "doing", "done"] },
    { name: "email", valueType: "email", required: false }
  ],
  titleKey: "title"
};
var formEntry = {
  type: "form",
  name: "Form",
  description: "Headless form engine \u2014 values, per-field errors (required/length/min-max), dirty/touched tracking, async validate/submit. The view renders plain inputs against core state.",
  defaultConfig: {
    schema: schema2,
    initialValues: { title: "Ship wedge gallery", qty: 2, lane: "doing" }
  },
  create: (config) => createFormCore(config.schema, config.initialValues),
  actions: [
    {
      label: "Validate",
      run: (c) => {
        void c.actions.validate().then((r) => {
          if (!r.valid) {
            c.actions.setTouched("title", true);
          }
        });
      }
    },
    {
      label: "Reset",
      run: (c) => c.actions.reset()
    },
    {
      label: "Set sample values",
      run: (c) => c.actions.setValues({ title: "Sample", qty: 7, done: true, lane: "done", email: "a@b.c" })
    },
    {
      label: "Submit",
      run: (c) => {
        void c.actions.submit(async () => {
          await new Promise((r) => setTimeout(r, 400));
        });
      }
    }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const root = el("div", { class: "form-grid" });
        const summary = el("div", { class: "status-line" });
        const render = () => {
          const s = core.state;
          root.replaceChildren();
          for (const f of schema2.fields) {
            const value = s.values[f.name];
            const err = s.errors[f.name];
            let control;
            if (f.valueType === "checkbox") {
              control = el("input", {
                type: "checkbox",
                checked: Boolean(value),
                onchange: (e) => {
                  core.actions.setValue(f.name, e.target.checked);
                  core.actions.setTouched(f.name, true);
                }
              });
            } else if (f.valueType === "select") {
              control = el(
                "select",
                {
                  onchange: (e) => {
                    core.actions.setValue(f.name, e.target.value);
                    core.actions.setTouched(f.name, true);
                  }
                },
                ...(f.selectOptions ?? []).map(
                  (opt) => el("option", { value: String(opt), selected: String(opt) === String(value) }, String(opt))
                )
              );
            } else {
              control = el("input", {
                type: f.valueType === "number" ? "number" : "text",
                value: value === void 0 || value === null ? "" : String(value),
                oninput: (e) => {
                  const raw = e.target.value;
                  const next = f.valueType === "number" ? raw === "" ? void 0 : Number(raw) : raw;
                  core.actions.setValue(f.name, next);
                  core.actions.setTouched(f.name, true);
                }
              });
            }
            root.append(
              el(
                "label",
                { class: "form-field" },
                el("span", { class: "field-name" }, f.name + (f.required ? " *" : "")),
                control,
                err ? el("span", { class: "field-err" }, err) : s.dirty[f.name] ? el("span", { class: "field-dirty" }, "dirty") : null
              )
            );
          }
          summary.textContent = `isValid: ${s.isValid} \xB7 isDirty: ${s.isDirty}` + (s.isSubmitting ? " \xB7 submitting\u2026" : "");
        };
        const unsub = core.subscribe(render);
        render();
        host.append(root, summary);
        return unsub;
      }
    }
  ]
};

// src/headless/fuzzy.ts
function fuzzyScore(query, target) {
  if (query === "") return 1;
  const q2 = query.toLowerCase();
  const t = target.toLowerCase();
  if (q2 === t) return 1e3;
  let score = 0;
  let lastIndex = -1;
  let run = 0;
  for (const char of q2) {
    const idx = t.indexOf(char, lastIndex + 1);
    if (idx === -1) return 0;
    run = idx === lastIndex + 1 ? run + 1 : 0;
    score += 1 + run * 2 - (idx - lastIndex - 1);
    lastIndex = idx;
  }
  if (t.startsWith(q2)) score += 10;
  return Math.max(1, score);
}
function fuzzyMatch(query, text2) {
  let best = 0;
  for (const t of text2) {
    const s = fuzzyScore(query, t);
    if (s > best) best = s;
  }
  return best;
}
function fuzzyRanges(query, target) {
  if (query === "") return [];
  const q2 = query.toLowerCase();
  const t = target.toLowerCase();
  const indices = [];
  let lastIndex = -1;
  for (const char of q2) {
    const idx = t.indexOf(char, lastIndex + 1);
    if (idx === -1) return [];
    indices.push(idx);
    lastIndex = idx;
  }
  const ranges = [];
  for (const idx of indices) {
    const last = ranges[ranges.length - 1];
    if (last && idx === last[1]) {
      last[1] = idx + 1;
    } else {
      ranges.push([idx, idx + 1]);
    }
  }
  return ranges;
}

// src/palette/core/index.ts
function defaultFilter(query, items2) {
  const scored = [];
  for (const item of items2) {
    const score = fuzzyMatch(query, [item.label, ...item.keywords ?? []]);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b2) => b2.score - a.score);
  return scored.map(({ item }) => item);
}
function groupItems(items2) {
  const groups = [];
  const byId = /* @__PURE__ */ new Map();
  for (const item of items2) {
    const key = item.group ?? "";
    let group = byId.get(key);
    if (!group) {
      group = {
        id: key,
        title: key || "All",
        items: []
      };
      byId.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
function createPaletteCore(config) {
  const { items: items2 = [], onSelect, closeOnSelect = true, wrap: wrap2 = true } = config;
  const filter = config.filter ?? defaultFilter;
  const baseState = {
    open: false,
    query: "",
    items: items2,
    loading: false
  };
  let state = deriveState2({ ...baseState, results: items2, selectedIndex: 0 });
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function deriveState2(partial) {
    const results = filter(partial.query, partial.items);
    let selectedIndex = partial.selectedIndex;
    if (results.length === 0) {
      selectedIndex = 0;
    } else if (selectedIndex >= results.length) {
      selectedIndex = wrap2 ? 0 : results.length - 1;
    } else if (selectedIndex < 0) {
      selectedIndex = wrap2 ? results.length - 1 : 0;
    }
    return {
      ...partial,
      results,
      selectedIndex,
      empty: partial.open && !partial.loading && results.length === 0,
      groups: groupItems(results)
    };
  }
  const actions = {
    open: () => {
      state = deriveState2({ ...state, open: true });
      notify();
    },
    close: () => {
      state = deriveState2({ ...state, open: false, query: "" });
      notify();
    },
    toggle: () => {
      state = deriveState2({ ...state, open: !state.open, query: !state.open ? "" : state.query });
      notify();
    },
    setQuery: (query) => {
      state = deriveState2({ ...state, query, selectedIndex: 0 });
      notify();
    },
    moveSelection: (delta) => {
      if (state.results.length === 0) return;
      const next = state.selectedIndex + delta;
      let selectedIndex;
      if (wrap2) {
        selectedIndex = (next % state.results.length + state.results.length) % state.results.length;
      } else {
        selectedIndex = Math.min(Math.max(next, 0), state.results.length - 1);
      }
      state = deriveState2({ ...state, selectedIndex });
      notify();
    },
    setSelectedIndex: (index) => {
      state = deriveState2({ ...state, selectedIndex: index });
      notify();
    },
    select: () => {
      const item = state.results[state.selectedIndex];
      if (!item || item.disabled) return null;
      if (onSelect) onSelect(item);
      if (closeOnSelect) {
        state = deriveState2({ ...state, open: false, query: "" });
        notify();
      }
      return item;
    },
    setLoading: (loading) => {
      state = deriveState2({ ...state, loading });
      notify();
    },
    setItems: (nextItems) => {
      state = deriveState2({
        ...state,
        items: nextItems,
        selectedIndex: 0,
        loading: false
      });
      notify();
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/palette.ts
var items = [
  { id: "new-note", label: "New note", keywords: ["create", "note"], group: "Actions", description: "Blank rich-text note" },
  { id: "new-task", label: "New task", keywords: ["create", "todo"], group: "Actions", description: "Task with due date" },
  { id: "sync", label: "Sync now", keywords: ["push", "pull", "iroh"], group: "Actions" },
  { id: "open-design", label: "Open design", group: "Go", description: "Figma / shapes" },
  { id: "open-readme", label: "Open README", group: "Go" },
  { id: "open-logs", label: "Open logs", group: "Go" },
  { id: "theme-dark", label: "Dark theme", keywords: ["color", "mode"], group: "Settings" },
  { id: "theme-light", label: "Light theme", keywords: ["color", "mode"], group: "Settings" },
  { id: "theme-paper", label: "Paper theme", keywords: ["color", "mode"], group: "Settings" }
];
var paletteEntry = {
  type: "palette",
  name: "Palette",
  description: "Headless command palette \u2014 fuzzy filter with stable ranking, grouped results, keyboard move/select, loading flag. Try a query below.",
  defaultConfig: { items },
  create: (config) => createPaletteCore({ items: config.items ?? items, onSelect: config.onSelect }),
  actions: [
    { label: "Open", enabled: (c) => !c.state.open, run: (c) => c.actions.open() },
    { label: "Close", enabled: (c) => c.state.open, run: (c) => c.actions.close() },
    { label: "Toggle", run: (c) => c.actions.toggle() },
    {
      label: "Move \u2193",
      enabled: (c) => c.state.results.length > 0,
      run: (c) => c.actions.moveSelection(1)
    },
    {
      label: "Move \u2191",
      enabled: (c) => c.state.results.length > 0,
      run: (c) => c.actions.moveSelection(-1)
    },
    {
      label: "Select",
      enabled: (c) => c.state.results.length > 0,
      run: (c) => c.actions.select()
    },
    { label: "Set query \u201Csync\u201D", run: (c) => c.actions.setQuery("sync") },
    { label: "Loading (2s)", run: (c) => {
      c.actions.setLoading(true);
      setTimeout(() => c.actions.setLoading(false), 2e3);
    } }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const input = el("input", {
          type: "text",
          placeholder: "query (e.g. theme)",
          value: "",
          oninput: (e) => core.actions.setQuery(e.target.value)
        });
        const list = el("div", { class: "palette-list" });
        const status = el("div", { class: "status-line" });
        const render = () => {
          const s = core.state;
          list.replaceChildren();
          if (!s.open) {
            list.append(el("p", { class: "dim" }, "closed \u2014 click Open"));
          } else if (s.loading) {
            list.append(el("p", { class: "dim" }, "loading\u2026"));
          } else if (s.empty) {
            list.append(el("p", { class: "dim" }, "no results"));
          } else {
            for (const g of s.groups) {
              list.append(el("div", { class: "palette-group" }, g.title));
              for (const item of g.items) {
                const idx = s.results.indexOf(item);
                list.append(
                  el(
                    "div",
                    {
                      class: "palette-item" + (idx === s.selectedIndex ? " active" : ""),
                      onclick: () => core.actions.select()
                    },
                    el("span", {}, item.label),
                    item.description ? el("span", { class: "dim" }, item.description) : null
                  )
                );
              }
            }
          }
          status.textContent = `open: ${s.open} \xB7 results: ${s.results.length}` + (s.results.length ? ` \xB7 selected: ${s.results[s.selectedIndex]?.label}` : "");
        };
        const unsub = core.subscribe(render);
        render();
        host.append(input, list, status);
        return unsub;
      }
    }
  ]
};

// src/dialog/core/index.ts
var idCounter = 0;
function nextId() {
  idCounter += 1;
  return `dialog-${idCounter}`;
}
var DEFAULT_BACKDROP = {
  modal: true,
  nonmodal: false,
  alert: true,
  confirm: true
};
function deriveA11y(id, kind, spec) {
  const modal2 = kind === "modal" || kind === "alert" || kind === "confirm";
  return {
    role: kind === "alert" || kind === "confirm" ? "alertdialog" : "dialog",
    ariaModal: modal2,
    labelledBy: spec.title ? `${id}-title` : null,
    describedBy: spec.description ? `${id}-description` : null,
    focusTarget: spec.focusTarget ?? "auto",
    escToDismiss: spec.escToDismiss ?? true,
    backdrop: spec.backdrop ?? DEFAULT_BACKDROP[kind],
    dismissOnBackdrop: spec.dismissOnBackdrop ?? false
  };
}
function deriveState(stack) {
  return {
    stack,
    top: stack.length > 0 ? stack[stack.length - 1] : null,
    count: stack.length,
    focusLocked: stack.some((d) => d.a11y.ariaModal && d.status === "open")
  };
}
function createDialogCore(config = {}) {
  const defaultKind = config.defaultKind ?? "modal";
  const resolvers = /* @__PURE__ */ new Map();
  let stack = [];
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function pushInstance(instance) {
    stack = [...stack, instance];
    notify();
  }
  function removeInstance(id) {
    stack = stack.filter((d) => d.id !== id);
    notify();
  }
  function resolve(id, result) {
    const resolver = resolvers.get(id);
    if (!resolver) return;
    resolvers.delete(id);
    resolver(result);
  }
  const actions = {
    open: (spec) => {
      const id = nextId();
      const kind = spec.kind ?? defaultKind;
      const instance = {
        id,
        kind,
        spec,
        status: "open",
        openedAt: stack.length + 1,
        a11y: deriveA11y(id, kind, spec)
      };
      const promise = new Promise((resolvePromise) => {
        resolvers.set(id, resolvePromise);
      });
      pushInstance(instance);
      return promise;
    },
    close: (id, value) => {
      if (!stack.some((d) => d.id === id)) return;
      removeInstance(id);
      resolve(id, { status: "ok", value });
    },
    closeTop: (value) => {
      const top = stack[stack.length - 1];
      if (!top) return;
      removeInstance(top.id);
      resolve(top.id, { status: "ok", value });
    },
    dismiss: (id) => {
      if (!stack.some((d) => d.id === id)) return;
      removeInstance(id);
      resolve(id, { status: "dismissed" });
    },
    closeWithButton: (id, buttonId) => {
      const instance = stack.find((d) => d.id === id);
      const button = instance?.spec.buttons?.find((b2) => b2.id === buttonId);
      if (!instance || !button || button.disabled) return;
      removeInstance(id);
      resolve(id, { status: "ok", value: buttonId });
    },
    replaceTop: (spec) => {
      const top = stack[stack.length - 1];
      const id = top?.id ?? nextId();
      const kind = spec.kind ?? top?.kind ?? defaultKind;
      const instance = {
        id,
        kind,
        spec,
        status: "open",
        openedAt: top?.openedAt ?? stack.length + 1,
        a11y: deriveA11y(id, kind, spec)
      };
      stack = top ? [...stack.slice(0, -1), instance] : [instance];
      notify();
      return id;
    },
    setClosing: (id) => {
      stack = stack.map((d) => d.id === id ? { ...d, status: "closing" } : d);
      notify();
    },
    finishClosing: (id) => {
      removeInstance(id);
    },
    clear: () => {
      const ids = stack.map((d) => d.id);
      stack = [];
      for (const id of ids) resolve(id, { status: "dismissed" });
      notify();
    }
  };
  const core = {
    get state() {
      return deriveState(stack);
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/dialog.ts
var modal = {
  kind: "modal",
  title: "Publish note?",
  description: "Sync this note to peers via Iroh.",
  size: "sm",
  buttons: [
    { id: "cancel", label: "Cancel", variant: "ghost" },
    { id: "publish", label: "Publish", variant: "primary", autoFocus: true }
  ]
};
var confirm = {
  kind: "confirm",
  title: "Delete workspace?",
  description: "This removes the local workspace. Recoverable via VCS.",
  buttons: [
    { id: "keep", label: "Keep", variant: "ghost" },
    { id: "delete", label: "Delete", variant: "danger" }
  ]
};
var alert = {
  kind: "alert",
  title: "Sync complete",
  description: "3 peers updated."
};
var dialogEntry = {
  type: "dialog",
  name: "Dialog",
  description: "Headless dialog stack \u2014 modal/confirm/alert kinds, exit-animation (closing) state, per-button resolve, dismiss rules. The view renders each instance on the stack.",
  defaultConfig: {},
  create: () => createDialogCore({}),
  actions: [
    { label: "Open modal", run: (c) => c.actions.open(modal) },
    { label: "Open confirm", run: (c) => c.actions.open(confirm) },
    { label: "Open alert", run: (c) => c.actions.open(alert) },
    { label: "Close top", enabled: (c) => c.state.count > 0, run: (c) => c.actions.closeTop() },
    { label: "Dismiss top", enabled: (c) => c.state.count > 0, run: (c) => c.actions.dismiss(c.state.stack[c.state.stack.length - 1].id) },
    { label: "Clear", enabled: (c) => c.state.count > 0, run: (c) => c.actions.clear() }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const list = el("div", { class: "dialog-stack" });
        const status = el("div", { class: "status-line" });
        const render = () => {
          const s = core.state;
          list.replaceChildren();
          if (!s.count) list.append(el("p", { class: "dim" }, "stack empty"));
          for (const inst of s.stack) {
            const row = el("div", { class: "dialog-row" });
            row.append(
              el(
                "div",
                { class: "dialog-banner" + (inst.status === "closing" ? " closing" : "") },
                el("code", { class: "chip" }, inst.kind),
                el("code", { class: "chip" }, inst.status),
                el("strong", {}, inst.spec.title ?? "untitled"),
                el("div", { class: "row" })
              )
            );
            for (const btn of inst.spec.buttons ?? []) {
              row.append(
                el(
                  "button",
                  {
                    class: "mini",
                    onclick: () => core.actions.closeWithButton(inst.id, btn.id)
                  },
                  `${btn.label} \u2192 close(${btn.id})`
                )
              );
            }
            row.append(
              el("button", { class: "mini", onclick: () => core.actions.close(inst.id) }, "close()"),
              el("button", { class: "mini", onclick: () => core.actions.dismiss(inst.id) }, "dismiss()")
            );
            list.append(row);
          }
          status.textContent = `stack: ${s.count} \xB7 focusLocked: ${s.focusLocked}`;
        };
        const unsub = core.subscribe(render);
        render();
        host.append(list, status);
        return unsub;
      }
    }
  ]
};

// src/timeline/core/index.ts
function clamp(value, min2, max2) {
  return Math.min(Math.max(value, min2), max2);
}
function lowerBound(state) {
  return state.range?.start ?? 0;
}
function upperBound(state) {
  return state.range?.end ?? state.duration;
}
function createTimelineCore(config = {}) {
  const base = {
    duration: config.duration ?? 0,
    position: 0,
    rate: config.rate ?? 0,
    loop: config.loop ?? true,
    range: config.range ?? null,
    marks: config.marks ?? [],
    selectedMarkId: null,
    step: config.step ?? 1 / 60
  };
  const startPosition = clamp(
    config.position ?? 0,
    lowerBound(base),
    Math.max(upperBound(base), lowerBound(base))
  );
  let state = deriveState2({ ...base, position: startPosition });
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function deriveState2(partial) {
    const lo = lowerBound(partial);
    const hi = Math.max(upperBound(partial), lo);
    const position = clamp(partial.position, lo, hi);
    const selectedMark = partial.marks.find((m2) => m2.id === partial.selectedMarkId) ?? null;
    return {
      ...partial,
      position,
      playing: partial.rate !== 0,
      progress: partial.duration > 0 ? position / partial.duration : 0,
      atStart: position <= lo,
      atEnd: position >= hi,
      selectedMark
    };
  }
  const actions = {
    play: () => {
      state = deriveState2({ ...state, rate: state.rate === 0 ? 1 : state.rate });
      notify();
    },
    pause: () => {
      if (state.rate === 0) return;
      state = deriveState2({ ...state, rate: 0 });
      notify();
    },
    togglePlay: () => {
      state = deriveState2({ ...state, rate: state.rate === 0 ? 1 : 0 });
      notify();
    },
    setRate: (rate) => {
      if (rate === state.rate) return;
      state = deriveState2({ ...state, rate });
      notify();
    },
    seek: (position) => {
      state = deriveState2({ ...state, position });
      notify();
    },
    step: (deltaSeconds) => {
      if (state.rate === 0) return;
      const lo = lowerBound(state);
      const hi = upperBound(state);
      const raw = state.position + deltaSeconds * state.rate;
      let next = raw;
      let rate = state.rate;
      if (next > hi) {
        if (state.loop && hi > lo) {
          next = lo + (next - hi) % Math.max(hi - lo, 1);
        } else {
          next = hi;
          rate = 0;
        }
      } else if (next < lo) {
        if (state.loop && hi > lo) {
          next = hi - (lo - next) % Math.max(hi - lo, 1);
        } else {
          next = lo;
          rate = 0;
        }
      }
      state = deriveState2({ ...state, position: next, rate });
      notify();
    },
    setDuration: (duration) => {
      const safe = Math.max(0, duration);
      if (safe === state.duration) return;
      state = deriveState2({ ...state, duration: safe });
      notify();
    },
    setLoop: (loop) => {
      if (loop === state.loop) return;
      state = deriveState2({ ...state, loop });
      notify();
    },
    setRange: (start, end) => {
      if (end <= start) {
        actions.clearRange();
        return;
      }
      state = deriveState2({ ...state, range: { start, end } });
      notify();
    },
    clearRange: () => {
      if (!state.range) return;
      state = deriveState2({ ...state, range: null });
      notify();
    },
    setMarks: (marks3) => {
      state = deriveState2({ ...state, marks: marks3 });
      notify();
    },
    selectMark: (id) => {
      state = deriveState2({ ...state, selectedMarkId: id });
      notify();
    },
    setStep: (step2) => {
      state = deriveState2({ ...state, step: step2 });
      notify();
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/timeline.ts
var marks2 = [
  { id: "a", time: 1.5, label: "beat 1", color: "#4ade80" },
  { id: "b", time: 3, label: "drop", color: "#fbbf24" },
  { id: "c", time: 4.5, label: "beat 2", color: "#4ade80" },
  { id: "d", time: 6.75, label: "end card", color: "#6ea8ff" }
];
var timelineEntry = {
  type: "timeline",
  name: "Timeline",
  description: "Headless timeline \u2014 play/pause/seek/step, rate, duration, loop, range scrub, and labeled marks. No clock in the core: adapters drive it with rAF.",
  defaultConfig: { duration: 8, rate: 0, marks: marks2 },
  create: (config) => createTimelineCore({ duration: config.duration, rate: config.rate, marks: config.marks }),
  actions: [
    { label: "Play", enabled: (c) => c.state.rate === 0, run: (c) => c.actions.play() },
    { label: "Pause", enabled: (c) => c.state.rate !== 0, run: (c) => c.actions.pause() },
    { label: "Toggle", run: (c) => c.actions.togglePlay() },
    { label: "Step +0.25", run: (c) => c.actions.step(0.25) },
    { label: "Seek 3", run: (c) => c.actions.seek(3) },
    { label: "Rate 2\xD7", run: (c) => c.actions.setRate(2) },
    { label: "Rate 0.5\xD7", run: (c) => c.actions.setRate(0.5) },
    { label: "Loop toggle", run: (c) => c.actions.setLoop(!c.state.loop) },
    { label: "Range 2\u20136", run: (c) => c.actions.setRange(2, 6) },
    { label: "Clear range", run: (c) => c.actions.clearRange() },
    { label: "Duration 12", run: (c) => c.actions.setDuration(12) }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const bar = el("div", { class: "timeline-bar" });
        const fill = el("div", { class: "timeline-fill" });
        const playhead = el("div", { class: "timeline-playhead" });
        const marksHost = el("div", { class: "timeline-marks" });
        const status = el("div", { class: "status-line" });
        const render = () => {
          const s = core.state;
          const pct = s.duration ? Math.min(100, s.position / s.duration * 100) : 0;
          fill.style.width = `${pct}%`;
          playhead.style.left = `${pct}%`;
          marksHost.replaceChildren();
          for (const m2 of s.marks) {
            const dot = el("div", { class: "timeline-mark", style: `left:${m2.time / s.duration * 100}%` });
            if (m2.color) dot.style.background = m2.color;
            dot.title = m2.label ?? m2.id;
            marksHost.append(dot);
          }
          const rangePct = s.range ? `${s.range.start / s.duration * 100}%` : null;
          bar.style.boxShadow = s.range && rangePct ? `inset ${rangePct} 0 0 0 var(--amber)` : "";
          status.textContent = `pos: ${s.position.toFixed(2)}s / ${s.duration}s \xB7 ${s.playing ? "\u25B6" : "\u23F8"} \xB7 rate ${s.rate}\xD7 \xB7 loop ${s.loop} \xB7 ` + (s.range ? `range ${s.range.start}\u2013${s.range.end}` : "no range");
        };
        const unsub = core.subscribe(render);
        render();
        host.append(el("div", { class: "timeline" }, bar, marksHost, playhead), status);
        return unsub;
      }
    }
  ]
};

// src/combobox/core/index.ts
function defaultFilter2(query, items2) {
  const scored = [];
  for (const item of items2) {
    const score = fuzzyScore(query, item.label);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b2) => b2.score - a.score);
  return scored.map(({ item }) => item);
}
function createComboboxCore(config) {
  const {
    items: items2 = [],
    onSelect,
    closeOnSelect = true,
    wrap: wrap2 = true,
    filter = defaultFilter2,
    value = null,
    resetQueryOnClose = true
  } = config;
  const baseState = {
    open: false,
    query: "",
    items: items2,
    loading: false,
    selectedId: value
  };
  let state = deriveState2({ ...baseState, results: items2, activeIndex: 0 });
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function deriveState2(partial) {
    const results = filter(partial.query, partial.items);
    let activeIndex = partial.activeIndex;
    if (results.length === 0) {
      activeIndex = -1;
    } else if (activeIndex < 0) {
      activeIndex = 0;
    } else if (activeIndex >= results.length) {
      activeIndex = wrap2 ? 0 : results.length - 1;
    }
    const selectedItem = partial.items.find((i) => i.id === partial.selectedId) ?? null;
    const highlight = results.map((item) => fuzzyRanges(partial.query, item.label));
    return {
      ...partial,
      results,
      activeIndex,
      selectedItem,
      empty: partial.open && !partial.loading && results.length === 0,
      highlight
    };
  }
  const actions = {
    open: () => {
      state = deriveState2({ ...state, open: true });
      notify();
    },
    close: () => {
      state = deriveState2({
        ...state,
        open: false,
        query: resetQueryOnClose ? "" : state.query,
        activeIndex: -1
      });
      notify();
    },
    toggle: () => {
      state = deriveState2({
        ...state,
        open: !state.open,
        query: !state.open ? "" : state.query,
        activeIndex: !state.open ? -1 : state.activeIndex
      });
      notify();
    },
    setQuery: (query) => {
      state = deriveState2({ ...state, query, activeIndex: 0 });
      notify();
    },
    move: (delta) => {
      if (state.results.length === 0) return;
      const next = state.activeIndex + delta;
      let activeIndex;
      if (wrap2) {
        activeIndex = (next % state.results.length + state.results.length) % state.results.length;
      } else {
        activeIndex = Math.min(Math.max(next, 0), state.results.length - 1);
      }
      state = deriveState2({ ...state, activeIndex });
      notify();
    },
    setActiveIndex: (index) => {
      state = deriveState2({ ...state, activeIndex: index });
      notify();
    },
    select: (id) => {
      const item = id !== void 0 ? state.items.find((i) => i.id === id) : state.results[state.activeIndex];
      if (!item || item.disabled) return null;
      if (onSelect) onSelect(item);
      state = deriveState2({
        ...state,
        selectedId: item.id,
        open: closeOnSelect ? false : state.open,
        query: closeOnSelect && resetQueryOnClose ? "" : state.query,
        activeIndex: -1
      });
      notify();
      return item;
    },
    clear: () => {
      state = deriveState2({ ...state, selectedId: null, query: "" });
      notify();
    },
    setLoading: (loading) => {
      state = deriveState2({ ...state, loading });
      notify();
    },
    setItems: (nextItems) => {
      state = deriveState2({
        ...state,
        items: nextItems,
        activeIndex: 0,
        loading: false
      });
      notify();
    },
    setValue: (id) => {
      state = deriveState2({ ...state, selectedId: id });
      notify();
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/combobox.ts
var FLAVORS = [
  { id: "vanilla", label: "Vanilla" },
  { id: "strawberry", label: "Strawberry" },
  { id: "chocolate", label: "Chocolate" },
  { id: "matcha", label: "Matcha" },
  { id: "pistachio", label: "Pistachio" },
  { id: "salted-caramel", label: "Salted caramel" },
  { id: "mint", label: "Mint chip" },
  { id: "coffee", label: "Coffee" }
];
var comboboxEntry = {
  type: "combobox",
  name: "Combobox",
  description: "Headless autocomplete \u2014 text input + list contract: query filters items, arrow keys move the active index, enter/click select. Try typing \u201Cm\u201D or \u201Cc\u201D below.",
  defaultConfig: { items: FLAVORS },
  create: (config) => createComboboxCore({ items: config.items ?? FLAVORS }),
  actions: [
    { label: "Open", enabled: (c) => !c.state.open, run: (c) => c.actions.open() },
    { label: "Close", enabled: (c) => c.state.open, run: (c) => c.actions.close() },
    { label: "Set query \u201Cm\u201D", run: (c) => c.actions.setQuery("m") },
    { label: "Move \u2193", enabled: (c) => c.state.results.length > 0, run: (c) => c.actions.move(1) },
    { label: "Select active", enabled: (c) => c.state.results.length > 0, run: (c) => c.actions.select(c.state.results[c.state.activeIndex]?.id ?? "") },
    { label: "Clear value", enabled: (c) => c.state.selectedId !== null, run: (c) => c.actions.clear() },
    { label: "Loading (2s)", run: (c) => {
      c.actions.setLoading(true);
      setTimeout(() => c.actions.setLoading(false), 2e3);
    } }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const input = el("input", {
          type: "text",
          placeholder: "flavor\u2026",
          value: "",
          onfocus: () => core.actions.open(),
          oninput: (e) => core.actions.setQuery(e.target.value),
          onkeydown: (e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              core.actions.move(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              core.actions.move(-1);
            } else if (e.key === "Enter") {
              e.preventDefault();
              const s = core.state;
              if (s.results[s.activeIndex]) core.actions.select(s.results[s.activeIndex].id);
            } else if (e.key === "Escape") core.actions.close();
          }
        });
        const list = el("div", { class: "combo-list" });
        const selected = el("div", { class: "status-line" });
        const render = () => {
          const s = core.state;
          if (!s.selectedId) input.value = "";
          list.replaceChildren();
          if (!s.open) list.append(el("p", { class: "dim" }, "closed \u2014 focus the input"));
          else if (s.loading) list.append(el("p", { class: "dim" }, "loading\u2026"));
          else if (!s.results.length) list.append(el("p", { class: "dim" }, "no matches"));
          else
            for (const item of s.results) {
              const i = s.results.indexOf(item);
              list.append(
                el(
                  "div",
                  {
                    class: "palette-item" + (i === s.activeIndex ? " active" : ""),
                    onmousedown: (e) => {
                      e.preventDefault();
                      core.actions.select(item.id);
                    }
                  },
                  item.label
                )
              );
            }
          selected.textContent = s.selectedId ? `selected: ${FLAVORS.find((f) => f.id === s.selectedId)?.label ?? s.selectedId}` : "no selection \u2014 click an item";
        };
        const unsub = core.subscribe(render);
        render();
        host.append(input, list, selected);
        return unsub;
      }
    }
  ]
};

// src/kanban/core/index.ts
var NONE = { kind: "none", value: null };
function columnIdOf(gv) {
  switch (gv.kind) {
    case "option":
      return `o:${encodeURIComponent(gv.value)}`;
    case "boolean":
      return `b:${gv.value ? "true" : "false"}`;
    case "date":
      return `d:${gv.bucket}:${gv.start}`;
    case "relation":
      return `r:${encodeURIComponent(gv.targetId)}`;
    case "none":
      return "none";
  }
}
function groupValueOfColumnId(id) {
  if (id === "none") return NONE;
  if (id.startsWith("o:")) return { kind: "option", value: decodeURIComponent(id.slice(2)) };
  if (id === "b:true") return { kind: "boolean", value: true };
  if (id === "b:false") return { kind: "boolean", value: false };
  if (id.startsWith("d:")) {
    const [bucket, ...rest] = id.slice(2).split(":");
    if ((bucket === "day" || bucket === "week" || bucket === "month") && rest.length === 1) {
      return { kind: "date", bucket, start: rest[0] };
    }
    return null;
  }
  if (id.startsWith("r:")) return { kind: "relation", targetId: decodeURIComponent(id.slice(2)) };
  return null;
}
function isoDate(y, m2, d) {
  return `${y}-${String(m2 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function dateStartOf(raw, bucket) {
  if (raw == null || raw === "") return null;
  const d = raw instanceof Date ? raw : new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m2 = d.getUTCMonth();
  const day = d.getUTCDate();
  if (bucket === "day") return { kind: "date", bucket, start: isoDate(y, m2, day) };
  if (bucket === "month") return { kind: "date", bucket, start: isoDate(y, m2, 1) };
  const dow = (d.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(y, m2, day - dow));
  return {
    kind: "date",
    bucket,
    start: isoDate(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())
  };
}
function createKanbanCore(config) {
  const maxColumns = config.maxColumns ?? 50;
  const rankField = config.rankField ?? null;
  const fieldOptions = {};
  for (const f of config.groupFields) {
    if (f.options) fieldOptions[f.id] = f.options.map((o) => ({ ...o }));
  }
  const optionsOf = (fieldId) => fieldOptions[fieldId] ??= [];
  function fieldOf(fieldId) {
    return config.groupFields.find((f) => f.id === fieldId) ?? {
      id: fieldId,
      label: fieldId,
      affordance: "text",
      accessorKey: fieldId
    };
  }
  const isOptionBacked = (f) => f.affordance === "select" || f.affordance === "status";
  function fieldValue(row, field) {
    if (field.accessorFn) return field.accessorFn(row);
    if (field.accessorKey !== void 0) {
      return row[field.accessorKey];
    }
    return row[field.id];
  }
  function colValueOf(row, columnId) {
    const col = config.columns.find((c) => c.id === columnId);
    if (!col) return void 0;
    if (col.accessorKey !== void 0) return row[col.accessorKey];
    return col.accessorFn ? col.accessorFn(row) : void 0;
  }
  function groupValuesOf(row, field) {
    const raw = fieldValue(row, field);
    switch (field.affordance) {
      case "select":
      case "status":
        return raw == null || raw === "" ? [NONE] : [{ kind: "option", value: String(raw) }];
      case "multi_select": {
        if (raw == null) return [NONE];
        const arr = Array.isArray(raw) ? raw : [];
        return arr.length === 0 ? [NONE] : arr.map((v2) => ({ kind: "option", value: String(v2) }));
      }
      case "boolean":
        return raw == null ? [NONE] : [{ kind: "boolean", value: Boolean(raw) }];
      case "date": {
        const d = dateStartOf(raw, board.groupDateBy ?? "day");
        return d ? [d] : [NONE];
      }
      case "people":
      case "relation":
        return raw == null ? [NONE] : [{ kind: "relation", targetId: String(raw) }];
      case "text":
      case "number":
        return raw == null || raw === "" ? [NONE] : [{ kind: "option", value: String(raw) }];
    }
  }
  function titleOf(gv, field) {
    switch (gv.kind) {
      case "option": {
        const opt = optionsOf(field.id).find((o) => o.value === gv.value);
        return opt?.label ?? gv.value;
      }
      case "boolean":
        return gv.value ? "True" : "False";
      case "date":
        return gv.bucket === "week" ? `Week of ${gv.start}` : gv.start;
      case "relation": {
        const t = (field.relationTargets ?? []).find((x2) => x2.id === gv.targetId);
        return t?.title ?? gv.targetId;
      }
      case "none":
        return `No ${field.label}`;
    }
  }
  const seedBoard = {
    id: "board-1",
    name: "Board",
    groupFieldId: config.board?.groupFieldId ?? config.groupFieldId ?? config.groupFields[0]?.id ?? "",
    columnOrder: [],
    columnColors: {},
    hiddenColumns: [],
    collapsedColumns: [],
    sortColumnsBy: "manual",
    cardSort: null,
    ...config.board
  };
  let board = { ...seedBoard };
  const boards = { [seedBoard.id]: { ...seedBoard } };
  for (const preset of config.boards ?? []) {
    if (!boards[preset.id]) boards[preset.id] = { ...preset };
  }
  let rows = [...config.data];
  let globalFilter = "";
  let dragState = null;
  const getRowId = (row, index) => {
    if (config.getRowId) return config.getRowId(row, index);
    return String(row.id ?? index);
  };
  const tsState = {};
  const tsColumns = config.columns.map(
    (col) => ({
      id: col.id,
      header: col.header ?? col.id,
      ...col.accessorKey !== void 0 ? { accessorKey: col.accessorKey } : {},
      ...col.accessorFn !== void 0 ? { accessorFn: col.accessorFn } : {}
    })
  );
  const table = createTable({
    data: rows,
    columns: tsColumns,
    state: tsState,
    onStateChange: (updater) => {
      Object.assign(
        tsState,
        typeof updater === "function" ? updater(tsState) : updater
      );
    },
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });
  Object.assign(tsState, table.initialState, {
    sorting: [],
    globalFilter: ""
  });
  const undoHistory = config.undoHistory ?? null;
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function computeUniverse(fieldId, sourceRows) {
    const field = fieldOf(fieldId);
    const values = [];
    const seen = /* @__PURE__ */ new Set();
    const push = (gv) => {
      const id = columnIdOf(gv);
      if (!seen.has(id)) {
        seen.add(id);
        values.push(gv);
      }
    };
    switch (field.affordance) {
      case "select":
      case "status":
        for (const opt of optionsOf(fieldId)) push({ kind: "option", value: opt.value });
        break;
      case "boolean":
        push({ kind: "boolean", value: true });
        push({ kind: "boolean", value: false });
        break;
      case "date": {
        const found2 = /* @__PURE__ */ new Map();
        for (const row of sourceRows) {
          for (const gv of groupValuesOf(row, field)) {
            if (gv.kind === "date") found2.set(columnIdOf(gv), gv);
          }
        }
        [...found2.values()].sort((a, b2) => a.start < b2.start ? -1 : a.start > b2.start ? 1 : 0).forEach(push);
        break;
      }
      case "people":
      case "relation":
        for (const t of field.relationTargets ?? []) push({ kind: "relation", targetId: t.id });
        for (const row of sourceRows) {
          for (const gv of groupValuesOf(row, field)) push(gv);
        }
        break;
      case "multi_select":
      case "text":
      case "number":
        for (const row of sourceRows) {
          for (const gv of groupValuesOf(row, field)) push(gv);
        }
        break;
    }
    if (!board.hideNoValueColumn) push(NONE);
    return values;
  }
  function membershipsOf(row) {
    return [...new Set(groupValuesOf(row, fieldOf(board.groupFieldId)).map(columnIdOf))];
  }
  function groupWriteValue(row, field, gv) {
    if (field.writeAccessorFn) return field.writeAccessorFn(row, gv);
    if (gv.kind === "none") return null;
    if (gv.kind === "option") return gv.value;
    if (gv.kind === "boolean") return gv.value;
    if (gv.kind === "relation") return gv.targetId;
    return gv.start;
  }
  function rankOf(row) {
    if (!rankField) return null;
    const raw = row[rankField];
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  function cardTitle(row) {
    const first = config.columns[0];
    if (first) {
      const v2 = colValueOf(row, first.id);
      if (v2 != null && v2 !== "") return String(v2);
    }
    return String(row.id ?? "card");
  }
  function cellsOf(row) {
    return Object.fromEntries(config.columns.map((c) => [c.id, colValueOf(row, c.id)]));
  }
  function visibleRows() {
    return table.getSortedRowModel().rows.map((r) => r.original);
  }
  function deriveState2() {
    table.setOptions((prev) => ({ ...prev, data: rows }));
    table.setGlobalFilter(globalFilter);
    table.setSorting(
      board.cardSort ? [{ id: board.cardSort.id, desc: board.cardSort.desc }] : []
    );
    const visRows = visibleRows();
    const idOf = new Map(rows.map((r, i) => [r, getRowId(r, i)]));
    const field = fieldOf(board.groupFieldId);
    const universe = computeUniverse(board.groupFieldId, visRows);
    const buckets = /* @__PURE__ */ new Map();
    for (const row of visRows) {
      const rid = String(idOf.get(row) ?? "");
      for (const cid of membershipsOf(row)) {
        const cards = buckets.get(cid) ?? [];
        cards.push({ id: rid, columnId: cid, cells: cellsOf(row), rank: rankOf(row) });
        buckets.set(cid, cards);
      }
    }
    if (!board.cardSort && rankField) {
      for (const cards of buckets.values()) {
        cards.sort((a, b2) => (a.rank ?? Number.POSITIVE_INFINITY) - (b2.rank ?? Number.POSITIVE_INFINITY));
      }
    }
    const rawCols = universe.map((gv) => {
      const id = columnIdOf(gv);
      const cards = buckets.get(id) ?? [];
      return {
        id,
        title: titleOf(gv, field),
        color: board.columnColors[id] ?? null,
        count: cards.length,
        collapsed: board.collapsedColumns.includes(id),
        hidden: board.hiddenColumns.includes(id),
        cards
      };
    });
    let columns;
    if (board.sortColumnsBy === "name") {
      columns = [...rawCols].sort((a, b2) => a.title.localeCompare(b2.title));
    } else if (board.sortColumnsBy === "count") {
      columns = [...rawCols].sort((a, b2) => b2.count - a.count);
    } else {
      columns = [...rawCols].sort((a, b2) => {
        const ia = board.columnOrder.indexOf(a.id);
        const ib = board.columnOrder.indexOf(b2.id);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return 0;
      });
    }
    return {
      board: { ...board },
      boards: Object.fromEntries(
        Object.entries(boards).map(([id, b2]) => [id, { ...b2 }])
      ),
      columns,
      totalCards: visRows.length,
      groupFieldOptions: universe.map((gv) => ({
        value: columnIdOf(gv),
        label: titleOf(gv, field)
      })),
      globalFilter,
      groupableFields: config.groupFields.map((f) => ({
        id: f.id,
        label: f.label,
        affordance: f.affordance
      })),
      dragState,
      canUndo: undoHistory?.state.canUndo ?? false,
      canRedo: undoHistory?.state.canRedo ?? false
    };
  }
  let state = deriveState2();
  function refresh() {
    state = deriveState2();
    notify();
  }
  function indexOfRow(rowId) {
    return rows.findIndex((row, i) => getRowId(row, i) === rowId);
  }
  function writeRowValue(rowId, field, raw, rank) {
    const index = indexOfRow(rowId);
    if (index === -1) return;
    const row = rows[index];
    const key = field.accessorKey ?? field.id;
    let next = { ...row, [key]: raw };
    if (rankField) {
      next = { ...next, [rankField]: rank };
    }
    rows = rows.map((r, i) => i === index ? next : r);
    refresh();
  }
  function computeRaw(row, fromColumnId, toGv) {
    const field = fieldOf(board.groupFieldId);
    if (field.affordance === "multi_select") {
      const current = Array.isArray(fieldValue(row, field)) ? fieldValue(row, field) : [];
      const set = new Set(current.map(String));
      const fromGv = groupValueOfColumnId(fromColumnId);
      if (fromGv?.kind === "option") set.delete(fromGv.value);
      if (toGv.kind === "none") {
        const next = [...set];
        const changed = next.length !== current.length || next.some((v2, i) => String(current[i]) !== v2);
        return { changed, raw: next.length ? next : null };
      }
      if (toGv.kind === "option") {
        set.add(toGv.value);
        const next = [...set];
        const changed = next.length !== current.length || next.some((v2, i) => String(current[i]) !== v2);
        return { changed, raw: next };
      }
      return { changed: false, raw: current };
    }
    const old = fieldValue(row, field);
    switch (toGv.kind) {
      case "none":
        return { changed: old != null && old !== "", raw: groupWriteValue(row, field, toGv) };
      case "option":
        return { changed: String(old ?? "") !== toGv.value, raw: groupWriteValue(row, field, toGv) };
      case "boolean":
        return { changed: Boolean(old) !== toGv.value, raw: groupWriteValue(row, field, toGv) };
      case "relation":
        return { changed: String(old ?? "") !== toGv.targetId, raw: groupWriteValue(row, field, toGv) };
      case "date":
        return { changed: String(old ?? "") !== toGv.start, raw: groupWriteValue(row, field, toGv) };
    }
  }
  const actions = {
    // ---- board level ------------------------------------------------------
    setGroupField: (fieldId) => {
      if (fieldId === board.groupFieldId) return true;
      if (!config.groupFields.some((f) => f.id === fieldId)) return false;
      const nextUniverse = computeUniverse(fieldId, visibleRows());
      if (nextUniverse.length > maxColumns) return false;
      const nextIds = new Set(nextUniverse.map(columnIdOf));
      board = {
        ...board,
        groupFieldId: fieldId,
        columnColors: Object.fromEntries(
          Object.entries(board.columnColors).filter(([id]) => nextIds.has(id))
        ),
        columnOrder: board.columnOrder.filter((id) => nextIds.has(id)),
        hiddenColumns: board.hiddenColumns.filter((id) => nextIds.has(id)),
        collapsedColumns: board.collapsedColumns.filter((id) => nextIds.has(id)),
        cardSort: board.cardSort && nextIds.has(board.cardSort.id) ? board.cardSort : null
      };
      refresh();
      return true;
    },
    createBoard: (descriptor) => {
      if (boards[descriptor.id]) return false;
      boards[descriptor.id] = { ...descriptor };
      refresh();
      return true;
    },
    duplicateBoard: (id) => {
      const source = boards[id];
      if (!source) return false;
      const copyId = `${id}-copy`;
      if (boards[copyId]) return false;
      boards[copyId] = { ...source, id: copyId };
      refresh();
      return copyId;
    },
    activateBoard: (id) => {
      const preset = boards[id];
      if (!preset) return false;
      board = { ...preset };
      refresh();
      return true;
    },
    renameBoard: (id, name) => {
      const preset = boards[id];
      if (!preset) return false;
      boards[id] = { ...preset, name };
      if (board.id === id) board = { ...board, name };
      refresh();
      return true;
    },
    deleteBoard: (id) => {
      if (id === board.id) return false;
      if (!boards[id]) return false;
      delete boards[id];
      refresh();
      return true;
    },
    saveBoard: () => {
      boards[board.id] = { ...board };
      refresh();
      return true;
    },
    // ---- column level (view state — never undo steps) ---------------------
    createColumn: ({ label, color, value }) => {
      const field = fieldOf(board.groupFieldId);
      const v2 = value ?? label;
      if (v2 === "") return false;
      if (!isOptionBacked(field) && field.affordance !== "text" && field.affordance !== "number") {
        return false;
      }
      const id = columnIdOf({ kind: "option", value: v2 });
      if (state.columns.some((c) => c.id === id)) return false;
      if (isOptionBacked(field)) {
        optionsOf(field.id).push({ value: v2, label: v2 === label ? void 0 : label });
        config.onCreateOption?.(field.id, v2, color);
      }
      if (color) board = { ...board, columnColors: { ...board.columnColors, [id]: color } };
      refresh();
      return id;
    },
    renameColumn: (columnId, label) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const gv = groupValueOfColumnId(columnId);
      if (!gv || gv.kind !== "option") return false;
      const field = fieldOf(board.groupFieldId);
      if (!isOptionBacked(field)) return false;
      const from = gv.value;
      if (from === label) return true;
      const newId = columnIdOf({ kind: "option", value: label });
      if (state.columns.some((c) => c.id === newId)) return false;
      const key = field.accessorKey ?? field.id;
      fieldOptions[field.id] = optionsOf(field.id).map(
        (o) => o.value === from ? { value: label, label: o.label === o.value ? void 0 : o.label } : o
      );
      if (field.affordance === "multi_select") {
        rows = rows.map((r) => {
          const raw = fieldValue(r, field);
          if (!Array.isArray(raw)) return r;
          return {
            ...r,
            [key]: raw.map((x2) => String(x2) === from ? label : x2)
          };
        });
      } else {
        rows = rows.map((r) => {
          const raw = fieldValue(r, field);
          if (String(raw ?? "") !== from) return r;
          return { ...r, [key]: label };
        });
      }
      const remap = (arr) => arr.map((id) => id === columnId ? newId : id);
      const colors = {};
      for (const [id, c] of Object.entries(board.columnColors)) {
        colors[id === columnId ? newId : id] = c;
      }
      board = {
        ...board,
        columnColors: colors,
        columnOrder: remap(board.columnOrder),
        hiddenColumns: remap(board.hiddenColumns),
        collapsedColumns: remap(board.collapsedColumns)
      };
      config.onRenameOption?.(field.id, from, label);
      refresh();
      return true;
    },
    deleteColumn: (columnId, opts) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const gv = groupValueOfColumnId(columnId);
      if (!gv) return false;
      if (gv.kind === "none") return false;
      const destId = opts?.moveCardsTo ?? "none";
      const destGv = groupValueOfColumnId(destId);
      const field = fieldOf(board.groupFieldId);
      const key = field.accessorKey ?? field.id;
      const nextRows = [];
      for (const r of rows) {
        const memberships = membershipsOf(r);
        if (!memberships.includes(columnId)) {
          nextRows.push(r);
          continue;
        }
        if (field.affordance === "multi_select") {
          const arr = Array.isArray(fieldValue(r, field)) ? [...fieldValue(r, field)] : [];
          const next = arr.filter((x2) => String(x2) !== (gv.kind === "option" ? gv.value : ""));
          nextRows.push({ ...r, [key]: next.length ? next : null });
          continue;
        }
        if (destGv) {
          const cardId2 = getRowId(r, nextRows.length);
          const hookOk = config.onCardMove === void 0 || config.onCardMove(cardId2, field.id, destGv) !== false;
          if (hookOk) {
            nextRows.push({ ...r, [key]: groupWriteValue(r, field, destGv) });
            continue;
          }
        }
        const cardId = getRowId(r, nextRows.length);
        if (config.onCardDelete && config.onCardDelete(cardId) === false) {
          nextRows.push(r);
          continue;
        }
      }
      rows = nextRows;
      if (isOptionBacked(field) && gv.kind === "option") {
        fieldOptions[field.id] = optionsOf(field.id).filter((o) => o.value !== gv.value);
      }
      board = {
        ...board,
        columnOrder: board.columnOrder.filter((id) => id !== columnId),
        columnColors: Object.fromEntries(
          Object.entries(board.columnColors).filter(([id]) => id !== columnId)
        ),
        hiddenColumns: board.hiddenColumns.filter((id) => id !== columnId),
        collapsedColumns: board.collapsedColumns.filter((id) => id !== columnId)
      };
      refresh();
      return true;
    },
    moveColumn: (columnId, index) => {
      const current = state.columns.map((c) => c.id);
      if (!current.includes(columnId)) return false;
      const next = [...current];
      const from = next.indexOf(columnId);
      next.splice(from, 1);
      const clamped = Math.max(0, Math.min(index, next.length));
      next.splice(clamped, 0, columnId);
      if (next.join("\0") === current.join("\0")) return true;
      board = { ...board, columnOrder: next, sortColumnsBy: "manual" };
      refresh();
      return true;
    },
    sortColumns: (mode) => {
      if (mode === board.sortColumnsBy) return;
      board = { ...board, sortColumnsBy: mode };
      refresh();
    },
    setColumnColor: (columnId, color) => {
      if (!state.columns.some((c) => c.id === columnId)) return false;
      if ((board.columnColors[columnId] ?? null) === color) return true;
      const columnColors = { ...board.columnColors };
      if (color === null) delete columnColors[columnId];
      else columnColors[columnId] = color;
      board = { ...board, columnColors };
      refresh();
      return true;
    },
    setColumnCollapsed: (columnId, collapsed) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      if (col.collapsed === collapsed) return true;
      const collapsedColumns = board.collapsedColumns.filter((id) => id !== columnId);
      if (collapsed) collapsedColumns.push(columnId);
      board = { ...board, collapsedColumns };
      refresh();
      return true;
    },
    setColumnHidden: (columnId, hidden) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      if (col.hidden === hidden) return true;
      const hiddenColumns = board.hiddenColumns.filter((id) => id !== columnId);
      if (hidden) hiddenColumns.push(columnId);
      board = { ...board, hiddenColumns };
      refresh();
      return true;
    },
    // ---- card level (data mutations — one undo step each) ----------------
    addCard: (columnId, draft) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const gv = groupValueOfColumnId(columnId);
      if (!gv) return false;
      if (config.onCardAdd && config.onCardAdd(draft, gv) === false) return false;
      const field = fieldOf(board.groupFieldId);
      const key = field.accessorKey ?? field.id;
      const raw = groupWriteValue(draft, field, gv);
      const row = { ...draft, [key]: raw };
      const id = getRowId(row, rows.length);
      rows = [...rows, row];
      refresh();
      if (undoHistory) {
        const command = {
          label: `Add ${cardTitle(row)}`,
          execute: () => {
            if (indexOfRow(id) !== -1) return;
            rows = [...rows, row];
            refresh();
          },
          invert: () => ({
            label: `Remove ${cardTitle(row)}`,
            execute: () => {
              const i = indexOfRow(id);
              if (i === -1) return;
              rows = rows.filter((_, x2) => x2 !== i);
              refresh();
            },
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return id;
    },
    moveCard: (cardId, fromColumnId, toColumnId, opts) => {
      const index = indexOfRow(cardId);
      if (index === -1) return false;
      const row = rows[index];
      if (!membershipsOf(row).includes(fromColumnId)) return false;
      const toGv = groupValueOfColumnId(toColumnId);
      if (!toGv) return false;
      if (toGv.kind !== "none" && !state.columns.some((c) => c.id === toColumnId)) {
        return false;
      }
      const field = fieldOf(board.groupFieldId);
      const key = field.accessorKey ?? field.id;
      const { changed: valueChanged, raw: toRaw } = computeRaw(row, fromColumnId, toGv);
      const prevRaw = row[key];
      const prevRank = rankOf(row);
      const newRank = rankField && opts?.index !== void 0 ? opts.index : prevRank;
      if (!valueChanged && newRank === prevRank) return true;
      if (valueChanged && config.onCardMove && config.onCardMove(cardId, field.id, toGv) === false) {
        return false;
      }
      writeRowValue(cardId, field, toRaw, newRank);
      if (undoHistory) {
        const command = {
          label: `Move ${cardTitle(row)}`,
          execute: () => writeRowValue(cardId, field, toRaw, newRank),
          invert: () => ({
            label: "Move back",
            execute: () => writeRowValue(cardId, field, prevRaw, prevRank),
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return true;
    },
    reorderCard: (cardId, columnId, index) => {
      if (!rankField) return false;
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const rowIndex = indexOfRow(cardId);
      if (rowIndex === -1) return false;
      if (!membershipsOf(rows[rowIndex]).includes(columnId)) return false;
      const order = col.cards.map((c) => c.id);
      const from = order.indexOf(cardId);
      if (from === -1) return false;
      const next = [...order];
      next.splice(from, 1);
      next.splice(Math.max(0, Math.min(index, next.length)), 0, cardId);
      const prevRanks = new Map(col.cards.map((c) => [c.id, c.rank]));
      if (next.join("\0") === order.join("\0")) return true;
      const applyRanks = (map) => {
        rows = rows.map((r, i) => {
          const rid = getRowId(r, i);
          const rank = map.get(rid);
          if (rank === void 0) return r;
          return { ...r, [rankField]: rank };
        });
        refresh();
      };
      applyRanks(new Map(next.map((id, i) => [id, i])));
      if (undoHistory) {
        const command = {
          label: "Reorder card",
          execute: () => applyRanks(new Map(next.map((id, i) => [id, i]))),
          invert: () => ({
            label: "Reorder card",
            execute: () => applyRanks(prevRanks),
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return true;
    },
    removeCard: (cardId) => {
      const index = indexOfRow(cardId);
      if (index === -1) return false;
      const row = rows[index];
      if (config.onCardDelete && config.onCardDelete(cardId) === false) return false;
      rows = rows.filter((_, i) => i !== index);
      refresh();
      if (undoHistory) {
        const command = {
          label: `Remove ${cardTitle(row)}`,
          execute: () => {
            const i = indexOfRow(cardId);
            if (i === -1) return;
            rows = rows.filter((_, x2) => x2 !== i);
            refresh();
          },
          invert: () => ({
            label: `Add ${cardTitle(row)}`,
            execute: () => {
              if (indexOfRow(cardId) !== -1) return;
              rows = [...rows.slice(0, index), row, ...rows.slice(index)];
              refresh();
            },
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return true;
    },
    // ---- row level (delegated to the wrapped engine) ---------------------
    // Raw row-set surface (snapshot sync / import): no undo step, no
    // write hook — the row set is snapshot-owned. User edits go through
    // the card actions (addCard/moveCard/removeCard), which push undo.
    addRow: (row) => {
      const id = getRowId(row, rows.length);
      rows = [...rows, row];
      refresh();
      return id;
    },
    removeRow: (rowId) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      rows = rows.filter((_, i) => i !== index);
      refresh();
      return true;
    },
    updateRow: (rowId, patch) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      rows = rows.map(
        (r, i) => i === index ? { ...r, ...patch } : r
      );
      refresh();
      return true;
    },
    setGlobalFilter: (text2) => {
      if (text2 === globalFilter) return;
      globalFilter = text2;
      refresh();
    },
    clearGlobalFilter: () => {
      if (globalFilter === "") return;
      globalFilter = "";
      refresh();
    },
    setCardSort: (spec) => {
      const prev = board.cardSort;
      const same = prev === null && spec === null ? true : prev !== null && spec !== null && prev.id === spec.id && prev.desc === spec.desc;
      if (same) return;
      board = { ...board, cardSort: spec ? { ...spec } : null };
      refresh();
    },
    // ---- adapter glue -----------------------------------------------------
    setDragState: (drag) => {
      if (JSON.stringify(drag) === JSON.stringify(dragState)) return;
      dragState = drag ? { ...drag } : null;
      refresh();
    },
    undo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.undo();
    },
    redo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.redo();
    }
  };
  if (undoHistory) {
    undoHistory.subscribe(() => {
      state = deriveState2();
      notify();
    });
  }
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// src/inspector/entries/kanban.ts
var ISSUES = [
  { id: "t1", title: "Ship the composer wedge", status: "todo", priority: "high", owner: "trent" },
  { id: "t2", title: "Iroh sync flake on reconnect", status: "doing", priority: "high", owner: "trent" },
  { id: "t3", title: "EQL-S window functions", status: "todo", priority: "low", owner: "ada" },
  { id: "t4", title: "ADR 0034 wedge smoke test", status: "done", priority: "high", owner: "trent" },
  { id: "t5", title: "Migrate studio to headless cores", status: "todo", priority: "high", owner: "ada" },
  { id: "t6", title: "Op-log compaction policy", status: "doing", priority: "low", owner: "lin" },
  { id: "t7", title: "Iroh doc key hygiene", status: "todo", priority: "low", owner: "lin" },
  { id: "t8", title: "Deno edge deployment doc", status: "todo", priority: "low", owner: null },
  { id: "t9", title: "Semantic diff for table ops", status: "done", priority: "high", owner: "trent" },
  { id: "t10", title: "Whop checkout verification", status: "doing", priority: "high", owner: null }
];
var kanbanEntry = {
  type: "kanban",
  name: "Kanban",
  description: "Dynamic board projection \u2014 group by status/priority/owner, switch the group field live, create/rename/color/hide columns, move cards (one group-field write each), all undoable.",
  defaultConfig: {},
  create: (config) => createKanbanCore({
    data: ISSUES,
    columns: [
      { id: "title", accessorKey: "title", header: "Title" },
      { id: "priority", accessorKey: "priority", header: "Priority" },
      { id: "owner", accessorKey: "owner", header: "Owner" }
    ],
    groupFields: [
      {
        id: "status",
        label: "Status",
        affordance: "status",
        accessorKey: "status",
        options: [
          { value: "todo", label: "To Do" },
          { value: "doing", label: "In Progress" },
          { value: "done", label: "Done" }
        ]
      },
      {
        id: "priority",
        label: "Priority",
        affordance: "select",
        accessorKey: "priority",
        options: [{ value: "low", label: "Low" }, { value: "high", label: "High" }]
      },
      {
        id: "owner",
        label: "Owner",
        affordance: "relation",
        accessorKey: "owner",
        relationTargets: [
          { id: "trent", title: "Trent" },
          { id: "ada", title: "Ada" },
          { id: "lin", title: "Lin" }
        ]
      }
    ],
    groupFieldId: "status",
    rankField: "boardRank",
    undoHistory: config.undoHistory ?? createUndoHistoryCore()
  }),
  actions: [
    {
      label: "Group by priority",
      enabled: (c) => c.state.board.groupFieldId !== "priority",
      run: (c) => c.actions.setGroupField("priority")
    },
    {
      label: "Group by owner",
      enabled: (c) => c.state.board.groupFieldId !== "owner",
      run: (c) => c.actions.setGroupField("owner")
    },
    {
      label: "Group by status",
      enabled: (c) => c.state.board.groupFieldId !== "status",
      run: (c) => c.actions.setGroupField("status")
    },
    {
      label: "Sort columns (cycle)",
      run: (c) => {
        const mode = c.state.board.sortColumnsBy;
        c.actions.sortColumns(mode === "manual" ? "name" : mode === "name" ? "count" : "manual");
      }
    },
    {
      label: "Add column \u201CShipped\u201D",
      run: (c) => c.actions.createColumn({ label: "Shipped", color: "green" })
    },
    {
      label: "Move first card \u2192 next column",
      enabled: (c) => {
        const s = c.state;
        return s.columns.length >= 2 && s.columns[0].cards.length > 0;
      },
      run: (c) => {
        const s = c.state;
        const from = s.columns[0];
        c.actions.moveCard(from.cards[0].id, from.id, s.columns[1].id);
      }
    },
    {
      label: "Collapse first column",
      run: (c) => {
        const s = c.state;
        const col = s.columns[0];
        if (col) c.actions.setColumnCollapsed(col.id, !col.collapsed);
      }
    },
    { label: "Undo", enabled: (c) => c.state.canUndo, run: (c) => c.actions.undo() },
    { label: "Redo", enabled: (c) => c.state.canRedo, run: (c) => c.actions.redo() }
  ],
  renderers: [
    {
      framework: "vanilla",
      render: (core, host) => {
        const root = el("div", { class: "kanban-demo" });
        const status = el("div", { class: "status-line" });
        const undoLabel = el("span", { class: "chip" });
        const boardEl = el("div", { class: "kb-board" });
        const groupSelect = el("select", {}, ...[]);
        const sortSelect = el("select", {});
        const filterInput = el("input", { type: "text", placeholder: "filter cards\u2026", class: "mini-input" });
        const render = () => {
          const s = core.state;
          groupSelect.replaceChildren(
            ...s.groupableFields.map(
              (f) => el("option", { value: f.id, selected: f.id === s.board.groupFieldId }, f.label)
            )
          );
          sortSelect.replaceChildren(
            ...["manual", "name", "count"].map(
              (m2) => el("option", { value: m2, selected: m2 === s.board.sortColumnsBy }, `sort: ${m2}`)
            )
          );
          const visible = s.columns.filter((c) => !c.hidden);
          const scroll = el("div", { class: "kb-scroll" });
          if (visible.length === 0) {
            scroll.append(
              el("div", { class: "kb-empty" }, "board is empty \u2014 add a column"),
              el(
                "button",
                { class: "mini", onclick: () => core.actions.createColumn({ label: "First" }) },
                "Create column"
              )
            );
          }
          for (const col of visible) {
            const head = el("div", { class: "kb-col-head" }, ...[
              el(
                "span",
                { class: "kb-col-title", style: col.color ? `border-left:3px solid var(--${col.color})` : "" },
                col.title,
                el("span", { class: "kb-count" }, String(col.count))
              ),
              el(
                "button",
                { class: "mini", title: "move left", onclick: () => {
                  const i = visible.indexOf(col);
                  if (i > 0) core.actions.moveColumn(col.id, i - 1);
                } },
                "\u2039"
              ),
              el(
                "button",
                { class: "mini", title: "move right", onclick: () => {
                  const i = visible.indexOf(col);
                  if (i < visible.length - 1) core.actions.moveColumn(col.id, i + 1);
                } },
                "\u203A"
              ),
              el(
                "button",
                { class: "mini", title: col.collapsed ? "expand" : "collapse", onclick: () => core.actions.setColumnCollapsed(col.id, !col.collapsed) },
                col.collapsed ? "\u25B8" : "\u25BE"
              ),
              el(
                "button",
                { class: "mini", title: "hide", onclick: () => core.actions.setColumnHidden(col.id, true) },
                "\u2715"
              )
            ]);
            const body2 = el("div", { class: "kb-col-body" });
            if (!col.collapsed) {
              for (const card of col.cards) {
                const moveNext = visible[visible.indexOf(col) + 1];
                body2.append(
                  el(
                    "div",
                    {
                      class: "kb-card",
                      draggable: "true",
                      ondragstart: () => core.actions.setDragState({ cardId: card.id, columnId: col.id, sourceColumnId: col.id }),
                      ondragend: () => core.actions.setDragState(null),
                      ondragover: (e) => e.preventDefault(),
                      ondrop: () => {
                        const d = core.state.dragState;
                        if (d?.cardId && d.cardId !== card.id) {
                          core.actions.moveCard(d.cardId, d.sourceColumnId ?? col.id, col.id);
                          core.actions.setDragState(null);
                        }
                      }
                    },
                    el("div", { class: "kb-card-title" }, String(card.cells.title ?? card.id)),
                    el(
                      "div",
                      { class: "kb-card-meta" },
                      el("span", { class: "chip" }, String(card.cells.priority ?? "\u2014")),
                      el("span", { class: "chip" }, String(card.cells.owner ?? "\u2014"))
                    ),
                    moveNext ? el(
                      "button",
                      { class: "mini", title: `move to ${moveNext.title}`, onclick: () => core.actions.moveCard(card.id, col.id, moveNext.id) },
                      "\u2192"
                    ) : null
                  )
                );
              }
              if (col.cards.length === 0) {
                body2.append(el("div", { class: "kb-card-empty" }, "no cards"));
              }
            }
            const footer = el(
              "div",
              { class: "kb-col-footer" },
              el(
                "button",
                { class: "mini", onclick: () => core.actions.addCard(col.id, { title: `New ${col.title}` }) },
                "+ card"
              ),
              el(
                "button",
                { class: "mini", title: "rename", onclick: () => {
                  const name = window.prompt("Rename column", col.title);
                  if (name) core.actions.renameColumn(col.id, name);
                } },
                "\u270E"
              ),
              el(
                "button",
                { class: "mini", title: "delete (cards \u2192 no value)", onclick: () => core.actions.deleteColumn(col.id) },
                "\u232B"
              )
            );
            scroll.append(el("div", { class: "kb-col" }, head, body2, footer));
          }
          boardEl.replaceChildren(scroll);
          undoLabel.textContent = s.canUndo ? "undo: \u2318Z" : s.canRedo ? "redo: \u2318\u21E7Z" : "history: clean";
          status.textContent = `${s.totalCards} cards \xB7 ${s.columns.filter((c) => !c.hidden).length} columns \xB7 grouped by ${s.board.groupFieldId} \xB7 filter ${s.globalFilter ? `\u201C${s.globalFilter}\u201D` : "\u2014"}`;
        };
        const toolbar = el(
          "div",
          { class: "toolbar" },
          groupSelect,
          sortSelect,
          filterInput,
          el("button", { class: "mini", onclick: () => core.actions.saveBoard() }, "save board"),
          el("button", { class: "mini", onclick: () => core.actions.undo() }, "undo"),
          el("button", { class: "mini", onclick: () => core.actions.redo() }, "redo"),
          undoLabel
        );
        groupSelect.addEventListener("change", () => {
          core.actions.setGroupField(groupSelect.value);
        });
        sortSelect.addEventListener("change", () => {
          core.actions.sortColumns(sortSelect.value);
        });
        filterInput.addEventListener("input", () => {
          core.actions.setGlobalFilter(filterInput.value);
        });
        const unsub = core.subscribe(render);
        render();
        host.append(toolbar, root, status);
        root.append(boardEl);
        return unsub;
      }
    }
  ]
};

// src/inspector/entries/index.ts
inspectorRegistry.register(tableEntry);
inspectorRegistry.register(editorEntry);
inspectorRegistry.register(uploadEntry);
inspectorRegistry.register(colorpickerEntry);
inspectorRegistry.register(undoHistoryEntry);
inspectorRegistry.register(formEntry);
inspectorRegistry.register(paletteEntry);
inspectorRegistry.register(dialogEntry);
inspectorRegistry.register(timelineEntry);
inspectorRegistry.register(comboboxEntry);
inspectorRegistry.register(kanbanEntry);

// demo/wedge-smoke/dom.ts
function el2(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k2, v2] of Object.entries(attrs)) {
    if (v2 === void 0 || v2 === null || v2 === false) continue;
    if (k2 === "class") node.className = String(v2);
    else if (k2 === "style") node.setAttribute("style", String(v2));
    else if (k2.startsWith("on") && typeof v2 === "function") {
      node.addEventListener(k2.slice(2), v2);
    } else if (v2 === true) node.setAttribute(k2, "");
    else node.setAttribute(k2, String(v2));
  }
  for (const c of children) {
    if (c === null || c === void 0) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}
var $ = (id) => document.getElementById(id);

// demo/wedge-smoke/inspect.ts
function renderInspect(entry, targets) {
  let core = entry.create(entry.defaultConfig ?? {});
  let viewCleanup;
  let unsub;
  let buttons = [];
  const vanilla = entry.renderers.find(
    (r) => r.framework === "vanilla"
  );
  function mountView() {
    viewCleanup?.();
    viewCleanup = void 0;
    targets.canvas.replaceChildren();
    if (vanilla) {
      try {
        viewCleanup = vanilla.render(core, targets.canvas, entry.defaultConfig ?? {});
      } catch (err) {
        targets.canvas.append(el2("p", { class: "dim" }, `render failed: ${err.message}`));
      }
    } else {
      targets.canvas.append(el2("p", { class: "dim" }, "no vanilla renderer registered"));
    }
  }
  function refresh() {
    targets.stateDisplay.textContent = JSON.stringify(core.state, null, 2);
    for (const [i, btn] of buttons.entries()) {
      const action = entry.actions?.[i];
      if (action?.enabled) btn.disabled = !action.enabled(core);
    }
  }
  function reset() {
    unsub?.();
    core = entry.create(entry.defaultConfig ?? {});
    unsub = core.subscribe(refresh);
    mountView();
    refresh();
  }
  targets.aboutDisplay.replaceChildren(
    el2("p", { class: "comp-desc" }, entry.description ?? "")
  );
  const badges = entry.renderers.map(
    (r) => el2("span", { class: "chip badge" }, r.framework)
  );
  targets.aboutDisplay.append(el2("div", { class: "badge-row" }, ...badges));
  targets.actionsDisplay.replaceChildren();
  buttons = [];
  if (entry.actions?.length) {
    for (const action of entry.actions) {
      const btn = el2("button", { onclick: () => action.run(core) }, action.label);
      buttons.push(btn);
      targets.actionsDisplay.append(btn);
    }
  }
  targets.actionsDisplay.append(el2("button", { class: "reset", onclick: reset }, "\u21BA reset"));
  unsub = core.subscribe(refresh);
  mountView();
  refresh();
  return () => {
    viewCleanup?.();
    unsub?.();
  };
}

// demo/wedge-smoke/icons.js
var Zt = Object.defineProperty;
var Jt = (r, t, e) => t in r ? Zt(r, t, { enumerable: true, configurable: true, writable: true, value: e }) : r[t] = e;
var Q = (r, t, e) => Jt(r, typeof t != "symbol" ? t + "" : t, e);
var M = {
  // entity
  "entity-issue": {
    default: "lucide:git-issue",
    packs: { tabler: "tabler:git-issue" }
  },
  "entity-lane": { default: "lucide:git-branch" },
  "entity-project": { default: "lucide:folder-kanban" },
  "entity-person": { default: "lucide:user" },
  "entity-note": { default: "lucide:file-text" },
  "entity-doc": { default: "lucide:file" },
  // action
  "action-create": { default: "lucide:plus" },
  "action-edit": { default: "lucide:pencil" },
  "action-delete": { default: "lucide:trash-2" },
  "action-duplicate": { default: "lucide:copy" },
  "action-move": { default: "lucide:arrow-right" },
  // status
  "status-todo": { default: "lucide:circle" },
  "status-in-progress": { default: "lucide:loader-circle" },
  "status-done": { default: "lucide:check-circle-2" },
  "status-blocked": { default: "lucide:octagon-x" },
  "status-cancelled": { default: "lucide:ban" },
  // chrome (core)
  "core-chevron-down": { default: "lucide:chevron-down" },
  "core-menu": { default: "lucide:menu" },
  "core-close": { default: "lucide:x" },
  "core-search": { default: "lucide:search" },
  "core-plus": { default: "lucide:plus" }
};
var Gt = new RegExp("\\p{Extended_Pictographic}", "u");
var Nt = /^https?:\/\//i;
var Qt = /^[a-z0-9-]+:[a-z0-9-]+$/i;
function Xt(r) {
  return Gt.test(r);
}
function Yt(r) {
  return Nt.test(r);
}
function te(r) {
  return Qt.test(r) && !Nt.test(r);
}
function ee(r) {
  return r in M;
}
function vt(r) {
  return Xt(r) ? "emoji" : Yt(r) ? "image" : te(r) ? "iconify" : ee(r) ? "alias" : "bare";
}
var _t = "lucide";
var se = class {
  constructor() {
    Q(this, "icons", /* @__PURE__ */ new Map());
    Q(this, "aliases", /* @__PURE__ */ new Map());
  }
  // ---- legacy bundled glyphs -------------------------------------------
  get(t) {
    return this.icons.get(t);
  }
  findByTag(t) {
    return Array.from(this.icons.values()).filter((e) => e.tags.includes(t));
  }
  findByCategory(t) {
    return Array.from(this.icons.values()).filter(
      (e) => e.category === t
    );
  }
  search(t) {
    const e = t.toLowerCase();
    return Array.from(this.icons.values()).filter(
      (s) => s.name.includes(e) || s.tags.some((i) => i.includes(e))
    );
  }
  /** Register bundled glyphs (legacy icon packs). */
  register(t) {
    for (const e of t)
      this.icons.set(e.name, e);
  }
  // ---- semantic aliases -------------------------------------------------
  /** Register alias entries; later registers override per-name. */
  registerAliases(t) {
    for (const [e, s] of Object.entries(t))
      this.aliases.set(e, s);
  }
  hasAlias(t) {
    return this.aliases.has(t) || t in M;
  }
  findByKind(t) {
    const e = t, s = Array.from(this.icons.values()).filter(
      (o) => o.category === e || o.name.startsWith(`${t}-`)
    );
    if (s.length) return s;
    const i = `${t}-`;
    return Array.from(this.aliases.keys()).filter((o) => o.startsWith(i)).map((o) => this.iconForAlias(o)).filter((o) => o !== void 0);
  }
  // ---- detection + resolution -------------------------------------------
  detect(t) {
    return vt(t);
  }
  /** Resolve a `name` to a concrete `set:icon` ref for a pack. */
  resolve(t, e) {
    var o;
    const s = e ?? _t, i = vt(t);
    if (i === "iconify") return t;
    if (i === "alias") {
      const n = this.aliases.get(t) ?? M[t];
      return n ? ((o = n.packs) == null ? void 0 : o[s]) ?? n.default : void 0;
    }
    if (i === "bare") return `${s}:${t}`;
  }
  /** Resolve the active icon pack from a DOM element's theme context. */
  activePack(t) {
    if (t) {
      const i = getComputedStyle(t).getPropertyValue("--icon-pack").trim();
      if (i) return i;
    }
    const e = document.documentElement;
    return getComputedStyle(e).getPropertyValue("--icon-pack").trim() || _t;
  }
  /**
   * Render a resolved `set:icon` ref (or bare name) to SVG markup.
   * Local-first: bundled glyph → `@iconify-json/<set>` dynamic import →
   * `undefined` (caller shows the fallback glyph).
   */
  async iconify(t, e) {
    const [s, i] = t.split(":");
    if (!(!s || !i))
      return t in this._bundledSvgs() ? this._bundledSvgs()[t] : ie(s, i);
  }
  // ---- internals ---------------------------------------------------------
  _bundledSvgs() {
    const t = {};
    for (const [e, s] of [...this.aliases, ...Object.entries(M)]) {
      const i = this.icons.get(e);
      if (i)
        for (const o of /* @__PURE__ */ new Set([s.default, ...Object.values(s.packs ?? {})]))
          o && !(o in t) && (t[o] = i.svg);
    }
    return t;
  }
  iconForAlias(t) {
    const e = this.aliases.get(t) ?? M[t], s = this.icons.get(t);
    if (!(!e || !s))
      return {
        ...s,
        tags: [...s.tags, e.default]
      };
  }
};
async function ie(r, t) {
  var e;
  try {
    const i = (await import(
      /* @vite-ignore */
      `@iconify-json/${r}/icons.json`
    )).default, o = (e = i == null ? void 0 : i.icons) == null ? void 0 : e[t];
    return o != null && o.body ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g>${o.body}</g></svg>` : void 0;
  } catch {
    return;
  }
}
var $2 = new se();
$2.registerAliases(M);
$2.register([
  {
    name: "entity-issue",
    category: "entity",
    tags: ["issue", "task", "ticket"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 13v1" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "entity-lane",
    category: "entity",
    tags: ["lane", "stream"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 10h14" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "entity-project",
    category: "entity",
    tags: ["project", "workspace"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 5a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/></svg>'
  },
  {
    name: "entity-person",
    category: "entity",
    tags: ["person", "user", "member"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>'
  },
  {
    name: "entity-note",
    category: "entity",
    tags: ["note", "memo"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M7 7h6M7 10h6M7 13h4" stroke="white" stroke-width="1" fill="none"/></svg>'
  },
  {
    name: "entity-doc",
    category: "entity",
    tags: ["doc", "document", "file"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2h5l5 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M11 2v5h5" fill="none" stroke="white" stroke-width="1"/></svg>'
  }
]);
$2.register([
  {
    name: "status-todo",
    category: "status",
    tags: ["todo", "pending", "backlog"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "status-in-progress",
    category: "status",
    tags: ["in-progress", "active", "doing"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 5v5l3 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "status-done",
    category: "status",
    tags: ["done", "completed", "finished"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M6 10l3 3 5-5" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "status-blocked",
    category: "status",
    tags: ["blocked", "stuck"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M7 10h6" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "status-cancelled",
    category: "status",
    tags: ["cancelled", "abandoned"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5"/></svg>'
  }
]);
$2.register([
  {
    name: "action-create",
    category: "action",
    tags: ["create", "add", "new", "plus"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "action-edit",
    category: "action",
    tags: ["edit", "pencil", "write"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M14 2l4 4-8 8H6v-4l8-8z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "action-delete",
    category: "action",
    tags: ["delete", "remove", "trash"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 7h10l-1 10H6L5 7zM8 2h4l1 2H7l1-2zM4 5h12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "action-duplicate",
    category: "action",
    tags: ["duplicate", "copy", "clone"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="6" y="6" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "action-move",
    category: "action",
    tags: ["move", "drag", "reorder"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2v16M2 10h16" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="6" cy="6" r="1.5"/><circle cx="14" cy="6" r="1.5"/><circle cx="6" cy="14" r="1.5"/><circle cx="14" cy="14" r="1.5"/></svg>'
  }
]);
$2.register([
  {
    name: "core-chevron-down",
    category: "core",
    tags: ["chevron", "down", "expand", "arrow"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "core-menu",
    category: "core",
    tags: ["menu", "hamburger", "nav"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "core-close",
    category: "core",
    tags: ["close", "x", "dismiss"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "core-search",
    category: "core",
    tags: ["search", "find", "magnify"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "core-plus",
    category: "core",
    tags: ["plus", "add", "new"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  }
]);
var V = globalThis;
var nt = V.ShadowRoot && (V.ShadyCSS === void 0 || V.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var Ht = Symbol();
var $t = /* @__PURE__ */ new WeakMap();
var re = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = true, s !== Ht) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (nt && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = $t.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && $t.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
var oe = (r) => new re(typeof r == "string" ? r : r + "", void 0, Ht);
var ne = (r, t) => {
  if (nt) r.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const s = document.createElement("style"), i = V.litNonce;
    i !== void 0 && s.setAttribute("nonce", i), s.textContent = e.cssText, r.appendChild(s);
  }
};
var yt = nt ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules) e += s.cssText;
  return oe(e);
})(r) : r;
var { is: ae, defineProperty: ce, getOwnPropertyDescriptor: le, getOwnPropertyNames: he, getOwnPropertySymbols: de, getPrototypeOf: ue } = Object;
var A = globalThis;
var mt = A.trustedTypes;
var pe = mt ? mt.emptyScript : "";
var X = A.reactiveElementPolyfillSupport;
var H = (r, t) => r;
var F = { toAttribute(r, t) {
  switch (t) {
    case Boolean:
      r = r ? pe : null;
      break;
    case Object:
    case Array:
      r = r == null ? r : JSON.stringify(r);
  }
  return r;
}, fromAttribute(r, t) {
  let e = r;
  switch (t) {
    case Boolean:
      e = r !== null;
      break;
    case Number:
      e = r === null ? null : Number(r);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(r);
      } catch {
        e = null;
      }
  }
  return e;
} };
var at = (r, t) => !ae(r, t);
var At = { attribute: true, type: String, converter: F, reflect: false, useDefault: false, hasChanged: at };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), A.litPropertyMetadata ?? (A.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var x = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = At) {
    if (e.state && (e.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = true), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(), i = this.getPropertyDescriptor(t, s, e);
      i !== void 0 && ce(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: i, set: o } = le(this.prototype, t) ?? { get() {
      return this[e];
    }, set(n) {
      this[e] = n;
    } };
    return { get: i, set(n) {
      const a = i == null ? void 0 : i.call(this);
      o == null || o.call(this, n), this.requestUpdate(t, a, s);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? At;
  }
  static _$Ei() {
    if (this.hasOwnProperty(H("elementProperties"))) return;
    const t = ue(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(H("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(H("properties"))) {
      const e = this.properties, s = [...he(e), ...de(e)];
      for (const i of s) this.createProperty(i, e[i]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [s, i] of e) this.elementProperties.set(s, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s] of this.elementProperties) {
      const i = this._$Eu(e, s);
      i !== void 0 && this._$Eh.set(i, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const i of s) e.unshift(yt(i));
    } else t !== void 0 && e.push(yt(t));
    return e;
  }
  static _$Eu(t, e) {
    const s = e.attribute;
    return s === false ? void 0 : typeof s == "string" ? s : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const s of e.keys()) this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ne(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(true), (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostConnected) == null ? void 0 : s.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostDisconnected) == null ? void 0 : s.call(e);
    });
  }
  attributeChangedCallback(t, e, s) {
    this._$AK(t, s);
  }
  _$ET(t, e) {
    var o;
    const s = this.constructor.elementProperties.get(t), i = this.constructor._$Eu(t, s);
    if (i !== void 0 && s.reflect === true) {
      const n = (((o = s.converter) == null ? void 0 : o.toAttribute) !== void 0 ? s.converter : F).toAttribute(e, s.type);
      this._$Em = t, n == null ? this.removeAttribute(i) : this.setAttribute(i, n), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var o, n;
    const s = this.constructor, i = s._$Eh.get(t);
    if (i !== void 0 && this._$Em !== i) {
      const a = s.getPropertyOptions(i), l = typeof a.converter == "function" ? { fromAttribute: a.converter } : ((o = a.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? a.converter : F;
      this._$Em = i;
      const h = l.fromAttribute(e, a.type);
      this[i] = h ?? ((n = this._$Ej) == null ? void 0 : n.get(i)) ?? h, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, i = false, o) {
    var n;
    if (t !== void 0) {
      const a = this.constructor;
      if (i === false && (o = this[t]), s ?? (s = a.getPropertyOptions(t)), !((s.hasChanged ?? at)(o, e) || s.useDefault && s.reflect && o === ((n = this._$Ej) == null ? void 0 : n.get(t)) && !this.hasAttribute(a._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    this.isUpdatePending === false && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: s, reflect: i, wrapped: o }, n) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, n ?? e ?? this[t]), o !== true || n !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), i === true && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var s;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, n] of this._$Ep) this[o] = n;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [o, n] of i) {
        const { wrapped: a } = n, l = this[o];
        a !== true || this._$AL.has(o) || l === void 0 || this.C(o, void 0, n, l);
      }
    }
    let t = false;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (s = this._$EO) == null || s.forEach((i) => {
        var o;
        return (o = i.hostUpdate) == null ? void 0 : o.call(i);
      }), this.update(e)) : this._$EM();
    } catch (i) {
      throw t = false, this._$EM(), i;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((s) => {
      var i;
      return (i = s.hostUpdated) == null ? void 0 : i.call(s);
    }), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return true;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
x.elementStyles = [], x.shadowRootOptions = { mode: "open" }, x[H("elementProperties")] = /* @__PURE__ */ new Map(), x[H("finalized")] = /* @__PURE__ */ new Map(), X == null || X({ ReactiveElement: x }), (A.reactiveElementVersions ?? (A.reactiveElementVersions = [])).push("2.1.2");
var z = globalThis;
var wt = (r) => r;
var q = z.trustedTypes;
var bt = q ? q.createPolicy("lit-html", { createHTML: (r) => r }) : void 0;
var zt = "$lit$";
var m = `lit$${Math.random().toFixed(9).slice(2)}$`;
var Bt = "?" + m;
var ge = `<${Bt}>`;
var k = document;
var R = () => k.createComment("");
var I = (r) => r === null || typeof r != "object" && typeof r != "function";
var ct = Array.isArray;
var fe = (r) => ct(r) || typeof (r == null ? void 0 : r[Symbol.iterator]) == "function";
var Y = `[ 	
\f\r]`;
var T = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var Ct = /-->/g;
var Et = />/g;
var w = RegExp(`>|${Y}(?:([^\\s"'>=/]+)(${Y}*=${Y}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var kt = /'/g;
var St = /"/g;
var Rt = /^(?:script|style|textarea|title)$/i;
var ve = (r) => (t, ...e) => ({ _$litType$: r, strings: t, values: e });
var L = ve(1);
var S = Symbol.for("lit-noChange");
var u = Symbol.for("lit-nothing");
var xt = /* @__PURE__ */ new WeakMap();
var C = k.createTreeWalker(k, 129);
function It(r, t) {
  if (!ct(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return bt !== void 0 ? bt.createHTML(t) : t;
}
var _e = (r, t) => {
  const e = r.length - 1, s = [];
  let i, o = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", n = T;
  for (let a = 0; a < e; a++) {
    const l = r[a];
    let h, d, c = -1, g = 0;
    for (; g < l.length && (n.lastIndex = g, d = n.exec(l), d !== null); ) g = n.lastIndex, n === T ? d[1] === "!--" ? n = Ct : d[1] !== void 0 ? n = Et : d[2] !== void 0 ? (Rt.test(d[2]) && (i = RegExp("</" + d[2], "g")), n = w) : d[3] !== void 0 && (n = w) : n === w ? d[0] === ">" ? (n = i ?? T, c = -1) : d[1] === void 0 ? c = -2 : (c = n.lastIndex - d[2].length, h = d[1], n = d[3] === void 0 ? w : d[3] === '"' ? St : kt) : n === St || n === kt ? n = w : n === Ct || n === Et ? n = T : (n = w, i = void 0);
    const p = n === w && r[a + 1].startsWith("/>") ? " " : "";
    o += n === T ? l + ge : c >= 0 ? (s.push(h), l.slice(0, c) + zt + l.slice(c) + m + p) : l + m + (c === -2 ? a : p);
  }
  return [It(r, o + (r[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
var j = class _j {
  constructor({ strings: t, _$litType$: e }, s) {
    let i;
    this.parts = [];
    let o = 0, n = 0;
    const a = t.length - 1, l = this.parts, [h, d] = _e(t, e);
    if (this.el = _j.createElement(h, s), C.currentNode = this.el.content, e === 2 || e === 3) {
      const c = this.el.content.firstChild;
      c.replaceWith(...c.childNodes);
    }
    for (; (i = C.nextNode()) !== null && l.length < a; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const c of i.getAttributeNames()) if (c.endsWith(zt)) {
          const g = d[n++], p = i.getAttribute(c).split(m), y = /([.?@])?(.*)/.exec(g);
          l.push({ type: 1, index: o, name: y[2], strings: p, ctor: y[1] === "." ? ye : y[1] === "?" ? me : y[1] === "@" ? Ae : K }), i.removeAttribute(c);
        } else c.startsWith(m) && (l.push({ type: 6, index: o }), i.removeAttribute(c));
        if (Rt.test(i.tagName)) {
          const c = i.textContent.split(m), g = c.length - 1;
          if (g > 0) {
            i.textContent = q ? q.emptyScript : "";
            for (let p = 0; p < g; p++) i.append(c[p], R()), C.nextNode(), l.push({ type: 2, index: ++o });
            i.append(c[g], R());
          }
        }
      } else if (i.nodeType === 8) if (i.data === Bt) l.push({ type: 2, index: o });
      else {
        let c = -1;
        for (; (c = i.data.indexOf(m, c + 1)) !== -1; ) l.push({ type: 7, index: o }), c += m.length - 1;
      }
      o++;
    }
  }
  static createElement(t, e) {
    const s = k.createElement("template");
    return s.innerHTML = t, s;
  }
};
function P(r, t, e = r, s) {
  var n, a;
  if (t === S) return t;
  let i = s !== void 0 ? (n = e._$Co) == null ? void 0 : n[s] : e._$Cl;
  const o = I(t) ? void 0 : t._$litDirective$;
  return (i == null ? void 0 : i.constructor) !== o && ((a = i == null ? void 0 : i._$AO) == null || a.call(i, false), o === void 0 ? i = void 0 : (i = new o(r), i._$AT(r, e, s)), s !== void 0 ? (e._$Co ?? (e._$Co = []))[s] = i : e._$Cl = i), i !== void 0 && (t = P(r, i._$AS(r, t.values), i, s)), t;
}
var $e = class {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: s } = this._$AD, i = ((t == null ? void 0 : t.creationScope) ?? k).importNode(e, true);
    C.currentNode = i;
    let o = C.nextNode(), n = 0, a = 0, l = s[0];
    for (; l !== void 0; ) {
      if (n === l.index) {
        let h;
        l.type === 2 ? h = new D(o, o.nextSibling, this, t) : l.type === 1 ? h = new l.ctor(o, l.name, l.strings, this, t) : l.type === 6 && (h = new we(o, this, t)), this._$AV.push(h), l = s[++a];
      }
      n !== (l == null ? void 0 : l.index) && (o = C.nextNode(), n++);
    }
    return C.currentNode = k, i;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
};
var D = class _D {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, e, s, i) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = i, this._$Cv = (i == null ? void 0 : i.isConnected) ?? true;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = P(this, t, e), I(t) ? t === u || t == null || t === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : t !== this._$AH && t !== S && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : fe(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== u && I(this._$AH) ? this._$AA.nextSibling.data = t : this.T(k.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o;
    const { values: e, _$litType$: s } = t, i = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = j.createElement(It(s.h, s.h[0]), this.options)), s);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === i) this._$AH.p(e);
    else {
      const n = new $e(i, this), a = n.u(this.options);
      n.p(e), this.T(a), this._$AH = n;
    }
  }
  _$AC(t) {
    let e = xt.get(t.strings);
    return e === void 0 && xt.set(t.strings, e = new j(t)), e;
  }
  k(t) {
    ct(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, i = 0;
    for (const o of t) i === e.length ? e.push(s = new _D(this.O(R()), this.O(R()), this, this.options)) : s = e[i], s._$AI(o), i++;
    i < e.length && (this._$AR(s && s._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var s;
    for ((s = this._$AP) == null ? void 0 : s.call(this, false, true, e); t !== this._$AB; ) {
      const i = wt(t).nextSibling;
      wt(t).remove(), t = i;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
};
var K = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, i, o) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = u;
  }
  _$AI(t, e = this, s, i) {
    const o = this.strings;
    let n = false;
    if (o === void 0) t = P(this, t, e, 0), n = !I(t) || t !== this._$AH && t !== S, n && (this._$AH = t);
    else {
      const a = t;
      let l, h;
      for (t = o[0], l = 0; l < o.length - 1; l++) h = P(this, a[s + l], e, l), h === S && (h = this._$AH[l]), n || (n = !I(h) || h !== this._$AH[l]), h === u ? t = u : t !== u && (t += (h ?? "") + o[l + 1]), this._$AH[l] = h;
    }
    n && !i && this.j(t);
  }
  j(t) {
    t === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
};
var ye = class extends K {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === u ? void 0 : t;
  }
};
var me = class extends K {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== u);
  }
};
var Ae = class extends K {
  constructor(t, e, s, i, o) {
    super(t, e, s, i, o), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = P(this, t, e, 0) ?? u) === S) return;
    const s = this._$AH, i = t === u && s !== u || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, o = t !== u && (s === u || i);
    i && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
};
var we = class {
  constructor(t, e, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    P(this, t);
  }
};
var tt = z.litHtmlPolyfillSupport;
tt == null || tt(j, D), (z.litHtmlVersions ?? (z.litHtmlVersions = [])).push("3.3.3");
var be = (r, t, e) => {
  const s = (e == null ? void 0 : e.renderBefore) ?? t;
  let i = s._$litPart$;
  if (i === void 0) {
    const o = (e == null ? void 0 : e.renderBefore) ?? null;
    s._$litPart$ = i = new D(t.insertBefore(R(), o), o, void 0, e ?? {});
  }
  return i._$AI(r), i;
};
var E = globalThis;
var B = class extends x {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = be(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(true);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(false);
  }
  render() {
    return S;
  }
};
var Tt;
B._$litElement$ = true, B.finalized = true, (Tt = E.litElementHydrateSupport) == null || Tt.call(E, { LitElement: B });
var et = E.litElementPolyfillSupport;
et == null || et({ LitElement: B });
(E.litElementVersions ?? (E.litElementVersions = [])).push("4.2.2");
var Ce = (r) => (t, e) => {
  e !== void 0 ? e.addInitializer(() => {
    customElements.define(r, t);
  }) : customElements.define(r, t);
};
var Ee = { attribute: true, type: String, converter: F, reflect: false, hasChanged: at };
var ke = (r = Ee, t, e) => {
  const { kind: s, metadata: i } = e;
  let o = globalThis.litPropertyMetadata.get(i);
  if (o === void 0 && globalThis.litPropertyMetadata.set(i, o = /* @__PURE__ */ new Map()), s === "setter" && ((r = Object.create(r)).wrapped = true), o.set(e.name, r), s === "accessor") {
    const { name: n } = e;
    return { set(a) {
      const l = t.get.call(this);
      t.set.call(this, a), this.requestUpdate(n, l, r, true, a);
    }, init(a) {
      return a !== void 0 && this.C(n, void 0, r, a), a;
    } };
  }
  if (s === "setter") {
    const { name: n } = e;
    return function(a) {
      const l = this[n];
      t.call(this, a), this.requestUpdate(n, l, r, true, a);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function st(r) {
  return (t, e) => typeof e == "object" ? ke(r, t, e) : ((s, i, o) => {
    const n = i.hasOwnProperty(o);
    return i.constructor.createProperty(o, s), n ? Object.getOwnPropertyDescriptor(i, o) : void 0;
  })(r, t, e);
}
var Se = { CHILD: 2 };
var xe = (r) => (...t) => ({ _$litDirective$: r, values: t });
var Me = class {
  constructor(t) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t, e, s) {
    this._$Ct = t, this._$AM = e, this._$Ci = s;
  }
  _$AS(t, e) {
    return this.update(t, e);
  }
  update(t, e) {
    return this.render(...e);
  }
};
var rt = class extends Me {
  constructor(t) {
    if (super(t), this.it = u, t.type !== Se.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(t) {
    if (t === u || t == null) return this._t = void 0, this.it = t;
    if (t === S) return t;
    if (typeof t != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (t === this.it) return this._t;
    this.it = t;
    const e = [t];
    return e.raw = e, this._t = { _$litType$: this.constructor.resultType, strings: e, values: [] };
  }
};
rt.directiveName = "unsafeHTML", rt.resultType = 1;
var Pe = xe(rt);
var Oe = Object.create;
var lt = Object.defineProperty;
var Ue = Object.getOwnPropertyDescriptor;
var jt = (r, t) => (t = Symbol[r]) ? t : Symbol.for("Symbol." + r);
var U = (r) => {
  throw TypeError(r);
};
var Dt = (r, t, e) => t in r ? lt(r, t, { enumerable: true, configurable: true, writable: true, value: e }) : r[t] = e;
var Mt = (r, t) => lt(r, "name", { value: t, configurable: true });
var Te = (r) => [, , , Oe((r == null ? void 0 : r[jt("metadata")]) ?? null)];
var Lt = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var N = (r) => r !== void 0 && typeof r != "function" ? U("Function expected") : r;
var Ne = (r, t, e, s, i) => ({ kind: Lt[r], name: t, metadata: s, addInitializer: (o) => e._ ? U("Already initialized") : i.push(N(o || null)) });
var He = (r, t) => Dt(t, jt("metadata"), r[3]);
var b = (r, t, e, s) => {
  for (var i = 0, o = r[t >> 1], n = o && o.length; i < n; i++) t & 1 ? o[i].call(e) : s = o[i].call(e, s);
  return s;
};
var Z = (r, t, e, s, i, o) => {
  var n, a, l, h, d, c = t & 7, g = !!(t & 8), p = !!(t & 16), y = c > 3 ? r.length + 1 : c ? g ? 1 : 2 : 0, gt = Lt[c + 5], ft = c > 3 && (r[y - 1] = []), Kt = r[y] || (r[y] = []), _ = c && (!p && !g && (i = i.prototype), c < 5 && (c > 3 || !p) && Ue(c < 4 ? i : { get [e]() {
    return Pt(this, o);
  }, set [e](f) {
    return Ot(this, o, f);
  } }, e));
  c ? p && c < 4 && Mt(o, (c > 2 ? "set " : c > 1 ? "get " : "") + e) : Mt(i, e);
  for (var J = s.length - 1; J >= 0; J--)
    h = Ne(c, e, l = {}, r[3], Kt), c && (h.static = g, h.private = p, d = h.access = { has: p ? (f) => ze(i, f) : (f) => e in f }, c ^ 3 && (d.get = p ? (f) => (c ^ 1 ? Pt : Be)(f, i, c ^ 4 ? o : _.get) : (f) => f[e]), c > 2 && (d.set = p ? (f, G) => Ot(f, i, G, c ^ 4 ? o : _.set) : (f, G) => f[e] = G)), a = (0, s[J])(c ? c < 4 ? p ? o : _[gt] : c > 4 ? void 0 : { get: _.get, set: _.set } : i, h), l._ = 1, c ^ 4 || a === void 0 ? N(a) && (c > 4 ? ft.unshift(a) : c ? p ? o = a : _[gt] = a : i = a) : typeof a != "object" || a === null ? U("Object expected") : (N(n = a.get) && (_.get = n), N(n = a.set) && (_.set = n), N(n = a.init) && ft.unshift(n));
  return c || He(r, i), _ && lt(i, e, _), p ? c ^ 4 ? o : _ : i;
};
var W = (r, t, e) => Dt(r, typeof t != "symbol" ? t + "" : t, e);
var ht = (r, t, e) => t.has(r) || U("Cannot " + e);
var ze = (r, t) => Object(t) !== t ? U('Cannot use the "in" operator on this value') : r.has(t);
var Pt = (r, t, e) => (ht(r, t, "read from private field"), e ? e.call(r) : t.get(r));
var it = (r, t, e) => t.has(r) ? U("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(r) : t.set(r, e);
var Ot = (r, t, e, s) => (ht(r, t, "write to private field"), s ? s.call(r, e) : t.set(r, e), e);
var Be = (r, t, e) => (ht(r, t, "access private method"), e);
var Wt;
var Vt;
var Ft;
var ot;
var qt;
var v;
var dt;
var ut;
var pt;
var Ut = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32
};
qt = [Ce("trellis-icon")];
var O = class extends (ot = B, Ft = [st({ type: String })], Vt = [st({ type: String })], Wt = [st({ type: String })], ot) {
  constructor() {
    super(...arguments), it(this, dt, b(v, 8, this, "")), b(v, 11, this), it(this, ut, b(v, 12, this, "md")), b(v, 15, this), it(this, pt, b(v, 16, this)), b(v, 19, this), W(this, "_svg"), W(this, "_svgName", ""), W(this, "_svgPack", ""), W(this, "_themeObserver");
  }
  willUpdate(t) {
    t.has("name") && this._invalidateSvg();
  }
  updated(t) {
    (t.has("name") || this._packChanged()) && this._resolveSvg();
  }
  connectedCallback() {
    super.connectedCallback(), this._resolveSvg(), this._observeThemeChanges();
  }
  disconnectedCallback() {
    var t;
    (t = this._themeObserver) == null || t.disconnect(), this._themeObserver = void 0, super.disconnectedCallback();
  }
  /** True when the computed --icon-pack differs from the resolved one. */
  _packChanged() {
    return $2.activePack(this) !== this._svgPack;
  }
  /**
   * Re-resolve on theme mutations (data-theme / style / class on
   * ancestors). Always observes the light-DOM document root: theme
   * attributes live in the light DOM (even for elements nested in a
   * shadow root, the host's ancestors are light-DOM), and custom
   * properties inherit into shadow trees. The _packChanged() guard
   * makes unrelated mutations a no-op.
   */
  _observeThemeChanges() {
    this._themeObserver = new MutationObserver(() => {
      this._packChanged() && this._resolveSvg();
    }), this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style", "class"],
      subtree: true
    });
  }
  _invalidateSvg() {
    this._svg = void 0, this._svgName = "", this._svgPack = "";
  }
  _sizePx() {
    const t = this.size;
    if (typeof t == "number") return t;
    const e = Ut[t];
    if (e) return e;
    const s = Number.parseFloat(t);
    return Number.isFinite(s) ? s : Ut.md;
  }
  _resolveSvg() {
    const t = this.name || "", e = $2.activePack(this);
    if (!t || t === this._svgName && e === this._svgPack) return;
    this._svgName = t, this._svgPack = e;
    const s = $2.resolve(t, e);
    s && $2.iconify(s, e).then((i) => {
      t !== this._svgName || e !== this._svgPack || (this._svg = i, this.requestUpdate());
    });
  }
  render() {
    const t = this.name || "", e = $2.detect(t), s = this._sizePx(), i = `width:${s}px;height:${s}px;color:${this.color || "currentColor"};display:inline-flex;align-items:center;justify-content:center`;
    return e === "emoji" ? L`<span
        part="icon"
        style="${i};font-size:${Math.round(s * 0.8)}px;line-height:1"
        role="img"
        aria-label=${t}
        >${t}</span
      >` : e === "image" ? L`<img
        part="icon"
        src=${t}
        alt=""
        style="${i};object-fit:contain"
        aria-hidden="true"
      />` : this._svg ? L`<span
        part="icon"
        style="${i}"
        role="img"
        aria-label=${t}
        >${Pe(this._svg)}</span
      >` : L`<span
      part="icon"
      style="${i};border-radius:4px;background:currentColor;opacity:0.35"
      role="img"
      aria-label=${t}
    ></span>`;
  }
};
v = Te(ot);
dt = /* @__PURE__ */ new WeakMap();
ut = /* @__PURE__ */ new WeakMap();
pt = /* @__PURE__ */ new WeakMap();
Z(v, 4, "name", Ft, O, dt);
Z(v, 4, "size", Vt, O, ut);
Z(v, 4, "color", Wt, O, pt);
O = Z(v, 0, "TrellisIcon", qt, O);
b(v, 1, O);

// demo/wedge-smoke/gallery.ts
var components = inspectorRegistry.listComponents();
var count2 = components.length;
var navList = $("nav-list");
var navSearch = $("nav-search");
var navCount = $("nav-count");
var btnNavToggle = $("btn-nav-toggle");
var toolbarTitle = $("toolbar-title");
var toolbarType = $("toolbar-type");
var themeSelect = $("theme-select");
var btnPrev = $("btn-prev");
var btnNext = $("btn-next");
var btnFullscreen = $("btn-fullscreen");
var canvas = $("component-canvas");
var stateDisplay = $("state-display");
var actionsDisplay = $("actions-display");
var aboutDisplay = $("about-display");
var body = document.body;
var currentIndex = -1;
var cleanup;
var navButtons = [];
var ICON_ALIASES = {
  table: "entity-doc",
  editor: "entity-note",
  upload: "action-create",
  colorpicker: "status-in-progress",
  "undo-history": "action-edit",
  form: "core-search",
  palette: "core-search",
  dialog: "core-close",
  timeline: "core-plus",
  combobox: "core-menu",
  kanban: "entity-project"
};
function iconForType(type) {
  return ICON_ALIASES[type] ?? "entity-doc";
}
function loadComponent(index) {
  const entry = components[index];
  if (!entry) return;
  currentIndex = index;
  cleanup?.();
  cleanup = renderInspect(entry, {
    canvas,
    stateDisplay,
    actionsDisplay,
    aboutDisplay
  });
  toolbarTitle.textContent = entry.name;
  toolbarType.textContent = entry.type;
  updateNavState();
}
function updateNavState() {
  for (const [i, btn] of navButtons.entries()) {
    btn.classList.toggle("active", i === currentIndex);
  }
  navCount.textContent = String(count2);
}
function renderNav() {
  navList.replaceChildren();
  navButtons.length = 0;
  const q2 = navSearch.value.trim().toLowerCase();
  components.forEach((entry, i) => {
    if (q2 && !entry.name.toLowerCase().includes(q2)) return;
    const alias = iconForType(entry.type);
    const btn = el2(
      "button",
      {
        class: "nav-item",
        onclick: () => {
          location.hash = String(entry.type);
        }
      },
      `<trellis-icon name="${alias}" size="sm"></trellis-icon> ${entry.name}`
    );
    btn.innerHTML = `<trellis-icon name="${alias}" size="sm"></trellis-icon> ${entry.name}`;
    navButtons.push(btn);
    navList.append(btn);
  });
  updateNavState();
}
function visibleIndices() {
  const q2 = navSearch.value.trim().toLowerCase();
  return components.map((c, i) => ({ c, i })).filter(({ c }) => !q2 || c.name.toLowerCase().includes(q2)).map(({ i }) => i);
}
function step(delta) {
  const visible = visibleIndices();
  if (!visible.length) return;
  const pos = visible.indexOf(currentIndex);
  const next = visible[(pos + delta + visible.length) % visible.length];
  location.hash = String(components[next].type);
}
function handleHash() {
  const type = decodeURIComponent(location.hash.replace(/^#/, ""));
  const index = components.findIndex((c) => String(c.type) === type);
  loadComponent(index >= 0 ? index : 0);
}
function setFullscreen(on) {
  body.classList.toggle("fullscreen", on);
  btnFullscreen.classList.toggle("active", on);
  btnFullscreen.title = on ? "Exit fullscreen (Esc)" : "Fullscreen";
}
btnFullscreen.addEventListener(
  "click",
  () => setFullscreen(!body.classList.contains("fullscreen"))
);
function setNavCollapsed(collapsed) {
  body.classList.toggle("nav-collapsed", collapsed);
  btnNavToggle.classList.toggle("active", collapsed);
}
btnNavToggle.addEventListener(
  "click",
  () => setNavCollapsed(!body.classList.contains("nav-collapsed"))
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && body.classList.contains("fullscreen")) {
    setFullscreen(false);
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
    e.preventDefault();
    setNavCollapsed(!body.classList.contains("nav-collapsed"));
    return;
  }
  const t = e.target;
  const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  if (typing) return;
  if (e.key === "ArrowLeft") step(-1);
  else if (e.key === "ArrowRight") step(1);
  else if (e.key === "/") {
    e.preventDefault();
    navSearch.focus();
  }
});
navSearch.addEventListener("input", renderNav);
btnPrev.addEventListener("click", () => step(-1));
btnNext.addEventListener("click", () => step(1));
window.addEventListener("hashchange", handleHash);
themeSelect.addEventListener("change", () => {
  document.documentElement.setAttribute("data-theme", themeSelect.value);
});
renderNav();
handleHash();
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/*! Bundled license information:

@tanstack/table-core/build/lib/index.mjs:
  (**
     * table-core
     *
     * Copyright (c) TanStack
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE.md file in the root directory of this source tree.
     *
     * @license MIT
     *)
*/
