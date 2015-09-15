(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(object, eventType, callback){
  var timer;

  object.addEventListener(eventType, function(event) {
    clearTimeout(timer);
    timer = setTimeout(function(){
      callback(event);
    }, 500);
  }, false);
};

},{}],2:[function(require,module,exports){
var Vector2 = require('./vector2');

var exports = {
  friction: function(vector, value) {
    var force = vector.clone();
    force.multScalar(-1);
    force.normalize();
    force.multScalar(value);
    return force;
  },
  drag: function(vector, value) {
    var force = vector.clone();
    force.multScalar(-1);
    force.normalize();
    force.multScalar(vector.length() * value);
    return force;
  },
  hook: function(v_velocity, v_anchor, k) {
    var force = v_velocity.clone().sub(v_anchor);
    var distance = force.length();
    if (distance > 0) {
      force.normalize();
      force.multScalar(-1 * k * distance);
      return force;
    } else {
      return new Vector2();
    }
  }
};

module.exports = exports;

},{"./vector2":6}],3:[function(require,module,exports){
var Util = require('./util');
var Vector2 = require('./vector2');
var Force = require('./force');
var Mover = require('./mover');
var debounce = require('./debounce');

var body_width  = document.body.clientWidth * 2;
var body_height = document.body.clientHeight * 2;
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var last_time_activate = Date.now();
var vector_touch_start = new Vector2();
var vector_touch_move = new Vector2();
var vector_touch_end = new Vector2();
var is_touched = false;

var movers = [];
var count_movers = 0;
var unit_mover = 300;

var gravity = new Vector2(0, 2);

var init = function() {
  poolMover();
  renderloop();
  setEvent();
  resizeCanvas();
  debounce(window, 'resize', function(event){
    resizeCanvas();
  });
};

var poolMover = function () {
  for (var i = 0; i < unit_mover; i++) {
    var mover = new Mover();
    
    movers.push(mover);
  }
  count_movers += unit_mover;
};

var updateMover = function () {
  for (var i = 0; i < movers.length; i++) {
    var mover = movers[i];
    
    if (!mover.is_active) continue;

    if (mover.acceleration.length() < 1) {
      mover.time ++;
    }
    if (mover.time > 300) {
      mover.radius -= mover.radius / 10;
    }
    if (mover.radius < 10) {
      mover.inactivate();
      continue;
    }
    
    // 壁との衝突判定
    if (mover.position.y - mover.radius < 0) {
      // var normal = new Vector2(0, 1);
      // mover.velocity.y = mover.radius;
      // mover.rebound(normal);
    }
    if (mover.position.y + mover.radius > body_height) {
      var normal = new Vector2(0, -1);
      mover.velocity.y = body_height - mover.radius;
      mover.rebound(normal);
    }
    if (mover.position.x - mover.radius < 0) {
      var normal = new Vector2(1, 0);
      mover.velocity.x = mover.radius;
      mover.rebound(normal);
    }
    if (mover.position.x + mover.radius > body_width) {
      var normal = new Vector2(-1, 0);
      mover.velocity.x = body_width - mover.radius;
      mover.rebound(normal);
    }

    //mover同士の衝突判定
    for (var index = i + 1; index < movers.length; index++) {
      var target = movers[index];
      var distance = mover.velocity.distanceTo(movers[index].velocity);
      var rebound_distance = mover.radius + target.radius;
      
      if (distance < rebound_distance) {
        var overlap = Math.abs(distance - rebound_distance);
        var mover_normal = mover.velocity.clone().sub(target.velocity).normalize();
        var target_normal = target.velocity.clone().sub(mover.velocity).normalize();

        var v1 = mover.acceleration.clone();
        var m1 = mover.mass;
        var v2 = target.acceleration.clone();
        var m2 = target.mass;

        mover.velocity.sub(target_normal.clone().multScalar(overlap / 2));
        target.velocity.sub(mover_normal.clone().multScalar(overlap / 2));
        
        mover.acceleration = v1.clone().multScalar(m1 - m2).add(v2.clone().multScalar(m2 * 2)).divScalar(m1 + m2).multScalar(0.8);
        target.acceleration = v2.clone().multScalar(m2 - m1).add(v1.clone().multScalar(m1 * 2)).divScalar(m1 + m2).multScalar(0.8);
      }
    }
    mover.applyFriction();
    mover.applyForce(gravity);
    mover.updateVelocity();
    mover.updatePosition();
    mover.draw(ctx);
  }
};

var activateMover = function () {
  var vector = new Vector2(Util.getRandomInt(0, body_width), body_height / 2 * -1);
  var radian = 0;
  var scalar = 0;
  var x = 0;
  var y = 0;
  var force = new Vector2();
  
  for (var i = 0; i < movers.length; i++) {
    var mover = movers[i];
    
    if (mover.is_active) continue;
    
    radian = Util.getRadian(Util.getRandomInt(70, 110));
    scalar = Util.getRandomInt(10, 20);
    x = Math.cos(radian) * scalar;
    y = Math.sin(radian) * scalar;
    force.set(x, y);

    mover.activate();
    mover.init(vector, (body_width + body_height) / 200);
    mover.applyForce(force);
    
    break;
  }
};

var render = function() {
  ctx.clearRect(0, 0, body_width, body_height);
  updateMover();
};

var renderloop = function() {
  var now = Date.now();
  
  requestAnimationFrame(renderloop);
  render();
  if (now - last_time_activate > 100) {
    activateMover();
    last_time_activate = Date.now();
  }
};

var resizeCanvas = function() {
  body_width  = document.body.clientWidth * 2;
  body_height = document.body.clientHeight * 2;

  canvas.width = body_width;
  canvas.height = body_height;
  canvas.style.width = body_width / 2 + 'px';
  canvas.style.height = body_height / 2 + 'px';
};

var setEvent = function () {
  var eventTouchStart = function(x, y) {
    vector_touch_start.set(x, y);
    is_touched = true;
  };
  
  var eventTouchMove = function(x, y) {
    vector_touch_move.set(x, y);
    if (is_touched) {
      
    }
  };
  
  var eventTouchEnd = function(x, y) {
    vector_touch_end.set(x, y);
    is_touched = false;
  };

  canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });

  canvas.addEventListener('selectstart', function (event) {
    event.preventDefault();
  });

  canvas.addEventListener('mousedown', function (event) {
    event.preventDefault();
    eventTouchStart(event.clientX * 2, event.clientY * 2);
  });

  canvas.addEventListener('mousemove', function (event) {
    event.preventDefault();
    eventTouchMove(event.clientX * 2, event.clientY * 2);
  });

  canvas.addEventListener('mouseup', function (event) {
    event.preventDefault();
    eventTouchEnd();
  });

  canvas.addEventListener('touchstart', function (event) {
    event.preventDefault();
    eventTouchStart(event.touches[0].clientX * 2, event.touches[0].clientY * 2);
  });

  canvas.addEventListener('touchmove', function (event) {
    event.preventDefault();
    eventTouchMove(event.touches[0].clientX * 2, event.touches[0].clientY * 2);
  });

  canvas.addEventListener('touchend', function (event) {
    event.preventDefault();
    eventTouchEnd();
  });
};

