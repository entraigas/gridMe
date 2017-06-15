/*
===============================================================================
    Author:     Loïc Faure-Lacroix loicfl@gmail.com
    License:    MIT (http://opensource.org/licenses/mit-license.php)

    Description: Lazy template loading  Library for KnockoutJS
===============================================================================
    https://github.com/llacroix/knockout-lazy-template
===============================================================================
*/

(function (factory) {
    // Module systems magic dance.

    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "knockout"
        factory(require("knockout"), exports);
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "knockout"
        define(["knockout", "exports"], factory);
    } else {
        // <script> tag: use the global `ko` object, attaching a `mapping` property
        factory(ko, ko.lazyTemplate = {});
    }
}(function ( ko, exports ) {

    if (typeof (ko) === undefined) { throw 'Knockout is required, please ensure it is loaded before loading this validation plug-in'; }
    
    var lazyTemplate,
        loader = function (templateName, callback) {
            callback(' ');
        },
        appendEmptyTemplate,
        getTemplate,
        getTemplateId;

    getTemplateId = function (name) {
        return 'ko-lazy-' + name;
    };

    appendTemplate = function (name, data) {
        name = getTemplateId(name);

        var scriptTag = document.createElement('script'),
            head = document.getElementsByTagName('head')[0];

        scriptTag.id  = name;
        scriptTag.type = "text/html";
        scriptTag.innerHTML = data;

        head.appendChild(scriptTag);
    };

    getTemplate = function (name) {
        return function () {
            var loaded = ko.observable(false),
                templateId = getTemplateId(name),
                template = document.getElementById(templateId);

            if (template) {
                loaded(true);
            } else {
                loader(name, function (data) {
                    appendTemplate(name, "\n" + data);
                    loaded(true);
                });
            }

            return ko.computed(function () {
                if (loaded()) {
                    return templateId;
                } else {
                    return getTemplateId('empty');
                }
            })();
        };
    };


    lazyTemplate = {
        init:  function(a, b, c, d, e) {
            var name = getTemplate(b());
            var obj = ko.observable({
                name: name,
                data: d
            });
            return ko.bindingHandlers.template.init(a, obj);
        },
        update: function(a, b, c, d, e) {
            var name = getTemplate(b());
            var obj = ko.observable({
                name: name,
                data: d
            });
            return ko.bindingHandlers.template.update(a, obj, c, d, e);
        }
    };


    exports.init = function (opts) {
        if (opts.loader) {
            loader = opts.loader;
        }

        appendTemplate('empty', ' ');

        ko.bindingHandlers['lazy-template'] = lazyTemplate;
        ko.virtualElements.allowedBindings['lazy-template'] = true;
    };
}))


/**
 * BugMe code
 */

// global namespace for project
var me = {};

// data
me.data = {};

// useful functions
me.isFunction = function (fn) {
    var getType = {};
    return fn && getType.toString.call(fn) === '[object Function]';
};
me.isArray = function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
};
me.isEmptyObject = function (obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }

    return JSON.stringify(obj) === JSON.stringify({});
};
me.getObservableArray = function (array) {
    if (me.isFunction(array)) {
        return array;
    }
    return ko.observableArray(array);
};
me.getKoValue = function (json, key, dflt) {
    if (json === undefined || json[key] === undefined) {
        return me.isFunction(dflt) ? dflt() : dflt;
    }
    if (me.isFunction(json[key])) {
        return json[key]();
    }
    return json[key];
};
me.setKoValue = function (json, key, value) {
    me.isFunction(json[key]) ? json[key](value) : json[key] = value;
};
me.modelPopulate = function (model, defaultValues) {
    var value;
    for (var key in defaultValues) {
        if (defaultValues.hasOwnProperty(key) && !ko.isComputed(defaultValues[key])) {
            value = me.getKoValue(defaultValues, key);
            me.setKoValue(model, key, value);
        }
    }
    ;
};
me.modelIntersect = function (model, defaultValues) {
    var json = {};
    for (var key in defaultValues) {
        json[key] = me.getKoValue(model, key, defaultValues[key]);
    }
    return json;
};
me.findCustomerByKey = function (allCustomers, id) {
    var key;
    for (var i in allCustomers) {
        key = me.getKoValue(allCustomers[i], 'Key');
        if (key == id) {
            return allCustomers[i];
        }
    }
    return null;
};
me.GetEnumOption = function (enumValues) {
    var index, options = [];
    for (index in enumValues) {
        options.push({'label': enumValues[index], 'value': index});
    }
    return options;
};

