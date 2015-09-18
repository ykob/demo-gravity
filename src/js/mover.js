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
      
      if (distance < rebound_distance) {
        var overlap = Math.abs(distance - rebound_distance);
        var this_normal = this.velocity.clone().sub(target.velocity).normalize();
        var target_normal = target.velocity.clone().sub(this.velocity).normalize();

        this.velocity.sub(target_normal.clone().multScalar(overlap / 2));
        target.velocity.sub(this_normal.clone().multScalar(overlap / 2));
        
        if(preserve_impulse){
          var scalar1 = target.acceleration.length();
          var scalar2 = this.acceleration.length();
          
          this.acceleration.sub(this_normal.multScalar(scalar1 / -2)).multScalar(0.9);
          target.acceleration.sub(target_normal.multScalar(scalar2 / -2)).multScalar(0.9);
        }
      }
    },
    collideBorder: function(top, right, bottom, left, preserve_impulse) {
      if (top !== false && this.position.y - this.radius < top) {
        var normal = new Vector2(0, 1);
        this.velocity.y = this.radius;
        if (preserve_impulse) this.acceleration.y *= -0.6;
      }
      if (right !== false && this.position.x + this.radius > right) {
        var normal = new Vector2(-1, 0);
        this.velocity.x = right - this.radius;
        if (preserve_impulse) this.acceleration.x *= -0.6;
      }
      if (bottom !== false && this.position.y + this.radius > bottom) {
        var normal = new Vector2(0, -1);
        this.velocity.y = bottom - this.radius;
        if (preserve_impulse) this.acceleration.y *= -0.6;
      }
      if (left !== false && this.position.x - this.radius < left) {
        var normal = new Vector2(1, 0);
        this.velocity.x = this.radius;
        if (preserve_impulse) this.acceleration.x *= -0.6;
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
