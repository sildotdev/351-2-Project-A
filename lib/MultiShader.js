//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// ORIGINAL SOURCE:
// RotatingTranslatedTriangle.js (c) 2012 matsuda
// HIGHLY MODIFIED to make:
//
// BouncyBall.js  for EECS 351-1,
//									Northwestern Univ. Jack Tumblin
//
//  06.SolveFloors:-------------------
//    --clearly label all global vars with 'g_' prefix: g_timeStep, etc.
//    --improve r/R keys for more intuitive usage; better on-screen user guide
//
//  07.StateVars:---------------------
//  a)--Make 'state variables' s1,s2 for just one 'bouncy-ball' particle.
//    The contents of these global float32Arrays completely describe the current
//    and future state of our bouncy-ball, and will completely replace all
//    of our existing bouncy-ball-describing variables:
//			xposPrev, yposPrev, zposPrev, ==> s1[0], s1[1], s1[2];
//			xvelPrev, yvelPrev, zvelPrev, INIT_VEL ==> s1[3], s1[4], s1[5], s1[6].
//    Similarly, s2 holds the same values for the 'next' bouncy-ball state:
//			xposNow, yposNow, zposNow, ==> s2[0], s2[1], s2[2]
//			xvelNow, yvelNow, zvelNow, INIT_VEL ==> s2[3], s2[4], s2[5], s2[6].
//  b)--One-by-one, comment-out & replace all old vars with these 'state vars'.
//     YUCK!! NO!! UGLY!!! WAIT WAIT!!!
//    Even this one simple 'bouncy-ball' particle has too many array indices to
//    remember!  DON'T use cryptic, error-prone numbers/literals; instead use
//    descriptive 'const' variable names listed below.  For example,
//    instead of s1[4] to replace the old 'yvelPrev', use s1[PART_YVEL].
//    instead of s2[3] to replace the old 'xvelNow',  use s2[PART_XVEL], etc.
//    Note how easily we can modify particle's definition:
//    we just add more array-index names.  As it's easy to do, lets extend our
//    particles to include adjustable parameters for color, mass, on-screen
//    diameter, and even 'rendering mode' (selects our on-screen drawing mode;
//    should we draw the particle as a square? a circle? a sphere? etc.).
//    RESULT: we need 15 floating-point values to describe each particle.

//  08.StateFcns:---------------------
//  a) Delete all commented-out stuff we replaced with state variables. THEN:
//    Create a 'PartSys' object prototype (or JS class, if you prefer) to
//     organize all particle-related code into particle-related functions. Start
//    by creating 'stub' functions described in Lecture Slides C, including:
//    --PartSys(count): constructor for 'empty' particle system with 'count'
//      particles.
//    --init(): creates all state variables, force-applying objects,
//      constraint-applying objects; all particle-system-related variables, and
//      set all of their initial values for interesting animated behaviors.
//      (eventually this will replace initVertexBuffers() function).
//    These next functions will help us simplify & shorten the 'draw()' fcn:
//    --applyForces(s,F): clear the force-accumulator vector for each
//      particle in given state-vector 's', then apply each force described in
//      the collection of force-applying objects found in 'f'.
//    --dotFinder(s): find the time-derivative of given state 's'.
//      (also simplifies 'draw()' function).
//    --render(s): draw the contents of state-vector 's' on-screen; first,
//      transfer its contents to the already-existing VBO in the GPU using the
//      WebGL call 'gl.bufferSubData()', then draw it using gl.drawArray().
//    --solver(): find next state s2 from current state s1.
//    --doConstraint(): apply all constraints to s1 and s2.
//    --step(): exchange contents of state-vector s1, s2.
//  b) Create global variable 'g_partA'; our first particle system object, using
//      our PartSys constructor.  UNIFY: replace all other global vars we use to
//      describe bouncy-ball particles with equivalent 'g_partA' properties.
//      LATER: Move the set of const array-index names into PartSys,
//                    so that we can customize them for each PartSys object.
//  c)--Fill the VBO with state var s1:
//    MOVE all contents of initVertexBuffer() into g_partA.init() function,
//    (including, at first, the vertices[] array), along with the code in main()
//    that sets up attributes & uniforms. CAREFUL! you need to INITIALIZE s1
//    contents, esp. the position coord. 'w', diameter, mass, etc.
//    Then replace the 'vertices[]' array with s1[] state variable, AND be sure
//    to adjust attribute stride & offset attribute a_Position to access values
//    correctly.
//    Note that init() creates and fills the VBO with s1 contents, but does NOT
//    make any further changes to the VBO's contents in the GPU.  Instead, we
//		loaded slightly-weird s1 values into the VBO, and then uniform
//		u_ballShift moves it on-screen.
// d) MOVE the bouncy-ball by modifying VBO contents:
//  At first, don't mess with the 'u_ballShift' uniform, and:
//  --at the end of our too-large 'draw()' function,add a 'bufferSubData()' call
//    that transfers current s1 contents to the VBO just before we draw it.
//    This should DOUBLE the bouncy-ball movements, as it's moved by both
//    the u_ballShift uniform and by s1 changes uploaded to VBO.
// e) Comment-out the u_ballShift uniform entirely -- from shaders, main(),etc.
//    SURPRISE!  Walls limit bouncy-ball to 0 <= x,y <= 1.8, but we draw bouncy
//    ball in the CVV(-1 <= x,y <= +1).  Change the wall limits to +/-0.9 in
//    in our gigantic 'draw()' function. Move the VBO-update-and-draw code to
//    g_partA.render() function, and call it at the end of draw().
// f) CLEANUP I:
//    --Rename 'displayMe()' as 'printControls()'
//    --Delete all the commented-out u_ballShift code, and
//      delete all commented-out initVertexBuffer() and related code.
//    --TEST: ready for multiple-particles? Make g_partA into a 2-particle object,
//      (and make sure the as-yet-unused/unomved 2nd particle appears on-screen)

