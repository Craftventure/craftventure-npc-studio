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

function makeSingleDoubleFrame(sourceFrame, property, type) {
    var frame = {};
    frame.time = sourceFrame.time;
    frame.type = 8;
    frame.data = {};
    frame.data.type = type;
    frame.data.value = sourceFrame.data[property];
    return frame;
}

function makeDoubleFrames(data, propertyName, typeValue) {
    var frames = [];
    for (var p = 0; p < data.properties.length; p++) {
        var dataProperty = data.properties[p];
        if (dataProperty.name == propertyName) {
            for (var k = 0; k < dataProperty.keys.length; k++) {
                var key = dataProperty.keys[k];
                var frame = {};
                frame.time = key.time * 1000;
                frame.type = 8;
                frame.data = {};
                frame.data.type = typeValue;
                frame.data.value = key.val;
                frames.push(frame);
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
            } else if (frame.type == 6 || (frame.type >= 8 && frame.type <= 12)) {
                remove = true;
            }
            if (remove) {
                json.frame_list.splice(f, 1);
                f--;
            }
        }
        console.log(datas);
        for (var d = 0; d < datas.length; d++) {
            console.log(datas[d]);
            if (datas[d].label == controller.filename + " (" + controller.id + ")") {
                var data = datas[d];
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "posX", 1));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "posY", 2));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "posZ", 3));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "yaw", 4));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "pitch", 5));

                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "leftArmX", 6));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "leftArmY", 7));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "leftArmZ", 8));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "rightArmX", 9));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "rightArmY", 10));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "rightArmZ", 11));

                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "leftLegX", 12));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "leftLegY", 13));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "leftLegZ", 14));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "rightLegX", 15));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "rightLegY", 16));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "rightLegZ", 17));

                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "bodyX", 18));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "bodyY", 19));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "bodyZ", 20));

                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "headX", 21));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "headY", 22));
                json.frame_list = json.frame_list.concat(makeDoubleFrames(data, "headZ", 23));
            }
        }
        // console.log(json);
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
                "type": 8,
                "data": {
                    "value": camera.position.x,
                    "type": 1
                }
            },
            {
                "time": 0,
                "type": 8,
                "data": {
                    "value": camera.position.y,
                    "type": 2
                }
            },
            {
                "time": 0,
                "type": 8,
                "data": {
                    "value": camera.position.z,
                    "type": 3
                }
            },
            {
                "time": 0,
                "type": 8,
                "data": {
                    "value": 0,
                    "type": 4
                }
            },
            {
                "time": 0,
                "type": 8,
                "data": {
                    "value": 0,
                    "type": 5
                }
            }
        ]
    };
    addJsonActor(jsonContents, "actor" + id);
}

