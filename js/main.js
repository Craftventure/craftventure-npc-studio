//Stuff for rendering
var id = 1;
var DEG2RAD = Math.PI / 180;
var width, height, renderer, scene, camera;
var clock = new THREE.Clock;
var matWood = new THREE.MeshLambertMaterial({color: 0x826841});
//var matWood = new THREE.MeshLambertMaterial({ color: 0x826841, transparent: true, opacity: 0.5 }); //For testing the mesh alignment
var matStone = new THREE.MeshLambertMaterial({color: 0xadadad});
var matTransparentStone = new THREE.MeshLambertMaterial({color: 0x00ff00});

var keyboard, mouse = {x: 0, y: 0};

var controllers = [];
var tweentimeCore;
var tweentimeEditor;
var tweentimeCoreOptions = {
    totalDuration: 600000,
    defaultEase: "Linear.easeNone"
};

$(document).ready(function () {
    setup();
    render();

    $("#loadcontroller_input").on('change', function (event) {
        loadActor(event);
    });

    $("#loadmodel_input").on('change', function (event) {
        loadModel(event);
    });

    $("#createcontroller").click(function (event) {
        createActor(event);
    });

    $("#removecontroller").click(function () {
        var removeActorId = prompt("Enter the name of the controller you want to remove");
        removeActor(removeActorId);
    });

    $("#savefile").click(function () {
        saveFile();
    });

    $("#centercam").click(function () {
        if (!centerCam()) {
            alert("Load some actors first!");
        }
    });

    $("#teleport").click(function () {
        var x = prompt("X");
        if (!isNumber(x))
            return alert("Not a number!");
        var y = prompt("Y");
        if (!isNumber(y))
            return alert("Not a number!");
        var z = prompt("Z");
        if (!isNumber(z))
            return alert("Not a number!");

        camera.position.x = parseFloat(x);
        camera.position.y = parseFloat(y);
        camera.position.z = parseFloat(z);
    });

    $("#conectserver").click(function () {
        alert('Not yet implemented');
    });
});

function isNumber(o) {
    return !isNaN(o - 0) && o !== null && o !== "" && o !== false;
}

function makeFrames(data, propertyMap, type, staticDataValues, controllerValues) {
    var frames = [];
    for (var pm = 0; pm < propertyMap.length; pm++) {
        var property = propertyMap[pm];
        var propertyName = property[0];
        var propertyJsonName = property[1];
        for (var p = 0; p < data.properties.length; p++) {
            var dataProperty = data.properties[p];
            if (dataProperty.name == propertyName) {
                for (var k = 0; k < dataProperty.keys.length; k++) {
                    var key = dataProperty.keys[k];
                    var frame = null;
                    for (var f = 0; f < frames.length; f++) {
                        if (frames[f].time == key.time * 1000) {
                            frame = frames[f];
                            frames.splice(f, 1);
                            break;
                        }
                    }
                    if (frame == null) {
                        frame = {};
                        frame.time = key.time * 1000;
                        frame.type = type;
                        frame.data = {};
                        tweentimeCore.timer.seek([frame.time]);
                        tweentimeCore.timer.update();
                        tweentimeCore.orchestrator.update();

                        for (var pm2 = 0; pm2 < propertyMap.length; pm2++) {
                            frame.data[propertyMap[pm2][1]] = controllerValues[propertyMap[pm2][0]];
                        }

                        for (var sdv = 0; sdv < staticDataValues.length; sdv++) {
                            var staticDataValue = staticDataValues[sdv];
                            frame.data[staticDataValue[0]] = staticDataValue[1];
                        }
                    }
                    frame.data[propertyJsonName] = key.val;
                    frames.push(frame);

                }
                // console.log(dataProperty);
            }
        }
    }
    return frames;
}

