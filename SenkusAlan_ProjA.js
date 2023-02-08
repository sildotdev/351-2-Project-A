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

function CollGrid() {
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

    // A cube 1x1x1 cube at the origin (drawn with TRIANGLES)
  g_mdl_grid = new Float32Array([
    // x,y,z,w, r,g,b
    
    // Front face
    -1.0, -1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    1.0, -1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    -1.0,  1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    1.0,  1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    
    // Back face
    -1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    -1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    
    // Top face
    -1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    -1.0,  1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    1.0,  1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    
    // Bottom face
    -1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    -1.0, -1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    1.0, -1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    
    // Right face
    1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    1.0, -1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    1.0,  1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    
    // Left face
    -1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    -1.0, -1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
    -1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 1.0,
    -1.0,  1.0,  1.0, 1.0,    1.0, 1.0, 1.0,
  ]);
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

CollGrid.prototype.init = function () {
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

CollGrid.prototype.switchToMe = function () {
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

CollGrid.prototype.isReady = function () {
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

CollGrid.prototype.adjust = function () {
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
  this.ModelMat.scale(0.5, 0.5, 0.5);
  this.ModelMat.translate(0, 0, 1);
  // this.ProjMat.setPerspective(30, g_vpAspect, 1, 100);
  // this.ViewMat.setLookAt(g_Camera.elements[0], g_Camera.elements[1], g_Camera.elements[2],
  //   g_Camera.elements[0] + g_CameraFront.elements[0], g_Camera.elements[1] + g_CameraFront.elements[1], g_Camera.elements[2] + g_CameraFront.elements[2],
  //   g_CameraUp.elements[0], g_CameraUp.elements[1], g_CameraUp.elements[2]);
  // this.MVP.set(this.ProjMat).multiply(this.ViewMat).multiply(this.ModelMat);

  gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);
  gl.uniformMatrix4fv(this.u_ViewMatLoc, false, this.ViewMat.elements);
  gl.uniformMatrix4fv(this.u_ProjMatLoc, false, this.ProjMat.elements);
};

CollGrid.prototype.draw = function () {
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

  // clear color AND DEPTH buffer
  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // gl.depthFunc(gl.GREATER);


  // ----------------------------Draw the contents of the currently-bound VBO:
  gl.drawArrays(
    gl.TRIANGLE_STRIP, // select the drawing primitive to draw,
    // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP,
    //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
    0, // location of 1st vertex to draw;
    this.vboVerts
  ); // number of vertices to draw on-screen.
};

CollGrid.prototype.reload = function () {
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
const PART_LIFELEFT = 13;
const PART_MASS = 14; // mass, in kilograms
const PART_DIAM = 15; // on-screen diameter (in pixels)
const PART_RENDMODE = 16; // on-screen appearance (square, round, or soft-round)
// Other useful particle values, currently unused
const PART_AGE = 17; // # of frame-times until re-initializing (Reeves Fire)
/*
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
const PART_MAXVAR = 17; // Size of array in CPart uses to store its values.

// Array-Name consts that select PartSys objects' numerical-integration solver:
//------------------------------------------------------------------------------
// EXPLICIT methods: GOOD!
//    ++ simple, easy to understand, fast, but
//    -- Requires tiny time-steps for stable stiff systems, because
//    -- Errors tend to 'add energy' to any dynamical system, driving
//        many systems to instability even with small time-steps.
const SOLV_EULER = 0; // Euler integration: forward,explicit,...
const SOLV_MIDPOINT = 1; // Midpoint Method (see Pixar Tutorial)
const SOLV_ADAMS_BASH = 2; // Adams-Bashforth Explicit Integrator
const SOLV_RUNGEKUTTA = 3; // Arbitrary degree, set by 'solvDegree'

// IMPLICIT methods:  BETTER!
//          ++Permits larger time-steps for stiff systems, but
//          --More complicated, slower, less intuitively obvious,
//          ++Errors tend to 'remove energy' (ghost friction; 'damping') that
//              aids stability even for large time-steps.
//          --requires root-finding (iterative: often no analytical soln exists)
const SOLV_OLDGOOD = 4; //  early accidental 'good-but-wrong' solver
const SOLV_BACK_EULER = 5; // 'Backwind' or Implicit Euler
const SOLV_BACK_MIDPT = 6; // 'Backwind' or Implicit Midpoint
const SOLV_BACK_ADBASH = 7; // 'Backwind' or Implicit Adams-Bashforth

// SEMI-IMPLICIT METHODS: BEST?
//          --Permits larger time-steps for stiff systems,
//          ++Simpler, easier-to-understand than Implicit methods
//          ++Errors tend to 'remove energy) (ghost friction; 'damping') that
//              aids stability even for large time-steps.
//          ++ DOES NOT require the root-finding of implicit methods,
const SOLV_VERLET = 8; // Verlet semi-implicit integrator;
const SOLV_VEL_VERLET = 9; // 'Velocity-Verlet'semi-implicit integrator
const SOLV_LEAPFROG = 10; // 'Leapfrog' integrator
const SOLV_MAX = 11; // number of solver types available.

const NU_EPSILON = 10e-15; // a tiny amount; a minimum vector length
// to use to avoid 'divide-by-zero'

//=============================================================================
//=============================================================================
function PartSys() {
  this.VERT_SRC = `precision mediump float;							// req'd in OpenGL ES if we use 'float'
  //
  uniform   int u_runMode;							// particle system state: 
  																			// 0=reset; 1= pause; 2=step; 3=run
  uniform	 vec4 u_ballShift;						// single bouncy-ball's movement
  uniform mat4 u_ModelMat;
  uniform mat4 u_ViewMat;
  uniform mat4 u_ProjMat;
  attribute vec4 a_Position;
  attribute float a_LifeLeft;
  varying   vec4 v_Color; 
  void main() {
    gl_PointSize = 10.0;
    mat4 MVP = u_ProjMat * u_ViewMat * u_ModelMat;
    gl_Position = MVP * a_Position + u_ballShift;
	// Let u_runMode determine particle color:
    if(u_runMode == 0) { 
		   v_Color = vec4(1.0, 0.0, a_LifeLeft, a_LifeLeft);	// red: 0==reset
	  	 } 
	  else if(u_runMode == 1) { 
	    v_Color = vec4(1.0, 1.0, 0.0, a_LifeLeft);		// yellow: 1==pause
	    }  
	  else if(u_runMode == 2) { 
	    v_Color = vec4(1.0, 1.0, 1.0, a_LifeLeft);		// white: 2==step
      } 
	  else { 
	    v_Color = vec4(0.2, 1.0, 0.2, a_LifeLeft);		// green: >3==run
			 } 
  }`;

  this.FRAG_SRC = `precision mediump float;
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

  this.randX = 0; // random point chosen by call to roundRand()
  this.randY = 0;
  this.randZ = 0;
  this.isFountain = 0; // Press 'f' or 'F' key to toggle; if 1, apply age
  // age constraint, which re-initializes particles whose
  // lifetime falls to zero, forming a 'fountain' of
  // freshly re-initialized bouncy-balls.
  this.forceList = []; // (empty) array to hold CForcer objects
  // for use by ApplyAllForces().
  // NOTE: this.forceList.push("hello"); appends
  // string "Hello" as last element of forceList.
  // console.log(this.forceList[0]); prints hello.
  this.limitList = []; // (empty) array to hold CLimit objects
  // for use by doContstraints()

  this.ModelMat = new Matrix4(); // Transforms CVV axes to model axes.
  this.u_ModelMatLoc; // GPU location for u_ModelMat uniform

  this.ViewMat = new Matrix4(); // Transforms World axes to CVV axes.
  this.u_ViewMatLoc; // GPU location for u_ViewMat uniform

  this.ProjMat = new Matrix4(); // Transforms CVV axes to clip axes.
  this.u_ProjMatLoc; // GPU location for u_ProjMat uniform
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

  // this.initBouncy3D(300);
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

  // gl.uniform1i(this.u_runModeID, 3);
};

PartSys.prototype.adjust = function () {
  this.ModelMat.setIdentity();
  this.ModelMat.set(g_worldMat);

  gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);
  gl.uniformMatrix4fv(this.u_ViewMatLoc, false, this.ViewMat.elements);
  gl.uniformMatrix4fv(this.u_ProjMatLoc, false, this.ProjMat.elements);

  // reverse depth buffer;
};

PartSys.prototype.roundRand = function () {
  //==============================================================================
  // When called, find a new 3D point (this.randX, this.randY, this.randZ) chosen
  // 'randomly' and 'uniformly' inside a sphere of radius 1.0 centered at origin.
  //		(within this sphere, all regions of equal volume are equally likely to
  //		contain the the point (randX, randY, randZ, 1).

  do {
    // RECALL: Math.random() gives #s with uniform PDF between 0 and 1.
    this.randX = 2.0 * Math.random() - 1.0; // choose an equally-likely 2D point
    this.randY = 2.0 * Math.random() - 1.0; // within the +/-1 cube, but
    this.randZ = 2.0 * Math.random() - 1.0;
  } while ( // is x,y,z outside sphere? try again!
    this.randX * this.randX +
      this.randY * this.randY +
      this.randZ * this.randZ >=
    1.0
  );
};

PartSys.prototype.initBouncy3D = function (count) {
  //==============================================================================
  // Create all state-variables-------------------------------------------------
  this.partCount = count;
  this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
  this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
  this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);
  // NOTE: Float32Array objects are zero-filled by default.

  // Create & init all force-causing objects------------------------------------
  var fTmp = new CForcer(); // create a force-causing object, and
  // earth gravity for all particles:
  fTmp.forceType = F_GRAV_E; // set it to earth gravity, and
  fTmp.targFirst = 0; // set it to affect ALL particles:
  fTmp.partCount = -1; // (negative value means ALL particles)
  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp); // append this 'gravity' force object to
  //                                 // the forceList array of force-causing objects.
  // drag for all particles:
  fTmp = new CForcer(); // create a NEW CForcer object
  // (WARNING! until we do this, fTmp refers to
  // the same memory locations as forceList[0]!!!)
  fTmp.forceType = F_DRAG; // Viscous Drag
  fTmp.K_drag = 0.15; // in Euler solver, scales velocity by 0.85
  fTmp.targFirst = 0; // apply it to ALL particles:
  fTmp.partCount = -1; // (negative value means ALL particles)
  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp); // append this 'gravity' force object to
  // the forceList array of force-causing objects.

  fTmp = new CForcer(); // create a NEW CForcer object
  fTmp.forceType = F_BUBBLE;
  fTmp.bub_radius = 1;
  fTmp.bub_ctr = new Vector4([0, 0, 3, 1]);
  fTmp.bub_force = 10;

  this.forceList.push(fTmp);

  // Report:
  console.log("PartSys.initBouncy3D() created PartSys.forceList[] array of ");
  console.log("\t\t", this.forceList.length, "CForcer objects:");
  for (i = 0; i < this.forceList.length; i++) {
    console.log("CForceList[", i, "]");
    this.forceList[i].printMe();
  }

  // Create & init all constraint-causing objects-------------------------------
  var cTmp = new CLimit(); // creat constraint-causing object, and
  cTmp.hitType = HIT_BOUNCE_VEL; // set how particles 'bounce' from its surface,
  cTmp.limitType = LIM_VOL; // confine particles inside axis-aligned
  // rectangular volume that
  cTmp.targFirst = 0; // applies to ALL particles; starting at 0
  cTmp.partCount = -1; // through all the rest of them.
  cTmp.xMin = -3.0;
  cTmp.xMax = 3.0; // box extent:  +/- 1.0 box at origin
  cTmp.yMin = -3.0;
  cTmp.yMax = 3.0;
  cTmp.zMin = 0.0;
  cTmp.zMax = 6.0;
  cTmp.Kresti = 1.0; // bouncyness: coeff. of restitution.
  // (and IGNORE all other CLimit members...)
  this.limitList.push(cTmp); // append this 'box' constraint object to the

  var cTmp = new CLimit(); // creat constraint-causing object, and
  cTmp.hitType = HIT_BOUNCE_VEL; // set how particles 'bounce' from its surface,
  cTmp.limitType = LIM_BOX; // confine particles inside axis-aligned
  // rectangular volume that
  cTmp.targFirst = 0; // applies to ALL particles; starting at 0
  cTmp.partCount = -1; // through all the rest of them.
  cTmp.xMin = -0.5;
  cTmp.xMax = 0.5; // box extent:  +/- 1.0 box at origin
  cTmp.yMin = -0.5;
  cTmp.yMax = 0.5;
  cTmp.zMin = 0.0;
  cTmp.zMax = 1.0;
  cTmp.Kresti = 1.0; // bouncyness: coeff. of restitution.
  // (and IGNORE all other CLimit members...)
  this.limitList.push(cTmp); // append this 'box' constraint object to the
  // 'limitList' array of constraint-causing objects.
  // Report:
  console.log("PartSys.initBouncy3D() created PartSys.limitList[] array of ");
  console.log("\t\t", this.limitList.length, "CLimit objects.");

  this.INIT_VEL = 0.15 * 60.0; // initial velocity in meters/sec.
  // adjust by ++Start, --Start buttons. Original value
  // was 0.15 meters per timestep; multiply by 60 to get
  // meters per second.
  this.drag = 0.985; // units-free air-drag (scales velocity); adjust by d/D keys
  this.grav = 9.832; // gravity's acceleration(meter/sec^2); adjust by g/G keys.
  // on Earth surface, value is 9.832 meters/sec^2.
  this.resti = 1.0; // units-free 'Coefficient of Restitution' for
  // inelastic collisions.  Sets the fraction of momentum
  // (0.0 <= resti < 1.0) that remains after a ball
  // 'bounces' on a wall or floor, as computed using
  // velocity perpendicular to the surface.
  // (Recall: momentum==mass*velocity.  If ball mass does
  // not change, and the ball bounces off the x==0 wall,
  // its x velocity xvel will change to -xvel * resti ).

  //--------------------------init Particle System Controls:
  this.runMode = 3; // Master Control: 0=reset; 1= pause; 2=step; 3=run
  this.solvType = SOLV_OLDGOOD; // adjust by s/S keys.
  // SOLV_EULER (explicit, forward-time, as
  // found in BouncyBall03.01BAD and BouncyBall04.01badMKS)
  // SOLV_OLDGOOD for special-case implicit solver, reverse-time,
  // as found in BouncyBall03.GOOD, BouncyBall04.goodMKS)
  this.bounceType = 1; // floor-bounce constraint type:
  // ==0 for velocity-reversal, as in all previous versions
  // ==1 for Chapter 3's collision resolution method, which
  // uses an 'impulse' to cancel any velocity boost caused
  // by falling below the floor.

  //--------------------------------Create & fill VBO with state var s1 contents:
  // INITIALIZE s1, s2:
  //  NOTE: s1,s2 are a Float32Array objects, zero-filled by default.
  // That's OK for most particle parameters, but these need non-zero defaults:

  var j = 0; // i==particle number; j==array index for i-th particle
  for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
    this.roundRand(); // set this.randX,randY,randZ to random location in
    // a 3D unit sphere centered at the origin.
    //all our bouncy-balls stay within a +/- 0.9 cube centered at origin;
    // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
    this.s1[j + PART_XPOS] = -0.8 + 0.1 * this.randX;
    this.s1[j + PART_YPOS] = -0.8 + 0.1 * this.randY;
    this.s1[j + PART_ZPOS] = 0.8 + 0.1 * this.randZ;
    this.s1[j + PART_WPOS] = 1.0; // position 'w' coordinate;
    this.roundRand(); // Now choose random initial velocities too:
    this.s1[j + PART_XVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randX);
    this.s1[j + PART_YVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randY);
    this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randZ);
    this.s1[j + PART_MASS] = 1.0; // mass, in kg.
    this.s1[j + PART_DIAM] = 2.0 + 10 * Math.random(); // on-screen diameter, in pixels
    this.s1[j + PART_LIFELEFT] = 10 + 10 * Math.random(); // 10 to 20
    this.s1[j + PART_RENDMODE] = 0.0;
    this.s1[j + PART_AGE] = 30 + 100 * Math.random();
    //----------------------------
    this.s2.set(this.s1); // COPY contents of state-vector s1 to s2.
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
  // Tell GLSL to fill the 'a_Position' attribute variable for each shader with
  // values from the buffer object chosen by 'gl.bindBuffer()' command.
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

  // --- NEW! particle 'age' attribute:--------------------------------
  //Get the ID# for the a_LifeLeft variable in the graphics hardware
  this.a_LifeLeftID = gl.getAttribLocation(gl.program, "a_LifeLeft");
  if (this.a_LifeLeftID < 0) {
    console.log(
      "PartSys.init() Failed to get the storage location of a_LifeLeft"
    );
    return -1;
  }
  // Tell GLSL to fill the 'a_LifeLeft' attribute variable for each shader with
  // values from the buffer object chosen by 'gl.bindBuffer()' command.
  // websearch yields OpenGL version:
  //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
  gl.vertexAttribPointer(
    this.a_LifeLeftID,
    1, // # of values in this attrib (1,2,3,4)
    gl.FLOAT, // data type (usually gl.FLOAT)
    false, // use integer normalizing? (usually false)
    PART_MAXVAR * this.FSIZE, // Stride: #bytes from 1st stored value to next one
    PART_LIFELEFT * this.FSIZE
  ); // Offset; #bytes from start of buffer to
  // 1st stored attrib value we will actually use.
  // Enable this assignment of the bound buffer to the a_Position variable:
  gl.enableVertexAttribArray(this.a_LifeLeftID);

  //------------------------------------------
  // ---------Set up all uniforms we send to the GPU:
  // Get graphics system storage location of each uniform our shaders use:
  // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
  this.u_runModeID = gl.getUniformLocation(gl.program, "u_runMode");
  if (!this.u_runModeID) {
    console.log("PartSys.init() Failed to get u_runMode variable location");
    return;
  }
  // Set the initial values of all uniforms on GPU: (runMode set by keyboard)
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
  // Create all state-variables-------------------------------------------------
  this.partCount = count;
  this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
  this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
  this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);
  // NOTE: Float32Array objects are zero-filled by default.

  // Create & init all force-causing objects------------------------------------
  // var fTmp = new CForcer(); // create a force-causing object, and
  // // earth gravity for all particles:
  // fTmp.forceType = F_GRAV_E; // set it to earth gravity, and
  // fTmp.targFirst = 0; // set it to affect ALL particles:
  // fTmp.partCount = -1; // (negative value means ALL particles)
  // // (and IGNORE all other Cforcer members...)
  // this.forceList.push(fTmp); // append this 'gravity' force object to
  // //                                 // the forceList array of force-causing objects.
  // // drag for all particles:
  // fTmp = new CForcer(); // create a NEW CForcer object
  // // (WARNING! until we do this, fTmp refers to
  // // the same memory locations as forceList[0]!!!)
  // fTmp.forceType = F_DRAG; // Viscous Drag
  // fTmp.Kdrag = 0.00001; // in Euler solver, scales velocity by 0.85
  // fTmp.targFirst = 0; // apply it to ALL particles:
  // fTmp.partCount = -1; // (negative value means ALL particles)
  // // (and IGNORE all other Cforcer members...)
  // this.forceList.push(fTmp); // append this 'gravity' force object to
  // // the forceList array of force-causing objects.

  fTmp = new CForcer(); // create a NEW CForcer object
  fTmp.forceType = F_BOIDS1;
  this.forceList.push(fTmp);

  fTmp = new CForcer(); // create a NEW CForcer object
  fTmp.forceType = F_BOIDS2;
  this.forceList.push(fTmp);

  fTmp = new CForcer(); // create a NEW CForcer object
  fTmp.forceType = F_BOIDS3;
  this.forceList.push(fTmp);

  fTmp = new CForcer(); // create a NEW CForcer object
  fTmp.forceType = F_BOIDS4;
  this.forceList.push(fTmp);

  fTmp = new CForcer(); // create a NEW CForcer object
  // (WARNING! until we do this, fTmp refers to
  // the same memory locations as forceList[0]!!!)
  fTmp.forceType = F_DRAG; // Viscous Drag
  fTmp.K_drag = 0.60; // in Euler solver, scales velocity by 0.85
  fTmp.targFirst = 0; // apply it to ALL particles:
  fTmp.partCount = -1; // (negative value means ALL particles)
  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp); // append this 'gravity' force object to

  // Report:
  console.log("PartSys.initBouncy3D() created PartSys.forceList[] array of ");
  console.log("\t\t", this.forceList.length, "CForcer objects:");
  for (i = 0; i < this.forceList.length; i++) {
    console.log("CForceList[", i, "]");
    this.forceList[i].printMe();
  }

  // Create & init all constraint-causing objects-------------------------------
  var cTmp = new CLimit(); // creat constraint-causing object, and
  cTmp.hitType = HIT_BOUNCE_VEL; // set how particles 'bounce' from its surface,
  cTmp.limitType = LIM_VOL; // confine particles inside axis-aligned
  // rectangular volume that
  cTmp.targFirst = 0; // applies to ALL particles; starting at 0
  cTmp.partCount = -1; // through all the rest of them.
  cTmp.xMin = -3.0;
  cTmp.xMax = 3.0; // box extent:  +/- 1.0 box at origin
  cTmp.yMin = -3.0;
  cTmp.yMax = 3.0;
  cTmp.zMin = 0.0;
  cTmp.zMax = 6.0;
  cTmp.Kresti = 1.0; // bouncyness: coeff. of restitution.
  // (and IGNORE all other CLimit members...)
  this.limitList.push(cTmp); // append this 'box' constraint object to the

  var cTmp = new CLimit(); // creat constraint-causing object, and
  cTmp.hitType = HIT_BOUNCE_VEL; // set how particles 'bounce' from its surface,
  cTmp.limitType = LIM_BOX; // confine particles inside axis-aligned
  // rectangular volume that
  cTmp.targFirst = 0; // applies to ALL particles; starting at 0
  cTmp.partCount = -1; // through all the rest of them.
  cTmp.xMin = -0.5;
  cTmp.xMax = 0.5; // box extent:  +/- 1.0 box at origin
  cTmp.yMin = -0.5;
  cTmp.yMax = 0.5;
  cTmp.zMin = 0.0;
  cTmp.zMax = 1.0;
  cTmp.Kresti = 1.0; // bouncyness: coeff. of restitution.
  // (and IGNORE all other CLimit members...)
  this.limitList.push(cTmp); // append this 'box' constraint object to the
  // 'limitList' array of constraint-causing objects.
  // Report:
  console.log("PartSys.initBouncy3D() created PartSys.limitList[] array of ");
  console.log("\t\t", this.limitList.length, "CLimit objects.");

  this.INIT_VEL = 0.15 * 30.0; // initial velocity in meters/sec.
  // adjust by ++Start, --Start buttons. Original value
  // was 0.15 meters per timestep; multiply by 60 to get
  // meters per second.
  this.drag = 0.985; // units-free air-drag (scales velocity); adjust by d/D keys
  this.grav = 9.832; // gravity's acceleration(meter/sec^2); adjust by g/G keys.
  // on Earth surface, value is 9.832 meters/sec^2.
  this.resti = 1.0; // units-free 'Coefficient of Restitution' for
  // inelastic collisions.  Sets the fraction of momentum
  // (0.0 <= resti < 1.0) that remains after a ball
  // 'bounces' on a wall or floor, as computed using
  // velocity perpendicular to the surface.
  // (Recall: momentum==mass*velocity.  If ball mass does
  // not change, and the ball bounces off the x==0 wall,
  // its x velocity xvel will change to -xvel * resti ).

  //--------------------------init Particle System Controls:
  this.runMode = 3; // Master Control: 0=reset; 1= pause; 2=step; 3=run
  this.solvType = SOLV_EULER; // adjust by s/S keys.
  // SOLV_EULER (explicit, forward-time, as
  // found in BouncyBall03.01BAD and BouncyBall04.01badMKS)
  // SOLV_OLDGOOD for special-case implicit solver, reverse-time,
  // as found in BouncyBall03.GOOD, BouncyBall04.goodMKS)
  this.bounceType = 1; // floor-bounce constraint type:
  // ==0 for velocity-reversal, as in all previous versions
  // ==1 for Chapter 3's collision resolution method, which
  // uses an 'impulse' to cancel any velocity boost caused
  // by falling below the floor.

  //--------------------------------Create & fill VBO with state var s1 contents:
  // INITIALIZE s1, s2:
  //  NOTE: s1,s2 are a Float32Array objects, zero-filled by default.
  // That's OK for most particle parameters, but these need non-zero defaults:

  var j = 0; // i==particle number; j==array index for i-th particle
  for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
    this.roundRand(); // set this.randX,randY,randZ to random location in
    // a 3D unit sphere centered at the origin.
    //all our bouncy-balls stay within a +/- 0.9 cube centered at origin;
    // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
    this.s1[j + PART_XPOS] = -0.8 + 2 * this.randX;
    this.s1[j + PART_YPOS] = -0.8 + 2 * this.randY;
    this.s1[j + PART_ZPOS] = 0.8 + 2 * this.randZ;
    this.s1[j + PART_WPOS] = 1.0; // position 'w' coordinate;
    this.roundRand(); // Now choose random initial velocities too:
    this.s1[j + PART_XVEL] = this.INIT_VEL * (0.4 + 0.2 * 0);
    this.s1[j + PART_YVEL] = this.INIT_VEL * (0.4 + 0.2 * 1);
    this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.4 + 0.2 * 1);
    this.s1[j + PART_MASS] = 1.0; // mass, in kg.
    this.s1[j + PART_DIAM] = 2.0 + 10 * Math.random(); // on-screen diameter, in pixels
    this.s1[j + PART_LIFELEFT] = 10 + 10 * Math.random(); // 10 to 20
    this.s1[j + PART_RENDMODE] = 0.0;
    this.s1[j + PART_AGE] = 30 + 100 * Math.random();
    //----------------------------
    this.s2.set(this.s1); // COPY contents of state-vector s1 to s2.
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
  // Tell GLSL to fill the 'a_Position' attribute variable for each shader with
  // values from the buffer object chosen by 'gl.bindBuffer()' command.
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

  // --- NEW! particle 'age' attribute:--------------------------------
  //Get the ID# for the a_LifeLeft variable in the graphics hardware
  this.a_LifeLeftID = gl.getAttribLocation(gl.program, "a_LifeLeft");
  if (this.a_LifeLeftID < 0) {
    console.log(
      "PartSys.init() Failed to get the storage location of a_LifeLeft"
    );
    return -1;
  }
  // Tell GLSL to fill the 'a_LifeLeft' attribute variable for each shader with
  // values from the buffer object chosen by 'gl.bindBuffer()' command.
  // websearch yields OpenGL version:
  //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
  gl.vertexAttribPointer(
    this.a_LifeLeftID,
    1, // # of values in this attrib (1,2,3,4)
    gl.FLOAT, // data type (usually gl.FLOAT)
    false, // use integer normalizing? (usually false)
    PART_MAXVAR * this.FSIZE, // Stride: #bytes from 1st stored value to next one
    PART_LIFELEFT * this.FSIZE
  ); // Offset; #bytes from start of buffer to
  // 1st stored attrib value we will actually use.
  // Enable this assignment of the bound buffer to the a_Position variable:
  gl.enableVertexAttribArray(this.a_LifeLeftID);

  //------------------------------------------
  // ---------Set up all uniforms we send to the GPU:
  // Get graphics system storage location of each uniform our shaders use:
  // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
  this.u_runModeID = gl.getUniformLocation(gl.program, "u_runMode");
  if (!this.u_runModeID) {
    console.log("PartSys.init() Failed to get u_runMode variable location");
    return;
  }
  // Set the initial values of all uniforms on GPU: (runMode set by keyboard)
  // gl.uniform1i(this.u_runModeID, this.runMode);
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

PartSys.prototype.applyForces = function (s, fSet, min, max) {
  //==============================================================================
  // Clear the force-accumulator vector for each particle in state-vector 's',
  // then apply each force described in the collection of force-applying objects
  // found in 'fSet'.
  // (this function will simplify our too-complicated 'draw()' function)

  // To begin, CLEAR force-accumulators for all particles in state variable 's'
  var j = 0; // i==particle number; j==array index for i-th particle
  for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
    s[j + PART_X_FTOT] = 0.0;
    s[j + PART_Y_FTOT] = 0.0;
    s[j + PART_Z_FTOT] = 0.0;
  }
  // then find and accumulate all forces applied to particles in state s:
  for (var k = 0; k < fSet.length; k++) {
    // for every CForcer in fSet array,
    //    console.log("fSet[k].forceType:", fSet[k].forceType);
    if (fSet[k].forceType <= 0) {
      //.................Invalid force? SKIP IT!
      // if forceType is F_NONE, or if forceType was
      continue; // negated to (temporarily) disable the CForcer,
    }
    // ..................................Set up loop for all targeted particles
    // HOW THIS WORKS:
    // Most, but not all CForcer objects apply a force to many particles, and
    // the CForcer members 'targFirst' and 'targCount' tell us which ones:
    // *IF* targCount == 0, the CForcer applies ONLY to particle numbers e1,e2
    //          (e.g. the e1 particle begins at s[fSet[k].e1 * PART_MAXVAR])
    // *IF* targCount < 0, apply the CForcer to 'targFirst' and all the rest
    //      of the particles that follow it in the state variable s.
    // *IF* targCount > 0, apply the CForcer to exactly 'targCount' particles,
    //      starting with particle number 'targFirst'
    // Begin by presuming targCount < 0;
    m = min | fSet[k].targFirst; // first affected particle # in our state 's'
    mmax = max | this.partCount; // Total number of particles in 's'
    // (last particle number we access is mmax-1)
    if (fSet[k].targCount == 0) {
      // ! Apply force to e1,e2 particles only!
      m = mmax = 0; // don't let loop run; apply force to e1,e2 particles only.
    } else if (fSet[k].targCount > 0) {
      // ?did CForcer say HOW MANY particles?
      // YES! force applies to 'targCount' particles starting with particle # m:
      var tmp = fSet[k].targCount;
      if (tmp < mmax) mmax = tmp; // (but MAKE SURE mmax doesn't get larger)
      else console.log("\n\n!!PartSys.applyForces() index error!!\n\n");
    }
    //console.log("m:",m,"mmax:",mmax);
    // m and mmax are now correctly initialized; use them!
    //......................................Apply force specified by forceType
    switch (
      fSet[k].forceType // what kind of force should we apply?
    ) {
      case F_MOUSE: // Spring-like connection to mouse cursor
        console.log(
          "PartSys.applyForces(), fSet[",
          k,
          "].forceType:",
          fSet[k].forceType,
          "NOT YET IMPLEMENTED!!"
        );
        break;
      case F_GRAV_E: // Earth-gravity pulls 'downwards' as defined by downDir
        var j = m * PART_MAXVAR; // state var array index for particle # m
        for (; m < mmax; m++, j += PART_MAXVAR) {
          // for every part# from m to mmax-1,
          // force from gravity == mass * gravConst * downDirection
          s[j + PART_X_FTOT] +=
            s[j + PART_MASS] *
            fSet[k].gravConst *
            fSet[k].downDir.elements[0];
          s[j + PART_Y_FTOT] +=
            s[j + PART_MASS] *
            fSet[k].gravConst *
            fSet[k].downDir.elements[1];
          s[j + PART_Z_FTOT] +=
            s[j + PART_MASS] *
            fSet[k].gravConst *
            fSet[k].downDir.elements[2];
        }
        break;
      case F_GRAV_P: // planetary gravity between particle # e1 and e2.
        console.log(
          "PartSys.applyForces(), fSet[",
          k,
          "].forceType:",
          fSet[k].forceType,
          "NOT YET IMPLEMENTED!!"
        );
        break;
      case F_WIND: // Blowing-wind-like force-field; fcn of 3D position
        console.log(
          "PartSys.applyForces(), fSet[",
          k,
          "].forceType:",
          fSet[k].forceType,
          "NOT YET IMPLEMENTED!!"
        );
        break;
      case F_BUBBLE: // Constant inward force (bub_force)to a 3D centerpoint
        var j = m * PART_MAXVAR; // state var array index for particle # m
        for (; m < mmax; m++, j += PART_MAXVAR) {
          var distance = Math.sqrt(
            Math.pow(
              s[j + PART_XPOS] - fSet[k].bub_ctr.elements[0],
              2
            ) +
              Math.pow(
                s[j + PART_YPOS] - fSet[k].bub_ctr.elements[1],
                2
              ) +
              Math.pow(
                s[j + PART_ZPOS] - fSet[k].bub_ctr.elements[2],
                2
              )
          );

          // clamp distance to NU_EPSILON
          if (!distance || distance < NU_EPSILON) {
            distance = NU_EPSILON;
          }

          if (distance > fSet[k].bub_radius) {
            // Constant force towards center
            s[j + PART_X_FTOT] +=
              (fSet[k].bub_force *
                (fSet[k].bub_ctr.elements[0] - s[j + PART_XPOS])) /
              distance;
            s[j + PART_Y_FTOT] +=
              (fSet[k].bub_force *
                (fSet[k].bub_ctr.elements[1] - s[j + PART_YPOS])) /
              distance;
            s[j + PART_Z_FTOT] +=
              (fSet[k].bub_force *
                (fSet[k].bub_ctr.elements[2] - s[j + PART_ZPOS])) /
              distance;
          }
        }
        break;
      case F_DRAG: // viscous drag: force = -K_drag * velocity.
        var j = m * PART_MAXVAR; // state var array index for particle # m
        for (; m < mmax; m++, j += PART_MAXVAR) {
          // for every particle# from m to mmax-1,
          // force from gravity == mass * gravConst * downDirection
          s[j + PART_X_FTOT] -= fSet[k].K_drag * s[j + PART_XVEL];
          s[j + PART_Y_FTOT] -= fSet[k].K_drag * s[j + PART_YVEL];
          s[j + PART_Z_FTOT] -= fSet[k].K_drag * s[j + PART_ZVEL];
        }
        break;
      case F_SPRING:
        console.log(
          "PartSys.applyForces(), fSet[",
          k,
          "].forceType:",
          fSet[k].forceType,
          "NOT YET IMPLEMENTED!!"
        );
        break;
      case F_SPRINGSET:
        console.log(
          "PartSys.applyForces(), fSet[",
          k,
          "].forceType:",
          fSet[k].forceType,
          "NOT YET IMPLEMENTED!!"
        );
        break;
      case F_CHARGE:
        console.log(
          "PartSys.applyForces(), fSet[",
          k,
          "].forceType:",
          fSet[k].forceType,
          "NOT YET IMPLEMENTED!!"
        );
        break;
      case F_BOIDS1:
        // console.log( "Boids1" );
        // Cohesion

        var j = m * PART_MAXVAR; // state var array index for particle # m
        var center = new Vector3();
        for (; m < mmax; m++, j += PART_MAXVAR) {
          center.elements[0] += s[j + PART_XPOS];
          center.elements[1] += s[j + PART_YPOS];
          center.elements[2] += s[j + PART_ZPOS];
        }
        center.elements[0] /= mmax;
        center.elements[1] /= mmax;
        center.elements[2] /= mmax;
        var fTmp = new CForcer();
        fTmp.forceType = F_BUBBLE;
        fTmp.bub_force = 5;
        fTmp.bub_radius = 1;
        fTmp.bub_ctr = center;

        this.applyForces(s, [fTmp]);
        break;
      case F_BOIDS2:
        console.log( "Boids2" );
        // Separation
        var starter = m;
        var j = m * PART_MAXVAR
        for (; m < mmax; m++, j += PART_MAXVAR) {
          var j2 = starter * PART_MAXVAR
          var m2 = starter;
          // console.log(m2)
          for (; m2 < mmax; m2++, j2 += PART_MAXVAR) {
            if (m!=0) {
              // console.log("sanity check")
            }
            if (m != m2) {
              var distance = Math.sqrt(
                Math.pow(s[j + PART_XPOS] - s[j2 + PART_XPOS], 2) +
                  Math.pow(s[j + PART_YPOS] - s[j2 + PART_YPOS], 2) +
                  Math.pow(s[j + PART_ZPOS] - s[j2 + PART_ZPOS], 2)
              );

              // clamp distance to NU_EPSILON
              if (!distance || distance < NU_EPSILON) {
                distance = NU_EPSILON;
              }

              // console.log(distance)

              mult = 1;

              // Constant force towards center
              if (distance < 0.5) {
                s[j + PART_X_FTOT] +=
                  (mult *
                    (s[j + PART_XPOS] - s[j2 + PART_XPOS])) /
                  distance;
                s[j + PART_Y_FTOT] +=
                  (mult *
                    (s[j + PART_YPOS] - s[j2 + PART_YPOS])) /
                  distance;
                s[j + PART_Z_FTOT] +=
                  (mult *
                    (s[j + PART_ZPOS] - s[j2 + PART_ZPOS])) /
                  distance;
              }
            }
          }
        }
        break;
      case F_BOIDS3:
        console.log( "Boids3" );
        // Alignment
        var starter = m;

        var starter = m;
        var j = m * PART_MAXVAR
        for (; m < mmax; m++, j += PART_MAXVAR) {
          var j2 = starter * PART_MAXVAR
          var m2 = starter;
          // console.log(m2)
          var localDirection = new Vector3();
          for (; m2 < mmax; m2++, j2 += PART_MAXVAR) {
            if (m != m2) {
              var distance = Math.sqrt(
                Math.pow(s[j + PART_XPOS] - s[j2 + PART_XPOS], 2) +
                  Math.pow(s[j + PART_YPOS] - s[j2 + PART_YPOS], 2) +
                  Math.pow(s[j + PART_ZPOS] - s[j2 + PART_ZPOS], 2)
              );

              // clamp distance to NU_EPSILON
              if (!distance || distance < NU_EPSILON) {
                distance = NU_EPSILON;
              }
              mult = 100 / mmax;
  
              localDirection.elements[0] += mult * s[j2 + PART_XVEL] / distance;
              localDirection.elements[1] += mult * s[j2 + PART_YVEL] / distance;
              localDirection.elements[2] += mult * s[j2 + PART_ZVEL] / distance;
            }
          }   
          s[j + PART_X_FTOT] += localDirection.elements[0] / mmax;
          s[j + PART_Y_FTOT] += localDirection.elements[1] / mmax;
          s[j + PART_Z_FTOT] += localDirection.elements[2] / mmax;
        }
        break;
      case F_BOIDS4:
        console.log( "Boids4" );
        // Evasion

        // Hardcoded but whatever

        // Counterclockwize in sphere radius 2
        var center = new Vector3();
        center.elements[0] = 0.5;
        center.elements[1] = 0.5;
        center.elements[2] = 0.5;

        var j = m * PART_MAXVAR
        for (; m < mmax; m++, j += PART_MAXVAR) {
          var distance = Math.sqrt(
            Math.pow(s[j + PART_XPOS] - center.elements[0], 2) +
              Math.pow(s[j + PART_YPOS] - center.elements[1], 2) +
              Math.pow(s[j + PART_ZPOS] - center.elements[2], 2)
          );

          // clamp distance to NU_EPSILON
          if (!distance || distance < NU_EPSILON) {
            distance = NU_EPSILON;
          }

          // distance = 1 / distance;

          // console.log(distance)

          mult = 0.5;

          // Constant force towards center
          if (distance < 0.25) {
            s[j + PART_X_FTOT] +=
              (mult *
                (s[j + PART_XPOS] - center.elements[0])) /
              distance;
            s[j + PART_Y_FTOT] += (mult * (s[j + PART_YPOS] - center.elements[1])) / distance;
            s[j + PART_Z_FTOT] += (mult * (s[j + PART_ZPOS] - center.elements[2])) / distance;
          }
        }
        break;
      default:
        console.log(
          "!!!ApplyForces() fSet[",
          k,
          "] invalid forceType:",
          fSet[k].forceType
        );
        break;
    } // switch(fSet[k].forceType)
  } // for(k=0...)
};

PartSys.prototype.dotFinder = function (src, dest) {
  //==============================================================================
  // fill the already-existing 'dest' variable (a float32array) with the
  // time-derivative of given state 'src'.

  var invMass; // inverse mass
  var j = 0; // i==particle number; j==array index for i-th particle
  for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
    dest[j + PART_XPOS] = src[j + PART_XVEL]; // position derivative = velocity
    dest[j + PART_YPOS] = src[j + PART_YVEL];
    dest[j + PART_ZPOS] = src[j + PART_ZVEL];
    dest[j + PART_WPOS] = 0.0; // presume 'w' fixed at 1.0
    // Use 'src' current force-accumulator's values (set by PartSys.applyForces())
    // to find acceleration.  As multiply is FAR faster than divide, do this:
    invMass = 1.0 / src[j + PART_MASS]; // F=ma, so a = F/m, or a = F(1/m);
    dest[j + PART_XVEL] = src[j + PART_X_FTOT] * invMass;
    dest[j + PART_YVEL] = src[j + PART_Y_FTOT] * invMass;
    dest[j + PART_ZVEL] = src[j + PART_Z_FTOT] * invMass;
    dest[j + PART_X_FTOT] = 0.0; // we don't know how force changes with time;
    dest[j + PART_Y_FTOT] = 0.0; // presume it stays constant during timestep.
    dest[j + PART_Z_FTOT] = 0.0;
    dest[j + PART_R] = 0.0; // presume color doesn't change with time.
    dest[j + PART_G] = 0.0;
    dest[j + PART_B] = 0.0;
    dest[j + PART_MASS] = 0.0; // presume mass doesn't change with time.
    dest[j + PART_DIAM] = 0.0; // presume these don't change either...
    dest[j + PART_RENDMODE] = 0.0;
    dest[j + PART_AGE] = 0.0;
  }
};

PartSys.prototype.render = function (s) {
  //==============================================================================
  // Draw the contents of state-vector 's' on-screen. To do this:
  //  a) transfer its contents to the already-existing VBO in the GPU using the
  //      WebGL call 'gl.bufferSubData()', then
  //  b) set all the 'uniform' values needed by our shaders,
  //  c) draw VBO contents using gl.drawArray().

  // CHANGE our VBO's contents:
  gl.bufferSubData(
    gl.ARRAY_BUFFER, // specify the 'binding target': either
    //    gl.ARRAY_BUFFER (VBO holding sets of vertex attribs)
    // or gl.ELEMENT_ARRAY_BUFFER (VBO holding vertex-index values)
    0, // offset: # of bytes to skip at the start of the VBO before
    // we begin data replacement.
    this.s1
  ); // Float32Array data source.

  gl.uniform1i(this.u_runModeID, this.runMode); // run/step/pause the particle system

  // Draw our VBO's new contents:
  gl.drawArrays(
    gl.POINTS, // mode: WebGL drawing primitive to use
    0, // index: start at this vertex in the VBO;
    this.partCount
  ); // draw this many vertices.
};

PartSys.prototype.solver = function () {
  //==============================================================================
  // Find next state s2 from current state s1 (and perhaps some related states
  // such as s1dot, sM, sMdot, etc.) by the numerical integration method chosen
  // by PartSys.solvType.

  // this.doConstraints();
  this.applyForces(this.s2, this.forceList);

  switch (this.solvType) {
    case SOLV_EULER: //--------------------------------------------------------
      // EXPLICIT or 'forward time' solver; Euler Method: s2 = s1 + h*s1dot
      this.dotFinder(this.s2, this.s1dot);

      for (var n = 0; n < this.s1.length; n++) {
        // for all elements in s1,s2,s1dot;
        this.s2[n] = this.s1[n] + this.s1dot[n] * (g_timeStep * 0.001);
      }
      /* // OLD 'BAD' solver never stops bouncing:
  // Compute new position from current position, current velocity, & timestep
  var j = 0;  // i==particle number; j==array index for i-th particle
  for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
      this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
      this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001); 
      this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001); 
                // -- apply acceleration due to gravity to current velocity:
      // 					 s2[PART_YVEL] -= (accel. due to gravity)*(timestep in seconds) 
      //									 -= (9.832 meters/sec^2) * (g_timeStep/1000.0);
      this.s2[j + PART_YVEL] -= this.grav*(g_timeStep*0.001);
      // -- apply drag: attenuate current velocity:
      this.s2[j + PART_XVEL] *= this.drag;
      this.s2[j + PART_YVEL] *= this.drag; 
      this.s2[j + PART_ZVEL] *= this.drag; 
      }
*/
      break;
    case SOLV_OLDGOOD: //-------------------------------------------------------------------
      // IMPLICIT or 'reverse time' solver
      var j = 0;
      for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        // Compute new velocity from current velocity, current acceleration, & timestep
        this.s2[j + PART_XVEL] +=
          this.s2[j + PART_X_FTOT] * (g_timeStep * 0.001);
        this.s2[j + PART_YVEL] +=
          this.s2[j + PART_Y_FTOT] * (g_timeStep * 0.001);
        this.s2[j + PART_ZVEL] +=
          this.s2[j + PART_Z_FTOT] * (g_timeStep * 0.001);

        // Compute new position from current position, current velocity, & timestep
        this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
        this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001);
        this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001);
      }
      // What's the result of this rearrangement?
      //	IT WORKS BEAUTIFULLY! much more stable much more often...
      break;
    case SOLV_MIDPOINT: // Midpoint Method (see lecture notes)
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_ADAMS_BASH: // Adams-Bashforth Explicit Integrator
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_RUNGEKUTTA: // Arbitrary degree, set by 'solvDegree'
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_BACK_EULER: // 'Backwind' or Implicit Euler
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_BACK_MIDPT: // 'Backwind' or Implicit Midpoint
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_BACK_ADBASH: // 'Backwind' or Implicit Adams-Bashforth
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_VERLET: // Verlet semi-implicit integrator;
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_VEL_VERLET: // 'Velocity-Verlet'semi-implicit integrator
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    case SOLV_LEAPFROG: // 'Leapfrog' integrator
      console.log("NOT YET IMPLEMENTED: this.solvType==" + this.solvType);
      break;
    default:
      console.log("?!?! unknown solver: this.solvType==" + this.solvType);
      break;
  }
  return;
};

