//=============================================================================
//=============================================================================

function gridVerts() {
  let xcount = 100;
  let ycount = 100;
  let xymax = 50.0;
  let xColr = new Float32Array([1.0, 0.8, 1.0]);
  let yColr = new Float32Array([0.8, 1.0, 1.0]);

  let g_mdl_grid = new Float32Array(7 * 2 * (xcount + ycount));

  let xgap = xymax / (xcount - 1);
  let ygap = xymax / (ycount - 1);

  for (v = 0, j = 0; v < 2 * xcount; v++, j += 7) {
    if (v % 2 == 0) {
      g_mdl_grid[j] = -xymax + v * xgap;
      g_mdl_grid[j + 1] = -xymax;
      g_mdl_grid[j + 2] = 0.0;
    } else {
      g_mdl_grid[j] = -xymax + (v - 1) * xgap;
      g_mdl_grid[j + 1] = xymax;
      g_mdl_grid[j + 2] = 0.0;
    }
    g_mdl_grid[j + 3] = 1.0;
    g_mdl_grid[j + 4] = xColr[0];
    g_mdl_grid[j + 5] = xColr[1];
    g_mdl_grid[j + 6] = xColr[2];
  }

  for (v = 0; v < 2 * ycount; v++, j += 7) {
    if (v % 2 == 0) {
      g_mdl_grid[j] = -xymax;
      g_mdl_grid[j + 1] = -xymax + v * ygap;
      g_mdl_grid[j + 2] = 0.0;
    } else {
      g_mdl_grid[j] = xymax;
      g_mdl_grid[j + 1] = -xymax + (v - 1) * ygap;
      g_mdl_grid[j + 2] = 0.0;
    }
    g_mdl_grid[j + 3] = 1.0;
    g_mdl_grid[j + 4] = yColr[0];
    g_mdl_grid[j + 5] = yColr[1];
    g_mdl_grid[j + 6] = yColr[2];
  }

  return g_mdl_grid;
}

///////////////////////////////////
// WORLD GRID
///////////////////////////////////

function WorldGrid() {
  //=============================================================================
  //=============================================================================
  // CONSTRUCTOR for one re-usable 'WorldGrid' object that holds all data and fcns
  // needed to render vertices from one Vertex Buffer Object (VBO) using one
  // separate shader program (a vertex-shader & fragment-shader pair) and one
  // set of 'uniform' variables.

  // Constructor goal:
  // Create and set member vars that will ELIMINATE ALL LITERALS (numerical values
  // written into code) in all other VBObox functions. Keeping all these (initial)
  // values here, in this one coonstrutor function, ensures we can change them
  // easily WITHOUT disrupting any other code, ever!

  this.VERT_SRC = //--------------------- VERTEX SHADER source code
    "precision highp float;\n" + // req'd in OpenGL ES if we use 'float'
    //
    "uniform mat4 u_ModelMat0;\n" +
    "uniform mat4 u_ViewMat0;\n" +
    "uniform mat4 u_ProjMat0;\n" +
    "attribute vec4 a_Pos0;\n" +
    "attribute vec3 a_Colr0;\n" +
    "varying vec3 v_Colr0;\n" +
    //
    "void main() {\n" +
    "  mat4 MVP = u_ProjMat0 * u_ViewMat0 * u_ModelMat0;\n" +
    "  gl_Position = MVP * a_Pos0;\n" +
    "	 v_Colr0 = a_Colr0;\n" +
    " }\n";

  this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code
    "precision mediump float;\n" +
    "varying vec3 v_Colr0;\n" +
    "void main() {\n" +
    "  gl_FragColor = vec4(v_Colr0, 1.0);\n" +
    "}\n";

  g_mdl_grid = gridVerts();
  this.vboContents = g_mdl_grid;

  this.vboVerts = g_mdl_grid.length / 7; // # of vertices held in 'vboContents' array
  this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
  // bytes req'd by 1 vboContents array element;
  // (why? used to compute stride and offset
  // in bytes for vertexAttribPointer() calls)
  this.vboBytes = this.vboContents.length * this.FSIZE;
  // total number of bytes stored in vboContents
  // (#  of floats in vboContents array) *
  // (# of bytes/float).
  this.vboStride = this.vboBytes / this.vboVerts;
  // (== # of bytes to store one complete vertex).
  // From any attrib in a given vertex in the VBO,
  // move forward by 'vboStride' bytes to arrive
  // at the same attrib for the next vertex.

  //----------------------Attribute sizes
  this.vboFcount_a_Pos0 = 4; // # of floats in the VBO needed to store the
  // attribute named a_Pos0. (4: x,y,z,w values)
  this.vboFcount_a_Colr0 = 3; // # of floats for this attrib (r,g,b values)
  console.assert(
    (this.vboFcount_a_Pos0 + // check the size of each and
      this.vboFcount_a_Colr0) * // every attribute in our VBO
      this.FSIZE ==
      this.vboStride, // for agreeement with'stride'
    "Uh oh! WorldGrid.vboStride disagrees with attribute-size values!"
  );

  //----------------------Attribute offsets
  this.vboOffset_a_Pos0 = 0; // # of bytes from START of vbo to the START
  // of 1st a_Pos0 attrib value in vboContents[]
  this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;
  // (4 floats * bytes/float)
  // # of bytes from START of vbo to the START
  // of 1st a_Colr0 attrib value in vboContents[]
  //-----------------------GPU memory locations:
  this.vboLoc; // GPU Location for Vertex Buffer Object,
  // returned by gl.createBuffer() function call
  this.shaderLoc; // GPU Location for compiled Shader-program
  // set by compile/link of VERT_SRC and FRAG_SRC.
  //------Attribute locations in our shaders:
  this.a_PosLoc; // GPU location for 'a_Pos0' attribute
  this.a_ColrLoc; // GPU location for 'a_Colr0' attribute

  //---------------------- Uniform locations &values in our shaders
  this.ModelMat = new Matrix4(); // Transforms CVV axes to model axes.
  this.u_ModelMatLoc; // GPU location for u_ModelMat uniform

  this.ViewMat = new Matrix4(); // Transforms World axes to CVV axes.
  this.u_ViewMatLoc; // GPU location for u_ViewMat uniform

  this.ProjMat = new Matrix4(); // Transforms CVV axes to clip axes.
  this.u_ProjMatLoc; // GPU location for u_ProjMat uniform
}

