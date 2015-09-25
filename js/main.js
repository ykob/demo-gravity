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
  friction: function(acceleration, mu, normal, mass) {
    var force = acceleration.clone();

    if (!normal) normal = 1;
    if (!mass) mass = 1;
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(mu);
    return force;
  },
  drag: function(acceleration, value) {
    var force = acceleration.clone();
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(acceleration.length() * value);
    return force;
  },
  hook: function(v_velocity, v_anchor, k) {
    var force = v_velocity.clone().sub(v_anchor);
    var distance = force.length();
    if (distance > 0) {
      force.normalize();
      force.multiplyScalar(-1 * k * distance);
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

var gravity = new Vector2(0, 1);

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

    if (mover.acceleration.length() < 2) {
      mover.time ++;
    }
    if (mover.time > 20) {
      mover.radius -= mover.radius / 10;
    }
    if (mover.radius < 10) {
      mover.inactivate();
      continue;
    }
    
    mover.applyForce(gravity);
    mover.applyFriction();
    mover.updateVelocity();
    collideMover(mover, i, movers, true);
    collideBorder(mover, true);
    collideMover(mover, i, movers, false);
    collideMover(mover, i, movers, false);
    collideMover(mover, i, movers, false);
    mover.updatePosition();
    movers[i].draw(ctx);
  }
};

var collideMover = function(mover, i, movers, preserve_impulse) {
  for (var index = 0; index < movers.length; index++) {
    if (index === i) continue;
    var target = movers[index];
    var distance = mover.velocity.distanceTo(target.velocity);
    var rebound_distance = mover.radius + target.radius;
    var damping = 0.9;
    
    if (distance < rebound_distance) {
      var overlap = Math.abs(distance - rebound_distance);
      var this_normal = mover.velocity.clone().sub(target.velocity).normalize();
      var target_normal = target.velocity.clone().sub(mover.velocity).normalize();

      mover.velocity.sub(target_normal.clone().multiplyScalar(overlap / 2));
      target.velocity.sub(this_normal.clone().multiplyScalar(overlap / 2));
      
      if(preserve_impulse){
        var scalar1 = target.acceleration.length();
        var scalar2 = mover.acceleration.length();
        
        mover.acceleration.sub(this_normal.multiplyScalar(scalar1 / -2)).multiplyScalar(damping);
        target.acceleration.sub(target_normal.multiplyScalar(scalar2 / -2)).multiplyScalar(damping);
        if (Math.abs(mover.acceleration.x) < 1) mover.acceleration.x = 0;
        if (Math.abs(mover.acceleration.y) < 1) mover.acceleration.y = 0;
        if (Math.abs(target.acceleration.x) < 1) target.acceleration.x = 0;
        if (Math.abs(target.acceleration.y) < 1) target.acceleration.y = 0;
      }
    }
  }
};

var collideBorder = function(mover, preserve_impulse) {
  var damping = 0.6;
  
  // if (mover.position.y - mover.radius < 0) {
  //   var normal = new Vector2(0, 1);
  //   mover.velocity.y = mover.radius;
  //   if (preserve_impulse) mover.acceleration.y *= -1 * damping;
  // }
  if (mover.position.x + mover.radius > body_width) {
    var normal = new Vector2(-1, 0);
    mover.velocity.x = body_width - mover.radius;
    if (preserve_impulse) mover.acceleration.x *= -1 * damping;
  }
  if (mover.position.y + mover.radius > body_height) {
    var normal = new Vector2(0, -1);
    mover.velocity.y = body_height - mover.radius;
    if (preserve_impulse) mover.acceleration.y *= -1 * damping;
  }
  if (mover.position.x - mover.radius < 0) {
    var normal = new Vector2(1, 0);
    mover.velocity.x = mover.radius;
    if (preserve_impulse) mover.acceleration.x *= -1 * damping;
  }
};

