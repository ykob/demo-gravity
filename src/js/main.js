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
