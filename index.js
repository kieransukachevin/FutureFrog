let canvas = null;
let engine = null;
var scene, camera, light, box, ground, p, spot, gun, ray, advancedTexture, text, plane;
var showInstruct = true;
let bugs = [];
let platforms = [];
let speed = 0.3;
let speedX = 0;
let speedZ = 0;
let pointerX, pointerZ = 0;
let player;
let laser;
let lastTime = 0;
let bugRespawnTime = 0;
let gravity = 0.05;
let speedY = 0;
let jump = true;
let lives = 3;
let lifeIcons = [];
let bufferTime = 4000;
let upperLeftLeg, lowerLeftLeg, upperRightLeg, lowerRightLeg;

function createScene() {
    function setupScene() {
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(.5, .5, .5);

        scene.enablePhysics();
        scene.getPhysicsEngine().setGravity(new BABYLON.Vector3(0, -20, 0));

        scene.gravity = new BABYLON.Vector3(0, -10, 0);
        scene.collisionsEnabled = true;
    }          
    setupScene();
    setupMenu();
    setupInstructions();
    setupPlayer();
    // setupBugs();
    setupCamera();
    setupLights();
    setupGround();
    setupControls();
    setupLaser();
    setupEnv();
    setupPlatforms();
    setupLifeIcons();
    setupPlaneBelowGround();
    // setupShadows();

    spot = BABYLON.MeshBuilder.CreatePlane('', {width: 1, height: 1}, scene);
    var mat = new BABYLON.StandardMaterial('', scene);
    mat.diffuseColor = new BABYLON.Color3(1, 0.7, 0.7);
    spot.material = mat;
    spot.rotation.x = Math.PI/2;
    spot.renderingGroupId = 1;

    function lookAt(tM, lAt) {
        /*
         * tM = mesh to rotate.
         * lAt = vector3(xyz) of target position to look at
         */
         
        lAt = lAt.subtract(tM.position);
        tM.rotationQuaternion = null;
        tM.rotation.y = -Math.atan2(lAt.z, lAt.x) - Math.PI/2;
    }    

    // Following function largely sampled from https://www.babylonjs-playground.com/#UES9PH#12
    clearInterval(window.Intl);
    window.Intl = setInterval(function()
    {
        var c = scene.getEngine().getRenderingCanvasClientRect();
        var target = BABYLON.Vector3.Unproject(
            new BABYLON.Vector3(scene.pointerX, scene.pointerY, 0),
            c.width,
            c.height,
            new BABYLON.Matrix.Identity(),
            camera.getViewMatrix(),
            camera.getProjectionMatrix()
        );
        target.x = camera.position.x - target.x;
        target.y = camera.position.y - target.y;
        target.z = camera.position.z - target.z;
        var p = getZeroPlaneVector(camera.position, target);
        spot.position = p;
        if (p && player) {
            lookAt(player, p);
        }

        // Following code not from above source
        if (p && gun && (performance.now() - lastTime > 200)) {
            lastTime = performance.now();
            laser.lookAt(p);
            laser.material = new BABYLON.StandardMaterial("myMaterial", scene);
            laser.material.diffuseColor = new BABYLON.Color3(1, 0.53, 0.53);
            laser.material.ambientColor = new BABYLON.Color3(1, 0, 0);
            new BABYLON.Animation.CreateAndStartAnimation(
                "anim", laser, "position", 30, 3, new BABYLON.Vector3(box.position.x, 
                box.position.y+1, box.position.z), p, 
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, null,
                ()=> {
                    laser.material = new BABYLON.StandardMaterial("myMaterial", scene);
                    laser.material.alpha = 0;
                }
            );
        }
	}, 40);

    return scene;
};

function init() {
    canvas = document.getElementById("renderCanvas");
    engine = new BABYLON.Engine(
        canvas,
        true,
        { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false }
    );
    scene = createScene();
    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        scene.render();
    });
    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });
}