WorldGrid.prototype.init = function () {
  //=============================================================================
  // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms
  // kept in this VBObox. (This function usually called only once, within main()).
  // Specifically:
  // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an
  //  executable 'program' stored and ready to use inside the GPU.
  // b) create a new VBO object in GPU memory and fill it by transferring in all
  //  the vertex data held in our Float32array member 'VBOcontents'.
  // c) Find & save the GPU location of all our shaders' attribute-variables and
  //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
  // -------------------
  // CAREFUL!  before you can draw pictures using this VBObox contents,
  //  you must call this VBObox object's switchToMe() function too!
  //--------------------
  // a) Compile,link,upload shaders-----------------------------------------------
  this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
  if (!this.shaderLoc) {
    console.log(
      this.constructor.name +
        ".init() failed to create executable Shaders on the GPU. Bye!"
    );
    return;
  }
  // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
  //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}

  gl.program = this.shaderLoc; // (to match cuon-utils.js -- initShaders())

  // b) Create VBO on GPU, fill it------------------------------------------------
  this.vboLoc = gl.createBuffer();
  if (!this.vboLoc) {
    console.log(
      this.constructor.name + ".init() failed to create VBO in GPU. Bye!"
    );
    return;
  }
  // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
  //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes
  // (positions, colors, normals, etc), or
  //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values
  // that each select one vertex from a vertex array stored in another VBO.
  gl.bindBuffer(
    gl.ARRAY_BUFFER, // GLenum 'target' for this GPU buffer
    this.vboLoc
  ); // the ID# the GPU uses for this buffer.

  // Fill the GPU's newly-created VBO object with the vertex data we stored in
  //  our 'vboContents' member (JavaScript Float32Array object).
  //  (Recall gl.bufferData() will evoke GPU's memory allocation & management:
  //    use gl.bufferSubData() to modify VBO contents without changing VBO size)
  gl.bufferData(
    gl.ARRAY_BUFFER, // GLenum target(same as 'bindBuffer()')
    this.vboContents, // JavaScript Float32Array
    gl.STATIC_DRAW
  ); // Usage hint.
  //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
  //	(see OpenGL ES specification for more info).  Your choices are:
  //		--STATIC_DRAW is for vertex buffers rendered many times, but whose
  //				contents rarely or never change.
  //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose
  //				contents may change often as our program runs.
  //		--STREAM_DRAW is for vertex buffers that are rendered a small number of
  // 			times and then discarded; for rapidly supplied & consumed VBOs.

  // c1) Find All Attributes:---------------------------------------------------
  //  Find & save the GPU location of all our shaders' attribute-variables and
  //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
  this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, "a_Pos0");
  if (this.a_PosLoc < 0) {
    console.log(
      this.constructor.name +
        ".init() Failed to get GPU location of attribute a_Pos0"
    );
    return -1; // error exit.
  }
  this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, "a_Colr0");
  if (this.a_ColrLoc < 0) {
    console.log(
      this.constructor.name +
        ".init() failed to get the GPU location of attribute a_Colr0"
    );
    return -1; // error exit.
  }
  // c2) Find All Uniforms:-----------------------------------------------------
  //Get GPU storage location for each uniform var used in our shader programs:
  this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, "u_ModelMat0");
  if (!this.u_ModelMatLoc) {
    console.log(
      this.constructor.name +
        ".init() failed to get GPU location for u_ModelMat1 uniform"
    );
    return;
  }

  this.u_ViewMatLoc = gl.getUniformLocation(this.shaderLoc, "u_ViewMat0");
  if (!this.u_ViewMatLoc) {
    console.log(
      this.constructor.name +
        ".init() failed to get the GPU location of u_ViewMat0 uniform"
    );
    return;
  }

  this.u_ProjMatLoc = gl.getUniformLocation(this.shaderLoc, "u_ProjMat0");
  if (!this.u_ProjMatLoc) {
    console.log(
      this.constructor.name +
        ".init() failed to get the GPU location of u_ProjMat0 uniform"
    );
    return;
  }
};

WorldGrid.prototype.switchToMe = function () {
  //==============================================================================
  // Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
  //
  // We only do this AFTER we called the init() function, which does the one-time-
  // only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
  // even then, you are STILL not ready to draw our VBObox's contents onscreen!
  // We must also first complete these steps:
  //  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
  //  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
  //  c) tell the GPU to connect the shader program's attributes to that VBO.

  // a) select our shader program:
  gl.useProgram(this.shaderLoc);
  //		Each call to useProgram() selects a shader program from the GPU memory,
  // but that's all -- it does nothing else!  Any previously used shader program's
  // connections to attributes and uniforms are now invalid, and thus we must now
  // establish new connections between our shader program's attributes and the VBO
  // we wish to use.

  // b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
  //  instead connect to our own already-created-&-filled VBO.  This new VBO can
  //    supply values to use as attributes in our newly-selected shader program:
  gl.bindBuffer(
    gl.ARRAY_BUFFER, // GLenum 'target' for this GPU buffer
    this.vboLoc
  ); // the ID# the GPU uses for our VBO.

  // c) connect our newly-bound VBO to supply attribute variable values for each
  // vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
  // this sets up data paths from VBO to our shader units:
  // 	Here's how to use the almost-identical OpenGL version of this function:
  //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
  gl.vertexAttribPointer(
    this.a_PosLoc, //index == ID# for the attribute var in your GLSL shader pgm;
    this.vboFcount_a_Pos0, // # of floats used by this attribute: 1,2,3 or 4?
    gl.FLOAT, // type == what data type did we use for those numbers?
    false, // isNormalized == are these fixed-point values that we need
    //									normalize before use? true or false
    this.vboStride, // Stride == #bytes we must skip in the VBO to move from the
    // stored attrib for this vertex to the same stored attrib
    //  for the next vertex in our VBO.  This is usually the
    // number of bytes used to store one complete vertex.  If set
    // to zero, the GPU gets attribute values sequentially from
    // VBO, starting at 'Offset'.
    // (Our vertex size in bytes: 4 floats for pos + 3 for color)
    this.vboOffset_a_Pos0
  );
  // Offset == how many bytes from START of buffer to the first
  // value we will actually use?  (We start with position).
  gl.vertexAttribPointer(
    this.a_ColrLoc,
    this.vboFcount_a_Colr0,
    gl.FLOAT,
    false,
    this.vboStride,
    this.vboOffset_a_Colr0
  );

  // --Enable this assignment of each of these attributes to its' VBO source:
  gl.enableVertexAttribArray(this.a_PosLoc);
  gl.enableVertexAttribArray(this.a_ColrLoc);
};

