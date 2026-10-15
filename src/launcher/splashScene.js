import * as THREE from 'three'

/**
 * Initializes and drives the Three.js 3D scene for the CtrlFreak Intro Splash screen.
 * Implements the "Centered Y" Screen-Space Camera Projection Mapping inside an isometric room:
 * - 3 Interior Faces (Left Wall, Right Wall, Floor) meeting at a centered "Y" junction.
 * - Single image with centered Y-perspective projected onto the 3 interior planes.
 * - Texture overscan (12% bleed) so mouse parallax reveals more texture instead of void.
 * - Solid industrial chassis outer hull enclosing the block.
 * - Mouse movement tilts the room in true 3D, causing the baseboards and walls to shift with real depth.
 * - Uncluttered, sparse 3,500-particle starfield in deep volumetric space.
 * - Warp dive that plunges camera straight into the center of the room.
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
  // TEXTURES: CENTERED "Y" ROOM ASSETS
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

  // The perfectly aligned "Centered Y" sci-fi mainframe placeholder
  const STATIONS = [
    {
      code: 'ST-01',
      name: 'GOAT ANC',
      color: new THREE.Color(0x00f2fe),
      roomTex: loadSRGB('/launcher/cubes/scifi_room_raw.jpg'),
    },
    {
      code: 'ST-02',
      name: 'F1 0-LAG STREAM',
      color: new THREE.Color(0xdc2626),
      roomTex: loadSRGB('/launcher/cubes/env_st2.jpg'),
    },
    {
      code: 'ST-03',
      name: 'eCHALLAN TRACE',
      color: new THREE.Color(0xfacc15),
      roomTex: loadSRGB('/launcher/cubes/env_st3.jpg'),
    },
    {
      code: 'ST-04',
      name: 'AREA 51 MELTDOWN',
      color: new THREE.Color(0x22c55e),
      roomTex: loadSRGB('/launcher/cubes/env_st4.jpg'),
    },
  ]

  let currentStationIdx = 0

  // -------------------------------------------------------------
  // LIGHTING
  // -------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
  scene.add(ambientLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5)
  keyLight.position.set(6, 9, 8)
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x00f2fe, 0.6)
  rimLight.position.set(-7, -4, 5)
  scene.add(rimLight)

  // -------------------------------------------------------------
  // "CENTERED Y" 3D ISOMETRIC ROOM GEOMETRY
  // -------------------------------------------------------------
  const cubeRoot = new THREE.Group()
  // Offset slightly to center the visual Y junction on screen
  cubeRoot.position.set(0, -0.2, 0)
  scene.add(cubeRoot)

  const L = 4.2 // Room side dimension

  // UV projection with 12% overscan bleed
  // Formula: u' = (u - 0.5) * s + 0.5
  const s = 0.82
  function bleedUV(u, v) {
    return [(u - 0.5) * s + 0.5, (v - 0.5) * s + 0.5]
  }

  const uvCenter = bleedUV(0.5, 0.5)
  const uvTopCenter = bleedUV(0.5, 1.0)
  const uvTopLeft = bleedUV(0.0, 0.75)
  const uvBottomLeft = bleedUV(0.0, 0.25)
  const uvTopRight = bleedUV(1.0, 0.75)
  const uvBottomRight = bleedUV(1.0, 0.25)
  const uvFloorFront = bleedUV(0.5, 0.0)

  const positions = []
  const uvs = []
  const normals = []

  function pushQuad(p0, p1, p2, p3, norm, uv0, uv1, uv2, uv3) {
    const pts = [p0, p1, p2, p0, p2, p3]
    const u_list = [uv0, uv1, uv2, uv0, uv2, uv3]
    for (let i = 0; i < 6; i++) {
      positions.push(pts[i][0], pts[i][1], pts[i][2])
      normals.push(norm[0], norm[1], norm[2])
      uvs.push(u_list[i][0], u_list[i][1])
    }
  }

  // --- GROUP 0: THE 3 INTERIOR ROOM SURFACES (Left Wall, Right Wall, Floor) ---

  // 1. Left Wall (in plane Z=0, normal pointing into room [0, 0, 1])
  // Corners: Corner [0,0,0], Top-Center [0,L,0], Top-Left [-L,L,0], Bottom-Left [-L,0,0]
  pushQuad(
    [0, 0, 0],
    [0, L, 0],
    [-L, L, 0],
    [-L, 0, 0],
    [0, 0, 1],
    uvCenter,
    uvTopCenter,
    uvTopLeft,
    uvBottomLeft
  )

  // 2. Right Wall (in plane X=0, normal pointing into room [-1, 0, 0])
  // Corners: Corner [0,0,0], Bottom-Right [0,0,L], Top-Right [0,L,L], Top-Center [0,L,0]
  pushQuad(
    [0, 0, 0],
    [0, 0, L],
    [0, L, L],
    [0, L, 0],
    [-1, 0, 0],
    uvCenter,
    uvBottomRight,
    uvTopRight,
    uvTopCenter
  )

  // 3. Floor (in plane Y=0, normal pointing into room [0, 1, 0])
  // Corners: Corner [0,0,0], Bottom-Left [-L,0,0], Floor-Front [-L,0,L], Bottom-Right [0,0,L]
  pushQuad(
    [0, 0, 0],
    [-L, 0, 0],
    [-L, 0, L],
    [0, 0, L],
    [0, 1, 0],
    uvCenter,
    uvBottomLeft,
    uvFloorFront,
    uvBottomRight
  )

  // --- GROUP 1: SOLID CHASSIS ENCLOSURE (Back walls & Outer hull) ---
  const T = 0.12 // Outer thickness

  // Outer Back Wall (behind Left Wall at Z = -T)
  pushQuad(
    [-L - T, -T, -T],
    [-L - T, L + T, -T],
    [T, L + T, -T],
    [T, -T, -T],
    [0, 0, -1],
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0]
  )

  // Outer Side Wall (behind Right Wall at X = T)
  pushQuad(
    [T, -T, -T],
    [T, L + T, -T],
    [T, L + T, L + T],
    [T, -T, L + T],
    [1, 0, 0],
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0]
  )

  // Outer Bottom Floor (under Floor at Y = -T)
  pushQuad(
    [-L - T, -T, L + T],
    [T, -T, L + T],
    [T, -T, -T],
    [-L - T, -T, -T],
    [0, -1, 0],
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  )

  const roomGeom = new THREE.BufferGeometry()
  roomGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  roomGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  roomGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))

  // Group 0: 3 inside room faces (18 vertices)
  roomGeom.addGroup(0, 18, 0)
  // Group 1: 3 outer chassis faces (18 vertices)
  roomGeom.addGroup(18, 18, 1)

  const roomMaterial = new THREE.MeshStandardMaterial({
    map: STATIONS[0].roomTex,
    metalness: 0.12,
    roughness: 0.35,
    side: THREE.FrontSide,
  })

  const chassisMaterial = new THREE.MeshStandardMaterial({
    map: chassisTex,
    color: 0x475569,
    metalness: 0.7,
    roughness: 0.3,
    side: THREE.FrontSide,
  })

  const roomMesh = new THREE.Mesh(roomGeom, [roomMaterial, chassisMaterial])
  cubeRoot.add(roomMesh)

  // -------------------------------------------------------------
  // VOLUMETRIC BACKGROUND PARTICLES (Initial Sparse, Deep Frustum Field)
  // -------------------------------------------------------------
  const particleCount = 3500
  const particleGeom = new THREE.BufferGeometry()
  const partPos = new Float32Array(particleCount * 3)
  const partCol = new Float32Array(particleCount * 3)

  const palette = [
    new THREE.Color(0xef4444), // red
    new THREE.Color(0x38bdf8), // cyan
    new THREE.Color(0xfacc15), // amber
    new THREE.Color(0x22c55e), // emerald
    new THREE.Color(0x64748b), // slate
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
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  })

  const particleSystem = new THREE.Points(particleGeom, particleMat)
  scene.add(particleSystem)

  // -------------------------------------------------------------
  // ISOMETRIC HERO ALIGNMENT & STATE
  // -------------------------------------------------------------
  // Pitch ~35.26° (atan(1/sqrt(2))), Yaw 45°: Perfectly aligns the 3 interior planes to the screen Y
  const BASE_ROT_X = 0.61548
  const BASE_ROT_Y = 0.785398

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

    setTimeout(() => {
      const st = STATIONS[nextIdx]
      roomMaterial.map = st.roomTex
      roomMaterial.needsUpdate = true
      rimLight.color = st.color

      onStationChange?.(nextIdx)
    }, 280)
  }

  /**
   * High-speed Warp Dive straight into the center of the room.
   */
  function triggerWarp(onComplete) {
    if (isWarping) return
    isWarping = true
    targetCamZ = -6.0

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
    const breathPitch = Math.sin(elapsed * 0.8) * 0.02
    const breathYaw = Math.cos(elapsed * 0.6) * 0.028
    const breathFloatY = Math.sin(elapsed * 1.2) * 0.06

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
      // Parallax: tilts away from mouse cursor, exposing the 3D room's physical depth
      const targetRotX = BASE_ROT_X + breathPitch - mouse.y * 0.32
      const targetRotY = BASE_ROT_Y + breathYaw + mouse.x * 0.42

      cubeRoot.rotation.x += (targetRotX - cubeRoot.rotation.x) * 0.08
      cubeRoot.rotation.y += (targetRotY - cubeRoot.rotation.y) * 0.08
    }

    cubeRoot.position.y = -0.2 + breathFloatY

    // Camera updates & Warp Dive
    if (isWarping) {
      // Accelerate camera straight through the room
      camera.position.z += (targetCamZ - camera.position.z) * 0.14
      camera.position.x += (0 - camera.position.x) * 0.16
      camera.position.y += (-0.2 - camera.position.y) * 0.16

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
      camera.lookAt(0, -0.2, 0)

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
    roomGeom.dispose()
    chassisTex.dispose()
    roomMaterial.dispose()
    chassisMaterial.dispose()
    particleGeom.dispose()
    particleMat.dispose()
    STATIONS.forEach((s) => {
      s.roomTex.dispose()
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
