const width = window.innerWidth
const height = window.innerHeight

// model selector
const select = document.querySelector('select')
// get current model
const model = location.search.includes('model=')
    ? location.search.split('model=')[1].split('&')[0]
    : 'character_1'
// set model for selector
select.value = model
// on select
select.addEventListener('input', () => {
    // set model on url
    location = '?model=' + select.value
})

// three modules
const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer({ antialias : true })
const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 500)

// setup modules
scene.background = new THREE.Color('#333')
document.body.appendChild(renderer.domElement)
camera.position.set(0, 0.7, -1)
camera.rotation.set(0.1, Math.PI, 0)

// ground setup
const grounds = []
const mat_1 = new THREE.MeshBasicMaterial({ color : 'orange' })
const mat_2 = new THREE.MeshBasicMaterial({ color : 'white' })
for(let x = -4; x < 4; x += 1) {
    for(let y = -4; y < 4; y += 1) {
        const a = Math.abs(x % 2)
        const b = Math.abs(y % 2)
        const geo = new THREE.PlaneGeometry()
        const mat = a ? b ? mat_1 : mat_2 : b ? mat_2 : mat_1 
        const box = new THREE.Mesh(geo, mat)
        box.position.set(x, 0, y)
        box.rotation.set(-Math.PI / 2, 0, 0)
        scene.add(box)
        grounds.push(box)
    }
}

const unlitModel = obj => {
    obj.traverse((child) => {
        if(child.isMesh) {
            // missing maps
            child.material.emissive = child.material.color
            child.material.emissiveMap = child.material.map
            // to mesh basic
            var prevMaterial = child.material
            child.material = new THREE.MeshBasicMaterial()
            THREE.MeshBasicMaterial.prototype.copy.call(child.material, prevMaterial)
        }
    })
    return obj
}

// load model
new THREE.FBXLoader().load('./assets/'+ model +'/scene.fbx', model => {
    // input listener
    const listener = new InputListener()
    // rescle character
    model.scale.set(0.37, 0.37, 0.37)
    // unlit character
    unlitModel(model)
    // create character
    const character = new CharacterControls(model)
    // setup character
    character.setModules(scene, camera, renderer)
    character.groundObjects = grounds
    character.listener = listener
    character.setDimensions(0.342, 0.375, 0.165)

    // animation map
    character.setAnimationMap({
        'ani_idle' : { speed : 1, name : 'anm_01000004' },
        'ani_walk' : { speed : 1, name : 'anm_01020001' },
        'ani_fist' : { speed : 1, name : 'anm_00020001_s', start : 10, end : 25 },
        'ani_kick' : { speed : 1, name : 'anm_00020001_s', start : 20, end : 30 },
        'ani_run'  : { speed : 1, name : 'anm_01020002' }
    })

    // play idle as default
    character.play('ani_idle', false)

    // character speeds
    let walk_speed = 0.007
    let run_speed = 0.03

    // method to slow
    const slow = () => {
        walk_speed = 0.003
        run_speed = 0.007
    }

    // method to fast
    const fast = () => {
        walk_speed = 0.007
        run_speed = 0.03
    }

    // action map
    character.setActionMap({
        'idle' : {
            animation : { id : 'ani_idle' },
            inspector : keys => !keys.W && !keys.A && !keys.S && !keys.D
        },
        'walk' : {
            animation : { id : 'ani_walk' },
            inspector : keys => (keys.W || keys.A || keys.S || keys.D) && !keys.Shift,
            callback : obj => {
                character.move(obj.keys.W, obj.keys.A, obj.keys.S, obj.keys.D, walk_speed)
            }
        },
        'run' : {
            animation : { id : 'ani_run' },
            inspector : keys => (keys.W || keys.A || keys.S || keys.D) && keys.Shift,
            callback : obj => {
                character.move(obj.keys.W, obj.keys.A, obj.keys.S, obj.keys.D, run_speed)
            }
        },
        'fist' : {
            animation : { id : 'ani_fist', animationLock : true, onStart : slow, onEnd : fast },
            executor : { type : 'click', button : 0 }
        },
        'kick' : {
            animation : { id : 'ani_kick', animationLock : true, onStart : slow, onEnd : fast },
            executor : { type : 'click', button : 2 }
        }
    })

    // enable character
    character.enable()

    // render method
    const render = () => {
        character.update()
        requestAnimationFrame(render)
        renderer.render(scene, camera)
    }

    // remove loader
    document.querySelector('.loading').remove()

    window.character = character

    // start loop
    render()
})

// resize method
const resize = () => {
    // get new width
    const width = window.innerWidth
    // get new height
    const height = window.innerHeight
    // resize renderer
    renderer.setSize(width, height)
    // update camera aspect
    camera.aspect = width / height
    // update projection matrix
    camera.updateProjectionMatrix()
}

// resize on window resize
window.addEventListener('resize', resize)
// resize on window load
window.addEventListener('load', resize)