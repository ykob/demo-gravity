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
    mover.applyForce(gravity);
    mover.applyFriction();
    //mover同士の衝突判定
    for (var index = 0; index < movers.length; index++) {
      if (index === i) continue;
      
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqZWN0LCBldmVudFR5cGUsIGNhbGxiYWNrKXtcclxuICB2YXIgdGltZXI7XHJcblxyXG4gIG9iamVjdC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgY2FsbGJhY2soZXZlbnQpO1xyXG4gICAgfSwgNTAwKTtcclxuICB9LCBmYWxzZSk7XHJcbn07XHJcbiIsInZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XHJcblxyXG52YXIgZXhwb3J0cyA9IHtcclxuICBmcmljdGlvbjogZnVuY3Rpb24odmVjdG9yLCB2YWx1ZSkge1xyXG4gICAgdmFyIGZvcmNlID0gdmVjdG9yLmNsb25lKCk7XHJcbiAgICBmb3JjZS5tdWx0U2NhbGFyKC0xKTtcclxuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xyXG4gICAgZm9yY2UubXVsdFNjYWxhcih2YWx1ZSk7XHJcbiAgICByZXR1cm4gZm9yY2U7XHJcbiAgfSxcclxuICBkcmFnOiBmdW5jdGlvbih2ZWN0b3IsIHZhbHVlKSB7XHJcbiAgICB2YXIgZm9yY2UgPSB2ZWN0b3IuY2xvbmUoKTtcclxuICAgIGZvcmNlLm11bHRTY2FsYXIoLTEpO1xyXG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XHJcbiAgICBmb3JjZS5tdWx0U2NhbGFyKHZlY3Rvci5sZW5ndGgoKSAqIHZhbHVlKTtcclxuICAgIHJldHVybiBmb3JjZTtcclxuICB9LFxyXG4gIGhvb2s6IGZ1bmN0aW9uKHZfdmVsb2NpdHksIHZfYW5jaG9yLCBrKSB7XHJcbiAgICB2YXIgZm9yY2UgPSB2X3ZlbG9jaXR5LmNsb25lKCkuc3ViKHZfYW5jaG9yKTtcclxuICAgIHZhciBkaXN0YW5jZSA9IGZvcmNlLmxlbmd0aCgpO1xyXG4gICAgaWYgKGRpc3RhbmNlID4gMCkge1xyXG4gICAgICBmb3JjZS5ub3JtYWxpemUoKTtcclxuICAgICAgZm9yY2UubXVsdFNjYWxhcigtMSAqIGsgKiBkaXN0YW5jZSk7XHJcbiAgICAgIHJldHVybiBmb3JjZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yMigpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cztcclxuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcclxudmFyIEZvcmNlID0gcmVxdWlyZSgnLi9mb3JjZScpO1xyXG52YXIgTW92ZXIgPSByZXF1aXJlKCcuL21vdmVyJyk7XHJcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxuXHJcbnZhciBib2R5X3dpZHRoICA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggKiAyO1xyXG52YXIgYm9keV9oZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAqIDI7XHJcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxudmFyIGxhc3RfdGltZV9hY3RpdmF0ZSA9IERhdGUubm93KCk7XHJcbnZhciB2ZWN0b3JfdG91Y2hfc3RhcnQgPSBuZXcgVmVjdG9yMigpO1xyXG52YXIgdmVjdG9yX3RvdWNoX21vdmUgPSBuZXcgVmVjdG9yMigpO1xyXG52YXIgdmVjdG9yX3RvdWNoX2VuZCA9IG5ldyBWZWN0b3IyKCk7XHJcbnZhciBpc190b3VjaGVkID0gZmFsc2U7XHJcblxyXG52YXIgbW92ZXJzID0gW107XHJcbnZhciBjb3VudF9tb3ZlcnMgPSAwO1xyXG52YXIgdW5pdF9tb3ZlciA9IDMwMDtcclxuXHJcbnZhciBncmF2aXR5ID0gbmV3IFZlY3RvcjIoMCwgMik7XHJcblxyXG52YXIgaW5pdCA9IGZ1bmN0aW9uKCkge1xyXG4gIHBvb2xNb3ZlcigpO1xyXG4gIHJlbmRlcmxvb3AoKTtcclxuICBzZXRFdmVudCgpO1xyXG4gIHJlc2l6ZUNhbnZhcygpO1xyXG4gIGRlYm91bmNlKHdpbmRvdywgJ3Jlc2l6ZScsIGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgIHJlc2l6ZUNhbnZhcygpO1xyXG4gIH0pO1xyXG59O1xyXG5cclxudmFyIHBvb2xNb3ZlciA9IGZ1bmN0aW9uICgpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVuaXRfbW92ZXI7IGkrKykge1xyXG4gICAgdmFyIG1vdmVyID0gbmV3IE1vdmVyKCk7XHJcbiAgICBcclxuICAgIG1vdmVycy5wdXNoKG1vdmVyKTtcclxuICB9XHJcbiAgY291bnRfbW92ZXJzICs9IHVuaXRfbW92ZXI7XHJcbn07XHJcblxyXG52YXIgdXBkYXRlTW92ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3ZlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBtb3ZlciA9IG1vdmVyc1tpXTtcclxuICAgIFxyXG4gICAgaWYgKCFtb3Zlci5pc19hY3RpdmUpIGNvbnRpbnVlO1xyXG5cclxuICAgIGlmIChtb3Zlci5hY2NlbGVyYXRpb24ubGVuZ3RoKCkgPCAxKSB7XHJcbiAgICAgIG1vdmVyLnRpbWUgKys7XHJcbiAgICB9XHJcbiAgICBpZiAobW92ZXIudGltZSA+IDMwMCkge1xyXG4gICAgICBtb3Zlci5yYWRpdXMgLT0gbW92ZXIucmFkaXVzIC8gMTA7XHJcbiAgICB9XHJcbiAgICBpZiAobW92ZXIucmFkaXVzIDwgMTApIHtcclxuICAgICAgbW92ZXIuaW5hY3RpdmF0ZSgpO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8g5aOB44Go44Gu6KGd56qB5Yik5a6aXHJcbiAgICBpZiAobW92ZXIucG9zaXRpb24ueSAtIG1vdmVyLnJhZGl1cyA8IDApIHtcclxuICAgICAgLy8gdmFyIG5vcm1hbCA9IG5ldyBWZWN0b3IyKDAsIDEpO1xyXG4gICAgICAvLyBtb3Zlci52ZWxvY2l0eS55ID0gbW92ZXIucmFkaXVzO1xyXG4gICAgICAvLyBtb3Zlci5yZWJvdW5kKG5vcm1hbCk7XHJcbiAgICB9XHJcbiAgICBpZiAobW92ZXIucG9zaXRpb24ueSArIG1vdmVyLnJhZGl1cyA+IGJvZHlfaGVpZ2h0KSB7XHJcbiAgICAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigwLCAtMSk7XHJcbiAgICAgIG1vdmVyLnZlbG9jaXR5LnkgPSBib2R5X2hlaWdodCAtIG1vdmVyLnJhZGl1cztcclxuICAgICAgbW92ZXIucmVib3VuZChub3JtYWwpO1xyXG4gICAgfVxyXG4gICAgaWYgKG1vdmVyLnBvc2l0aW9uLnggLSBtb3Zlci5yYWRpdXMgPCAwKSB7XHJcbiAgICAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigxLCAwKTtcclxuICAgICAgbW92ZXIudmVsb2NpdHkueCA9IG1vdmVyLnJhZGl1cztcclxuICAgICAgbW92ZXIucmVib3VuZChub3JtYWwpO1xyXG4gICAgfVxyXG4gICAgaWYgKG1vdmVyLnBvc2l0aW9uLnggKyBtb3Zlci5yYWRpdXMgPiBib2R5X3dpZHRoKSB7XHJcbiAgICAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigtMSwgMCk7XHJcbiAgICAgIG1vdmVyLnZlbG9jaXR5LnggPSBib2R5X3dpZHRoIC0gbW92ZXIucmFkaXVzO1xyXG4gICAgICBtb3Zlci5yZWJvdW5kKG5vcm1hbCk7XHJcbiAgICB9XHJcbiAgICBtb3Zlci5hcHBseUZvcmNlKGdyYXZpdHkpO1xyXG4gICAgbW92ZXIuYXBwbHlGcmljdGlvbigpO1xyXG4gICAgLy9tb3ZlcuWQjOWjq+OBruihneeqgeWIpOWumlxyXG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IG1vdmVycy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgaWYgKGluZGV4ID09PSBpKSBjb250aW51ZTtcclxuICAgICAgXHJcbiAgICAgIHZhciB0YXJnZXQgPSBtb3ZlcnNbaW5kZXhdO1xyXG4gICAgICB2YXIgZGlzdGFuY2UgPSBtb3Zlci52ZWxvY2l0eS5kaXN0YW5jZVRvKG1vdmVyc1tpbmRleF0udmVsb2NpdHkpO1xyXG4gICAgICB2YXIgcmVib3VuZF9kaXN0YW5jZSA9IG1vdmVyLnJhZGl1cyArIHRhcmdldC5yYWRpdXM7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoZGlzdGFuY2UgPCByZWJvdW5kX2Rpc3RhbmNlKSB7XHJcbiAgICAgICAgdmFyIG92ZXJsYXAgPSBNYXRoLmFicyhkaXN0YW5jZSAtIHJlYm91bmRfZGlzdGFuY2UpO1xyXG4gICAgICAgIHZhciBtb3Zlcl9ub3JtYWwgPSBtb3Zlci52ZWxvY2l0eS5jbG9uZSgpLnN1Yih0YXJnZXQudmVsb2NpdHkpLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgIHZhciB0YXJnZXRfbm9ybWFsID0gdGFyZ2V0LnZlbG9jaXR5LmNsb25lKCkuc3ViKG1vdmVyLnZlbG9jaXR5KS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgdmFyIHYxID0gbW92ZXIuYWNjZWxlcmF0aW9uLmNsb25lKCk7XHJcbiAgICAgICAgdmFyIG0xID0gbW92ZXIubWFzcztcclxuICAgICAgICB2YXIgdjIgPSB0YXJnZXQuYWNjZWxlcmF0aW9uLmNsb25lKCk7XHJcbiAgICAgICAgdmFyIG0yID0gdGFyZ2V0Lm1hc3M7XHJcblxyXG4gICAgICAgIG1vdmVyLnZlbG9jaXR5LnN1Yih0YXJnZXRfbm9ybWFsLmNsb25lKCkubXVsdFNjYWxhcihvdmVybGFwIC8gMikpO1xyXG4gICAgICAgIHRhcmdldC52ZWxvY2l0eS5zdWIobW92ZXJfbm9ybWFsLmNsb25lKCkubXVsdFNjYWxhcihvdmVybGFwIC8gMikpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIG1vdmVyLmFjY2VsZXJhdGlvbiA9IHYxLmNsb25lKCkubXVsdFNjYWxhcihtMSAtIG0yKS5hZGQodjIuY2xvbmUoKS5tdWx0U2NhbGFyKG0yICogMikpLmRpdlNjYWxhcihtMSArIG0yKS5tdWx0U2NhbGFyKDAuOCk7XHJcbiAgICAgICAgdGFyZ2V0LmFjY2VsZXJhdGlvbiA9IHYyLmNsb25lKCkubXVsdFNjYWxhcihtMiAtIG0xKS5hZGQodjEuY2xvbmUoKS5tdWx0U2NhbGFyKG0xICogMikpLmRpdlNjYWxhcihtMSArIG0yKS5tdWx0U2NhbGFyKDAuOCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIG1vdmVyLnVwZGF0ZVZlbG9jaXR5KCk7XHJcbiAgICBtb3Zlci51cGRhdGVQb3NpdGlvbigpO1xyXG4gICAgbW92ZXIuZHJhdyhjdHgpO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciBhY3RpdmF0ZU1vdmVyID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciB2ZWN0b3IgPSBuZXcgVmVjdG9yMihVdGlsLmdldFJhbmRvbUludCgwLCBib2R5X3dpZHRoKSwgYm9keV9oZWlnaHQgLyAyICogLTEpO1xyXG4gIHZhciByYWRpYW4gPSAwO1xyXG4gIHZhciBzY2FsYXIgPSAwO1xyXG4gIHZhciB4ID0gMDtcclxuICB2YXIgeSA9IDA7XHJcbiAgdmFyIGZvcmNlID0gbmV3IFZlY3RvcjIoKTtcclxuICBcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG1vdmVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIG1vdmVyID0gbW92ZXJzW2ldO1xyXG4gICAgXHJcbiAgICBpZiAobW92ZXIuaXNfYWN0aXZlKSBjb250aW51ZTtcclxuICAgIFxyXG4gICAgcmFkaWFuID0gVXRpbC5nZXRSYWRpYW4oVXRpbC5nZXRSYW5kb21JbnQoNzAsIDExMCkpO1xyXG4gICAgc2NhbGFyID0gVXRpbC5nZXRSYW5kb21JbnQoMTAsIDIwKTtcclxuICAgIHggPSBNYXRoLmNvcyhyYWRpYW4pICogc2NhbGFyO1xyXG4gICAgeSA9IE1hdGguc2luKHJhZGlhbikgKiBzY2FsYXI7XHJcbiAgICBmb3JjZS5zZXQoeCwgeSk7XHJcblxyXG4gICAgbW92ZXIuYWN0aXZhdGUoKTtcclxuICAgIG1vdmVyLmluaXQodmVjdG9yLCAoYm9keV93aWR0aCArIGJvZHlfaGVpZ2h0KSAvIDIwMCk7XHJcbiAgICBtb3Zlci5hcHBseUZvcmNlKGZvcmNlKTtcclxuICAgIFxyXG4gICAgYnJlYWs7XHJcbiAgfVxyXG59O1xyXG5cclxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xyXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgYm9keV93aWR0aCwgYm9keV9oZWlnaHQpO1xyXG4gIHVwZGF0ZU1vdmVyKCk7XHJcbn07XHJcblxyXG52YXIgcmVuZGVybG9vcCA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBub3cgPSBEYXRlLm5vdygpO1xyXG4gIFxyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXJsb29wKTtcclxuICByZW5kZXIoKTtcclxuICBpZiAobm93IC0gbGFzdF90aW1lX2FjdGl2YXRlID4gMTAwKSB7XHJcbiAgICBhY3RpdmF0ZU1vdmVyKCk7XHJcbiAgICBsYXN0X3RpbWVfYWN0aXZhdGUgPSBEYXRlLm5vdygpO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciByZXNpemVDYW52YXMgPSBmdW5jdGlvbigpIHtcclxuICBib2R5X3dpZHRoICA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggKiAyO1xyXG4gIGJvZHlfaGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgKiAyO1xyXG5cclxuICBjYW52YXMud2lkdGggPSBib2R5X3dpZHRoO1xyXG4gIGNhbnZhcy5oZWlnaHQgPSBib2R5X2hlaWdodDtcclxuICBjYW52YXMuc3R5bGUud2lkdGggPSBib2R5X3dpZHRoIC8gMiArICdweCc7XHJcbiAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGJvZHlfaGVpZ2h0IC8gMiArICdweCc7XHJcbn07XHJcblxyXG52YXIgc2V0RXZlbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGV2ZW50VG91Y2hTdGFydCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHZlY3Rvcl90b3VjaF9zdGFydC5zZXQoeCwgeSk7XHJcbiAgICBpc190b3VjaGVkID0gdHJ1ZTtcclxuICB9O1xyXG4gIFxyXG4gIHZhciBldmVudFRvdWNoTW92ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHZlY3Rvcl90b3VjaF9tb3ZlLnNldCh4LCB5KTtcclxuICAgIGlmIChpc190b3VjaGVkKSB7XHJcbiAgICAgIFxyXG4gICAgfVxyXG4gIH07XHJcbiAgXHJcbiAgdmFyIGV2ZW50VG91Y2hFbmQgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICB2ZWN0b3JfdG91Y2hfZW5kLnNldCh4LCB5KTtcclxuICAgIGlzX3RvdWNoZWQgPSBmYWxzZTtcclxuICB9O1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdzZWxlY3RzdGFydCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hTdGFydChldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaE1vdmUoZXZlbnQuY2xpZW50WCAqIDIsIGV2ZW50LmNsaWVudFkgKiAyKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoRW5kKCk7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaE1vdmUoZXZlbnQudG91Y2hlc1swXS5jbGllbnRYICogMiwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZICogMik7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hFbmQoKTtcclxuICB9KTtcclxufTtcclxuXHJcbmluaXQoKTtcclxuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcclxudmFyIEZvcmNlID0gcmVxdWlyZSgnLi9mb3JjZScpO1xyXG5cclxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xyXG4gIHZhciBNb3ZlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgICB0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMuYW5jaG9yID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMucmFkaXVzID0gMDtcclxuICAgIHRoaXMubWFzcyA9IDE7XHJcbiAgICB0aGlzLmRpcmVjdGlvbiA9IDA7XHJcbiAgICB0aGlzLnIgPSBVdGlsLmdldFJhbmRvbUludCgyMDAsIDI1NSk7XHJcbiAgICB0aGlzLmcgPSBVdGlsLmdldFJhbmRvbUludCgwLCAxODApO1xyXG4gICAgdGhpcy5iID0gVXRpbC5nZXRSYW5kb21JbnQoMCwgNTApO1xyXG4gICAgdGhpcy5hID0gMTtcclxuICAgIHRoaXMudGltZSA9IDA7XHJcbiAgICB0aGlzLmlzX2FjdGl2ZSA9IGZhbHNlO1xyXG4gIH07XHJcbiAgXHJcbiAgTW92ZXIucHJvdG90eXBlID0ge1xyXG4gICAgaW5pdDogZnVuY3Rpb24odmVjdG9yLCBzaXplKSB7XHJcbiAgICAgIHRoaXMucmFkaXVzID0gVXRpbC5nZXRSYW5kb21JbnQoc2l6ZSwgc2l6ZSAqIDUpO1xyXG4gICAgICB0aGlzLm1hc3MgPSB0aGlzLnJhZGl1cyAvIDEwO1xyXG4gICAgICB0aGlzLnBvc2l0aW9uID0gdmVjdG9yLmNsb25lKCk7XHJcbiAgICAgIHRoaXMudmVsb2NpdHkgPSB2ZWN0b3IuY2xvbmUoKTtcclxuICAgICAgdGhpcy5hbmNob3IgPSB2ZWN0b3IuY2xvbmUoKTtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24uc2V0KDAsIDApO1xyXG4gICAgICB0aGlzLmEgPSAxO1xyXG4gICAgICB0aGlzLnRpbWUgPSAwO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5wb3NpdGlvbi5jb3B5KHRoaXMudmVsb2NpdHkpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZVZlbG9jaXR5OiBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy52ZWxvY2l0eS5hZGQodGhpcy5hY2NlbGVyYXRpb24pO1xyXG4gICAgICBpZiAodGhpcy52ZWxvY2l0eS5kaXN0YW5jZVRvKHRoaXMucG9zaXRpb24pID49IDEpIHtcclxuICAgICAgICB0aGlzLmRpcmVjdCh0aGlzLnZlbG9jaXR5KTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGFwcGx5Rm9yY2U6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbi5hZGQodmVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBhcHBseUZyaWN0aW9uOiBmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIGZyaWN0aW9uID0gRm9yY2UuZnJpY3Rpb24odGhpcy5hY2NlbGVyYXRpb24sIDAuMSk7XHJcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShmcmljdGlvbik7XHJcbiAgICB9LFxyXG4gICAgYXBwbHlEcmFnRm9yY2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgZHJhZyA9IEZvcmNlLmRyYWcodGhpcy5hY2NlbGVyYXRpb24sIDAuMSk7XHJcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShkcmFnKTtcclxuICAgIH0sXHJcbiAgICBob29rOiBmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIGZvcmNlID0gRm9yY2UuaG9vayh0aGlzLnZlbG9jaXR5LCB0aGlzLmFuY2hvciwgdGhpcy5rKTtcclxuICAgICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcclxuICAgIH0sXHJcbiAgICByZWJvdW5kOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuICAgICAgdmFyIGRvdCA9IHRoaXMuYWNjZWxlcmF0aW9uLmNsb25lKCkuZG90KHZlY3Rvcik7XHJcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLnN1Yih2ZWN0b3IubXVsdFNjYWxhcigyICogZG90KSk7XHJcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLm11bHRTY2FsYXIoMC41KTtcclxuICAgIH0sXHJcbiAgICBkaXJlY3Q6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG4gICAgICB2YXIgdiA9IHZlY3Rvci5jbG9uZSgpLnN1Yih0aGlzLnBvc2l0aW9uKTtcclxuICAgICAgdGhpcy5kaXJlY3Rpb24gPSBNYXRoLmF0YW4yKHYueSwgdi54KTtcclxuICAgIH0sXHJcbiAgICBkcmF3OiBmdW5jdGlvbihjb250ZXh0KSB7XHJcbiAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoJyArIHRoaXMuciArICcsJyArIHRoaXMuZyArICcsJyArIHRoaXMuYiArICcsJyArIHRoaXMuYSArICcpJztcclxuICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcclxuICAgICAgY29udGV4dC5hcmModGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIHRoaXMucmFkaXVzLCAwLCBNYXRoLlBJIC8gMTgwLCB0cnVlKTtcclxuICAgICAgY29udGV4dC5maWxsKCk7XHJcbiAgICB9LFxyXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5pc19hY3RpdmUgPSB0cnVlO1xyXG4gICAgfSxcclxuICAgIGluYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5pc19hY3RpdmUgPSBmYWxzZTtcclxuICAgIH1cclxuICB9O1xyXG4gIFxyXG4gIHJldHVybiBNb3ZlcjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xyXG4iLCJ2YXIgZXhwb3J0cyA9IHtcclxuICBnZXRSYW5kb21JbnQ6IGZ1bmN0aW9uKG1pbiwgbWF4KXtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSkgKyBtaW47XHJcbiAgfSxcclxuICBnZXREZWdyZWU6IGZ1bmN0aW9uKHJhZGlhbikge1xyXG4gICAgcmV0dXJuIHJhZGlhbiAvIE1hdGguUEkgKiAxODA7XHJcbiAgfSxcclxuICBnZXRSYWRpYW46IGZ1bmN0aW9uKGRlZ3JlZXMpIHtcclxuICAgIHJldHVybiBkZWdyZWVzICogTWF0aC5QSSAvIDE4MDtcclxuICB9LFxyXG4gIGdldFNwaGVyaWNhbDogZnVuY3Rpb24ocmFkMSwgcmFkMiwgcikge1xyXG4gICAgdmFyIHggPSBNYXRoLmNvcyhyYWQxKSAqIE1hdGguY29zKHJhZDIpICogcjtcclxuICAgIHZhciB6ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLnNpbihyYWQyKSAqIHI7XHJcbiAgICB2YXIgeSA9IE1hdGguc2luKHJhZDEpICogcjtcclxuICAgIHJldHVybiBbeCwgeSwgel07XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xyXG4iLCIvLyBcclxuLy8g44GT44GuVmVjdG9yMuOCr+ODqeOCueOBr+OAgXRocmVlLmpz44GuVEhSRUUuVmVjdG9yMuOCr+ODqeOCueOBruioiOeul+W8j+OBruS4gOmDqOOCkuWIqeeUqOOBl+OBpuOBhOOBvuOBmeOAglxyXG4vLyBodHRwczovL2dpdGh1Yi5jb20vbXJkb29iL3RocmVlLmpzL2Jsb2IvbWFzdGVyL3NyYy9tYXRoL1ZlY3RvcjIuanMjTDM2N1xyXG4vLyBcclxuXHJcbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcclxuICB2YXIgVmVjdG9yMiA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHRoaXMueCA9IHggfHwgMDtcclxuICAgIHRoaXMueSA9IHkgfHwgMDtcclxuICB9O1xyXG4gIFxyXG4gIFZlY3RvcjIucHJvdG90eXBlID0ge1xyXG4gICAgc2V0OiBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICB0aGlzLnggPSB4O1xyXG4gICAgICB0aGlzLnkgPSB5O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBjb3B5OiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggPSB2Lng7XHJcbiAgICAgIHRoaXMueSA9IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgYWRkOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggKz0gdi54O1xyXG4gICAgICB0aGlzLnkgKz0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBhZGRTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHRoaXMueCArPSBzO1xyXG4gICAgICB0aGlzLnkgKz0gcztcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc3ViOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggLT0gdi54O1xyXG4gICAgICB0aGlzLnkgLT0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBzdWJTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHRoaXMueCAtPSBzO1xyXG4gICAgICB0aGlzLnkgLT0gcztcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbXVsdDogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdGhpcy54ICo9IHYueDtcclxuICAgICAgdGhpcy55ICo9IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbXVsdFNjYWxhcjogZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdGhpcy54ICo9IHM7XHJcbiAgICAgIHRoaXMueSAqPSBzO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBkaXY6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCAvPSB2Lng7XHJcbiAgICAgIHRoaXMueSAvPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRpdlNjYWxhcjogZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdGhpcy54IC89IHM7XHJcbiAgICAgIHRoaXMueSAvPSBzO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBtaW46IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIGlmICggdGhpcy54IDwgdi54ICkgdGhpcy54ID0gdi54O1xyXG4gICAgICBpZiAoIHRoaXMueSA8IHYueSApIHRoaXMueSA9IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbWF4OiBmdW5jdGlvbiAodikge1xyXG4gICAgICBpZiAoIHRoaXMueCA+IHYueCApIHRoaXMueCA9IHYueDtcclxuICAgICAgaWYgKCB0aGlzLnkgPiB2LnkgKSB0aGlzLnkgPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNsYW1wOiBmdW5jdGlvbiAodl9taW4sIHZfbWF4KSB7XHJcbiAgICAgIGlmICggdGhpcy54IDwgdl9taW4ueCApIHtcclxuICAgICAgICB0aGlzLnggPSB2X21pbi54O1xyXG4gICAgICB9IGVsc2UgaWYgKCB0aGlzLnggPiB2X21heC54ICkge1xyXG4gICAgICAgIHRoaXMueCA9IHZfbWF4Lng7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCB0aGlzLnkgPCB2X21pbi55ICkge1xyXG4gICAgICAgIHRoaXMueSA9IHZfbWluLnk7XHJcbiAgICAgIH0gZWxzZSBpZiAoIHRoaXMueSA+IHZfbWF4LnkgKSB7XHJcbiAgICAgICAgdGhpcy55ID0gdl9tYXgueTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBmbG9vcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKCB0aGlzLnggKTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5mbG9vciggdGhpcy55ICk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNlaWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy54ID0gTWF0aC5jZWlsKCB0aGlzLnggKTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5jZWlsKCB0aGlzLnkgKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgcm91bmQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy54ID0gTWF0aC5yb3VuZCggdGhpcy54ICk7XHJcbiAgICAgIHRoaXMueSA9IE1hdGgucm91bmQoIHRoaXMueSApO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByb3VuZFRvWmVybzogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSAoIHRoaXMueCA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy54ICkgOiBNYXRoLmZsb29yKCB0aGlzLnggKTtcclxuICAgICAgdGhpcy55ID0gKCB0aGlzLnkgPCAwICkgPyBNYXRoLmNlaWwoIHRoaXMueSApIDogTWF0aC5mbG9vciggdGhpcy55ICk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG5lZ2F0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSAtIHRoaXMueDtcclxuICAgICAgdGhpcy55ID0gLSB0aGlzLnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRvdDogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcclxuICAgIH0sXHJcbiAgICBsZW5ndGhTcTogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xyXG4gICAgfSxcclxuICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubGVuZ3RoU3EoKSk7XHJcbiAgICB9LFxyXG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmRpdlNjYWxhcih0aGlzLmxlbmd0aCgpKTtcclxuICAgIH0sXHJcbiAgICBkaXN0YW5jZVRvOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB2YXIgZHggPSB0aGlzLnggLSB2Lng7XHJcbiAgICAgIHZhciBkeSA9IHRoaXMueSAtIHYueTtcclxuICAgICAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XHJcbiAgICB9LFxyXG4gICAgc2V0TGVuZ3RoOiBmdW5jdGlvbiAobCkge1xyXG4gICAgICB2YXIgb2xkTGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcclxuICAgICAgaWYgKCBvbGRMZW5ndGggIT09IDAgJiYgbCAhPT0gb2xkTGVuZ3RoICkge1xyXG4gICAgICAgIHRoaXMubXVsdFNjYWxhcihsIC8gb2xkTGVuZ3RoKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIFZlY3RvcjI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMoKTtcclxuIl19