init();

},{"./debounce":1,"./force":2,"./mover":4,"./util":5,"./vector2":6}],4:[function(require,module,exports){
var Util = require('./util');
var Vector2 = require('./vector2');
var Force = require('./force');

var exports = function(){
  var Mover = function() {
    this.position = new Vector2();
    this.velocity = new Vector2();
    this.acceleration = new Vector2();
    this.anchor = new Vector2();
    this.radius = 0;
    this.mass = 1;
    this.direction = 0;
    this.r = Util.getRandomInt(200, 255);
    this.g = Util.getRandomInt(0, 180);
    this.b = Util.getRandomInt(0, 50);
    this.a = 1;
    this.time = 0;
    this.is_active = false;
  };
  
  Mover.prototype = {
    init: function(vector, size) {
      this.radius = Util.getRandomInt(size, size * 5);
      this.mass = this.radius / 10;
      this.position = vector.clone();
      this.velocity = vector.clone();
      this.anchor = vector.clone();
      this.acceleration.set(0, 0);
      this.a = 1;
      this.time = 0;
    },
    updatePosition: function() {
      this.position.copy(this.velocity);
    },
    updateVelocity: function() {
      this.velocity.add(this.acceleration);
      if (this.velocity.distanceTo(this.position) >= 1) {
        this.direct(this.velocity);
      }
    },
    applyForce: function(vector) {
      this.acceleration.add(vector);
    },
    applyFriction: function() {
      var friction = Force.friction(this.acceleration, 0.1);
      this.applyForce(friction);
    },
    applyDragForce: function() {
      var drag = Force.drag(this.acceleration, 0.1);
      this.applyForce(drag);
    },
    hook: function() {
      var force = Force.hook(this.velocity, this.anchor, this.k);
      this.applyForce(force);
    },
    rebound: function(vector) {
      var dot = this.acceleration.clone().dot(vector);
      this.acceleration.sub(vector.multScalar(2 * dot));
      this.acceleration.multScalar(0.5);
    },
    direct: function(vector) {
      var v = vector.clone().sub(this.position);
      this.direction = Math.atan2(v.y, v.x);
    },
    draw: function(context) {
      context.fillStyle = 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI / 180, true);
      context.fill();
    },
    activate: function () {
      this.is_active = true;
    },
    inactivate: function () {
      this.is_active = false;
    }
  };
  
  return Mover;
};

module.exports = exports();

},{"./force":2,"./util":5,"./vector2":6}],5:[function(require,module,exports){
var exports = {
  getRandomInt: function(min, max){
    return Math.floor(Math.random() * (max - min)) + min;
  },
  getDegree: function(radian) {
    return radian / Math.PI * 180;
  },
  getRadian: function(degrees) {
    return degrees * Math.PI / 180;
  },
  getSpherical: function(rad1, rad2, r) {
    var x = Math.cos(rad1) * Math.cos(rad2) * r;
    var z = Math.cos(rad1) * Math.sin(rad2) * r;
    var y = Math.sin(rad1) * r;
    return [x, y, z];
  }
};

module.exports = exports;

},{}],6:[function(require,module,exports){
// 
// このVector2クラスは、three.jsのTHREE.Vector2クラスの計算式の一部を利用しています。
// https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js#L367
// 

var exports = function(){
  var Vector2 = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  };
  
  Vector2.prototype = {
    set: function (x, y) {
      this.x = x;
      this.y = y;
      return this;
    },
    copy: function (v) {
      this.x = v.x;
      this.y = v.y;
      return this;
    },
    add: function (v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    },
    addScalar: function (s) {
      this.x += s;
      this.y += s;
      return this;
    },
    sub: function (v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    },
    subScalar: function (s) {
      this.x -= s;
      this.y -= s;
      return this;
    },
    mult: function (v) {
      this.x *= v.x;
      this.y *= v.y;
      return this;
    },
    multScalar: function (s) {
      this.x *= s;
      this.y *= s;
      return this;
    },
    div: function (v) {
      this.x /= v.x;
      this.y /= v.y;
      return this;
    },
    divScalar: function (s) {
      this.x /= s;
      this.y /= s;
      return this;
    },
    min: function (v) {
      if ( this.x < v.x ) this.x = v.x;
      if ( this.y < v.y ) this.y = v.y;
      return this;
    },
    max: function (v) {
      if ( this.x > v.x ) this.x = v.x;
      if ( this.y > v.y ) this.y = v.y;
      return this;
    },
    clamp: function (v_min, v_max) {
      if ( this.x < v_min.x ) {
        this.x = v_min.x;
      } else if ( this.x > v_max.x ) {
        this.x = v_max.x;
      }
      if ( this.y < v_min.y ) {
        this.y = v_min.y;
      } else if ( this.y > v_max.y ) {
        this.y = v_max.y;
      }
      return this;
    },
    floor: function () {
      this.x = Math.floor( this.x );
      this.y = Math.floor( this.y );
      return this;
    },
    ceil: function () {
      this.x = Math.ceil( this.x );
      this.y = Math.ceil( this.y );
      return this;
    },
    round: function () {
      this.x = Math.round( this.x );
      this.y = Math.round( this.y );
      return this;
    },
    roundToZero: function () {
      this.x = ( this.x < 0 ) ? Math.ceil( this.x ) : Math.floor( this.x );
      this.y = ( this.y < 0 ) ? Math.ceil( this.y ) : Math.floor( this.y );
      return this;
    },
    negate: function () {
      this.x = - this.x;
      this.y = - this.y;
      return this;
    },
    dot: function (v) {
      return this.x * v.x + this.y * v.y;
    },
    lengthSq: function () {
      return this.x * this.x + this.y * this.y;
    },
    length: function () {
      return Math.sqrt(this.lengthSq());
    },
    normalize: function () {
      return this.divScalar(this.length());
    },
    distanceTo: function (v) {
      var dx = this.x - v.x;
      var dy = this.y - v.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    setLength: function (l) {
      var oldLength = this.length();
      if ( oldLength !== 0 && l !== oldLength ) {
        this.multScalar(l / oldLength);
      }
      return this;
    },
    clone: function () {
      return new Vector2(this.x, this.y);
    }
  }

  return Vector2;
};

module.exports = exports();

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iamVjdCwgZXZlbnRUeXBlLCBjYWxsYmFjayl7XHJcbiAgdmFyIHRpbWVyO1xyXG5cclxuICBvYmplY3QuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xyXG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICAgIGNhbGxiYWNrKGV2ZW50KTtcclxuICAgIH0sIDUwMCk7XHJcbiAgfSwgZmFsc2UpO1xyXG59O1xyXG4iLCJ2YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xyXG5cclxudmFyIGV4cG9ydHMgPSB7XHJcbiAgZnJpY3Rpb246IGZ1bmN0aW9uKHZlY3RvciwgdmFsdWUpIHtcclxuICAgIHZhciBmb3JjZSA9IHZlY3Rvci5jbG9uZSgpO1xyXG4gICAgZm9yY2UubXVsdFNjYWxhcigtMSk7XHJcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcclxuICAgIGZvcmNlLm11bHRTY2FsYXIodmFsdWUpO1xyXG4gICAgcmV0dXJuIGZvcmNlO1xyXG4gIH0sXHJcbiAgZHJhZzogZnVuY3Rpb24odmVjdG9yLCB2YWx1ZSkge1xyXG4gICAgdmFyIGZvcmNlID0gdmVjdG9yLmNsb25lKCk7XHJcbiAgICBmb3JjZS5tdWx0U2NhbGFyKC0xKTtcclxuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xyXG4gICAgZm9yY2UubXVsdFNjYWxhcih2ZWN0b3IubGVuZ3RoKCkgKiB2YWx1ZSk7XHJcbiAgICByZXR1cm4gZm9yY2U7XHJcbiAgfSxcclxuICBob29rOiBmdW5jdGlvbih2X3ZlbG9jaXR5LCB2X2FuY2hvciwgaykge1xyXG4gICAgdmFyIGZvcmNlID0gdl92ZWxvY2l0eS5jbG9uZSgpLnN1Yih2X2FuY2hvcik7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBmb3JjZS5sZW5ndGgoKTtcclxuICAgIGlmIChkaXN0YW5jZSA+IDApIHtcclxuICAgICAgZm9yY2Uubm9ybWFsaXplKCk7XHJcbiAgICAgIGZvcmNlLm11bHRTY2FsYXIoLTEgKiBrICogZGlzdGFuY2UpO1xyXG4gICAgICByZXR1cm4gZm9yY2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIoKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XHJcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XHJcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcclxudmFyIE1vdmVyID0gcmVxdWlyZSgnLi9tb3ZlcicpO1xyXG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcblxyXG52YXIgYm9keV93aWR0aCAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMjtcclxudmFyIGJvZHlfaGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgKiAyO1xyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbnZhciBsYXN0X3RpbWVfYWN0aXZhdGUgPSBEYXRlLm5vdygpO1xyXG52YXIgdmVjdG9yX3RvdWNoX3N0YXJ0ID0gbmV3IFZlY3RvcjIoKTtcclxudmFyIHZlY3Rvcl90b3VjaF9tb3ZlID0gbmV3IFZlY3RvcjIoKTtcclxudmFyIHZlY3Rvcl90b3VjaF9lbmQgPSBuZXcgVmVjdG9yMigpO1xyXG52YXIgaXNfdG91Y2hlZCA9IGZhbHNlO1xyXG5cclxudmFyIG1vdmVycyA9IFtdO1xyXG52YXIgY291bnRfbW92ZXJzID0gMDtcclxudmFyIHVuaXRfbW92ZXIgPSAzMDA7XHJcblxyXG52YXIgZ3Jhdml0eSA9IG5ldyBWZWN0b3IyKDAsIDIpO1xyXG5cclxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcclxuICBwb29sTW92ZXIoKTtcclxuICByZW5kZXJsb29wKCk7XHJcbiAgc2V0RXZlbnQoKTtcclxuICByZXNpemVDYW52YXMoKTtcclxuICBkZWJvdW5jZSh3aW5kb3csICdyZXNpemUnLCBmdW5jdGlvbihldmVudCl7XHJcbiAgICByZXNpemVDYW52YXMoKTtcclxuICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sTW92ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bml0X21vdmVyOyBpKyspIHtcclxuICAgIHZhciBtb3ZlciA9IG5ldyBNb3ZlcigpO1xyXG4gICAgXHJcbiAgICBtb3ZlcnMucHVzaChtb3Zlcik7XHJcbiAgfVxyXG4gIGNvdW50X21vdmVycyArPSB1bml0X21vdmVyO1xyXG59O1xyXG5cclxudmFyIHVwZGF0ZU1vdmVyID0gZnVuY3Rpb24gKCkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbW92ZXIgPSBtb3ZlcnNbaV07XHJcbiAgICBcclxuICAgIGlmICghbW92ZXIuaXNfYWN0aXZlKSBjb250aW51ZTtcclxuXHJcbiAgICBpZiAobW92ZXIuYWNjZWxlcmF0aW9uLmxlbmd0aCgpIDwgMSkge1xyXG4gICAgICBtb3Zlci50aW1lICsrO1xyXG4gICAgfVxyXG4gICAgaWYgKG1vdmVyLnRpbWUgPiAzMDApIHtcclxuICAgICAgbW92ZXIucmFkaXVzIC09IG1vdmVyLnJhZGl1cyAvIDEwO1xyXG4gICAgfVxyXG4gICAgaWYgKG1vdmVyLnJhZGl1cyA8IDEwKSB7XHJcbiAgICAgIG1vdmVyLmluYWN0aXZhdGUoKTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIOWjgeOBqOOBruihneeqgeWIpOWumlxyXG4gICAgaWYgKG1vdmVyLnBvc2l0aW9uLnkgLSBtb3Zlci5yYWRpdXMgPCAwKSB7XHJcbiAgICAgIC8vIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigwLCAxKTtcclxuICAgICAgLy8gbW92ZXIudmVsb2NpdHkueSA9IG1vdmVyLnJhZGl1cztcclxuICAgICAgLy8gbW92ZXIucmVib3VuZChub3JtYWwpO1xyXG4gICAgfVxyXG4gICAgaWYgKG1vdmVyLnBvc2l0aW9uLnkgKyBtb3Zlci5yYWRpdXMgPiBib2R5X2hlaWdodCkge1xyXG4gICAgICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoMCwgLTEpO1xyXG4gICAgICBtb3Zlci52ZWxvY2l0eS55ID0gYm9keV9oZWlnaHQgLSBtb3Zlci5yYWRpdXM7XHJcbiAgICAgIG1vdmVyLnJlYm91bmQobm9ybWFsKTtcclxuICAgIH1cclxuICAgIGlmIChtb3Zlci5wb3NpdGlvbi54IC0gbW92ZXIucmFkaXVzIDwgMCkge1xyXG4gICAgICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoMSwgMCk7XHJcbiAgICAgIG1vdmVyLnZlbG9jaXR5LnggPSBtb3Zlci5yYWRpdXM7XHJcbiAgICAgIG1vdmVyLnJlYm91bmQobm9ybWFsKTtcclxuICAgIH1cclxuICAgIGlmIChtb3Zlci5wb3NpdGlvbi54ICsgbW92ZXIucmFkaXVzID4gYm9keV93aWR0aCkge1xyXG4gICAgICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoLTEsIDApO1xyXG4gICAgICBtb3Zlci52ZWxvY2l0eS54ID0gYm9keV93aWR0aCAtIG1vdmVyLnJhZGl1cztcclxuICAgICAgbW92ZXIucmVib3VuZChub3JtYWwpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vbW92ZXLlkIzlo6vjga7ooZ3nqoHliKTlrppcclxuICAgIGZvciAodmFyIGluZGV4ID0gaSArIDE7IGluZGV4IDwgbW92ZXJzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICB2YXIgdGFyZ2V0ID0gbW92ZXJzW2luZGV4XTtcclxuICAgICAgdmFyIGRpc3RhbmNlID0gbW92ZXIudmVsb2NpdHkuZGlzdGFuY2VUbyhtb3ZlcnNbaW5kZXhdLnZlbG9jaXR5KTtcclxuICAgICAgdmFyIHJlYm91bmRfZGlzdGFuY2UgPSBtb3Zlci5yYWRpdXMgKyB0YXJnZXQucmFkaXVzO1xyXG4gICAgICBcclxuICAgICAgaWYgKGRpc3RhbmNlIDwgcmVib3VuZF9kaXN0YW5jZSkge1xyXG4gICAgICAgIHZhciBvdmVybGFwID0gTWF0aC5hYnMoZGlzdGFuY2UgLSByZWJvdW5kX2Rpc3RhbmNlKTtcclxuICAgICAgICB2YXIgbW92ZXJfbm9ybWFsID0gbW92ZXIudmVsb2NpdHkuY2xvbmUoKS5zdWIodGFyZ2V0LnZlbG9jaXR5KS5ub3JtYWxpemUoKTtcclxuICAgICAgICB2YXIgdGFyZ2V0X25vcm1hbCA9IHRhcmdldC52ZWxvY2l0eS5jbG9uZSgpLnN1Yihtb3Zlci52ZWxvY2l0eSkubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgIHZhciB2MSA9IG1vdmVyLmFjY2VsZXJhdGlvbi5jbG9uZSgpO1xyXG4gICAgICAgIHZhciBtMSA9IG1vdmVyLm1hc3M7XHJcbiAgICAgICAgdmFyIHYyID0gdGFyZ2V0LmFjY2VsZXJhdGlvbi5jbG9uZSgpO1xyXG4gICAgICAgIHZhciBtMiA9IHRhcmdldC5tYXNzO1xyXG5cclxuICAgICAgICBtb3Zlci52ZWxvY2l0eS5zdWIodGFyZ2V0X25vcm1hbC5jbG9uZSgpLm11bHRTY2FsYXIob3ZlcmxhcCAvIDIpKTtcclxuICAgICAgICB0YXJnZXQudmVsb2NpdHkuc3ViKG1vdmVyX25vcm1hbC5jbG9uZSgpLm11bHRTY2FsYXIob3ZlcmxhcCAvIDIpKTtcclxuICAgICAgICBcclxuICAgICAgICBtb3Zlci5hY2NlbGVyYXRpb24gPSB2MS5jbG9uZSgpLm11bHRTY2FsYXIobTEgLSBtMikuYWRkKHYyLmNsb25lKCkubXVsdFNjYWxhcihtMiAqIDIpKS5kaXZTY2FsYXIobTEgKyBtMikubXVsdFNjYWxhcigwLjgpO1xyXG4gICAgICAgIHRhcmdldC5hY2NlbGVyYXRpb24gPSB2Mi5jbG9uZSgpLm11bHRTY2FsYXIobTIgLSBtMSkuYWRkKHYxLmNsb25lKCkubXVsdFNjYWxhcihtMSAqIDIpKS5kaXZTY2FsYXIobTEgKyBtMikubXVsdFNjYWxhcigwLjgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBtb3Zlci5hcHBseUZyaWN0aW9uKCk7XHJcbiAgICBtb3Zlci5hcHBseUZvcmNlKGdyYXZpdHkpO1xyXG4gICAgbW92ZXIudXBkYXRlVmVsb2NpdHkoKTtcclxuICAgIG1vdmVyLnVwZGF0ZVBvc2l0aW9uKCk7XHJcbiAgICBtb3Zlci5kcmF3KGN0eCk7XHJcbiAgfVxyXG59O1xyXG5cclxudmFyIGFjdGl2YXRlTW92ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHZlY3RvciA9IG5ldyBWZWN0b3IyKFV0aWwuZ2V0UmFuZG9tSW50KDAsIGJvZHlfd2lkdGgpLCBib2R5X2hlaWdodCAvIDIgKiAtMSk7XHJcbiAgdmFyIHJhZGlhbiA9IDA7XHJcbiAgdmFyIHNjYWxhciA9IDA7XHJcbiAgdmFyIHggPSAwO1xyXG4gIHZhciB5ID0gMDtcclxuICB2YXIgZm9yY2UgPSBuZXcgVmVjdG9yMigpO1xyXG4gIFxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbW92ZXIgPSBtb3ZlcnNbaV07XHJcbiAgICBcclxuICAgIGlmIChtb3Zlci5pc19hY3RpdmUpIGNvbnRpbnVlO1xyXG4gICAgXHJcbiAgICByYWRpYW4gPSBVdGlsLmdldFJhZGlhbihVdGlsLmdldFJhbmRvbUludCg3MCwgMTEwKSk7XHJcbiAgICBzY2FsYXIgPSBVdGlsLmdldFJhbmRvbUludCgxMCwgMjApO1xyXG4gICAgeCA9IE1hdGguY29zKHJhZGlhbikgKiBzY2FsYXI7XHJcbiAgICB5ID0gTWF0aC5zaW4ocmFkaWFuKSAqIHNjYWxhcjtcclxuICAgIGZvcmNlLnNldCh4LCB5KTtcclxuXHJcbiAgICBtb3Zlci5hY3RpdmF0ZSgpO1xyXG4gICAgbW92ZXIuaW5pdCh2ZWN0b3IsIChib2R5X3dpZHRoICsgYm9keV9oZWlnaHQpIC8gMjAwKTtcclxuICAgIG1vdmVyLmFwcGx5Rm9yY2UoZm9yY2UpO1xyXG4gICAgXHJcbiAgICBicmVhaztcclxuICB9XHJcbn07XHJcblxyXG52YXIgcmVuZGVyID0gZnVuY3Rpb24oKSB7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBib2R5X3dpZHRoLCBib2R5X2hlaWdodCk7XHJcbiAgdXBkYXRlTW92ZXIoKTtcclxufTtcclxuXHJcbnZhciByZW5kZXJsb29wID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIG5vdyA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcmxvb3ApO1xyXG4gIHJlbmRlcigpO1xyXG4gIGlmIChub3cgLSBsYXN0X3RpbWVfYWN0aXZhdGUgPiAxMDApIHtcclxuICAgIGFjdGl2YXRlTW92ZXIoKTtcclxuICAgIGxhc3RfdGltZV9hY3RpdmF0ZSA9IERhdGUubm93KCk7XHJcbiAgfVxyXG59O1xyXG5cclxudmFyIHJlc2l6ZUNhbnZhcyA9IGZ1bmN0aW9uKCkge1xyXG4gIGJvZHlfd2lkdGggID0gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCAqIDI7XHJcbiAgYm9keV9oZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAqIDI7XHJcblxyXG4gIGNhbnZhcy53aWR0aCA9IGJvZHlfd2lkdGg7XHJcbiAgY2FudmFzLmhlaWdodCA9IGJvZHlfaGVpZ2h0O1xyXG4gIGNhbnZhcy5zdHlsZS53aWR0aCA9IGJvZHlfd2lkdGggLyAyICsgJ3B4JztcclxuICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gYm9keV9oZWlnaHQgLyAyICsgJ3B4JztcclxufTtcclxuXHJcbnZhciBzZXRFdmVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZXZlbnRUb3VjaFN0YXJ0ID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdmVjdG9yX3RvdWNoX3N0YXJ0LnNldCh4LCB5KTtcclxuICAgIGlzX3RvdWNoZWQgPSB0cnVlO1xyXG4gIH07XHJcbiAgXHJcbiAgdmFyIGV2ZW50VG91Y2hNb3ZlID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdmVjdG9yX3RvdWNoX21vdmUuc2V0KHgsIHkpO1xyXG4gICAgaWYgKGlzX3RvdWNoZWQpIHtcclxuICAgICAgXHJcbiAgICB9XHJcbiAgfTtcclxuICBcclxuICB2YXIgZXZlbnRUb3VjaEVuZCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHZlY3Rvcl90b3VjaF9lbmQuc2V0KHgsIHkpO1xyXG4gICAgaXNfdG91Y2hlZCA9IGZhbHNlO1xyXG4gIH07XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoTW92ZShldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hFbmQoKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoU3RhcnQoZXZlbnQudG91Y2hlc1swXS5jbGllbnRYICogMiwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZICogMik7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoTW92ZShldmVudC50b3VjaGVzWzBdLmNsaWVudFggKiAyLCBldmVudC50b3VjaGVzWzBdLmNsaWVudFkgKiAyKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaEVuZCgpO1xyXG4gIH0pO1xyXG59O1xyXG5cclxuaW5pdCgpO1xyXG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xyXG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL2ZvcmNlJyk7XHJcblxyXG52YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIE1vdmVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgdGhpcy5hbmNob3IgPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgdGhpcy5yYWRpdXMgPSAwO1xyXG4gICAgdGhpcy5tYXNzID0gMTtcclxuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcclxuICAgIHRoaXMuciA9IFV0aWwuZ2V0UmFuZG9tSW50KDIwMCwgMjU1KTtcclxuICAgIHRoaXMuZyA9IFV0aWwuZ2V0UmFuZG9tSW50KDAsIDE4MCk7XHJcbiAgICB0aGlzLmIgPSBVdGlsLmdldFJhbmRvbUludCgwLCA1MCk7XHJcbiAgICB0aGlzLmEgPSAxO1xyXG4gICAgdGhpcy50aW1lID0gMDtcclxuICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XHJcbiAgfTtcclxuICBcclxuICBNb3Zlci5wcm90b3R5cGUgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbih2ZWN0b3IsIHNpemUpIHtcclxuICAgICAgdGhpcy5yYWRpdXMgPSBVdGlsLmdldFJhbmRvbUludChzaXplLCBzaXplICogNSk7XHJcbiAgICAgIHRoaXMubWFzcyA9IHRoaXMucmFkaXVzIC8gMTA7XHJcbiAgICAgIHRoaXMucG9zaXRpb24gPSB2ZWN0b3IuY2xvbmUoKTtcclxuICAgICAgdGhpcy52ZWxvY2l0eSA9IHZlY3Rvci5jbG9uZSgpO1xyXG4gICAgICB0aGlzLmFuY2hvciA9IHZlY3Rvci5jbG9uZSgpO1xyXG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbi5zZXQoMCwgMCk7XHJcbiAgICAgIHRoaXMuYSA9IDE7XHJcbiAgICAgIHRoaXMudGltZSA9IDA7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLnBvc2l0aW9uLmNvcHkodGhpcy52ZWxvY2l0eSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlVmVsb2NpdHk6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLnZlbG9jaXR5LmFkZCh0aGlzLmFjY2VsZXJhdGlvbik7XHJcbiAgICAgIGlmICh0aGlzLnZlbG9jaXR5LmRpc3RhbmNlVG8odGhpcy5wb3NpdGlvbikgPj0gMSkge1xyXG4gICAgICAgIHRoaXMuZGlyZWN0KHRoaXMudmVsb2NpdHkpO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgYXBwbHlGb3JjZTogZnVuY3Rpb24odmVjdG9yKSB7XHJcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLmFkZCh2ZWN0b3IpO1xyXG4gICAgfSxcclxuICAgIGFwcGx5RnJpY3Rpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgZnJpY3Rpb24gPSBGb3JjZS5mcmljdGlvbih0aGlzLmFjY2VsZXJhdGlvbiwgMC4xKTtcclxuICAgICAgdGhpcy5hcHBseUZvcmNlKGZyaWN0aW9uKTtcclxuICAgIH0sXHJcbiAgICBhcHBseURyYWdGb3JjZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBkcmFnID0gRm9yY2UuZHJhZyh0aGlzLmFjY2VsZXJhdGlvbiwgMC4xKTtcclxuICAgICAgdGhpcy5hcHBseUZvcmNlKGRyYWcpO1xyXG4gICAgfSxcclxuICAgIGhvb2s6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgZm9yY2UgPSBGb3JjZS5ob29rKHRoaXMudmVsb2NpdHksIHRoaXMuYW5jaG9yLCB0aGlzLmspO1xyXG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZm9yY2UpO1xyXG4gICAgfSxcclxuICAgIHJlYm91bmQ6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG4gICAgICB2YXIgZG90ID0gdGhpcy5hY2NlbGVyYXRpb24uY2xvbmUoKS5kb3QodmVjdG9yKTtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24uc3ViKHZlY3Rvci5tdWx0U2NhbGFyKDIgKiBkb3QpKTtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24ubXVsdFNjYWxhcigwLjUpO1xyXG4gICAgfSxcclxuICAgIGRpcmVjdDogZnVuY3Rpb24odmVjdG9yKSB7XHJcbiAgICAgIHZhciB2ID0gdmVjdG9yLmNsb25lKCkuc3ViKHRoaXMucG9zaXRpb24pO1xyXG4gICAgICB0aGlzLmRpcmVjdGlvbiA9IE1hdGguYXRhbjIodi55LCB2LngpO1xyXG4gICAgfSxcclxuICAgIGRyYXc6IGZ1bmN0aW9uKGNvbnRleHQpIHtcclxuICAgICAgY29udGV4dC5maWxsU3R5bGUgPSAncmdiYSgnICsgdGhpcy5yICsgJywnICsgdGhpcy5nICsgJywnICsgdGhpcy5iICsgJywnICsgdGhpcy5hICsgJyknO1xyXG4gICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG4gICAgICBjb250ZXh0LmFyYyh0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgdGhpcy5yYWRpdXMsIDAsIE1hdGguUEkgLyAxODAsIHRydWUpO1xyXG4gICAgICBjb250ZXh0LmZpbGwoKTtcclxuICAgIH0sXHJcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLmlzX2FjdGl2ZSA9IHRydWU7XHJcbiAgICB9LFxyXG4gICAgaW5hY3RpdmF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLmlzX2FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgXHJcbiAgcmV0dXJuIE1vdmVyO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XHJcbiIsInZhciBleHBvcnRzID0ge1xyXG4gIGdldFJhbmRvbUludDogZnVuY3Rpb24obWluLCBtYXgpe1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pKSArIG1pbjtcclxuICB9LFxyXG4gIGdldERlZ3JlZTogZnVuY3Rpb24ocmFkaWFuKSB7XHJcbiAgICByZXR1cm4gcmFkaWFuIC8gTWF0aC5QSSAqIDE4MDtcclxuICB9LFxyXG4gIGdldFJhZGlhbjogZnVuY3Rpb24oZGVncmVlcykge1xyXG4gICAgcmV0dXJuIGRlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwO1xyXG4gIH0sXHJcbiAgZ2V0U3BoZXJpY2FsOiBmdW5jdGlvbihyYWQxLCByYWQyLCByKSB7XHJcbiAgICB2YXIgeCA9IE1hdGguY29zKHJhZDEpICogTWF0aC5jb3MocmFkMikgKiByO1xyXG4gICAgdmFyIHogPSBNYXRoLmNvcyhyYWQxKSAqIE1hdGguc2luKHJhZDIpICogcjtcclxuICAgIHZhciB5ID0gTWF0aC5zaW4ocmFkMSkgKiByO1xyXG4gICAgcmV0dXJuIFt4LCB5LCB6XTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XHJcbiIsIi8vIFxyXG4vLyDjgZPjga5WZWN0b3Iy44Kv44Op44K544Gv44CBdGhyZWUuanPjga5USFJFRS5WZWN0b3Iy44Kv44Op44K544Gu6KiI566X5byP44Gu5LiA6YOo44KS5Yip55So44GX44Gm44GE44G+44GZ44CCXHJcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tcmRvb2IvdGhyZWUuanMvYmxvYi9tYXN0ZXIvc3JjL21hdGgvVmVjdG9yMi5qcyNMMzY3XHJcbi8vIFxyXG5cclxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xyXG4gIHZhciBWZWN0b3IyID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdGhpcy54ID0geCB8fCAwO1xyXG4gICAgdGhpcy55ID0geSB8fCAwO1xyXG4gIH07XHJcbiAgXHJcbiAgVmVjdG9yMi5wcm90b3R5cGUgPSB7XHJcbiAgICBzZXQ6IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgIHRoaXMueSA9IHk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNvcHk6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCA9IHYueDtcclxuICAgICAgdGhpcy55ID0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBhZGQ6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCArPSB2Lng7XHJcbiAgICAgIHRoaXMueSArPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGFkZFNjYWxhcjogZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdGhpcy54ICs9IHM7XHJcbiAgICAgIHRoaXMueSArPSBzO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBzdWI6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCAtPSB2Lng7XHJcbiAgICAgIHRoaXMueSAtPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHN1YlNjYWxhcjogZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdGhpcy54IC09IHM7XHJcbiAgICAgIHRoaXMueSAtPSBzO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBtdWx0OiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggKj0gdi54O1xyXG4gICAgICB0aGlzLnkgKj0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBtdWx0U2NhbGFyOiBmdW5jdGlvbiAocykge1xyXG4gICAgICB0aGlzLnggKj0gcztcclxuICAgICAgdGhpcy55ICo9IHM7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRpdjogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdGhpcy54IC89IHYueDtcclxuICAgICAgdGhpcy55IC89IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZGl2U2NhbGFyOiBmdW5jdGlvbiAocykge1xyXG4gICAgICB0aGlzLnggLz0gcztcclxuICAgICAgdGhpcy55IC89IHM7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG1pbjogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgaWYgKCB0aGlzLnggPCB2LnggKSB0aGlzLnggPSB2Lng7XHJcbiAgICAgIGlmICggdGhpcy55IDwgdi55ICkgdGhpcy55ID0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBtYXg6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIGlmICggdGhpcy54ID4gdi54ICkgdGhpcy54ID0gdi54O1xyXG4gICAgICBpZiAoIHRoaXMueSA+IHYueSApIHRoaXMueSA9IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2xhbXA6IGZ1bmN0aW9uICh2X21pbiwgdl9tYXgpIHtcclxuICAgICAgaWYgKCB0aGlzLnggPCB2X21pbi54ICkge1xyXG4gICAgICAgIHRoaXMueCA9IHZfbWluLng7XHJcbiAgICAgIH0gZWxzZSBpZiAoIHRoaXMueCA+IHZfbWF4LnggKSB7XHJcbiAgICAgICAgdGhpcy54ID0gdl9tYXgueDtcclxuICAgICAgfVxyXG4gICAgICBpZiAoIHRoaXMueSA8IHZfbWluLnkgKSB7XHJcbiAgICAgICAgdGhpcy55ID0gdl9taW4ueTtcclxuICAgICAgfSBlbHNlIGlmICggdGhpcy55ID4gdl9tYXgueSApIHtcclxuICAgICAgICB0aGlzLnkgPSB2X21heC55O1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGZsb29yOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMueCA9IE1hdGguZmxvb3IoIHRoaXMueCApO1xyXG4gICAgICB0aGlzLnkgPSBNYXRoLmZsb29yKCB0aGlzLnkgKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2VpbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmNlaWwoIHRoaXMueCApO1xyXG4gICAgICB0aGlzLnkgPSBNYXRoLmNlaWwoIHRoaXMueSApO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByb3VuZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLnJvdW5kKCB0aGlzLnggKTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5yb3VuZCggdGhpcy55ICk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHJvdW5kVG9aZXJvOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMueCA9ICggdGhpcy54IDwgMCApID8gTWF0aC5jZWlsKCB0aGlzLnggKSA6IE1hdGguZmxvb3IoIHRoaXMueCApO1xyXG4gICAgICB0aGlzLnkgPSAoIHRoaXMueSA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy55ICkgOiBNYXRoLmZsb29yKCB0aGlzLnkgKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbmVnYXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMueCA9IC0gdGhpcy54O1xyXG4gICAgICB0aGlzLnkgPSAtIHRoaXMueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZG90OiBmdW5jdGlvbiAodikge1xyXG4gICAgICByZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55O1xyXG4gICAgfSxcclxuICAgIGxlbmd0aFNxOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnk7XHJcbiAgICB9LFxyXG4gICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5sZW5ndGhTcSgpKTtcclxuICAgIH0sXHJcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZGl2U2NhbGFyKHRoaXMubGVuZ3RoKCkpO1xyXG4gICAgfSxcclxuICAgIGRpc3RhbmNlVG86IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHZhciBkeCA9IHRoaXMueCAtIHYueDtcclxuICAgICAgdmFyIGR5ID0gdGhpcy55IC0gdi55O1xyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KTtcclxuICAgIH0sXHJcbiAgICBzZXRMZW5ndGg6IGZ1bmN0aW9uIChsKSB7XHJcbiAgICAgIHZhciBvbGRMZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xyXG4gICAgICBpZiAoIG9sZExlbmd0aCAhPT0gMCAmJiBsICE9PSBvbGRMZW5ndGggKSB7XHJcbiAgICAgICAgdGhpcy5tdWx0U2NhbGFyKGwgLyBvbGRMZW5ndGgpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yMih0aGlzLngsIHRoaXMueSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gVmVjdG9yMjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xyXG4iXX0=
