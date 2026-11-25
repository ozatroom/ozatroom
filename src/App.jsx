import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { Suspense } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Grid, OrbitControls, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Box, Circle, Cylinder, Grid3X3, Layers3, Move, Rotate3D, Scaling,
  Save, FolderOpen, Plus, Trash2, Copy, Eye, EyeOff, Camera, FileText, Download, MonitorPlay,
  ChevronDown, MousePointer2, Settings2, Film, Clapperboard, Sparkles
} from 'lucide-react'

const uid = () => 'obj_' + Math.random().toString(36).slice(2, 9)
const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
const crc32 = bytes => {
  let crc = -1
  for (const byte of bytes) {
    crc ^= byte
    for (let j=0;j<8;j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ -1) >>> 0
}
const zipStore = files => {
  const encoder = new TextEncoder(), chunks = [], central = []
  let offset = 0
  const u16 = n => [n & 255, (n >>> 8) & 255]
  const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]
  for (const file of files) {
    const name = encoder.encode(file.name), data = file.data, crc = crc32(data)
    const local = new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data])
    chunks.push(local)
    central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]))
    offset += local.length
  }
  const centralSize = central.reduce((sum,part)=>sum+part.length,0)
  const end = new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),...u16(0)])
  return new Blob([...chunks,...central,end],{type:'application/zip'})
}

const starter = [
  { id:'ground', name:'Ground Plane', kind:'plane', position:[0,-.04,0], rotation:[-Math.PI/2,0,0], scale:[12,12,1], color:'#343c44', visible:true },
  { id:'cube_01', name:'Cube 01', kind:'box', position:[0,.8,0], rotation:[0,.35,0], scale:[1.6,1.6,1.6], color:'#b7a18a', visible:true },
  { id:'sphere_01', name:'Sphere 01', kind:'sphere', position:[2.4,.7,-.6], rotation:[0,0,0], scale:[1.35,1.35,1.35], color:'#738a91', visible:true }
]
const kindIcon = k => k==='box' || k==='model' || k==='wall' ? Box : k==='sphere' ? Circle : k==='cylinder' ? Cylinder : Grid3X3

function ImportedModel({ item, register, onSelect }) {
  const gltf = useLoader(GLTFLoader, item.assetData)
  const group = useRef()
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])
  const normalizedScale = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene)
    const size = bounds.getSize(new THREE.Vector3())
    const largest = Math.max(size.x, size.y, size.z, 0.001)
    return 2 / largest
  }, [scene])
  return <group ref={node => { group.current = node; register(item.id, node) }}
    position={item.position} rotation={item.rotation} scale={item.scale} visible={item.visible}
    onClick={event => { event.stopPropagation(); onSelect(item.id) }}>
    <group scale={normalizedScale}><primitive object={scene} /></group>
  </group>
}

function MeshItem({ item, selected, register, onSelect }) {
  const mesh = useRef()
  const geometry = item.kind==='sphere' ? <sphereGeometry args={[.5,32,24]}/> :
    item.kind==='cylinder' ? <cylinderGeometry args={[.5,.5,1,32]}/> :
    item.kind==='plane' ? <planeGeometry args={[1,1]}/> : <boxGeometry args={[1,1,1]}/>
  return <mesh ref={n=>{mesh.current=n;register(item.id,n)}} position={item.position} rotation={item.rotation}
    scale={item.scale} visible={item.visible} castShadow={item.kind!=='plane'} receiveShadow
    onClick={e=>{e.stopPropagation();onSelect(item.id)}}>
    {geometry}
    <meshStandardMaterial color={item.color} roughness={.72} metalness={.08}/>
    {selected && <mesh scale={1.025}><boxGeometry/><meshBasicMaterial color="#d6a66b" wireframe/></mesh>}
  </mesh>
}

function CameraLens({fov}) { const {camera}=useThree(); useEffect(()=>{camera.fov=fov;camera.updateProjectionMatrix()},[camera,fov]); return null }

function CameraRigView({enabled,position,target}) {
  const {camera}=useThree()
  useEffect(()=>{
    if(!enabled)return
    camera.position.set(...position)
    camera.up.set(0,1,0)
    camera.lookAt(...target)
    camera.updateMatrixWorld()
  },[camera,enabled,position,target])
  return null
}

function Viewport({items, selectedId, setSelectedId, tool, register, onTransformEnd, cameraSettings, cameraRig, rigEnabled}) {
  const [activeObject, setActiveObject] = useState(null)
  useEffect(() => {
    setActiveObject(window.__ozatroomObjects?.[selectedId] || null)
  }, [selectedId, items])
  const fov = 2 * Math.atan(cameraSettings.sensorWidth / (2 * cameraSettings.focalLength)) * 180 / Math.PI
  return <Canvas shadows dpr={[1,1.7]} camera={{position:[8,6,9],fov}} gl={{antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true}}>
    <CameraLens fov={fov}/><CameraRigView enabled={rigEnabled} position={cameraRig.position} target={cameraRig.target}/><color attach="background" args={['#171b20']}/>
    <fog attach="fog" args={['#171b20',22,48]}/>
    <ambientLight intensity={.8}/>
    <directionalLight position={[5,10,6]} intensity={2.1} castShadow shadow-mapSize={[2048,2048]}/>
    <directionalLight position={[-6,4,-4]} intensity={.55} color="#8ca4bb"/>
    <Grid args={[40,40]} position={[0,-.035,0]} cellSize={1} cellThickness={.6} cellColor="#46505a"
      sectionSize={5} sectionThickness={1.1} sectionColor="#77818b" fadeDistance={35} fadeStrength={1.5} infiniteGrid/>
    {items.map(item=>item.kind==='model' ? <ImportedModel key={item.id} item={item} register={register} onSelect={setSelectedId}/> : <MeshItem key={item.id} item={item} selected={item.id===selectedId} register={register} onSelect={setSelectedId}/>)}
    {activeObject && tool!=='select' && <TransformControls key={selectedId} object={activeObject} mode={tool} onMouseUp={onTransformEnd} />}
    <OrbitControls makeDefault enabled={tool==='select'&&!rigEnabled} enableDamping dampingFactor={.08}/>
  </Canvas>
}

