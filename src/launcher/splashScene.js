import * as THREE from 'three'

/**
 * Initializes and drives the Three.js 3D scene for the CtrlFreak Intro Splash screen.
 * - TRUE SOLID 3D CUBE with all 6 proper surfaces (zero CAD wireframes, zero lines).
 * - Correctly rectified face textures for Top, Front-Left, and Front-Right surfaces.
 * - The textures mapped onto the solid cube's surfaces create intense Trompe-l'œil illusive depth.
 * - Full industrial chassis panels on the remaining faces (back & bottom).
 * - Interactive mouse tilt revealing real 3D perspective foreshortening.
 * - High-tension violent rotational tumble (720° / 4π) swapping stations at peak speed.
 * - Warp dive on Spacebar/click into the active station chamber.
 */
export function initSplashScene(container, onStationChange) {
  let width = container.clientWidth || window.innerWidth
  let height = container.clientHeight || window.innerHeight

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x02050e, 0.02)

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
  // STATION GALLERY METADATA & RECTIFIED SURFACE TEXTURES
  // -------------------------------------------------------------
  const texLoader = new THREE.TextureLoader()

  function loadSRGBTexture(path) {
    const tex = texLoader.load(path)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }

  const chassisTex = loadSRGBTexture('/launcher/cubes/chassis.jpg')

  const STATIONS = [
    {
      code: 'ST-01',
      name: 'GOAT ANC',
      color: new THREE.Color(0x00f2fe),
      top: loadSRGBTexture('/launcher/cubes/st1_top.jpg'),
      left: loadSRGBTexture('/launcher/cubes/st1_left.jpg'),
      right: loadSRGBTexture('/launcher/cubes/st1_right.jpg'),
    },
    {
      code: 'ST-02',
      name: 'F1 0-LAG STREAM',
      color: new THREE.Color(0xdc2626),
      top: loadSRGBTexture('/launcher/cubes/st2_top.jpg'),
      left: loadSRGBTexture('/launcher/cubes/st2_left.jpg'),
      right: loadSRGBTexture('/launcher/cubes/st2_right.jpg'),
    },
    {
      code: 'ST-03',
      name: 'eCHALLAN TRACE',
      color: new THREE.Color(0xfacc15),
      top: loadSRGBTexture('/launcher/cubes/st3_top.jpg'),
      left: loadSRGBTexture('/launcher/cubes/st3_left.jpg'),
      right: loadSRGBTexture('/launcher/cubes/st3_right.jpg'),
    },
    {
      code: 'ST-04',
      name: 'AREA 51 MELTDOWN',
      color: new THREE.Color(0x22c55e),
      top: loadSRGBTexture('/launcher/cubes/st4_top.jpg'),
      left: loadSRGBTexture('/launcher/cubes/st4_left.jpg'),
      right: loadSRGBTexture('/launcher/cubes/st4_right.jpg'),
    },
  ]

  let currentStationIdx = 0

  // -------------------------------------------------------------
  // LIGHTING (Cinematic Soft Studio Lighting)
  // -------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.3)
  scene.add(ambientLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4)
  keyLight.position.set(6, 9, 8)
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5)
  rimLight.position.set(-7, -4, 5)
  scene.add(rimLight)

  // -------------------------------------------------------------
  // SOLID 3D CUBE GEOMETRY & MULTI-SURFACE MATERIALS
  // -------------------------------------------------------------
  const cubeRoot = new THREE.Group()
  cubeRoot.position.set(0, -0.35, 0)
  scene.add(cubeRoot)

  const L = 4.2 // Cube side length
  const cubeGeom = new THREE.BoxGeometry(L, L, L)

  // Face Materials in Three.js BoxGeometry:
  // [0] +X (Back-Right from front isometric view) -> Chassis
  // [1] -X (Front-Left station diorama face)       -> Left texture
  // [2] +Y (Top station diorama face)             -> Top texture
  // [3] -Y (Bottom face)                          -> Chassis
  // [4] +Z (Front-Right station diorama face)      -> Right texture
  // [5] -Z (Back-Left from front isometric view)  -> Chassis

  const chassisMaterial = new THREE.MeshStandardMaterial({
    map: chassisTex,
    color: 0x64748b,
    metalness: 0.6,
    roughness: 0.35,
    side: THREE.FrontSide,
  })

  const leftMaterial = new THREE.MeshStandardMaterial({
    map: STATIONS[0].left,
    metalness: 0.1,
    roughness: 0.3,
    side: THREE.FrontSide,
  })

  const topMaterial = new THREE.MeshStandardMaterial({
    map: STATIONS[0].top,
    metalness: 0.1,
    roughness: 0.3,
    side: THREE.FrontSide,
  })

  const rightMaterial = new THREE.MeshStandardMaterial({
    map: STATIONS[0].right,
    metalness: 0.1,
    roughness: 0.3,
    side: THREE.FrontSide,
  })

  const cubeMaterials = [
    chassisMaterial, // 0: +X (Back-Right)
    leftMaterial,    // 1: -X (Front-Left face)
    topMaterial,     // 2: +Y (Top face)
    chassisMaterial, // 3: -Y (Bottom)
    rightMaterial,   // 4: +Z (Front-Right face)
    chassisMaterial, // 5: -Z (Back-Left)
  ]

  const solidCubeMesh = new THREE.Mesh(cubeGeom, cubeMaterials)
  cubeRoot.add(solidCubeMesh)

  // -------------------------------------------------------------
  // VOLUMETRIC BACKGROUND PARTICLES
  // -------------------------------------------------------------
  const particleCount = 2000
  const particleGeom = new THREE.BufferGeometry()
  const partPos = new Float32Array(particleCount * 3)
  const partCol = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3
    partPos[idx] = (Math.random() - 0.5) * 50
    partPos[idx + 1] = (Math.random() - 0.5) * 40
    partPos[idx + 2] = (Math.random() - 0.5) * 40 - 5

    partCol[idx] = 0.2 + Math.random() * 0.2
    partCol[idx + 1] = 0.5 + Math.random() * 0.3
    partCol[idx + 2] = 0.8 + Math.random() * 0.2
  }

  particleGeom.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
  particleGeom.setAttribute('color', new THREE.BufferAttribute(partCol, 3))

  const particleMat = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
  })
  const particleSystem = new THREE.Points(particleGeom, particleMat)
  scene.add(particleSystem)

  // -------------------------------------------------------------
  // ISOMETRIC HERO ALIGNMENT & STATE
  // -------------------------------------------------------------
  // Pitch ~35.26 deg (atan(1/sqrt(2))), Yaw 45 deg (Exact Isometric Angle)
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
   * High-tension violent 720° tumble, swapping textures at peak velocity.
   */
  function triggerViolentSpin() {
    if (isTumbling || isWarping) return
    isTumbling = true
    tumbleProgress = 0
    tumbleStartRotX = cubeRoot.rotation.x
    tumbleStartRotY = cubeRoot.rotation.y

    const nextIdx = (currentStationIdx + 1) % STATIONS.length
    currentStationIdx = nextIdx

    // Swap face textures at peak rotational velocity
    setTimeout(() => {
      const st = STATIONS[nextIdx]
      leftMaterial.map = st.left
      leftMaterial.needsUpdate = true

      topMaterial.map = st.top
      topMaterial.needsUpdate = true

      rightMaterial.map = st.right
      rightMaterial.needsUpdate = true

      onStationChange?.(nextIdx)
    }, 280)
  }

  /**
   * Warp dive straight into the active station chamber.
   */
  function triggerWarp(onComplete) {
    if (isWarping) return
    isWarping = true
    targetCamZ = -6
    setTimeout(() => {
      onComplete?.()
    }, 450)
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
    }

    cubeRoot.position.y = -0.35 + breathFloatY

    // Camera updates & Warp
    if (isWarping) {
      camera.position.z += (targetCamZ - camera.position.z) * 0.18
      camera.position.x += (0 - camera.position.x) * 0.15
      camera.position.y += (-0.35 - camera.position.y) * 0.15

      cubeRoot.scale.multiplyScalar(1.025)

      const posAttr = particleGeom.attributes.position
      for (let i = 0; i < particleCount; i++) {
        posAttr.setZ(i, posAttr.getZ(i) + 2.2)
        if (posAttr.getZ(i) > 20) posAttr.setZ(i, -25)
      }
      posAttr.needsUpdate = true
    } else {
      camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.04
      camera.position.y += (mouse.y * 0.3 - camera.position.y) * 0.04
      camera.position.z += (targetCamZ - camera.position.z) * 0.04
      camera.lookAt(0, -0.35, 0)

      particleSystem.rotation.y = elapsed * 0.015
    }

    renderer.render(scene, camera)
  }

  animate()

  function dispose() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onResize)
    if (animFrameId) cancelAnimationFrame(animFrameId)
    renderer.dispose()
    cubeGeom.dispose()
    chassisTex.dispose()
    STATIONS.forEach((s) => {
      s.top.dispose()
      s.left.dispose()
      s.right.dispose()
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