function saveFile() {
    var editorData = JSON.parse(tweentimeEditor.exporter.getJSON());
    var datas = editorData.data;
    for (var i = 0; i < controllers.length; i++) {
        var controller = controllers[i];
        var json = JSON.parse(JSON.stringify(controller.originalJson));
        for (var f = 0; f < json.frame_list.length; f++) {
            var frame = json.frame_list[f];
            var remove = false;
            if (frame.type == 4) {
                if (frame.type >= 1 && frame.type <= 6) {
                    remove = true;
                }
            } else if (frame.type == 6) {
                remove = true;
            }
            if (remove) {
                json.frame_list.splice(f, 1);
                f--;
            }
        }
        // console.log(datas);
        for (var d = 0; d < datas.length; d++) {
            // console.log(datas[d]);
            if (datas[d].label == controller.filename + " (" + controller.id + ")") {
                var data = datas[d];
                json.frame_list = json.frame_list.concat(makeFrames(data,
                    [
                        ["posX", "x"],
                        ["posY", "y"],
                        ["posZ", "z"],
                        ["posYaw", "yaw"],
                        ["posPitch", "pitch"]
                    ],
                    6,
                    [
                        ["is_teleport", true]
                    ],
                    controller.values));
                json.frame_list = json.frame_list.concat(makeFrames(data,
                    [
                        ["leftArmX", "x"],
                        ["leftArmY", "y"],
                        ["leftArmZ", "z"]
                    ],
                    4,
                    [
                        ["type", 1]
                    ],
                    controller.values));
                json.frame_list = json.frame_list.concat(makeFrames(data,
                    [
                        ["rightArmX", "x"],
                        ["rightArmY", "y"],
                        ["rightArmZ", "z"]
                    ],
                    4,
                    [
                        ["type", 2]
                    ],
                    controller.values));
                json.frame_list = json.frame_list.concat(makeFrames(data,
                    [
                        ["leftLegX", "x"],
                        ["leftLegY", "y"],
                        ["leftLegZ", "z"]
                    ],
                    4,
                    [
                        ["type", 3]
                    ],
                    controller.values));
                json.frame_list = json.frame_list.concat(makeFrames(data,
                    [
                        ["rightLegX", "x"],
                        ["rightLegY", "y"],
                        ["rightLegZ", "z"]
                    ],
                    4,
                    [
                        ["type", 4]
                    ],
                    controller.values));
                json.frame_list = json.frame_list.concat(makeFrames(data,
                    [
                        ["bodyX", "x"],
                        ["bodyY", "y"],
                        ["bodyZ", "z"]
                    ],
                    4,
                    [
                        ["type", 5]
                    ],
                    controller.values));
                json.frame_list = json.frame_list.concat(makeFrames(data,
                    [
                        ["headX", "x"],
                        ["headY", "y"],
                        ["headZ", "z"]
                    ],
                    4,
                    [
                        ["type", 6]
                    ],
                    controller.values));
                // console.log(data);
            }
        }
        console.log(json);
        download(JSON.stringify(json, null, 2), controllers[i].filename, "text/plain");
    }
}

function download(text, name, type) {
    var a = document.createElement("a");
    var file = new Blob([text], {type: type});
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
}

function removeActor(id) {
    var controllerToDelete = null;
    for (var i = 0; i < controllers.length; i++) {
        if (controllers[i].id == id) {
            controllerToDelete = controllers[i];
            controllers.splice(i, 1);
            controllerToDelete.remove(scene);

            var timelineData = [];
            for (var i = 0; i < controllers.length; i++) {
                timelineData.push(JSON.parse(JSON.stringify(controllers[i].getTimelineData())));
            }

            tweentimeCore = new TweenTime.Core(timelineData, tweentimeCoreOptions);
            tweentimeEditor = new TweenTime.Editor(tweentimeCore);

            for (var i = 0; i < controllers.length; i++) {
                controllers[i].updateValues(tweentimeCore);
                controllers[i].update();
            }
            break;
        }
    }
}

function createActor(event) {
    var jsonContents = {
        "preferred_type": "ARMOR_STAND",
        "target_duration": 1000,
        "repeat": false,
        "equipment": {
            "helmet_item": "leather_helmet",
            "main_hand_item": null,
            "off_hand_item": null,
            "chest_item": "leather_chestplate,color:#000000",
            "legs_item": "leather_leggings,color:#000000",
            "boots_item": "leather_boots,color:#000000"
        },
        "state_flags": [
            {
                "type": 59,
                "data": "true"
            },
            {
                "type": 60,
                "data": "true"
            }
        ],
        "frame_list": [
            {
                "time": 0,
                "type": 6,
                "data": {
                    "x": camera.position.x,
                    "y": camera.position.y,
                    "z": camera.position.z,
                    "yaw": 0,
                    "pitch": 0,
                    "is_teleport": true
                }
            }
        ]
    };
    addJsonActor(jsonContents, "actor" + id++);
}

