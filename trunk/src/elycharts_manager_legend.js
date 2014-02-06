/**********************************************************************
 * ELYCHARTS
 * A Javascript library to generate interactive charts with vectorial graphics.
 *
 * Copyright (c) 2010-2014 Void Labs s.n.c. (http://void.it)
 * Licensed under the MIT (http://creativecommons.org/licenses/MIT/) license.
 **********************************************************************/

(function($) {

var common = $.elycharts.common;

/***********************************************************************
 * FEATURE: LEGEND
 **********************************************************************/

$.elycharts.legendmanager = {
  
  afterShow : function(env, pieces) {
	// TODO the whole thing should simply return "pieces" whose visibility is handled by core, so to enable animations and
    // make things more generic.
    if (env.legenditems) {
    	for (item in env.legenditems) {
    		env.legenditems[item].remove();
    	}
    	env.legenditems = false;
    }
    if (!env.opt.legend || env.opt.legend.length == 0)
      return;

    var props = env.opt.features.legend;
    
    if (props === false) return;

    var propsx = props.x;
    if (propsx == 'auto') {
      var autox = 1;
      propsx = 0;
    }
    var propswidth = props.width;
    if (propswidth == 'auto') {
      var autowidth = 1;
      propswidth = env.width;
    }

    var wauto = 0;
    var items = [];
    // env.opt.legend normalmente è { serie : 'Legend', ... }, per i pie invece { serie : ['Legend', ...], ... }
    var legendCount = 0;
    var serie, data, h, w, x, y, xd;
    for (serie in env.opt.legend) {
      if (env.opt.type != 'pie')
        legendCount ++;
      else
        legendCount += env.opt.legend[serie].length;
    }
    var i = 0;
    for (serie in env.opt.legend) {
      if (env.opt.type != 'pie')
        data = [ env.opt.legend[serie] ];
      else
        data = env.opt.legend[serie];

      for (var j = 0; j < data.length; j++) {
        var sprops = common.areaProps(env, 'Series', serie, env.opt.type == 'pie' ? j : false);
        var computedProps = $.extend(true, {}, props);

        if (sprops.legend)
            computedProps = $.extend(true, computedProps, sprops.legend);
        
        var color = common.getItemColor(env, serie, env.opt.type == 'pie' ? j : false);
        if (color) {
          common.colorize(env, computedProps, [['dotProps', 'fill']], color);
        }

        // legacy support for legend dot color inherited from pie "fill"
        // TODO maybe we should simply remove this and leave the "color" support only
        if (!computedProps.dotProps.fill && env.opt.type == 'pie') {
          if (sprops.plotProps && sprops.plotProps.fill)
            computedProps.dotProps.fill = sprops.plotProps.fill;
        }
        
        var hMargin = props.margins ? props.margins[0] + props.margins[2] : 0;
        var wMargin = props.margins ? props.margins[1] + props.margins[3] : 0;
        var tMargin = props.margins ? props.margins[0] : 0;
        var lMargin = props.margins ? props.margins[3] : 0;
        
        if (!props.horizontal) {
          // Posizione dell'angolo in alto a sinistra
          h = (props.height - hMargin) / legendCount;
          w = propswidth - wMargin;
          x = Math.floor(propsx + lMargin);
          y = Math.floor(props.y + tMargin + h * i);
        } else {
          h = props.height - hMargin;
          if (!props.itemWidth || props.itemWidth == 'fixed') {
            w = (propswidth - wMargin) / legendCount;
            x = Math.floor(propsx + lMargin + w * i);
          } else {
            w = (propswidth - wMargin) - wauto;
            x = propsx + lMargin + wauto;
          }
          y = Math.floor(props.y + tMargin);
        }
        
        if (computedProps.dotType == "rect") {
          items.push(common.showPath(env, [ [ 'RECT', props.dotMargins[0] + x, y + Math.floor((h - computedProps.dotHeight) / 2), props.dotMargins[0] + x + computedProps.dotWidth, y + Math.floor((h - computedProps.dotHeight) / 2) + computedProps.dotHeight, computedProps.dotR ] ]).attr(computedProps.dotProps));
          xd = props.dotMargins[0] + computedProps.dotWidth + props.dotMargins[1];
        } else if (computedProps.dotType == "circle") {
          items.push(common.showPath(env, [ [ 'CIRCLE', props.dotMargins[0] + x + computedProps.dotR, y + (h / 2), computedProps.dotR ] ]).attr(computedProps.dotProps));
          xd = props.dotMargins[0] + computedProps.dotR * 2 + props.dotMargins[1];
        }
        
        var text = data[j];
        var t = common.showPath(env, [ [ 'TEXT', text, x + xd, y + Math.ceil(h / 2) + (Raphael.VML ? 2 : 0) ] ]).attr({"text-anchor" : "start"}).attr(computedProps.textProps); //.hide();
        items.push(t);
        while (t.getBBox().width > (w - xd) && t.getBBox().width > 10) {
          text = text.substring(0, text.length - 1);
          t.attr({text : text});
        }
        t.show();
        
        if (props.horizontal && props.itemWidth == 'auto')
          wauto += xd + t.getBBox().width + 4;
        else if (!props.horizontal && autowidth)
          wauto = t.getBBox().width + xd > wauto ? t.getBBox().width + xd : wauto;
        else
          wauto += w;

        i++;
      }
    }
      
    if (autowidth)
      propswidth = wauto + props.margins[3] + props.margins[1] - 1;
    if (autox) {
      propsx = Math.floor((env.width - propswidth) / 2);
      for (i in items) {
        if (items[i].attrs.x)
          items[i].attr('x', items[i].attrs.x + propsx);
        else
          items[i].attr('path', common.movePath(env, items[i].attrs.path, [propsx, 0]));
      }
    }
    var borderPath = [ [ 'RECT', propsx, props.y, propsx + propswidth, props.y + props.height, props.r ] ];
    var border = common.showPath(env, borderPath).attr(props.borderProps);
    items.push(border);
    env.legenditems = items;
  }
}

$.elycharts.featuresmanager.register($.elycharts.legendmanager, 90);

})(jQuery);