var activateMover = function () {
  var vector = new Vector2(Util.getRandomInt(0, body_width), body_height / 5 * -1);
  var radian = 0;
  var scalar = 0;
  var x = 0;
  var y = 0;
  var force = new Vector2();
  
  for (var i = 0; i < movers.length; i++) {
    var mover = movers[i];
    
    if (mover.is_active) continue;
    
    radian = Util.getRadian(Util.getRandomInt(89.9, 90.1));
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
  if (now - last_time_activate > 10) {
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
      this.radius = Util.getRandomInt(size, size * 4);
      this.mass = this.radius / 100;
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
    clone: function () {
      return new Vector2(this.x, this.y);
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
    multiply: function (v) {
      this.x *= v.x;
      this.y *= v.y;
      return this;
    },
    multiplyScalar: function (s) {
      this.x *= s;
      this.y *= s;
      return this;
    },
    divide: function (v) {
      this.x /= v.x;
      this.y /= v.y;
      return this;
    },
    divideScalar: function (s) {
      this.x /= s;
      this.y /= s;
      return this;
    },
    min: function (v) {
      if (this.x < v.x) this.x = v.x;
      if (this.y < v.y) this.y = v.y;
      return this;
    },
    max: function (v) {
      if (this.x > v.x) this.x = v.x;
      if (this.y > v.y) this.y = v.y;
      return this;
    },
    clamp: function (v_min, v_max) {
      if (this.x < v_min.x) {
        this.x = v_min.x;
      } else if (this.x > v_max.x) {
        this.x = v_max.x;
      }
      if (this.y < v_min.y) {
        this.y = v_min.y;
      } else if (this.y > v_max.y) {
        this.y = v_max.y;
      }
      return this;
    },
    clampScalar: function () {
      var min, max;
      return function clampScalar(minVal, maxVal) {
        if (min === undefined) {
          min = new Vector2();
          max = new Vector2();
        }
        min.set(minVal, minVal);
        max.set(maxVal, maxVal);
        return this.clamp(min, max);
      };
    }(),
    floor: function () {
      this.x = Math.floor(this.x);
      this.y = Math.floor(this.y);
      return this;
    },
    ceil: function () {
      this.x = Math.ceil(this.x);
      this.y = Math.ceil(this.y);
      return this;
    },
    round: function () {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      return this;
    },
    roundToZero: function () {
      this.x = (this.x < 0) ? Math.ceil(this.x) : Math.floor(this.x);
      this.y = (this.y < 0) ? Math.ceil(this.y) : Math.floor(this.y);
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
    lengthManhattan: function() {
      return Math.abs(this.x) + Math.abs(this.y);
    },
    normalize: function () {
      return this.divideScalar(this.length());
    },
    distanceTo: function (v) {
      var dx = this.x - v.x;
      var dy = this.y - v.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    distanceToSquared: function (v) {
      var dx = this.x - v.x, dy = this.y - v.y;
      return dx * dx + dy * dy;
    },
    setLength: function (l) {
      var oldLength = this.length();
      if (oldLength !== 0 && l !== oldLength) {
        this.multScalar(l / oldLength);
      }
      return this;
    },
    lerp: function (v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      return this;
    },
    lerpVectors: function (v1, v2, alpha) {
      this.subVectors(v2, v1).multiplyScalar(alpha).add(v1);
      return this;
    },
    equals: function (v) {
      return ((v.x === this.x) && (v.y === this.y));
    },
    fromArray: function (array, offset) {
      if (offset === undefined) offset = 0;
      this.x = array[ offset ];
      this.y = array[ offset + 1 ];
      return this;
    },
    toArray: function (array, offset) {
      if (array === undefined) array = [];
      if (offset === undefined) offset = 0;
      array[ offset ] = this.x;
      array[ offset + 1 ] = this.y;
      return array;
    },
    fromAttribute: function (attribute, index, offset) {
      if (offset === undefined) offset = 0;
      index = index * attribute.itemSize + offset;
      this.x = attribute.array[ index ];
      this.y = attribute.array[ index + 1 ];
      return this;
    }
  }

  return Vector2;
};

module.exports = exports();

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xyXG4gIHZhciB0aW1lcjtcclxuXHJcbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICBjYWxsYmFjayhldmVudCk7XHJcbiAgICB9LCA1MDApO1xyXG4gIH0sIGZhbHNlKTtcclxufTtcclxuIiwidmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcclxuXHJcbnZhciBleHBvcnRzID0ge1xyXG4gIGZyaWN0aW9uOiBmdW5jdGlvbihhY2NlbGVyYXRpb24sIG11LCBub3JtYWwsIG1hc3MpIHtcclxuICAgIHZhciBmb3JjZSA9IGFjY2VsZXJhdGlvbi5jbG9uZSgpO1xyXG5cclxuICAgIGlmICghbm9ybWFsKSBub3JtYWwgPSAxO1xyXG4gICAgaWYgKCFtYXNzKSBtYXNzID0gMTtcclxuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcclxuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xyXG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIobXUpO1xyXG4gICAgcmV0dXJuIGZvcmNlO1xyXG4gIH0sXHJcbiAgZHJhZzogZnVuY3Rpb24oYWNjZWxlcmF0aW9uLCB2YWx1ZSkge1xyXG4gICAgdmFyIGZvcmNlID0gYWNjZWxlcmF0aW9uLmNsb25lKCk7XHJcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSk7XHJcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcclxuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKGFjY2VsZXJhdGlvbi5sZW5ndGgoKSAqIHZhbHVlKTtcclxuICAgIHJldHVybiBmb3JjZTtcclxuICB9LFxyXG4gIGhvb2s6IGZ1bmN0aW9uKHZfdmVsb2NpdHksIHZfYW5jaG9yLCBrKSB7XHJcbiAgICB2YXIgZm9yY2UgPSB2X3ZlbG9jaXR5LmNsb25lKCkuc3ViKHZfYW5jaG9yKTtcclxuICAgIHZhciBkaXN0YW5jZSA9IGZvcmNlLmxlbmd0aCgpO1xyXG4gICAgaWYgKGRpc3RhbmNlID4gMCkge1xyXG4gICAgICBmb3JjZS5ub3JtYWxpemUoKTtcclxuICAgICAgZm9yY2UubXVsdGlwbHlTY2FsYXIoLTEgKiBrICogZGlzdGFuY2UpO1xyXG4gICAgICByZXR1cm4gZm9yY2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIoKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XHJcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XHJcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcclxudmFyIE1vdmVyID0gcmVxdWlyZSgnLi9tb3ZlcicpO1xyXG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcblxyXG52YXIgYm9keV93aWR0aCAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMjtcclxudmFyIGJvZHlfaGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgKiAyO1xyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbnZhciBsYXN0X3RpbWVfYWN0aXZhdGUgPSBEYXRlLm5vdygpO1xyXG52YXIgdmVjdG9yX3RvdWNoX3N0YXJ0ID0gbmV3IFZlY3RvcjIoKTtcclxudmFyIHZlY3Rvcl90b3VjaF9tb3ZlID0gbmV3IFZlY3RvcjIoKTtcclxudmFyIHZlY3Rvcl90b3VjaF9lbmQgPSBuZXcgVmVjdG9yMigpO1xyXG52YXIgaXNfdG91Y2hlZCA9IGZhbHNlO1xyXG5cclxudmFyIG1vdmVycyA9IFtdO1xyXG52YXIgY291bnRfbW92ZXJzID0gMDtcclxudmFyIHVuaXRfbW92ZXIgPSAzMDA7XHJcblxyXG52YXIgZ3Jhdml0eSA9IG5ldyBWZWN0b3IyKDAsIDEpO1xyXG5cclxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcclxuICBwb29sTW92ZXIoKTtcclxuICByZW5kZXJsb29wKCk7XHJcbiAgc2V0RXZlbnQoKTtcclxuICByZXNpemVDYW52YXMoKTtcclxuICBkZWJvdW5jZSh3aW5kb3csICdyZXNpemUnLCBmdW5jdGlvbihldmVudCl7XHJcbiAgICByZXNpemVDYW52YXMoKTtcclxuICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sTW92ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bml0X21vdmVyOyBpKyspIHtcclxuICAgIHZhciBtb3ZlciA9IG5ldyBNb3ZlcigpO1xyXG4gICAgXHJcbiAgICBtb3ZlcnMucHVzaChtb3Zlcik7XHJcbiAgfVxyXG4gIGNvdW50X21vdmVycyArPSB1bml0X21vdmVyO1xyXG59O1xyXG5cclxudmFyIHVwZGF0ZU1vdmVyID0gZnVuY3Rpb24gKCkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbW92ZXIgPSBtb3ZlcnNbaV07XHJcbiAgICBcclxuICAgIGlmICghbW92ZXIuaXNfYWN0aXZlKSBjb250aW51ZTtcclxuXHJcbiAgICBpZiAobW92ZXIuYWNjZWxlcmF0aW9uLmxlbmd0aCgpIDwgMikge1xyXG4gICAgICBtb3Zlci50aW1lICsrO1xyXG4gICAgfVxyXG4gICAgaWYgKG1vdmVyLnRpbWUgPiAyMCkge1xyXG4gICAgICBtb3Zlci5yYWRpdXMgLT0gbW92ZXIucmFkaXVzIC8gMTA7XHJcbiAgICB9XHJcbiAgICBpZiAobW92ZXIucmFkaXVzIDwgMTApIHtcclxuICAgICAgbW92ZXIuaW5hY3RpdmF0ZSgpO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgbW92ZXIuYXBwbHlGb3JjZShncmF2aXR5KTtcclxuICAgIG1vdmVyLmFwcGx5RnJpY3Rpb24oKTtcclxuICAgIG1vdmVyLnVwZGF0ZVZlbG9jaXR5KCk7XHJcbiAgICBjb2xsaWRlTW92ZXIobW92ZXIsIGksIG1vdmVycywgdHJ1ZSk7XHJcbiAgICBjb2xsaWRlQm9yZGVyKG1vdmVyLCB0cnVlKTtcclxuICAgIGNvbGxpZGVNb3Zlcihtb3ZlciwgaSwgbW92ZXJzLCBmYWxzZSk7XHJcbiAgICBjb2xsaWRlTW92ZXIobW92ZXIsIGksIG1vdmVycywgZmFsc2UpO1xyXG4gICAgY29sbGlkZU1vdmVyKG1vdmVyLCBpLCBtb3ZlcnMsIGZhbHNlKTtcclxuICAgIG1vdmVyLnVwZGF0ZVBvc2l0aW9uKCk7XHJcbiAgICBtb3ZlcnNbaV0uZHJhdyhjdHgpO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciBjb2xsaWRlTW92ZXIgPSBmdW5jdGlvbihtb3ZlciwgaSwgbW92ZXJzLCBwcmVzZXJ2ZV9pbXB1bHNlKSB7XHJcbiAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IG1vdmVycy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgIGlmIChpbmRleCA9PT0gaSkgY29udGludWU7XHJcbiAgICB2YXIgdGFyZ2V0ID0gbW92ZXJzW2luZGV4XTtcclxuICAgIHZhciBkaXN0YW5jZSA9IG1vdmVyLnZlbG9jaXR5LmRpc3RhbmNlVG8odGFyZ2V0LnZlbG9jaXR5KTtcclxuICAgIHZhciByZWJvdW5kX2Rpc3RhbmNlID0gbW92ZXIucmFkaXVzICsgdGFyZ2V0LnJhZGl1cztcclxuICAgIHZhciBkYW1waW5nID0gMC45O1xyXG4gICAgXHJcbiAgICBpZiAoZGlzdGFuY2UgPCByZWJvdW5kX2Rpc3RhbmNlKSB7XHJcbiAgICAgIHZhciBvdmVybGFwID0gTWF0aC5hYnMoZGlzdGFuY2UgLSByZWJvdW5kX2Rpc3RhbmNlKTtcclxuICAgICAgdmFyIHRoaXNfbm9ybWFsID0gbW92ZXIudmVsb2NpdHkuY2xvbmUoKS5zdWIodGFyZ2V0LnZlbG9jaXR5KS5ub3JtYWxpemUoKTtcclxuICAgICAgdmFyIHRhcmdldF9ub3JtYWwgPSB0YXJnZXQudmVsb2NpdHkuY2xvbmUoKS5zdWIobW92ZXIudmVsb2NpdHkpLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgbW92ZXIudmVsb2NpdHkuc3ViKHRhcmdldF9ub3JtYWwuY2xvbmUoKS5tdWx0aXBseVNjYWxhcihvdmVybGFwIC8gMikpO1xyXG4gICAgICB0YXJnZXQudmVsb2NpdHkuc3ViKHRoaXNfbm9ybWFsLmNsb25lKCkubXVsdGlwbHlTY2FsYXIob3ZlcmxhcCAvIDIpKTtcclxuICAgICAgXHJcbiAgICAgIGlmKHByZXNlcnZlX2ltcHVsc2Upe1xyXG4gICAgICAgIHZhciBzY2FsYXIxID0gdGFyZ2V0LmFjY2VsZXJhdGlvbi5sZW5ndGgoKTtcclxuICAgICAgICB2YXIgc2NhbGFyMiA9IG1vdmVyLmFjY2VsZXJhdGlvbi5sZW5ndGgoKTtcclxuICAgICAgICBcclxuICAgICAgICBtb3Zlci5hY2NlbGVyYXRpb24uc3ViKHRoaXNfbm9ybWFsLm11bHRpcGx5U2NhbGFyKHNjYWxhcjEgLyAtMikpLm11bHRpcGx5U2NhbGFyKGRhbXBpbmcpO1xyXG4gICAgICAgIHRhcmdldC5hY2NlbGVyYXRpb24uc3ViKHRhcmdldF9ub3JtYWwubXVsdGlwbHlTY2FsYXIoc2NhbGFyMiAvIC0yKSkubXVsdGlwbHlTY2FsYXIoZGFtcGluZyk7XHJcbiAgICAgICAgaWYgKE1hdGguYWJzKG1vdmVyLmFjY2VsZXJhdGlvbi54KSA8IDEpIG1vdmVyLmFjY2VsZXJhdGlvbi54ID0gMDtcclxuICAgICAgICBpZiAoTWF0aC5hYnMobW92ZXIuYWNjZWxlcmF0aW9uLnkpIDwgMSkgbW92ZXIuYWNjZWxlcmF0aW9uLnkgPSAwO1xyXG4gICAgICAgIGlmIChNYXRoLmFicyh0YXJnZXQuYWNjZWxlcmF0aW9uLngpIDwgMSkgdGFyZ2V0LmFjY2VsZXJhdGlvbi54ID0gMDtcclxuICAgICAgICBpZiAoTWF0aC5hYnModGFyZ2V0LmFjY2VsZXJhdGlvbi55KSA8IDEpIHRhcmdldC5hY2NlbGVyYXRpb24ueSA9IDA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG52YXIgY29sbGlkZUJvcmRlciA9IGZ1bmN0aW9uKG1vdmVyLCBwcmVzZXJ2ZV9pbXB1bHNlKSB7XHJcbiAgdmFyIGRhbXBpbmcgPSAwLjY7XHJcbiAgXHJcbiAgLy8gaWYgKG1vdmVyLnBvc2l0aW9uLnkgLSBtb3Zlci5yYWRpdXMgPCAwKSB7XHJcbiAgLy8gICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoMCwgMSk7XHJcbiAgLy8gICBtb3Zlci52ZWxvY2l0eS55ID0gbW92ZXIucmFkaXVzO1xyXG4gIC8vICAgaWYgKHByZXNlcnZlX2ltcHVsc2UpIG1vdmVyLmFjY2VsZXJhdGlvbi55ICo9IC0xICogZGFtcGluZztcclxuICAvLyB9XHJcbiAgaWYgKG1vdmVyLnBvc2l0aW9uLnggKyBtb3Zlci5yYWRpdXMgPiBib2R5X3dpZHRoKSB7XHJcbiAgICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoLTEsIDApO1xyXG4gICAgbW92ZXIudmVsb2NpdHkueCA9IGJvZHlfd2lkdGggLSBtb3Zlci5yYWRpdXM7XHJcbiAgICBpZiAocHJlc2VydmVfaW1wdWxzZSkgbW92ZXIuYWNjZWxlcmF0aW9uLnggKj0gLTEgKiBkYW1waW5nO1xyXG4gIH1cclxuICBpZiAobW92ZXIucG9zaXRpb24ueSArIG1vdmVyLnJhZGl1cyA+IGJvZHlfaGVpZ2h0KSB7XHJcbiAgICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoMCwgLTEpO1xyXG4gICAgbW92ZXIudmVsb2NpdHkueSA9IGJvZHlfaGVpZ2h0IC0gbW92ZXIucmFkaXVzO1xyXG4gICAgaWYgKHByZXNlcnZlX2ltcHVsc2UpIG1vdmVyLmFjY2VsZXJhdGlvbi55ICo9IC0xICogZGFtcGluZztcclxuICB9XHJcbiAgaWYgKG1vdmVyLnBvc2l0aW9uLnggLSBtb3Zlci5yYWRpdXMgPCAwKSB7XHJcbiAgICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoMSwgMCk7XHJcbiAgICBtb3Zlci52ZWxvY2l0eS54ID0gbW92ZXIucmFkaXVzO1xyXG4gICAgaWYgKHByZXNlcnZlX2ltcHVsc2UpIG1vdmVyLmFjY2VsZXJhdGlvbi54ICo9IC0xICogZGFtcGluZztcclxuICB9XHJcbn07XHJcblxyXG52YXIgYWN0aXZhdGVNb3ZlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgdmVjdG9yID0gbmV3IFZlY3RvcjIoVXRpbC5nZXRSYW5kb21JbnQoMCwgYm9keV93aWR0aCksIGJvZHlfaGVpZ2h0IC8gNSAqIC0xKTtcclxuICB2YXIgcmFkaWFuID0gMDtcclxuICB2YXIgc2NhbGFyID0gMDtcclxuICB2YXIgeCA9IDA7XHJcbiAgdmFyIHkgPSAwO1xyXG4gIHZhciBmb3JjZSA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3ZlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBtb3ZlciA9IG1vdmVyc1tpXTtcclxuICAgIFxyXG4gICAgaWYgKG1vdmVyLmlzX2FjdGl2ZSkgY29udGludWU7XHJcbiAgICBcclxuICAgIHJhZGlhbiA9IFV0aWwuZ2V0UmFkaWFuKFV0aWwuZ2V0UmFuZG9tSW50KDg5LjksIDkwLjEpKTtcclxuICAgIHNjYWxhciA9IFV0aWwuZ2V0UmFuZG9tSW50KDEwLCAyMCk7XHJcbiAgICB4ID0gTWF0aC5jb3MocmFkaWFuKSAqIHNjYWxhcjtcclxuICAgIHkgPSBNYXRoLnNpbihyYWRpYW4pICogc2NhbGFyO1xyXG4gICAgZm9yY2Uuc2V0KHgsIHkpO1xyXG5cclxuICAgIG1vdmVyLmFjdGl2YXRlKCk7XHJcbiAgICBtb3Zlci5pbml0KHZlY3RvciwgKGJvZHlfd2lkdGggKyBib2R5X2hlaWdodCkgLyAyMDApO1xyXG4gICAgbW92ZXIuYXBwbHlGb3JjZShmb3JjZSk7XHJcbiAgICBcclxuICAgIGJyZWFrO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciByZW5kZXIgPSBmdW5jdGlvbigpIHtcclxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcclxuICB1cGRhdGVNb3ZlcigpO1xyXG59O1xyXG5cclxudmFyIHJlbmRlcmxvb3AgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcclxuICBcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVuZGVybG9vcCk7XHJcbiAgcmVuZGVyKCk7XHJcbiAgaWYgKG5vdyAtIGxhc3RfdGltZV9hY3RpdmF0ZSA+IDEwKSB7XHJcbiAgICBhY3RpdmF0ZU1vdmVyKCk7XHJcbiAgICBsYXN0X3RpbWVfYWN0aXZhdGUgPSBEYXRlLm5vdygpO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciByZXNpemVDYW52YXMgPSBmdW5jdGlvbigpIHtcclxuICBib2R5X3dpZHRoICA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggKiAyO1xyXG4gIGJvZHlfaGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgKiAyO1xyXG5cclxuICBjYW52YXMud2lkdGggPSBib2R5X3dpZHRoO1xyXG4gIGNhbnZhcy5oZWlnaHQgPSBib2R5X2hlaWdodDtcclxuICBjYW52YXMuc3R5bGUud2lkdGggPSBib2R5X3dpZHRoIC8gMiArICdweCc7XHJcbiAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGJvZHlfaGVpZ2h0IC8gMiArICdweCc7XHJcbn07XHJcblxyXG52YXIgc2V0RXZlbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGV2ZW50VG91Y2hTdGFydCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHZlY3Rvcl90b3VjaF9zdGFydC5zZXQoeCwgeSk7XHJcbiAgICBpc190b3VjaGVkID0gdHJ1ZTtcclxuICB9O1xyXG4gIFxyXG4gIHZhciBldmVudFRvdWNoTW92ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHZlY3Rvcl90b3VjaF9tb3ZlLnNldCh4LCB5KTtcclxuICAgIGlmIChpc190b3VjaGVkKSB7XHJcbiAgICAgIFxyXG4gICAgfVxyXG4gIH07XHJcbiAgXHJcbiAgdmFyIGV2ZW50VG91Y2hFbmQgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICB2ZWN0b3JfdG91Y2hfZW5kLnNldCh4LCB5KTtcclxuICAgIGlzX3RvdWNoZWQgPSBmYWxzZTtcclxuICB9O1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdzZWxlY3RzdGFydCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hTdGFydChldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaE1vdmUoZXZlbnQuY2xpZW50WCAqIDIsIGV2ZW50LmNsaWVudFkgKiAyKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoRW5kKCk7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaE1vdmUoZXZlbnQudG91Y2hlc1swXS5jbGllbnRYICogMiwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZICogMik7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hFbmQoKTtcclxuICB9KTtcclxufTtcclxuXHJcbmluaXQoKTtcclxuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcclxudmFyIEZvcmNlID0gcmVxdWlyZSgnLi9mb3JjZScpO1xyXG5cclxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xyXG4gIHZhciBNb3ZlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgICB0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMuYW5jaG9yID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMucmFkaXVzID0gMDtcclxuICAgIHRoaXMubWFzcyA9IDE7XHJcbiAgICB0aGlzLmRpcmVjdGlvbiA9IDA7XHJcbiAgICB0aGlzLnIgPSBVdGlsLmdldFJhbmRvbUludCgyMDAsIDI1NSk7XHJcbiAgICB0aGlzLmcgPSBVdGlsLmdldFJhbmRvbUludCgwLCAxODApO1xyXG4gICAgdGhpcy5iID0gVXRpbC5nZXRSYW5kb21JbnQoMCwgNTApO1xyXG4gICAgdGhpcy5hID0gMTtcclxuICAgIHRoaXMudGltZSA9IDA7XHJcbiAgICB0aGlzLmlzX2FjdGl2ZSA9IGZhbHNlO1xyXG4gIH07XHJcbiAgXHJcbiAgTW92ZXIucHJvdG90eXBlID0ge1xyXG4gICAgaW5pdDogZnVuY3Rpb24odmVjdG9yLCBzaXplKSB7XHJcbiAgICAgIHRoaXMucmFkaXVzID0gVXRpbC5nZXRSYW5kb21JbnQoc2l6ZSwgc2l6ZSAqIDQpO1xyXG4gICAgICB0aGlzLm1hc3MgPSB0aGlzLnJhZGl1cyAvIDEwMDtcclxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHZlY3Rvci5jbG9uZSgpO1xyXG4gICAgICB0aGlzLnZlbG9jaXR5ID0gdmVjdG9yLmNsb25lKCk7XHJcbiAgICAgIHRoaXMuYW5jaG9yID0gdmVjdG9yLmNsb25lKCk7XHJcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLnNldCgwLCAwKTtcclxuICAgICAgdGhpcy5hID0gMTtcclxuICAgICAgdGhpcy50aW1lID0gMDtcclxuICAgIH0sXHJcbiAgICB1cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoaXMucG9zaXRpb24uY29weSh0aGlzLnZlbG9jaXR5KTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGVWZWxvY2l0eTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoaXMudmVsb2NpdHkuYWRkKHRoaXMuYWNjZWxlcmF0aW9uKTtcclxuICAgICAgaWYgKHRoaXMudmVsb2NpdHkuZGlzdGFuY2VUbyh0aGlzLnBvc2l0aW9uKSA+PSAxKSB7XHJcbiAgICAgICAgdGhpcy5kaXJlY3QodGhpcy52ZWxvY2l0eSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBhcHBseUZvcmNlOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24uYWRkKHZlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgYXBwbHlGcmljdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBmcmljdGlvbiA9IEZvcmNlLmZyaWN0aW9uKHRoaXMuYWNjZWxlcmF0aW9uLCAwLjEpO1xyXG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZnJpY3Rpb24pO1xyXG4gICAgfSxcclxuICAgIGFwcGx5RHJhZ0ZvcmNlOiBmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIGRyYWcgPSBGb3JjZS5kcmFnKHRoaXMuYWNjZWxlcmF0aW9uLCAwLjEpO1xyXG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZHJhZyk7XHJcbiAgICB9LFxyXG4gICAgaG9vazogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBmb3JjZSA9IEZvcmNlLmhvb2sodGhpcy52ZWxvY2l0eSwgdGhpcy5hbmNob3IsIHRoaXMuayk7XHJcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShmb3JjZSk7XHJcbiAgICB9LFxyXG4gICAgZGlyZWN0OiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuICAgICAgdmFyIHYgPSB2ZWN0b3IuY2xvbmUoKS5zdWIodGhpcy5wb3NpdGlvbik7XHJcbiAgICAgIHRoaXMuZGlyZWN0aW9uID0gTWF0aC5hdGFuMih2LnksIHYueCk7XHJcbiAgICB9LFxyXG4gICAgZHJhdzogZnVuY3Rpb24oY29udGV4dCkge1xyXG4gICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2JhKCcgKyB0aGlzLnIgKyAnLCcgKyB0aGlzLmcgKyAnLCcgKyB0aGlzLmIgKyAnLCcgKyB0aGlzLmEgKyAnKSc7XHJcbiAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICAgIGNvbnRleHQuYXJjKHRoaXMucG9zaXRpb24ueCwgdGhpcy5wb3NpdGlvbi55LCB0aGlzLnJhZGl1cywgMCwgTWF0aC5QSSAvIDE4MCwgdHJ1ZSk7XHJcbiAgICAgIGNvbnRleHQuZmlsbCgpO1xyXG4gICAgfSxcclxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gdHJ1ZTtcclxuICAgIH0sXHJcbiAgICBpbmFjdGl2YXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfTtcclxuICBcclxuICByZXR1cm4gTW92ZXI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMoKTtcclxuIiwidmFyIGV4cG9ydHMgPSB7XHJcbiAgZ2V0UmFuZG9tSW50OiBmdW5jdGlvbihtaW4sIG1heCl7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluO1xyXG4gIH0sXHJcbiAgZ2V0RGVncmVlOiBmdW5jdGlvbihyYWRpYW4pIHtcclxuICAgIHJldHVybiByYWRpYW4gLyBNYXRoLlBJICogMTgwO1xyXG4gIH0sXHJcbiAgZ2V0UmFkaWFuOiBmdW5jdGlvbihkZWdyZWVzKSB7XHJcbiAgICByZXR1cm4gZGVncmVlcyAqIE1hdGguUEkgLyAxODA7XHJcbiAgfSxcclxuICBnZXRTcGhlcmljYWw6IGZ1bmN0aW9uKHJhZDEsIHJhZDIsIHIpIHtcclxuICAgIHZhciB4ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLmNvcyhyYWQyKSAqIHI7XHJcbiAgICB2YXIgeiA9IE1hdGguY29zKHJhZDEpICogTWF0aC5zaW4ocmFkMikgKiByO1xyXG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQxKSAqIHI7XHJcbiAgICByZXR1cm4gW3gsIHksIHpdO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cztcclxuIiwiLy8gXHJcbi8vIOOBk+OBrlZlY3RvcjLjgq/jg6njgrnjga/jgIF0aHJlZS5qc+OBrlRIUkVFLlZlY3RvcjLjgq/jg6njgrnjga7oqIjnrpflvI/jga7kuIDpg6jjgpLliKnnlKjjgZfjgabjgYTjgb7jgZnjgIJcclxuLy8gaHR0cHM6Ly9naXRodWIuY29tL21yZG9vYi90aHJlZS5qcy9ibG9iL21hc3Rlci9zcmMvbWF0aC9WZWN0b3IyLmpzI0wzNjdcclxuLy8gXHJcblxyXG52YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIFZlY3RvcjIgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICB0aGlzLnggPSB4IHx8IDA7XHJcbiAgICB0aGlzLnkgPSB5IHx8IDA7XHJcbiAgfTtcclxuICBcclxuICBWZWN0b3IyLnByb3RvdHlwZSA9IHtcclxuICAgIHNldDogZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgICAgdGhpcy54ID0geDtcclxuICAgICAgdGhpcy55ID0geTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH0sXHJcbiAgICBjb3B5OiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggPSB2Lng7XHJcbiAgICAgIHRoaXMueSA9IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgYWRkOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggKz0gdi54O1xyXG4gICAgICB0aGlzLnkgKz0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBhZGRTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHRoaXMueCArPSBzO1xyXG4gICAgICB0aGlzLnkgKz0gcztcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc3ViOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggLT0gdi54O1xyXG4gICAgICB0aGlzLnkgLT0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBzdWJTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHRoaXMueCAtPSBzO1xyXG4gICAgICB0aGlzLnkgLT0gcztcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbXVsdGlwbHk6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCAqPSB2Lng7XHJcbiAgICAgIHRoaXMueSAqPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG11bHRpcGx5U2NhbGFyOiBmdW5jdGlvbiAocykge1xyXG4gICAgICB0aGlzLnggKj0gcztcclxuICAgICAgdGhpcy55ICo9IHM7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRpdmlkZTogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdGhpcy54IC89IHYueDtcclxuICAgICAgdGhpcy55IC89IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZGl2aWRlU2NhbGFyOiBmdW5jdGlvbiAocykge1xyXG4gICAgICB0aGlzLnggLz0gcztcclxuICAgICAgdGhpcy55IC89IHM7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG1pbjogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgaWYgKHRoaXMueCA8IHYueCkgdGhpcy54ID0gdi54O1xyXG4gICAgICBpZiAodGhpcy55IDwgdi55KSB0aGlzLnkgPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG1heDogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgaWYgKHRoaXMueCA+IHYueCkgdGhpcy54ID0gdi54O1xyXG4gICAgICBpZiAodGhpcy55ID4gdi55KSB0aGlzLnkgPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNsYW1wOiBmdW5jdGlvbiAodl9taW4sIHZfbWF4KSB7XHJcbiAgICAgIGlmICh0aGlzLnggPCB2X21pbi54KSB7XHJcbiAgICAgICAgdGhpcy54ID0gdl9taW4ueDtcclxuICAgICAgfSBlbHNlIGlmICh0aGlzLnggPiB2X21heC54KSB7XHJcbiAgICAgICAgdGhpcy54ID0gdl9tYXgueDtcclxuICAgICAgfVxyXG4gICAgICBpZiAodGhpcy55IDwgdl9taW4ueSkge1xyXG4gICAgICAgIHRoaXMueSA9IHZfbWluLnk7XHJcbiAgICAgIH0gZWxzZSBpZiAodGhpcy55ID4gdl9tYXgueSkge1xyXG4gICAgICAgIHRoaXMueSA9IHZfbWF4Lnk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2xhbXBTY2FsYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIG1pbiwgbWF4O1xyXG4gICAgICByZXR1cm4gZnVuY3Rpb24gY2xhbXBTY2FsYXIobWluVmFsLCBtYXhWYWwpIHtcclxuICAgICAgICBpZiAobWluID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIG1pbiA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgICAgICAgICBtYXggPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtaW4uc2V0KG1pblZhbCwgbWluVmFsKTtcclxuICAgICAgICBtYXguc2V0KG1heFZhbCwgbWF4VmFsKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jbGFtcChtaW4sIG1heCk7XHJcbiAgICAgIH07XHJcbiAgICB9KCksXHJcbiAgICBmbG9vcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKHRoaXMueCk7XHJcbiAgICAgIHRoaXMueSA9IE1hdGguZmxvb3IodGhpcy55KTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2VpbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmNlaWwodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5jZWlsKHRoaXMueSk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHJvdW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMueCA9IE1hdGgucm91bmQodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5yb3VuZCh0aGlzLnkpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByb3VuZFRvWmVybzogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSAodGhpcy54IDwgMCkgPyBNYXRoLmNlaWwodGhpcy54KSA6IE1hdGguZmxvb3IodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gKHRoaXMueSA8IDApID8gTWF0aC5jZWlsKHRoaXMueSkgOiBNYXRoLmZsb29yKHRoaXMueSk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG5lZ2F0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSAtIHRoaXMueDtcclxuICAgICAgdGhpcy55ID0gLSB0aGlzLnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRvdDogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcclxuICAgIH0sXHJcbiAgICBsZW5ndGhTcTogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xyXG4gICAgfSxcclxuICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubGVuZ3RoU3EoKSk7XHJcbiAgICB9LFxyXG4gICAgbGVuZ3RoTWFuaGF0dGFuOiBmdW5jdGlvbigpIHtcclxuICAgICAgcmV0dXJuIE1hdGguYWJzKHRoaXMueCkgKyBNYXRoLmFicyh0aGlzLnkpO1xyXG4gICAgfSxcclxuICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5kaXZpZGVTY2FsYXIodGhpcy5sZW5ndGgoKSk7XHJcbiAgICB9LFxyXG4gICAgZGlzdGFuY2VUbzogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdmFyIGR4ID0gdGhpcy54IC0gdi54O1xyXG4gICAgICB2YXIgZHkgPSB0aGlzLnkgLSB2Lnk7XHJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xyXG4gICAgfSxcclxuICAgIGRpc3RhbmNlVG9TcXVhcmVkOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB2YXIgZHggPSB0aGlzLnggLSB2LngsIGR5ID0gdGhpcy55IC0gdi55O1xyXG4gICAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XHJcbiAgICB9LFxyXG4gICAgc2V0TGVuZ3RoOiBmdW5jdGlvbiAobCkge1xyXG4gICAgICB2YXIgb2xkTGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcclxuICAgICAgaWYgKG9sZExlbmd0aCAhPT0gMCAmJiBsICE9PSBvbGRMZW5ndGgpIHtcclxuICAgICAgICB0aGlzLm11bHRTY2FsYXIobCAvIG9sZExlbmd0aCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbGVycDogZnVuY3Rpb24gKHYsIGFscGhhKSB7XHJcbiAgICAgIHRoaXMueCArPSAodi54IC0gdGhpcy54KSAqIGFscGhhO1xyXG4gICAgICB0aGlzLnkgKz0gKHYueSAtIHRoaXMueSkgKiBhbHBoYTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbGVycFZlY3RvcnM6IGZ1bmN0aW9uICh2MSwgdjIsIGFscGhhKSB7XHJcbiAgICAgIHRoaXMuc3ViVmVjdG9ycyh2MiwgdjEpLm11bHRpcGx5U2NhbGFyKGFscGhhKS5hZGQodjEpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBlcXVhbHM6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHJldHVybiAoKHYueCA9PT0gdGhpcy54KSAmJiAodi55ID09PSB0aGlzLnkpKTtcclxuICAgIH0sXHJcbiAgICBmcm9tQXJyYXk6IGZ1bmN0aW9uIChhcnJheSwgb2Zmc2V0KSB7XHJcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcclxuICAgICAgdGhpcy54ID0gYXJyYXlbIG9mZnNldCBdO1xyXG4gICAgICB0aGlzLnkgPSBhcnJheVsgb2Zmc2V0ICsgMSBdO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICB0b0FycmF5OiBmdW5jdGlvbiAoYXJyYXksIG9mZnNldCkge1xyXG4gICAgICBpZiAoYXJyYXkgPT09IHVuZGVmaW5lZCkgYXJyYXkgPSBbXTtcclxuICAgICAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSBvZmZzZXQgPSAwO1xyXG4gICAgICBhcnJheVsgb2Zmc2V0IF0gPSB0aGlzLng7XHJcbiAgICAgIGFycmF5WyBvZmZzZXQgKyAxIF0gPSB0aGlzLnk7XHJcbiAgICAgIHJldHVybiBhcnJheTtcclxuICAgIH0sXHJcbiAgICBmcm9tQXR0cmlidXRlOiBmdW5jdGlvbiAoYXR0cmlidXRlLCBpbmRleCwgb2Zmc2V0KSB7XHJcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcclxuICAgICAgaW5kZXggPSBpbmRleCAqIGF0dHJpYnV0ZS5pdGVtU2l6ZSArIG9mZnNldDtcclxuICAgICAgdGhpcy54ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCBdO1xyXG4gICAgICB0aGlzLnkgPSBhdHRyaWJ1dGUuYXJyYXlbIGluZGV4ICsgMSBdO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBWZWN0b3IyO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XHJcbiJdfQ==