// grid plugin
me.grid = {};
me.grid.config = {
    //pagerSizeOptions : [5, 10, 25, 50, 100, 250, 500],
    pagerSize: 5
};
// filter's grid plugin
me.grid.Filter = function (records, config) {
    config = config || {};
    var self = this, tmp, value;
    self.collection = me.getObservableArray(records);
    self.callback = {};
    self.data = {};
    self.defaultData = {};
    if (!me.isEmptyObject(config)) {
        for (var key in config) {
            value = config[key].initialValue;
            self.defaultData[key] = value;
            self.data[key] = ko.observable(value);
            self.callback[key] = config[key].fnFilter;
        }
    }

    // computed data
    self.records = ko.pureComputed(function () {
        var records = self.collection();
        var key, value, totalRows, callback, tmp, row, i;
        for (key in self.data) {
            // validation
            if (!me.isFunction(self.callback[key]) || !me.isFunction(self.data[key]))
                continue;
            //if( !(self.callback[key] instanceof Function) ||  !(self.data[key] instanceof Function)) continue;
            value = self.data[key]();
            if (value == '' || value === undefined || value === null)
                continue;
            // init vars & grep results
            totalRows = records.length;
            callback = self.callback[key];
            tmp = [];
            row = {};
            for (i = 0; i < totalRows; i++) {
                row = records[i];
                if (callback(row, value)) {
                    tmp.push(row);
                }
            }
            records = tmp;
        }
        return records;
    }).extend({deferred: true});
    // filter operations
    self.reset = function () {
        for (key in self.defaultData) {
            self.data[key](self.defaultData[key]);
        }
    };
};
// sorting's grid plugin
me.grid.Sort = function (records, config) {
    config = config || {};
    var self = this;
    self.data = {
        sortColumn: ko.observable(config.column || null),
        sortAsc: ko.observable(!config.asc)
    };
    self.collection = me.getObservableArray(records);

    function sortBy(column) {
        if (self.data.sortColumn() === column) {
            self.data.sortAsc(!self.data.sortAsc());
        } else {
            self.data.sortColumn(column);
            self.data.sortAsc(true);
        }
        self.refresh();
    }
    ;

    // computed data
    self.records = ko.pureComputed(function () {
        var field = self.data.sortColumn();
        // is there work to do??
        if (field) {
            var reverse = self.data.sortAsc() ? 1 : -1;
            self.collection().sort(function (obj1, obj2) {
                var A, B, emptyAtTop = false;
                // get values
                if (obj1[field] instanceof Function) {
                    A = obj1[field]();
                    B = obj2[field]();
                } else {
                    A = obj1[field];
                    B = obj2[field];
                }
                // keep empty records at the top/bottom
                if (emptyAtTop) {
                    if (A === null || A === undefined || A === "")
                        return -1;
                    if (B === null || B === undefined || B === "")
                        return 1;
                } else {
                    if (A === null || A === undefined || A === "")
                        return 1;
                    if (B === null || B === undefined || B === "")
                        return -1;
                }
                // finally compare objects
                if (A == B)
                    return 0;
                return reverse * ((A > B) - (B > A));
            });
        }
        return self.collection();
    }).extend({deferred: true});
    // sorting operations
    self.By = function (model, jqEvent) {
        var column = $(jqEvent.currentTarget).attr('sort-by');
        sortBy(column);
    };
    self.by = function (column) {
        sortBy(column);
    };
    self.refresh = function () {
        // show/hide sort icon
        if (config.selector) {
            var sortClass = self.data.sortAsc() ? 'glyphicon-sort-by-attributes' : 'glyphicon-sort-by-attributes-alt';
            $(config.selector + ' i').html('');
            $(config.selector + ' i[sort-by="' + self.data.sortColumn() + '"]').html('<span class="glyphicon ' + sortClass + '"></span>');
        }
    };
    // triger sort method
    sortBy(config.column || null)
};
// pager's grid plugin (ko component)
me.grid.Pager = function (records, config) {
    config = config || {disabled: true};
    var self = this;
    self.collection = me.getObservableArray(records);
    self.pageSize = ko.observable(me.getKoValue(config, "pagerSize", me.grid.config.pagerSize));
    self.currentPage = ko.observable(0);
    self.disabled = me.getKoValue(config, "disabled", false);
    // computed paging data
    self.totalRecords = ko.pureComputed(function () {
        return self.collection().length;
    });
    self.records = ko.computed(function () {
        if (self.disabled == true)
            return self.collection();
        //nasty hack here for out-of-bounds records
        if (self.currentPage() * self.pageSize() >= self.collection().length) {
            self.currentPage(0);
        }
        var first = self.currentPage() * self.pageSize();
        var tmp = self.collection().slice(first, first + self.pageSize());
        return tmp;
    }).extend({deferred: true});
};
//somehow based on https://www.safaribooksonline.com/blog/2014/02/03/creating-basic-re-usable-component-knockout-3-0/
me.grid.pagerViewModel = function(params, componentInfo){
    var self = this, pager = params.parent;

    // computed paging data
    self.hasPrevious = ko.pureComputed(function () {
        return pager.currentPage() > 0;
    });
    self.hasNext = ko.pureComputed(function () {
        return pager.currentPage() < self.lastPage();
    });
    self.labelTotalRecords = ko.pureComputed(function () {
        return pager.totalRecords() > 0 ? pager.totalRecords() + ' records. ' : "No records.";
    });
    self.labelTotalPages = ko.pureComputed(function () {
        return ' ' + (pager.currentPage() + 1) + '/' + (self.lastPage() + 1) + ' ';
    });
    // paging operations
    self.lastPage = ko.pureComputed(function () {
        if (pager.disabled == true)
            return 0;
        return Math.floor((pager.totalRecords() - 1) / pager.pageSize());
    });
    self.gotoPage = function (page) {
        pager.currentPage(page);
    };
    self.gotoNext = function () {
        if (self.hasNext()) {
            pager.currentPage(pager.currentPage() + 1);
        }
    };
    self.gotoPrevious = function () {
        if (self.hasPrevious()) {
            pager.currentPage(pager.currentPage() - 1);
        }
    };
    self.gotoFirst = function () {
        pager.currentPage(0);
    };
    self.gotoLast = function () {
        pager.currentPage(self.lastPage());
    };
};

