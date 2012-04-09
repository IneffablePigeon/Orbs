$(document).ready(function(){
    var camera, scene, renderer,
        geometry, material;
        
    var fov = 70,
        rotation = 0,
        numBalls = 40,
        balls = [],
        speed = 1,
        boxSize = 100,
        halfBox = boxSize / 2,
        middle = new THREE.Vector3(0, 0, 0),
        axes = ['x', 'y', 'z'];


    var Ball = function(){
        this.radius = Math.random() * 8;

        this.mesh = addSphere(this.radius, Random.position(this.radius), Random.colour(), true, null, false);

        for (var i = 0; i < balls.length; i++) {
            while(areInContact(this, balls[i])){
                this.mesh.position = Random.position(this.radius);
            }
        }
        
        this.speed = new THREE.Vector3(
            Math.random() * speed,
            Math.random() * speed,
            Math.random() * speed
        );
    };

    var bounce = function(b1, b2){
        
        var x = new THREE.Vector3(b1.mesh.position.x - b2.mesh.position.x, b1.mesh.position.y - b2.mesh.position.y, b1.mesh.position.z - b2.mesh.position.z);
        x.normalize();


        var v1 = b1.speed.clone();
        var x1 = x.dot(v1);

        var v1x = x.multiplyScalar(x1);
        var v1y = v1.subSelf(v1x);
        var m1 = Math.pow(b1.radius, 3);;

        x = x.multiplyScalar(-1);

        var v2 = b2.speed.clone();
        var x2 = x.dot(v2);

        var v2x = x.multiplyScalar(x2);
        var v2y = v2.subSelf(v2x);
        var m2 = Math.pow(b2.radius, 3);

        var v1xt = v1x.multiplyScalar((m1 - m2)/(m1 + m2));
        var v2xt = v2x.multiplyScalar((2 * m2)/(m1 + m2));
        b1.speed = v1xt.addSelf(v2xt).clone();
        b1.speed.addSelf(v1y);
     
        var v1xt2 = v1x.multiplyScalar((2 * m1)/(m1 + m2));
        var v2xt2 = v2x.multiplyScalar((m2 - m1)/(m1 + m2));
        b2.speed = v1xt2.addSelf(v2xt2).clone();
        b2.speed.addSelf(v2y);

    };

    var absorb = function(b1, b2){
        var diff = b1.radius > b2.radius;
        var smaller = diff ? b2 : b1;
        var larger = diff ? b1 : b2;
        larger.radius = Math.min(larger.radius + smaller.radius, boxSize - 10);
        balls.splice(balls.indexOf(smaller), 1);
        scene.remove(smaller.mesh);
    };

    var Modes = {
        BOUNCE: 0,
        ABSORB: 1
    };

    var mode = Modes.BOUNCE;

    var collide;
    if(mode === Modes.BOUNCE){
        collide = bounce;
    } else if (mode === Modes.ABSORB){
        collide = absorb;
    }

    var paused = false;

    var oldTime = +new Date(),
        tick = 1;

    var ids = ['game', 'overlay', 'message', 'splash', 'timer'];
    DOM = {};
    for (var i = 0; i < ids.length; i++) {
        id = ids[i];
        DOM[id] = $('#' + id);
    }

    var secs = 0,
        hundredths = 0;

    var stats = new Stats(),
        fpsCounter = $(stats.getDomElement()).addClass('fps');
    $('body').append(fpsCounter);
    window.setInterval(function(){ stats.update(); }, 1000 / 60);

    var startTimer = function(){
        secs = 0;
        hundredths = 0;
        timer = window.setInterval(function(){
            if (paused) { return; }
            timeString = ((secs < 10 ? "0" : "") + secs);
            DOM.timer.text(timeString);
            hundredths++;
            secs = hundredths / 100;
        }, 10);
    };

    var Random = {};

    Random.colour = function(){
        return Math.floor(Math.random() * 16777215);
    };

    Random.range = function(low, high){
        low = low || 0;

        return (Math.random() * (high - low)) + low;
    };

    Random.position = function(r){
        var v = new THREE.Vector3(
            Random.range(-halfBox + r, halfBox - r),
            Random.range(-halfBox + r, halfBox - r),
            Random.range(-halfBox + r, halfBox - r)
        );
        return v;
    };

    var loadMusic = function(){
        music = new Audio("audio/music/level" + currentLevel + ".ogg");
        //there's a loop property but its not supported everywhere so an event listener is better for now.
        music.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
        }, false);
        music.muted = muted;
        music.play();
    };

    var rotateCamera = function(x){
        rotation += x * 0.1;
        camera.position.x = Math.sin(rotation) * 120;
        camera.position.z = Math.cos(rotation) * 120;
        camera.lookAt(middle);
    };

    var bindInputs = function(){
        key('right', function(){
            rotateCamera(1);
        });

        key('left', function(){
            rotateCamera(-1);
        });

        key('p', function(){
            paused = !paused;
        });
    };

    bindInputs();

    var areInContact = function(b1, b2){
        var d = b1.mesh.position.distanceTo(b2.mesh.position);
        var r = b1.radius + b2.radius;
        return d < r;
    };

    var render = function(){
        renderer.render(scene, camera);
    };

    var logic = function(time){
        var i, j,
            h = halfBox;
        for (i = 0; i < balls.length; i++) {
            var ball = balls[i];
            var r = ball.radius;
            for (j = 0; j < balls.length; j++) {
                if(i === j){ break; }

                var ball2 = balls[j];

                if(areInContact(ball, ball2)){
                    collide(ball, ball2);
                }
            }

            for (j = 0; j < 3; j++) {
                var axis = axes[j];
                if(ball.mesh.position[axis] + r > h){
                    ball.speed[axis] *= -1;
                    ball.mesh.position[axis] = h - r;
                }
                if(ball.mesh.position[axis] - r < -h){
                    ball.speed[axis] *= -1;
                    ball.mesh.position[axis] = -h + r;
                }
            }
            
            ball.mesh.position.addSelf(ball.speed);
        }
    };

    var addBalls = function(){
        for (var i = 0; i < numBalls; i++) {
            balls.push(new Ball());
        }
    };

    var init = function(){
        //Things that only happen once, when the page loads happen here
        //If it happens any other time, put it in an external function and call it here.
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        scene.add(camera);
        rotateCamera(0);

        //addLight(170, 330, -160);
        addLight(0, 50, 0);
        //addLight(-170, 330, 160);

        renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        var border = 20;
        renderer.setSize(window.innerWidth - border, window.innerHeight - border);
        renderer.shadowMapEnabled = true;

        DOM.game.append(renderer.domElement);

        $('canvas').css({background : '#ccc'});
        addCube(boxSize, middle, 0xffffff, true, null, true);
        addBalls();
    };

    var run = function(time){
        requestAnimationFrame(run);
        if (paused) { return; }

        render();
        logic(time);
    };

    var addCube = function(size, position, colour, shadows, texture, transparent){
        geometry = new THREE.CubeGeometry(size, size, size);
        
        var args = {
            shading: THREE.SmoothShading
        };

        if (colour) {
            args.color = colour;
        }

        if (texture) {
            args.map = texture;
        }

        if (transparent){
            args.transparent = transparent;
        }

        material = new THREE.MeshLambertMaterial(args);
        material.opacity = 0.2;
        mesh = new THREE.Mesh(geometry, material);

        mesh.castShadow = shadows;
        mesh.receiveShadow = true;
        mesh.doubleSided = true;
        //mesh.overdraw = true;

        mesh.position.addSelf(position);
        
        scene.add(mesh);

        return mesh;
    };

    var addSphere = function(radius, position, colour, shadows, texture, transparent){
        geometry = new THREE.SphereGeometry(radius, 100, 100);
        
        var args = {
            shading: THREE.SmoothShading
        };

        if (colour) {
            args.color = colour;
        }

        if (texture) {
            args.map = texture;
        }

        if (transparent){
            args.transparent = transparent;
        }

        material = new THREE.MeshLambertMaterial(args);
        mesh = new THREE.Mesh(geometry, material);

        mesh.castShadow = shadows;
        mesh.receiveShadow = true;
        //mesh.overdraw = true;

        mesh.position.addSelf(position);
        
        scene.add(mesh);

        return mesh;
    };

    var addLight = function(x, y, z, type){
        type = type || 'directional';
        var light;
        switch(type){
            case 'directional':
                light = new THREE.DirectionalLight(0xffffff, 0.5);
                light.position.set(x, y, z);
                light.castShadow = true;
                break;
            case 'ambient':
                light = new THREE.AmbientLight();
                break;
        }
        
        scene.add(light);
        return light;
    };

    init();
    run();
});
