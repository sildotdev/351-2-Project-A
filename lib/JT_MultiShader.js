//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// TABS set to 2.
//
// ORIGINAL SOURCE:
// RotatingTranslatedTriangle.js (c) 2012 matsuda
// HIGHLY MODIFIED to make:
//
// JT_MultiShader.js  for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin

/* Show how to use 3 separate VBOs with different verts, attributes & uniforms. 
-------------------------------------------------------------------------------
	Create a 'VBObox' object/class/prototype & library to collect, hold & use all 
	data and functions we need to render a set of vertices kept in one Vertex 
	Buffer Object (VBO) on-screen, including:
	--All source code for all Vertex Shader(s) and Fragment shader(s) we may use 
		to render the vertices stored in this VBO;
	--all variables needed to select and access this object's VBO, shaders, 
		uniforms, attributes, samplers, texture buffers, and any misc. items. 
	--all variables that hold values (uniforms, vertex arrays, element arrays) we 
	  will transfer to the GPU to enable it to render the vertices in our VBO.
	--all user functions: init(), draw(), adjust(), reload(), empty(), restore().
	Put all of it into 'JT_VBObox-Lib.js', a separate library file.

USAGE:
------
1) If your program needs another shader program, make another VBObox object:
 (e.g. an easy vertex & fragment shader program for drawing a ground-plane grid; 
 a fancier shader program for drawing Gouraud-shaded, Phong-lit surfaces, 
 another shader program for drawing Phong-shaded, Phong-lit surfaces, and
 a shader program for multi-textured bump-mapped Phong-shaded & lit surfaces...)
 
 HOW:
 a) COPY CODE: create a new VBObox object by renaming a copy of an existing 
 VBObox object already given to you in the VBObox-Lib.js file. 
 (e.g. copy VBObox1 code to make a VBObox3 object).

 b) CREATE YOUR NEW, GLOBAL VBObox object.  
 For simplicity, make it a global variable. As you only have ONE of these 
 objects, its global scope is unlikely to cause confusions/errors, and you can
 avoid its too-frequent use as a function argument.
 (e.g. above main(), write:    var phongBox = new VBObox3();  )

 c) INITIALIZE: in your JS progam's main() function, initialize your new VBObox;
 (e.g. inside main(), write:  phongBox.init(); )

 d) DRAW: in the JS function that performs all your webGL-drawing tasks, draw
 your new VBObox's contents on-screen. 
 (NOTE: as it's a COPY of an earlier VBObox, your new VBObox's on-screen results
  should duplicate the initial drawing made by the VBObox you copied.  
  If that earlier drawing begins with the exact same initial position and makes 
  the exact same animated moves, then it will hide your new VBObox's drawings!
  --THUS-- be sure to comment out the earlier VBObox's draw() function call  
  to see the draw() result of your new VBObox on-screen).
  (e.g. inside drawAll(), add this:  
      phongBox.switchToMe();
      phongBox.draw();            )

 e) ADJUST: Inside the JS function that animates your webGL drawing by adjusting
 uniforms (updates to ModelMatrix, etc) call the 'adjust' function for each of your
VBOboxes.  Move all the uniform-adjusting operations from that JS function into the
'adjust()' functions for each VBObox. 

2) Customize the VBObox contents; add vertices, add attributes, add uniforms.
 ==============================================================================*/


// Global Variables  
//   (These are almost always a BAD IDEA, but here they eliminate lots of
//    tedious function arguments. 
//    Later, collect them into just a few global, well-organized objects!)
// ============================================================================
// for WebGL usage:--------------------
var gl;													// WebGL rendering context -- the 'webGL' object
																// in JavaScript with all its member fcns & data
var g_canvasID;									// HTML-5 'canvas' element ID#

// For multiple VBOs & Shaders:-----------------
worldBox = new WorldGrid();		  // Holds VBO & shaders for 3D 'world' ground-plane grid, etc;
partSys = new PartSys();			  // Holds VBO & shaders for particle system

// For animation:---------------------
var g_lastMS = Date.now();			// Timestamp (in milliseconds) for our 
                                // most-recently-drawn WebGL screen contents.  
                                // Set & used by moveAll() fcn to update all
                                // time-varying params for our webGL drawings.
  // All time-dependent params (you can add more!)
var g_angleNow0  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate0 = 30.0;				// Rotation angle rate, in degrees/second.
                                //---------------
var g_angleNow1  = 100.0;       // current angle, in degrees
var g_angleRate1 =  95.0;        // rotation angle rate, degrees/sec
var g_angleMax1  = 150.0;       // max, min allowed angle, in degrees
var g_angleMin1  =  60.0;
                                //---------------