function addJsonActor(jsonContents, name) {
    // console.log("addJsonActor");
    jsonContents.frame_list = jsonContents.frame_list.sort(function (a, b) {
        return a.time - b.time;
    });
    var timelineData = [];
    // console.log(jsonContents);
    for (var i = 0; i < controllers.length; i++) {
        // console.group();
        // console.log(controllers[i].getTimelineData());
        // console.log(JSON.parse(JSON.stringify(controllers[i].getTimelineData())));
        // console.groupEnd();
        timelineData.push(JSON.parse(JSON.stringify(controllers[i].getTimelineData())));
    }
    // console.log(timelineData);
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

function addFrame(frameMap, type, frame) {
    var frames = frameMap[type];
    if (frames == null)
        frames = [];
    frames.push(frame);
    frameMap[type] = frames;
    return frameMap;
}

class JsonDataFactory {
    constructor(jsonData, controller, fileName) {
        this.frames = {};

        controller.originalJson = jsonData;
        this.durationInMs = jsonData.target_duration;
        for (var i = 0; i < jsonData.frame_list.length; i++) {
            var frame = jsonData.frame_list[i];
            var data = frame.data;

            if (frame.type == 4) {
                this.durationInMs = Math.max(this.durationInMs, frame.time);
                if (data.type == 1) {
                    addFrame(this.frames, 6, makeSingleDoubleFrame(frame, "x", 6));
                    addFrame(this.frames, 7, makeSingleDoubleFrame(frame, "y", 7));
                    addFrame(this.frames, 8, makeSingleDoubleFrame(frame, "z", 8));
                    // this.leftArmFrames.push(frame);
                } else if (data.type == 2) {
                    addFrame(this.frames, 9, makeSingleDoubleFrame(frame, "x", 9));
                    addFrame(this.frames, 10, makeSingleDoubleFrame(frame, "y", 10));
                    addFrame(this.frames, 11, makeSingleDoubleFrame(frame, "z", 11));
                    // this.rightArmFrames.push(frame);
                } else if (data.type == 3) {
                    addFrame(this.frames, 12, makeSingleDoubleFrame(frame, "x", 12));
                    addFrame(this.frames, 13, makeSingleDoubleFrame(frame, "y", 13));
                    addFrame(this.frames, 14, makeSingleDoubleFrame(frame, "z", 14));
                    // this.leftLegFrames.push(frame);
                } else if (data.type == 4) {
                    addFrame(this.frames, 15, makeSingleDoubleFrame(frame, "x", 15));
                    addFrame(this.frames, 16, makeSingleDoubleFrame(frame, "y", 16));
                    addFrame(this.frames, 17, makeSingleDoubleFrame(frame, "z", 17));
                    // this.rightLegFrames.push(frame);
                } else if (data.type == 5) {
                    addFrame(this.frames, 18, makeSingleDoubleFrame(frame, "x", 18));
                    addFrame(this.frames, 19, makeSingleDoubleFrame(frame, "y", 19));
                    addFrame(this.frames, 20, makeSingleDoubleFrame(frame, "z", 20));
                    // this.bodyFrames.push(frame);
                } else if (data.type == 6) {
                    addFrame(this.frames, 21, makeSingleDoubleFrame(frame, "x", 21));
                    addFrame(this.frames, 22, makeSingleDoubleFrame(frame, "y", 22));
                    addFrame(this.frames, 23, makeSingleDoubleFrame(frame, "z", 23));
                    // this.headFrames.push(frame);
                }
            } else if (frame.type == 6) {
                addFrame(this.frames, 1, makeSingleDoubleFrame(frame, "x", 1));
                addFrame(this.frames, 2, makeSingleDoubleFrame(frame, "y", 2));
                addFrame(this.frames, 3, makeSingleDoubleFrame(frame, "z", 3));
                addFrame(this.frames, 4, makeSingleDoubleFrame(frame, "yaw", 4));
                addFrame(this.frames, 5, makeSingleDoubleFrame(frame, "pitch", 5));
            } else if (frame.type == 8) {
                var frames = this.frames[data.type];
                if (frames == null)
                    frames = [];
                frames.push(frame);
                this.frames[data.type] = frames;
            }
        }

        var data = {};
        data.id = controller.id;
        data.type = "armorstand";
        data.label = fileName + " (" + data.id + ")";
        data.properties = [];
        console.log(this.frames);
        JsonDataFactory.generateProperty(data, "posX", this.frames[1], "value");
        JsonDataFactory.generateProperty(data, "posY", this.frames[2], "value");
        JsonDataFactory.generateProperty(data, "posZ", this.frames[3], "value");
        JsonDataFactory.generateProperty(data, "yaw", this.frames[4], "value");
        JsonDataFactory.generateProperty(data, "pitch", this.frames[5], "value");

        JsonDataFactory.generateProperty(data, "leftArmX", this.frames[6], "value");
        JsonDataFactory.generateProperty(data, "leftArmY", this.frames[7], "value");
        JsonDataFactory.generateProperty(data, "leftArmZ", this.frames[8], "value");

        JsonDataFactory.generateProperty(data, "rightArmX", this.frames[9], "value");
        JsonDataFactory.generateProperty(data, "rightArmY", this.frames[10], "value");
        JsonDataFactory.generateProperty(data, "rightArmZ", this.frames[11], "value");

        JsonDataFactory.generateProperty(data, "leftLegX", this.frames[12], "value");
        JsonDataFactory.generateProperty(data, "leftLegY", this.frames[13], "value");
        JsonDataFactory.generateProperty(data, "leftLegZ", this.frames[14], "value");

        JsonDataFactory.generateProperty(data, "rightLegX", this.frames[15], "value");
        JsonDataFactory.generateProperty(data, "rightLegY", this.frames[16], "value");
        JsonDataFactory.generateProperty(data, "rightLegZ", this.frames[17], "value");

        JsonDataFactory.generateProperty(data, "bodyX", this.frames[18], "value");
        JsonDataFactory.generateProperty(data, "bodyY", this.frames[19], "value");
        JsonDataFactory.generateProperty(data, "bodyZ", this.frames[20], "value");

        JsonDataFactory.generateProperty(data, "headX", this.frames[21], "value");
        JsonDataFactory.generateProperty(data, "headY", this.frames[22], "value");
        JsonDataFactory.generateProperty(data, "headZ", this.frames[23], "value");
        console.log(data);
        this.timelineData = data;
    }

    getTimelineData() {
        return this.timelineData;
    }

    static generateProperty(data, name, keys, property) {
        var ret = {};
        ret.name = name;
        ret.keys = [];
        ret.val = 0;
        if (keys != null && keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                var key = {};
                key.time = keys[i].time / 1000.0;
                key.val = keys[i].data[property];
                key.ease = "Linear.easeNone";
                ret.keys.push(key);
            }
        } else {
            var key = {};
            key.time = 0;
            key.val = 0;
            key.ease = "Linear.easeNone";
            ret.keys.push(key);
        }
        data.properties.push(ret);
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
        this.armorstand.yaw().y = DEG2RAD * -this.values.yaw;

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
