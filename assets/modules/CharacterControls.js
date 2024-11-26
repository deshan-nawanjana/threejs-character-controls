export const CharacterControls = class {

  constructor(model, listener, scene, camera, renderer) {
    // create object
    if (model) { this.setModel(model) }
    // three modules
    this.clock = new THREE.Clock()
    this.mixer = new THREE.AnimationMixer(model)
    // setup modules
    if (scene && camera && renderer) { this.setModules(scene, camera, renderer) }
    // data
    this.model = model || null
    this.fade = 0.2
    this.rotateSpeed = 0.003
    this.enabled = true
    this.locked = false
    this.current = null
    this.actions = {}
    this.actionMap = {}
    this.animationMap = {}
    this.listener = listener || null
    // physics value
    this.gravity = 10
    this.velocity = 0
    this.groundObjects = []
    this._raycaster = new THREE.Raycaster()
    // moving calculate objects
    this._rotateQuarternion = new THREE.Quaternion()
    this._rotateAngle = new THREE.Vector3(0, 1, 0)
    this._walkDirection = new THREE.Vector3()
    // animation action lock
    this._animationLocked = false
    this._actionLocked = false
    // action callback data
    this._lastAction = null
    // add listeners
    this._addPointerLockListeners()
    this._addExecutorListeners()
    this._addAnimationMixerListeners()
  }

  setModel(model) {
    // assign model
    this.model = model
    // create bound box and set model
    const box = new THREE.Box3()
    box.setFromObject(model)
    // calculate dimensions
    const x = (box.max.x - box.min.x) * model.scale.x
    const y = (box.max.y - box.min.y) * model.scale.y
    const z = (box.max.z - box.min.z) * model.scale.z
    // create object
    const geo = new THREE.BoxGeometry(x, y, z)
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    const obj = new THREE.Mesh(geo, mat)
    // assign model
    this.object = obj
    // add model to object
    obj.add(model)
    // get model to the low
    model.position.y -= (box.max.y - box.min.y) / 2
    // init move
    if (this.scene) { this.move(false, false, false, false, 0) }
  }

  setDimensions(x, y, z) {
    // get current geometry
    const old = this.object.geometry
    // set new geometry
    this.object.geometry = new THREE.BoxGeometry(x, y, z)
    // update object and controls
    this.object.position.y = y * 0.2
    this.controls.target.y = y * 0.8
    // dispose old dispose
    old.dispose()
  }

  setModules(scene, camera, renderer) {
    // create controls
    this.controls = new THREE.OrbitControls(camera, renderer.domElement)
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    // setup controls
    this.controls.enablePan = false
    this.controls.enableZoom = false
    this.controls.target.set(0, 0.36, 0)
    // add character to scene
    this.scene.add(this.object)
    // init move
    if (this.scene) { this.move(false, false, false, false, 0) }
  }

  setAnimationMap(map) {
    // set animation map
    this.animationMap = map
    // reset actions
    this.actions = {}
    // update actions
    Object.keys(map).forEach(id => {
      const obj = map[id]
      const ani = this.model.animations.find(x => x.name === obj.name)
      // trim clip if possible
      const clp = (obj.start !== undefined && obj.end !== undefined)
        ? THREE.AnimationUtils.subclip(ani, obj.name, obj.start, obj.end) : ani
      // create clip action
      const act = this.mixer.clipAction(clp)
      act.name = id
      // set start
      if (obj.start !== undefined) { act.startAt(obj.start) }
      if (obj.speed !== undefined) { act.setDuration(obj.speed) }
      this.actions[id] = act
    })
  }

  setActionMap(map) { this.actionMap = map }

  play(id, animationLock = false, actionLock) {
    // return same animation
    if (this.current === id) { return }
    // check lock states
    if (this._animationLocked) { return }
    // update lock states
    this._animationLocked = animationLock
    this._actionLocked = actionLock
    // get action
    const act = this.actions[id]
    // fade out current animation
    if (this.current) { this.actions[this.current].fadeOut(this.fade) }
    // reset animation
    this._resetClipAction(act)
    // lock animation
    if (animationLock) {
      act.clampWhenFinished = true
      act.setLoop(THREE.LoopOnce)
    } else {
      // setup and fade in action
      act.clampWhenFinished = false
      act.setLoop(THREE.LoopRepeat)
    }
    // play animation
    act.play()
    // set current action
    this.current = id
  }

  move(isForward, isLeft, isBackward, isRight, speed) {
    // turn offest
    let offset = 0
    if (isForward) {
      if (isLeft) { offset = Math.PI / 4 }
      else if (isRight) { offset = -Math.PI / 4 }
    } else if (isBackward) {
      if (isLeft) { offset = Math.PI / 4 + Math.PI / 2 }
      else if (isRight) { offset = -Math.PI / 4 - Math.PI / 2 }
      else { offset = Math.PI }
    } else if (isLeft) {
      offset = Math.PI / 2
    } else if (isRight) {
      offset = -Math.PI / 2
    }
    // camera y direction
    const camY = Math.atan2(
      (this.object.position.x - this.camera.position.x),
      (this.object.position.z - this.camera.position.z))
    // character rotation
    this._rotateQuarternion.setFromAxisAngle(this._rotateAngle, camY + offset)
    this.object.quaternion.rotateTowards(this._rotateQuarternion, 0.2)
    // calculate direction
    this.camera.getWorldDirection(this._walkDirection)
    this._walkDirection.y = 0
    this._walkDirection.normalize()
    this._walkDirection.applyAxisAngle(this._rotateAngle, offset)
    // move model & camera
    const moveX = this._walkDirection.x * speed
    const moveZ = this._walkDirection.z * speed
    this.object.position.x += moveX
    this.object.position.z += moveZ
    // update camera
    this._updateCamera()
  }

  lock() {
    // character is not moveable
    this.locked = true
  }

  unlock() {
    // character is moveable
    this.locked = false
  }

  disable() {
    // system is not running
    this.enabled = false
  }

  enable() {
    // system is running
    this.enabled = true
  }

  update() {
    // update orbit controls
    this.controls.update()
    // return if disabled
    if (this.enabled === false) { return }
    // update animations
    this.mixer.update(this.clock.getDelta())
    // check inspectors
    this._checkInspectors()
    // update ground position
    this._checkGroundPosition()
  }

  _updateCamera() {
    // get gaps
    const gap = this.camera.position.sub(this.controls.target)
    // target
    this.controls.target.copy(this.object.position)
    // camera
    this.camera.position.copy(this.controls.target.clone().add(gap))
  }

  _resetClipAction(action) {
    action.reset()
    // default values
    action.clampWhenFinished = false
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(1)
    action.fadeIn(this.fade)
    // trim and scale
    const obj = this.animationMap[action.name]
    if (obj.speed !== undefined) {
      const duration = action.getClip().duration
      action.setDuration(duration * (1 / obj.speed))
    }
  }

  _addAnimationMixerListeners() {
    this.mixer.addEventListener('finished', event => {
      this._animationLocked = false
      this._actionLocked = false
      // onend callback
      if (this._lastAction) {
        const act = this.actionMap[this._lastAction]
        const ani = act.animation
        if (ani && ani.id === event.action.name) {
          if (ani.onEnd) { ani.onEnd(act) }
        }
      }
    })
  }

  _addPointerLockListeners() {
    // mouse movement listener
    window.addEventListener('mousemove', e => {
      if (this.enabled && document.pointerLockElement) {
        const x = e.movementX
        const y = e.movementY
        // orbit xz plane
        if (x !== 0) { this.controls.rotateLeft(x * this.rotateSpeed) }
        // orbit xy plane
        if (y !== 0) { this.controls.rotateUp(y * this.rotateSpeed) }
      }
    })
    // mouse mousedown pointer lock
    window.addEventListener('mousedown', event => {
      if (this.enabled && event.target === this.renderer.domElement) {
        document.body.requestPointerLock()
      }
    })
  }

  _checkInspectors() {
    // return if locked
    if (this.locked) { return }
    // check actions
    Object.keys(this.actionMap).forEach(name => {
      const obj = this.actionMap[name]
      // check inspector
      if (obj.inspector && obj.inspector(this.listener.activeKeys)) {
        // play animation
        if (obj.animation && !this._animationLocked) {
          this.play(
            obj.animation.id,
            obj.animation.animationLock,
            obj.animation.actionLock
          )
        }
        // callback
        if (obj.callback && !this._actionLocked) {
          obj.callback({ action: name, keys: this.listener.activeKeys })
        }
      }
    })
  }

  _addExecutorListeners() {
    // mouse events
    window.addEventListener('mousedown', event => this._checkExecutors(event))
    window.addEventListener('mouseup', event => this._checkExecutors(event))
    window.addEventListener('click', event => this._checkExecutors(event))
    window.addEventListener('mousemove', event => this._checkExecutors(event))
    // key events
    window.addEventListener('keydown', event => this._checkExecutors(event))
    window.addEventListener('keyup', event => this._checkExecutors(event))
    window.addEventListener('keypress', event => this._checkExecutors(event))
  }

  _checkExecutors(event) {
    // return if locked
    if (this.locked || this._animationLocked) { return }
    // check actions
    Object.keys(this.actionMap).forEach(name => {
      const obj = this.actionMap[name]
      // check inspector
      if (obj.executor) {
        // match executor with event
        const flag = Object.keys(obj.executor).every(key => {
          return event[key] === obj.executor[key]
        })
        if (flag) {
          // set last action
          this._lastAction = name
          // play animation
          if (obj.animation) {
            // play animation
            this.play(
              obj.animation.id,
              obj.animation.animationLock,
              obj.animation.actionLock
            )
            // onstart callback
            if (obj.animation.onStart) { obj.animation.onStart(obj) }
            // onend callback
          }
          // callback
          if (obj.callback) {
            obj.callback({ action: name, event: event })
          }
        }
      }
    })
  }

  _getGroundHitY(posX, posZ) {
    // get position and direction
    const pos = new THREE.Vector3(posX, 1000, posZ)
    const dir = new THREE.Vector3(0, -1, 0)
    // raycast
    this._raycaster.set(pos, dir)
    const arr = this._raycaster.intersectObjects(this.groundObjects, true)
    if (arr.length === 0) {
      return null
    } else {
      // get first intersect data
      const obj = arr[0]
      // return character low y value
      return obj.point.y
    }
  }

  _checkGroundPosition() {
    // return if no ground objects
    if (this.groundObjects.length === 0) { return }
    // get character object
    const object = this.object
    // get ground lowest position
    const gr_low = this._getGroundHitY(object.position.x, object.position.z)
    // check low position
    if (gr_low === null) {
      // no ground fall down
      object.position.y -= this.velocity
      this.velocity += this.gravity * 0.0001
    } else {
      // get character half height
      const cr_hlf = object.geometry.parameters.height / 2
      // get character low position
      const cr_low = object.position.y - cr_hlf
      // check character above ground and large gap
      if (gr_low < cr_low && cr_low - gr_low > 0.01) {
        // fall until hit ground
        object.position.y -= this.velocity
        // increase velocity
        this.velocity += this.gravity * 0.0001
      } else {
        // get to ground surface
        object.position.y = gr_low + cr_hlf
        // reset velocity
        this.velocity = 0
      }
    }
    // update camera
    this._updateCamera()
  }

}
