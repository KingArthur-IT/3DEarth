import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

var canvas, renderer, scene, camera, EarthObj
var deltaX = 0,
    currentDeltaX = 0,
    sceneSize = {
        width: 0,
        height: 0
    },
    mouseData = {
        x: 0,
    },
    settings = {
        moveStep: {
            x: 0.3,
        },
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

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        // renderer.setClearColor( 0x000000, 0 );
        renderer.setPixelRatio( Math.min(window.devicePixelRatio, 1.5) );
        renderer.setSize( sceneSize.width, sceneSize.height );

        //obj
        EarthObj = new THREE.Object3D();
        const objLoader = new OBJLoader();

        const redMaterial = new THREE.MeshPhongMaterial({
            color: 15017491,
            shininess: .75,
            transparent: false,
            emissive: 15017491,
            emissiveIntensity: 1
        });

        const whiteMaterial = new THREE.MeshPhongMaterial({
            color: '#cccccc',
        });

        // objLoader.setMaterials(materials);
        objLoader.load('./assets/Earth.obj', function (object) {
            const scale = 2.2
            object.scale.set(scale, scale, scale);
            object.position.set(0, 0, 0);
            object.rotation.set(0, 0.6, 3.5);

            object.traverse( function ( child ) {
                if ( child instanceof THREE.Mesh ) {
                    console.log(child);
                    // child.material.side = THREE.DoubleSide;    
                    
                    if (child.name === 'Mark') {
                        child.material = redMaterial  
                    }
                    if (child.name === 'Earthdots') {
                        child.material = whiteMaterial  
                    }
                }
            });

            EarthObj.add(object)
        }, (xhr) => {
            const loadedVal = `loaded: ${Math.floor(100.0 * xhr.loaded / xhr.total)}%`;
            console.log(loadedVal);
            document.querySelector('.loader').innerHTML = loadedVal;
        }
        
        );
        scene.add(EarthObj)

        window.addEventListener('resize', onCanvasResize)

        animate()
    }
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

window.addEventListener('mousemove', e => {
    const newDeltaX = Math.sign(e.x - mouseData.x) * settings.moveStep.x
    mouseData.x = e.x
    deltaX = EarthObj.rotation.x + newDeltaX
});

function animate() {
    const step = .01
    const damping = .00001
    //for scroll-x rotation
    if (Math.abs(deltaX - currentDeltaX) > step) {
        currentDeltaX = currentDeltaX + (deltaX - currentDeltaX) * step
    } else {
        currentDeltaX = currentDeltaX + (deltaX - currentDeltaX) * (deltaX - currentDeltaX) * (deltaX - currentDeltaX) * damping
    }
    EarthObj.rotation.y = currentDeltaX * Math.PI
    
    // camera.updateMatrixWorld();    
    // camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

export default App;