var g_angleNow2  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate2 = -62.0;				// Rotation angle rate, in degrees/second.

                                //---------------
var g_posNow0 =  0.0;           // current position
var g_posRate0 = 0.6;           // position change rate, in distance/second.
var g_posMax0 =  0.5;           // max, min allowed for g_posNow;
var g_posMin0 = -0.5;           
                                // ------------------
var g_posNow1 =  0.0;           // current position
var g_posRate1 = 0.5;           // position change rate, in distance/second.
var g_posMax1 =  1.0;           // max, min allowed positions
var g_posMin1 = -1.0;
                                //---------------

var g_StringSin = 0.0; g_StringCos = 0.0;
var g_StringSpeed = 0.01;
var g_StringAngle = 0;
var g_spiral_sin = 0;

var g_stringpiece_sin = 0.0;

// For mouse/keyboard:------------------------
var g_show0 = 1;								// 0==Show, 1==Hide VBO0 contents on-screen.
// @TODO: g_show1 = 1; g_show2 = 0;
var g_show1 = 1;								// 	"					"			VBO1		"				"				" 
var g_show2 = 0;                //  "         "     VBO2    "       "       "

var g_vpAspect = 1;


function main() {
//=============================================================================
  // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
  g_canvasID = document.getElementById('webgl');	
  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine adjusted by large sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL function call
  // will follow this format:  gl.WebGLfunctionName(args);

  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine, adjusted by big sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL func. call
  // will follow this format:  gl.WebGLfunctionName(args);
  //SIMPLE VERSION:  gl = getWebGLContext(g_canvasID); 
  // Here's a BETTER version:
  gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true});
	// This fancier-looking version disables HTML-5's default screen-clearing, so 
	// that our drawMain() 
	// function will over-write previous on-screen results until we call the 
	// gl.clear(COLOR_BUFFER_BIT); function. )
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // RGBA color for clearing <canvas>

  gl.enable(gl.DEPTH_TEST);

  //----------------SOLVE THE 'REVERSED DEPTH' PROBLEM:------------------------
  // IF the GPU doesn't transform our vertices by a 3D Camera Projection Matrix
  // (and it doesn't -- not until Project B) then the GPU will compute reversed 
  // depth values:  depth==0 for vertex z == -1;   (but depth = 0 means 'near') 
  //		    depth==1 for vertex z == +1.   (and depth = 1 means 'far').
  //
  // To correct the 'REVERSED DEPTH' problem, we could:
  //  a) reverse the sign of z before we render it (e.g. scale(1,1,-1); ugh.)
  //  b) reverse the usage of the depth-buffer's stored values, like this:
  // I guess I reversed the z somehow...?
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.

  // gl.clearDepth(0.0);       // each time we 'clear' our depth buffer, set all
                            // pixel depths to 0.0  (1.0 is DEFAULT)
  gl.depthFunc(gl.LESS); // draw a pixel only if its depth value is GREATER
                            // than the depth buffer's stored value.
                            // (gl.LESS is DEFAULT; reverse it!)
  //------------------end 'REVERSED DEPTH' fix---------------------------------


  // Initialize each of our 'vboBox' objects: 
  worldBox.init(gl);
  partSys.init(gl);
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // RGBA color for clearing <canvas>

  var xtraMargin = 16;
  
  // ==============ANIMATION=============
  // Quick tutorials on synchronous, real-time animation in JavaScript/HTML-5: 
  //    https://webglfundamentals.org/webgl/lessons/webgl-animation.html
  //  or
  //  	http://creativejs.com/resources/requestanimationframe/
  //		--------------------------------------------------------
  // Why use 'requestAnimationFrame()' instead of the simpler-to-use
  //	fixed-time setInterval() or setTimeout() functions?  Because:
  //		1) it draws the next animation frame 'at the next opportunity' instead 
  //			of a fixed time interval. It allows your browser and operating system
  //			to manage its own processes, power, & computing loads, and to respond 
  //			to on-screen window placement (to skip battery-draining animation in 
  //			any window that was hidden behind others, or was scrolled off-screen)
  //		2) it helps your program avoid 'stuttering' or 'jittery' animation
  //			due to delayed or 'missed' frames.  Your program can read and respond 
  //			to the ACTUAL time interval between displayed frames instead of fixed
  //		 	fixed-time 'setInterval()' calls that may take longer than expected.
  //------------------------------------
  var tick = function() {		    // locally (within main() only), define our 
                                // self-calling animation function.
    g_canvasID.width = innerWidth - xtraMargin;
    g_canvasID.height = ( innerHeight * 3/4 ) - xtraMargin;
  
    g_vpAspect = ( g_canvasID.width) /
                ( g_canvasID.height );

    g_StringAngle += g_StringSpeed

    g_StringSin = Math.sin(g_StringAngle);
    g_StringCos = Math.cos(g_StringAngle);

    g_stringpiece_sin = Math.sin(g_StringAngle * 10);
    g_spiral_sin = Math.sin(g_StringAngle / 10);

    requestAnimationFrame(tick, g_canvasID); // browser callback request; wait
                                // til browser is ready to re-draw canvas, then
    cameraTick();
    timerAll();  // Update all time-varying params, and
    drawAll();                // Draw all the VBObox contents
    };
  //------------------------------------
  tick();                       // do it again!
}

