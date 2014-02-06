/**********************************************************************
 * ELYCHARTS
 * A Javascript library to generate interactive charts with vectorial graphics.
 *
 * Copyright (c) 2010-2014 Void Labs s.n.c. (http://void.it)
 * Licensed under the MIT (http://creativecommons.org/licenses/MIT/) license.
 **********************************************************************/

(function($) {
if (!$.elycharts)
  $.elycharts = {};

$.elycharts.lastId = 0;

/***********************************************************************
 * INITIALIZATION / MAIN CALL
 **********************************************************************/

$.fn.chart = function($options) {
  if (!this.length)
    return this;
  
  var $env = this.data('elycharts_env');

  if (typeof $options == "string") {
    if ($options.toLowerCase() == "config")
      return $env ? $env.opt : false;
    if ($options.toLowerCase() == "clear") {
      if ($env) {
        if ($.elycharts.featuresmanager) $.elycharts.featuresmanager.clear($env);
        $env.paper.clear();
        $env.cache = false;
        if ($env.autoresize) $(window).unbind('resize', $env.autoresize);
        this.html("");
        this.data('elycharts_env', false);
      }
    }
    return this;
  }
  
  if (!$env) {
    // First call, initialization

    if ($options)
      $options = _extendAndNormalizeOptions($options);
    
    if (!$options || !$options.type || !$.elycharts.templates[$options.type]) {
      alert('ElyCharts ERROR: chart type is not specified');
      return false;
    }
    $env = _initEnv(this, $options);

    this.data('elycharts_env', $env);
  } else {
  	if (!$options) $options = {};
    $options = _normalizeOptions($options, $env.opt);
    
    // Already initialized
    $env.oldopt = common._clone($env.opt);
    $env.opt = $.extend(true, $env.opt, $options);
    $env.newopt = $options;
    $env.oldwidth = $env.width;
    $env.oldheight = $env.height;
    
  }
  
  $env.cache = $options['enableInternalCaching'] ? {} : false;
  
  _processGenericConfig($env, $options);

  if ($env.opt.autoresize) {
  	if (!$env.autoresize) {
  		var that = this;
  		$env.autoresize = _debounce(function() {
  			that.chart();
  		});
  		$(window).bind('resize', $env.autoresize);
  	}
  } else {
  	if ($env.autoresize) {
  		$(window).unbind('resize', $env.autoresize);
  		$env.autoresize = false;
  	}
  }
  
  
  var pieces = $.elycharts[$env.opt.type].draw($env);
  if ($env.pieces) {
    pieces = _updatePieces($env, $env.pieces, pieces);
  }
  common._show($env, pieces);
  $env.pieces = pieces;

  return this;
}

function _updatePieces(env, pieces1, pieces2, section, serie, internal) {
  // Se pieces2 == null deve essere nascosto tutto pieces1
  var newpieces = [], newpiece;
  var j = 0;
  for (var i = 0; i < pieces1.length; i ++) {

    // Se il piece attuale c'e' solo in pieces2 lo riporto nei nuovi, impostando come gia' mostrato
    // A meno che internal = true (siamo in un multipath, nel caso se una cosa non c'e' va considerata da togliere)
    if (pieces2 && (j >= pieces2.length || !common.samePiecePath(pieces1[i], pieces2[j]))) {
      if (!internal) {
        pieces1[i].show = false;
        newpieces.push(pieces1[i]);
      } else {
        newpiece = { path : false, attr : false };
        newpiece.show = true;
        newpiece.animation = {
          element : pieces1[i].element ? pieces1[i].element : false,
          speed : 0,
          easing : '',
          delay : 0
        }
        newpieces.push(newpiece);
      }
    }
    // Bisogna gestire la transizione dal vecchio piece al nuovo
    else {
      newpiece = pieces2 ? pieces2[j] : { path : false, attr : false };
      newpiece.show = true;
      if (typeof pieces1[i].paths == 'undefined') {
        newpiece.animation = {
          element : pieces1[i].element ? pieces1[i].element : false,
          speed : 0,
          easing : '',
          delay : 0
        }
      } else {
        // Multiple path piece
        newpiece.paths = _updatePieces(env, pieces1[i].paths, pieces2[j].paths, pieces1[i].section, pieces1[i].serie, true);
      }
      newpieces.push(newpiece);
      j++;
    }
  }
  // If there are pieces left in pieces2 i must add them unchanged
  if (pieces2)
    for (; j < pieces2.length; j++)
      newpieces.push(pieces2[j]);

  return newpieces;
};


// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
function _debounce(func, threshold, execAsap) {
  var timeout;
  return function debounced () {
    var obj = this, args = arguments;
    function delayed () {
      if (!execAsap) func.apply(obj, args);
      timeout = null; 
    };

    if (timeout) clearTimeout(timeout);
    else if (execAsap) func.apply(obj, args);

    timeout = setTimeout(delayed, threshold || 100); 
  };
}

/**
 * Must be called only in first call to .chart, to initialize elycharts environment.
 */
function _initEnv($container, $options) {
  var $env = {
    id : $.elycharts.lastId ++,
    paper : common._RaphaelInstance($container.get()[0], 0, 0),
    container : $container,
    plots : [],
    opt : $options
  };

  // Rendering a transparent pixel up-left. Thay way SVG area is well-covered (else the position starts at first real object, and that mess-ups everything)
  $env.paper.rect(0,0,1,1).attr({opacity: 0});

  $.elycharts[$options.type].init($env);

  return $env;
}

function _processGenericConfig($env, $options) {
  if ($options.style)
    $env.container.css($options.style);
  $env.width = $options.width ? $options.width : $env.container.width();
  $env.height = $options.height ? $options.height : $env.container.height();
  $env.paper.setSize($env.width, $env.height);
}

/**
 * Must be called in first call to .chart, to build the full config structure and normalize it.
 */
function _extendAndNormalizeOptions($options) {
  var k;
  // Compatibility with old $.elysia_charts.default_options and $.elysia_charts.templates
  if ($.elysia_charts) {
    if ($.elysia_charts.default_options)
      for (k in $.elysia_charts.default_options)
        $.elycharts.templates[k] = $.elysia_charts.default_options[k];
    if ($.elysia_charts.templates)
      for (k in $.elysia_charts.templates)
        $.elycharts.templates[k] = $.elysia_charts.templates[k];
  }

  // TODO Optimize extend cycle
  while ($options.template) {
    var d = $options.template;
    delete $options.template;
    $options = $.extend(true, {}, $.elycharts.templates[d], $options);
  }
  if (!$options.template && $options.type) {
    $options.template = $options.type;
    while ($options.template) {
      d = $options.template;
      delete $options.template;
      $options = $.extend(true, {}, $.elycharts.templates[d], $options);
    }
  }

  return _normalizeOptions($options, $options);
}

/**
 * Normalize options passed (primarly for backward compatibility)
 */
function _normalizeOptions($options, $fullopt) {
  if ($options.type == 'pie' || $options.type == 'funnel') {
    if ($options.values && $.isArray($options.values) && !$.isArray($options.values[0]))
      $options.values = { root : $options.values };
    if ($options.tooltips && $.isArray($options.tooltips) && !$.isArray($options.tooltips[0]))
      $options.tooltips = { root : $options.tooltips };
    if ($options.anchors && $.isArray($options.anchors) && !$.isArray($options.anchors[0]))
      $options.anchors = { root : $options.anchors };
    if ($options.balloons && $.isArray($options.balloons) && !$.isArray($options.balloons[0]))
      $options.balloons = { root : $options.balloons };
    if ($options.legend && $.isArray($options.legend) && !$.isArray($options.legend[0]))
      $options.legend = { root : $options.legend };
  }
  
  if ($options.defaultSeries) {
    var plotType = $options.defaultSeries.type ? $options.defaultSeries.type : ($fullopt.defaultSeries.type ? $fullopt.defaultSeries.type : $fullopt.type);
    _normalizeOptionsSerie($options.defaultSeries, $fullopt.type, plotType, $fullopt);
  }
    
  if ($options.series)
    for (var serie in $options.series) {
      var seriePlotType = $options.series[serie].type ? $options.series[serie].type : ($fullopt.series[serie].type ? $fullopt.series[serie].type : (plotType ? plotType : $fullopt.type));
      _normalizeOptionsSerie($options.series[serie], $fullopt.type, seriePlotType, $fullopt);
    }
    
  if ($options.type == 'line') {
    if (!$options.features)
      $options.features = {};
    if (!$options.features.grid)
      $options.features.grid = {};
  
    if (typeof $options.gridNX != 'undefined') {
      $options.features.grid.nx = $options.gridNX;
      delete $options.gridNX;
    }
    if (typeof $options.gridNY != 'undefined') {
      $options.features.grid.ny = $options.gridNY;
      delete $options.gridNY;
    }
    if (typeof $options.gridProps != 'undefined') {
      $options.features.grid.props = $options.gridProps;
      delete $options.gridProps;
    }
    if (typeof $options.gridExtra != 'undefined') {
      $options.features.grid.extra = $options.gridExtra;
      delete $options.gridExtra;
    }
    if (typeof $options.gridForceBorder != 'undefined') {
      $options.features.grid.forceBorder = $options.gridForceBorder;
      delete $options.gridForceBorder;
    }
    
    if ($options.defaultAxis && $options.defaultAxis.normalize && ($options.defaultAxis.normalize == 'auto' || $options.defaultAxis.normalize == 'autony'))
      $options.defaultAxis.normalize = 2;
    
    if ($options.axis)
      for (var axis in $options.axis)
        if ($options.axis[axis] && $options.axis[axis].normalize && ($options.axis[axis].normalize == 'auto' || $options.axis[axis].normalize == 'autony'))
          $options.axis[axis].normalize = 2;
  }

  return $options;
}


/**
* Manage "color" attribute, the stackedWith legacy and values "color" properties.
* @param $section Section part of external conf passed
* @param $type Chart type
* @param $plotType for line chart can be "line" or "bar", for other types is equal to chart type.
*/
function _normalizeOptionsSerie($section, $type, $plotType, $fullopt) {
  if ($section.stackedWith) {
    $section.stacked = $section.stackedWith;
    delete $section.stackedWith;
  }
}

/***********************************************************************
 * COMMON
 **********************************************************************/

$.elycharts.common = {
  _RaphaelInstance : function(c, w, h) {
    var r = Raphael(c, w, h);

    r.customAttributes.slice = function (cx, cy, r, rint, aa1, aa2) {
      // Method body is for clockwise angles, but parameters passed are ccw
      a1 = 360 - aa2; a2 = 360 - aa1;
      //a1 = aa1; a2 = aa2;
      var flag = (a2 - a1) > 180;
      a1 = (a1 % 360) * Math.PI / 180;
      a2 = (a2 % 360) * Math.PI / 180;
      // a1 == a2  (but they where different before) means that there is a complete round (eg: 0-360). This should be shown
      if (a1 == a2 && aa1 != aa2)
        a2 += 359.99 * Math.PI / 180;
      
      return { path : rint ? [
        ["M", cx + r * Math.cos(a1), cy + r * Math.sin(a1)], 
        ["A", r, r, 0, +flag, 1, cx + r * Math.cos(a2), cy + r * Math.sin(a2)], 
        ["L", cx + rint * Math.cos(a2), cy + rint * Math.sin(a2)], 
        //["L", cx + rint * Math.cos(a1), cy + rint * Math.sin(a1)], 
        ["A", rint, rint, 0, +flag, 0, cx + rint * Math.cos(a1), cy + rint * Math.sin(a1)],
        ["z"]
      ] : [
        ["M", cx, cy], 
        ["l", r * Math.cos(a1), r * Math.sin(a1)], 
        ["A", r, r, 0, +flag, 1, cx + r * Math.cos(a2), cy + r * Math.sin(a2)], 
        ["z"]
      ] };
    };
    
    return r;
  },

  _clone : function(obj){
    if(obj == null || typeof(obj) != 'object')
      return obj;
    if (obj.constructor == Array)
      return [].concat(obj);
    var temp = new obj.constructor(); // changed (twice)
    for(var key in obj)
      temp[key] = this._clone(obj[key]);
    return temp;
  },
  
  compactUnits : function(val, units) {
    for (var i = units.length - 1; i >= 0; i--) {
      var v = val / Math.pow(1000, i + 1);
      //console.warn(i, units[i], v, v * 10 % 10);
      if (v >= 1 && v * 10 % 10 == 0)
        return v + units[i];
    }
    return val;
  },
  
  getElementOriginalAttrs : function(element) {
    var attr = $(element.node).data('original-attr');
    if (!attr) {
      attr = element.attr();
      $(element.node).data('original-attr', attr);
    }
    return attr;
  },
  
  findInPieces : function(pieces, section, serie, index, subsection) {
    for (var i = 0; i < pieces.length; i++) {
      if (
        (typeof section == undefined || section == -1 || section == false || pieces[i].section == section) &&
        (typeof serie == undefined || serie == -1 || serie == false || pieces[i].serie == serie) &&
        (typeof index == undefined || index == -1 || index == false || pieces[i].index == index) &&
        (typeof subsection == undefined || subsection == -1 || subsection == false || pieces[i].subSection == subsection)
      )
        return pieces[i];
    }
    return false;
  },
  
  samePiecePath : function(piece1, piece2) {
    return (((typeof piece1.section == undefined || piece1.section == -1 || piece1.section == false) && (typeof piece2.section == undefined || piece2.section == -1 || piece2.section == false)) || piece1.section == piece2.section) && 
      (((typeof piece1.serie == undefined || piece1.serie == -1 || piece1.serie == false) && (typeof piece2.serie == undefined || piece2.serie == -1 || piece2.serie == false)) || piece1.serie == piece2.serie) && 
      (((typeof piece1.index == undefined || piece1.index == -1 || piece1.index == false) && (typeof piece2.index == undefined || piece2.index == -1 || piece2.index == false)) || piece1.index == piece2.index) && 
      (((typeof piece1.subSection == undefined || piece1.subSection == -1 || piece1.subSection == false) && (typeof piece2.subSection == undefined || piece2.subSection == -1 || piece2.subSection == false)) || piece1.subSection == piece2.subSection);
  },
  
  executeIfChanged : function(env, changes) {
    if (!env.newopt)
      return true;
    
    for (var i = 0; i < changes.length; i++) {
      if (changes[i][changes[i].length - 1] == "*") {
        for (var j in env.newopt)
          if (j.substring(0, changes[i].length - 1) + "*" == changes[i])
            return true;
      }
      else if (changes[i] == 'series' && (env.newopt.series || env.newopt.defaultSeries))
        return true;
      else if (changes[i] == 'axis' && (env.newopt.axis || env.newopt.defaultAxis))
        return true;
      else if (changes[i] == 'width' && (env.oldwidth != env.width))
      	return true;
      else if (changes[i] == 'height' && (env.oldheight != env.height))
      	return true;
      else if (changes[i].substring(0, 9) == "features.") {
        changes[i] = changes[i].substring(9);
        if (env.newopt.features && env.newopt.features[changes[i]])
          return true;
      }
      else if (typeof env.newopt[changes[i]] != 'undefined')
        return true;
    }
    return false;
  },
  
  /**
   * Can be called for a whole serie or for a given index of the serie.
   * returns the color for that item considering valuesPalette, seriesPalette and inheritance
   */
  getItemColor : function(env, serie, index) {
    var props = this.areaProps(env, 'Series', serie, index);
    if (props.color) return props.color;
    if (index !== false && props.valuesPalette) return props.valuesPalette[index % props.valuesPalette.length];
    if (env.opt.seriesPalette) {
      var serieIndex = 0;
      for(seriekey in env.opt.values) {
        if (serie == seriekey) return env.opt.seriesPalette[serieIndex % env.opt.seriesPalette.length];
        else serieIndex++;
      }
    }
  },
  
  /**
   * Given an expandKey as array of array it sets the color to the nested tree unless it is already defined.
   * So [ [ 'parent', 'child' ], [ 'item' ] ] will try to put color in props.parent.child and props.item unless
   * they already exists.
   */
  colorize : function(env, props, expandKeys, color) {
    if (color) {
   	  for (k in expandKeys) {
   	    var p = props;
   	    var i = 0;
   	    for (i = 0; i < expandKeys[k].length - 1; i++) {
   	      if (!p[expandKeys[k][i]]) p[expandKeys[k][i]] = {};
   	      p = p[expandKeys[k][i]];
   	    }
   	    if (!p[expandKeys[k][expandKeys[k].length-1]]) p[expandKeys[k][expandKeys[k].length-1]] = color;
   	  }
    }
  },
  
  /**
   * Ottiene le proprietà di una "Area" definita nella configurazione (options),
   * identificata da section / serie / index / subsection, e facendo il merge
   * di tutti i defaults innestati.
   */
  areaProps : function(env, section, serie, index, subsection) {
    var props;

    var sectionProps = env.opt[section.toLowerCase()];
    // TODO fare una cache e fix del toLowerCase (devono solo fare la prima lettera
    if (!subsection) {
      if (typeof serie == 'undefined' || !serie)
        props = sectionProps;

      else {
    	var cacheKey = section+'/'+serie+'/'+index;
        if (env.cache && env.cache.areaPropsCache && env.cache.areaPropsCache[cacheKey]) {
          props = env.cache.areaPropsCache[cacheKey];
        }
        else {
          props = this._clone(env.opt['default' + section]);
          if (sectionProps && sectionProps[serie])
            props = $.extend(true, props, sectionProps[serie]);

          if ((typeof index != 'undefined') && index >= 0 && props['values'] && props['values'][index])
            props = $.extend(true, props, props['values'][index]);

          if (env.cache) {
            if (!env.cache.areaPropsCache) env.cache.areaPropsCache = {}; 
            env.cache.areaPropsCache[cacheKey] = props;
          }
        }
      }

    } else {
      var subsectionKey = subsection.toLowerCase();
      props = this._clone(env.opt[subsectionKey]);
      
      if (typeof serie == 'undefined' || !serie) {
        if (sectionProps && sectionProps[subsectionKey])
          props = $.extend(true, props, sectionProps[subsectionKey]);

      } else {
        if (env.opt['default' + section] && env.opt['default' + section][subsectionKey])
          props = $.extend(true, props, env.opt['default' + section][subsectionKey]);

        if (sectionProps && sectionProps[serie] && sectionProps[serie][subsectionKey])
          props = $.extend(true, props, sectionProps[serie][subsectionKey]);
        
        if ((typeof index != 'undefined') && index > 0 && props['values'] && props['values'][index])
          props = $.extend(true, props, props['values'][index]);
      }
    }
    
    return props;
  },
  
  _absrectpath : function(x1, y1, x2, y2, r) {
    if (r) {
      // we can use 'a' or 'Q' for the same result.
      var res = [
        ['M',x1,y1+r], ['a', r, r, 0, 0, 1, r, -r], //['Q',x1,y1, x1+r,y1],
        ['L',x2-r,y1], ['a', r, r, 0, 0, 1, r, r], //['Q',x2,y1, x2,y1+r],
        ['L',x2,y2-r], ['a', r, r, 0, 0, 1, -r, r], // ['Q',x2,y2, x2-r,y2],
        ['L',x1+r,y2], ['a', r, r, 0, 0, 1, -r, -r], // ['Q',x1,y2, x1,y2-r],
        ['z']
      ];
      return res;
    } else return [['M', x1, y1], ['L', x1, y2], ['L', x2, y2], ['L', x2, y1], ['z']];
  },
  
  _linepathAnchors : function(p1x, p1y, p2x, p2y, p3x, p3y, rounded) {
    var method = 1;
    if (rounded && rounded.length) {
      method = rounded[1];
      rounded = rounded[0];
    }
    if (!rounded)
      rounded = 1;
    var l1 = (p2x - p1x) / 2,
        l2 = (p3x - p2x) / 2,
        a = Math.atan(Math.abs(p2x - p1x) / Math.abs(p2y - p1y)),
        b = Math.atan(Math.abs(p3x - p2x) / Math.abs(p2y - p3y));
    a = (p1y < p2y && p2x > p1x) || (p1y > p2y && p2x < p1x) ? Math.PI - a : a;
    b = (p3y < p2y && p3x > p2x) || (p3y > p2y && p3x < p2x) ? Math.PI - b : b;
    if (method == 2) {
      // If added by Bago to avoid curves beyond min or max
      if ((a - Math.PI / 2) * (b - Math.PI / 2) > 0) {
        a = 0;
        b = 0;
      } else {
        if (Math.abs(a - Math.PI / 2) < Math.abs(b - Math.PI / 2))
          b = Math.PI - a;
        else
          a = Math.PI - b;
      }
    }

    var alpha = Math.PI / 2 - ((a + b) % (Math.PI * 2)) / 2,
        dx1 = l1 * Math.sin(alpha + a) / 2 / rounded,
        dy1 = l1 * Math.cos(alpha + a) / 2 / rounded,
        dx2 = l2 * Math.sin(alpha + b) / 2 / rounded,
        dy2 = l2 * Math.cos(alpha + b) / 2 / rounded;
    return {
      x1: p2x - dx1,
      y1: p2y + dy1,
      x2: p2x + dx2,
      y2: p2y + dy2
    };
  },
  
  _linepath : function ( points, rounded ) {
    var path = [];
    if (rounded) {
      var anc = false;
      for (var j = 0, jj = points.length; j < jj ; j++) {
        var x = points[j][0], y = points[j][1];
        if (x != null && y != null) {
          if (anc) {
            if (j + 1 != jj && points[j + 1][0] != null && points[j + 1][1] != null) {
              var a = this._linepathAnchors(points[j - 1][0], points[j - 1][1], points[j][0], points[j][1], points[j + 1][0], points[j + 1][1], rounded);
              path.push([ "C", anc[0], anc[1], a.x1, a.y1, points[j][0], points[j][1] ]);
              // path.push([ "M", anc[0], anc[1] ]);
              // path.push([ "L", a.x1, a.y1 ]);
              // path.push([ "M", points[j][0], points[j][1] ]);
              anc = [ a.x2, a.y2 ];
            } else {
              path.push([ "C", anc[0], anc[1], points[j][0], points[j][1], points[j][0], points[j][1] ]);
              anc = [ points[j][0], points[j][1] ];
            }
          } else {
            path.push([ "M", points[j][0], points[j][1] ]);
            anc = [ points[j][0], points[j][1] ];
          }
        } else anc = false;
      }
      
    } else {
      var prevx = null;
      var prevy = null;
      for (var i = 0; i < points.length; i++) {
        var x = points[i][0], y = points[i][1];
        if (x != null && y != null) {
        	path.push([prevx == null || prevy == null ? "M" : "L", x, y]);
        }
        prevx = x;
        prevy = y;
      }
    }
    
    return path;
  },

  _lineareapath : function (points1, points2, rounded) {
    var path = this._linepath(points1, rounded);
    var path2 = this._linepath(points2.reverse(), rounded);
    var finalPath = [];
    var firstPushed = null;
    for (var i = 0; i <= path.length; i++) {
      if (i == path.length || path[i][0] == "M") {
    	  if (firstPushed != null) {
    		for (var j = path.length - i; j <= path.length - firstPushed; j++) {
      		  if (path2[j][0] == "M") finalPath.push([ "L", path2[j][1], path2[j][2] ]);
      		  else finalPath.push(path2[j]);
    		}
    		finalPath.push(['z']);
    	    firstPushed = null;
    	  }
    	  if (i != path.length) finalPath.push(path[i]);
      } else {
    	  finalPath.push(path[i]);
    	  if (firstPushed == null) firstPushed = i;
      }
    }
    return finalPath;
  },
  
  /**
   * Prende la coordinata X di un passo di un path
   */
  getX : function(p, pos) {
    switch (p[0]) {
      case 'CIRCLE':
        return p[1];
      case 'RECT':
        return p[!pos ? 1 : 3];
      case 'SLICE':
        return p[1];
      default:
        return p[p.length - 2];
    }
  },

  /**
   * Prende la coordinata Y di un passo di un path
   */
  getY : function(p, pos) {
    switch (p[0]) {
      case 'CIRCLE':
        return p[2];
      case 'RECT':
        return p[!pos ? 2 : 4];
      case 'SLICE':
        return p[2];
      default:
        return p[p.length - 1];
    }
  },
  
  /**
   * Prende il centro di un path
   * 
   * @param offset un offset [x,y] da applicare. Da notare che gli assi potrebbero essere dipendenti dalla figura 
   *        (ad esempio per lo SLICE x e' l'asse che passa dal centro del cerchio, y l'ortogonale).
   */
  getCenter: function(path, offset) {
    if (!path.path)
      return false;
    if (path.path.length == 0)
      return false;
    if (!offset)
      offset = [0, 0];
      
    if (path.center)
      return [path.center[0] + offset[0], path.center[1] + offset[1]];
      
    var p = path.path[0];
    switch (p[0]) {
      case 'CIRCLE':
        return [p[1] + offset[0], p[2] + offset[1]];
      case 'RECT':
        return [(p[1] + p[2])/2 + offset[0], (p[3] + p[4])/2 + offset[1]];
      case 'SLICE':
        var popangle = p[5] + (p[6] - p[5]) / 2;
        var rad = Math.PI / 180;
        return [
          p[1] + (p[4] + ((p[3] - p[4]) / 2) + offset[0]) * Math.cos(-popangle * rad) + offset[1] * Math.cos((-popangle-90) * rad), 
          p[2] + (p[4] + ((p[3] - p[4]) / 2) + offset[0]) * Math.sin(-popangle * rad) + offset[1] * Math.sin((-popangle-90) * rad)
        ];
    }
    
    // WARN Complex paths not supported
    alert('ElyCharts: getCenter with complex path not supported');
    
    return false;
  },
  
  /**
   * Sposta il path passato di un offset [x,y]
   * Il risultato e' il nuovo path
   * 
   * @param offset un offset [x,y] da applicare. Da notare che gli assi potrebbero essere dipendenti dalla figura 
   *        (ad esempio per lo SLICE x e' l'asse che passa dal centro del cerchio, y l'ortogonale).
   * @param marginlimit se true non sposta oltre i margini del grafico (applicabile solo su path standard o RECT)
   * @param simple se true lo spostamento e' sempre fatto sul sistema [x, y] complessivo (altrimenti alcuni elementi, come lo SLICE,
   *        si muovono sul proprio sistema di coordinate - la x muove lungo il raggio e la y lungo l'ortogonale)
   */
  movePath : function(env, path, offset, marginlimit, simple) {
    var p = [], i;
    if (path.length == 1 && path[0][0] == 'RECT')
      return [ [path[0][0], this._movePathX(env, path[0][1], offset[0], marginlimit), this._movePathY(env, path[0][2], offset[1], marginlimit), this._movePathX(env, path[0][3], offset[0], marginlimit), this._movePathY(env, path[0][4], offset[1], marginlimit), path[0][5]] ];
    if (path.length == 1 && path[0][0] == 'SLICE') {
      if (!simple) {
        var popangle = path[0][5] + (path[0][6] - path[0][5]) / 2;
        var rad = Math.PI / 180;
        var x = path[0][1] + offset[0] * Math.cos(- popangle * rad) + offset[1] * Math.cos((-popangle-90) * rad);
        var y = path[0][2] + offset[0] * Math.sin(- popangle * rad) + offset[1] * Math.cos((-popangle-90) * rad);
        return [ [path[0][0], x, y, path[0][3], path[0][4], path[0][5], path[0][6] ] ];
      }
      else
        return [ [ path[0][0], path[0][1] + offset[0], path[0][2] + offset[1], path[0][3], path[0][4], path[0][5], path[0][6] ] ];
    }
    if (path.length == 1 && path[0][0] == 'CIRCLE')
      return [ [ path[0][0], path[0][1] + offset[0], path[0][2] + offset[1], path[0][3] ] ];
    if (path.length == 1 && path[0][0] == 'TEXT')
      return [ [ path[0][0], path[0][1], path[0][2] + offset[0], path[0][3] + offset[1] ] ];
    if (path.length == 1 && path[0][0] == 'LINE') {
      for (i = 0; i < path[0][1].length; i++)
        p.push( [ this._movePathX(env, path[0][1][i][0], offset[0], marginlimit), this._movePathY(env, path[0][1][i][1], offset[1], marginlimit) ] );
      return [ [ path[0][0], p, path[0][2] ] ];
    }
    if (path.length == 1 && path[0][0] == 'LINEAREA') {
      for (i = 0; i < path[0][1].length; i++)
        p.push( [ this._movePathX(env, path[0][1][i][0], offset[0], marginlimit), this._movePathY(env, path[0][1][i][1], offset[1], marginlimit) ] );
      var pp = [];
      for (i = 0; i < path[0][2].length; i++)
        pp.push( [ this._movePathX(env, path[0][2][i][0], offset[0], marginlimit), this._movePathY(env, path[0][2][i][1], offset[1], marginlimit) ] );
      return [ [ path[0][0], p, pp, path[0][3] ] ];
    }

    var newpath = [];
    // http://www.w3.org/TR/SVG/paths.html#PathData
    for (var j = 0; j < path.length; j++) {
      var o = path[j];
      switch (o[0]) {
        // TODO the translation for lowercase actions are all wrong!
        // relative movements do not need to be adjusted for moving (or at most, only the first one have to).
        // TODO relative movements this way cannot be forced to stay in marginlimit!
        case 'M': case 'm': case 'L': case 'l': case 'T': case 't':
          // (x y)+
          newpath.push([o[0], this._movePathX(env, o[1], offset[0], marginlimit), this._movePathY(env, o[2], offset[1], marginlimit)]);
          break;
        case 'A': case 'a':
          // (rx ry x-axis-rotation large-arc-flag sweep-flag x y)+
          newpath.push([o[0], o[1], o[2], o[3], o[4], o[5], this._movePathX(env, o[6], offset[0], marginlimit), this._movePathY(env, o[7], offset[1], marginlimit)]);
          break;
        case 'C': case 'c':
          // Fixed for uppercase C in 2.1.5
          // (x1 y1 x2 y2 x y)+
          newpath.push([o[0], 
            this._movePathX(env, o[1], offset[0], marginlimit), this._movePathY(env, o[2], offset[1], marginlimit),
            this._movePathX(env, o[3], offset[0], marginlimit), this._movePathY(env, o[4], offset[1], marginlimit),
            this._movePathX(env, o[5], offset[0], marginlimit), this._movePathY(env, o[6], offset[1], marginlimit)
          ]);
          break;
        case 'S': case 's': case 'Q': case 'q':
          // Fixed for uppercase Q in 2.1.5
          // (x1 y1 x y)+
          // newpath.push([o[0], o[1], o[2], this._movePathX(env, o[3], offset[0], marginlimit), this._movePathY(env, o[4], offset[1], marginlimit)]);
          newpath.push([o[0], 
            this._movePathX(env, o[1], offset[0], marginlimit), this._movePathY(env, o[2], offset[1], marginlimit), 
            this._movePathX(env, o[3], offset[0], marginlimit), this._movePathY(env, o[4], offset[1], marginlimit)
          ]);
          break;
        case 'z': case 'Z':
          newpath.push([o[0]]);
          break;
      }
    }
    
    return newpath;
  },
  
  _movePathX : function(env, x, dx, marginlimit) {
    if (x == null) return null;
    if (!marginlimit)
      return x + dx;
    x = x + dx;
    return dx > 0 && x > env.width - env.opt.margins[1] ? env.width - env.opt.margins[1] : (dx < 0 && x < env.opt.margins[3] ? env.opt.margins[3] : x);
  },
  
  _movePathY : function(env, y, dy, marginlimit) {
    if (y == null) return null;
    if (!marginlimit)
      return y + dy;
    y = y + dy;
    return dy > 0 && y > env.height - env.opt.margins[2] ? env.height - env.opt.margins[2] : (dy < 0 && y < env.opt.margins[0] ? env.opt.margins[0] : y);
  },

  /**
   * Ritorna le proprieta SVG da impostare per visualizzare il path non SVG passato (se applicabile, per CIRCLE e TEXT non lo e')
   */
  getSVGProps : function(env, origPath, prevprops) {
    var path = this._preparePathShow(env, origPath);
    var props = prevprops ? prevprops : {};
    var type = 'path', value;

    if (path.length == 1 && path[0][0] == 'RECT')
      value = common._absrectpath(path[0][1], path[0][2], path[0][3], path[0][4], path[0][5]);
    else if (path.length == 1 && path[0][0] == 'SLICE') {
      type = 'slice';
      value = [ path[0][1], path[0][2], path[0][3], path[0][4], path[0][5], path[0][6] ];
    } else if (path.length == 1 && path[0][0] == 'LINE')
      value = common._linepath( path[0][1], path[0][2] );
    else if (path.length == 1 && path[0][0] == 'LINEAREA')
      value = common._lineareapath( path[0][1], path[0][2], path[0][3] );
    else if (path.length == 1 && (path[0][0] == 'CIRCLE' || path[0][0] == 'TEXT' || path[0][0] == 'DOMELEMENT' || path[0][0] == 'RELEMENT'))
      return prevprops ? prevprops : false;
    else
      value = path;

    if (type != 'path' || (value && value.length > 0))
      props[type] = value;
    else if (!prevprops)
      return false;
    return props;
  },
  
  /**
   * Disegna il path passato
   * Gestisce la feature pixelWorkAround
   */
  showPath : function(env, path, paper) {
    
    if (!paper)
      paper = env.paper;
    if (path.length == 1 && path[0][0] == 'CIRCLE') {
      path = this._preparePathShow(env, path);
      return paper.circle(path[0][1], path[0][2], path[0][3]);
    }
    if (path.length == 1 && path[0][0] == 'TEXT') {
      path = this._preparePathShow(env, path);
      return paper.text(path[0][2], path[0][3], path[0][1]);
    }

    var props = this.getSVGProps(env, path);

    // Props must be with some data in it
    var hasdata = false;
    for (var k in props) {
      hasdata = true;
      break;
    }
    return props && hasdata ? paper.path().attr(props) : false;
  },
  
  /**
   * Applica al path le modifiche per poterlo visualizzare
   * Per ora applica solo pixelWorkAround
   */
  _preparePathShow : function(env, path) {
    return env.opt.features.pixelWorkAround.active ? this.movePath(env, this._clone(path), [.5, .5], false, true) : path;
  },
  
  /**
   * Ritorna gli attributi Raphael completi di un piece
   * Per attributi completi si intende l'insieme di attributi specificato, 
   * assieme a tutti gli attributi calcolati che determinano lo stato 
   * iniziale di un piece (e permettono di farlo ritornare a tale stato).
   * In genere viene aggiunto il path SVG, per il circle vengono aggiunti
   * i dati x,y,r
   */
  getPieceFullAttr : function(env, piece) {
    if (!piece.fullattr) {
      piece.fullattr = this._clone(piece.attr);
      if (piece.path)
        switch (piece.path[0][0]) {
          case 'CIRCLE':
            var ppath = this._preparePathShow(env, piece.path);
            piece.fullattr.cx = ppath[0][1];
            piece.fullattr.cy = ppath[0][2];
            piece.fullattr.r = ppath[0][3];
            break;
          case 'TEXT': case 'DOMELEMENT': case 'RELEMENT':
            break;
          default:
            piece.fullattr = this.getSVGProps(env, piece.path, piece.fullattr);
        }
      if (typeof piece.fullattr.opacity == 'undefined')
        piece.fullattr.opacity = 1;
    }
    return piece.fullattr;
  },


  _show : function(env, origPieces) {
    if ($.elycharts.featuresmanager) $.elycharts.featuresmanager.beforeShow(env, origPieces);
    
    pieces = this._getSortedPathData(origPieces);

    this._animationStackStart(env);

    var previousElement = false;
    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i];
      if ((typeof piece.show == 'undefined' || piece.show) && (typeof piece.parent == 'undefined' || typeof piece.parent.show == 'undefined' || piece.parent.show)) {
        // If there is piece.animation.element, this is the old element that must be transformed to the new one
        piece.element = piece.animation && piece.animation.element ? piece.animation.element : false;
        piece.hide = false;

        if (!piece.path) {
          // Element should not be shown or must be hidden: nothing to prepare
          piece.hide = true;

        } else if (piece.path.length == 1 && piece.path[0][0] == 'TEXT') {
          // TEXT
          // Animation is not supported, so if there's an old element i must hide it (with force = true to hide it for sure, even if there's a new version of same element)
          if (piece.element) {
            common.animationStackPush(env, piece, piece.element, false, piece.animation.speed, piece.animation.easing, piece.animation.delay, true);
            piece.animation.element = false;
          }
          piece.element = this.showPath(env, piece.path);
          // If this is a transition i must position new element
          if (piece.element && env.newopt && previousElement)
            piece.element.insertAfter(previousElement);

        } else if (piece.path.length == 1 && piece.path[0][0] == 'DOMELEMENT') {
          // DOMELEMENT
          // Already shown
          // Animation not supported

        } else if (piece.path.length == 1 && piece.path[0][0] == 'RELEMENT') {
          // RAPHAEL ELEMENT
          // Already shown
          // Animation is not supported, so if there's an old element i must hide it (with force = true to hide it for sure, even if there's a new version of same element)
          if (piece.element) {
            common.animationStackPush(env, piece, piece.element, false, piece.animation.speed, piece.animation.easing, piece.animation.delay, true);
            piece.animation.element = false;
          }

          piece.element = piece.path[0][1];
          if (piece.element && previousElement)
            piece.element.insertAfter(previousElement);
          piece.attr = false;

        } else {
          // OTHERS
          if (!piece.element) {
            if (piece.animation && piece.animation.startPath && piece.animation.startPath.length)
              piece.element = this.showPath(env, piece.animation.startPath);
            else
              piece.element = this.showPath(env, piece.path);

            // If this is a transition i must position new element
            if (piece.element && env.newopt && previousElement)
              piece.element.insertAfter(previousElement);
          }
        }

        if (piece.element) {
          if (piece.attr) {
            if (!piece.animation) {
              // Standard piece visualization
              if (typeof piece.attr.opacity == 'undefined')
                piece.attr.opacity = 1;
              piece.element.attr(piece.attr);

            } else {
              // Piece animation
              if (!piece.animation.element)
                piece.element.attr(piece.animation.startAttr ? piece.animation.startAttr : piece.attr);
              //if (typeof animationAttr.opacity == 'undefined')
              //  animationAttr.opacity = 1;
              common.animationStackPush(env, piece, piece.element, this.getPieceFullAttr(env, piece), piece.animation.speed, piece.animation.easing, piece.animation.delay);
            }
          } else if (piece.hide)
            // Hide the piece
            common.animationStackPush(env, piece, piece.element, false, piece.animation.speed, piece.animation.easing, piece.animation.delay);

          previousElement = piece.element;
        }
      }
    }

    this._animationStackEnd(env);
    
    if ($.elycharts.featuresmanager) $.elycharts.featuresmanager.afterShow(env, origPieces);
  },

  /**
   * Given an array of pieces, return an array of single pathdata contained in pieces, sorted by zindex
   */
  _getSortedPathData : function(pieces) {
    res = [];

    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i];
      if (piece.paths) {
        for (var j = 0; j < piece.paths.length; j++) {
          piece.paths[j].pos = res.length;
          piece.paths[j].parent = piece;
          res.push(piece.paths[j]);
        }
      } else {
        piece.pos = res.length;
        piece.parent = false;
        res.push(piece);
      }
    }
    return res.sort(function (a, b) {
      var za = typeof a.attr == 'undefined' || typeof a.attr.zindex == 'undefined' ? ( !a.parent || typeof a.parent.attr == 'undefined' || typeof a.parent.attr.zindex == 'undefined' ? 0 : a.parent.attr.zindex ) : a.attr.zindex;
      var zb = typeof b.attr == 'undefined' || typeof b.attr.zindex == 'undefined' ? ( !b.parent || typeof b.parent.attr == 'undefined' || typeof b.parent.attr.zindex == 'undefined' ? 0 : b.parent.attr.zindex ) : b.attr.zindex;
      return za < zb ? -1 : (za > zb ? 1 : (a.pos < b.pos ? -1 : (a.pos > b.pos ? 1 : 0)));
    });
  },

  _animationStackStart : function(env) {
    if (!env.animationStackDepth || env.animationStackDepth == 0) {
      env.animationStackDepth = 0;
      env.animationStack = {};
    }
    env.animationStackDepth ++;
  },

  _animationStackEnd : function(env) {
    env.animationStackDepth --;
    if (env.animationStackDepth == 0) {
      for (var delay in env.animationStack) {
        this._animationStackAnimate(env.animationStack[delay], delay);
        delete env.animationStack[delay];
      }
      env.animationStack = {};
    }
  },

  /**
   * Inserisce l'animazione richiesta nello stack di animazioni.
   * Nel caso lo stack non sia inizializzato esegue subito l'animazione.
   */ 
  animationStackPush : function(env, piece, element, newattr, speed, easing, delay, force) {
    if (typeof delay == 'undefined')
      delay = 0;

    if (!env.animationStackDepth || env.animationStackDepth == 0) {
      this._animationStackAnimate([{piece : piece, object : element, props : newattr, speed: speed, easing : easing, force : force}], delay);

    } else {
      if (!env.animationStack[delay])
        env.animationStack[delay] = [];
      
      env.animationStack[delay].push({piece : piece, object : element, props : newattr, speed: speed, easing : easing, force : force});
    }
  },
  
  _animationStackAnimate : function(stack, delay) {
    var caller = this;
    var func = function() {
      var a = stack.pop();
      var anim = caller._animationStackAnimateElement(a);
      
      while (stack.length > 0) {
        var b = stack.pop();
        caller._animationStackAnimateElement(b, a, anim);
      }
    }
    if (delay > 0) 
      setTimeout(func, delay);
    else
      func();
  },
  
  _animationStackAnimateElement : function (a, awith, awithanim) {
    //console.warn('call', a.piece.animationInProgress, a.force, a.piece.path, a.piece);

    if (a.force || !a.piece.animationInProgress) {
      
      // Metodo non documentato per bloccare l'animazione corrente
      a.object.stop();
      if (!a.props)
        a.props = { opacity : 0 }; // TODO Sarebbe da rimuovere l'elemento alla fine
        
      if (!a.speed || a.speed <= 0) {
        //console.warn('direct');
        a.object.attr(a.props);
        a.piece.animationInProgress = false;
        return;
      }
        
      a.piece.animationInProgress = true;
      //console.warn('START', a.piece.animationInProgress, a.piece.path, a.piece);
        
      // NOTA onEnd non viene chiamato se l'animazione viene bloccata con stop
      var onEnd = function() { 
        //console.warn('END', a.piece.animationInProgress, a.piece); 
        a.piece.animationInProgress = false 
      }
      
      if (Raphael.animation) {
      	var anim = Raphael.animation(a.props, a.speed, a.easing ? a.easing : 'linear', onEnd);
        if (awith) {
          // console.warn('animateWith', awith, awithanim, anim);
          a.object.animateWith(awith, awithanim, anim);
        } else {
      	  // console.warn('animate', anim);
          a.object.animate(anim);
        }
      	return anim;
      } else {
        if (awith) {
          // console.warn('animateWith', awith, awithanim, anim);
          a.object.animateWith(awith, a.props, a.speed, a.easing ? a.easing : 'linear', onEnd);
        } else {
      	  // console.warn('animate', anim);
          a.object.animate(a.props, a.speed, a.easing ? a.easing : 'linear', onEnd);
        }
        return null;
      }
    }
    //else console.warn('SKIP', a.piece.animationInProgress, a.piece.path, a.piece);
    return null;
  }
}