PartSys.prototype.doConstraints = function ( limitList ) {
  //==============================================================================
  // apply all Climit constraint-causing objects in the limitList array to the
  // particles/movements between current state sNow and future state sNext.

  limitList = limitList || this.limitList; // use default if limitList not given.

  // 'bounce' our ball off floor & walls at +/- 0.9,+/-0.9, +/-0.9
  // where this.bounceType selects constraint type:
  // ==0 for simple velocity-reversal, as in all previous versions
  // ==1 for textbook's collision resolution method, which uses an 'impulse'
  //          to cancel any velocity boost caused by falling below the floor.
  //
  for(var k = 0; k < limitList.length; k++) {  // for every CLimit in limitList array,
//    console.log("limitList[k].limitType:", limitList[k].limitType);
    if(limitList[k].limitType <=0) {     //.................Invalid limit? SKIP IT!
                        // if limitType is LIM_NONE or if limitType was
      continue;         // negated to (temporarily) disable the CLimit object,
      }                 // skip this k-th object in the limitList[] array.
    // ..................................Set up loop for all targeted particles
    // HOW THIS WORKS:
    // Most, but not all CLimit objects apply constraint to many particles, and
    // the CLimit members 'targFirst' and 'targCount' tell us which ones:
    // *IF* targCount == 0, the CLimit applies ONLY to particle numbers e1,e2
    //          (e.g. the e1 particle begins at sNow[this.forceList[k].e1 * PART_MAXVAR])
    // *IF* targCount < 0, apply the CLimit to 'targFirst' and all the rest
    //      of the particles that follow it in the state variables sNow, sNext.
    // *IF* targCount > 0, apply the CForcer to exactly 'targCount' particles,
    //      starting with particle number 'targFirst'
    // Begin by presuming targCount < 0;
    var m = limitList[k].targFirst;    // first targed particle # in the state vars
    var mmax = this.partCount;    // total number of particles in the state vars
                                  // (last particle number we access is mmax-1)
    if(limitList[k].targCount==0){    // ! Apply CLimit to e1,e2 particles only!
      m=mmax=0;   // don't let loop run; apply CLimit to e1,e2 particles only.
      }
    else if(limitList[k].targCount > 0) {   // ?did CLimit say HOW MANY particles?
      // YES! limit applies to 'targCount' particles starting with particle # m:
      var tmp = limitList[k].targCount;
      if(tmp < mmax) mmax = tmp; // (but MAKE SURE mmax doesn't get larger)
      else console.log("\n\n!!PartSys.doConstraints() index error!!\n\n");
      }
      //console.log("m:",m,"mmax:",mmax);
      // m and mmax are now correctly initialized; use them!  
    //......................................Apply limit specified by limitType 
    switch(limitList[k].limitType) {    // what kind of limit should we apply?
      case LIM_VOL:     // The axis-aligned rectangular volume specified by
                        // limitList[k].xMin,xMax,yMin,yMax,zMin,zMax keeps
                        // particles INSIDE if xMin<xMax, yMin<yMax, zMin<zMax
                        //      and OUTSIDE if xMin>xMax, yMin>yMax, zMin>xMax.
        var j = m*PART_MAXVAR;  // state var array index for particle # m

        for(; m<mmax; m++, j+=PART_MAXVAR) { // for every part# from m to mmax-1,
          //--------  left (-X) wall  ----------
          if (this.s2[j + PART_XPOS] < limitList[k].xMin) {
            // && this.s2[j + PART_XVEL] < 0.0 ) {
            // collision!
            this.s2[j + PART_XPOS] = limitList[k].xMin; // 1) resolve contact: put particle at wall.
            this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL]; // 2a) undo velocity change:
            this.s2[j + PART_XVEL] *= this.drag; // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE!
            // need a velocity-sign test here that ensures the 'bounce' step will
            // always send the ball outwards, away from its wall or floor collision.
            if (this.s2[j + PART_XVEL] < 0.0)
              this.s2[j + PART_XVEL] =
                -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
            else this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL]; // sign changed-- don't need another.
          }
          //--------  right (+X) wall  --------------------------------------------
          else if (this.s2[j + PART_XPOS] > limitList[k].xMax) {
            // && this.s2[j + PART_XVEL] > 0.0) {
            // collision!
            this.s2[j + PART_XPOS] = limitList[k].xMax; // 1) resolve contact: put particle at wall.
            this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL]; // 2a) undo velocity change:
            this.s2[j + PART_XVEL] *= this.drag; // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE!
            // need a velocity-sign test here that ensures the 'bounce' step will
            // always send the ball outwards, away from its wall or floor collision.
            if (this.s2[j + PART_XVEL] > 0.0)
              this.s2[j + PART_XVEL] =
                -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
            else this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL]; // sign changed-- don't need another.
          }
          //--------  floor (-Y) wall  --------------------------------------------
          if (this.s2[j + PART_YPOS] < limitList[k].yMin) {
            // && this.s2[j + PART_YVEL] < 0.0) {
            // collision! floor...
            this.s2[j + PART_YPOS] = limitList[k].yMin; // 1) resolve contact: put particle at wall.
            this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL]; // 2a) undo velocity change:
            this.s2[j + PART_YVEL] *= this.drag; // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE!
            // need a velocity-sign test here that ensures the 'bounce' step will
            // always send the ball outwards, away from its wall or floor collision.
            if (this.s2[j + PART_YVEL] < 0.0)
              this.s2[j + PART_YVEL] =
                -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
            else this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL]; // sign changed-- don't need another.
          }
          //--------  ceiling (+Y) wall  ------------------------------------------
          else if (this.s2[j + PART_YPOS] > limitList[k].yMax) {
            // && this.s2[j + PART_YVEL] > 0.0) {
            // collision! ceiling...
            this.s2[j + PART_YPOS] = limitList[k].yMax; // 1) resolve contact: put particle at wall.
            this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL]; // 2a) undo velocity change:
            this.s2[j + PART_YVEL] *= this.drag; // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE!
            // need a velocity-sign test here that ensures the 'bounce' step will
            // always send the ball outwards, away from its wall or floor collision.
            if (this.s2[j + PART_YVEL] > 0.0)
              this.s2[j + PART_YVEL] =
                -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
            else this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL]; // sign changed-- don't need another.
          }
          //--------  near (-Z) wall  ---------------------------------------------
          if (this.s2[j + PART_ZPOS] < limitList[k].zMin) {
            // && this.s2[j + PART_ZVEL] < 0.0 ) {
            // collision!
            this.s2[j + PART_ZPOS] = limitList[k].zMin; // 1) resolve contact: put particle at wall.
            this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL]; // 2a) undo velocity change:
            this.s2[j + PART_ZVEL] *= this.drag; // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
            // need a velocity-sign test here that ensures the 'bounce' step will
            // always send the ball outwards, away from its wall or floor collision.
            if (this.s2[j + PART_ZVEL] < 0.0)
              this.s2[j + PART_ZVEL] =
                -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
            else this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL]; // sign changed-- don't need another.
          }
          //--------  far (+Z) wall  ----------------------------------------------
          else if (this.s2[j + PART_ZPOS] > limitList[k].zMax) {
            // && this.s2[j + PART_ZVEL] > 0.0) {
            // collision!
            this.s2[j + PART_ZPOS] = limitList[k].zMax; // 1) resolve contact: put particle at wall.
            this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL]; // 2a) undo velocity change:
            this.s2[j + PART_ZVEL] *= this.drag; // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
            // need a velocity-sign test here that ensures the 'bounce' step will
            // always send the ball outwards, away from its wall or floor collision.
            if (this.s2[j + PART_ZVEL] > 0.0)
              this.s2[j + PART_ZVEL] =
                -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
            else this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL]; // sign changed-- don't need another.
          } // end of (+Z) wall constraint
        }
        break;
      case LIM_WALL:
        var j = m*PART_MAXVAR;  // state var array index for particle # m
        // Get wall orientation (which xMin,yMin,zMin is the same as their corresponding xMax,yMax,zMax)
        for(; m<mmax; m++, j+=PART_MAXVAR) { // for every part# from m to mmax-1,
          var xMin = limitList[k].xMin;
          var yMin = limitList[k].yMin;
          var zMin = limitList[k].zMin;

          var xMax = limitList[k].xMax;
          var yMax = limitList[k].yMax;
          var zMax = limitList[k].zMax;

          // Get wall normal (which xMin,yMin,zMin is the same as their corresponding xMax,yMax,zMax)
          var wallNormal = new Vector3([xMax - xMin ? 0 : 1, yMax - yMin ? 0 : 1, zMax - zMin ? 0 : 1]);
          var negWallNormal = new Vector3([xMax - xMin ? 0 : -1, yMax - yMin ? 0 : -1, zMax - zMin ? 0 : -1]);

          var wallNormalAxis = wallNormal.elements[0] == 1 ? "x" : wallNormal.elements[1] == 1 ? "y" : "z";


          // wallNormal.normalize();
          // negWallNormal.normalize();

          // Get wall width dimensions (@TODO: Ugly)
          var wallLengthAxis
          var wallWidthAxis
          if (wallNormalAxis == "x") {
            wallLengthAxis = "y";
            wallWidthAxis = "z";
          } else if (wallNormalAxis == "y") {
            wallLengthAxis = "z";
            wallWidthAxis = "x";
          } else if (wallNormalAxis == "z") {
            wallLengthAxis = "x";
            wallWidthAxis = "y";
          }

          // Get wall width and length vectors
          var wallWidth = new Vector3([
            wallWidthAxis == "x" ? xMax - xMin : 0,
            wallWidthAxis == "y" ? yMax - yMin : 0,
            wallWidthAxis == "z" ? zMax - zMin : 0
          ]);
          wallWidthNormal = new Vector3([wallWidth.elements[0], wallWidth.elements[1], wallWidth.elements[2]]);
          wallWidthNormal.normalize()
          wallWidthScalar = wallWidthAxis == "x" ? xMax - xMin : wallWidthAxis == "y" ? yMax - yMin : zMax - zMin;
          var wallLength = new Vector3([
            wallLengthAxis == "x" ? xMax - xMin : 0,
            wallLengthAxis == "y" ? yMax - yMin : 0,
            wallLengthAxis == "z" ? zMax - zMin : 0
          ]);
          wallLengthNormal = new Vector3([wallLength.elements[0], wallLength.elements[1], wallLength.elements[2]]);
          wallLengthNormal.normalize()
          wallLengthScalar = wallLengthAxis == "x" ? xMax - xMin : wallLengthAxis == "y" ? yMax - yMin : zMax - zMin;

          // limitList[k].printMe()
          // console.log(wallNormal.elements);
          // console.log("length")
          // console.log(wallLengthAxis, wallLengthScalar);
          // console.log(wallLengthNormal.elements);
          // console.log("width")
          // console.log(wallWidthAxis, wallWidthScalar);
          // console.log(wallWidthNormal.elements);

          // Wall center
          var wallCenter = new Vector3([
            (xMax + xMin) / 2,
            (yMax + yMin) / 2,
            (zMax + zMin) / 2
          ]);

          // ugh.
          mat1 = new Matrix4();
          var e = mat1.elements
            e[0] = wallLengthNormal.elements[0];    e[4] = wallLengthNormal.elements[1],     e[8] = wallLengthNormal.elements[2],      e[12] = 0,
            e[1] = wallWidthNormal.elements[0];    e[5] = wallWidthNormal.elements[1],     e[9] = wallWidthNormal.elements[2],      e[13] = 0,
            e[2] = wallNormal.elements[0];    e[6] = wallNormal.elements[1],     e[10] = wallNormal.elements[2],     e[14] = 0
            e[3] = 0,                         e[7] = 0,                         e[11] = 0,                          e[15] = 1

          mat2 = new Matrix4();
          e = mat2.elements
          e[0] = 1;                          e[4] = 0,                           e[8] = 0;                            e[12] = -wallCenter.elements[0];
          e[1] = 0;                          e[5] = 1,                           e[9] = 0;                            e[13] = -wallCenter.elements[1];
          e[2] = 0;                          e[6] = 0,                           e[10] = 1;                           e[14] = -wallCenter.elements[2];
          e[3] = 0,    e[7] = 0,     e[11] = 0,     e[15] =1

          var partPosS1 = new Vector4([this.s1[j + PART_XPOS],this.s1[j + PART_YPOS],this.s1[j + PART_ZPOS],1]);
          var partPosS2 = new Vector4([this.s2[j + PART_XPOS],this.s2[j + PART_YPOS],this.s2[j + PART_ZPOS],1]);

          worldToWallS1 = new Matrix4()
          worldToWallS1.set(mat1);
          worldToWallS1 = worldToWallS1.multiply(mat2).multiplyVector4(partPosS1);
          
          worldToWallS2 = new Matrix4()
          worldToWallS2.set(mat1);
          worldToWallS2 = worldToWallS2.multiply(mat2).multiplyVector4(partPosS2);

          S1Velocity = new Vector3([this.s1[j + PART_XVEL],this.s1[j + PART_YVEL],this.s1[j + PART_ZVEL]]);
          S2Velocity = new Vector3([this.s2[j + PART_XVEL],this.s2[j + PART_YVEL],this.s2[j + PART_ZVEL]]);

          // Hit detection:

          // @COMPLETE


          // console.log(worldToWall.elements)

          // if (worldToWallS1.elements[2] > 0 && ( worldToWallS2.elements[2] <= 0 && ( worldToWallS2.elements[0] ** 2 <= wallLengthScalar ** 2 ) && ( worldToWallS2.elements[1] ** 2 <= wallWidthScalar ** 2 ) )) {
          //   // particle moved down thru top
          //   if (S2Velocity.dot(wallNormal) < 0) {
          //     S2Velocity = S2Velocity - (wallNormal * (2 * S2Velocity.dot(wallNormal)))

          //     this.s2[j + PART_XVEL] = 0
          //     this.s2[j + PART_YVEL] = 0
          //     this.s2[j + PART_ZVEL] = 0
          //   }
          // }

          if ((worldToWallS2.elements[0] ** 2 ) <= ( (wallLengthScalar / 2) ** 2 ) && ( worldToWallS2.elements[1] ** 2 ) <= ( (wallWidthScalar / 2) ** 2) ) {
            VNDot = S2Velocity.dot(wallNormal)
            VN = new Vector3([wallNormal.elements[0] * VNDot, wallNormal.elements[1] * VNDot, wallNormal.elements[2] * VNDot])
            VNew = new Vector3([
              S2Velocity.elements[0] - 2 * VN.elements[0],
              S2Velocity.elements[1] - 2 * VN.elements[1],
              S2Velocity.elements[2] - 2 * VN.elements[2]
            ])

            if (worldToWallS1.elements[2] > 0 && worldToWallS2.elements[2] <= 0) {
              // particle moved down thru top
              if (VNDot < 0) {
                this.s2[j + PART_XVEL] = VNew.elements[0]
                this.s2[j + PART_YVEL] = VNew.elements[1]
                this.s2[j + PART_ZVEL] = VNew.elements[2]
              }
            } else if (worldToWallS1.elements[2] <= 0 && worldToWallS2.elements[2] > 0) {
              // particle moved up thru bottom
              if (VNDot > 0) {
                this.s2[j + PART_XVEL] = VNew.elements[0]
                this.s2[j + PART_YVEL] = VNew.elements[1]
                this.s2[j + PART_ZVEL] = VNew.elements[2]
              }
            }
          } else {
            // console.log("??")
          }


          // etc. etc. etc.

        }
        break;
      case LIM_DISC:    // 2-sided ellipsoidal wall, axis-aligned, flat/2D,
                        // zero thickness, any desired size & position
        break;
      case LIM_BOX:
        var boxWalls = []

        // left wall
        leftWall = new CLimit()
        leftWall.limitType = LIM_WALL
        leftWall.xMin = limitList[k].xMin
        leftWall.xMax = limitList[k].xMin
        leftWall.yMin = limitList[k].yMin
        leftWall.yMax = limitList[k].yMax
        leftWall.zMin = limitList[k].zMin
        leftWall.zMax = limitList[k].zMax
        boxWalls.push(leftWall)


        // right wall
        rightWall = new CLimit()
        rightWall.limitType = LIM_WALL
        rightWall.xMin = limitList[k].xMax
        rightWall.xMax = limitList[k].xMax
        rightWall.yMin = limitList[k].yMin
        rightWall.yMax = limitList[k].yMax
        rightWall.zMin = limitList[k].zMin
        rightWall.zMax = limitList[k].zMax
        boxWalls.push(rightWall)


        // top wall
        topWall = new CLimit()
        topWall.limitType = LIM_WALL
        topWall.xMin = limitList[k].xMin
        topWall.xMax = limitList[k].xMax
        topWall.yMin = limitList[k].yMax
        topWall.yMax = limitList[k].yMax
        topWall.zMin = limitList[k].zMin
        topWall.zMax = limitList[k].zMax
        boxWalls.push(topWall)


        // bottom wall
        bottomWall = new CLimit()
        bottomWall.limitType = LIM_WALL
        bottomWall.xMin = limitList[k].xMin
        bottomWall.xMax = limitList[k].xMax
        bottomWall.yMin = limitList[k].yMin
        bottomWall.yMax = limitList[k].yMin
        bottomWall.zMin = limitList[k].zMin
        bottomWall.zMax = limitList[k].zMax
        boxWalls.push(bottomWall)


        // front wall
        frontWall = new CLimit()
        frontWall.limitType = LIM_WALL
        frontWall.xMin = limitList[k].xMin
        frontWall.xMax = limitList[k].xMax
        frontWall.yMin = limitList[k].yMin
        frontWall.yMax = limitList[k].yMax
        frontWall.zMin = limitList[k].zMin
        frontWall.zMax = limitList[k].zMin
        boxWalls.push(frontWall)


        // back wall
        backWall = new CLimit()
        backWall.limitType = LIM_WALL
        backWall.xMin = limitList[k].xMin
        backWall.xMax = limitList[k].xMax
        backWall.yMin = limitList[k].yMin
        backWall.yMax = limitList[k].yMax
        backWall.zMin = limitList[k].zMax
        backWall.zMax = limitList[k].zMax
        backWall.targFirst = 0;
        backWall.partCount = -1;
        boxWalls.push(backWall)

        this.doConstraints(boxWalls)
        break;
      case LIM_MAT_WALL:
        break;
      case LIM_MAT_DISC:
        break;
      case LIM_MAT_BOX:
        break;      
      default:
        console.log("!!!doConstraints() limitList[",k,"] invalid limitType:", limitList[k].limitType);
        break;
    } // switch(limitList[k].limitType)
  } // for(k=0...)
};

PartSys.prototype.step = function () {
  //==============================================================================
  // transfer contents of state-vector s2 into s1.
  this.s1.set(this.s2);
};
