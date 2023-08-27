const d = 220
const R = 200
const T_earth = 'map.png'
const posZ = 1000
const canvasId = '#earth'
const color = '#cccccc'
const PI = Math.PI
const vVPort = window.visualViewport || { scale: 1};

import {
	Math as math, 
	Vector3,
	WebGLRenderer,
	Scene,
	Group,
	PerspectiveCamera,
	TextureLoader,
	Color,
	IcosahedronGeometry,
	Points,
	Float32BufferAttribute,
	PointsMaterial,
	BufferGeometry,
	BufferAttribute,
	Fog
} from "./three.min.js"

	Object.assign(Math, math);
	var dpr,
		W = 1, 
		H = 1, 
		aspect = 1;

	const vec3 = (x,y,z) => new Vector3(x,y,z),
		wY = vec3(0, 1, 0),
	 	canvas = document.querySelector(canvasId), 
		container = document.querySelector('.animation'); 

	const renderer = new WebGLRenderer({ alpha: true, antialias: true, canvas: canvas });

	const scene = new Scene(), 
		planet = new Group(),
		camera = new PerspectiveCamera(14, aspect, 1, 5000 );
	
	camera.position.z = posZ;

	camera.updateMatrixWorld();
	planet.rotateOnWorldAxis(vec3(1, 0, 0), .6);
	
	function resize(){
		let rect = canvas.getBoundingClientRect();
		if (W != rect.width || H != rect.height || dpr != (dpr=devicePixelRatio*vVPort.scale)) {
			W = rect.width; 
			H = rect.height;

			renderer.setDrawingBufferSize(W, H, dpr);

			camera.aspect = W/H;
			camera.updateProjectionMatrix();
			let l = camera.position.length(),
				r = vec3(0, l * Math.tan(Math.asin(R/l)), 0).project(camera).y * H;
			container.style.opacity = 1;
			camera.zoom *= W/1.01/r;
			camera.updateProjectionMatrix();
		}
	};

	var Emap = (new TextureLoader()).load( T_earth, function(t){
		var testCanvas = document.createElement('canvas'), 
			tCtx = testCanvas.getContext('2d')
		var img = t.image;
		
		const Eh = testCanvas.height = img.height;
		tCtx.scale(1, -1);
		tCtx.drawImage(img, 0, -Eh);
	} );

	var matScale = {
		set value(val) { this.val = val * camera.zoom },
		get value() { return this.val }
	}

	var Ematerial = new PointsMaterial({
		map: Emap,
		transparent: true,
		alphaTest: 0.004,
		size: R * .06,
		color: new Color(color).multiplyScalar(.8),
		blending: 2,
		depthTest: false,
		onBeforeCompile: sh => {
			sh.uniforms.scale = matScale;
			sh.fragmentShader = sh.fragmentShader.replace('#include <map_particle_fragment>', `
		    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
		    float r = length(cxy), delta = fwidth(r)*.5;
		    diffuseColor.a *= 1.-smoothstep(1. - delta, 1.+delta, r);
			  diffuseColor.a *= smoothstep( ${(R*.3).toFixed(1)},  ${(-R).toFixed(1)}, fogDepth-${(posZ).toFixed(1)} );
			`);
			sh.vertexShader=`
				uniform sampler2D map;
				uniform mat3 uvTransform;
			`+sh.vertexShader.replace('}', `
				vec2 vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
				if (texture2D( map, vUv ).r >.9) fogDepth=5000.;
			}`)

		}
	});

	Ematerial.extensions = { derivatives: 1 };

	var Egeometry = new IcosahedronGeometry(R, 6);
	var Earth = new Points(new BufferGeometry().setFromPoints(Egeometry.vertices), Ematerial);
	Egeometry.uv = [];
	Egeometry.vertices.forEach(v => {
		Egeometry.uv.push(.5-Math.atan2(-v.z, -v.x)/2/PI);
		Egeometry.uv.push(.5+Math.asin(v.y/R)/PI)
	})
	Earth.geometry.addAttribute('uv', new Float32BufferAttribute(Egeometry.uv, 2));

	var Pmaterial = new PointsMaterial({
		size: d * 1.2,
		transparent: true,
		alphaTest: 0.004,
		depthTest: false,
		blending: 5,
		color: color,
		onBeforeCompile: function(sh){
			sh.uniforms.scale = matScale;
			sh.vertexShader='\
			attribute float flash;\n\
			varying float vSize;\n\
			'			+sh.vertexShader.replace(/}\s*$/, '\
			vSize=max(flash, 0.0);\n\
			gl_PointSize*=vSize;\n\
			}			');
						sh.fragmentShader='\
			varying float vSize;\n\
			'			+sh.fragmentShader.replace("#include <map_particle_fragment>", `
				vec2 cxy = 2.0 * gl_PointCoord - 1.0;
			float r = length(cxy), delta = fwidth(r), size=1.-vSize;
				size=1.-size*size;
				#ifdef T_POINT
				diffuseColor.a =1.0 - smoothstep(1. - delta, 1. + delta, r);
				//diffuseColor.a = (1.+delta -r)/delta;
				#else
				//float r=sqrt(r2);
				diffuseColor.rgb =mix(vec3(1.1), diffuse, min(r*2.3, 1.));
				diffuseColor.a=cos(min(r*r,1.)*PI)*.5+.5;
				#endif
			diffuseColor.a *= smoothstep( ${(R*.2).toFixed(1)},  ${(-R*.4).toFixed(1)}, fogDepth-${(posZ).toFixed(1)} )*size;
      `);

		}
	});
	Pmaterial.extensions = { derivatives: 1 };

	var pCount = 50

	var flashes = new Float32Array(pCount);
	var points32 = new Float32Array(pCount * 3);
	var Pgeometry = new BufferGeometry();
	Pgeometry.addAttribute( 'position', new BufferAttribute( points32, 3 ) );
	Pgeometry.addAttribute( 'flash', new BufferAttribute( flashes, 1 ) );

	var Flashes = new Points(Pgeometry, Pmaterial);
	planet.add(Flashes, Earth)
	scene.add(planet);

	scene.fog = new Fog(color, posZ - R/2, posZ + R);
	
	// interactions
	var dx = 0, ready, pointers = { x: -1, y: -1 };
	const damping = .1
	const rotateStep = 0.001

	window.addEventListener('mousemove', e => {
		if (!ready) return;
		e.preventDefault();
		if (pointers.x < 0 || pointers.y < 0) {
			pointers.x = e.clientX;
			pointers.y = e.clientY;
		} else {
			dx = Math.lerp(dx, pointers.x-(pointers.x = e.clientX), .3);
		}
		ready = 0;
	});

	requestAnimationFrame(function animate() {
		requestAnimationFrame(animate);
		resize();

		if (!Emap.image) return;
		planet.position.z -= planet.position.z;

		dx = Math.abs(dx) < damping ? 0 : dx - Math.sign(dx) * damping
		planet.rotateOnWorldAxis(wY, -dx * rotateStep);
		
		Pgeometry.attributes.flash.needsUpdate = true;
		renderer.render( scene, camera);
		ready = 1;
	});
//})()