var common = $.elycharts.common;

/***********************************************************************
 * FEATURESMANAGER
 **********************************************************************/

$.elycharts.featuresmanager = {
  
  managers : [],
  initialized : false,
  
  register : function(manager, priority) {
    $.elycharts.featuresmanager.managers.push([priority, manager]);
    $.elycharts.featuresmanager.initialized = false;
  },
  
  init : function() {
    $.elycharts.featuresmanager.managers.sort(function(a, b) { return a[0] < b[0] ? -1 : (a[0] == b[0] ? 0 : 1) });
    $.elycharts.featuresmanager.initialized = true;
  },
  
  clear : function(env) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    // reverse cycle over manager
    for (var i = $.elycharts.featuresmanager.managers.length - 1; i >= 0; i--)
      if ($.elycharts.featuresmanager.managers[i][1].clear)
        $.elycharts.featuresmanager.managers[i][1].clear(env);
  },
  
  beforeShow : function(env, pieces) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    for (var i = 0; i < $.elycharts.featuresmanager.managers.length; i++)
      if ($.elycharts.featuresmanager.managers[i][1].beforeShow)
        $.elycharts.featuresmanager.managers[i][1].beforeShow(env, pieces);
  },
  
  afterShow : function(env, pieces) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    for (var i = 0; i < $.elycharts.featuresmanager.managers.length; i++)
      if ($.elycharts.featuresmanager.managers[i][1].afterShow)
        $.elycharts.featuresmanager.managers[i][1].afterShow(env, pieces);
  },

  onMouseOver : function(env, serie, index, mouseAreaData) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    for (var i = 0; i < $.elycharts.featuresmanager.managers.length; i++)
      if ($.elycharts.featuresmanager.managers[i][1].onMouseOver)
        $.elycharts.featuresmanager.managers[i][1].onMouseOver(env, serie, index, mouseAreaData);
  },
  
  onMouseOut : function(env, serie, index, mouseAreaData) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    for (var i = 0; i < $.elycharts.featuresmanager.managers.length; i++)
      if ($.elycharts.featuresmanager.managers[i][1].onMouseOut)
        $.elycharts.featuresmanager.managers[i][1].onMouseOut(env, serie, index, mouseAreaData);
  },
  
  onMouseEnter : function(env, serie, index, mouseAreaData) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    for (var i = 0; i < $.elycharts.featuresmanager.managers.length; i++)
      if ($.elycharts.featuresmanager.managers[i][1].onMouseEnter)
        $.elycharts.featuresmanager.managers[i][1].onMouseEnter(env, serie, index, mouseAreaData);
  },
  
  onMouseChanged : function(env, serie, index, mouseAreaData) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    for (var i = 0; i < $.elycharts.featuresmanager.managers.length; i++)
      if ($.elycharts.featuresmanager.managers[i][1].onMouseChanged)
        $.elycharts.featuresmanager.managers[i][1].onMouseChanged(env, serie, index, mouseAreaData);
  },
  
  onMouseExit : function(env, serie, index, mouseAreaData) {
    if (!$.elycharts.featuresmanager.initialized)
      this.init();
    for (var i = 0; i < $.elycharts.featuresmanager.managers.length; i++)
      if ($.elycharts.featuresmanager.managers[i][1].onMouseExit)
        $.elycharts.featuresmanager.managers[i][1].onMouseExit(env, serie, index, mouseAreaData);
  }
}

})(jQuery);