function ToolButton({title,active,onClick,children}) {
  return <button className={'icon-button '+(active?'active':'')} title={title} onClick={onClick}>{children}</button>
}

export default function App() {
  const [items,setItems]=useState(starter)
  const [selectedId,setSelectedId]=useState('cube_01')
  const [tool,setTool]=useState('select')
  const [workspaceMode,setWorkspaceMode]=useState('build')
  const [objectKeyframes,setObjectKeyframes]=useState([])
  const [playhead,setPlayhead]=useState(0)
  const [timelineDuration,setTimelineDuration]=useState(10)
  const [projectName,setProjectName]=useState('Untitled Cinematic')
  const [addOpen,setAddOpen]=useState(false)
  const [activeTab,setActiveTab]=useState('inspector')
  const [cameraSettings,setCameraSettings]=useState({profile:'ARRI Alexa 35',focalLength:35,sensorWidth:27.99,aperture:2.8})
  const [cameraRig,setCameraRig]=useState({position:[8,6,9],target:[0,0,0]})
  const [rigEnabled,setRigEnabled]=useState(false)
  const [keyframes,setKeyframes]=useState([])
  const [timelinePlaying,setTimelinePlaying]=useState(false)
  const [storyboard,setStoryboard]=useState([])
  const [renderSettings,setRenderSettings]=useState({ratio:'16:9',resolution:'1920x1080',safeGuides:true,frameGuide:true})
  const [units,setUnits]=useState('m')
  const [exportingFrames,setExportingFrames]=useState(false)
  const refs=useRef({})
  const inputRef=useRef()
  const modelInputRef=useRef()
  const selected=items.find(x=>x.id===selectedId)
  const register=useCallback((id,obj)=>{if(obj)refs.current[id]=obj;else delete refs.current[id];window.__ozatroomObjects=refs.current},[])
  const sync=useCallback(()=>setItems(old=>old.map(x=>{const o=refs.current[x.id];return o?{...x,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray()}:x})),[])
  const add=(kind)=>{
    const count=items.filter(x=>x.kind===kind).length+1, id=uid()
    const names={box:'Cube',sphere:'Sphere',cylinder:'Cylinder',plane:'Plane',wall:'Wall',floor:'Floor',ceiling:'Ceiling'}
    const dimensions={wall:[4,2.8,.2],floor:[4,.12,4],ceiling:[4,.12,4]}
    const item={id,name:names[kind]+' '+String(count).padStart(2,'0'),kind,
      position:[0,kind==='plane'||kind==='floor'?0:kind==='ceiling'?2.8:1.4,0],rotation:kind==='plane'?[-Math.PI/2,0,0]:[0,0,0],
      scale:dimensions[kind]|| (kind==='plane'?[3,3,1]:[1,1,1]),color:kind==='plane'||kind==='floor'?'#414a52':kind==='ceiling'?'#d2c9bb':'#b7a18a',visible:true}
    setItems(p=>[...p,item]);setSelectedId(id);setAddOpen(false)
  }
  const update=(key,index,value)=>{
    if(!selectedId)return
    setItems(p=>p.map(x=>{
      if(x.id!==selectedId)return x
      if(key==='name'||key==='color')return {...x,[key]:value}
      const v=[...x[key]];v[index]=Number(value)
      const o=refs.current[selectedId]
      if(o){if(key==='position')o.position.set(...v);if(key==='rotation')o.rotation.set(...v);if(key==='scale')o.scale.set(...v)}
      return {...x,[key]:v}
    }))
  }
  const remove=()=>{if(!selectedId||selectedId==='ground')return;setItems(p=>p.filter(x=>x.id!==selectedId));setSelectedId(null)}
  const duplicate=()=>{if(!selected)return;const id=uid();setItems(p=>[...p,{...selected,id,name:selected.name+' Copy',position:[selected.position[0]+1,selected.position[1],selected.position[2]+1]}]);setSelectedId(id)}
  const addObjectKeyframe=()=>{
    if(!selected)return
    const frame={id:uid(),objectId:selected.id,objectName:selected.name,time:playhead,interpolation:'linear',position:[...selected.position],rotation:[...selected.rotation],scale:[...selected.scale]}
    setObjectKeyframes(p=>[...p.filter(k=>!(k.objectId===selected.id&&Math.abs(k.time-playhead)<0.001)),frame].sort((a,b)=>a.time-b.time))
  }
  const addKeyframe=()=>{
    const frame={id:uid(),label:'Shot '+String(keyframes.length+1).padStart(2,'0'),position:[...cameraRig.position],target:[...cameraRig.target],focalLength:cameraSettings.focalLength}
    setKeyframes(p=>[...p,frame]);setRigEnabled(true)
  }
  const applyKeyframe=frame=>{setRigEnabled(true);setCameraRig({position:[...frame.position],target:[...frame.target]});setCameraSettings(p=>({...p,focalLength:frame.focalLength}))}
  const addShot=()=>{const id=uid();setStoryboard(p=>[...p,{id,title:'New Shot '+String(p.length+1).padStart(2,'0'),shotType:'Wide',duration:4,description:'',cameraPosition:[...cameraRig.position],cameraTarget:[...cameraRig.target],focalLength:cameraSettings.focalLength}])}
  const updateShot=(id,key,value)=>setStoryboard(p=>p.map(shot=>shot.id===id?{...shot,[key]:value}:shot))
  const captureShot=id=>setStoryboard(p=>p.map(shot=>shot.id===id?{...shot,cameraPosition:[...cameraRig.position],cameraTarget:[...cameraRig.target],focalLength:cameraSettings.focalLength}:shot))
  const exportPreview=()=>{const canvas=document.querySelector('.viewport canvas');if(!canvas){alert('Viewport is not ready');return}const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=(projectName.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'ozatroom')+'-preview.png';a.click()}
  const exportStoryboardFrames=async()=>{
    if(!storyboard.length||exportingFrames)return
    const canvas=document.querySelector('.viewport canvas')
    if(!canvas){alert('Viewport is not ready');return}
    setExportingFrames(true)
    const originalRig={position:[...cameraRig.position],target:[...cameraRig.target]}
    const originalFocal=cameraSettings.focalLength
    const files=[]
    try{
      for(let i=0;i<storyboard.length;i++){
        const shot=storyboard[i]
        setRigEnabled(true)
        setCameraRig({position:[...shot.cameraPosition],target:[...shot.cameraTarget]})
        setCameraSettings(p=>({...p,focalLength:shot.focalLength}))
        await new Promise(resolve=>setTimeout(resolve,180))
        await waitFrame()
        const frameCanvas=document.querySelector('.viewport canvas')
        if(!frameCanvas)throw new Error('Viewport disappeared during export')
        const blob=await new Promise((resolve,reject)=>frameCanvas.toBlob(value=>value?resolve(value):reject(new Error('Frame capture failed')),'image/png'))
        files.push({name:String(i+1).padStart(3,'0')+'_'+(shot.title||'shot').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png',data:new Uint8Array(await blob.arrayBuffer())})
      }
      const zip=zipStore(files)
      const url=URL.createObjectURL(zip),a=document.createElement('a')
      a.href=url;a.download=(projectName.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'ozatroom')+'-storyboard-frames.zip'
      a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)
    }catch(error){alert('Frame export failed: '+error.message)}
    finally{
      setCameraRig(originalRig)
      setCameraSettings(p=>({...p,focalLength:originalFocal}))
      setRigEnabled(true)
      setExportingFrames(false)
    }
  }
  const applyShot=shot=>{setRigEnabled(true);setCameraRig({position:[...shot.cameraPosition],target:[...shot.cameraTarget]});setCameraSettings(p=>({...p,focalLength:shot.focalLength}))}
  const moveRig=(axis,amount)=>setCameraRig(p=>({...p,position:p.position.map((v,i)=>i===axis?v+amount:v)}))
  const aimRig=(axis,amount)=>setCameraRig(p=>({...p,target:p.target.map((v,i)=>i===axis?v+amount:v)}))
  useEffect(()=>{
    if(workspaceMode==='animate') return
    if(!timelinePlaying||keyframes.length<2){if(timelinePlaying)setTimelinePlaying(false);return}
    let raf=0,start=null
    const duration=(keyframes.length-1)*1800
    const tick=now=>{
      if(start===null)start=now
      const progress=Math.min((now-start)/duration,1)*(keyframes.length-1)
      const index=Math.min(Math.floor(progress),keyframes.length-2)
      const t=progress-index,a=keyframes[index],b=keyframes[index+1]
      const mix=(x,y)=>x.map((v,i)=>v+(y[i]-v)*t)
      setRigEnabled(true)
      setCameraRig({position:mix(a.position,b.position),target:mix(a.target,b.target)})
      setCameraSettings(p=>({...p,focalLength:a.focalLength+(b.focalLength-a.focalLength)*t}))
      if(progress<keyframes.length-1)raf=requestAnimationFrame(tick);else setTimelinePlaying(false)
    }
    raf=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  },[timelinePlaying,keyframes,workspaceMode])
  useEffect(()=>{
    if(workspaceMode!=='animate'||!timelinePlaying)return
    let raf=0,last=null,elapsed=playhead
    const tick=now=>{
      if(last===null)last=now
      const delta=(now-last)/1000;last=now
      elapsed=Math.min(timelineDuration,elapsed+delta)
      setPlayhead(elapsed)
      if(elapsed>=timelineDuration){setTimelinePlaying(false);return}
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  },[workspaceMode,timelinePlaying,timelineDuration])
  useEffect(()=>{
    if(workspaceMode!=='animate'||!objectKeyframes.length)return
    const grouped=new Map()
    objectKeyframes.forEach(frame=>{if(!grouped.has(frame.objectId))grouped.set(frame.objectId,[]);grouped.get(frame.objectId).push(frame)})
    grouped.forEach((track,id)=>{
      track.sort((a,b)=>a.time-b.time)
      let a=track[0],b=track[track.length-1],t=0
      if(playhead<=a.time){b=a}
      else if(playhead>=b.time){a=b}
      else {for(let i=0;i<track.length-1;i++){if(playhead>=track[i].time&&playhead<=track[i+1].time){a=track[i];b=track[i+1];break}}const span=Math.max(.0001,b.time-a.time);t=Math.max(0,Math.min(1,(playhead-a.time)/span));if(a.interpolation==='hold')t=0;else if(a.interpolation==='easeInOut')t=t*t*(3-2*t)}
      const mix=(x,y)=>x.map((v,i)=>v+(y[i]-v)*t)
      const obj=refs.current[id]
      if(obj){obj.position.set(...mix(a.position,b.position));obj.rotation.set(...mix(a.rotation,b.rotation));obj.scale.set(...mix(a.scale,b.scale))}
    })
    setItems(old=>old.map(item=>{const track=grouped.get(item.id);if(!track)return item;let a=track[0],b=track[track.length-1],t=0;if(playhead<=a.time)b=a;else if(playhead>=b.time)a=b;else{for(let i=0;i<track.length-1;i++){if(playhead>=track[i].time&&playhead<=track[i+1].time){a=track[i];b=track[i+1];break}}t=Math.max(0,Math.min(1,(playhead-a.time)/Math.max(.0001,b.time-a.time)));if(a.interpolation==='hold')t=0;else if(a.interpolation==='easeInOut')t=t*t*(3-2*t)}const mix=(x,y)=>x.map((v,i)=>v+(y[i]-v)*t);return {...item,position:mix(a.position,b.position),rotation:mix(a.rotation,b.rotation),scale:mix(a.scale,b.scale)}}))
  },[workspaceMode,playhead,objectKeyframes])
  const save=()=>{
    const blob=new Blob([JSON.stringify({app:'OZATROOM PREVIS',version:'1.0.0',projectName,items,cameraSettings,cameraRig,keyframes,objectKeyframes,playhead,timelineDuration,storyboard,renderSettings},null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(projectName.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'previs')+'.ozprevis.json';a.click();URL.revokeObjectURL(url)
  }
  const importModel=file=>{
    if(!file)return
    if(!file.name.toLowerCase().endsWith('.glb')){alert('На этом этапе поддерживается импорт .glb. Для .gltf используйте экспорт в GLB.');return}
    if(file.size>100*1024*1024){alert('Файл превышает лимит 100 MB.');return}
    const reader=new FileReader()
    reader.onload=()=>{
      const id=uid()
      const item={id,name:file.name.replace(/\\.glb$/i,''),kind:'model',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],color:'#ffffff',visible:true,assetData:String(reader.result)}
      setItems(p=>[...p,item]);setSelectedId(id)
    }
    reader.onerror=()=>alert('Не удалось прочитать GLB-файл.')
    reader.readAsDataURL(file)
  }
  const openFile=file=>{
    if(!file)return
    const reader=new FileReader()
    reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.items))throw Error();setItems(d.items);setProjectName(d.projectName||'Imported Project');setSelectedId(d.items[0]?.id||null);if(d.cameraSettings)setCameraSettings(d.cameraSettings);if(d.cameraRig)setCameraRig(d.cameraRig);if(Array.isArray(d.keyframes))setKeyframes(d.keyframes);if(Array.isArray(d.objectKeyframes))setObjectKeyframes(d.objectKeyframes);if(Number.isFinite(d.playhead))setPlayhead(d.playhead);if(Number.isFinite(d.timelineDuration))setTimelineDuration(d.timelineDuration);if(Array.isArray(d.storyboard))setStoryboard(d.storyboard);if(d.renderSettings)setRenderSettings(d.renderSettings)}catch{alert('Invalid OZPREVIS project file')}}
    reader.readAsText(file)
  }
  useEffect(()=>{
    const onKeyDown = event => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      const typing = target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]')
      if (typing || target?.isContentEditable) return

      // Use physical key codes so shortcuts work with both Latin and Cyrillic layouts.
      const code = event.code
      const handled = ['KeyB','KeyA','KeyC','KeyK','KeyW','KeyE','KeyR','KeyQ','Space','Delete','Backspace'].includes(code)
      if (!handled) return
      event.preventDefault()

      if (code === 'KeyB') { setWorkspaceMode('build'); setActiveTab('inspector'); setTool('select'); return }
      if (code === 'KeyA') { setWorkspaceMode('animate'); setTool('select'); return }
      if (code === 'KeyC') { setWorkspaceMode('camera'); setActiveTab('camera'); setRigEnabled(true); return }
      if (code === 'KeyK') { if(workspaceMode==='animate') addObjectKeyframe(); else addKeyframe(); return }
      if (code === 'Space') { if(workspaceMode!=='animate') setTimelinePlaying(v=>!v); return }
      if (code === 'Delete' || code === 'Backspace') { remove(); return }
      const modes = {KeyW:'translate',KeyE:'rotate',KeyR:'scale',KeyQ:'select'}
      const mode = modes[code]
      if (mode) setTool(mode)
    }
    window.addEventListener('keydown', onKeyDown, {capture:true})
    return ()=>window.removeEventListener('keydown', onKeyDown, {capture:true})
  },[workspaceMode,selected,objectKeyframes.length,keyframes.length])
  const axes=['X','Y','Z']
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">O</div><div><div className="brand-name">OZATROOM <span>PREVIS</span></div><div className="brand-sub">CINEMATIC PREVISUALIZATION</div></div></div>
      <div className="project-title"><i/> <input value={projectName} onChange={e=>setProjectName(e.target.value)}/><ChevronDown size={13}/></div>
      <div className="top-actions"><button className="top-btn" onClick={()=>modelInputRef.current.click()}><Plus size={15}/> Import GLB</button><button className="top-btn" onClick={()=>inputRef.current.click()}><FolderOpen size={15}/> Open</button><button className="top-btn primary" onClick={save}><Save size={15}/> Save Project</button><div className="avatar">O</div><input ref={inputRef} hidden type="file" accept=".json,.ozprevis.json" onChange={e=>openFile(e.target.files?.[0])}/><input ref={modelInputRef} hidden type="file" accept=".glb,model/gltf-binary" onChange={e=>{importModel(e.target.files?.[0]);e.target.value=""}}/></div>
    </header>
    <div className="workspace">
      <aside className="left-panel">
        <div className="panel-heading">SCENE HIERARCHY <button className="tiny-icon" onClick={()=>add('box')}><Plus size={15}/></button></div>
        <div className="scene-root"><ChevronDown size={13}/><Layers3 size={14}/> Scene Collection <span>{items.length}</span></div>
        <div className="outliner">{items.map(item=>{const I=kindIcon(item.kind);return <div key={item.id} className={'outliner-row '+(selectedId===item.id?'selected':'')} onClick={()=>setSelectedId(item.id)}><I size={14}/><span>{item.name}</span><button className="visibility" onClick={e=>{e.stopPropagation();setItems(p=>p.map(x=>x.id===item.id?{...x,visible:!x.visible}:x))}}>{item.visible?<Eye size={13}/>:<EyeOff size={13}/>}</button></div>})}</div>
        <div className="left-footer"><i/> {items.length} OBJECTS IN SCENE</div>
      </aside>
      <main className="center-stage">
        <div className="viewport-toolbar">
          <div className="mode-switcher" role="group" aria-label="Workspace mode">
            <button className={workspaceMode==='build'?'active':''} onClick={()=>{setWorkspaceMode('build');setActiveTab('inspector')}}><span>B</span> BUILD</button>
            <button className={workspaceMode==='animate'?'active':''} onClick={()=>setWorkspaceMode('animate')}><span>A</span> ANIMATE</button>
            <button className={workspaceMode==='camera'?'active':''} onClick={()=>{setWorkspaceMode('camera');setActiveTab('camera');setRigEnabled(true)}}><span>C</span> CAMERA</button>
          </div>
          <div className="toolbar-mode-divider"/>
          <div className="tool-group">
            <ToolButton title="Select / Orbit" active={tool==='select'} onClick={()=>setTool('select')}><MousePointer2 size={16}/></ToolButton>
            <ToolButton title="Move (W)" active={tool==='translate'} onClick={()=>setTool('translate')}><Move size={16}/></ToolButton>
            <ToolButton title="Rotate (E)" active={tool==='rotate'} onClick={()=>setTool('rotate')}><Rotate3D size={16}/></ToolButton>
            <ToolButton title="Scale (R)" active={tool==='scale'} onClick={()=>setTool('scale')}><Scaling size={16}/></ToolButton>
          </div><div className="toolbar-divider"/>
          <div className="tool-group add-wrap"><button className="add-menu" onClick={()=>setAddOpen(v=>!v)}><Plus size={15}/> Add Object <ChevronDown size={12}/></button>
            {addOpen&&<div className="add-dropdown">{[['box','Cube',Box],['sphere','Sphere',Circle],['cylinder','Cylinder',Cylinder],['plane','Plane',Grid3X3]].map(([k,n,I])=><button key={k} onClick={()=>add(k)}><I size={14}/>{n}</button>)}</div>}
            <ToolButton title="Duplicate" onClick={duplicate}><Copy size={15}/></ToolButton><ToolButton title="Delete" onClick={remove}><Trash2 size={15}/></ToolButton>
          </div><div className="viewport-label"><i/> PERSPECTIVE <b>·</b> REALTIME</div>
        </div>
        <div className="viewport"><Viewport items={items} selectedId={selectedId} setSelectedId={setSelectedId} tool={tool} register={register} onTransformEnd={sync} cameraSettings={cameraSettings} cameraRig={cameraRig} rigEnabled={rigEnabled}/><div className={'frame-guide '+(renderSettings.frameGuide?'':'hidden')} style={{aspectRatio:renderSettings.ratio.replace(':',' / '),width:(Number(renderSettings.ratio.split(':')[0])/Number(renderSettings.ratio.split(':')[1]))<1?(82*Number(renderSettings.ratio.split(':')[0])/Number(renderSettings.ratio.split(':')[1]))+'%':'82%'}}><div className={'safe-guide '+(renderSettings.safeGuides?'':'hidden')}></div></div><div className="viewport-hud"><span>WORLD SPACE</span><span>GLB IMPORT · METERS · XYZ</span></div><div className="viewport-bottom"><span>SCENE BUILDER / VIEWPORT</span><span>GPU PREVIEW <i/></span></div></div>
        <div className="bottom-panel"><div className="timeline-head"><div><Film size={14}/> {workspaceMode==='animate'?'OBJECT ANIMATION':'SHOT TIMELINE'} <small>{workspaceMode==='animate'?objectKeyframes.length:keyframes.length} keyframes</small></div><div className="timeline-actions">{workspaceMode==='animate'?<><button onClick={addObjectKeyframe} disabled={!selected}><Plus size={12}/> Keyframe (K)</button><button onClick={()=>setTimelinePlaying(v=>!v)} disabled={objectKeyframes.length<2}>{timelinePlaying?'Pause':'Play'}</button><span>{playhead.toFixed(2)} / {timelineDuration}s</span></>:<><button onClick={addKeyframe}><Plus size={12}/> Add Keyframe</button><button disabled={keyframes.length<2} onClick={()=>setTimelinePlaying(v=>!v)}>{timelinePlaying?'Pause':'Play'}</button><span>24 FPS</span></>}</div></div><div className="timeline-track">{workspaceMode==='animate'?<><div className="playhead-controls"><label>DURATION <input type="number" min="1" max="60" value={timelineDuration} onChange={e=>setTimelineDuration(Math.max(1,Math.min(60,Number(e.target.value)||1)))}/> SEC</label><input aria-label="Timeline playhead" type="range" min="0" max={timelineDuration} step="0.01" value={Math.min(playhead,timelineDuration)} onChange={e=>{setTimelinePlaying(false);setPlayhead(Number(e.target.value))}}/><span>{playhead.toFixed(2)}s</span></div>{objectKeyframes.length===0?<div className="timeline-empty"><Clapperboard size={18}/> Select an object, move it, set time and press K</div>:<div className="object-track-list">{[...new Set(objectKeyframes.map(k=>k.objectId))].map(id=>{const track=objectKeyframes.filter(k=>k.objectId===id).sort((a,b)=>a.time-b.time);return <div className="object-track" key={id}><b>{track[0].objectName}</b>{track.map((frame,i)=><div className="object-keyframe-marker" key={frame.id} style={{left:(frame.time/timelineDuration*100)+'%'}}><button title={'Go to '+frame.time.toFixed(2)+'s'} onClick={()=>{setTimelinePlaying(false);setPlayhead(frame.time);setSelectedId(frame.objectId)}}>◆</button><select aria-label="Interpolation" value={frame.interpolation||'linear'} onChange={e=>setObjectKeyframes(p=>p.map(k=>k.id===frame.id?{...k,interpolation:e.target.value}:k))}><option value="linear">Linear</option><option value="easeInOut">Ease</option><option value="hold">Hold</option></select></div>)}</div>})}</div>}</>:keyframes.length===0?<div className="timeline-empty"><Clapperboard size={18}/> Move the camera, then add your first keyframe</div>:keyframes.map((frame,i)=><button className="keyframe-chip" key={frame.id} onClick={()=>applyKeyframe(frame)}><span>{String(i+1).padStart(2,'0')}</span>{frame.label}<small>{frame.focalLength}mm</small></button>)}</div></div>
      </main>
      <aside className="right-panel">
        <div className="panel-tabs"><button className={'tab '+(activeTab==='inspector'?'active':'')} onClick={()=>setActiveTab('inspector')}><Settings2 size={14}/> INSPECTOR</button><button className={'tab '+(activeTab==='camera'?'active':'')} onClick={()=>setActiveTab('camera')}><Camera size={14}/> CAMERA</button><button className={'tab '+(activeTab==='storyboard'?'active':'')} onClick={()=>setActiveTab('storyboard')}><FileText size={14}/> SHOTS</button><button className={'tab '+(activeTab==='render'?'active':'')} onClick={()=>setActiveTab('render')}><MonitorPlay size={14}/> RENDER</button><button className={'tab '+(activeTab==='architecture'?'active':'')} onClick={()=>setActiveTab('architecture')}><Box size={14}/> ARCH</button></div>
        {activeTab==='architecture'?<><div className="inspector-object"><div className="object-icon"><Box/></div><div className="object-meta"><b>Architecture Tools</b><small>BLOCKOUT · DIMENSIONS IN METERS</small></div></div><section className="inspector-section"><div className="section-title">BUILDING ELEMENTS <i/></div><div className="arch-tool-grid"><button onClick={()=>add('wall')}><Box size={15}/> WALL</button><button onClick={()=>add('floor')}><Grid3X3 size={15}/> FLOOR</button><button onClick={()=>add('ceiling')}><Layers3 size={15}/> CEILING</button></div><div className="camera-note">Creates editable 3D blockout elements. Select an element to change its dimensions in the Inspector.</div></section><section className="inspector-section"><div className="section-title">UNITS <i/></div><select className="camera-select" value={units} onChange={e=>setUnits(e.target.value)}><option value="m">Meters (m)</option><option value="cm">Centimeters (cm)</option><option value="mm">Millimeters (mm)</option></select><div className="camera-note">Unit display changes dimension labels only. Scene coordinates remain in meters.</div></section><section className="inspector-section"><div className="section-title">QUICK DIMENSIONS <i/></div><div className="data-row"><span>Wall preset</span><code>4.00 × 2.80 × 0.20 m</code></div><div className="data-row"><span>Floor preset</span><code>4.00 × 0.12 × 4.00 m</code></div><div className="data-row"><span>Ceiling preset</span><code>4.00 × 0.12 × 4.00 m</code></div></section></>:activeTab==='render'?<><div className="inspector-object"><div className="object-icon"><MonitorPlay/></div><div className="object-meta"><b>Render & Frame</b><small>PREVIEW OUTPUT SETTINGS</small></div></div><section className="inspector-section"><div className="section-title">ASPECT RATIO <i/></div><div className="render-choice-grid">{['16:9','9:16','1:1','4:3','2.39:1'].map(r=><button className={renderSettings.ratio===r?'chosen':''} key={r} onClick={()=>setRenderSettings(p=>({...p,ratio:r}))}>{r}</button>)}</div><div className="section-title render-subhead">RESOLUTION <i/></div><select className="camera-select" value={renderSettings.resolution} onChange={e=>setRenderSettings(p=>({...p,resolution:e.target.value}))}><option>1280x720</option><option>1920x1080</option><option>2560x1440</option><option>3840x2160</option><option>1080x1920</option><option>2160x2160</option></select><div className="camera-note">Resolution is a project output target. PNG export currently captures the viewport's actual displayed pixel size.</div></section><section className="inspector-section"><div className="section-title">COMPOSITION GUIDES <i/></div><label className="render-check"><input type="checkbox" checked={renderSettings.frameGuide} onChange={e=>setRenderSettings(p=>({...p,frameGuide:e.target.checked}))}/> Aspect ratio frame</label><label className="render-check"><input type="checkbox" checked={renderSettings.safeGuides} onChange={e=>setRenderSettings(p=>({...p,safeGuides:e.target.checked}))}/> Action & title safe zones</label><button className="export-preview-button" onClick={exportPreview}><Download size={14}/> EXPORT VIEWPORT PNG</button></section></>:activeTab==='storyboard'?<><div className="inspector-object"><div className="object-icon"><FileText/></div><div className="object-meta"><b>Storyboard Manager</b><small>{storyboard.length} SHOTS IN SEQUENCE</small></div></div><section className="inspector-section"><button className="add-shot-button" onClick={addShot}><Plus size={13}/> ADD SHOT</button><button className="export-frames-button" onClick={exportStoryboardFrames} disabled={!storyboard.length||exportingFrames}><Download size={13}/>{exportingFrames?'EXPORTING FRAMES…':'EXPORT ALL FRAMES · ZIP'}</button><div className="storyboard-list">{storyboard.length===0?<div className="storyboard-empty">No shots yet. Add a shot to build your storyboard.</div>:storyboard.map((shot,index)=><div className="storyboard-card" key={shot.id}><div className="shot-card-head"><span className="shot-number">{String(index+1).padStart(2,'0')}</span><button onClick={()=>applyShot(shot)}>VIEW</button><button className="shot-delete" onClick={()=>setStoryboard(p=>p.filter(x=>x.id!==shot.id))}><Trash2 size={12}/></button></div><input className="shot-title-input" value={shot.title} onChange={e=>updateShot(shot.id,'title',e.target.value)}/><div className="shot-fields"><label>SHOT TYPE<select value={shot.shotType} onChange={e=>updateShot(shot.id,'shotType',e.target.value)}><option>Extreme Wide</option><option>Wide</option><option>Medium</option><option>Close-up</option><option>Extreme Close-up</option><option>Over the Shoulder</option><option>POV</option><option>Insert</option></select></label><label>DURATION (SEC)<input type="number" min="1" max="120" value={shot.duration} onChange={e=>updateShot(shot.id,'duration',Math.max(1,Math.min(120,Number(e.target.value)||1)))}/></label></div><label className="shot-description-label">DIRECTOR'S NOTES<textarea rows="2" placeholder="Action, composition, movement..." value={shot.description} onChange={e=>updateShot(shot.id,'description',e.target.value)}/></label><div className="shot-camera-meta"><span>{shot.focalLength} mm</span><span>{shot.duration}s</span><button onClick={()=>captureShot(shot.id)}>CAPTURE CURRENT CAMERA</button></div></div>)}</div></section></>:activeTab==='camera'?<><div className="inspector-object"><div className="object-icon"><Camera/></div><div className="object-meta"><b>Cinematic Camera</b><small>LIVE VIEWPORT LENS</small></div></div>
          <section className="inspector-section"><div className="section-title">CAMERA RIG <i/></div><button className={'rig-toggle '+(rigEnabled?'enabled':'')} onClick={()=>setRigEnabled(v=>!v)}>{rigEnabled?'RIG CONTROL ON':'ENABLE RIG CONTROL'}</button><div className="rig-buttons"><div><span>DOLLY</span><button onClick={()=>moveRig(2,-.5)}>−</button><button onClick={()=>moveRig(2,.5)}>+</button></div><div><span>TRUCK</span><button onClick={()=>moveRig(0,-.5)}>−</button><button onClick={()=>moveRig(0,.5)}>+</button></div><div><span>PEDESTAL</span><button onClick={()=>moveRig(1,-.5)}>−</button><button onClick={()=>moveRig(1,.5)}>+</button></div></div><div className="rig-buttons"><div><span>PAN</span><button onClick={()=>aimRig(0,-.5)}>−</button><button onClick={()=>aimRig(0,.5)}>+</button></div><div><span>TILT</span><button onClick={()=>aimRig(1,-.5)}>−</button><button onClick={()=>aimRig(1,.5)}>+</button></div><div><span>RESET</span><button onClick={()=>{setCameraRig({position:[8,6,9],target:[0,0,0]});setRigEnabled(true)}}>↺</button></div></div><div className="camera-note">Enable rig control to lock the viewport camera to these controls. Orbit navigation is paused while the rig is active.</div></section><section className="inspector-section"><div className="section-title">CAMERA PROFILE <i/></div><select className="camera-select" value={cameraSettings.profile} onChange={e=>setCameraSettings(p=>({...p,profile:e.target.value,sensorWidth:e.target.value==='Sony Venice 2'?36:e.target.value==='ARRI Alexa Mini LF'?36.7:27.99}))}><option>ARRI Alexa 35</option><option>ARRI Alexa Mini LF</option><option>Sony Venice 2</option><option>Super 35 Generic</option></select><div className="camera-note">Sensor width: {cameraSettings.sensorWidth.toFixed(2)} mm</div></section>
          <section className="inspector-section"><div className="section-title">LENS SETTINGS <i/></div><div className="camera-control"><label>Focal Length</label><div><input type="range" min="18" max="200" step="1" value={cameraSettings.focalLength} onChange={e=>setCameraSettings(p=>({...p,focalLength:Number(e.target.value)}))}/><strong>{cameraSettings.focalLength} mm</strong></div></div><div className="lens-presets">{[18,24,35,50,85,135].map(v=><button className={cameraSettings.focalLength===v?'chosen':''} key={v} onClick={()=>setCameraSettings(p=>({...p,focalLength:v}))}>{v}</button>)}</div><div className="camera-control aperture-control"><label>Aperture (metadata)</label><div><input type="range" min="1.4" max="16" step="0.1" value={cameraSettings.aperture} onChange={e=>setCameraSettings(p=>({...p,aperture:Number(e.target.value)}))}/><strong>f/{cameraSettings.aperture.toFixed(1)}</strong></div></div><div className="camera-note">Aperture is stored in the shot settings. Optical depth-of-field rendering is planned for a later build.</div></section>
          <section className="inspector-section"><div className="section-title">FRAMING <i/></div><div className="data-row"><span>Horizontal FOV</span><code>{(2*Math.atan(cameraSettings.sensorWidth/(2*cameraSettings.focalLength))*180/Math.PI).toFixed(1)}°</code></div><div className="data-row"><span>Lens</span><code>{cameraSettings.focalLength} mm</code></div></section>
        </>:selected?<><div className="inspector-object"><div className="object-icon">{(()=>{const I=kindIcon(selected.kind);return <I/>})()}</div><div className="object-meta"><input value={selected.name} onChange={e=>update('name',null,e.target.value)}/><small>{selected.kind.toUpperCase()} · {['wall','floor','ceiling'].includes(selected.kind)?'ARCH ELEMENT':'OBJECT'}</small></div></div>
          <section className="inspector-section"><div className="section-title">TRANSFORM <i/></div>
            {['position','rotation','scale'].map(key=><div className="transform-block" key={key}><div className="transform-label">{key.toUpperCase()} <button onClick={()=>[0,1,2].forEach(i=>update(key,i,key==='scale'?1:0))}>RESET</button></div><div className="vector-inputs">{axes.map((axis,i)=><label key={axis}><span className={'axis-'+axis.toLowerCase()}>{axis}</span><input type="number" step=".1" value={Number(selected[key][i].toFixed(3))} onChange={e=>update(key,i,e.target.value)}/></label>)}</div></div>)}
          </section>
          <section className="inspector-section"><div className="section-title">DIMENSIONS ({units}) <i/></div><div className="dimension-readout">{selected.scale.map((v,i)=><div key={i}><span>{['W','H','D'][i]}</span><b>{(v*(units==='m'?1:units==='cm'?100:1000)).toFixed(0===0?2:1)}</b></div>)}</div><div className="camera-note">Edit Scale X/Y/Z in Transform to change width, height and depth. One scene unit = 1 meter.</div></section><section className="inspector-section"><div className="section-title">MATERIAL <i/></div><div className="color-row"><span>Base Color</span><input type="color" value={selected.color} onChange={e=>update('color',null,e.target.value)}/><code>{selected.color.toUpperCase()}</code></div></section>
          <section className="inspector-section"><div className="section-title">OBJECT DATA <i/></div><div className="data-row"><span>Object ID</span><code>{selected.id}</code></div><div className="data-row"><span>Visibility</span><button className="text-toggle" onClick={()=>setItems(p=>p.map(x=>x.id===selected.id?{...x,visible:!x.visible}:x))}>{selected.visible?'Visible':'Hidden'}</button></div></section>
          <button className="delete-object" onClick={remove}><Trash2 size={14}/> Delete Object</button>
        </>:<div className="empty-inspector"><MousePointer2 size={24}/><b>No object selected</b><span>Select an object in the viewport or Scene Hierarchy.</span></div>}
        <div className="right-footer"><Sparkles size={13}/> OZATROOM PREVIS <span>v1.0.0</span></div>
      </aside>
    </div>
    <footer className="statusbar"><div><i/> READY</div><div><span>SCENE: {items.length} OBJECTS</span><span>SELECTED: {selected?.name||'NONE'}</span><span>WEBGL VIEWPORT</span></div><div>BEYOND REALITY.</div></footer>
  </div>
}