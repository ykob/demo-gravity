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
    if (mover.time > 100) {
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
    var damping = 0.8;
    
    if (distance < rebound_distance) {
      var overlap = Math.abs(distance - rebound_distance);
      var this_normal = mover.velocity.clone().sub(target.velocity).normalize();
      var target_normal = target.velocity.clone().sub(mover.velocity).normalize();

      mover.velocity.sub(target_normal.clone().multScalar(overlap / 2));
      target.velocity.sub(this_normal.clone().multScalar(overlap / 2));
      
      if(preserve_impulse){
        var scalar1 = target.acceleration.length();
        var scalar2 = mover.acceleration.length();
        
        mover.acceleration.sub(this_normal.multScalar(scalar1 / -2)).multScalar(damping);
        target.acceleration.sub(target_normal.multScalar(scalar2 / -2)).multScalar(damping);
        if (Math.abs(mover.acceleration.x) < 1) mover.acceleration.x = 0;
        if (Math.abs(mover.acceleration.y) < 1) mover.acceleration.y = 0;
        if (Math.abs(target.acceleration.x) < 1) target.acceleration.x = 0;
        if (Math.abs(target.acceleration.y) < 1) target.acceleration.y = 0;
      }
    }
  }
};

var collideBorder = function(mover, preserve_impulse) {
  var damping = 0.8;
  
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
      var drag = Force.drag(this.acceleration, 0.5);
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xuICB2YXIgdGltZXI7XG5cbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBjYWxsYmFjayhldmVudCk7XG4gICAgfSwgNTAwKTtcbiAgfSwgZmFsc2UpO1xufTtcbiIsInZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XG5cbnZhciBleHBvcnRzID0ge1xuICBmcmljdGlvbjogZnVuY3Rpb24odmVjdG9yLCB2YWx1ZSkge1xuICAgIHZhciBmb3JjZSA9IHZlY3Rvci5jbG9uZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIoLTEpO1xuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIodmFsdWUpO1xuICAgIHJldHVybiBmb3JjZTtcbiAgfSxcbiAgZHJhZzogZnVuY3Rpb24odmVjdG9yLCB2YWx1ZSkge1xuICAgIHZhciBmb3JjZSA9IHZlY3Rvci5jbG9uZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIoLTEpO1xuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIodmVjdG9yLmxlbmd0aCgpICogdmFsdWUpO1xuICAgIHJldHVybiBmb3JjZTtcbiAgfSxcbiAgaG9vazogZnVuY3Rpb24odl92ZWxvY2l0eSwgdl9hbmNob3IsIGspIHtcbiAgICB2YXIgZm9yY2UgPSB2X3ZlbG9jaXR5LmNsb25lKCkuc3ViKHZfYW5jaG9yKTtcbiAgICB2YXIgZGlzdGFuY2UgPSBmb3JjZS5sZW5ndGgoKTtcbiAgICBpZiAoZGlzdGFuY2UgPiAwKSB7XG4gICAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICAgIGZvcmNlLm11bHRTY2FsYXIoLTEgKiBrICogZGlzdGFuY2UpO1xuICAgICAgcmV0dXJuIGZvcmNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIoKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cztcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xudmFyIEZvcmNlID0gcmVxdWlyZSgnLi9mb3JjZScpO1xudmFyIE1vdmVyID0gcmVxdWlyZSgnLi9tb3ZlcicpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xuXG52YXIgYm9keV93aWR0aCAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMjtcbnZhciBib2R5X2hlaWdodCA9IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0ICogMjtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG52YXIgbGFzdF90aW1lX2FjdGl2YXRlID0gRGF0ZS5ub3coKTtcbnZhciB2ZWN0b3JfdG91Y2hfc3RhcnQgPSBuZXcgVmVjdG9yMigpO1xudmFyIHZlY3Rvcl90b3VjaF9tb3ZlID0gbmV3IFZlY3RvcjIoKTtcbnZhciB2ZWN0b3JfdG91Y2hfZW5kID0gbmV3IFZlY3RvcjIoKTtcbnZhciBpc190b3VjaGVkID0gZmFsc2U7XG5cbnZhciBtb3ZlcnMgPSBbXTtcbnZhciBjb3VudF9tb3ZlcnMgPSAwO1xudmFyIHVuaXRfbW92ZXIgPSAzMDA7XG5cbnZhciBncmF2aXR5ID0gbmV3IFZlY3RvcjIoMCwgMSk7XG5cbnZhciBpbml0ID0gZnVuY3Rpb24oKSB7XG4gIHBvb2xNb3ZlcigpO1xuICByZW5kZXJsb29wKCk7XG4gIHNldEV2ZW50KCk7XG4gIHJlc2l6ZUNhbnZhcygpO1xuICBkZWJvdW5jZSh3aW5kb3csICdyZXNpemUnLCBmdW5jdGlvbihldmVudCl7XG4gICAgcmVzaXplQ2FudmFzKCk7XG4gIH0pO1xufTtcblxudmFyIHBvb2xNb3ZlciA9IGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bml0X21vdmVyOyBpKyspIHtcbiAgICB2YXIgbW92ZXIgPSBuZXcgTW92ZXIoKTtcbiAgICBcbiAgICBtb3ZlcnMucHVzaChtb3Zlcik7XG4gIH1cbiAgY291bnRfbW92ZXJzICs9IHVuaXRfbW92ZXI7XG59O1xuXG52YXIgdXBkYXRlTW92ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG1vdmVyID0gbW92ZXJzW2ldO1xuICAgIFxuICAgIGlmICghbW92ZXIuaXNfYWN0aXZlKSBjb250aW51ZTtcblxuICAgIGlmIChtb3Zlci5hY2NlbGVyYXRpb24ubGVuZ3RoKCkgPCAyKSB7XG4gICAgICBtb3Zlci50aW1lICsrO1xuICAgIH1cbiAgICBpZiAobW92ZXIudGltZSA+IDEwMCkge1xuICAgICAgbW92ZXIucmFkaXVzIC09IG1vdmVyLnJhZGl1cyAvIDEwO1xuICAgIH1cbiAgICBpZiAobW92ZXIucmFkaXVzIDwgMTApIHtcbiAgICAgIG1vdmVyLmluYWN0aXZhdGUoKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBcbiAgICBtb3Zlci5hcHBseUZvcmNlKGdyYXZpdHkpO1xuICAgIG1vdmVyLmFwcGx5RnJpY3Rpb24oKTtcbiAgICBtb3Zlci51cGRhdGVWZWxvY2l0eSgpO1xuICAgIGNvbGxpZGVNb3Zlcihtb3ZlciwgaSwgbW92ZXJzLCB0cnVlKTtcbiAgICBjb2xsaWRlQm9yZGVyKG1vdmVyLCB0cnVlKTtcbiAgICBjb2xsaWRlTW92ZXIobW92ZXIsIGksIG1vdmVycywgZmFsc2UpO1xuICAgIGNvbGxpZGVNb3Zlcihtb3ZlciwgaSwgbW92ZXJzLCBmYWxzZSk7XG4gICAgY29sbGlkZU1vdmVyKG1vdmVyLCBpLCBtb3ZlcnMsIGZhbHNlKTtcbiAgICBtb3Zlci51cGRhdGVQb3NpdGlvbigpO1xuICAgIG1vdmVyc1tpXS5kcmF3KGN0eCk7XG4gIH1cbn07XG5cbnZhciBjb2xsaWRlTW92ZXIgPSBmdW5jdGlvbihtb3ZlciwgaSwgbW92ZXJzLCBwcmVzZXJ2ZV9pbXB1bHNlKSB7XG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBtb3ZlcnMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgaWYgKGluZGV4ID09PSBpKSBjb250aW51ZTtcbiAgICB2YXIgdGFyZ2V0ID0gbW92ZXJzW2luZGV4XTtcbiAgICB2YXIgZGlzdGFuY2UgPSBtb3Zlci52ZWxvY2l0eS5kaXN0YW5jZVRvKHRhcmdldC52ZWxvY2l0eSk7XG4gICAgdmFyIHJlYm91bmRfZGlzdGFuY2UgPSBtb3Zlci5yYWRpdXMgKyB0YXJnZXQucmFkaXVzO1xuICAgIHZhciBkYW1waW5nID0gMC44O1xuICAgIFxuICAgIGlmIChkaXN0YW5jZSA8IHJlYm91bmRfZGlzdGFuY2UpIHtcbiAgICAgIHZhciBvdmVybGFwID0gTWF0aC5hYnMoZGlzdGFuY2UgLSByZWJvdW5kX2Rpc3RhbmNlKTtcbiAgICAgIHZhciB0aGlzX25vcm1hbCA9IG1vdmVyLnZlbG9jaXR5LmNsb25lKCkuc3ViKHRhcmdldC52ZWxvY2l0eSkubm9ybWFsaXplKCk7XG4gICAgICB2YXIgdGFyZ2V0X25vcm1hbCA9IHRhcmdldC52ZWxvY2l0eS5jbG9uZSgpLnN1Yihtb3Zlci52ZWxvY2l0eSkubm9ybWFsaXplKCk7XG5cbiAgICAgIG1vdmVyLnZlbG9jaXR5LnN1Yih0YXJnZXRfbm9ybWFsLmNsb25lKCkubXVsdFNjYWxhcihvdmVybGFwIC8gMikpO1xuICAgICAgdGFyZ2V0LnZlbG9jaXR5LnN1Yih0aGlzX25vcm1hbC5jbG9uZSgpLm11bHRTY2FsYXIob3ZlcmxhcCAvIDIpKTtcbiAgICAgIFxuICAgICAgaWYocHJlc2VydmVfaW1wdWxzZSl7XG4gICAgICAgIHZhciBzY2FsYXIxID0gdGFyZ2V0LmFjY2VsZXJhdGlvbi5sZW5ndGgoKTtcbiAgICAgICAgdmFyIHNjYWxhcjIgPSBtb3Zlci5hY2NlbGVyYXRpb24ubGVuZ3RoKCk7XG4gICAgICAgIFxuICAgICAgICBtb3Zlci5hY2NlbGVyYXRpb24uc3ViKHRoaXNfbm9ybWFsLm11bHRTY2FsYXIoc2NhbGFyMSAvIC0yKSkubXVsdFNjYWxhcihkYW1waW5nKTtcbiAgICAgICAgdGFyZ2V0LmFjY2VsZXJhdGlvbi5zdWIodGFyZ2V0X25vcm1hbC5tdWx0U2NhbGFyKHNjYWxhcjIgLyAtMikpLm11bHRTY2FsYXIoZGFtcGluZyk7XG4gICAgICAgIGlmIChNYXRoLmFicyhtb3Zlci5hY2NlbGVyYXRpb24ueCkgPCAxKSBtb3Zlci5hY2NlbGVyYXRpb24ueCA9IDA7XG4gICAgICAgIGlmIChNYXRoLmFicyhtb3Zlci5hY2NlbGVyYXRpb24ueSkgPCAxKSBtb3Zlci5hY2NlbGVyYXRpb24ueSA9IDA7XG4gICAgICAgIGlmIChNYXRoLmFicyh0YXJnZXQuYWNjZWxlcmF0aW9uLngpIDwgMSkgdGFyZ2V0LmFjY2VsZXJhdGlvbi54ID0gMDtcbiAgICAgICAgaWYgKE1hdGguYWJzKHRhcmdldC5hY2NlbGVyYXRpb24ueSkgPCAxKSB0YXJnZXQuYWNjZWxlcmF0aW9uLnkgPSAwO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxudmFyIGNvbGxpZGVCb3JkZXIgPSBmdW5jdGlvbihtb3ZlciwgcHJlc2VydmVfaW1wdWxzZSkge1xuICB2YXIgZGFtcGluZyA9IDAuODtcbiAgXG4gIC8vIGlmIChtb3Zlci5wb3NpdGlvbi55IC0gbW92ZXIucmFkaXVzIDwgMCkge1xuICAvLyAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigwLCAxKTtcbiAgLy8gICBtb3Zlci52ZWxvY2l0eS55ID0gbW92ZXIucmFkaXVzO1xuICAvLyAgIGlmIChwcmVzZXJ2ZV9pbXB1bHNlKSBtb3Zlci5hY2NlbGVyYXRpb24ueSAqPSAtMSAqIGRhbXBpbmc7XG4gIC8vIH1cbiAgaWYgKG1vdmVyLnBvc2l0aW9uLnggKyBtb3Zlci5yYWRpdXMgPiBib2R5X3dpZHRoKSB7XG4gICAgdmFyIG5vcm1hbCA9IG5ldyBWZWN0b3IyKC0xLCAwKTtcbiAgICBtb3Zlci52ZWxvY2l0eS54ID0gYm9keV93aWR0aCAtIG1vdmVyLnJhZGl1cztcbiAgICBpZiAocHJlc2VydmVfaW1wdWxzZSkgbW92ZXIuYWNjZWxlcmF0aW9uLnggKj0gLTEgKiBkYW1waW5nO1xuICB9XG4gIGlmIChtb3Zlci5wb3NpdGlvbi55ICsgbW92ZXIucmFkaXVzID4gYm9keV9oZWlnaHQpIHtcbiAgICB2YXIgbm9ybWFsID0gbmV3IFZlY3RvcjIoMCwgLTEpO1xuICAgIG1vdmVyLnZlbG9jaXR5LnkgPSBib2R5X2hlaWdodCAtIG1vdmVyLnJhZGl1cztcbiAgICBpZiAocHJlc2VydmVfaW1wdWxzZSkgbW92ZXIuYWNjZWxlcmF0aW9uLnkgKj0gLTEgKiBkYW1waW5nO1xuICB9XG4gIGlmIChtb3Zlci5wb3NpdGlvbi54IC0gbW92ZXIucmFkaXVzIDwgMCkge1xuICAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigxLCAwKTtcbiAgICBtb3Zlci52ZWxvY2l0eS54ID0gbW92ZXIucmFkaXVzO1xuICAgIGlmIChwcmVzZXJ2ZV9pbXB1bHNlKSBtb3Zlci5hY2NlbGVyYXRpb24ueCAqPSAtMSAqIGRhbXBpbmc7XG4gIH1cbn07XG5cbnZhciBhY3RpdmF0ZU1vdmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdmVjdG9yID0gbmV3IFZlY3RvcjIoVXRpbC5nZXRSYW5kb21JbnQoMCwgYm9keV93aWR0aCksIGJvZHlfaGVpZ2h0IC8gNSAqIC0xKTtcbiAgdmFyIHJhZGlhbiA9IDA7XG4gIHZhciBzY2FsYXIgPSAwO1xuICB2YXIgeCA9IDA7XG4gIHZhciB5ID0gMDtcbiAgdmFyIGZvcmNlID0gbmV3IFZlY3RvcjIoKTtcbiAgXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG1vdmVyID0gbW92ZXJzW2ldO1xuICAgIFxuICAgIGlmIChtb3Zlci5pc19hY3RpdmUpIGNvbnRpbnVlO1xuICAgIFxuICAgIHJhZGlhbiA9IFV0aWwuZ2V0UmFkaWFuKFV0aWwuZ2V0UmFuZG9tSW50KDcwLCAxMTApKTtcbiAgICBzY2FsYXIgPSBVdGlsLmdldFJhbmRvbUludCgxMCwgMjApO1xuICAgIHggPSBNYXRoLmNvcyhyYWRpYW4pICogc2NhbGFyO1xuICAgIHkgPSBNYXRoLnNpbihyYWRpYW4pICogc2NhbGFyO1xuICAgIGZvcmNlLnNldCh4LCB5KTtcblxuICAgIG1vdmVyLmFjdGl2YXRlKCk7XG4gICAgbW92ZXIuaW5pdCh2ZWN0b3IsIChib2R5X3dpZHRoICsgYm9keV9oZWlnaHQpIC8gMjAwKTtcbiAgICBtb3Zlci5hcHBseUZvcmNlKGZvcmNlKTtcbiAgICBcbiAgICBicmVhaztcbiAgfVxufTtcblxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICBjdHguY2xlYXJSZWN0KDAsIDAsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcbiAgdXBkYXRlTW92ZXIoKTtcbn07XG5cbnZhciByZW5kZXJsb29wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICBcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcmxvb3ApO1xuICByZW5kZXIoKTtcbiAgaWYgKG5vdyAtIGxhc3RfdGltZV9hY3RpdmF0ZSA+IDEwKSB7XG4gICAgYWN0aXZhdGVNb3ZlcigpO1xuICAgIGxhc3RfdGltZV9hY3RpdmF0ZSA9IERhdGUubm93KCk7XG4gIH1cbn07XG5cbnZhciByZXNpemVDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgYm9keV93aWR0aCAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMjtcbiAgYm9keV9oZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAqIDI7XG5cbiAgY2FudmFzLndpZHRoID0gYm9keV93aWR0aDtcbiAgY2FudmFzLmhlaWdodCA9IGJvZHlfaGVpZ2h0O1xuICBjYW52YXMuc3R5bGUud2lkdGggPSBib2R5X3dpZHRoIC8gMiArICdweCc7XG4gIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBib2R5X2hlaWdodCAvIDIgKyAncHgnO1xufTtcblxudmFyIHNldEV2ZW50ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZXZlbnRUb3VjaFN0YXJ0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZlY3Rvcl90b3VjaF9zdGFydC5zZXQoeCwgeSk7XG4gICAgaXNfdG91Y2hlZCA9IHRydWU7XG4gIH07XG4gIFxuICB2YXIgZXZlbnRUb3VjaE1vdmUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdmVjdG9yX3RvdWNoX21vdmUuc2V0KHgsIHkpO1xuICAgIGlmIChpc190b3VjaGVkKSB7XG4gICAgICBcbiAgICB9XG4gIH07XG4gIFxuICB2YXIgZXZlbnRUb3VjaEVuZCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2ZWN0b3JfdG91Y2hfZW5kLnNldCh4LCB5KTtcbiAgICBpc190b3VjaGVkID0gZmFsc2U7XG4gIH07XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoRW5kKCk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoU3RhcnQoZXZlbnQudG91Y2hlc1swXS5jbGllbnRYICogMiwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hFbmQoKTtcbiAgfSk7XG59O1xuXG5pbml0KCk7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcblxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgTW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnBvc2l0aW9uID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBWZWN0b3IyKCk7XG4gICAgdGhpcy5hbmNob3IgPSBuZXcgVmVjdG9yMigpO1xuICAgIHRoaXMucmFkaXVzID0gMDtcbiAgICB0aGlzLm1hc3MgPSAxO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcbiAgICB0aGlzLnIgPSBVdGlsLmdldFJhbmRvbUludCgyMDAsIDI1NSk7XG4gICAgdGhpcy5nID0gVXRpbC5nZXRSYW5kb21JbnQoMCwgMTgwKTtcbiAgICB0aGlzLmIgPSBVdGlsLmdldFJhbmRvbUludCgwLCA1MCk7XG4gICAgdGhpcy5hID0gMTtcbiAgICB0aGlzLnRpbWUgPSAwO1xuICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XG4gIH07XG4gIFxuICBNb3Zlci5wcm90b3R5cGUgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24odmVjdG9yLCBzaXplKSB7XG4gICAgICB0aGlzLnJhZGl1cyA9IFV0aWwuZ2V0UmFuZG9tSW50KHNpemUsIHNpemUgKiA0KTtcbiAgICAgIHRoaXMubWFzcyA9IHRoaXMucmFkaXVzIC8gMTAwO1xuICAgICAgdGhpcy5wb3NpdGlvbiA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy52ZWxvY2l0eSA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy5hbmNob3IgPSB2ZWN0b3IuY2xvbmUoKTtcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLnNldCgwLCAwKTtcbiAgICAgIHRoaXMuYSA9IDE7XG4gICAgICB0aGlzLnRpbWUgPSAwO1xuICAgIH0sXG4gICAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5wb3NpdGlvbi5jb3B5KHRoaXMudmVsb2NpdHkpO1xuICAgIH0sXG4gICAgdXBkYXRlVmVsb2NpdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52ZWxvY2l0eS5hZGQodGhpcy5hY2NlbGVyYXRpb24pO1xuICAgICAgaWYgKHRoaXMudmVsb2NpdHkuZGlzdGFuY2VUbyh0aGlzLnBvc2l0aW9uKSA+PSAxKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0KHRoaXMudmVsb2NpdHkpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYXBwbHlGb3JjZTogZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbi5hZGQodmVjdG9yKTtcbiAgICB9LFxuICAgIGFwcGx5RnJpY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZyaWN0aW9uID0gRm9yY2UuZnJpY3Rpb24odGhpcy5hY2NlbGVyYXRpb24sIDAuMSk7XG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZnJpY3Rpb24pO1xuICAgIH0sXG4gICAgYXBwbHlEcmFnRm9yY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRyYWcgPSBGb3JjZS5kcmFnKHRoaXMuYWNjZWxlcmF0aW9uLCAwLjUpO1xuICAgICAgdGhpcy5hcHBseUZvcmNlKGRyYWcpO1xuICAgIH0sXG4gICAgaG9vazogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZm9yY2UgPSBGb3JjZS5ob29rKHRoaXMudmVsb2NpdHksIHRoaXMuYW5jaG9yLCB0aGlzLmspO1xuICAgICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcbiAgICB9LFxuICAgIGRpcmVjdDogZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICB2YXIgdiA9IHZlY3Rvci5jbG9uZSgpLnN1Yih0aGlzLnBvc2l0aW9uKTtcbiAgICAgIHRoaXMuZGlyZWN0aW9uID0gTWF0aC5hdGFuMih2LnksIHYueCk7XG4gICAgfSxcbiAgICBkcmF3OiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2JhKCcgKyB0aGlzLnIgKyAnLCcgKyB0aGlzLmcgKyAnLCcgKyB0aGlzLmIgKyAnLCcgKyB0aGlzLmEgKyAnKSc7XG4gICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgY29udGV4dC5hcmModGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIHRoaXMucmFkaXVzLCAwLCBNYXRoLlBJIC8gMTgwLCB0cnVlKTtcbiAgICAgIGNvbnRleHQuZmlsbCgpO1xuICAgIH0sXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gdHJ1ZTtcbiAgICB9LFxuICAgIGluYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XG4gICAgfVxuICB9O1xuICBcbiAgcmV0dXJuIE1vdmVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XG4iLCJ2YXIgZXhwb3J0cyA9IHtcbiAgZ2V0UmFuZG9tSW50OiBmdW5jdGlvbihtaW4sIG1heCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pKSArIG1pbjtcbiAgfSxcbiAgZ2V0RGVncmVlOiBmdW5jdGlvbihyYWRpYW4pIHtcbiAgICByZXR1cm4gcmFkaWFuIC8gTWF0aC5QSSAqIDE4MDtcbiAgfSxcbiAgZ2V0UmFkaWFuOiBmdW5jdGlvbihkZWdyZWVzKSB7XG4gICAgcmV0dXJuIGRlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwO1xuICB9LFxuICBnZXRTcGhlcmljYWw6IGZ1bmN0aW9uKHJhZDEsIHJhZDIsIHIpIHtcbiAgICB2YXIgeCA9IE1hdGguY29zKHJhZDEpICogTWF0aC5jb3MocmFkMikgKiByO1xuICAgIHZhciB6ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLnNpbihyYWQyKSAqIHI7XG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQxKSAqIHI7XG4gICAgcmV0dXJuIFt4LCB5LCB6XTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xuIiwiLy8gXG4vLyDjgZPjga5WZWN0b3Iy44Kv44Op44K544Gv44CBdGhyZWUuanPjga5USFJFRS5WZWN0b3Iy44Kv44Op44K544Gu6KiI566X5byP44Gu5LiA6YOo44KS5Yip55So44GX44Gm44GE44G+44GZ44CCXG4vLyBodHRwczovL2dpdGh1Yi5jb20vbXJkb29iL3RocmVlLmpzL2Jsb2IvbWFzdGVyL3NyYy9tYXRoL1ZlY3RvcjIuanMjTDM2N1xuLy8gXG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIFZlY3RvcjIgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy54ID0geCB8fCAwO1xuICAgIHRoaXMueSA9IHkgfHwgMDtcbiAgfTtcbiAgXG4gIFZlY3RvcjIucHJvdG90eXBlID0ge1xuICAgIHNldDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgIHRoaXMueCA9IHg7XG4gICAgICB0aGlzLnkgPSB5O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjb3B5OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54ID0gdi54O1xuICAgICAgdGhpcy55ID0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBhZGQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggKz0gdi54O1xuICAgICAgdGhpcy55ICs9IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgYWRkU2NhbGFyOiBmdW5jdGlvbiAocykge1xuICAgICAgdGhpcy54ICs9IHM7XG4gICAgICB0aGlzLnkgKz0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3ViOiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54IC09IHYueDtcbiAgICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHN1YlNjYWxhcjogZnVuY3Rpb24gKHMpIHtcbiAgICAgIHRoaXMueCAtPSBzO1xuICAgICAgdGhpcy55IC09IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG11bHQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggKj0gdi54O1xuICAgICAgdGhpcy55ICo9IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbXVsdFNjYWxhcjogZnVuY3Rpb24gKHMpIHtcbiAgICAgIHRoaXMueCAqPSBzO1xuICAgICAgdGhpcy55ICo9IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRpdjogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCAvPSB2Lng7XG4gICAgICB0aGlzLnkgLz0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkaXZTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XG4gICAgICB0aGlzLnggLz0gcztcbiAgICAgIHRoaXMueSAvPSBzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBtaW46IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIHRoaXMueCA8IHYueCApIHRoaXMueCA9IHYueDtcbiAgICAgIGlmICggdGhpcy55IDwgdi55ICkgdGhpcy55ID0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBtYXg6IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIHRoaXMueCA+IHYueCApIHRoaXMueCA9IHYueDtcbiAgICAgIGlmICggdGhpcy55ID4gdi55ICkgdGhpcy55ID0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjbGFtcDogZnVuY3Rpb24gKHZfbWluLCB2X21heCkge1xuICAgICAgaWYgKCB0aGlzLnggPCB2X21pbi54ICkge1xuICAgICAgICB0aGlzLnggPSB2X21pbi54O1xuICAgICAgfSBlbHNlIGlmICggdGhpcy54ID4gdl9tYXgueCApIHtcbiAgICAgICAgdGhpcy54ID0gdl9tYXgueDtcbiAgICAgIH1cbiAgICAgIGlmICggdGhpcy55IDwgdl9taW4ueSApIHtcbiAgICAgICAgdGhpcy55ID0gdl9taW4ueTtcbiAgICAgIH0gZWxzZSBpZiAoIHRoaXMueSA+IHZfbWF4LnkgKSB7XG4gICAgICAgIHRoaXMueSA9IHZfbWF4Lnk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGZsb29yOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKCB0aGlzLnggKTtcbiAgICAgIHRoaXMueSA9IE1hdGguZmxvb3IoIHRoaXMueSApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjZWlsOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSBNYXRoLmNlaWwoIHRoaXMueCApO1xuICAgICAgdGhpcy55ID0gTWF0aC5jZWlsKCB0aGlzLnkgKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcm91bmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IE1hdGgucm91bmQoIHRoaXMueCApO1xuICAgICAgdGhpcy55ID0gTWF0aC5yb3VuZCggdGhpcy55ICk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJvdW5kVG9aZXJvOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSAoIHRoaXMueCA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy54ICkgOiBNYXRoLmZsb29yKCB0aGlzLnggKTtcbiAgICAgIHRoaXMueSA9ICggdGhpcy55IDwgMCApID8gTWF0aC5jZWlsKCB0aGlzLnkgKSA6IE1hdGguZmxvb3IoIHRoaXMueSApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBuZWdhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IC0gdGhpcy54O1xuICAgICAgdGhpcy55ID0gLSB0aGlzLnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRvdDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2Lnk7XG4gICAgfSxcbiAgICBsZW5ndGhTcTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueTtcbiAgICB9LFxuICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmxlbmd0aFNxKCkpO1xuICAgIH0sXG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcy5kaXZTY2FsYXIodGhpcy5sZW5ndGgoKSk7XG4gICAgfSxcbiAgICBkaXN0YW5jZVRvOiBmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGR4ID0gdGhpcy54IC0gdi54O1xuICAgICAgdmFyIGR5ID0gdGhpcy55IC0gdi55O1xuICAgICAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgfSxcbiAgICBzZXRMZW5ndGg6IGZ1bmN0aW9uIChsKSB7XG4gICAgICB2YXIgb2xkTGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcbiAgICAgIGlmICggb2xkTGVuZ3RoICE9PSAwICYmIGwgIT09IG9sZExlbmd0aCApIHtcbiAgICAgICAgdGhpcy5tdWx0U2NhbGFyKGwgLyBvbGRMZW5ndGgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyKHRoaXMueCwgdGhpcy55KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gVmVjdG9yMjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xuIl19
