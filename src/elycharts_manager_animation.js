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
 * ANIMATIONMANAGER
 **********************************************************************/

$.elycharts.animationmanager = {
  
  beforeShow : function(env, pieces) {
    if (!env.newopt)
      this.startAnimation(env, pieces);
    else
      this.stepAnimation(env, pieces);
  },
  
  stepAnimation : function(env, pieces) {
    pieces = this._stepAnimationInt(env, pieces);
  },
  
  _stepAnimationInt : function(env, pieces, section, serie, internal) {
    for (var i = 0; i < pieces.length; i++) {
      var animationProps = common.areaProps(env, section ? section : pieces[i].section, serie ? serie : pieces[i].serie);
      if (animationProps && animationProps.stepAnimation)
        animationProps = animationProps.stepAnimation;
      else
        animationProps = env.opt.features.animation.stepAnimation;
      
      if (typeof pieces[i].paths == 'undefined') {
        if (animationProps && animationProps.active && pieces[i].animation) {
          pieces[i].animation.speed = animationProps && animationProps.speed ? animationProps.speed : 300;
          pieces[i].animation.easing = animationProps && animationProps.easing ? animationProps.easing : '';
          pieces[i].animation.delay = animationProps && animationProps.delay ? animationProps.delay : 0;
          if (!pieces[i].animation.element)
            pieces[i].animation.startAttr = {opacity : 0};
        }
      } else {
        this._stepAnimationInt(env, pieces[i].paths, pieces[i].section, pieces[i].serie, true);
      }
    }
  },
  
  startAnimation : function(env, pieces) {
    for (var i = 0; i < pieces.length; i++)
      if (pieces[i].paths || pieces[i].path) {
        var props = common.areaProps(env, pieces[i].section, pieces[i].serie);
        if (props && props.startAnimation)
          props = props.startAnimation;
        else
          props = env.opt.features.animation.startAnimation;
        
        if (props && props.active) {
          if (props.type == 'simple' || pieces[i].section != 'Series')
            this.animationSimple(env, props, pieces[i]);
          if (props.type == 'grow')
            this.animationGrow(env, props, pieces[i]);
          if (props.type == 'avg')
            this.animationAvg(env, props, pieces[i]);
          if (props.type == 'reg')
            this.animationReg(env, props, pieces[i]);
        }
      }
  },
  
  /**
   * Inserisce i dati base di animazione del piece e la transizione di attributi
   */
  _animationPiece : function(piece, animationProps, subSection) {
    if (piece.paths) {
      for (var i = 0; i < piece.paths.length; i++)
        this._animationPiece(piece.paths[i], animationProps, subSection);
    } else if (piece.path) {
      piece.animation = {
        speed : animationProps.speed,
        easing : animationProps.easing,
        delay : animationProps.delay,
        startPath : [],
        startAttr : common._clone(piece.attr)
      };
      if (animationProps.propsTo)
        piece.attr = $.extend(true, piece.attr, animationProps.propsTo);
      if (animationProps.propsFrom)
        piece.animation.startAttr = $.extend(true, piece.animation.startAttr, animationProps.propsFrom);
      if (subSection && animationProps[subSection.toLowerCase() + 'PropsFrom'])
        piece.animation.startAttr = $.extend(true, piece.animation.startAttr, animationProps[subSection.toLowerCase() + 'PropsFrom']);
      
      if (typeof piece.animation.startAttr.opacity != 'undefined' && typeof piece.attr.opacity == 'undefined')
        piece.attr.opacity = 1;
    }
  },
  
  animationSimple : function(env, props, piece) {
    this._animationPiece(piece, props, piece.subSection);
  },
  
  animationGrow : function(env, props, piece) {
    this._animationPiece(piece, props, piece.subSection);
    var i, npath, y;
    
    switch (env.opt.type) {
      case 'line':
        y = env.height - env.opt.margins[2];
        switch (piece.subSection) {
          case 'Plot':
            if (!piece.paths) {
                npath = [ 'LINE', [], piece.path[0][2]];
                for (i = 0; i < piece.path[0][1].length; i++)
                  npath[1].push([ piece.path[0][1][i][0], piece.path[0][1][i][1] == null ? null : y ]);
                piece.animation.startPath.push(npath);

            } else {
              for (i = 0; i < piece.paths.length; i++)
                if (piece.paths[i].path)
                  piece.paths[i].animation.startPath.push([ 'RECT', piece.paths[i].path[0][1], y, piece.paths[i].path[0][3], y ]);
            }
            break;
          case 'Fill':
            npath = [ 'LINEAREA', [], [], piece.path[0][3]];
            for (i = 0; i < piece.path[0][1].length; i++) {
              npath[1].push([ piece.path[0][1][i][0], piece.path[0][1][i][1] == null ? null : y ]);
              npath[2].push([ piece.path[0][2][i][0], piece.path[0][2][i][1] == null ? null : y ]);
            }
            piece.animation.startPath.push(npath);
            
            break;
          case 'Dot':
            for (i = 0; i < piece.paths.length; i++)
              if (piece.paths[i].path)
                piece.paths[i].animation.startPath.push(['CIRCLE', piece.paths[i].path[0][1], y, piece.paths[i].path[0][3]]);
            break;
        }
        break;
        
      case 'pie':
        if (piece.subSection == 'Plot')
          for (i = 0; i < piece.paths.length; i++)
            if (piece.paths[i].path && piece.paths[i].path[0][0] == 'SLICE')
              piece.paths[i].animation.startPath.push([ 'SLICE', piece.paths[i].path[0][1], piece.paths[i].path[0][2], piece.paths[i].path[0][4] + piece.paths[i].path[0][3] * 0.1, piece.paths[i].path[0][4], piece.paths[i].path[0][5], piece.paths[i].path[0][6] ]);
            
        break;
      
      case 'funnel':
        alert('Unsupported animation GROW for funnel');
        break;

      case 'barline':
        var x;
        if (piece.section == 'Series' && piece.subSection == 'Plot') {
          if (!props.subType)
            x = env.opt.direction != 'rtl' ? env.opt.margins[3] : env.width - env.opt.margins[1];
          else if (props.subType == 1)
            x = env.opt.direction != 'rtl' ? env.width - env.opt.margins[1] : env.opt.margins[3];
          for (i = 0; i < piece.paths.length; i++)
            if (piece.paths[i].path) {
              if (!props.subType || props.subType == 1)
                piece.paths[i].animation.startPath.push([ 'RECT', x, piece.paths[i].path[0][2], x, piece.paths[i].path[0][4], piece.paths[i].path[0][5] ]);
              else {
                y = (piece.paths[i].path[0][2] + piece.paths[i].path[0][4]) / 2;
                piece.paths[i].animation.startPath.push([ 'RECT', piece.paths[i].path[0][1], y, piece.paths[i].path[0][3], y, piece.paths[i].path[0][5] ]);
              }
            }
        }
        
        break;
    }
  },

  _animationAvgXYArray : function(arr) {
    var res = [], avg = 0, i;
    var count = 0;
    for (i = 0; i < arr.length; i++) if (arr[i][1] != null) {
      avg += arr[i][1];
      count++;
    }
    avg = avg / count;
    for (i = 0; i < arr.length; i++)
      res.push([ arr[i][0], arr[i][1] == null ? null : avg ]);
    return res;
  },

  animationAvg : function(env, props, piece) {
    this._animationPiece(piece, props, piece.subSection);
    
    var avg = 0, i, l;
    switch (env.opt.type) {
      case 'line':
        switch (piece.subSection) {
          case 'Plot':
            if (!piece.paths) {
              // LINE
              piece.animation.startPath.push([ 'LINE', this._animationAvgXYArray(piece.path[0][1]), piece.path[0][2] ]);

            } else {
              // BAR
              l = 0;
              for (i = 0; i < piece.paths.length; i++)
                if (piece.paths[i].path) {
                  l ++;
                  avg += piece.paths[i].path[0][2];
                }
              avg = avg / l;
              for (i = 0; i < piece.paths.length; i++)
                if (piece.paths[i].path)
                  piece.paths[i].animation.startPath.push([ "RECT", piece.paths[i].path[0][1], avg, piece.paths[i].path[0][3], piece.paths[i].path[0][4] ]);
            }
            break;

          case 'Fill':
            piece.animation.startPath.push([ 'LINEAREA', this._animationAvgXYArray(piece.path[0][1]), this._animationAvgXYArray(piece.path[0][2]), piece.path[0][3] ]);
            
            break;

          case 'Dot':
            l = 0;
            for (i = 0; i < piece.paths.length; i++)
              if (piece.paths[i].path) {
                l ++;
                avg += piece.paths[i].path[0][2];
              }
            avg = avg / l;
            for (i = 0; i < piece.paths.length; i++)
              if (piece.paths[i].path)
                piece.paths[i].animation.startPath.push(['CIRCLE', piece.paths[i].path[0][1], avg, piece.paths[i].path[0][3]]);
            break;
        }
        break;

      case 'pie':
        var delta = 360 / piece.paths.length;
      
        if (piece.subSection == 'Plot')
          for (i = 0; i < piece.paths.length; i++)
            if (piece.paths[i].path && piece.paths[i].path[0][0] == 'SLICE')
              piece.paths[i].animation.startPath.push([ 'SLICE', piece.paths[i].path[0][1], piece.paths[i].path[0][2], piece.paths[i].path[0][3], piece.paths[i].path[0][4], i * delta, (i + 1) * delta ]);
        
        break;
        
      case 'funnel':
        alert('Unsupported animation AVG for funnel');
        break;

      case 'barline':
        alert('Unsupported animation AVG for barline');
        break;
    }
  },

  _animationRegXYArray : function(arr) {
    var res = [];
    var c = arr.length;
    
    var start = 0;
    var end = c - 1;
    
    while (arr[start][1] == null) start++;
    while (arr[end][1] == null) end--;
    
    var y1 = arr[0][1];
    var y2 = arr[c - 1][1];
    
    for (var i = 0; i < arr.length; i++) {
      if (arr[i][1] == null) res.push([ arr[i][0], null ]);
      else {
        res.push([ arr[i][0], arr[start][1] + (arr[end][1] - arr[start][1]) / (end - start) * ( i - start) ]);
      }
    }
    
    return res;
  },

  animationReg : function(env, props, piece) {
    this._animationPiece(piece, props, piece.subSection);
    var i, c, y1, y2;
    
    switch (env.opt.type) {
      case 'line':
        switch (piece.subSection) {
          case 'Plot':
            if (!piece.paths) {
              // LINE
              piece.animation.startPath.push([ 'LINE', this._animationRegXYArray(piece.path[0][1]), piece.path[0][2] ]);
              
            } else {
              // BAR
              c = piece.paths.length;
              if (c > 1) {
                for (i = 0; !piece.paths[i].path && i < piece.paths.length; i++) {}
                y1 = piece.paths[i].path ? common.getY(piece.paths[i].path[0]) : 0;
                for (i = piece.paths.length - 1; !piece.paths[i].path && i >= 0; i--) {}
                y2 = piece.paths[i].path ? common.getY(piece.paths[i].path[0]) : 0;

                for (i = 0; i < piece.paths.length; i++)
                  if (piece.paths[i].path)
                    piece.paths[i].animation.startPath.push([ "RECT", piece.paths[i].path[0][1], y1 + (y2 - y1) / (c - 1) * i, piece.paths[i].path[0][3], piece.paths[i].path[0][4] ]);
              }
            }
            break;

          case 'Fill':
            piece.animation.startPath.push([ 'LINEAREA', this._animationRegXYArray(piece.path[0][1]), this._animationRegXYArray(piece.path[0][2]), piece.path[0][3] ]);
            break;

          case 'Dot':
            c = piece.paths.length;
            if (c > 1) {
              for (i = 0; !piece.paths[i].path && i < piece.paths.length; i++) {}
              y1 = piece.paths[i].path ? common.getY(piece.paths[i].path[0]) : 0;
              for (i = piece.paths.length - 1; !piece.paths[i].path && i >= 0; i--) {}
              y2 = piece.paths[i].path ? common.getY(piece.paths[i].path[0]) : 0;

              for (i = 0; i < piece.paths.length; i++)
                if (piece.paths[i].path)
                  piece.paths[i].animation.startPath.push(['CIRCLE', piece.paths[i].path[0][1], y1 + (y2 - y1) / (c - 1) * i, piece.paths[i].path[0][3]]);
            }
            break;
        }
        break;

      case 'pie':
        alert('Unsupported animation REG for pie');
        break;
        
      case 'funnel':
        alert('Unsupported animation REG for funnel');
        break;

      case 'barline':
        alert('Unsupported animation REG for barline');
        break;
    }
  }
}

$.elycharts.featuresmanager.register($.elycharts.animationmanager, 10);

/***********************************************************************
 * FRAMEANIMATIONMANAGER
 **********************************************************************/

$.elycharts.frameanimationmanager = {
  
  beforeShow : function(env, pieces) {
    if (env.opt.features.frameAnimation.active)
      $(env.container.get(0)).css(env.opt.features.frameAnimation.cssFrom);
  },

  afterShow : function(env, pieces) {
    if (env.opt.features.frameAnimation.active)
      env.container.animate(env.opt.features.frameAnimation.cssTo, env.opt.features.frameAnimation.speed, env.opt.features.frameAnimation.easing);
  }
};

$.elycharts.featuresmanager.register($.elycharts.frameanimationmanager, 90);

})(jQuery);