//  09.PartSys:---------------------
//    --Create 'partSys.js' file to hold PartSys prototype & related items.
//      Add in all the const values from old C/C++ header files for CPartSys,
//      CForcer and CLimit classes.
//    --Simplify constructor; make first of many 'init' functions:
//      PartSys.initBouncy2D(count).  Make stubs for:PartSys.initBouncy3D(count);
//      also initFireReeves(count),initTornado(count),initFlocking(count),
//      initOrbits(), initSpringPair(), initSpringCloth(), initSpringRope(), etc
//    --Drastically shorten/simplify our still-too-large 'draw' function:
//      1) move the constraint-applying code to the 'g_partA.applyConstraints().
//      Improve it: apply constraints to ALL particles in the state-variable(s).
//      2) Replace the tedious variable-by-variable stepping of s1,s2 elements
//      in draw() with a call to 'g_partA.step()', a function that switches
//			the contents of the s1  and s2 state vars (see week2 starter code:
//          BE SURE it steps references only; NOT a 'deep copy'!!)
//      3) Move particle-movement-solving code from 'draw()' to partA.solver().
//      Update code to use this.solvType to select from SOLV_XXXX const values.
//      Re-work the 2 solvers so that s1 == current state, s2==next state,
//      (note that earlier versions used s1 as 'previous' and s2 as 'current'),
//      So that 'step()' calls AFTER solver() call in draw(), not before.
//      Simplify it by implementing the 'dotFinder()' function, and then using
//      it for Euler solver: s2 = s1 + h*s1dot.
//      4) Move'drawMe()' into particle system as 'g_partA.showState(p)', and
//      improve it to display values of particle 'p' (not just particle 0).
//      5) create a CForcer' object, add forcers set to the PartSys prototype.

//    --Create a constraint-applying object 'CLimit'.
//			as the program starts, when users press the 'R' key too ('deep reset').
//			Make a related function for the 'r' key that updates only the velocities
//			for all particles in the current state.

//==============================================================================
// Vertex shader program:
var VSHADER_SOURCE = `precision mediump float;							// req'd in OpenGL ES if we use 'float'
  //
  uniform   int u_runMode;							// particle system state: 
  																			// 0=reset; 1= pause; 2=step; 3=run
  uniform	 vec4 u_ballShift;						// single bouncy-ball's movement
  attribute vec4 a_Position;
  varying   vec4 v_Color; 
  void main() {
    gl_PointSize = 20.0;
  	 gl_Position = a_Position + u_ballShift; 
	// Let u_runMode determine particle color:
    if(u_runMode == 0) { 
		   v_Color = vec4(1.0, 0.0, 0.0, 1.0);	// red: 0==reset
	  	 } 
	  else if(u_runMode == 1) { 
	    v_Color = vec4(1.0, 1.0, 0.0, 1.0);		// yellow: 1==pause
	    }  
	  else if(u_runMode == 2) { 
	    v_Color = vec4(1.0, 1.0, 1.0, 1.0);		// white: 2==step
      } 
	  else { 
	    v_Color = vec4(0.2, 1.0, 0.2, 1.0);		// green: >3==run
			 } 
  }`;
// Each instance computes all the on-screen attributes for just one VERTEX,
// supplied by 'attribute vec4' variable a_Position, filled from the
// Vertex Buffer Object (VBO) created in g_partA.init().

//==============================================================================
// Fragment shader program:
var FSHADER_SOURCE = `precision mediump float;
  varying vec4 v_Color; 
  void main() { 
    float dist = distance(gl_PointCoord, vec2(0.5, 0.5)); 
    if(dist < 0.5) { 
	  	gl_FragColor = vec4((1.0-2.0*dist)*v_Color.rgb, 1.0); 
	  } else { discard; } 
  }`;
// --Each instance computes all the on-screen attributes for just one PIXEL.
// --Draw large POINTS primitives as ROUND instead of square.  HOW?
//   See pg. 377 in  textbook: "WebGL Programming Guide".  The vertex shaders'
// gl_PointSize value sets POINTS primitives' on-screen width and height, and
// by default draws POINTS as a square on-screen.  In the fragment shader, the
// built-in input variable 'gl_PointCoord' gives the fragment's location within
// that 2D on-screen square; value (0,0) at squares' lower-left corner, (1,1) at
// upper right, and (0.5,0.5) at the center.  The built-in 'distance()' function
// lets us discard any fragment outside the 0.5 radius of POINTS made circular.
// (CHALLENGE: make a 'soft' point: color falls to zero as radius grows to 0.5)?
// -- NOTE! gl_PointCoord is UNDEFINED for all drawing primitives except POINTS;
// thus our 'draw()' function can't draw a LINE_LOOP primitive unless we turn off
// our round-point rendering.
// -- All built-in variables: http://www.opengl.org/wiki/Built-in_Variable_(GLSL)