function addJsonActor(jsonContents, name) {
    jsonContents.frame_list = jsonContents.frame_list.sort(function (a, b) {
        return a.time - b.time;
    })
    var timelineData = [];
    for (var i = 0; i < controllers.length; i++) {
        timelineData.push(JSON.parse(JSON.stringify(controllers[i].getTimelineData())));
    }
    var armorStand = new ArmorStand(scene);
    var controller = new ArmorStandController(armorStand);
    var loader = new JsonDataFactory(jsonContents, controller, name);
    controller.setTimelineData(loader.getTimelineData());
    controller.setFilename(name);
    timelineData.push(JSON.parse(JSON.stringify(controller.getTimelineData())));
    controllers.push(controller);

    tweentimeCore = new TweenTime.Core(timelineData, tweentimeCoreOptions);
    tweentimeEditor = new TweenTime.Editor(tweentimeCore);

    for (var i = 0; i < controllers.length; i++) {
        controllers[i].updateValues(tweentimeCore);
        controllers[i].update();
    }

    // centerCam();
}

function loadActor(event) {
    for (var i = 0; i < event.target.files.length; i++) {
        var jsonReader = new FileReader();
        var file = event.target.files[i];
        jsonReader.onload = function (e) {
            var jsonContents = e.target.result;
            addJsonActor(JSON.parse(jsonContents), file.name);
        };
        jsonReader.readAsText(event.target.files[i]);
    }
}

function loadModel(event) {
    var objFile = null;
    var mtlFile = null;

    for (var i = 0; i < event.target.files.length; i++) {
        var file = event.target.files[i];
        if (file.name.endsWith(".obj"))
            objFile = file;
        if (file.name.endsWith(".mtl"))
            mtlFile = file;
    }

    if (objFile == null || mtlFile == null) {
        alert((objFile == null ? "No .obj provided" : "") + (mtlFile == null ? " No .mtl provided" : ""));
        return;
    }

    var mtlReader = new FileReader();
    mtlReader.onload = function (e) {
        var mtlFileNameWithoutExtension = mtlFile.name.replace('.mtl', '');
        console.log(mtlFileNameWithoutExtension);
        var mtlContents = e.target.result;
        mtlContents = replaceAll(mtlContents, mtlFileNameWithoutExtension, 'texture');
        // console.log("mtl read");
        var mtlLoader = new THREE.MTLLoader();
        mtlLoader.setPath('obj/');
        var materials = mtlLoader.parse(mtlContents);
        materials.preload();

        var objReader = new FileReader();
        objReader.onload = function (e) {
            var contents = e.target.result;
            var objLoader = new THREE.OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.setPath('obj/');

            var obj = objLoader.parse(contents);
            scene.add(obj);
            // console.log("obj loaded");
        };
        objReader.readAsText(objFile);
    };
    mtlReader.readAsText(mtlFile);
}

function replaceAll(originalString, find, replace) {
    return originalString.replace(new RegExp(find, 'g'), replace);
}