WorldGrid.prototype.isReady = function () {
  //==============================================================================
  // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
  // this objects VBO and shader program; else return false.
  // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter

  var isOK = true;

  if (gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc) {
    console.log(
      this.constructor.name +
        ".isReady() false: shader program at this.shaderLoc not in use!"
    );
    isOK = false;
  }
  if (gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
    console.log(
      this.constructor.name + ".isReady() false: vbo at this.vboLoc not in use!"
    );
    isOK = false;
  }
  return isOK;
};

WorldGrid.prototype.adjust = function () {
  //==============================================================================
  // Update the GPU to newer, current values we now store for 'uniform' vars on
  // the GPU; and (if needed) update each attribute's stride and offset in VBO.

  // check: was WebGL context set to use our VBO & shader program?
  if (this.isReady() == false) {
    console.log(
      "ERROR! before" +
        this.constructor.name +
        ".adjust() call you needed to call this.switchToMe()!!"
    );
  }
  // this.ModelMat.setPerspective(30, 1, 1, 100);
  this.ModelMat.setIdentity();
  this.ModelMat.set(g_worldMat);
  // this.ProjMat.setPerspective(30, g_vpAspect, 1, 100);
  // this.ViewMat.setLookAt(g_Camera.elements[0], g_Camera.elements[1], g_Camera.elements[2],
  //   g_Camera.elements[0] + g_CameraFront.elements[0], g_Camera.elements[1] + g_CameraFront.elements[1], g_Camera.elements[2] + g_CameraFront.elements[2],
  //   g_CameraUp.elements[0], g_CameraUp.elements[1], g_CameraUp.elements[2]);
  // this.MVP.set(this.ProjMat).multiply(this.ViewMat).multiply(this.ModelMat);

  gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);
  gl.uniformMatrix4fv(this.u_ViewMatLoc, false, this.ViewMat.elements);
  gl.uniformMatrix4fv(this.u_ProjMatLoc, false, this.ProjMat.elements);
};

WorldGrid.prototype.draw = function () {
  //=============================================================================
  // Render current VBObox contents.

  // check: was WebGL context set to use our VBO & shader program?
  if (this.isReady() == false) {
    console.log(
      "ERROR! before" +
        this.constructor.name +
        ".draw() call you needed to call this.switchToMe()!!"
    );
  }
  // ----------------------------Draw the contents of the currently-bound VBO:
  gl.drawArrays(
    gl.LINES, // select the drawing primitive to draw,
    // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP,
    //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
    0, // location of 1st vertex to draw;
    this.vboVerts
  ); // number of vertices to draw on-screen.
};

WorldGrid.prototype.reload = function () {
  //=============================================================================
  // Over-write current values in the GPU inside our already-created VBO: use
  // gl.bufferSubData() call to re-transfer some or all of our Float32Array
  // contents to our VBO without changing any GPU memory allocations.

  gl.bufferSubData(
    gl.ARRAY_BUFFER, // GLenum target(same as 'bindBuffer()')
    0, // byte offset to where data replacement
    // begins in the VBO.
    this.vboContents
  ); // the JS source-data array used to fill VBO
};

///////////////////////////////////
// PARTICLE SYSTEM
///////////////////////////////////

const PART_XPOS = 0; //  position
const PART_YPOS = 1;
const PART_ZPOS = 2;
const PART_WPOS = 3; // (why include w? for matrix transforms;
// for vector/point distinction
const PART_XVEL = 4; //  velocity -- ALWAYS a vector: x,y,z; no w. (w==0)
const PART_YVEL = 5;
const PART_ZVEL = 6;
const PART_X_FTOT = 7; // force accumulator:'ApplyForces()' fcn clears
const PART_Y_FTOT = 8; // to zero, then adds each force to each particle.
const PART_Z_FTOT = 9;
const PART_R = 10; // color : red,green,blue, alpha (opacity); 0<=RGBA<=1.0
const PART_G = 11;
const PART_B = 12;
const PART_MASS = 13; // mass
const PART_DIAM = 14; // on-screen diameter (in pixels)
const PART_RENDMODE = 15; // on-screen appearance (square, round, or soft-round)
/* // Other useful particle values, currently unused
const PART_AGE      =16;  // # of frame-times since creation/initialization
const PART_CHARGE   =17;  // for electrostatic repulsion/attraction
const PART_MASS_VEL =18;  // time-rate-of-change of mass.
const PART_MASS_FTOT=19;  // force-accumulator for mass-change
const PART_R_VEL    =20;  // time-rate-of-change of color:red
const PART_G_VEL    =21;  // time-rate-of-change of color:grn
const PART_B_VEL    =22;  // time-rate-of-change of color:blu
const PART_R_FTOT   =23;  // force-accumulator for color-change: red
const PART_G_FTOT   =24;  // force-accumulator for color-change: grn
const PART_B_FTOT   =25;  // force-accumulator for color-change: blu
*/
const PART_MAXVAR = 16; // Size of array in CPart uses to store its values.

// Array-Name consts that select PartSys objects' numerical-integration solver:
//------------------------------------------------------------------------------
// EXPLICIT methods: GOOD!
//    ++ simple, easy to understand, fast, but
//    -- Requires tiny time-steps for stable stiff systems, because
//    -- Errors tend to 'add energy' to any dynamical system, driving
//        many systems to instability even with small time-steps.
const SOLV_NAIVE = 0; // limited implicit method done 'wrong' in
// from Bouncy03GOOD version. DON'T USE!
const SOLV_EULER = 1; // Euler integration: forward,explicit,...

const SOLV_MIDPOINT = 2; // Midpoint Method (see Pixar Tutorial)
const SOLV_ADAMS_BASH = 3; // Adams-Bashforth Explicit Integrator
const SOLV_RUNGEKUTTA = 4; // Arbitrary degree, set by 'solvDegree'

// IMPLICIT methods:  BETTER!
//          ++Permits larger time-steps for stiff systems, but
//          --More complicated, slower, less intuitively obvious,
//          ++Errors tend to 'remove energy' (ghost friction; 'damping') that
//              aids stability even for large time-steps.
//          --requires root-finding (iterative: often no analytical soln exists)
const SOLV_BACK_EULER = 5; // 'Backwind' or Implicit Euler
const SOLV_BACK_MIDPT = 6; // 'Backwind' or Implicit Midpoint
const SOLV_BACK_ADBASH = 7; // 'Backwind' or Implicit Adams-Bashforth
// OR SEMI-IMPLICIT METHODS: BEST?
//          --Permits larger time-steps for stiff systems,
//          ++Simpler, easier-to-understand than Implicit methods
//          ++Errors tend to remove energy) (ghost friction; 'damping') that
//              aids stability even for large time-steps.
//          ++ DOES NOT require the root-finding of implicit methods,
const SOLV_VERLET = 8; // Verlet semi-implicit integrator;
const SOLV_VEL_VERLET = 9; // 'Velocity-Verlet'semi-implicit integrator
const SOLV_LEAPFROG = 10; // 'Leapfrog' integrator
const SOLV_MAX = 11; // number of solver types available.