// Global Variables
// =========================
// Use globals to avoid needlessly complex & tiresome function argument lists.
// For example, the WebGL rendering context 'gl' gets used in almost every fcn;
// requiring 'gl' as an argument won't give us any added 'encapsulation'; make
// it global.  Later, if the # of global vars grows, we can unify them in to
// one (or just a few) sensible global objects for better modularity.

var gl; // webGL Rendering Context.  Created in main(), used everywhere.
var g_canvas; // our HTML-5 canvas object that uses 'gl' for drawing.

// For keyboard, mouse-click-and-drag: -----------------
var isDrag = false; // mouse-drag: true when user holds down mouse button
var xMclik = 0.0; // last mg_colGridAouse button-down position (in CVV coords)
var yMclik = 0.0;
var xMdragTot = 0.0; // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot = 0.0;

var g_vpAspect = 1;

//--Animation---------------
var isClear = 1; // 0 or 1 to enable or disable screen-clearing in the
// draw() function. 'C' or 'c' key toggles in myKeyPress().
var g_last = Date.now(); //  Timestamp: set after each frame of animation,
// used by 'animate()' function to find how much
// time passed since we last updated our canvas.
var g_stepCount = 0; // Advances by 1 for each timestep, modulo 1000,
// (0,1,2,3,...997,998,999,0,1,2,..) to identify
// WHEN the ball bounces.  RESET by 'r' or 'R'.

var g_timeStep = 1000.0 / 60.0; // current timestep (1/60th sec) in milliseconds
var g_timeStepMin = g_timeStep; // min,max timestep values since last keypress.
var g_timeStepMax = g_timeStep;

// Create & initialize a 1-particle 'state variables' s1,s2;
//---------------------------------------------------------
var g_grid = new WorldGrid();
var g_partA = new PartSys(); // create our first particle-system object;
var g_colGridA = new CollGrid();
// for code, see PartSys.js
var g_partB = new PartSys(); // create our first particle-system object;
var g_colGridB = new CollGrid();

function main() {
  //==============================================================================
  // Retrieve <canvas> element
  g_canvas = document.getElementById("webgl");
  gl = g_canvas.getContext("webgl", { preserveDrawingBuffer: true });
  // NOTE: this disables HTML-5's default screen-clearing, so that our draw()
  // function will over-write previous on-screen results until we call the
  // gl.clear(COLOR_BUFFER_BIT); function. )
  if (!gl) {
    console.log("main() Failed to get the rendering context for WebGL");
    return;
  }
  // Register the Mouse & Keyboard Event-handlers-------------------------------
  // If users move, click or drag the mouse, or they press any keys on the
  // the operating system will sense them immediately as 'events'.
  // If you would like your program to respond to any of these events, you must
  // tell JavaScript exactly how to do it: you must write your own 'event
  // handler' functions, and then 'register' them; tell JavaScript WHICH
  // events should cause it to call WHICH of your event-handler functions.
  //
  // First, register all mouse events found within our HTML-5 canvas:
  // when user's mouse button goes down call mouseDown() function,etc
  //   g_canvas.onmousedown	=	function(ev){myMouseDown(ev) };
  //   g_canvas.onmousemove = 	function(ev){myMouseMove(ev) };
  //   g_canvas.onmouseup = 		function(ev){myMouseUp(  ev) };
  // NOTE! 'onclick' event is SAME as on 'mouseup' event
  // in Chrome Brower on MS Windows 7, and possibly other
  // operating systems; use 'mouseup' instead.

  // Next, register all keyboard events found within our HTML webpage window:
  // window.addEventListener("keydown", myKeyDown, false);
  // window.addEventListener("keyup", myKeyUp, false);
  window.addEventListener("keypress", myKeyPress, false);
  // The 'keyDown' and 'keyUp' events respond to ALL keys on the keyboard,
  // 			including shift,alt,ctrl,arrow, pgUp, pgDn,f1,f2...f12 etc.
  //			I find these most useful for arrow keys; insert/delete; home/end, etc.
  // The 'keyPress' events respond only to alpha-numeric keys, and sense any
  //  		modifiers such as shift, alt, or ctrl.  I find these most useful for
  //			single-number and single-letter inputs that include SHIFT,CTRL,ALT.
  // END Mouse & Keyboard Event-Handlers-----------------------------------

  // Initialize shaders
  // if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
  //   console.log('main() Failed to intialize shaders.');
  //   return;
  // }

  gl.clearColor(0.2, 0.2, 0.2, 1); // RGBA color for clearing WebGL framebuffer
  gl.clear(gl.COLOR_BUFFER_BIT); // clear it once to set that color as bkgnd.

  // Initialize Particle systems:
  g_grid.init();
  g_colGridA.init();
  g_partA.init(); // create a 2D bouncy-ball system where
  g_partA.initBouncy3D(300);

  g_partB.init()
  g_partB.initBouncy3D(100);
  g_colGridB.init()
  // 2 particles bounce within -0.9 <=x,y<0.9
  // and z=0.
  // Display (initial) particle system values as text on webpage
  //   printControls();

  // Quick tutorial on synchronous, real-time animation in JavaScript/HTML-5:
  //  	http://creativejs.com/resources/requestanimationframe/
  //		--------------------------------------------------------
  // Why use 'requestAnimationFrame()' instead of the simple-to-use
  //	fixed-time setInterval() or setTimeout() functions?  Because:
  //		1) it draws the next animation frame 'at the next opportunity' instead
  //			of a fixed time interval. It allows your browser and operating system
  //			to manage its own processes, power, and computing loads and respond to
  //			on-screen window placement (skip battery-draining animation in any
  //			window hidden behind others, or scrolled off-screen)
  //		2) it helps your program avoid 'stuttering' or 'jittery' animation
  //			due to delayed or 'missed' frames.  Your program can read and respond
  //			to the ACTUAL time interval between displayed frames instead of fixed
  //		 	fixed-time 'setInterval()' calls that may take longer than expected.
  var tick = function () {
    // g_canvas.width = innerWidth - 16;
    // g_canvas.height = ( innerHeight * 3/4 ) - 16;

    g_vpAspect = g_canvas.width / g_canvas.height;

    g_timeStep = animate();
    // find how much time passed (in milliseconds) since the
    // last call to 'animate()'.
    if (g_timeStep > 2000) {
      // did we wait >2 seconds?
      // YES. That's way too long for a single time-step; somehow our particle
      // system simulation got stopped -- perhaps user switched to a different
      // browser-tab or otherwise covered our browser window's HTML-5 canvas.
      // Resume simulation with a normal-sized time step:
      g_timeStep = 1000 / 60;
    }
    // Update min/max for timeStep:
    if (g_timeStep < g_timeStepMin) g_timeStepMin = g_timeStep;
    else if (g_timeStep > g_timeStepMax) g_timeStepMax = g_timeStep;
    //  	draw(g_partA.partCount);    // compute new particle state at current time
    cameraTick();
    draw(); //compute & draw new prticle state at current time.
    requestAnimationFrame(tick, g_canvas);
    // Call tick() again 'at the next opportunity' as seen by
    // the HTML-5 element 'g_canvas'.
  };
  tick();
}