me.grid.Builder = function (config) {
    if (!config.records)
        throw 'No {records} configuration found for the grid!';
    var self = this, rows = self;
    self.event = {};
    if (!config.hasOwnProperty("gridId")) {
        var selectorLenght = 7;
        config.gridId = (Math.random().toString(36) + '00000000000000000').slice(2, selectorLenght + 2);
    }
    self.config = config;
    self.fields = {}; // object with original field from json
    self.virtualColumns = {};
    self.columns = ko.observableArray(); // columns to display
    self.records = ko.observableArray();  // all records
    self.rows = ko.computed(function () {
        if (self.config.filter && !self.Filter) {
            self.Filter = new me.grid.Filter(rows.records, self.config.filter);
            rows = self.Filter;
        }
        if (self.config.sort && !self.Sort) {
            self.config.sort.selector = '#' + self.config.gridId;
            self.Sort = new me.grid.Sort(rows.records, self.config.sort);
            rows = self.Sort;
        }
        if (!self.Pager) {
            var config = self.config.pager || {"disabled": true};
            self.Pager = new me.grid.Pager(rows.records, self.config.pager);
            rows = self.Pager;
        }
        // virtual columns
        if (me.isEmptyObject(self.virtualColumns)) {
            return rows.records();
        }
        var data = [];
        for (var i = 0; i < rows.records().length; i++) {
            data.push(processVirtualCols(rows.records()[i]));
        }
        return data;
    });
    self.rows.subscribe(function () {
    	if( $('[data-toggle="tooltip"]').length ){
            setTimeout(function () {
                $('[data-toggle="tooltip"]').tooltip();
            }, 500);    		
    	}
    });
    // grid column names
    function getColumnsFromJson() {
        var cols = [];
        if (self.records().length === 0) {
            return cols;
        }
        var obj = self.records()[0];
        for (var name in obj) {
            cols.push(name);
        }
        return cols;
    }
    ;
    function processVirtualCols(row) {
        for (var i in self.virtualColumns) {
            row[i] = me.isFunction(self.virtualColumns[i]) ? self.virtualColumns[i](row) : self.virtualColumns[i];
        }
        return row;
    }
    ;
    self.records.subscribe(function () {
        var names = [],
                jsonFields = getColumnsFromJson(),
                tmp;
        // get the json fields
        for (var i = 0; i < jsonFields.length; i++) {
            self.fields[ jsonFields[i] ] = true;
        }
        // compute the columns to be displayed
        if (typeof self.config.display !== 'undefined') {
            for (var name in self.config.display) {
                names.push(name);
                tmp = self.config.display[name]['html'] ? self.config.display[name]['html'] : false;
                if (tmp) {
                    self.virtualColumns[name] = tmp;
                }
            }
            self.columns(names);
            return;
        }
        self.columns(jsonFields);
    });
    self.htmlTH = function (column) {
        var name = (self.config.header && column in self.config.header) ? self.config.header[column] : column;
        return (self.Sort) ? name + ' <i sort-by="' + column + '"></i>' : name;
    };
    // grid column styles
    function computeStyle(column, element) {
        var config = me.getKoValue(self.config.display || {}, column, {}),
                style = me.getKoValue(config, 'css', '');
        return style + ' ' + me.getKoValue(config, element, '');
    }
    self.styleTh = function (column) {
        return computeStyle(column, 'th');
    };
    self.styleTd = function (column) {
        return computeStyle(column, 'td');
    };
    self.gridId = ko.pureComputed(function () {
        return self.config.gridId;
    });
    self.event.reload = function () {
        if (me.isArray(config.records)) {
            self.records(config.records);
            if (self.Sort) {
                self.Sort.refresh();
            }
        } else if (me.isFunction(config.records)) {
            config.records(function (data) {
                self.records(data);
                if (self.Sort) {
                    setInterval(function () {
                        self.Sort.refresh();
                    }, 350);
                }
            });
        } else {
            throw 'invalid config.records settings';
        }
    }
    self.event.reload();
};