function setupMenu() {
    advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    var button = BABYLON.GUI.Button.CreateSimpleButton("but", "Controls");
    button.width = "100px"
    button.height = "50px";
    button.color = "white";
    button.cornerRadius = 15;
    button.background = "#9BC993";
    button.left = 500;
    button.top = -300;
    
    button.onPointerUpObservable.add(showInstructions);
    advancedTexture.addControl(button);
}

function setupInstructions() {
    text = new BABYLON.GUI.TextBlock();
    text.text = "W, A, S, D, \nSpace Bar, and Mouse Pointer";
    text.color = "white";
    text.left = 500;
    text.top = -200;
    text.fontSize = 22;
    advancedTexture.addControl(text);
    text.isVisible = false;
}

function showInstructions() {
    if (text.isVisible) {
        text.isVisible = false;
    } else {
        text.isVisible = true;
    }
}

function setupCamera() {
    camera = new BABYLON.FollowCamera("FollowCamera",new BABYLON.Vector3(10, 10, 10), scene, box);
    camera.heightOffset = 20;
    camera.radius = 35;
}

function setupLights() {
    var light = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(-1, 1, 0), scene);
	light.diffuse = new BABYLON.Color3(0.87, 0.87, 0.87);
	light.specular = new BABYLON.Color3(0.62, 0.65, 0.87);
	light.groundColor = new BABYLON.Color3(0.34, 0.4, 0.76);
}

function setupGround() {
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 40, height: 40}, scene);
    ground.checkCollisions = true;
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
}

function setupPlayer() {
    function frogImportFinished (meshes) {
        var frogBodyMaterial = new BABYLON.StandardMaterial("myMaterial", scene);

        frogBodyMaterial.diffuseColor = new BABYLON.Color3(0.75, 1, 0.75);
        frogBodyMaterial.ambientColor = new BABYLON.Color3(1, 0, 0);

        meshes.forEach((mesh) => mesh.material = frogBodyMaterial);

        // Setup particles
        const particleSystem = new BABYLON.ParticleSystem("particles", 3000);
        particleSystem.particleTexture = new BABYLON.Texture("particle.jpeg");
        particleSystem.emitter = meshes[19];
        particleSystem.start();
        gun = meshes[19];

        // Glasses material
        meshes[15].material = new BABYLON.StandardMaterial("myMaterial", scene);
        meshes[15].material.diffuseColor = new BABYLON.Color3(1, 0.53, 0.53);
        meshes[15].material.ambientColor = new BABYLON.Color3(1, 0.53, 0.53);

        // Shoulder pads material
        meshes[16].material = new BABYLON.StandardMaterial("myMaterial", scene);
        meshes[16].material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.81);
        meshes[16].material.ambientColor = new BABYLON.Color3(0.6, 0.6, 0.81);
        meshes[17].material = new BABYLON.StandardMaterial("myMaterial", scene);
        meshes[17].material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.81);
        meshes[17].material.ambientColor = new BABYLON.Color3(0.6, 0.6, 0.81);

        // Gun material
        meshes[18].material = new BABYLON.StandardMaterial("myMaterial", scene);
        meshes[18].material.diffuseColor = new BABYLON.Color3(0.46, 0.46, 0.64);
        meshes[18].material.ambientColor = new BABYLON.Color3(0.46, 0.46, 0.64);
        meshes[19].material = new BABYLON.StandardMaterial("myMaterial", scene);
        meshes[19].material.diffuseColor = new BABYLON.Color3(0.46, 0.46, 0.64);
        meshes[19].material.ambientColor = new BABYLON.Color3(0.46, 0.46, 0.64);

        player = meshes[0];
        upperLeftLeg = meshes[9];
        lowerLeftLeg = meshes[8];
        upperRightLeg = meshes[12];
        lowerRightLeg = meshes[11];

        player.position.y = 0.8;
        player.rotate(BABYLON.Axis.Y, 3*Math.PI/2, BABYLON.Space.WORLD);
        player.bakeCurrentTransformIntoVertices();

        player.parent = box;
    }

    BABYLON.SceneLoader.ImportMesh("", "", "frog.glb", scene, frogImportFinished);

    box = BABYLON.MeshBuilder.CreateBox("box", {height: 1, width: 1, depth: 1}, scene);
    box.material = new BABYLON.StandardMaterial("myMaterial", scene);
    box.material.alpha = 0;
    box.position.y = 10;
    box.checkCollisions = true;
    box.onCollideObservable.add(
        function(m, evt) {
            jump = true;
            if (m == plane) {
                resetPlayerPosition();
            }
        }
    );
}

