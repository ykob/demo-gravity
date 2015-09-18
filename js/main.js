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
    mover.collideBorder(false, body_width, body_height, 0, true);
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
    mover.collide(movers[index], preserve_impulse);
  }
}

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
    rebound: function(vector, e) {
      var dot = this.acceleration.clone().dot(vector);
      this.acceleration.sub(vector.multScalar(2 * dot));
      this.acceleration.multScalar(e);
    },
    direct: function(vector) {
      var v = vector.clone().sub(this.position);
      this.direction = Math.atan2(v.y, v.x);
    },
    collide: function(target, preserve_impulse) {
      var distance = this.velocity.distanceTo(target.velocity);
      var rebound_distance = this.radius + target.radius;
      var damping = 0.9;
      
      if (distance < rebound_distance) {
        var overlap = Math.abs(distance - rebound_distance);
        var this_normal = this.velocity.clone().sub(target.velocity).normalize();
        var target_normal = target.velocity.clone().sub(this.velocity).normalize();

        this.velocity.sub(target_normal.clone().multScalar(overlap / 2));
        target.velocity.sub(this_normal.clone().multScalar(overlap / 2));
        
        if(preserve_impulse){
          var scalar1 = target.acceleration.length();
          var scalar2 = this.acceleration.length();
          
          this.acceleration.sub(this_normal.multScalar(scalar1 / -2)).multScalar(damping);
          target.acceleration.sub(target_normal.multScalar(scalar2 / -2)).multScalar(damping);
          if (Math.abs(this.acceleration.x) < 1) this.acceleration.x = 0;
          if (Math.abs(this.acceleration.y) < 1) this.acceleration.y = 0;
          if (Math.abs(target.acceleration.x) < 1) target.acceleration.x = 0;
          if (Math.abs(target.acceleration.y) < 1) target.acceleration.y = 0;
        }
      }
    },
    collideBorder: function(top, right, bottom, left, preserve_impulse) {
      var damping = 0.8;
      
      if (top !== false && this.position.y - this.radius < top) {
        var normal = new Vector2(0, 1);
        this.velocity.y = this.radius;
        if (preserve_impulse) this.acceleration.y *= -1 * damping;
      }
      if (right !== false && this.position.x + this.radius > right) {
        var normal = new Vector2(-1, 0);
        this.velocity.x = right - this.radius;
        if (preserve_impulse) this.acceleration.x *= -1 * damping;
      }
      if (bottom !== false && this.position.y + this.radius > bottom) {
        var normal = new Vector2(0, -1);
        this.velocity.y = bottom - this.radius;
        if (preserve_impulse) this.acceleration.y *= -1 * damping;
      }
      if (left !== false && this.position.x - this.radius < left) {
        var normal = new Vector2(1, 0);
        this.velocity.x = this.radius;
        if (preserve_impulse) this.acceleration.x *= -1 * damping;
      }
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xuICB2YXIgdGltZXI7XG5cbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBjYWxsYmFjayhldmVudCk7XG4gICAgfSwgNTAwKTtcbiAgfSwgZmFsc2UpO1xufTtcbiIsInZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XG5cbnZhciBleHBvcnRzID0ge1xuICBmcmljdGlvbjogZnVuY3Rpb24odmVjdG9yLCB2YWx1ZSkge1xuICAgIHZhciBmb3JjZSA9IHZlY3Rvci5jbG9uZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIoLTEpO1xuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIodmFsdWUpO1xuICAgIHJldHVybiBmb3JjZTtcbiAgfSxcbiAgZHJhZzogZnVuY3Rpb24odmVjdG9yLCB2YWx1ZSkge1xuICAgIHZhciBmb3JjZSA9IHZlY3Rvci5jbG9uZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIoLTEpO1xuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xuICAgIGZvcmNlLm11bHRTY2FsYXIodmVjdG9yLmxlbmd0aCgpICogdmFsdWUpO1xuICAgIHJldHVybiBmb3JjZTtcbiAgfSxcbiAgaG9vazogZnVuY3Rpb24odl92ZWxvY2l0eSwgdl9hbmNob3IsIGspIHtcbiAgICB2YXIgZm9yY2UgPSB2X3ZlbG9jaXR5LmNsb25lKCkuc3ViKHZfYW5jaG9yKTtcbiAgICB2YXIgZGlzdGFuY2UgPSBmb3JjZS5sZW5ndGgoKTtcbiAgICBpZiAoZGlzdGFuY2UgPiAwKSB7XG4gICAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICAgIGZvcmNlLm11bHRTY2FsYXIoLTEgKiBrICogZGlzdGFuY2UpO1xuICAgICAgcmV0dXJuIGZvcmNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIoKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cztcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xudmFyIEZvcmNlID0gcmVxdWlyZSgnLi9mb3JjZScpO1xudmFyIE1vdmVyID0gcmVxdWlyZSgnLi9tb3ZlcicpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xuXG52YXIgYm9keV93aWR0aCAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMjtcbnZhciBib2R5X2hlaWdodCA9IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0ICogMjtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG52YXIgbGFzdF90aW1lX2FjdGl2YXRlID0gRGF0ZS5ub3coKTtcbnZhciB2ZWN0b3JfdG91Y2hfc3RhcnQgPSBuZXcgVmVjdG9yMigpO1xudmFyIHZlY3Rvcl90b3VjaF9tb3ZlID0gbmV3IFZlY3RvcjIoKTtcbnZhciB2ZWN0b3JfdG91Y2hfZW5kID0gbmV3IFZlY3RvcjIoKTtcbnZhciBpc190b3VjaGVkID0gZmFsc2U7XG5cbnZhciBtb3ZlcnMgPSBbXTtcbnZhciBjb3VudF9tb3ZlcnMgPSAwO1xudmFyIHVuaXRfbW92ZXIgPSAzMDA7XG5cbnZhciBncmF2aXR5ID0gbmV3IFZlY3RvcjIoMCwgMSk7XG5cbnZhciBpbml0ID0gZnVuY3Rpb24oKSB7XG4gIHBvb2xNb3ZlcigpO1xuICByZW5kZXJsb29wKCk7XG4gIHNldEV2ZW50KCk7XG4gIHJlc2l6ZUNhbnZhcygpO1xuICBkZWJvdW5jZSh3aW5kb3csICdyZXNpemUnLCBmdW5jdGlvbihldmVudCl7XG4gICAgcmVzaXplQ2FudmFzKCk7XG4gIH0pO1xufTtcblxudmFyIHBvb2xNb3ZlciA9IGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bml0X21vdmVyOyBpKyspIHtcbiAgICB2YXIgbW92ZXIgPSBuZXcgTW92ZXIoKTtcbiAgICBcbiAgICBtb3ZlcnMucHVzaChtb3Zlcik7XG4gIH1cbiAgY291bnRfbW92ZXJzICs9IHVuaXRfbW92ZXI7XG59O1xuXG52YXIgdXBkYXRlTW92ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG1vdmVyID0gbW92ZXJzW2ldO1xuICAgIFxuICAgIGlmICghbW92ZXIuaXNfYWN0aXZlKSBjb250aW51ZTtcblxuICAgIGlmIChtb3Zlci5hY2NlbGVyYXRpb24ubGVuZ3RoKCkgPCAyKSB7XG4gICAgICBtb3Zlci50aW1lICsrO1xuICAgIH1cbiAgICBpZiAobW92ZXIudGltZSA+IDIwKSB7XG4gICAgICBtb3Zlci5yYWRpdXMgLT0gbW92ZXIucmFkaXVzIC8gMTA7XG4gICAgfVxuICAgIGlmIChtb3Zlci5yYWRpdXMgPCAxMCkge1xuICAgICAgbW92ZXIuaW5hY3RpdmF0ZSgpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIFxuICAgIG1vdmVyLmFwcGx5Rm9yY2UoZ3Jhdml0eSk7XG4gICAgbW92ZXIuYXBwbHlGcmljdGlvbigpO1xuICAgIG1vdmVyLnVwZGF0ZVZlbG9jaXR5KCk7XG4gICAgY29sbGlkZU1vdmVyKG1vdmVyLCBpLCBtb3ZlcnMsIHRydWUpO1xuICAgIG1vdmVyLmNvbGxpZGVCb3JkZXIoZmFsc2UsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0LCAwLCB0cnVlKTtcbiAgICBjb2xsaWRlTW92ZXIobW92ZXIsIGksIG1vdmVycywgZmFsc2UpO1xuICAgIGNvbGxpZGVNb3Zlcihtb3ZlciwgaSwgbW92ZXJzLCBmYWxzZSk7XG4gICAgY29sbGlkZU1vdmVyKG1vdmVyLCBpLCBtb3ZlcnMsIGZhbHNlKTtcbiAgICBtb3Zlci51cGRhdGVQb3NpdGlvbigpO1xuICAgIG1vdmVyc1tpXS5kcmF3KGN0eCk7XG4gIH1cbn07XG5cbnZhciBjb2xsaWRlTW92ZXIgPSBmdW5jdGlvbihtb3ZlciwgaSwgbW92ZXJzLCBwcmVzZXJ2ZV9pbXB1bHNlKSB7XG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBtb3ZlcnMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgaWYgKGluZGV4ID09PSBpKSBjb250aW51ZTtcbiAgICBtb3Zlci5jb2xsaWRlKG1vdmVyc1tpbmRleF0sIHByZXNlcnZlX2ltcHVsc2UpO1xuICB9XG59XG5cbnZhciBhY3RpdmF0ZU1vdmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdmVjdG9yID0gbmV3IFZlY3RvcjIoVXRpbC5nZXRSYW5kb21JbnQoMCwgYm9keV93aWR0aCksIGJvZHlfaGVpZ2h0IC8gMiAqIC0xKTtcbiAgdmFyIHJhZGlhbiA9IDA7XG4gIHZhciBzY2FsYXIgPSAwO1xuICB2YXIgeCA9IDA7XG4gIHZhciB5ID0gMDtcbiAgdmFyIGZvcmNlID0gbmV3IFZlY3RvcjIoKTtcbiAgXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG1vdmVyID0gbW92ZXJzW2ldO1xuICAgIFxuICAgIGlmIChtb3Zlci5pc19hY3RpdmUpIGNvbnRpbnVlO1xuICAgIFxuICAgIHJhZGlhbiA9IFV0aWwuZ2V0UmFkaWFuKFV0aWwuZ2V0UmFuZG9tSW50KDcwLCAxMTApKTtcbiAgICBzY2FsYXIgPSBVdGlsLmdldFJhbmRvbUludCgxMCwgMjApO1xuICAgIHggPSBNYXRoLmNvcyhyYWRpYW4pICogc2NhbGFyO1xuICAgIHkgPSBNYXRoLnNpbihyYWRpYW4pICogc2NhbGFyO1xuICAgIGZvcmNlLnNldCh4LCB5KTtcblxuICAgIG1vdmVyLmFjdGl2YXRlKCk7XG4gICAgbW92ZXIuaW5pdCh2ZWN0b3IsIChib2R5X3dpZHRoICsgYm9keV9oZWlnaHQpIC8gMjAwKTtcbiAgICBtb3Zlci5hcHBseUZvcmNlKGZvcmNlKTtcbiAgICBcbiAgICBicmVhaztcbiAgfVxufTtcblxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICBjdHguY2xlYXJSZWN0KDAsIDAsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcbiAgdXBkYXRlTW92ZXIoKTtcbn07XG5cbnZhciByZW5kZXJsb29wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICBcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcmxvb3ApO1xuICByZW5kZXIoKTtcbiAgaWYgKG5vdyAtIGxhc3RfdGltZV9hY3RpdmF0ZSA+IDEwKSB7XG4gICAgYWN0aXZhdGVNb3ZlcigpO1xuICAgIGxhc3RfdGltZV9hY3RpdmF0ZSA9IERhdGUubm93KCk7XG4gIH1cbn07XG5cbnZhciByZXNpemVDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgYm9keV93aWR0aCAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMjtcbiAgYm9keV9oZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAqIDI7XG5cbiAgY2FudmFzLndpZHRoID0gYm9keV93aWR0aDtcbiAgY2FudmFzLmhlaWdodCA9IGJvZHlfaGVpZ2h0O1xuICBjYW52YXMuc3R5bGUud2lkdGggPSBib2R5X3dpZHRoIC8gMiArICdweCc7XG4gIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBib2R5X2hlaWdodCAvIDIgKyAncHgnO1xufTtcblxudmFyIHNldEV2ZW50ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZXZlbnRUb3VjaFN0YXJ0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZlY3Rvcl90b3VjaF9zdGFydC5zZXQoeCwgeSk7XG4gICAgaXNfdG91Y2hlZCA9IHRydWU7XG4gIH07XG4gIFxuICB2YXIgZXZlbnRUb3VjaE1vdmUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdmVjdG9yX3RvdWNoX21vdmUuc2V0KHgsIHkpO1xuICAgIGlmIChpc190b3VjaGVkKSB7XG4gICAgICBcbiAgICB9XG4gIH07XG4gIFxuICB2YXIgZXZlbnRUb3VjaEVuZCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2ZWN0b3JfdG91Y2hfZW5kLnNldCh4LCB5KTtcbiAgICBpc190b3VjaGVkID0gZmFsc2U7XG4gIH07XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoRW5kKCk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoU3RhcnQoZXZlbnQudG91Y2hlc1swXS5jbGllbnRYICogMiwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hFbmQoKTtcbiAgfSk7XG59O1xuXG5pbml0KCk7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcblxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgTW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnBvc2l0aW9uID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBWZWN0b3IyKCk7XG4gICAgdGhpcy5hbmNob3IgPSBuZXcgVmVjdG9yMigpO1xuICAgIHRoaXMucmFkaXVzID0gMDtcbiAgICB0aGlzLm1hc3MgPSAxO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcbiAgICB0aGlzLnIgPSBVdGlsLmdldFJhbmRvbUludCgyMDAsIDI1NSk7XG4gICAgdGhpcy5nID0gVXRpbC5nZXRSYW5kb21JbnQoMCwgMTgwKTtcbiAgICB0aGlzLmIgPSBVdGlsLmdldFJhbmRvbUludCgwLCA1MCk7XG4gICAgdGhpcy5hID0gMTtcbiAgICB0aGlzLnRpbWUgPSAwO1xuICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XG4gIH07XG4gIFxuICBNb3Zlci5wcm90b3R5cGUgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24odmVjdG9yLCBzaXplKSB7XG4gICAgICB0aGlzLnJhZGl1cyA9IFV0aWwuZ2V0UmFuZG9tSW50KHNpemUsIHNpemUgKiA0KTtcbiAgICAgIHRoaXMubWFzcyA9IHRoaXMucmFkaXVzIC8gMTAwO1xuICAgICAgdGhpcy5wb3NpdGlvbiA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy52ZWxvY2l0eSA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy5hbmNob3IgPSB2ZWN0b3IuY2xvbmUoKTtcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLnNldCgwLCAwKTtcbiAgICAgIHRoaXMuYSA9IDE7XG4gICAgICB0aGlzLnRpbWUgPSAwO1xuICAgIH0sXG4gICAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5wb3NpdGlvbi5jb3B5KHRoaXMudmVsb2NpdHkpO1xuICAgIH0sXG4gICAgdXBkYXRlVmVsb2NpdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52ZWxvY2l0eS5hZGQodGhpcy5hY2NlbGVyYXRpb24pO1xuICAgICAgaWYgKHRoaXMudmVsb2NpdHkuZGlzdGFuY2VUbyh0aGlzLnBvc2l0aW9uKSA+PSAxKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0KHRoaXMudmVsb2NpdHkpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYXBwbHlGb3JjZTogZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbi5hZGQodmVjdG9yKTtcbiAgICB9LFxuICAgIGFwcGx5RnJpY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZyaWN0aW9uID0gRm9yY2UuZnJpY3Rpb24odGhpcy5hY2NlbGVyYXRpb24sIDAuMSk7XG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZnJpY3Rpb24pO1xuICAgIH0sXG4gICAgYXBwbHlEcmFnRm9yY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRyYWcgPSBGb3JjZS5kcmFnKHRoaXMuYWNjZWxlcmF0aW9uLCAwLjUpO1xuICAgICAgdGhpcy5hcHBseUZvcmNlKGRyYWcpO1xuICAgIH0sXG4gICAgaG9vazogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZm9yY2UgPSBGb3JjZS5ob29rKHRoaXMudmVsb2NpdHksIHRoaXMuYW5jaG9yLCB0aGlzLmspO1xuICAgICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcbiAgICB9LFxuICAgIHJlYm91bmQ6IGZ1bmN0aW9uKHZlY3RvciwgZSkge1xuICAgICAgdmFyIGRvdCA9IHRoaXMuYWNjZWxlcmF0aW9uLmNsb25lKCkuZG90KHZlY3Rvcik7XG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbi5zdWIodmVjdG9yLm11bHRTY2FsYXIoMiAqIGRvdCkpO1xuICAgICAgdGhpcy5hY2NlbGVyYXRpb24ubXVsdFNjYWxhcihlKTtcbiAgICB9LFxuICAgIGRpcmVjdDogZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICB2YXIgdiA9IHZlY3Rvci5jbG9uZSgpLnN1Yih0aGlzLnBvc2l0aW9uKTtcbiAgICAgIHRoaXMuZGlyZWN0aW9uID0gTWF0aC5hdGFuMih2LnksIHYueCk7XG4gICAgfSxcbiAgICBjb2xsaWRlOiBmdW5jdGlvbih0YXJnZXQsIHByZXNlcnZlX2ltcHVsc2UpIHtcbiAgICAgIHZhciBkaXN0YW5jZSA9IHRoaXMudmVsb2NpdHkuZGlzdGFuY2VUbyh0YXJnZXQudmVsb2NpdHkpO1xuICAgICAgdmFyIHJlYm91bmRfZGlzdGFuY2UgPSB0aGlzLnJhZGl1cyArIHRhcmdldC5yYWRpdXM7XG4gICAgICB2YXIgZGFtcGluZyA9IDAuOTtcbiAgICAgIFxuICAgICAgaWYgKGRpc3RhbmNlIDwgcmVib3VuZF9kaXN0YW5jZSkge1xuICAgICAgICB2YXIgb3ZlcmxhcCA9IE1hdGguYWJzKGRpc3RhbmNlIC0gcmVib3VuZF9kaXN0YW5jZSk7XG4gICAgICAgIHZhciB0aGlzX25vcm1hbCA9IHRoaXMudmVsb2NpdHkuY2xvbmUoKS5zdWIodGFyZ2V0LnZlbG9jaXR5KS5ub3JtYWxpemUoKTtcbiAgICAgICAgdmFyIHRhcmdldF9ub3JtYWwgPSB0YXJnZXQudmVsb2NpdHkuY2xvbmUoKS5zdWIodGhpcy52ZWxvY2l0eSkubm9ybWFsaXplKCk7XG5cbiAgICAgICAgdGhpcy52ZWxvY2l0eS5zdWIodGFyZ2V0X25vcm1hbC5jbG9uZSgpLm11bHRTY2FsYXIob3ZlcmxhcCAvIDIpKTtcbiAgICAgICAgdGFyZ2V0LnZlbG9jaXR5LnN1Yih0aGlzX25vcm1hbC5jbG9uZSgpLm11bHRTY2FsYXIob3ZlcmxhcCAvIDIpKTtcbiAgICAgICAgXG4gICAgICAgIGlmKHByZXNlcnZlX2ltcHVsc2Upe1xuICAgICAgICAgIHZhciBzY2FsYXIxID0gdGFyZ2V0LmFjY2VsZXJhdGlvbi5sZW5ndGgoKTtcbiAgICAgICAgICB2YXIgc2NhbGFyMiA9IHRoaXMuYWNjZWxlcmF0aW9uLmxlbmd0aCgpO1xuICAgICAgICAgIFxuICAgICAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLnN1Yih0aGlzX25vcm1hbC5tdWx0U2NhbGFyKHNjYWxhcjEgLyAtMikpLm11bHRTY2FsYXIoZGFtcGluZyk7XG4gICAgICAgICAgdGFyZ2V0LmFjY2VsZXJhdGlvbi5zdWIodGFyZ2V0X25vcm1hbC5tdWx0U2NhbGFyKHNjYWxhcjIgLyAtMikpLm11bHRTY2FsYXIoZGFtcGluZyk7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKHRoaXMuYWNjZWxlcmF0aW9uLngpIDwgMSkgdGhpcy5hY2NlbGVyYXRpb24ueCA9IDA7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKHRoaXMuYWNjZWxlcmF0aW9uLnkpIDwgMSkgdGhpcy5hY2NlbGVyYXRpb24ueSA9IDA7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKHRhcmdldC5hY2NlbGVyYXRpb24ueCkgPCAxKSB0YXJnZXQuYWNjZWxlcmF0aW9uLnggPSAwO1xuICAgICAgICAgIGlmIChNYXRoLmFicyh0YXJnZXQuYWNjZWxlcmF0aW9uLnkpIDwgMSkgdGFyZ2V0LmFjY2VsZXJhdGlvbi55ID0gMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgY29sbGlkZUJvcmRlcjogZnVuY3Rpb24odG9wLCByaWdodCwgYm90dG9tLCBsZWZ0LCBwcmVzZXJ2ZV9pbXB1bHNlKSB7XG4gICAgICB2YXIgZGFtcGluZyA9IDAuODtcbiAgICAgIFxuICAgICAgaWYgKHRvcCAhPT0gZmFsc2UgJiYgdGhpcy5wb3NpdGlvbi55IC0gdGhpcy5yYWRpdXMgPCB0b3ApIHtcbiAgICAgICAgdmFyIG5vcm1hbCA9IG5ldyBWZWN0b3IyKDAsIDEpO1xuICAgICAgICB0aGlzLnZlbG9jaXR5LnkgPSB0aGlzLnJhZGl1cztcbiAgICAgICAgaWYgKHByZXNlcnZlX2ltcHVsc2UpIHRoaXMuYWNjZWxlcmF0aW9uLnkgKj0gLTEgKiBkYW1waW5nO1xuICAgICAgfVxuICAgICAgaWYgKHJpZ2h0ICE9PSBmYWxzZSAmJiB0aGlzLnBvc2l0aW9uLnggKyB0aGlzLnJhZGl1cyA+IHJpZ2h0KSB7XG4gICAgICAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigtMSwgMCk7XG4gICAgICAgIHRoaXMudmVsb2NpdHkueCA9IHJpZ2h0IC0gdGhpcy5yYWRpdXM7XG4gICAgICAgIGlmIChwcmVzZXJ2ZV9pbXB1bHNlKSB0aGlzLmFjY2VsZXJhdGlvbi54ICo9IC0xICogZGFtcGluZztcbiAgICAgIH1cbiAgICAgIGlmIChib3R0b20gIT09IGZhbHNlICYmIHRoaXMucG9zaXRpb24ueSArIHRoaXMucmFkaXVzID4gYm90dG9tKSB7XG4gICAgICAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigwLCAtMSk7XG4gICAgICAgIHRoaXMudmVsb2NpdHkueSA9IGJvdHRvbSAtIHRoaXMucmFkaXVzO1xuICAgICAgICBpZiAocHJlc2VydmVfaW1wdWxzZSkgdGhpcy5hY2NlbGVyYXRpb24ueSAqPSAtMSAqIGRhbXBpbmc7XG4gICAgICB9XG4gICAgICBpZiAobGVmdCAhPT0gZmFsc2UgJiYgdGhpcy5wb3NpdGlvbi54IC0gdGhpcy5yYWRpdXMgPCBsZWZ0KSB7XG4gICAgICAgIHZhciBub3JtYWwgPSBuZXcgVmVjdG9yMigxLCAwKTtcbiAgICAgICAgdGhpcy52ZWxvY2l0eS54ID0gdGhpcy5yYWRpdXM7XG4gICAgICAgIGlmIChwcmVzZXJ2ZV9pbXB1bHNlKSB0aGlzLmFjY2VsZXJhdGlvbi54ICo9IC0xICogZGFtcGluZztcbiAgICAgIH1cbiAgICB9LFxuICAgIGRyYXc6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoJyArIHRoaXMuciArICcsJyArIHRoaXMuZyArICcsJyArIHRoaXMuYiArICcsJyArIHRoaXMuYSArICcpJztcbiAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICBjb250ZXh0LmFyYyh0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgdGhpcy5yYWRpdXMsIDAsIE1hdGguUEkgLyAxODAsIHRydWUpO1xuICAgICAgY29udGV4dC5maWxsKCk7XG4gICAgfSxcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5pc19hY3RpdmUgPSB0cnVlO1xuICAgIH0sXG4gICAgaW5hY3RpdmF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5pc19hY3RpdmUgPSBmYWxzZTtcbiAgICB9XG4gIH07XG4gIFxuICByZXR1cm4gTW92ZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMoKTtcbiIsInZhciBleHBvcnRzID0ge1xuICBnZXRSYW5kb21JbnQ6IGZ1bmN0aW9uKG1pbiwgbWF4KXtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluO1xuICB9LFxuICBnZXREZWdyZWU6IGZ1bmN0aW9uKHJhZGlhbikge1xuICAgIHJldHVybiByYWRpYW4gLyBNYXRoLlBJICogMTgwO1xuICB9LFxuICBnZXRSYWRpYW46IGZ1bmN0aW9uKGRlZ3JlZXMpIHtcbiAgICByZXR1cm4gZGVncmVlcyAqIE1hdGguUEkgLyAxODA7XG4gIH0sXG4gIGdldFNwaGVyaWNhbDogZnVuY3Rpb24ocmFkMSwgcmFkMiwgcikge1xuICAgIHZhciB4ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLmNvcyhyYWQyKSAqIHI7XG4gICAgdmFyIHogPSBNYXRoLmNvcyhyYWQxKSAqIE1hdGguc2luKHJhZDIpICogcjtcbiAgICB2YXIgeSA9IE1hdGguc2luKHJhZDEpICogcjtcbiAgICByZXR1cm4gW3gsIHksIHpdO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XG4iLCIvLyBcbi8vIOOBk+OBrlZlY3RvcjLjgq/jg6njgrnjga/jgIF0aHJlZS5qc+OBrlRIUkVFLlZlY3RvcjLjgq/jg6njgrnjga7oqIjnrpflvI/jga7kuIDpg6jjgpLliKnnlKjjgZfjgabjgYTjgb7jgZnjgIJcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tcmRvb2IvdGhyZWUuanMvYmxvYi9tYXN0ZXIvc3JjL21hdGgvVmVjdG9yMi5qcyNMMzY3XG4vLyBcblxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgVmVjdG9yMiA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgdGhpcy55ID0geSB8fCAwO1xuICB9O1xuICBcbiAgVmVjdG9yMi5wcm90b3R5cGUgPSB7XG4gICAgc2V0OiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgdGhpcy54ID0geDtcbiAgICAgIHRoaXMueSA9IHk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNvcHk6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggPSB2Lng7XG4gICAgICB0aGlzLnkgPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGFkZDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCArPSB2Lng7XG4gICAgICB0aGlzLnkgKz0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBhZGRTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XG4gICAgICB0aGlzLnggKz0gcztcbiAgICAgIHRoaXMueSArPSBzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzdWI6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggLT0gdi54O1xuICAgICAgdGhpcy55IC09IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3ViU2NhbGFyOiBmdW5jdGlvbiAocykge1xuICAgICAgdGhpcy54IC09IHM7XG4gICAgICB0aGlzLnkgLT0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbXVsdDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCAqPSB2Lng7XG4gICAgICB0aGlzLnkgKj0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBtdWx0U2NhbGFyOiBmdW5jdGlvbiAocykge1xuICAgICAgdGhpcy54ICo9IHM7XG4gICAgICB0aGlzLnkgKj0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGl2OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54IC89IHYueDtcbiAgICAgIHRoaXMueSAvPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRpdlNjYWxhcjogZnVuY3Rpb24gKHMpIHtcbiAgICAgIHRoaXMueCAvPSBzO1xuICAgICAgdGhpcy55IC89IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG1pbjogZnVuY3Rpb24gKHYpIHtcbiAgICAgIGlmICggdGhpcy54IDwgdi54ICkgdGhpcy54ID0gdi54O1xuICAgICAgaWYgKCB0aGlzLnkgPCB2LnkgKSB0aGlzLnkgPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG1heDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIGlmICggdGhpcy54ID4gdi54ICkgdGhpcy54ID0gdi54O1xuICAgICAgaWYgKCB0aGlzLnkgPiB2LnkgKSB0aGlzLnkgPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNsYW1wOiBmdW5jdGlvbiAodl9taW4sIHZfbWF4KSB7XG4gICAgICBpZiAoIHRoaXMueCA8IHZfbWluLnggKSB7XG4gICAgICAgIHRoaXMueCA9IHZfbWluLng7XG4gICAgICB9IGVsc2UgaWYgKCB0aGlzLnggPiB2X21heC54ICkge1xuICAgICAgICB0aGlzLnggPSB2X21heC54O1xuICAgICAgfVxuICAgICAgaWYgKCB0aGlzLnkgPCB2X21pbi55ICkge1xuICAgICAgICB0aGlzLnkgPSB2X21pbi55O1xuICAgICAgfSBlbHNlIGlmICggdGhpcy55ID4gdl9tYXgueSApIHtcbiAgICAgICAgdGhpcy55ID0gdl9tYXgueTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZmxvb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IE1hdGguZmxvb3IoIHRoaXMueCApO1xuICAgICAgdGhpcy55ID0gTWF0aC5mbG9vciggdGhpcy55ICk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNlaWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IE1hdGguY2VpbCggdGhpcy54ICk7XG4gICAgICB0aGlzLnkgPSBNYXRoLmNlaWwoIHRoaXMueSApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByb3VuZDogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy54ID0gTWF0aC5yb3VuZCggdGhpcy54ICk7XG4gICAgICB0aGlzLnkgPSBNYXRoLnJvdW5kKCB0aGlzLnkgKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcm91bmRUb1plcm86IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9ICggdGhpcy54IDwgMCApID8gTWF0aC5jZWlsKCB0aGlzLnggKSA6IE1hdGguZmxvb3IoIHRoaXMueCApO1xuICAgICAgdGhpcy55ID0gKCB0aGlzLnkgPCAwICkgPyBNYXRoLmNlaWwoIHRoaXMueSApIDogTWF0aC5mbG9vciggdGhpcy55ICk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG5lZ2F0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy54ID0gLSB0aGlzLng7XG4gICAgICB0aGlzLnkgPSAtIHRoaXMueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZG90OiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcbiAgICB9LFxuICAgIGxlbmd0aFNxOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xuICAgIH0sXG4gICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubGVuZ3RoU3EoKSk7XG4gICAgfSxcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLmRpdlNjYWxhcih0aGlzLmxlbmd0aCgpKTtcbiAgICB9LFxuICAgIGRpc3RhbmNlVG86IGZ1bmN0aW9uICh2KSB7XG4gICAgICB2YXIgZHggPSB0aGlzLnggLSB2Lng7XG4gICAgICB2YXIgZHkgPSB0aGlzLnkgLSB2Lnk7XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KTtcbiAgICB9LFxuICAgIHNldExlbmd0aDogZnVuY3Rpb24gKGwpIHtcbiAgICAgIHZhciBvbGRMZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xuICAgICAgaWYgKCBvbGRMZW5ndGggIT09IDAgJiYgbCAhPT0gb2xkTGVuZ3RoICkge1xuICAgICAgICB0aGlzLm11bHRTY2FsYXIobCAvIG9sZExlbmd0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIodGhpcy54LCB0aGlzLnkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBWZWN0b3IyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XG4iXX0=