/**
 * KO BugMe plugins
 */
// based on http://knockoutjs.com/documentation/component-loaders.html#example-2-a-component-loader-that-loads-external-files-using-custom-code
var koTemplateFromUrlLoader = {
    loadTemplate: function (name, templateConfig, callback) {
        if (templateConfig.fromUrl) {
            // Uses jQuery's ajax facility to load the markup from a file
            var fullUrl = 'templates/' + templateConfig.fromUrl;
            $.get(fullUrl, function (markupString) {
                // We need an array of DOM nodes, not a string.
                // We can use the default loader to convert to the
                // required format.
                ko.components.defaultLoader.loadTemplate(name, markupString, callback);
            });
        } else {
            // Unrecognized config format. Let another loader handle it.
            callback(null);
        }
    }
};
// register koTemplateFromUrlLoader
ko.components.loaders.unshift(koTemplateFromUrlLoader);

// different pager layouts/templates
ko.components.register("grid-bootstrap-pager", {
    viewModel: me.grid.pagerViewModel,
	template: {fromUrl: 'grid-bootstrap-pager.htm'}
});
ko.components.register("grid-pager", {
    viewModel: me.grid.pagerViewModel,
	template: {fromUrl: 'grid-pager.htm'}
});

//based on http://blog.vosnax.ru/2013/06/03/Knockoutjs-lazy-template/
ko.lazyTemplate.init({loader: function (name, callback) {
        $.get(name, callback);
	}
});

ko.bindingHandlers.attrIf = {
    update: function (element, valueAccessor, allBindingsAccessor) {
        var h = ko.utils.unwrapObservable(valueAccessor());
        var show = ko.utils.unwrapObservable(h._if);
        if (show) {
            ko.bindingHandlers.attr.update(element, valueAccessor, allBindingsAccessor);
        } else {
            for (var k in h) {
                if (h.hasOwnProperty(k) && k.indexOf("_") !== 0) {
                    $(element).removeAttr(k);
                }
            }
        }
    }
};
ko.bindingHandlers.gridTh = {
    init: function (element, valueAccessor, allBindingsAccessor, data, context) {
        var app = false,
                config = valueAccessor();
        if (data instanceof me.grid.Builder) {
            app = data;
        } else if (context.$parent instanceof me.grid.Builder) {
            app = context.$parent;
        }
        if (!app)
            return;
        element.className += ' ' + app.styleTh(config.col);
        element.innerHTML = app.htmlTH(config.col);
        if (app.Sort && app.fields[config.col]) {
            // add th css classes
            element.className += ' pointer';
            // add sorting behaviour
            $(element).click(function () {
                app.Sort.by(config.col)
            });
        }
    }
};
