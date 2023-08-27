import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

var canvas, renderer, scene, camera, helicopterObj,
sceneSize = {
    width: 0,
    height: 0
},
mouseData = {
    isClicked: false,
    x: 0,
    y: 0,
    isTouchScale: false,
    touchScaleVal: 0
},
settings = {
    zoomStep: 50,
    zoomMax: 3000,
    zoomMin: 1300,
    moveStep: {
        x: 0.05,
        y: 0.01
    },
    maxYRotate: -83.0 * Math.PI / 180.0, //down
    minYRotate: -93.0 * Math.PI / 180.0,
    maxXRotate: 70.0 * Math.PI / 180.0,
    minXRotate: -70.0 * Math.PI / 180.0,
    aspectRatio: 1,
    camera: {
        deep: 10000,
        posY: 0,
        posZ: 600
    }
}

class App {
    init() {
        canvas = document.getElementById('main3DCanvas');
        const canvasWrapper = document.getElementById('canvasWrapper')
        sceneSize.width = canvasWrapper.getBoundingClientRect().width
        sceneSize.height =  sceneSize.width / settings.aspectRatio

        canvas.width = sceneSize.width;
        canvas.height = sceneSize.height;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera( 45, sceneSize.width / sceneSize.height, 0.1, settings.camera.deep );
        camera.position.y = settings.camera.posY;
        camera.position.z = settings.camera.posZ;
        scene.add(camera)

        //lights
        const light = new THREE.AmbientLight(0xffffff, 0.75);
        light.position.set(0, 0, 0);
        scene.add(light);

        // const light2 = new THREE.PointLight(0xffffff, 1.0);
        // light2.position.set(0, 10000, 0);
        // light2.castShadow = true;
        // scene.add(light2);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true, premultipliedAlpha: true });
        renderer.setClearColor( 0x000000, 0 );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( sceneSize.width, sceneSize.height );

        //obj
        let EarthObj = new THREE.Object3D();
        const objLoader = new OBJLoader();

        // objLoader.setMaterials(materials);
        objLoader.load('./assets/Earth.obj', function (object) {
            const scale = 2
            object.scale.set(scale, scale, scale);
            object.position.set(0, 0, 0);
            // object.rotation.set(Math.PI / 2.0, 10, 0);
            // penObj.add(object);
            scene.add(object)
        });

        // helicopterObj.scale.set(1,1,1);
        // helicopterObj.position.set(0.5, 0, -13.7);
        // helicopterObj.rotation.x = -90.0 * Math.PI / 180.0;
        // helicopterObj.rotation.z = 50.0 * Math.PI / 180.0;
        // scene.add(helicopterObj);

        canvas.addEventListener('mousemove', mouseMoveHandler)
        canvas.addEventListener('mousedown', mouseDownHandler)
        canvas.addEventListener('mouseup', mouseUpHandler)

        canvas.addEventListener("touchstart", touchStartHandler);
    	canvas.addEventListener("touchmove", touchMoveHandler);    
    	canvas.addEventListener("touchend", mouseUpHandler);

    	canvas.addEventListener("wheel", wheelEventHandler);

        window.addEventListener('resize', onCanvasResize)

        animate()
    }
}

function mouseMoveHandler(e) {    
    if (mouseData.isClicked) {
        const deltaX = Math.sign(e.x - mouseData.x) * settings.moveStep.x
        const deltaY = Math.sign(e.y - mouseData.y) * settings.moveStep.y

        mouseData.x = e.x
        mouseData.y = e.y

        // helicopterObj.rotation.z += deltaX
        if (helicopterObj.rotation.z + deltaX < settings.maxXRotate && helicopterObj.rotation.z + deltaX > settings.minXRotate)
            helicopterObj.rotation.z += deltaX
        if (helicopterObj.rotation.x + deltaY < settings.maxYRotate && helicopterObj.rotation.x + deltaY > settings.minYRotate)
            helicopterObj.rotation.x += deltaY
    }
}

function mouseDownHandler(e) {
    mouseData.isClicked = true
    mouseData.x = e.x
    mouseData.y = e.y
}

function mouseUpHandler(e) {
    mouseData.isClicked = false
    mouseData.isTouchScale = false
}

function touchStartHandler(e) {
    e.preventDefault();
    let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
	let touch = evt.touches[0] || evt.changedTouches[0];

    mouseData.isClicked = true
    mouseData.x = parseInt(touch.pageX)
    mouseData.y = parseInt(touch.pageY) 

    if (evt.touches.length > 1) {
        mouseData.isTouchScale = true
        let touch2 = evt.touches[1] || evt.changedTouches[1];

        mouseData.x = Math.max(parseInt(touch.pageX), parseInt(touch2.pageX))
    }
}

function touchMoveHandler(e) {
    e.preventDefault();
    
    if (mouseData.isClicked) {
        let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
        let touch = evt.touches[0] || evt.changedTouches[0];

        if (!mouseData.isTouchScale) {
            //rotate
            const deltaX = Math.sign(parseInt(touch.pageX) - mouseData.x) * settings.moveStep.x
            const deltaY = Math.sign(parseInt(touch.pageY) - mouseData.y) * settings.moveStep.y
    
            // helicopterObj.rotation.z += deltaX
            if (helicopterObj.rotation.z + deltaX < settings.maxXRotate && helicopterObj.rotation.z + deltaX > settings.minXRotate)
                helicopterObj.rotation.z += deltaX
            if (helicopterObj.rotation.x + deltaY < settings.maxYRotate && helicopterObj.rotation.x + deltaY > settings.minYRotate)
                helicopterObj.rotation.x += deltaY
        } else {
            if (evt.touches.length > 1) {
                let touch2 = evt.touches[1] || evt.changedTouches[1];
                let pageX = Math.max(parseInt(touch.pageX), parseInt(touch2.pageX))

                // scale
                const currentScale = Math.sign(mouseData.x - pageX) * settings.zoomStep
                const newZoomVal = camera.position.z + currentScale
    
                if (newZoomVal < settings.zoomMax && newZoomVal > settings.zoomMin)
                    camera.position.z += currentScale
            }
        }

        mouseData.x = parseInt(touch.pageX)
        mouseData.y = parseInt(touch.pageY)
    }
}

function wheelEventHandler(e) {
    e.preventDefault()
    const newZoomVal = camera.position.z + Math.sign(e.deltaY) * settings.zoomStep

    if (newZoomVal < settings.zoomMax && newZoomVal > settings.zoomMin)
        camera.position.z += Math.sign(e.deltaY) * settings.zoomStep
}

function onCanvasResize() {
    const canvasWrapper = document.getElementById('canvasWrapper')
    sceneSize.width = canvasWrapper.getBoundingClientRect().width
    sceneSize.height = sceneSize.width / settings.aspectRatio
    
    canvas.width = sceneSize.width;
    canvas.height = sceneSize.height;
    
    camera = new THREE.PerspectiveCamera( 50, sceneSize.width / sceneSize.height, 0.1, settings.camera.deep );
    camera.position.y = settings.camera.posY;
    camera.position.z = settings.camera.posZ;
    
    renderer.setSize( sceneSize.width, sceneSize.height );
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

export default App;