// thank you https://learnopengl.com/Getting-started/Camera
var g_Camera = new Vector3([9.0, 0.0, 2.0]);
var g_CameraFront = new Vector3([-1, 0, 0]);
var g_CameraUp = new Vector3([0, 0, 1.0]);

var g_Pitch = -1 * Math.PI; g_Yaw = 0.0; g_Roll = 0.0;
var g_CameraDirection = new Vector3([0, 0, 0]);

function moveCameraFront(positive) {
    var speed = 0.1;
    if (!positive) {
	speed = -speed;
    }

    g_Camera.elements[0] += g_CameraFront.elements[0] * speed
    g_Camera.elements[1] += g_CameraFront.elements[1] * speed
    // g_Camera.elements[2] += g_CameraFront.elements[2] * speed
}

function moveCameraRight(positive) {
    var speed = 0.1;
    if (!positive) {
	speed = -speed;
    }

    rightVector = new Vector3([g_CameraFront.elements[1], -g_CameraFront.elements[0], 0]);
    rightVector.normalize();

    g_Camera.elements[0] += rightVector.elements[0] * speed
    g_Camera.elements[1] += rightVector.elements[1] * speed
    g_Camera.elements[2] += rightVector.elements[2] * speed
}

function pitchCamera(positive) {
    var speed = 0.015;
    if (!positive) {
	    speed = -speed;
    }

    g_Pitch += speed;

    g_CameraDirection.elements[0] = Math.cos(g_Yaw) * Math.cos(g_Pitch);
    g_CameraDirection.elements[1] = Math.sin(g_Yaw) * Math.cos(g_Pitch);
    g_CameraDirection.elements[2] = Math.sin(g_Pitch);

    g_CameraFront.elements[0] = g_CameraDirection.elements[0];
    g_CameraFront.elements[1] = g_CameraDirection.elements[1];
    g_CameraFront.elements[2] = g_CameraDirection.elements[2];

    g_CameraFront = g_CameraFront.normalize();

    g_CameraUp.elements[0] = Math.cos(g_Yaw) * Math.cos(g_Pitch - Math.PI / 2);
    g_CameraUp.elements[1] = Math.sin(g_Yaw) * Math.cos(g_Pitch - Math.PI / 2);
    g_CameraUp.elements[2] = Math.sin(g_Pitch - Math.PI / 2);

    g_CameraUp = g_CameraUp.normalize();
}

function yawCamera(positive) {
    var speed = 0.02;
    if (!positive) {
	speed = -speed;
    }

    g_Yaw += speed;

    g_CameraDirection.elements[0] = Math.cos(g_Yaw) * Math.cos(g_Pitch);
    g_CameraDirection.elements[1] = Math.sin(g_Yaw) * Math.cos(g_Pitch);
    g_CameraDirection.elements[2] = Math.sin(g_Pitch);

    g_CameraDirection = g_CameraDirection.normalize();

    g_CameraFront.elements[0] = g_CameraDirection.elements[0];
    g_CameraFront.elements[1] = g_CameraDirection.elements[1];
    g_CameraFront.elements[2] = g_CameraDirection.elements[2];

    g_CameraFront = g_CameraFront.normalize();

    g_CameraUp.elements[0] = Math.cos(g_Yaw) * Math.cos(g_Pitch - Math.PI / 2);
    g_CameraUp.elements[1] = Math.sin(g_Yaw) * Math.cos(g_Pitch - Math.PI / 2);
    g_CameraUp.elements[2] = Math.sin(g_Pitch - Math.PI / 2);
}

var movement = [0, 0, 0];
var looking = [0, 0, 0];
var g_worldMat = new Matrix4();

