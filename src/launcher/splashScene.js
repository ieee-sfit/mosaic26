import * as THREE from 'three'

/**
 * Initializes and drives the Three.js 3D scene for the CtrlFreak Intro Splash screen.
 * Restores the initial clean, sparse yet numerous volumetric particle field
 * floating in deep space with sector accent lighting and interactive mouse parallax.
 */
export function initSplashScene(container, onStationChange) {
  let width = container.clientWidth || window.innerWidth
  let height = container.clientHeight || window.innerHeight

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x050811, 0.02)

  const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000)
  camera.position.set(0, 0, 16.0)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  container.appendChild(renderer.domElement)

  // -------------------------------------------------------------
  // SECTOR ACCENT LIGHTING
  // -------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0x0f172a, 1.6)
  scene.add(ambientLight)

  const coreLight = new THREE.PointLight(0x38bdf8, 3.0, 30)
  coreLight.position.set(0, 0, 2)
  scene.add(coreLight)

  // 4 Sector colored accent lights
  const lightS1 = new THREE.PointLight(0x00f2fe, 2.2, 22) // Cyan - GotG
  lightS1.position.set(0, 7, 2)
  scene.add(lightS1)

  const lightS2 = new THREE.PointLight(0xdc2626, 2.2, 22) // Red - F1
  lightS2.position.set(8, 0, 2)
  scene.add(lightS2)

  const lightS3 = new THREE.PointLight(0xfacc15, 2.2, 22) // Gold - eChallan
  lightS3.position.set(0, -7, 2)
  scene.add(lightS3)

  const lightS4 = new THREE.PointLight(0x22c55e, 2.2, 22) // Emerald - Area 51
  lightS4.position.set(-8, 0, 2)
  scene.add(lightS4)

  // -------------------------------------------------------------
  // VOLUMETRIC BACKGROUND PARTICLE FIELD (Initial Spread-Out Aesthetic)
  // -------------------------------------------------------------
  const particleCount = 3500
  const particleGeom = new THREE.BufferGeometry()
  const partPos = new Float32Array(particleCount * 3)
  const partCol = new Float32Array(particleCount * 3)

  const palette = [
    new THREE.Color(0xef4444), // red - F1
    new THREE.Color(0x38bdf8), // cyan - GotG
    new THREE.Color(0xfacc15), // amber - eChallan
    new THREE.Color(0x22c55e), // emerald - Area 51
    new THREE.Color(0x64748b), // slate
  ]

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3
    partPos[idx] = (Math.random() - 0.5) * 65
    partPos[idx + 1] = (Math.random() - 0.5) * 48
    partPos[idx + 2] = (Math.random() - 0.5) * 42 - 5

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
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
  })

  const particleSystem = new THREE.Points(particleGeom, particleMat)
  scene.add(particleSystem)

  // -------------------------------------------------------------
  // INTERACTION & ANIMATION STATE
  // -------------------------------------------------------------
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
  let targetCamZ = 16.0
  let isWarping = false
  let animFrameId = null
  const startTime = performance.now()

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
   * High-speed Warp Dive into the station terminal.
   */
  function triggerWarp(onComplete) {
    if (isWarping) return
    isWarping = true
    targetCamZ = -15.0

    setTimeout(() => {
      onComplete?.()
    }, 550)
  }

  function setStationColor(hexColor) {
    coreLight.color.set(hexColor)
  }

  function animate() {
    animFrameId = requestAnimationFrame(animate)
    const elapsed = (performance.now() - startTime) * 0.001

    mouse.x += (mouse.targetX - mouse.x) * 0.05
    mouse.y += (mouse.targetY - mouse.y) * 0.05

    // Orbiting subtle core light breathing
    coreLight.position.x = Math.sin(elapsed * 0.8) * 1.5
    coreLight.position.y = Math.cos(elapsed * 0.6) * 1.0

    if (isWarping) {
      camera.position.z += (targetCamZ - camera.position.z) * 0.16
      const posAttr = particleGeom.attributes.position
      for (let i = 0; i < particleCount; i++) {
        posAttr.setZ(i, posAttr.getZ(i) + 2.4)
        if (posAttr.getZ(i) > 20) posAttr.setZ(i, -25)
      }
      posAttr.needsUpdate = true
    } else {
      camera.position.x += (mouse.x * 2.2 - camera.position.x) * 0.04
      camera.position.y += (mouse.y * 1.6 - camera.position.y) * 0.04
      camera.position.z += (targetCamZ - camera.position.z) * 0.04
      camera.lookAt(0, 0, 0)

      particleSystem.rotation.y = elapsed * 0.025
      particleSystem.rotation.x = elapsed * 0.015
    }

    renderer.render(scene, camera)
  }

  animate()

  function dispose() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onResize)
    if (animFrameId) cancelAnimationFrame(animFrameId)
    renderer.dispose()
    particleGeom.dispose()
    particleMat.dispose()
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }

  return {
    triggerWarp,
    setStationColor,
    dispose,
  }
}