/***********************************************

* OGGETTI USATI:

PIECE:
Contiene un elemento da visualizzare nel grafico. E' un oggetto con queste proprietà:

- section,[serie],[index],[subsection]: Dati che permettono di identificare che tipo
  di elemento è e a quale blocco della configurazione appartiene.
  Ad esempio gli elementi principali del chart hanno
  section="Series", serie=nome della serie, subSection = 'Plot'
- [paths]: Contiene un array di pathdata, nel caso questo piece è costituito da 
  piu' sottoelementi (ad esempio i Dots, o gli elementi di un Pie o Funnel)
- [PATHDATA.*]: Se questo piece e' costituito da un solo elemento, i suoi dati sono
  memorizzati direttamente nella root di PIECE.
- show: Proprieta' usata internamente per decidere se questo piece dovrà essere
  visualizzato o meno (in genere nel caso di una transizione che non ha variato
  questo piece, che quindi puo' essere lasciato allo stato precedente)
- hide: Proprieta' usata internamente per decidere se l'elemento va nascosto,
  usato in caso di transizione se l'elemento non è piu' presente.

PATHDATA:
I dati utili per visualizzare un path nel canvas:

- PATH: Il path che permette di disegnare l'elemento. Se NULL l'elemento è vuoto/ da
  non visualizzare (instanziato solo come placeholder)
- attr: gli attributi Raphael dell'elemento. NULL se path è NULL.
- [center]: centro del path
- [rect]: rettangolo che include il path

PATH:
Un array in cui ogni elemento determina un passo del percorso per disegnare il grafico.
E' una astrazione sul PATH SVG effettivo, e puo' avere alcuni valori speciali:
[ [ 'TEXT',  testo, x, y ] ]
[ [ 'CIRCLE', x, y, raggio ] ]
[ [ 'RECT', x1, y1, x2, y2, rounded ] ] (x1,y1 dovrebbero essere sempre le coordinate in alto a sx)
[ [ 'SLICE', x, y, raggio, raggio int, angolo1, angolo2 ] ] (gli angoli sono in gradi)
[ [ 'RELEMENT', element ] ] (elemento Raphael gia' disegnato)
[ [ 'DOMELEMENT', element ] ] (elemento DOM - in genere un DIV html - già disegnato)
[ ... Path SVG ... ]

------------------------------------------------------------------------

Z-INDEX:
0 : base
10 : tooltip
20 : interactive area (tutti gli elementi innescati dalla interactive area dovrebbero essere < 20)
25 : label / balloons (potrebbero essere resi cliccabili dall'esterno, quindi > 20)

------------------------------------------------------------------------

USEFUL RESOURCES:

http://docs.jquery.com/Plugins/Authoring
http://www.learningjquery.com/2007/10/a-plugin-development-pattern
http://dean.edwards.name/packer/2/usage/#special-chars

http://raphaeljs.com/reference.html#attr

TODO
* ottimizzare common.areaProps
* rifare la posizione del tooltip del pie
* ripristinare shadow

*********************************************/
