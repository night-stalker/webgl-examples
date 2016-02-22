// author Alex Artsiomenka aartsiomenka1@student.gsu.edu
// Project 1 Advanced Computer Graphics

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  var vshader = $.ajax({
    url: "shader-vs.glsl",
    async: false
  }).responseText;
  var fshader = $.ajax({
    url: "shader-fs.glsl",
    async: false
  }).responseText;
  if (!initShaders(gl, vshader, fshader)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.2, 0.2, 0.2, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of attribute and uniform variables
  var program = gl.program;
  program.a_Position = gl.getAttribLocation(program, 'a_Position');
  program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
  program.a_TextureCoord = gl.getAttribLocation(program, 'a_TextureCoord');
  program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
  program.u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
  program.dirLightSourceDirection = gl.getUniformLocation(program, 'dirLightSourceDirection');
  program.dirDiffuseLightIntensity = gl.getUniformLocation(program, 'dirDiffuseLightIntensity');
  program.dirSpecularLightIntensity = gl.getUniformLocation(program, 'dirSpecularLightIntensity');
  program.dirAmbientLightIntensity = gl.getUniformLocation(program, 'dirAmbientLightIntensity');
  program.dirLightSourceDirection2 = gl.getUniformLocation(program, 'dirLightSourceDirection2');
  program.dirDiffuseLightIntensity2 = gl.getUniformLocation(program, 'dirDiffuseLightIntensity2');
  program.dirSpecularLightIntensity2 = gl.getUniformLocation(program, 'dirSpecularLightIntensity2');
  program.dirAmbientLightIntensity2 = gl.getUniformLocation(program, 'dirAmbientLightIntensity2');
  program.Kambient = gl.getUniformLocation(program, 'Kambient');
  program.Kdiffuse = gl.getUniformLocation(program, 'Kdiffuse');
  program.Kspecular = gl.getUniformLocation(program, 'Kspecular');
  program.shininess = gl.getUniformLocation(program, 'shininess');

  if (program.a_Position < 0 ||  program.a_Normal < 0 || program.a_TextureCoord < 0 ||
    !program.u_MvpMatrix || !program.u_NormalMatrix ||
    program.dirLightSourceDirection < 0 || program.dirDiffuseLightIntensity < 0 ||
    program.dirSpecularLightIntensity < 0 || program.dirAmbientLightIntensity < 0 ||
    program.Kambient < 0 || program.Kdiffuse < 0 || program.Kspecular < 0 || program.shininess < 0
  ) {
    console.log('attribute, uniform');
    return;
  }

  // Prepare empty buffer objects for vertex coordinates, colors, and normals
  var model = initVertexBuffers(gl, program);
  if (!model) {
    console.log('Failed to set the vertex information');
    return;
  }

  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(45.0, canvas.width/canvas.height, 1.0, 15000.0);
  viewProjMatrix.lookAt(0.0, -500.0, 4000.0, 0.0, -500.0, 0.0, 0.0, 1.0, 0.0);

  // Start reading the OBJ file
  readOBJFile('g_char.obj', gl, model, 60, true);

  var objTexture = initTexture(gl);

  var currentAngle = 0.0; // Current rotation angle [degree]
  var tick = function() {   // Start drawing
    currentAngle = animate(currentAngle); // Update current rotation angle
    draw(gl, gl.program, currentAngle, viewProjMatrix, model, objTexture);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

// Create an buffer object and perform an initial configuration
function initVertexBuffers(gl, program) {
  var o = new Object(); // Utilize Object object to return multiple buffer objects
  o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
  o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
  o.textureBuffer = createEmptyArrayBuffer(gl, program.a_TextureCoord, 2, gl.FLOAT);
  o.indexBuffer = gl.createBuffer();
  if (!o.vertexBuffer || !o.normalBuffer || !o.textureBuffer || !o.indexBuffer) { return null; }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
  var buffer =  gl.createBuffer();  // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);  // Assign the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);  // Enable the assignment

  return buffer;
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//
function initTexture(gl) {
  var objTexture = gl.createTexture();
  objImage = new Image();
  objImage.onload = function() { handleTextureLoaded(gl, objImage, objTexture); }
  objImage.src = "g_char.png";
  return objTexture;
}

function handleTextureLoaded(gl, image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
    gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

var g_objDoc = null;      // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D model

// Read a file
function readOBJFile(fileName, gl, model, scale, reverse) {
  var objFileContent = $.ajax({
      url: fileName,
      async: false
    }).responseText;
  onReadOBJFile(objFileContent, fileName, gl, model, scale, reverse);
}

// OBJ File has been read
function onReadOBJFile(fileString, fileName, gl, o, scale, reverse) {
  var objDoc = new OBJDoc(fileName);  // Create a OBJDoc object
  var result = objDoc.parse(fileString, scale, reverse); // Parse the file
  if (!result) {
    g_objDoc = null; g_drawingInfo = null;
    console.log("OBJ file parsing error.");
    return;
  }
  g_objDoc = objDoc;
}

// Coordinate transformation matrix
var g_modelMatrix = new Matrix4();
var g_mvpMatrix = new Matrix4();
var g_normalMatrix = new Matrix4();


function draw(gl, program, angle, viewProjMatrix, model, objTexture) {
  if (g_objDoc != null && g_objDoc.isMTLComplete()){ // OBJ and all MTLs are available
    g_drawingInfo = onReadComplete(gl, model, g_objDoc);
    g_objDoc = null;
  }
  if (!g_drawingInfo) return;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // Clear color and depth buffers


  g_modelMatrix.setRotate(angle, 1.0, 0.0, 0.0);
  g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);
  g_modelMatrix.rotate(angle, 0.0, 0.0, 1.0);


  // Calculate the normal transformation matrix and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

  // Calculate the model view project matrix and pass it to u_MvpMatrix
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

  // surface material
  var mat = g_drawingInfo.mat;
  gl.uniform4f(program.Kambient, mat.Ka[0], mat.Ka[1], mat.Ka[2], mat.Ka[3]);
  gl.uniform4f(program.Kdiffuse,  mat.Kd[0], mat.Kd[1], mat.Kd[2], mat.Kd[3]);
  gl.uniform4f(program.Kspecular, mat.Ks[0], mat.Ks[1], mat.Ks[2], mat.Ks[3]);
  gl.uniform1f(program.shininess, mat.s);

// directed light 1 red
  gl.uniform4f(program.dirAmbientLightIntensity, 0.1, 0.1, 0.1, 1.0);
  gl.uniform4f(program.dirDiffuseLightIntensity, 0.2, 0.2, 0.2, 1.0);
  gl.uniform4f(program.dirSpecularLightIntensity, 0.7, 0.0, 0.0, 1.0);
  gl.uniform4f(program.dirLightSourceDirection, 0.0, 0.5, 1.0, 0.0);

  // directed light 2 blue
  gl.uniform4f(program.dirAmbientLightIntensity2, 0.1, 0.1, 0.1, 1.0);
  gl.uniform4f(program.dirDiffuseLightIntensity2, 0.2, 0.2, 0.2, 1.0);
  gl.uniform4f(program.dirSpecularLightIntensity2, 0.0, 0.0, 0.7, 1.0);
  gl.uniform4f(program.dirLightSourceDirection2, 0.0, -0.4, 1.0, 0.0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, objTexture);
  gl.uniform1i(gl.getUniformLocation(program, "uSampler"), 0);

  // Draw
  gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
}

// OBJ File has been read compreatly
function onReadComplete(gl, model, objDoc) {
  // Acquire the vertex coordinates and colors from OBJ file
  var drawingInfo = objDoc.getDrawingInfo();
  drawingInfo.mat = objDoc.mtls[0].materials[0];

  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.textureCoords, gl.STATIC_DRAW);

  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

  return drawingInfo;
}

var ANGLE_STEP = 30;   // The increments of rotation angle (degrees)

var last = Date.now(); // Last time that this function was called
function animate(angle) {
  var now = Date.now();   // Calculate the elapsed time
  var elapsed = now - last;
  last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}

//------------------------------------------------------------------------------
// OBJParser
//------------------------------------------------------------------------------

// OBJDoc object
// Constructor
var OBJDoc = function(fileName) {
  this.fileName = fileName;
  this.mtls = new Array(0);      // Initialize the property for MTL
  this.objects = new Array(0);   // Initialize the property for Object
  this.vertices = new Array(0);  // Initialize the property for Vertex
  this.normals = new Array(0);   // Initialize the property for Normal
  this.textureCoords = new Array(0);   // Initialize the property for Texture Coordinates
}

// Parsing the OBJ file
OBJDoc.prototype.parse = function(fileString, scale, reverse) {
  var lines = fileString.split('\n');  // Break up into lines and store them as array
  lines.push(null); // Append null
  var index = 0;    // Initialize index of line

  var currentObject = null;
  var currentMaterialName = "";

  // Parse line by line
  var line;         // A string in the line to be parsed
  var sp = new StringParser();  // Create StringParser
  while ((line = lines[index++]) != null) {
    sp.init(line);                  // init StringParser
    var command = sp.getWord();     // Get command
    if(command == null)	 continue;  // check null command

    switch(command){
      case '#':
        continue;  // Skip comments
      case 'mtllib':     // Read Material chunk
        var path = this.parseMtllib(sp, this.fileName);
        var mtl = new MTLDoc();   // Create MTL instance
        this.mtls.push(mtl);
        var mtlContent = $.ajax({
          url: path,
          async: false
        }).responseText;
        onReadMTLFile(mtlContent, mtl);
        continue; // Go to the next line
      case 'o':
      case 'g':   // Read Object name
        var object = this.parseObjectName(sp);
        this.objects.push(object);
        currentObject = object;
        continue; // Go to the next line
      case 'v':   // Read vertex
        var vertex = this.parseVertex(sp, scale);
        this.vertices.push(vertex);
        continue; // Go to the next line
      case 'vn':   // Read normal
        var normal = this.parseNormal(sp);
        this.normals.push(normal);
        continue; // Go to the next line
      case 'vt':   // Read normal
        var textureCoord = this.parseTextureCoord(sp);
        this.textureCoords.push(textureCoord);
        continue; // Go to the next line
      case 'usemtl': // Read Material name
        currentMaterialName = this.parseUsemtl(sp);
        continue; // Go to the next line
      case 'f': // Read face
        var face = this.parseFace(sp, currentMaterialName, this.vertices, reverse);
        currentObject.addFace(face);
        continue; // Go to the next line
    }
  }

  return true;
}

OBJDoc.prototype.parseMtllib = function(sp, fileName) {
  // Get directory path
  var i = fileName.lastIndexOf("/");
  var dirPath = "";
  if(i > 0) dirPath = fileName.substr(0, i+1);

  return dirPath + sp.getWord();   // Get path
}

OBJDoc.prototype.parseObjectName = function(sp) {
  var name = sp.getWord();
  return (new OBJObject(name));
}

OBJDoc.prototype.parseVertex = function(sp, scale) {
  var x = sp.getFloat() * scale;
  var y = sp.getFloat() * scale;
  var z = sp.getFloat() * scale;
  return (new Vertex(x, y, z));
}

OBJDoc.prototype.parseNormal = function(sp) {
  var x = sp.getFloat();
  var y = sp.getFloat();
  var z = sp.getFloat();
  return (new Normal(x, y, z));
}

OBJDoc.prototype.parseTextureCoord = function(sp) {
  var s = sp.getFloat();
  var t = sp.getFloat();
  return (new TextureCoord(s, t));
}

OBJDoc.prototype.parseUsemtl = function(sp) {
  return sp.getWord();
}

OBJDoc.prototype.parseFace = function(sp, materialName, vertices, reverse) {
  var face = new Face(materialName);
  // get indices
  for(;;){
    var word = sp.getWord();
    if(word == null) break;
    var subWords = word.split('/');
    if(subWords.length >= 1){
      var vi = parseInt(subWords[0]) - 1;
      face.vIndices.push(vi);
    }
    if(subWords.length >= 3){
      var ni = parseInt(subWords[2]) - 1;
      var ti = parseInt(subWords[1]) - 1;
      face.nIndices.push(ni);
      face.tIndices.push(ti);
    }else{
      face.nIndices.push(-1);
    }
  }

  // calc normal
  var v0 = [
    vertices[face.vIndices[0]].x,
    vertices[face.vIndices[0]].y,
    vertices[face.vIndices[0]].z];
  var v1 = [
    vertices[face.vIndices[1]].x,
    vertices[face.vIndices[1]].y,
    vertices[face.vIndices[1]].z];
  var v2 = [
    vertices[face.vIndices[2]].x,
    vertices[face.vIndices[2]].y,
    vertices[face.vIndices[2]].z];


  var normal = calcNormal(v0, v1, v2);

  if (normal == null) {
    if (face.vIndices.length >= 4) {
      var v3 = [
        vertices[face.vIndices[3]].x,
        vertices[face.vIndices[3]].y,
        vertices[face.vIndices[3]].z];
      normal = calcNormal(v1, v2, v3);
    }
    if(normal == null){
      normal = [0.0, 1.0, 0.0];
    }
  }
  if(reverse){
    normal[0] = -normal[0];
    normal[1] = -normal[1];
    normal[2] = -normal[2];
  }
  face.normal = new Normal(normal[0], normal[1], normal[2]);

  // Devide to triangles if face contains over 3 points.
  if(face.vIndices.length > 3){
    var n = face.vIndices.length - 2;
    var newVIndices = new Array(n * 3);
    var newNIndices = new Array(n * 3);
    for(var i=0; i<n; i++){
      newVIndices[i * 3 + 0] = face.vIndices[0];
      newVIndices[i * 3 + 1] = face.vIndices[i + 1];
      newVIndices[i * 3 + 2] = face.vIndices[i + 2];
      newNIndices[i * 3 + 0] = face.nIndices[0];
      newNIndices[i * 3 + 1] = face.nIndices[i + 1];
      newNIndices[i * 3 + 2] = face.nIndices[i + 2];
    }
    face.vIndices = newVIndices;
    face.nIndices = newNIndices;
  }
  face.numIndices = face.vIndices.length;

  return face;
}

// Analyze the material file
function onReadMTLFile(fileString, mtl) {
  var lines = fileString.split('\n');  // Break up into lines and store them as array
  lines.push(null);           // Append null
  var index = 0;              // Initialize index of line

  // Parse line by line
  var line;      // A string in the line to be parsed
  var name = ""; // Material name
  var sp = new StringParser();  // Create StringParser
  while ((line = lines[index++]) != null) {
    sp.init(line);                  // init StringParser
    var command = sp.getWord();     // Get command
    if(command == null)	 continue;  // check null command

    switch(command){
      case '#':
        continue;    // Skip comments
      case 'newmtl': // Read Material chunk
        name = mtl.parseNewmtl(sp); // Get name
        var Kd = null;
        var Ka = null;
        var Ks = null;
        var s = -1.0;
        continue; // Go to the next line
      case 'Kd':   // Read normal
        if(name == "") continue; // Go to the next line because of Error
        Kd  = mtl.parseK(sp);
        continue; // Go to the next line
      case 'Ka':
        if(name == "") continue; // Go to the next line because of Error
        Ka  = mtl.parseK(sp);
        continue; // Go to the next line
      case 'Ks':
        if(name == "") continue; // Go to the next line because of Error
        Ks  = mtl.parseK(sp);
        continue; // Go to the next line
      case 'Ns':
        if(name == "") continue; // Go to the next line because of Error
        s  = sp.getFloat();
        continue; // Go to the next line
    }
    if (Kd != null && Ks != null && Ka != null && s >= 0) {
      var m = new Material(name, Ka, Kd, Ks, s);
      mtl.materials.push(m);
      name = "";
      Kd = null;
      Ka = null;
      Ks = null;
      s = -1.0;
    }
  }
  mtl.complete = true;
}

// Check Materials
OBJDoc.prototype.isMTLComplete = function() {
  if(this.mtls.length == 0) return true;
  for(var i = 0; i < this.mtls.length; i++){
    if(!this.mtls[i].complete) return false;
  }
  return true;
}

//------------------------------------------------------------------------------
// Retrieve the information for drawing 3D model
OBJDoc.prototype.getDrawingInfo = function() {
  // Create an arrays for vertex coordinates, normals, colors, and indices
  var numIndices = 0;
  for(var i = 0; i < this.objects.length; i++){
    numIndices += this.objects[i].numIndices;
  }
  var numVertices = numIndices;
  var vertices = new Float32Array(numVertices * 3);
  var normals = new Float32Array(numVertices * 3);
  var textureCoords = new Float32Array(numVertices * 2);
  var indices = new Uint16Array(numIndices);

  // Set vertex, normal and color
  var index_indices = 0;
  for(var i = 0; i < this.objects.length; i++){
    var object = this.objects[i];
    for(var j = 0; j < object.faces.length; j++){
      var face = object.faces[j];

      var faceNormal = face.normal;
      for(var k = 0; k < face.vIndices.length; k++){
        // Set index
        indices[index_indices] = index_indices;
        // Copy vertex
        var vIdx = face.vIndices[k];
        var tIdx = face.tIndices[k];
        var vertex = this.vertices[vIdx];
        var textureCoord = this.textureCoords[tIdx];
        vertices[index_indices * 3 + 0] = vertex.x;
        vertices[index_indices * 3 + 1] = vertex.y;
        vertices[index_indices * 3 + 2] = vertex.z;
        // Copy color
        textureCoords[index_indices * 2 + 0] = textureCoord.s;
        textureCoords[index_indices * 2 + 1] = textureCoord.t;
        // Copy normal
        var nIdx = face.nIndices[k];
        if(nIdx >= 0){
          var normal = this.normals[nIdx];
          normals[index_indices * 3 + 0] = normal.x;
          normals[index_indices * 3 + 1] = normal.y;
          normals[index_indices * 3 + 2] = normal.z;
        }else{
          normals[index_indices * 3 + 0] = faceNormal.x;
          normals[index_indices * 3 + 1] = faceNormal.y;
          normals[index_indices * 3 + 2] = faceNormal.z;
        }
        index_indices ++;
      }
    }
  }

  return new DrawingInfo(vertices, normals, textureCoords, indices);
}

//------------------------------------------------------------------------------
// MTLDoc Object
//------------------------------------------------------------------------------
var MTLDoc = function() {
  this.complete = false; // MTL is configured correctly
  this.materials = new Array(0);
}

MTLDoc.prototype.parseNewmtl = function(sp) {
  return sp.getWord();         // Get name
}

MTLDoc.prototype.parseRGB = function(sp) {
  var r = sp.getFloat();
  var g = sp.getFloat();
  var b = sp.getFloat();
  return (new Color(r, g, b, 1));
}

MTLDoc.prototype.parseK = function(sp) {
  var r = sp.getFloat();
  var g = sp.getFloat();
  var b = sp.getFloat();
  var a = 1.0;
  return [r, g, b, a];
}

//------------------------------------------------------------------------------
// Material Object
//------------------------------------------------------------------------------
var Material = function(name, Ka, Kd, Ks, s) {
  this.name = name;
  this.Ka = Ka;
  this.Kd = Kd;
  this.Ks = Ks;
  this.s = s;
}

//------------------------------------------------------------------------------
// Vertex Object
//------------------------------------------------------------------------------
var Vertex = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

//------------------------------------------------------------------------------
// Normal Object
//------------------------------------------------------------------------------
var Normal = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

//------------------------------------------------------------------------------
// Color Object
//------------------------------------------------------------------------------
var Color = function(r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
}

//------------------------------------------------------------------------------
// Texture Coordinate Object
//------------------------------------------------------------------------------
var TextureCoord = function(s, t) {
  this.s = s;
  this.t = t;
}

//------------------------------------------------------------------------------
// OBJObject Object
//------------------------------------------------------------------------------
var OBJObject = function(name) {
  this.name = name;
  this.faces = new Array(0);
  this.numIndices = 0;
}

OBJObject.prototype.addFace = function(face) {
  this.faces.push(face);
  this.numIndices += face.numIndices;
}

//------------------------------------------------------------------------------
// Face Object
//------------------------------------------------------------------------------
var Face = function(materialName) {
  this.materialName = materialName;
  if(materialName == null)  this.materialName = "";
  this.vIndices = new Array(0);
  this.tIndices = new Array(0);
  this.nIndices = new Array(0);
}

//------------------------------------------------------------------------------
// DrawInfo Object
//------------------------------------------------------------------------------
var DrawingInfo = function(vertices, normals, textureCoords, indices) {
  this.vertices = vertices;
  this.normals = normals;
  this.textureCoords = textureCoords;
  this.indices = indices;
}

//------------------------------------------------------------------------------
// Constructor
var StringParser = function(str) {
  this.str;   // Store the string specified by the argument
  this.index; // Position in the string to be processed
  this.init(str);
}
// Initialize StringParser object
StringParser.prototype.init = function(str){
  this.str = str;
  this.index = 0;
}

// Skip delimiters
StringParser.prototype.skipDelimiters = function()  {
  for(var i = this.index, len = this.str.length; i < len; i++){
    var c = this.str.charAt(i);
    // Skip TAB, Space, '(', ')
    if (c == '\t'|| c == ' ' || c == '(' || c == ')' || c == '"') continue;
    break;
  }
  this.index = i;
}

// Skip to the next word
StringParser.prototype.skipToNextWord = function() {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  this.index += (n + 1);
}

// Get word
StringParser.prototype.getWord = function() {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  if (n == 0) return null;
  var word = this.str.substr(this.index, n);
  this.index += (n + 1);

  return word;
}

// Get integer
StringParser.prototype.getInt = function() {
  return parseInt(this.getWord());
}

// Get floating number
StringParser.prototype.getFloat = function() {
  return parseFloat(this.getWord());
}

// Get the length of word
function getWordLength(str, start) {
  var n = 0;
  for(var i = start, len = str.length; i < len; i++){
    var c = str.charAt(i);
    if (c == '\t'|| c == ' ' || c == '(' || c == ')' || c == '"')
      break;
  }
  return i - start;
}

//------------------------------------------------------------------------------
// Common function
//------------------------------------------------------------------------------
function calcNormal(p0, p1, p2) {
  // v0: a vector from p1 to p0, v1; a vector from p1 to p2
  var v0 = new Float32Array(3);
  var v1 = new Float32Array(3);
  for (var i = 0; i < 3; i++){
    v0[i] = p0[i] - p1[i];
    v1[i] = p2[i] - p1[i];
  }

  // The cross product of v0 and v1
  var c = new Float32Array(3);
  c[0] = v0[1] * v1[2] - v0[2] * v1[1];
  c[1] = v0[2] * v1[0] - v0[0] * v1[2];
  c[2] = v0[0] * v1[1] - v0[1] * v1[0];

  // Normalize the result
  var v = new Vector3(c);
  v.normalize();
  return v.elements;
}