const NU_EPSILON = 10e-15; // tiny amount; a minimum vector length
// to use to avoid 'divide-by-zero'

//=============================================================================
//=============================================================================
function PartSys() {
  this.VERT_SRC = 
  `precision mediump float;							// req'd in OpenGL ES if we use 'float'
  //
  uniform   int u_runMode;							// particle system state: 
  																			// 0=reset; 1= pause; 2=step; 3=run
  uniform	 vec4 u_ballShift;						// single bouncy-ball's movement
  uniform mat4 u_ModelMat;
  uniform mat4 u_ViewMat;
  uniform mat4 u_ProjMat;
  attribute vec4 a_Position;
  varying   vec4 v_Color; 
  void main() {
    gl_PointSize = 20.0;
    mat4 MVP = u_ProjMat * u_ViewMat * u_ModelMat;
    gl_Position = MVP * a_Position + u_ballShift;
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

  this.FRAG_SRC =
  `precision mediump float;
   varying vec4 v_Color; 
   void main() { 
     float dist = distance(gl_PointCoord, vec2(0.5, 0.5)); 
     if(dist < 0.5) { 
       gl_FragColor = vec4((1.0-2.0*dist)*v_Color.rgb, 1.0); 
     } else { discard; } 
   }`;
  //==============================================================================
  //=============================================================================
  // Constructor for a new particle system;

  this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
  this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform

  this.ViewMat = new Matrix4();	// Transforms World axes to CVV axes.
  this.u_ViewMatLoc;							// GPU location for u_ViewMat uniform

  this.ProjMat = new Matrix4();	// Transforms CVV axes to clip axes.
  this.u_ProjMatLoc;							// GPU location for u_ProjMat uniform
}

// INIT FUNCTIONS:
//==================
// Each 'init' function initializes everything in our particle system. Each
// creates all necessary state variables, force-applying objects,
// constraint-applying objects, solvers and all other values needed to prepare
// the particle-system to run without any further adjustments.

PartSys.prototype.init = function () {
  this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
  if (!this.shaderLoc) {
    console.log(
      this.constructor.name +
        ".init() failed to create executable Shaders on the GPU. Bye!"
    );
    return;
  }

  this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, "u_ModelMat");
  this.u_ViewMatLoc = gl.getUniformLocation(this.shaderLoc, "u_ViewMat");
  this.u_ProjMatLoc = gl.getUniformLocation(this.shaderLoc, "u_ProjMat");

  gl.program = this.shaderLoc; // (to match cuon-utils.js -- initShaders())

  this.initBouncy3D(3);
};

PartSys.prototype.switchToMe = function () {
  gl.useProgram(this.shaderLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);

  gl.vertexAttribPointer(
    this.a_PositionID,
    4,
    gl.FLOAT,
    false,
    PART_MAXVAR * this.FSIZE,
    PART_XPOS * this.FSIZE
  );
  gl.enableVertexAttribArray(this.a_PositionID);

  // gl.uniform1i(this.u_runModeID, 5);
}

PartSys.prototype.adjust = function () {
  this.ModelMat.setIdentity();
  this.ModelMat.set(g_worldMat);

  gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);
  gl.uniformMatrix4fv(this.u_ViewMatLoc, false, this.ViewMat.elements);
  gl.uniformMatrix4fv(this.u_ProjMatLoc, false, this.ProjMat.elements);
}

PartSys.prototype.initBouncy2D = function (count) {

};

PartSys.prototype.initBouncy3D = function (count) {
  //==============================================================================
    //==============================================================================
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    // NOTE: Float32Array objects are zero-filled by default.
    this.INIT_VEL = 0.15 * 60.0; // initial velocity in meters/sec.
    // adjust by ++Start, --Start buttons. Original value
    // was 0.15 meters per timestep; multiply by 60 to get
    // meters per second.
    this.drag = 0.985; // units-free air-drag (scales velocity); adjust by d/D keys
    this.grav = 9.832; // gravity's acceleration; adjust by g/G keys
    // on Earth surface: 9.832 meters/sec^2.
    this.resti = 1.0; // units-free 'Coefficient of restitution' for
    // inelastic collisions.  Sets the fraction of momentum
    // (0.0 <= resti < 1.0) that remains after a ball
    // 'bounces' on a wall or floor, as computed using
    // velocity perpendicular to the surface.
    // (Recall: momentum==mass*velocity.  If ball mass does
    // not change, and the ball bounces off the x==0 wall,
    // its x velocity xvel will change to -xvel * resti ).
    //--------------------------Particle System Controls:
    this.runMode = 2; // particle system state: 0=reset; 1= pause; 2=step; 3=run
    this.solvType = SOLV_NAIVE; // adjust by s/S keys: see SOLV_XXX consts above.
    this.bounceType = 1; // floor-bounce constraint type:
    // ==0 for velocity-reversal, as in all previous versions
    // ==1 for Chapter 3's collision resolution method, which
    // uses an 'impulse' to cancel any velocity boost caused
    // by falling below the floor.
  
    //--------------------------------Create & fill VBO with state var s1 contents:
    // INITIALIZE s1, s2:
    //  NOTE: s1,s2 are a Float32Array objects, zero-filled by default.
    // That's OK for most particle parameters, but these need non-zero defaults:
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
      this.s1[j + PART_XPOS] = -0.9 + 0.6 * i; // lower-left corner of CVV
      this.s1[j + PART_YPOS] = -0.9; // with a 0.1 margin
      this.s1[j + PART_ZPOS] = 0.0;
      this.s1[j + PART_WPOS] = 1.0; // position 'w' coordinate;
      this.s1[j + PART_XVEL] = 0.0; //this.INIT_VEL;
      this.s1[j + PART_YVEL] = 0.0; //this.INIT_VEL;
      this.s1[j + PART_ZVEL] = 0.0;
      this.s1[j + PART_MASS] = 1.0; // mass, in kg.
      this.s1[j + PART_DIAM] = 9.0; // on-screen diameter, in pixels
      this.s1[j + PART_RENDMODE] = 0.0;
      //----------------------------
      this.s2[j + PART_XPOS] = -0.9 + 0.6 * i; // lower-left corner of CVV
      this.s2[j + PART_YPOS] = -0.9; // with a 0.1 margin
      this.s2[j + PART_ZPOS] = 0.0;
      this.s2[j + PART_WPOS] = 1.0; // position 'w' coordinate;
  
      this.s2[j + PART_XVEL] = 0.0; //this.INIT_VEL;
      this.s2[j + PART_YVEL] = 0.0; //this.INIT_VEL;
      this.s2[j + PART_ZVEL] = 0.0;
      this.s2[j + PART_MASS] = 1.0; // mass, in kg.
      this.s2[j + PART_DIAM] = 9.0; // on-screen diameter, in pixels
      this.s2[j + PART_RENDMODE] = 0.0;
    }
  
    this.FSIZE = this.s1.BYTES_PER_ELEMENT; // 'float' size, in bytes.
    // Create a vertex buffer object (VBO) in the graphics hardware: get its ID#
    this.vboID = gl.createBuffer();
    if (!this.vboID) {
      console.log("PartSys.init() Failed to create the VBO object in the GPU");
      return -1;
    }
    // "Bind the new buffer object (memory in the graphics system) to target"
    // In other words, specify the usage of one selected buffer object.
    // What's a "Target"? it's the poorly-chosen OpenGL/WebGL name for the
    // intended use of this buffer's memory; so far, we have just two choices:
    //	== "gl.ARRAY_BUFFER" meaning the buffer object holds actual values we
    //      need for rendering (positions, colors, normals, etc), or
    //	== "gl.ELEMENT_ARRAY_BUFFER" meaning the buffer object holds indices
    // 			into a list of values we need; indices such as object #s, face #s,
    //			edge vertex #s.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);
  
    // Write data from our JavaScript array to graphics systems' buffer object:
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);
  
    // why 'DYNAMIC_DRAW'? Because we change VBO's content with bufferSubData() later
    // ---------Set up all attributes for VBO contents:
    //Get the ID# for the a_Position variable in the graphics hardware
    this.a_PositionID = gl.getAttribLocation(gl.program, "a_Position");
    if (this.a_PositionID < 0) {
      console.log(
        "PartSys.init() Failed to get the storage location of a_Position"
      );
      return -1;
    }
    // Tell GLSL to fill the 'a_Position' attribute variable for each shader
    // with values from the buffer object chosen by 'gl.bindBuffer()' command.
    // websearch yields OpenGL version:
    //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
    gl.vertexAttribPointer(
      this.a_PositionID,
      4, // # of values in this attrib (1,2,3,4)
      gl.FLOAT, // data type (usually gl.FLOAT)
      false, // use integer normalizing? (usually false)
      PART_MAXVAR * this.FSIZE, // Stride: #bytes from 1st stored value to next one
      PART_XPOS * this.FSIZE
    ); // Offset; #bytes from start of buffer to
    // 1st stored attrib value we will actually use.
    // Enable this assignment of the bound buffer to the a_Position variable:
    gl.enableVertexAttribArray(this.a_PositionID);
  
    // ---------Set up all uniforms we send to the GPU:
    // Get graphics system storage location of each uniform our shaders use:
    // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
    this.u_runModeID = gl.getUniformLocation(gl.program, "u_runMode");
    if (!this.u_runModeID) {
      console.log("PartSys.init() Failed to get u_runMode variable location");
      return;
    }
    // Set the initial values of all uniforms on GPU: (runMode set by keyboard callbacks)
    // gl.uniform1i(this.u_runModeID, this.runMode);
};

PartSys.prototype.initFireReeves = function (count) {
  //==============================================================================
  console.log("PartSys.initFireReeves() stub not finished!");
};

PartSys.prototype.initTornado = function (count) {
  //==============================================================================
  console.log("PartSys.initTornado() stub not finished!");
};
PartSys.prototype.initFlocking = function (count) {
  //==============================================================================
  console.log("PartSys.initFlocking() stub not finished!");
};
PartSys.prototype.initSpringPair = function () {
  //==============================================================================
  console.log("PartSys.initSpringPair() stub not finished!");
};
PartSys.prototype.initSpringRope = function (count) {
  //==============================================================================
  console.log("PartSys.initSpringRope() stub not finished!");
};
PartSys.prototype.initSpringCloth = function (xSiz, ySiz) {
  //==============================================================================
  console.log("PartSys.initSpringCloth() stub not finished!");
};
PartSys.prototype.initSpringSolid = function () {
  //==============================================================================
  console.log("PartSys.initSpringSolid() stub not finished!");
};
PartSys.prototype.initOrbits = function () {
  //==============================================================================
  console.log("PartSys.initOrbits() stub not finished!");
};

PartSys.prototype.applyForces = function (s, fSet) {
  //==============================================================================
  // Clear the force-accumulator vector for each particle in state-vector 's',
  // then apply each force described in the collection of force-applying objects
  // found in 'fSet'.
  // (this function will simplify our too-complicated 'draw()' function)
};

PartSys.prototype.dotFinder = function (src, dest) {
  //==============================================================================
  // fill the already-existing 'dest' variable (a float32array) with the
  // time-derivative of given state 'src'.
};

PartSys.prototype.render = function (s) {
  //==============================================================================
  // Draw the contents of state-vector 's' on-screen. To do this:
  //  a) transfer its contents to the already-existing VBO in the GPU using the
  //      WebGL call 'gl.bufferSubData()', then
  //  b) set all the 'uniform' values needed by our shaders,
  //  c) draw VBO contents using gl.drawArray().

  gl.bufferSubData(
    gl.ARRAY_BUFFER, // specify the 'binding target': either
    //    gl.ARRAY_BUFFER (VBO holding sets of vertex attribs)
    // or gl.ELEMENT_ARRAY_BUFFER (VBO holding vertex-index values)
    0, // offset: # of bytes to skip at the start of the VBO before
    // we begin data replacement.
    this.s1
  ); // Float32Array data source.

  gl.uniform1i(this.u_runModeID, this.runMode); // run/step/pause the particle system
  // CHANGE our VBO's contents:
  // Draw our VBO's new contents:
  gl.drawArrays(
    gl.POINTS, // mode: WebGL drawing primitive to use
    0, // index: start at this vertex in the VBO;
    this.partCount
  ); // draw this many vertices.
  gl.drawArrays(
    gl.LINE_LOOP, // mode: WebGL drawing primitive to use
    0, // index: start at this vertex in the VBO;
    this.partCount
  ); // draw this many vertices.
};

PartSys.prototype.solver = function () {
  //==============================================================================
  // Find next state s2 from current state s1 (and perhaps some related states
  // such as s1dot, sM, sMdot, etc.) by the numerical integration method chosen
  // by PartSys.solvType.

  switch (this.solvType) {
    case SOLV_EULER: //-------------------------------------------------------
      // EXPLICIT or 'forward time' solver, as found in bouncyBall03.01BAD and
      // bouncyBall04.01badMKS.  CAREFUL! this solver adds energy -- not stable
      // for many particle system settings!
      // This solver looks quite sensible and logical.  Formally, it's an
      //	explicit or 'forward-time' solver known as the Euler method:
      //			Use the current velocity ('s1dot') to move forward by
      //			one timestep: s2 = s1 + s1dot*h, and
      //		-- Compute the new velocity (e.g. s2dot) too: apply gravity & drag.
      //		-- Then apply constraints: check to see if new position (s2)
      //			is outside our floor, ceiling, or walls, and if new velocity
      //			will move us further in the wrong direction. If so, reverse it!
      // CAREFUL! must convert g_timeStep from milliseconds to seconds!
      //------------------
      // Compute new position from current position, current velocity, & timestep
      this.s2[PART_XPOS] =
        this.s1[PART_XPOS] + this.s1[PART_XVEL] * (g_timeStep * 0.001);
      this.s2[PART_YPOS] =
        this.s1[PART_YPOS] + this.s1[PART_YVEL] * (g_timeStep * 0.001);
      this.s2[PART_ZPOS] =
        this.s1[PART_ZPOS] + this.s1[PART_ZVEL] * (g_timeStep * 0.001);
      // -- apply acceleration due to gravity to current velocity:
      // 	s2[PART_YVEL] = s1[PART_YVEL] - (accel. due to gravity)*(timestep in seconds)
      //									"       "     - (9.832 meters/sec^2) * (g_timeStep/1000.0);
      this.s2[PART_XVEL] = this.s1[PART_XVEL]; // (apply ONLY to y direction)
      this.s2[PART_YVEL] = this.s1[PART_YVEL]
      this.s2[PART_ZVEL] =
        this.s1[PART_ZVEL] - this.grav * (g_timeStep * 0.001);
      // -- apply drag: attenuate current velocity:
      this.s2[PART_XVEL] *= this.drag;
      this.s2[PART_YVEL] *= this.drag;
      this.s2[PART_ZVEL] *= this.drag;
      // We're done!
      //		**BUT***  IT DOESN"T WORK!?!? WHY DOES THE BALL NEVER STOP?
      //	Multiple answers:
      //	1a) Note how easily we can confuse these two cases (bouncyball03 vs
      //		bouncyball03.01) unless we're extremely careful; one seemingly
      //		trivial mod to version 03 radically changes bouncyball behavior!
      //		State-variable formulation prevents these confusions by strict
      //		separation of all parameters of the current state (s1) and the next
      //		state (s2), with an unambiguous 'step' operation at the end of our
      //		animation loop (see lecture notes).
      //	1b) bouncyball03.01 fails by using an 'explicit' solver, but the
      //		'weirdly out-of-order' bouncyBall03.js works. Why? because
      //		version03 uses a simple, accidental special case of an 'implicit' or
      //		'time-reversed' solver: it finds the NEXT timestep's velocity but
      //		applies it 'backwards in time' -- adds it to the CURRENT position!
      //				Implicit solvers (we'll learn much more about them soon) will
      //		often work MUCH better that the simple and obvious Euler method (an
      //		explicit, 'forward-time' solver) because implicit solvers are
      //		'lossy': their  errors slow down the bouncy ball, cause it to lose
      //		more energy, acting as a new kind of 'drag' that helps stop the ball.
      //		Conversely, errors from the 'sensible' Euler method always ADD
      //		energy to the bouncing ball, causing it to keep moving incessantly.
      // 2) BAD CONSTRAINTS: simple velocity reversals aren't enough to
      //		adequately simulate collisions, bouncing, and resting contact on a
      //		solid wall or floor.  BOTH bouncyball03 AND bouncyball03.01BAD need
      //		improvement: read Chapter 7 in your book to learn the multi-step
      //		process needed, and why state-variable formulation is especially
      //		helpful.  For example, imagine that in the current timestep (s1) the
      //		ball is at rest on the floor with zero velocity.  During the time
      //		between s1 and s2, gravity will accelerate the ball downwards; it
      //		will 'fall through the floor'; thus our next state s2 is erroneous,
      //		and we must correct it.  To improve our floor and wall collision
      //		handling we must:
      //				1) 'resolve collision' -- in s2, re-position the ball at the
      //						surface of the floor, and
      //				2) 'apply impulse' -- in s2, remove the CHANGE in velocity
      //						caused by erroneous 'fall-through',
      //		and 3) 'bounce' -- reverse the velocity that remains, moving the
      //						particle away from the collision at a velocity scaled by the
      //						floor's bouncy-ness (coefficient of restitution; see book).
      break;
    case SOLV_NAIVE: //---------------------------------------------------------
      // IMPLICIT or 'reverse time' solver, as found in bouncyBall04.goodMKS;
      // This category of solver is often better, more stable, but lossy.
      // (LATER: Eliminate this!)
      // -- apply acceleration due to gravity to current velocity:
      // s2[PART_YVEL] = s1[PART_YVEL] - (accel. due to gravity)*(g_timestep in seconds)
      //        "               "      - (9.832 meters/sec^2) * (g_timeStep/1000.0);
      this.s2[PART_XVEL] = this.s1[PART_XVEL]; // (apply ONLY to y direction)
      this.s2[PART_YVEL] = this.s1[PART_YVEL];
      this.s2[PART_ZVEL] =
        this.s1[PART_ZVEL] - this.grav * (g_timeStep * 0.001);
      // -- apply drag: attenuate current velocity:
      this.s2[PART_XVEL] *= this.drag;
      this.s2[PART_YVEL] *= this.drag;
      this.s2[PART_ZVEL] *= this.drag;
      // -- move our particle using this new velocity in s2:
      // CAREFUL! must convert g_timeStep from milliseconds to seconds!
      this.s2[PART_XPOS] += this.s2[PART_XVEL] * (g_timeStep * 0.001);
      this.s2[PART_YPOS] += this.s2[PART_YVEL] * (g_timeStep * 0.001);
      this.s2[PART_ZPOS] += this.s2[PART_ZVEL] * (g_timeStep * 0.001);
      // What's the result of this rearrangement?
      //	IT WORKS BEAUTIFULLY! much more stable much more often...
      break;
    default:
      console.log("?!?! unknown solver: g_partA.solvType==" + this.solvType);
      break;
  }
  return;
};

PartSys.prototype.doConstraints = function () {
  //==============================================================================
  // apply all constraints to s1 and s2:
  // 'bounce' our ball off floor & walls at +/- 0.9,+/-0.9
  // where this.bounceType selects constraint type:
  // ==0 for simple velocity-reversal, as in all previous versions
  // ==1 for Chapter 7's collision resolution method, which uses an 'impulse'
  //          to cancel any velocity boost caused by falling below the floor.
  if (this.bounceType == 0) {
    //----------------------------------------------------
    // simple velocity-reversal:
    if (this.s2[PART_XPOS] < -0.9 && this.s2[PART_XVEL] < 0.0) {
      // bounce on left wall:
      this.s2[PART_XVEL] *= -this.resti;
    } else if (this.s2[PART_XPOS] > 0.9 && this.s2[PART_XVEL] > 0.0) {
      // bounce on right wall
      this.s2[PART_XVEL] *= -this.resti;
    } //---------------------------
    if (this.s2[PART_YPOS] < -0.9 && this.s2[PART_YVEL] < 0.0) {
      // bounce on floor
      this.s2[PART_YVEL] *= -this.resti;
    } else if (this.s2[PART_YPOS] > 0.9 && this.s2[PART_YVEL] > 0.0) {
      // bounce on ceiling
      this.s2[PART_YVEL] *= -this.resti;
    } //--------------------------
    // These simple constraints change ONLY the velocity; nothing explicitly
    // forces the bouncy-ball to stay within the walls. If we begin with a
    // bouncy-ball on floor with zero velocity, gravity will cause it to 'fall'
    // through the floor during the next timestep.  At the end of that timestep
    // our velocity-only constraint will scale velocity by -this.resti, but its
    // position is still below the floor!  Worse, the resti-weakened upward
    // velocity will get cancelled by the new downward velocity added by gravity
    // during the NEXT time-step. This gives the ball a net downwards velocity
    // again, which again gets multiplied by -this.resti to make a slight upwards
    // velocity, but with the ball even further below the floor. As this cycle
    // repeats, the ball slowly sinks further and further downwards.
    // THUS the floor needs this position-enforcing constraint as well:
    if (this.s2[PART_ZPOS] < 0) this.s2[PART_ZPOS] = 0;
    // Our simple 'bouncy-ball' particle system needs this position-limiting
    // constraint ONLY for the floor and not the walls, as no forces exist that
    // could 'push' a zero-velocity particle against the wall. But suppose we
    // have a 'blowing wind' force that pushes particles left or right? Any
    // particle that comes to rest against our left or right wall could be
    // slowly 'pushed' through that wall as well.THUS we need position-limiting
    // constraints for ALL the walls:
    else if (this.s2[PART_YPOS] > 0.9) this.s2[PART_YPOS] = 0.9; // ceiling
    if (this.s2[PART_XPOS] < -0.9) this.s2[PART_XPOS] = -0.9; // left wall
    else if (this.s2[PART_XPOS] > 0.9) this.s2[PART_XPOS] = 0.9; // right wall
  } else if (this.bounceType == 1) {
    //----------------------------------------------------------------------------
    if (this.s2[PART_XPOS] < -0.9 && this.s2[PART_XVEL] < 0.0) {
      // collision!  left wall...
      this.s2[PART_XPOS] = -0.9; // 1) resolve contact: put particle at wall.
      // 2) repair velocity: remove all erroneous x
      // velocity gained from forces applied while the
      // ball moved thru wall during this timestep. HOW?
      // a) EASY: assume the worst-- Assume ball
      // reached wall at START of the timestep; thus
      // ALL the timesteps' velocity changes after s1
      // were erroneous. Let's go back to the velocity
      this.s2[PART_XVEL] = this.s1[PART_XVEL]; // copy from START of timestep
      // (NOTE: statistically, hitting the wall is equally probable at any
      // time during the timestep, so the 'expected value' of collision is at
      // the timestep's midpoint.  THUS removing HALF the new velocity during
      // the timestep would create errors with a statistical mean of zero.
      //
      // 		Unwittingly, we have already created that result!
      //------------------------------------------------------------------
      // For simplicity, assume our timestep's erroneous velocity change
      // was the result of constant acceleration (e.g. result of constant
      // gravity acting constant mass, plus constant drag force, etc).  If the
      // ball 'bounces' (reverses velocity) exactly halfway through the
      // timestep, then at the statistical 'expected value' for collision
      // time, then the constant force that acts to INCREASE velocity in one
      // half-timestep will act to DECREASE velocity in the other half
      // timestep by exactly the same amount -- and thus removes ALL the
      // velocity change caused by constant force during the timestep.)
      this.s2[PART_XVEL] *= this.drag;
      // **BUT** velocity during our timestep is STILL
      // reduced by drag (and any other forces
      // proportional to velocity, and thus not
      // cancelled by 'bounce' at timestep's midpoint)
      // 3) BOUNCE:
      //reversed velocity*coeff-of-restitution.
      // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
      //Balls with tiny, near-zero velocities (e.g. ball nearly at rest on
      // floor) and subject to gravity or other steady forces can easily reverse
      // velocity sign between s1 and s2 states (even negligibly small forces).
      // Put another way:
      // Step 2), our 'repair' attempt that removes all erroneous x velocity,
      // has CHANGED the s2 ball velocity, and MAY have changed its sign as
      // well,  especially when the ball is nearly at rest. SUBTLE: THUS we
      // need a new velocity-sign test here to ensure that the 'bounce' step
      // will ALWAYS send the ball outwards from its wall or floor collision:
      if (this.s2[PART_XVEL] < 0.0)
        // ball still moving past wall in s2?
        //Yes (no sign change). Do a normal sign-changing bounce:
        this.s2[PART_XVEL] *= -this.resti;
      // NO!  velocity sign already changed between s1 and s2!
      // sign already changed-- 'wall bounce' needs no sign-change:
      else this.s2[PART_XVEL] *= this.resti;
      // ('diagnostic printing' code was here in earlier versions.)
    } else if (this.s2[PART_XPOS] > 0.9 && this.s2[PART_XVEL] > 0.0) {
      // collision! right wall...
      this.s2[PART_XPOS] = 0.9; // 1) resolve contact: put particle at wall.
      // 2) repair velocity: remove all erroneous x
      // velocity gained from forces applied while the
      // ball moved thru wall during this timestep. HOW?
      // a) EASY: assume the worst-- Assume ball
      // reached wall at START of the timestep; thus
      // ALL the timesteps' velocity changes after s1
      // were erroneous. Let's go back to that velocity:
      this.s2[PART_XVEL] = this.s1[PART_XVEL]; // copy from START of timestep.
      this.s2[PART_XVEL] *= this.drag;
      // **BUT** velocity during our timestep is STILL
      // reduced by drag (and any other forces
      // proportional to velocity, and thus not
      // cancelled by 'bounce' at timestep's midpoint)
      // 3) BOUNCE:
      //reversed velocity*coeff-of-restitution.
      // CAREFUL! Did velocity-reversal already happen between s1 and s2?
      // (see above comment: 'ATTENTION: VERY SUBTLE PROBLEM HERE!---------...)
      if (this.s2[PART_XVEL] > 0.0)
        // ball still moving past wall in s2?
        //Yes (no sign change). Do a normal sign-changing bounce:
        this.s2[PART_XVEL] *= -this.resti;
      // NO!  velocity sign already changed between s1 and s2!
      // sign already changed-- 'wall bounce' needs no sign-change:
      else this.s2[PART_XVEL] *= this.resti;
      // ('diagnostic printing' code was here in earlier versions.)
    }

    if (this.s2[PART_ZPOS] < 0.0 && this.s2[PART_ZVEL] < 0.0) {
      // collision! floor...
      // Diagnostic printing.  This revealed 'VERY SUBTLE PROBLEM' explained above.
      console.log("z<0 bounce: " + g_stepCount + "-(BEFORE)------------------");
      res = 5;
      console.log(
        " s1(xPos,yPos): (" +
          this.s1[PART_XPOS].toFixed(res) +
          ", " +
          this.s1[PART_YPOS].toFixed(res) +
          ")\n s1(xVel,yVel): (" +
          this.s1[PART_XVEL].toFixed(res) +
          ", " +
          this.s1[PART_YVEL].toFixed(res) +
          ");"
      );
      console.log(
        " s2(xPos,yPos): (" +
          this.s2[PART_XPOS].toFixed(res) +
          ", " +
          this.s2[PART_YPOS].toFixed(res) +
          ")\n s2(xVel,yVel): (" +
          this.s2[PART_XVEL].toFixed(res) +
          ", " +
          this.s2[PART_YVEL].toFixed(res) +
          ");"
      );

      this.s2[PART_ZPOS] = 0; // 1) resolve contact: put particle at wall.
      // 2) repair velocity: remove all erroneous y
      // velocity gained from forces applied while the
      // ball moved thru wall during this timestep. HOW?
      // a) EASY: assume the worst-- Assume ball
      // reached wall at START of the timestep; thus
      // ALL the timesteps' velocity changes after s1
      // were erroneous. Let's go back to that velocity:
      this.s2[PART_ZVEL] = this.s1[PART_ZVEL]; // copy from START of timestep.
      this.s2[PART_ZVEL] *= this.drag;
      // **BUT** velocity during our timestep is STILL
      // reduced by drag (and any other forces
      // proportional to velocity, and thus not
      // reversed by 'bounce' at timestep's midpoint)
      // 3) BOUNCE:
      //reversed velocity*coeff-of-restitution.
      // CAREFUL! Did velocity-reversal already happen between s1 and s2?
      // (see above comment: 'ATTENTION: VERY SUBTLE PROBLEM HERE!---------...)
      if (this.s2[PART_ZVEL] < 0.0)
        // ball still moving past wall in s2?
        //Yes (no sign change). Do a normal sign-changing bounce:
        this.s2[PART_ZVEL] *= -this.resti;
      // NO!  velocity sign already changed between s1 and s2!
      // sign already changed-- 'wall bounce' needs no sign-change:
      else this.s2[PART_ZVEL] *= this.resti;
      // Diagnostic printing. This revealed 'VERY SUBTLE PROBLEM' explained above.
      console.log("z<0 bounce: " + g_stepCount + "-(AFTER)------------------");
      res = 5;
      console.log(
        "      s1(xPos,yPos): (" +
          this.s1[PART_XPOS].toFixed(res) +
          ", " +
          this.s1[PART_YPOS].toFixed(res) +
          ")\n      s1(xVel,yVel): (" +
          this.s1[PART_XVEL].toFixed(res) +
          ", " +
          this.s1[PART_YVEL].toFixed(res) +
          ");"
      );
      console.log(
        "      s2(xPos,yPos): (" +
          this.s2[PART_XPOS].toFixed(res) +
          ", " +
          this.s2[PART_YPOS].toFixed(res) +
          ")\n      s2(xVel,yVel):(" +
          this.s2[PART_XVEL].toFixed(res) +
          ", " +
          this.s2[PART_YVEL].toFixed(res) +
          ");"
      );
    } else if (this.s2[PART_YPOS] > 0.9 && this.s2[PART_YVEL] > 0.0) {
      // collision! ceiling...
      // ('diagnostic printing' code was here in earlier versions.)
      this.s2[PART_YPOS] = 0.9; // 1) resolve contact: put particle at wall.
      // 2) repair velocity: remove all erroneous y
      // velocity gained from forces applied while the
      // ball moved thru wall during this timestep. HOW?
      // a) EASY: assume the worst-- Assume ball
      // reached wall at START of the timestep; thus
      // ALL the timesteps' velocity changes after s1
      // were erroneous. Let's go back to that velocity:
      this.s2[PART_YVEL] = this.s1[PART_YVEL]; // copy from START of timestep.
      this.s2[PART_YVEL] *= this.drag;
      // **BUT** velocity during our timestep is STILL
      // reduced by drag (and any other forces
      // proportional to velocity, and thus not
      // cancelled by 'bounce' at timestep's midpoint)
      // 3) BOUNCE:
      //reversed velocity*coeff-of-restitution.
      // CAREFUL! Did velocity-reversal already happen between s1 and s2?
      // (see above comment: 'ATTENTION: VERY SUBTLE PROBLEM HERE!---------...)
      if (this.s2[PART_YVEL] > 0.0)
        // ball still moving past wall in s2?
        //Yes (no sign change). Do a normal sign-changing bounce:
        this.s2[PART_YVEL] *= -this.resti;
      // NO!  velocity sign already changed between s1 and s2!
      // sign already changed-- 'wall bounce' needs no sign-change:
      else this.s2[PART_YVEL] *= this.resti;
      // ('diagnostic printing' code was here in earlier versions.)
    }
  } else {
    console.log(
      "?!?! unknown constraint: PartSys.bounceType==" + this.bounceType
    );
    return;
  }
};

PartSys.prototype.step = function () {
  //==============================================================================
  // transfer contents of state-vector s2 into s1.
  this.s1.set(this.s2);
};