function animate() {
  //==============================================================================
  // Returns how much time (in milliseconds) passed since the last call to this fcn.
  var now = Date.now();
  var elapsed = now - g_last; // amount of time passed, in integer milliseconds
  g_last = now; // re-set our stopwatch/timer.

  // INSTRUMENTATION:  (delete if you don't need to know the range of time-steps)
  g_stepCount = (g_stepCount + 1) % 1000; // count 0,1,2,...999,0,1,2,...

  //-----------------------end instrumentation
  return elapsed;
}

function draw() {
  //==============================================================================
  // Clear WebGL frame-buffer? (The 'c' or 'C' key toggles isClear between 0 & 1).
  if (isClear == 1) gl.clear(gl.COLOR_BUFFER_BIT);
  // *** SURPRISE! ***
  //  What happens when you forget (or comment-out) this gl.clear() call?
  // In OpenGL (but not WebGL), you'd see 'trails' of particles caused by drawing
  // without clearing any previous drawing. But not in WebGL; by default, HTML-5
  // clears the canvas to white (your browser's default webpage color).  To see
  // 'trails' in WebGL you must disable the canvas' own screen clearing.  HOW?
  // -- in main() where we create our WebGL drawing context,
  // replace this (default):
  // -- with this:
  // -- To learn more, see:
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext

  g_grid.switchToMe();
  g_grid.adjust();
  g_grid.draw();
  // Pause? or update particle system state?


  // SYSTEM ONE
  g_colGridA.switchToMe();
  g_colGridA.adjust();
  g_colGridA.draw();

  g_partA.switchToMe();
  g_partA.adjust();

  if (g_partA.runMode > 1) {
    // 0=reset; 1= pause; 2=step; 3=run
    if (g_partA.runMode == 2) g_partA.runMode = 1; // (if 2, do just one step and pause.)
    // Make our 'bouncy-ball' move forward by one timestep, but now the 's' key
    // will select which kind of solver to use by changing g_partA.solvType:

    g_partA.solver(); // find s2 from  s1 & related states.
    g_partA.doConstraints(); // Apply constraints
    g_partA.step(); // convert 'next' state s2 into current state s1,
  }

  g_partA.render(); // transfer current state s1 to VBO, set uniforms, draw it!

  // SYSTEM TWO
  g_worldMat.translate(0, 10, 0);

  g_colGridB.switchToMe();
  g_colGridB.adjust();
  g_colGridB.draw();

  g_partB.switchToMe();
  g_partB.adjust();

  if (g_partB.runMode > 1) {
    if (g_partB.runMode == 2) g_partB.runMode = 1;

    g_partB.solver();
    g_partB.doConstraints();
    g_partB.step();
  }

  g_partB.render();

  // g_worldMat.translate(-10, 0, 0);

  // printControls();				// Display particle-system status on-screen.
  // Report mouse-drag totals.
  // document.getElementById('MouseResult0').innerHTML=
  // 		'Mouse Drag totals (CVV coords):\t'+xMdragTot.toFixed(3)+', \t'+yMdragTot.toFixed(3);
}