function resetPlayerPosition() {
    box.position.x = 0;
    box.position.z = 0;
    box.position.y = 10;
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function randomVectorOffset(vector) {
    var newVector = new BABYLON.Vector3(0, 0, 0);
    newVector.x = randomIntFromInterval(vector.x - 1, vector.x + 1);
    newVector.y = randomIntFromInterval(vector.y - 1, vector.y + 1);
    newVector.z = randomIntFromInterval(vector.z - 1, vector.z + 1);

    return newVector;
}

function setupBugs() {
    var randomNum = randomIntFromInterval(1, 4);
    for (var i = 0; i < randomNum; i++) {
        createBug();
    }
}

function createBug() {
    var bug = BABYLON.MeshBuilder.CreateBox("box", {height: 1, width: 1, depth: 1}, scene);

    var myMaterial = new BABYLON.StandardMaterial("myMaterial", scene);

    myMaterial.diffuseColor = new BABYLON.Color3(0.68, 0.58, 0.71);
    myMaterial.ambientColor = new BABYLON.Color3(1, 0, 0);

    bug.material = myMaterial;

    bug.position.y = randomIntFromInterval(3, 4);
    bug.position.x = randomIntFromInterval(1, 20);
    bug.position.z = randomIntFromInterval(1, 20);

    bug.scaling = new BABYLON.Vector3(randomIntFromInterval(1,2),randomIntFromInterval(1,2),randomIntFromInterval(1,2));

    bugs.push(bug);
}

function getHorizontalPlaneVector(y, pos, rot)
{
    if(!rot.y)
    {
        return null; // no solution, as it will never hit the zero plane
    }
    return new BABYLON.Vector3(
        pos.x - (pos.y - y) * rot.x / rot.y,
        0,
        pos.z - (pos.y - y) * rot.z / rot.y
    );
};

function getZeroPlaneVector(pos, rot)
{
    return getHorizontalPlaneVector(0, pos, rot);
};

function setupLaser() {
    laser = BABYLON.MeshBuilder.CreateBox("laser", {height: 0.5, width: 0.5, depth: 1}, scene);
}

function setupShadows() {
    var shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.addShadowCaster(player);
    ground.receiveShadows = true;
}

function setupEnv() {
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.006;
    scene.fogColor = new BABYLON.Color3(0.79, 0.91, 0.79);

    scene.clearColor = new BABYLON.Color3(0.75, 0.78, 1);
}

function setupPlatforms() {
    var randomNum = randomIntFromInterval(4, 8);
    for (var i = 0; i < randomNum; i++) {
        var platform = BABYLON.MeshBuilder.CreateBox("box", {height: randomIntFromInterval(1, 3), width: randomIntFromInterval(4, 8), depth: randomIntFromInterval(4, 8)}, scene);

        var myMaterial = new BABYLON.StandardMaterial("myMaterial", scene);

        myMaterial.diffuseColor = new BABYLON.Color3(0.92, 0.97, 0.85);
        myMaterial.ambientColor = new BABYLON.Color3(0.92, 0.97, 0.85);

        platform.material = myMaterial;

        platform.position.y = 5;
        platform.position.x = randomIntFromInterval(-20, 20);
        platform.position.z = randomIntFromInterval(-20, 20);

        platform.physicsImpostor = new BABYLON.PhysicsImpostor(platform, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0 }, scene);
        platform.checkCollisions = true;

        platforms.push(platform);
    }
}