function onWindowResize() {
    var main_renderer = $("#main_renderer");
    width = main_renderer.width();
    height = main_renderer.height();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function setup() {
    var main_renderer = $("#main_renderer");
    width = main_renderer.width();
    height = main_renderer.height();

    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(width, height);
    main_renderer.append(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    main_renderer.mousemove(function (event) {
        event.preventDefault();
        mouse.x = ( (event.clientX - main_renderer.offset().left) / ( main_renderer.width()) ) * 2 - 1;
        mouse.y = -( (event.clientY - main_renderer.offset().top) / ( main_renderer.height()) ) * 2 + 1;
    });

    keyboard = new THREEx.KeyboardState();
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    scene.add(camera);

    var directionalLight = new THREE.DirectionalLight(0xffeedd);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    var ambientLight = new THREE.AmbientLight(0x666666);
    ambientLight.position.set(10, 300, 200);
    scene.add(ambientLight);

    centerCam();
}

function centerCam() {
    if (controllers.length > 0) {
        camera.position.x = controllers[0].armorstand.position().x;
        camera.position.y = 1 + controllers[0].armorstand.position().y;
        camera.position.z = 4 + controllers[0].armorstand.position().z;
        return true;
    }
    return false;
}

function render() {
    requestAnimationFrame(render);

    var deltaTime = clock.getDelta(); // seconds.

    for (var a = 0; a < controllers.length; a++) {
        controllers[a].update();
    }

    var moveDistance = 10 * deltaTime; // 200 pixels per second
    if (keyboard.pressed("pageup"))
        moveDistance *= 10;
    var rotateAngle = Math.PI / 2 * deltaTime;   // pi/2 radians (90 degrees) per second

    if (keyboard.pressed("W"))
        camera.translateZ(-moveDistance);
    if (keyboard.pressed("S"))
        camera.translateZ(moveDistance);
    if (keyboard.pressed("Q"))
        camera.translateX(-moveDistance);
    if (keyboard.pressed("E"))
        camera.translateX(moveDistance);
    if (keyboard.pressed("F"))
        camera.translateY(-moveDistance);
    if (keyboard.pressed("R"))
        camera.translateY(moveDistance);

    if (keyboard.pressed("A"))
        camera.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateAngle);
    if (keyboard.pressed("D"))
        camera.rotateOnAxis(new THREE.Vector3(0, 1, 0), -rotateAngle);
    // if (keyboard.pressed("R"))
    //     camera.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateAngle);
    // if (keyboard.pressed("F"))
    //     camera.rotateOnAxis(new THREE.Vector3(1, 0, 0), -rotateAngle);

    for (var i = 0; i < controllers.length; i++) {
        controllers[i].armorstand.update(deltaTime);
        // console.log(animations[i].armorstand.position());
    }
    renderer.render(scene, camera);
}

class JsonDataFactory {
    constructor(jsonData, controller, fileName) {
        this.positionFrames = [];
        this.leftArmFrames = [];
        this.rightArmFrames = [];
        this.leftLegFrames = [];
        this.rightLegFrames = [];
        this.bodyFrames = [];
        this.headFrames = [];

        controller.originalJson = jsonData;
        this.durationInMs = jsonData.target_duration;
        for (var i = 0; i < jsonData.frame_list.length; i++) {
            var frame = jsonData.frame_list[i];
            var data = frame.data;
            if (frame.type == 4) {
                this.durationInMs = Math.max(this.durationInMs, frame.time);
                if (data.type == 1) {
                    this.leftArmFrames.push(frame);
                } else if (data.type == 2) {
                    this.rightArmFrames.push(frame);
                } else if (data.type == 3) {
                    this.leftLegFrames.push(frame);
                } else if (data.type == 4) {
                    this.rightLegFrames.push(frame);
                } else if (data.type == 5) {
                    this.bodyFrames.push(frame);
                } else if (data.type == 6) {
                    this.headFrames.push(frame);
                }
            } else if (frame.type == 6) {
                this.positionFrames.push(frame);
            }
        }

        var data = {};
        data.id = controller.id;
        data.type = "armorstand";
        data.label = fileName + " (" + data.id + ")";
        data.properties = [];
        data.properties.push(JsonDataFactory.generateProperty("posX", this.positionFrames, "x"));
        data.properties.push(JsonDataFactory.generateProperty("posY", this.positionFrames, "y"));
        data.properties.push(JsonDataFactory.generateProperty("posZ", this.positionFrames, "z"));
        data.properties.push(JsonDataFactory.generateProperty("posYaw", this.positionFrames, "yaw"));
        data.properties.push(JsonDataFactory.generateProperty("posPitch", this.positionFrames, "pitch"));

        data.properties.push(JsonDataFactory.generateProperty("leftArmX", this.leftArmFrames, "x"));
        data.properties.push(JsonDataFactory.generateProperty("leftArmY", this.leftArmFrames, "y"));
        data.properties.push(JsonDataFactory.generateProperty("leftArmZ", this.leftArmFrames, "z"));

        data.properties.push(JsonDataFactory.generateProperty("rightArmX", this.rightArmFrames, "x"));
        data.properties.push(JsonDataFactory.generateProperty("rightArmY", this.rightArmFrames, "y"));
        data.properties.push(JsonDataFactory.generateProperty("rightArmZ", this.rightArmFrames, "z"));

        data.properties.push(JsonDataFactory.generateProperty("leftLegX", this.leftLegFrames, "x"));
        data.properties.push(JsonDataFactory.generateProperty("leftLegY", this.leftLegFrames, "y"));
        data.properties.push(JsonDataFactory.generateProperty("leftLegZ", this.leftLegFrames, "z"));

        data.properties.push(JsonDataFactory.generateProperty("rightLegX", this.rightLegFrames, "x"));
        data.properties.push(JsonDataFactory.generateProperty("rightLegY", this.rightLegFrames, "y"));
        data.properties.push(JsonDataFactory.generateProperty("rightLegZ", this.rightLegFrames, "z"));

        data.properties.push(JsonDataFactory.generateProperty("bodyX", this.bodyFrames, "x"));
        data.properties.push(JsonDataFactory.generateProperty("bodyY", this.bodyFrames, "y"));
        data.properties.push(JsonDataFactory.generateProperty("bodyZ", this.bodyFrames, "z"));

        data.properties.push(JsonDataFactory.generateProperty("headX", this.headFrames, "x"));
        data.properties.push(JsonDataFactory.generateProperty("headY", this.headFrames, "y"));
        data.properties.push(JsonDataFactory.generateProperty("headZ", this.headFrames, "z"));
        this.timelineData = data;
    }

    getTimelineData() {
        return this.timelineData;
    }

    static generateProperty(name, keys, property) {
        var ret = {};
        ret.name = name;
        ret.keys = [];
        ret.val = 0;
        for (var i = 0; i < keys.length; i++) {
            var key = {};
            key.time = keys[i].time / 1000.0;
            key.val = keys[i].data[property];
            key.ease = "Linear.easeNone";
            ret.keys.push(key);
        }
        return ret;
    };
}

class NpcController {
    constructor(target) {
        this.values = null;
        this.originalJson = null;
        this.id = "as" + (id++);
        this.timelineData = null;
    }

    getTimelineData() {
        return this.timelineData;
    }

    setFilename(filename) {
        this.filename = filename;
    }

    getFilename() {
        return this.filename;
    }

    setTimelineData(timelineData) {
        this.timelineData = timelineData;
    }

    updateValues(tweentimeCore) {
        this.values = tweentimeCore.getValues(this.id);
    }

    update() {
    };

    remove(scene) {

    };
}

class ArmorStandController extends NpcController {
    constructor(target) {
        super(target);
        this.armorstand = target;
    }

    remove(scene) {
        this.armorstand.remove(scene);
    }

    update() {
        // if (this.values == null)
        this.values = tweentimeCore.getValues(this.id);
        if (this.values == null) {
            // console.log("Values==null");
            return;
        }
        // console.log(this.values.posX + "," + this.values.posY + ", " + this.values.posZ);
        this.armorstand.position().x = this.values.posX;
        this.armorstand.position().y = this.values.posY;
        this.armorstand.position().z = this.values.posZ;
        this.armorstand.yaw().y = DEG2RAD * -this.values.posYaw;

        this.armorstand.leftLeg.x = this.values.leftLegX;
        this.armorstand.leftLeg.y = this.values.leftLegY;
        this.armorstand.leftLeg.z = this.values.leftLegZ;

        this.armorstand.rightLeg.x = this.values.rightLegX;
        this.armorstand.rightLeg.y = this.values.rightLegY;
        this.armorstand.rightLeg.z = this.values.rightLegZ;

        this.armorstand.leftArm.x = this.values.leftArmX;
        this.armorstand.leftArm.y = this.values.leftArmY;
        this.armorstand.leftArm.z = this.values.leftArmZ;

        this.armorstand.rightArm.x = this.values.rightArmX;
        this.armorstand.rightArm.y = this.values.rightArmY;
        this.armorstand.rightArm.z = this.values.rightArmZ;

        this.armorstand.body.x = this.values.bodyX;
        this.armorstand.body.y = this.values.bodyY;
        this.armorstand.body.z = this.values.bodyZ;

        this.armorstand.head.x = this.values.headX;
        this.armorstand.head.y = this.values.headY;
        this.armorstand.head.z = this.values.headZ;
    };
}

class ControllerTarget {
    constructor(scene) {

    }

    remove(scene) {

    };

    update() {
    };
}

class ArmorStand extends ControllerTarget {
    constructor(scene) {
        super(scene);
        this.armorStand = null;
        // Meshes
        // The ones marked with //* are not real meshes, but contain a child (or more) which gets rendered.
        // This is done, so these can easily be rotated around an accurate pivot point.
        this.mBasePlate = null;
        this.mBody = null; //*
        this.mHead = null; //*
        this.mSkull = null;
        this.mLegLeft = null; //*
        this.mLegRight = null; //*
        this.mArmLeft = null; //*
        this.mArmRight = null; //*
        this.armorstand = null;
        this.armorstandWrapper = null; //Group all the other elements

        //DATA -> Stuff that we'll use to generate the command. Fetched from the controls.
        this.noBasePlate = false;
        this.showArms = true;
        this.small = false;

        //The rotation values are all in degrees.
        this.head = new THREE.Vector3(0, 0, 0);
        this.body = new THREE.Vector3(0, 0, 0);
        this.leftLeg = new THREE.Vector3(0, 0, 0);
        this.rightLeg = new THREE.Vector3(0, 0, 0);
        this.leftArm = new THREE.Vector3(0, 0, 0);
        this.rightArm = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;

        // From here: http://stackoverflow.com/a/11124197/1456971
        this.rotWorldMatrix = null;
        this.init();
    }

    remove(scene) {
        scene.remove(this.armorstandWrapper);
    };

    position() {
        return this.armorstandWrapper.position;
    };

    yaw() {
        return this.armorstandWrapper.rotation;
    };

    update() {
        // Rotate 3D Stuff
        // y and z rotation needs to be inverted
        this.setRotation(this.mBody, this.body);
        this.setRotation(this.mHead, this.head);
        this.setRotation(this.mLegLeft, this.leftLeg);
        this.setRotation(this.mLegRight, this.rightLeg);
        this.setRotation(this.mArmLeft, this.leftArm);
        this.setRotation(this.mArmRight, this.rightArm);
        this.armorstand.rotation.y = -this.rotation * DEG2RAD;

        // Scale model, depending on small variable
        if (this.small)
            this.armorstand.scale.set(0.6, 0.6, 0.6);
        else
            this.armorstand.scale.set(1, 1, 1);

        //Set Visibility
        this.mArmRight.visible = this.mArmLeft.visible = this.showArms;
        this.mBasePlate.visible = !this.noBasePlate;
    };

    init() {
        this.armorstand = new THREE.Object3D();
        //Add an armorstandWrapper to the scene, so the armorstand can be rotated naturally.
        this.armorstandWrapper = new THREE.Object3D();
        this.armorstand.position.set(0, 0, 0);
        this.armorstandWrapper.add(this.armorstand);


        //BasePlate
        this.mBasePlate = new THREE.Mesh(
            new THREE.BoxGeometry(12 / 16, 1 / 16, 12 / 16),
            matStone);
        this.mBasePlate.position.y = -(1 / 32 - this.armorstand.position.y);
        this.armorstandWrapper.add(this.mBasePlate);
        //Add a little dot, so the user knows which way is forward
        var mmBaseDot = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 1 / 16, 4 / 16),
            matStone);
        mmBaseDot.position.set(0, this.mBasePlate.position.y, 10 / 16);
        this.armorstandWrapper.add(mmBaseDot);

        // To Generate the other body parts, we will use a mesh to display,
        // and add it as a child to the object that serves as a pivot.

        //Left Leg
        var mmLegLeft = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 11 / 16, 2 / 16),
            matWood);
        mmLegLeft.position.set(0, -5.5 / 16, 0);
        this.mLegLeft = new THREE.Object3D();
        this.mLegLeft.position.set(2 / 16, 11 / 16, 0); //Pivot Point
        this.mLegLeft.add(mmLegLeft);
        this.armorstand.add(this.mLegLeft);

        //Right Leg
        var mmLegRight = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 11 / 16, 2 / 16),
            matWood);
        mmLegRight.position.set(0, -5.5 / 16, 0);
        this.mLegRight = new THREE.Object3D();
        this.mLegRight.position.set(-2 / 16, 11 / 16, 0); //Pivot Point
        this.mLegRight.add(mmLegRight);
        this.armorstand.add(this.mLegRight);

        //Left Arm
        var mmArmLeft = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 12 / 16, 2 / 16),
            matWood);
        mmArmLeft.position.set(0, -4 / 16, 0);
        this.mArmLeft = new THREE.Object3D();
        this.mArmLeft.position.set(6 / 16, 21 / 16, 0); //Pivot Point
        this.mArmLeft.add(mmArmLeft);
        this.armorstand.add(this.mArmLeft);

        //Right Arm
        var mmArmRight = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 12 / 16, 2 / 16),
            matWood);
        mmArmRight.position.set(0, -4 / 16, 0);
        this.mArmRight = new THREE.Object3D();
        this.mArmRight.position.set(-6 / 16, 21 / 16, 0); //Pivot Point
        this.mArmRight.add(mmArmRight);
        this.armorstand.add(this.mArmRight);

        //Body (consists of four parts)
        var mmHip = new THREE.Mesh(
            new THREE.BoxGeometry(8 / 16, 2 / 16, 2 / 16),
            matWood);
        mmHip.position.set(0, -11 / 16, 0);
        var mmBodyLeft = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 7 / 16, 2 / 16),
            matWood);
        mmBodyLeft.position.set(2 / 16, -6.5 / 16, 0);
        var mmBodyRight = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 7 / 16, 2 / 16),
            matWood);
        mmBodyRight.position.set(-2 / 16, -6.5 / 16, 0);
        var mmShoulders = new THREE.Mesh(
            new THREE.BoxGeometry(12 / 16, 3 / 16, 3 / 16),
            matWood);
        mmShoulders.position.set(0, -1.5 / 16, 0);
        this.mBody = new THREE.Object3D();
        this.mBody.position.set(0, 23 / 16, 0); //Pivot Point
        this.mBody.add(mmHip);
        this.mBody.add(mmBodyLeft);
        this.mBody.add(mmBodyRight);
        this.mBody.add(mmShoulders);
        this.armorstand.add(this.mBody);

        //Head (neck and skull)
        var mmNeck = new THREE.Mesh(
            new THREE.BoxGeometry(2 / 16, 7 / 16, 2 / 16),
            matWood);
        mmNeck.position.set(0, 3.5 / 16, 0);
        this.mSkull = new THREE.Mesh(
            new THREE.BoxGeometry(10 / 16, 10 / 16, 10 / 16),
            matTransparentStone);
        this.mSkull.position.set(0, 5 / 16, 0);
        this.mHead = new THREE.Object3D();
        this.mHead.position.set(0, 22 / 16, 0); //Pivot Point
        this.mHead.add(mmNeck);
        this.mHead.add(this.mSkull);
        this.armorstand.add(this.mHead);


        scene.add(this.armorstandWrapper);
    };

    // ---- Additional functions

    // Rotate three.js mesh to fit the minecraft rotation
    setRotation(mesh, rotation) {
        this.rotateAroundWorldAxis(mesh, new THREE.Vector3(1, 0, 0), rotation.x * DEG2RAD, true);
        this.rotateAroundWorldAxis(mesh, new THREE.Vector3(0, 1, 0), -rotation.y * DEG2RAD, false);
        this.rotateAroundWorldAxis(mesh, new THREE.Vector3(0, 0, 1), -rotation.z * DEG2RAD, false);
    };

    // Rotate an object around an arbitrary axis in world space
    rotateAroundWorldAxis(object, axis, radians, reset) {
        this.rotWorldMatrix = new THREE.Matrix4();
        this.rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
        if (!reset)
            this.rotWorldMatrix.multiply(object.matrix);        // pre-multiply
        object.matrix = this.rotWorldMatrix;
        object.rotation.setFromRotationMatrix(object.matrix);
    };
}