//===================Mouse and Keyboard event-handling Callbacks================
//==============================================================================
function myMouseDown(ev) {
  //==============================================================================
  // Called when user PRESSES down any mouse button;
  // 									(Which button?    console.log('ev.button='+ev.button);   )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left; // x==0 at canvas left edge
  var yp = g_canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  //  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);

  // Convert to Canonical View Volume (CVV) coordinates too:
  var x =
    (xp - g_canvas.width / 2) / // move origin to center of canvas and
    (g_canvas.width / 2); // normalize canvas to -1 <= x < +1,
  var y =
    (yp - g_canvas.height / 2) / //										 -1 <= y < +1.
    (g_canvas.height / 2);
  //	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);

  isDrag = true; // set our mouse-dragging flag
  xMclik = x; // record where mouse-dragging began
  yMclik = y;
  // 	document.getElementById('MouseResult0').innerHTML =
  // 'myMouseDown() at CVV coords x,y = '+x.toFixed(4)+', '+y.toFixed(4)+'<br>';
}

function myMouseMove(ev) {
  //==============================================================================
  // Called when user MOVES the mouse with a button already pressed down.
  // 									(Which button?   console.log('ev.button='+ev.button);    )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

  if (isDrag == false) return; // IGNORE all mouse-moves except 'dragging'

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left; // x==0 at canvas left edge
  var yp = g_canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  //  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);

  // Convert to Canonical View Volume (CVV) coordinates too:
  var x =
    (xp - g_canvas.width / 2) / // move origin to center of canvas and
    (g_canvas.width / 2); // normalize canvas to -1 <= x < +1,
  var y =
    (yp - g_canvas.height / 2) / //										 -1 <= y < +1.
    (g_canvas.height / 2);
  //	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

  // find how far we dragged the mouse:
  xMdragTot += x - xMclik; // Accumulate change-in-mouse-position,&
  yMdragTot += y - yMclik;
  xMclik = x; // Make next drag-measurement from here.
  yMclik = y;
  // (? why no 'document.getElementById() call here, as we did for myMouseDown()
  // and myMouseUp()? Because the webpage doesn't get updated when we move the
  // mouse. Put the web-page updating command in the 'draw()' function instead)
}

function myMouseUp(ev) {
  //==============================================================================
  // Called when user RELEASES mouse button pressed previously.
  // 									(Which button?   console.log('ev.button='+ev.button);    )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left; // x==0 at canvas left edge
  var yp = g_canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  //  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);

  // Convert to Canonical View Volume (CVV) coordinates too:
  var x =
    (xp - g_canvas.width / 2) / // move origin to center of canvas and
    (g_canvas.width / 2); // normalize canvas to -1 <= x < +1,
  var y =
    (yp - g_canvas.height / 2) / //										 -1 <= y < +1.
    (g_canvas.height / 2);
  console.log("myMouseUp  (CVV coords  ):  x, y=\t", x, ",\t", y);

  isDrag = false; // CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  xMdragTot += x - xMclik;
  yMdragTot += y - yMclik;
  console.log("myMouseUp: xMdragTot,yMdragTot =", xMdragTot, ",\t", yMdragTot);
  // Put it on our webpage too...
  // document.getElementById('MouseResult1').innerHTML =
  // 'myMouseUp(       ) at CVV coords x,y = '+x+', '+y+'<br>';
}

function myKeyDown(ev) {
  //===============================================================================
  // Called when user presses down ANY key on the keyboard, and captures the
  // keyboard's scancode or keycode (varies for different countries and alphabets).
  //  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T
  // need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins,
  // Del, etc), then just use the 'keypress' event instead.
  //	 The 'keypress' event captures the combined effects of alphanumeric keys and
  // the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
  // ASCII codes; you'll get uppercase 'S' if you hold shift and press the 's' key.
  //
  // For a light, easy explanation of keyboard events in JavaScript,
  // see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
  // For a thorough explanation of the messy way JavaScript handles keyboard events
  // see:    http://javascript.info/tutorial/keyboard-events
  //
  /*
	switch(ev.keyCode) {			// keycodes !=ASCII, but are very consistent for 
	//	nearly all non-alphanumeric keys for nearly all keyboards in all countries.
		case 37:		// left-arrow key
			// print in console:
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
  		document.getElementById('KeyResult').innerHTML =
  			' Left Arrow:keyCode='+ev.keyCode;
			break;
		case 38:		// up-arrow key
			console.log('   up-arrow.');
  		document.getElementById('KeyResult').innerHTML =
  			'   Up Arrow:keyCode='+ev.keyCode;
			break;
		case 39:		// right-arrow key
			console.log('right-arrow.');
  		document.getElementById('KeyResult').innerHTML =
  			'Right Arrow:keyCode='+ev.keyCode;
  		break;
		case 40:		// down-arrow key
			console.log(' down-arrow.');
  		document.getElementById('KeyResult').innerHTML =
  			' Down Arrow:keyCode='+ev.keyCode;
  		break;
		default:
			console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
  		document.getElementById('KeyResult').innerHTML =
  			'myKeyDown()--keyCode='+ev.keyCode;
			break;
	}
*/
}

function myKeyUp(ev) {
  //==============================================================================
  // Called when user releases ANY key on the keyboard; captures scancodes well
  // You probably don't want to use this ('myKeyDown()' explains why); you'll find
  // myKeyPress() can handle nearly all your keyboard-interface needs.
  /*
	console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
*/
}

