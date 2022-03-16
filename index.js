let canvas = null;
let engine = null;
var scene, camera, light, box, ground, box2, p, spot, gun;
let bugs = [];
let speed = 0.15;
let speedX = 0;
let speedZ = 0;
let pointerX, pointerZ = 0;
let player;
let laser;
let lastTime = 0;

function createScene() {
    function setupScene() {
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(.5, .5, .5);

        scene.enablePhysics();
        scene.getPhysicsEngine().setGravity(new BABYLON.Vector3(0, -20, 0));
    }          
    setupScene();
    setupPlayer();
    setupBugs();
    setupCamera();
    setupLights();
    setupGround();
    setupControls();
    setupLaser();

    // new BABYLON.Animation.CreateAndStartAnimation("anim", laser, "position", 50, 100, new BABYLON.Vector3(0,0,0), new BABYLON.Vector3(0,10,10), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT)

    spot = BABYLON.MeshBuilder.CreatePlane('', {width: 1, height: 1}, scene);
    var mat = new BABYLON.StandardMaterial('', scene);
    mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
    spot.material = mat;
    spot.rotation.x = Math.PI/2;
    spot.renderingGroupId = 1;

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
        if (p) {
            player.lookAt(p);
        }

        if (p && gun && (performance.now() - lastTime > 300)) {
            lastTime = performance.now();
            laser.lookAt(p);
            laser.material = new BABYLON.StandardMaterial("myMaterial", scene);
            laser.material.diffuseColor = new BABYLON.Color3(1, 0.53, 0.53);
            laser.material.ambientColor = new BABYLON.Color3(1, 0, 0);
            new BABYLON.Animation.CreateAndStartAnimation("anim", laser, "position", 30, 3, gun.position, p, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, null,()=> {
                laser.material = new BABYLON.StandardMaterial("myMaterial", scene);
                laser.material.alpha = 0;
            });
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

function setupCamera() {
    camera = new BABYLON.FollowCamera("FollowCamera",new BABYLON.Vector3(10, 10, 10), scene, box);
    camera.heightOffset = 20;
    camera.radius = 30;
}

function setupLights() {
    var light = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(-1, 1, 0), scene);
	light.diffuse = new BABYLON.Color3(0.87, 0.87, 0.87);
	light.specular = new BABYLON.Color3(0.62, 0.65, 0.87);
	light.groundColor = new BABYLON.Color3(0.34, 0.4, 0.76);
}

function setupGround() {
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 40, height: 40}, scene);
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

        meshes[1].rotate(BABYLON.Axis.Y, Math.PI/2, BABYLON.Space.WORLD);
        player = meshes[0];
        player.position.y = 1;
        player.rotate(BABYLON.Axis.Y, Math.PI/2, BABYLON.Space.WORLD);

        player.bakeCurrentTransformIntoVertices();

        player.parent = box;
    }

    BABYLON.SceneLoader.ImportMesh("", "", "frog.glb", scene, frogImportFinished);

    box = BABYLON.MeshBuilder.CreateBox("box", {height: 1, width: 1, depth: 1}, scene);

    box.material = new BABYLON.StandardMaterial("myMaterial", scene);
    box.material.alpha = 0;

    box.position.y = 10;
    box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0 }, scene);

    document.addEventListener('pointermove', (event) => {
        pointerX = scene.pointerX;
        pointerZ = scene.pointerY;
    });

    box2 = BABYLON.MeshBuilder.CreateBox("box", {height: 1, width: 1, depth: 1}, scene);
    box2.material = new BABYLON.StandardMaterial("myMaterial", scene);
    box2.position.y = 3;
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
        var bug = BABYLON.MeshBuilder.CreateBox("box", {height: 1, width: 1, depth: 1}, scene);

        var myMaterial = new BABYLON.StandardMaterial("myMaterial", scene);

        myMaterial.diffuseColor = new BABYLON.Color3(0.68, 0.58, 0.71);
        myMaterial.ambientColor = new BABYLON.Color3(1, 0, 0);

        bug.material = myMaterial;

        bug.position.y = randomIntFromInterval(3, 4);
        bug.position.x = randomIntFromInterval(1, 20);
        bug.position.z = randomIntFromInterval(1, 20);

        bugs.push(bug);
    }
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
    laser = BABYLON.MeshBuilder.CreateBox("laser", {height: 0.4, width: 0.4, depth: 0.4}, scene);
}

function setupControls() {
    scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                if (kbInfo.event.keyCode == 32 && (box.physicsImpostor.getLinearVelocity().y).toFixed(2) == 0) {
                    box.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 10, 0));
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
        box.position.x += speedX;
        box.position.z += speedZ;

        box2.position.x = pointerX;
        box2.position.z = pointerZ;

        bugs.forEach((bug) => {
            BABYLON.Animation.CreateAndStartAnimation("anim", bug, "position", 2, 100, bug.position, randomVectorOffset(box.position), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        });

        // if (player && (Date() - lastTime > 1000)) {
        //     lastTime = Date();
        //     BABYLON.Animation.CreateAndStartAnimation("anim", laser, "position", 2, 100, player.position, 5, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        // }
    });
}

init();