function cameraTick() {
  if (movement[0] != 0) {
    moveCameraRight(movement[0] > 0);
  }

  if (movement[1] != 0) {
    moveCameraFront(movement[1] > 0);
  }

  if (looking[0] != 0) {
    yawCamera(looking[0] > 0);
  }

  if (looking[1] != 0) {
    pitchCamera(looking[1] > 0);
  }

  g_worldMat.setIdentity();
  g_worldMat.perspective(30.0,   
    g_canvasID.width / g_canvasID.height,   
    1.0,   
    200.0);  
  g_worldMat.lookAt(
    g_Camera.elements[0], g_Camera.elements[1], g_Camera.elements[2],
    g_Camera.elements[0] + g_CameraFront.elements[0], g_Camera.elements[1] + g_CameraFront.elements[1], g_Camera.elements[2] + g_CameraFront.elements[2],
    g_CameraUp.elements[0], g_CameraUp.elements[1], g_CameraUp.elements[2]
  )

}

document.addEventListener("keydown", event => {
  switch (event.key) {
    case "w":
      movement[1] = 1;
      break;
    case "a":
      movement[0] = -1;
      break;
    case "s":
      movement[1] = -1;
      break;
    case "d":
      movement[0] = 1;
      break;
    case "ArrowUp":
      looking[1] = -1;
      break;
    case "ArrowDown":
      looking[1] = 1;
      break;
    case "ArrowLeft":
      looking[0] = 1;
      break;
    case "ArrowRight":
      looking[0] = -1;
      break;
  }
});

document.addEventListener("keyup", event => {
  switch (event.key) {
    case "w":
    case "s":
      movement[1] = 0;
      break;
    case "a":
    case "d":
      movement[0] = 0;
      break;
    case "ArrowUp":
    case "ArrowDown":
      looking[1] = 0;
      break;
    case "ArrowLeft":
    case "ArrowRight":
      looking[0] = 0;
      break;
  }
});

function timerAll() {
//=============================================================================
// Find new values for all time-varying parameters used for on-screen drawing
  // use local variables to find the elapsed time.
  var nowMS = Date.now();             // current time (in milliseconds)
  var elapsedMS = nowMS - g_lastMS;   // 
  g_lastMS = nowMS;                   // update for next webGL drawing.
  if(elapsedMS > 1000.0) {            
    // Browsers won't re-draw 'canvas' element that isn't visible on-screen 
    // (user chose a different browser tab, etc.); when users make the browser
    // window visible again our resulting 'elapsedMS' value has gotten HUGE.
    // Instead of allowing a HUGE change in all our time-dependent parameters,
    // let's pretend that only a nominal 1/30th second passed:
    elapsedMS = 1000.0/30.0;
    }
  // Find new time-dependent parameters using the current or elapsed time:
  // Continuous rotation:
  g_angleNow0 = g_angleNow0 + (g_angleRate0 * elapsedMS) / 1000.0;

}

function drawAll() {
//=============================================================================
  // Clear on-screen HTML-5 <canvas> object:
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.viewport(0, 0, g_canvasID.width, g_canvasID.height);

var b4Draw = Date.now();
var b4Wait = b4Draw - g_lastMS;

  worldBox.switchToMe();  // Set WebGL to render from this VBObox.
  worldBox.adjust();		  // Send new values for uniforms to the GPU, and
  worldBox.draw();			  // draw our VBO's contents using our shaders.
  partSys.switchToMe();  // Set WebGL to render from this VBObox.
  partSys.adjust();		  // Send new values for uniforms to the GPU, and
  partSys.draw();			  // draw our VBO's contents using our shaders.
/* // ?How slow is our own code?  	
var aftrDraw = Date.now();
var drawWait = aftrDraw - b4Draw;
console.log("wait b4 draw: ", b4Wait, "drawWait: ", drawWait, "mSec");
*/
}

function VBO0toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO0'.
  if(g_show0 != 1) g_show0 = 1;				// show,
  else g_show0 = 0;										// hide.
  console.log('g_show0: '+g_show0);
}

function VBO1toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO1'.
  if(g_show1 != 1) g_show1 = 1;			// show,
  else g_show1 = 0;									// hide.
  console.log('g_show1: '+g_show1);
}

function VBO2toggle() {
//=============================================================================
// Called when user presses HTML-5 button 'Show/Hide VBO2'.
  if(g_show2 != 1) g_show2 = 1;			// show,
  else g_show2 = 0;									// hide.
  console.log('g_show2: '+g_show2);
}