function myKeyPress(kev) {
//============================================================================
// Called when user presses down ANY key on the keyboard;
//
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of a mess of JavaScript keyboard event handling,
// see:    http://javascript.info/tutorial/keyboard-events
//
// NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
//        'keydown' event deprecated several read-only properties I used
//        previously, including kev.charCode, kev.keyCode. 
//        Revised 2/2019:  use kev.key and kev.code instead.
//
/*
	// On console, report EVERYTHING about this key-down event:  
  console.log("--kev.code:",      kev.code,   "\t\t--kev.key:",     kev.key, 
              "\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
              "\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);
*/
  // On webpage, report EVERYTING about this key-down event:              
	// document.getElementById('KeyDown').innerHTML = ''; // clear old result
  // document.getElementById('KeyMod').innerHTML = ''; 
  // document.getElementById('KeyMod' ).innerHTML = 
  //       "   --kev.code:"+kev.code   +"      --kev.key:"+kev.key+
  //   "<br>--kev.ctrlKey:"+kev.ctrlKey+" --kev.shiftKey:"+kev.shiftKey+
  //   "<br> --kev.altKey:"+kev.altKey +"  --kev.metaKey:"+kev.metaKey;  

  // RESET our g_timeStep min/max recorder on every key-down event:
  g_timeStepMin = g_timeStep;
  g_timeStepMax = g_timeStep;

  switch(kev.code) {
    case "Digit0":
			g_partA.runMode = 0;			// RESET!
			// document.getElementById('KeyDown').innerHTML =  
			// 'myKeyDown() digit 0 key. Run Mode 0: RESET!';    // print on webpage,
			// console.log("Run Mode 0: RESET!");                // print on console.
      break;
    case "Digit1":
			g_partA.runMode = 1;			// PAUSE!
			// document.getElementById('KeyDown').innerHTML =  
			// 'myKeyDown() digit 1 key. Run Mode 1: PAUSE!';    // print on webpage,
			// console.log("Run Mode 1: PAUSE!");                // print on console.
      break;
    case "Digit2":
			g_partA.runMode = 2;			// STEP!
			// document.getElementById('KeyDown').innerHTML =  
			// 'myKeyDown() digit 2 key. Run Mode 2: STEP!';     // print on webpage,
			// console.log("Run Mode 2: STEP!");                 // print on console.
      break;
    case "Digit3":
			g_partA.runMode = 3;			// RESET!
			// document.getElementById('KeyDown').innerHTML =  
			// 'myKeyDown() digit 3 key. Run Mode 3: RUN!';      // print on webpage,
			// console.log("Run Mode 3: RUN!");                  // print on console.
      break;
    case "KeyB":                // Toggle floor-bounce constraint type
			if(g_partA.bounceType==0) g_partA.bounceType = 1;   // impulsive vs simple
			else g_partA.bounceType = 0;
			// document.getElementById('KeyDown').innerHTML =  
			// 'myKeyDown() b/B key: toggle bounce mode.';	      // print on webpage,
			// console.log("b/B key: toggle bounce mode.");      // print on console. 
      break;
    case "KeyC":                // Toggle screen-clearing to show 'trails'
			g_isClear += 1;
			if(g_isClear > 1) g_isClear = 0;
			// document.getElementById('KeyDown').innerHTML =  
			// 'myKeyDown() c/C key: toggle screen clear.';	 // print on webpage,
			// console.log("c/C: toggle screen-clear g_isClear:",g_isClear); // print on console,
      break;
    case "KeyD":      // 'd'  INCREASE drag loss; 'D' to DECREASE drag loss
      if(kev.shiftKey==false) g_partA.drag *= 0.995; // permit less movement.
      else {
        g_partA.drag *= 1.0 / 0.995;
        if(g_partA.drag > 1.0) g_partA.drag = 1.0;  // don't let drag ADD energy!
        }
		// document.getElementById('KeyDown').innerHTML =  
		// 'myKeyDown() d/D key: grow/shrink drag.';	 // print on webpage,
	  // console.log("d/D: grow/shrink drag:", g_partA.drag); // print on console,
      break;
    case "KeyF":    // 'f' or 'F' to toggle particle fountain on/off
      g_partA.isFountain += 1;
      if(g_partA.isFountain > 1) g_partA.isFountain = 0;
	  // document.getElementById('KeyDown').innerHTML =  
	  // "myKeyDown() f/F key: toggle age constraint (fountain).";	// print on webpage,
		// 	console.log("F: toggle age constraint (fountain)."); // print on console,
      break;
    case "KeyG":    // 'g' to REDUCE gravity; 'G' to increase.
      if(kev.shiftKey==false) 		g_partA.grav *= 0.99;		// shrink 1%
      else                        g_partA.grav *= 1.0/0.98; // grow 2%
	  // document.getElementById('KeyDown').innerHTML =  
	  // 'myKeyDown() g/G key: shrink/grow gravity.';	 			// print on webpage,
	  // console.log("g/G: shrink/grow gravity:", g_partA.grav); 	// print on console,
      break;
    case "KeyM":    // 'm' to REDUCE mass; 'M' to increase.
      if(kev.shiftKey==false)     g_partA.mass *= 0.98;   // shrink 2%
      else                        g_partA.mass *= 1.0/0.98; // grow 2%  
	  // document.getElementById('KeyDown').innerHTML =  
	  // 'myKeyDown() m/M key: shrink/grow mass.';	 				      // print on webpage,
	  // // console.log("m/M: shrink/grow mass:", g_partA.mass); 		// print on console,
      break;
	case "KeyP":
	  if(g_partA.runMode == 3) g_partA.runMode = 1;		// if running, pause
						  else g_partA.runMode = 3;		          // if paused, run.
	  // document.getElementById('KeyDown').innerHTML =  
		// 	  'myKeyDown() p/P key: toggle Pause/unPause!';    // print on webpage
	  // console.log("p/P key: toggle Pause/unPause!");   			// print on console,
			break;
    case "KeyR":    // r/R for RESET: 
      if(kev.shiftKey==false) {   // 'r' key: SOFT reset; boost velocity only
  		  g_partA.runMode = 3;  // RUN!
        var j=0; // array index for particle i
        for(var i = 0; i < g_partA.partCount; i += 1, j+= PART_MAXVAR) {
          g_partA.roundRand();  // make a spherical random var.
    			if(  g_partA.s2[j + PART_XVEL] > 0.0) // ADD to positive velocity, and 
    			     g_partA.s2[j + PART_XVEL] += 1.7 + 0.4*g_partA.randX*g_partA.INIT_VEL;
    			                                      // SUBTRACT from negative velocity: 
    			else g_partA.s2[j + PART_XVEL] -= 1.7 + 0.4*g_partA.randX*g_partA.INIT_VEL; 

    			if(  g_partA.s2[j + PART_YVEL] > 0.0) 
    			     g_partA.s2[j + PART_YVEL] += 1.7 + 0.4*g_partA.randY*g_partA.INIT_VEL; 
    			else g_partA.s2[j + PART_YVEL] -= 1.7 + 0.4*g_partA.randY*g_partA.INIT_VEL;

    			if(  g_partA.s2[j + PART_ZVEL] > 0.0) 
    			     g_partA.s2[j + PART_ZVEL] += 1.7 + 0.4*g_partA.randZ*g_partA.INIT_VEL; 
    			else g_partA.s2[j + PART_ZVEL] -= 1.7 + 0.4*g_partA.randZ*g_partA.INIT_VEL;
    			}
      }
      else {      // HARD reset: position AND velocity, BOTH state vectors:
  		  g_partA.runMode = 0;			// RESET!
        // Reset state vector s1 for ALL particles:
        var j=0; // array index for particle i
        for(var i = 0; i < g_partA.partCount; i += 1, j+= PART_MAXVAR) {
              g_partA.roundRand();
        			g_partA.s2[j + PART_XPOS] =  -0.9;      // lower-left corner of CVV
        			g_partA.s2[j + PART_YPOS] =  -0.9;      // with a 0.1 margin
        			g_partA.s2[j + PART_ZPOS] =  0.0;	
        			g_partA.s2[j + PART_XVEL] =  3.7 + 0.4*g_partA.randX*g_partA.INIT_VEL;	
        			g_partA.s2[j + PART_YVEL] =  3.7 + 0.4*g_partA.randY*g_partA.INIT_VEL; // initial velocity in meters/sec.
              g_partA.s2[j + PART_ZVEL] =  3.7 + 0.4*g_partA.randZ*g_partA.INIT_VEL;
              // do state-vector s2 as well: just copy all elements of the float32array.
              g_partA.s2.set(g_partA.s1);
        } // end for loop
      } // end HARD reset
	  // document.getElementById('KeyDown').innerHTML =  
	  // 'myKeyDown() r/R key: soft/hard Reset.';	// print on webpage,
	  // console.log("r/R: soft/hard Reset");      // print on console,
      break;
		case "KeyS":
			// if(g_partA.solvType == SOLV_EULER) g_partA.solvType = SOLV_OLDGOOD;  
			// else g_partA.solvType = SOLV_EULER;     
			// document.getElementById('KeyDown').innerHTML =  
			// 'myKeyDown() found s/S key. Switch solvers!';       // print on webpage.
		  // console.log("s/S: Change Solver:", g_partA.solvType); // print on console.
			break;
		case "Space":
      g_partA.runMode = 2;
	  // document.getElementById('KeyDown').innerHTML =  
	  // 'myKeyDown() found Space key. Single-step!';   // print on webpage,
    //   console.log("SPACE bar: Single-step!");        // print on console.
      break;
		case "ArrowLeft": 	
			// and print on webpage in the <div> element with id='Result':
  		// document.getElementById('KeyDown').innerHTML =
  		// 	'myKeyDown(): Arrow-Left,keyCode='+kev.keyCode;
			// console.log("Arrow-Left key(UNUSED)");
  		break;
		case "ArrowRight":
  		// document.getElementById('KeyDown').innerHTML =
  		// 	'myKeyDown(): Arrow-Right,keyCode='+kev.keyCode;
  		// console.log("Arrow-Right key(UNUSED)");
  		break;
		case "ArrowUp":		
  		// document.getElementById('KeyDown').innerHTML =
  		// 	'myKeyDown(): Arrow-Up,keyCode='+kev.keyCode;
  		// console.log("Arrow-Up key(UNUSED)");
			break;
		case "ArrowDown":
  		// document.getElementById('KeyDown').innerHTML =
  		// 	'myKeyDown(): Arrow-Down,keyCode='+kev.keyCode;
  		// 	console.log("Arrow-Down key(UNUSED)");
  		break;	
    default:
  		// document.getElementById('KeyDown').innerHTML =
  		// 	'myKeyDown():UNUSED,keyCode='+kev.keyCode;
  		// console.log("UNUSED key:", kev.keyCode);
      break;
  }
}

