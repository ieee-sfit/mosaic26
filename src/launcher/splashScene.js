import * as THREE from 'three'

/**
 * Initializes and drives the Three.js 3D scene for the CtrlFreak Intro Splash screen.
 * - TRUE SOLID 3D CUBE with all 6 proper surfaces.
 * - ONE CONTINUOUS IMAGE laid seamlessly across the entire visible surface (Top, Left, Right).
 * - Zero artificial borders between faces: continuous, unbroken artwork.
 * - Back and bottom faces mapped with dark industrial titanium chassis.
 * - Illusive depth via floating holographic HUD layer & volumetric energy motes.
 * - Dynamic mouse tilt with relative parallax.
 * - Hyper-speed dive-in on Spacebar/click that plunges through the HUD into the environment.
 * - Violent rotational tumble (720° / 4π) cycling stations at peak speed.
 */
export function initSplashScene(container, onStationChange) {
  let width = container.clientWidth || window.innerWidth
  let height = container.clientHeight || window.innerHeight

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x02050e, 0.018)

  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000)
  camera.position.set(0, 0, 13.0)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.35
  container.appendChild(renderer.domElement)

  // -------------------------------------------------------------
  // TEXTURE ASSETS: FULL-BLEED ENVIRONMENTS & CHASSIS
  // -------------------------------------------------------------
  const texLoader = new THREE.TextureLoader()

  function loadSRGB(path) {
    const tex = texLoader.load(path)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }

  const chassisTex = loadSRGB('/launcher/cubes/chassis.jpg')
  const hudTex = loadSRGB('/launcher/cubes/hud_overlay.png')

  const STATIONS = [
    {
      code: 'ST-01',
      name: 'GOAT ANC',
      color: new THREE.Color(0x00f2fe),
      env: loadSRGB('/launcher/cubes/env_st1.jpg'),
    },
    {
      code: 'ST-02',
      name: 'F1 0-LAG STREAM',
      color: new THREE.Color(0xdc2626),
      env: loadSRGB('/launcher/cubes/env_st2.jpg'),
    },
    {
      code: 'ST-03',
      name: 'eCHALLAN TRACE',
      color: new THREE.Color(0xfacc15),
      env: loadSRGB('/launcher/cubes/env_st3.jpg'),
    },
    {
      code: 'ST-04',
      name: 'AREA 51 MELTDOWN',
      color: new THREE.Color(0x22c55e),
      env: loadSRGB('/launcher/cubes/env_st4.jpg'),
    },
  ]

  let currentStationIdx = 0

  // -------------------------------------------------------------
  // LIGHTING (Studio Diffusion Lighting)
  // -------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
  scene.add(ambientLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
  keyLight.position.set(6, 9, 8)
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6)
  rimLight.position.set(-7, -4, 5)
  scene.add(rimLight)

  // -------------------------------------------------------------
  // SOLID 3D CUBE GEOMETRY: ONE CONTINUOUS IMAGE ACROSS VISIBLE FACES
  // -------------------------------------------------------------
  const cubeRoot = new THREE.Group()
  cubeRoot.position.set(0, -0.35, 0)
  scene.add(cubeRoot)

  const L = 4.2
  const H = L / 2

  // Build the 6-sided solid cube geometry:
  // Front 3 visible faces (+Y, -X, +Z) share ONE continuous image mapped seamlessly
  // Back 3 hidden faces (+X, -Y, -Z) use the dark industrial chassis
  const positions = []
  const uvs = []
  const normals = []

  // Helper to push a quad (2 triangles, 6 vertices)
  function pushQuad(p0, p1, p2, p3, norm, uv0, uv1, uv2, uv3) {
    // Triangle 1: p0, p1, p2
    // Triangle 2: p0, p2, p3
    const pts = [p0, p1, p2, p0, p2, p3]
    const u_list = [uv0, uv1, uv2, uv0, uv2, uv3]
    for (let i = 0; i < 6; i++) {
      positions.push(pts[i][0], pts[i][1], pts[i][2])
      normals.push(norm[0], norm[1], norm[2])
      uvs.push(u_list[i][0], u_list[i][1])
    }
  }

  // --- VISIBLE FRONT FACES (Group 0: 18 vertices, mapped to single continuous image) ---

  // Face 0: Top Face (+Y)
  // Apex: [H, H, -H] -> UV (0.500, 1.000)
  // Top-Left: [-H, H, -H] -> UV (0.000, 0.750)
  // Center: [-H, H, H] -> UV (0.500, 0.500)
  // Top-Right: [H, H, H] -> UV (1.000, 0.750)
  pushQuad(
    [-H, H, -H],
    [-H, H, H],
    [H, H, H],
    [H, H, -H],
    [0, 1, 0],
    [0.0, 0.75],
    [0.5, 0.5],
    [1.0, 0.75],
    [0.5, 1.0]
  )

  // Face 1: Front-Left Face (-X)
  // Top-Left: [-H, H, -H] -> UV (0.000, 0.750)
  // Bottom-Left: [-H, -H, -H] -> UV (0.000, 0.250)
  // Bottom-Center: [-H, -H, H] -> UV (0.500, 0.000)
  // Center: [-H, H, H] -> UV (0.500, 0.500)
  pushQuad(
    [-H, H, -H],
    [-H, -H, -H],
    [-H, -H, H],
    [-H, H, H],
    [-1, 0, 0],
    [0.0, 0.75],
    [0.0, 0.25],
    [0.5, 0.0],
    [0.5, 0.5]
  )

  // Face 2: Front-Right Face (+Z)
  // Center: [-H, H, H] -> UV (0.500, 0.500)
  // Bottom-Center: [-H, -H, H] -> UV (0.500, 0.000)
  // Bottom-Right: [H, -H, H] -> UV (1.000, 0.250)
  // Top-Right: [H, H, H] -> UV (1.000, 0.750)
  pushQuad(
    [-H, H, H],
    [-H, -H, H],
    [H, -H, H],
    [H, H, H],
    [0, 0, 1],
    [0.5, 0.5],
    [0.5, 0.0],
    [1.0, 0.25],
    [1.0, 0.75]
  )

  // --- HIDDEN BACK/BOTTOM FACES (Group 1: 18 vertices, mapped to chassis) ---

  // Face 3: Back-Right Face (+X)
  pushQuad(
    [H, -H, H],
    [H, -H, -H],
    [H, H, -H],
    [H, H, H],
    [1, 0, 0],
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  )

  // Face 4: Bottom Face (-Y)
  pushQuad(
    [-H, -H, -H],
    [H, -H, -H],
    [H, -H, H],
    [-H, -H, H],
    [0, -1, 0],
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  )

  // Face 5: Back-Left Face (-Z)
  pushQuad(
    [H, -H, -H],
    [-H, -H, -H],
    [-H, H, -H],
    [H, H, -H],
    [0, 0, -1],
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  )

  const solidCubeGeom = new THREE.BufferGeometry()
  solidCubeGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  solidCubeGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  solidCubeGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))

  // Front faces material (Single continuous image, zero borders)
  const frontMaterial = new THREE.MeshStandardMaterial({
    map: STATIONS[0].env,
    metalness: 0.15,
    roughness: 0.28,
    side: THREE.FrontSide,
  })

  // Chassis material for back and bottom faces
  const chassisMaterial = new THREE.MeshStandardMaterial({
    map: chassisTex,
    color: 0x64748b,
    metalness: 0.6,
    roughness: 0.35,
    side: THREE.FrontSide,
  })

  // Group 0 (vertices 0-17): Front 3 faces
  solidCubeGeom.addGroup(0, 18, 0)
  // Group 1 (vertices 18-35): Back 3 faces
  solidCubeGeom.addGroup(18, 18, 1)

  const solidCubeMesh = new THREE.Mesh(solidCubeGeom, [frontMaterial, chassisMaterial])
  cubeRoot.add(solidCubeMesh)

  // -------------------------------------------------------------
  // FLOATING HOLOGRAPHIC HUD LAYER (Layered Depth & Stereoscopic Parallax)
  // -------------------------------------------------------------
  // Suspended slightly in front of the cube to create physical parallax depth
  const hudGeom = new THREE.PlaneGeometry(L * 1.05, L * 1.05)
  const hudMaterial = new THREE.MeshBasicMaterial({
    map: hudTex,
    color: STATIONS[0].color,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  const hudMesh = new THREE.Mesh(hudGeom, hudMaterial)
  // Positioned along the isometric camera viewing vector
  hudMesh.position.set(0, 0, 0.45)
  cubeRoot.add(hudMesh)

  // -------------------------------------------------------------
  // VOLUMETRIC BACKGROUND PARTICLE FIELD & GRID FLOOR
  // -------------------------------------------------------------
  const particleCount = 3500
  const particleGeom = new THREE.BufferGeometry()
  const partPos = new Float32Array(particleCount * 3)
  const partCol = new Float32Array(particleCount * 3)

  const palette = [
    new THREE.Color(0xef4444), // red - F1 0-Lag
    new THREE.Color(0x38bdf8), // cyan - GotG Tokamak
    new THREE.Color(0xfacc15), // amber - eChallan Radar
    new THREE.Color(0x22c55e), // emerald - Area 51
    new THREE.Color(0x94a3b8), // slate silver
  ]

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3
    partPos[idx] = (Math.random() - 0.5) * 60
    partPos[idx + 1] = (Math.random() - 0.5) * 45
    partPos[idx + 2] = (Math.random() - 0.5) * 40 - 5

    const c = palette[Math.floor(Math.random() * palette.length)]
    partCol[idx] = c.r
    partCol[idx + 1] = c.g
    partCol[idx + 2] = c.b
  }

  particleGeom.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
  particleGeom.setAttribute('color', new THREE.BufferAttribute(partCol, 3))

  const particleMat = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  })
  const particleSystem = new THREE.Points(particleGeom, particleMat)
  scene.add(particleSystem)

  // Subtle perspective grid floor for deep spatial grounding
  const gridFloor = new THREE.GridHelper(100, 50, 0x1e293b, 0x070b14)
  gridFloor.position.y = -6.8
  gridFloor.material.opacity = 0.22
  gridFloor.material.transparent = true
  scene.add(gridFloor)

  // Floating ambient energy motes around the cube
  const moteCount = 180
  const moteGeom = new THREE.BufferGeometry()
  const motePos = new Float32Array(moteCount * 3)
  for (let i = 0; i < moteCount; i++) {
    const idx = i * 3
    motePos[idx] = (Math.random() - 0.5) * 7.5
    motePos[idx + 1] = (Math.random() - 0.5) * 7.5
    motePos[idx + 2] = (Math.random() - 0.5) * 7.5
  }
  moteGeom.setAttribute('position', new THREE.BufferAttribute(motePos, 3))
  const moteMat = new THREE.PointsMaterial({
    size: 0.13,
    color: STATIONS[0].color,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  })
  const moteSystem = new THREE.Points(moteGeom, moteMat)
  cubeRoot.add(moteSystem)

  // -------------------------------------------------------------
  // ISOMETRIC HERO ALIGNMENT & DYNAMICS
  // -------------------------------------------------------------
  const BASE_ROT_X = 0.615
  const BASE_ROT_Y = 0.7854

  cubeRoot.rotation.x = BASE_ROT_X
  cubeRoot.rotation.y = BASE_ROT_Y

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
  let targetCamZ = 13.0
  let isWarping = false
  let animFrameId = null
  const startTime = performance.now()

  // Violent rotational tumble state machine
  let isTumbling = false
  let tumbleProgress = 0
  let tumbleStartRotX = 0
  let tumbleStartRotY = 0
  let lastStationSwapTime = performance.now()
  const STATION_CYCLE_INTERVAL = 4500

  function onMouseMove(e) {
    const rect = container.getBoundingClientRect()
    const rawX = (e.clientX - rect.left) / rect.width
    const rawY = (e.clientY - rect.top) / rect.height
    mouse.targetX = (rawX - 0.5) * 2
    mouse.targetY = -(rawY - 0.5) * 2
  }

  window.addEventListener('mousemove', onMouseMove)

  function onResize() {
    width = container.clientWidth || window.innerWidth
    height = container.clientHeight || window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  window.addEventListener('resize', onResize)

  /**
   * Violent high-tension 720° tumble, swapping textures at peak speed.
   */
  function triggerViolentSpin() {
    if (isTumbling || isWarping) return
    isTumbling = true
    tumbleProgress = 0
    tumbleStartRotX = cubeRoot.rotation.x
    tumbleStartRotY = cubeRoot.rotation.y

    const nextIdx = (currentStationIdx + 1) % STATIONS.length
    currentStationIdx = nextIdx

    // Swap continuous environment image at peak rotational velocity
    setTimeout(() => {
      const st = STATIONS[nextIdx]
      frontMaterial.map = st.env
      frontMaterial.needsUpdate = true

      hudMaterial.color = st.color
      moteMat.color = st.color
      rimLight.color = st.color

      onStationChange?.(nextIdx)
    }, 280)
  }

  /**
   * High-speed Warp Dive straight into the active station environment.
   */
  function triggerWarp(onComplete) {
    if (isWarping) return
    isWarping = true
    targetCamZ = -8.0 // Plunges through the cube volume

    setTimeout(() => {
      onComplete?.()
    }, 550)
  }

  function animate() {
    animFrameId = requestAnimationFrame(animate)
    const now = performance.now()
    const elapsed = (now - startTime) * 0.001

    // Periodic violent rotation
    if (!isWarping && now - lastStationSwapTime > STATION_CYCLE_INTERVAL) {
      lastStationSwapTime = now
      triggerViolentSpin()
    }

    // Mouse coordinates interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.06
    mouse.y += (mouse.targetY - mouse.y) * 0.06

    // Gentle idle breathing
    const breathPitch = Math.sin(elapsed * 0.8) * 0.025
    const breathYaw = Math.cos(elapsed * 0.6) * 0.035
    const breathFloatY = Math.sin(elapsed * 1.2) * 0.08

    if (isTumbling) {
      // High-speed multi-rotation spin (720 deg)
      tumbleProgress += 0.035
      const t = Math.min(1, tumbleProgress)
      const ease = 1 - Math.pow(1 - t, 4) // high-tension quartic spring

      cubeRoot.rotation.x = tumbleStartRotX + ease * (Math.PI * 2)
      cubeRoot.rotation.y = tumbleStartRotY + ease * (Math.PI * 4)

      if (tumbleProgress >= 1) {
        isTumbling = false
        cubeRoot.rotation.x = BASE_ROT_X
        cubeRoot.rotation.y = BASE_ROT_Y
      }
    } else {
      // Parallax: tilts away from mouse cursor, exposing the 3D surface depth
      const targetRotX = BASE_ROT_X + breathPitch - mouse.y * 0.38
      const targetRotY = BASE_ROT_Y + breathYaw + mouse.x * 0.48

      cubeRoot.rotation.x += (targetRotX - cubeRoot.rotation.x) * 0.08
      cubeRoot.rotation.y += (targetRotY - cubeRoot.rotation.y) * 0.08

      // Micro-parallax on floating HUD layer (moves slightly faster to amplify 3D depth)
      hudMesh.position.x = mouse.x * 0.15
      hudMesh.position.y = mouse.y * 0.15
    }

    cubeRoot.position.y = -0.35 + breathFloatY

    // Energy motes subtle orbit
    moteSystem.rotation.y = elapsed * 0.05
    moteSystem.rotation.z = elapsed * 0.03

    // Camera updates & Warp Dive
    if (isWarping) {
      // Accelerate camera straight through the cube into the environment
      camera.position.z += (targetCamZ - camera.position.z) * 0.14
      camera.position.x += (0 - camera.position.x) * 0.16
      camera.position.y += (-0.35 - camera.position.y) * 0.16

      // Scale up HUD layer outward so it flies past the camera perimeter
      hudMesh.scale.multiplyScalar(1.08)
      hudMaterial.opacity *= 0.94

      // Accelerate background stars into warp speed streaks
      const posAttr = particleGeom.attributes.position
      for (let i = 0; i < particleCount; i++) {
        posAttr.setZ(i, posAttr.getZ(i) + 2.8)
        if (posAttr.getZ(i) > 20) posAttr.setZ(i, -25)
      }
      posAttr.needsUpdate = true
    } else {
      camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.04
      camera.position.y += (mouse.y * 0.3 - camera.position.y) * 0.04
      camera.position.z += (targetCamZ - camera.position.z) * 0.04
      camera.lookAt(0, -0.35, 0)

      particleSystem.rotation.y = elapsed * 0.025
      particleSystem.rotation.x = elapsed * 0.012
    }

    renderer.render(scene, camera)
  }

  animate()

  function dispose() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onResize)
    if (animFrameId) cancelAnimationFrame(animFrameId)
    renderer.dispose()
    solidCubeGeom.dispose()
    chassisTex.dispose()
    hudTex.dispose()
    hudGeom.dispose()
    hudMaterial.dispose()
    STATIONS.forEach((s) => {
      s.env.dispose()
    })
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }

  return {
    triggerWarp,
    dispose,
  }
}