function setupLifeIcons() {
    var iconSpriteManager = new BABYLON.SpriteManager('life', 'life_icon.png', 1, {width:1080, height:1080}, scene);

    const icon1 = new BABYLON.Sprite("life", iconSpriteManager);
    icon1.width = 2;
    icon1.height = 2;
    icon1.position.x = 15;
    icon1.position.y = 10;
    lifeIcons.push(icon1);

    var iconSpriteManager = new BABYLON.SpriteManager('life', 'life_icon.png', 1, {width:1080, height:1080}, scene);

    const icon2 = new BABYLON.Sprite("life", iconSpriteManager);
    icon2.width = 2;
    icon2.height = 2;
    icon2.position.x = 13;
    icon2.position.y = 10;
    lifeIcons.push(icon2);

    var iconSpriteManager = new BABYLON.SpriteManager('life', 'life_icon.png', 1, {width:1080, height:1080}, scene);

    const icon3 = new BABYLON.Sprite("life", iconSpriteManager);
    icon3.width = 2;
    icon3.height = 2;
    icon3.position.x = 11;
    icon3.position.y = 10;
    lifeIcons.push(icon3);
}

function vecToLocal(vector, mesh){
    var m = mesh.getWorldMatrix();
    var v = BABYLON.Vector3.TransformCoordinates(vector, m);
    return v;		 
}

function legAnimations() {

}

function setupPlaneBelowGround() {
    plane = BABYLON.MeshBuilder.CreateBox('planeBelowGround', {width: 100, height: 1, depth: 100}, scene);
    plane.position.y = -20;
    plane.checkCollisions = true;
    var mat = new BABYLON.StandardMaterial('', scene);
    plane.material = mat;
    plane.material.alpha = 0;
}

function endGame(time) {
    var text;
    text = new BABYLON.GUI.TextBlock();
    text.text = `Game Over\nTotal time: ${time} seconds\nRefresh to play again`;
    text.color = "white";
    text.top = -200;
    text.fontSize = 30;
    advancedTexture.addControl(text);
    text.isVisible = true;

    engine.stopRenderLoop()
}

function setupControls() {
    scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                if (kbInfo.event.keyCode == 32 && jump) {
                    speedY = 1;
                    jump = false;
                }
                switch (kbInfo.event.key) {
                    case "a":
                    case "A":
                        speedX = speed;
                    break
                    case "d":
                    case "D":
                        speedX = -speed;
                    break
                    case "w":
                    case "W":
                        speedZ = -speed;
                    break
                    case "s":
                    case "S":
                        speedZ = speed;
                    break
                }
            break;
            case BABYLON.KeyboardEventTypes.KEYUP:
                switch (kbInfo.event.key) {
                    case "a":
                    case "A":
                        speedX = 0;
                    break
                    case "d":
                    case "D":
                        speedX = 0;
                    break
                    case "w":
                    case "W":
                        speedZ = 0;
                    break
                    case "s":
                    case "S":
                        speedZ = 0;
                    break
                }
            break;
        }
        });

    scene.registerBeforeRender(function () {
        if (speedY > -0.6) {
            speedY -= gravity;
        }
        box.moveWithCollisions(new BABYLON.Vector3(0, speedY, 0));
        box.moveWithCollisions(new BABYLON.Vector3(speedX,0,speedZ));

        bugs.forEach((bug) => {
            if (player && bug.intersectsMesh(player)) {
                resetPlayerPosition();
                lives -= 1;
                lifeIcons[lives].dispose();
                console.log(lives);
                if (lives == 0) {
                    endGame(Math.round(performance.now()/1000));
                }
            }
            else if (bug.intersectsMesh(laser)) {
                console.log('hit');
                bug.dispose();
            }
            BABYLON.Animation.CreateAndStartAnimation(
                "anim", bug, "position", 2, 100, 
                bug.position, randomVectorOffset(box.position), 
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        });

        if (performance.now() - bugRespawnTime > bufferTime) {
            bugRespawnTime = performance.now();
            createBug();
            bufferTime -= 200;
        }
    });
}

init();