// function printControls() {
// //==============================================================================
// // Print current state of the particle system on the webpage:
// 	var recipTime = 1000.0 / g_timeStep;			// to report fractional seconds
// 	var recipMin  = 1000.0 / g_timeStepMin;
// 	var recipMax  = 1000.0 / g_timeStepMax;
// 	var solvTypeTxt;												// convert solver number to text:
// 	if(g_partA.solvType==SOLV_EULER) solvTypeTxt = 'Euler Solver--(unstable!)<br>';
// 	else 						solvTypeTxt = 'Naive Implicit--(stable)<br>';
// 	var bounceTypeTxt;											// convert bounce number to text
// 	if(g_partA.bounceType==0) bounceTypeTxt = 'Velocity Reverse(no rest)<br>';
// 	else 						bounceTypeTxt = 'Impulsive (will rest)<br>';
// 	var xvLimit = g_partA.s2[PART_XVEL];							// find absolute values of s2[PART_XVEL]
// 	if(g_partA.s2[PART_XVEL] < 0.0) xvLimit = -g_partA.s2[PART_XVEL];
// 	var yvLimit = g_partA.s2[PART_YVEL];							// find absolute values of s2[PART_YVEL]
// 	if(g_partA.s2[PART_YVEL] < 0.0) yvLimit = -g_partA.s2[PART_YVEL];

// 	document.getElementById('KeyResult1').innerHTML =
//    			'<b>Solver = </b>' + solvTypeTxt +
//    			'<b>Bounce = </b>' + bounceTypeTxt +
//    			'<b>drag = </b>' + g_partA.drag.toFixed(5) +
//    			', <b>grav = </b>' + g_partA.grav.toFixed(5) +
//    			' m/s^2; <b>yVel = +/-</b> ' + yvLimit.toFixed(5) +
//    			' m/s; <b>xVel = +/-</b> ' + xvLimit.toFixed(5) +
//    			' m/s;<br><b>timeStep = </b> 1/' + recipTime.toFixed(3) + ' sec' +
//    			                ' <b>min:</b> 1/' + recipMin.toFixed(3)  + ' sec' +
//    			                ' <b>max:</b> 1/' + recipMax.toFixed(3)  + ' sec<br>';
//    			' <b>stepCount: </b>' + g_stepCount.toFixed(3) ;
// }

function onPlusButton() {
  //==============================================================================
  g_partA.INIT_VEL *= 1.2; // increase
  console.log("Initial velocity: " + g_partA.INIT_VEL);
}

function onMinusButton() {
  //==============================================================================
  g_partA.INIT_VEL /= 1.2; // shrink
  console.log("Initial velocity: " + g_partA.INIT_VEL);
}

// thank you https://learnopengl.com/Getting-started/Camera
var g_Camera = new Vector3([9.0, 0.0, 2.0]);
var g_CameraFront = new Vector3([-1, 0, 0]);
var g_CameraUp = new Vector3([0, 0, 1.0]);

var g_Pitch = -1 * Math.PI;
g_Yaw = 0.0;
g_Roll = 0.0;
var g_CameraDirection = new Vector3([0, 0, 0]);

function moveCameraFront(positive) {
  var speed = 0.1;
  if (!positive) {
    speed = -speed;
  }

  g_Camera.elements[0] += g_CameraFront.elements[0] * speed;
  g_Camera.elements[1] += g_CameraFront.elements[1] * speed;
  // g_Camera.elements[2] += g_CameraFront.elements[2] * speed
}

function moveCameraRight(positive) {
  var speed = 0.1;
  if (!positive) {
    speed = -speed;
  }

  rightVector = new Vector3([
    g_CameraFront.elements[1],
    -g_CameraFront.elements[0],
    0,
  ]);
  rightVector.normalize();

  g_Camera.elements[0] += rightVector.elements[0] * speed;
  g_Camera.elements[1] += rightVector.elements[1] * speed;
  g_Camera.elements[2] += rightVector.elements[2] * speed;
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

  console.log(g_vpAspect);

  g_worldMat.setIdentity();
  g_worldMat.perspective(50.0, g_vpAspect, 1.0, 200.0);
  g_worldMat.lookAt(
    g_Camera.elements[0],
    g_Camera.elements[1],
    g_Camera.elements[2],
    g_Camera.elements[0] + g_CameraFront.elements[0],
    g_Camera.elements[1] + g_CameraFront.elements[1],
    g_Camera.elements[2] + g_CameraFront.elements[2],
    g_CameraUp.elements[0],
    g_CameraUp.elements[1],
    g_CameraUp.elements[2]
  );
}

document.addEventListener("keydown", (event) => {
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

document.addEventListener("keyup", (event) => {
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
