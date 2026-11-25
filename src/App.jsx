import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber'
import { Suspense } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Grid, Line, OrbitControls, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Box, Circle, Cylinder, Grid3X3, Layers3, Move, Rotate3D, Scaling,
  Save, FolderOpen, Plus, Trash2, Copy, Eye, EyeOff, Camera, FileText, Download, MonitorPlay, Undo2, Redo2,
  ChevronDown, MousePointer2, Settings2, Film, Clapperboard, Sparkles, MessageSquare, WandSparkles
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


const AUTOSAVE_DB = 'ozatroom-previs-local'
const AUTOSAVE_STORE = 'projects'
const openAutosaveDB = () => new Promise((resolve,reject) => {
  if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'))
  const request = indexedDB.open(AUTOSAVE_DB,1)
  request.onupgradeneeded = () => request.result.createObjectStore(AUTOSAVE_STORE)
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
const readAutosave = async () => {
  const db = await openAutosaveDB()
  return new Promise((resolve,reject) => {
    const request = db.transaction(AUTOSAVE_STORE,'readonly').objectStore(AUTOSAVE_STORE).get('latest')
    request.onsuccess = () => { db.close(); resolve(request.result || null) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}
const writeAutosave = async data => {
  const db = await openAutosaveDB()
  return new Promise((resolve,reject) => {
    const tx = db.transaction(AUTOSAVE_STORE,'readwrite')
    tx.objectStore(AUTOSAVE_STORE).put(data,'latest')
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
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

function CameraRigView({enabled,position,target,shakeAmount=0}) {
  const {camera}=useThree()
  useEffect(()=>{
    if(!enabled)return
    camera.position.set(...position)
    camera.up.set(0,1,0)
    camera.lookAt(...target)
    camera.updateMatrixWorld()
  },[camera,enabled,position,target])
  useFrame(({clock})=>{
    if(!enabled||shakeAmount<=0)return
    const t=clock.elapsedTime, strength=shakeAmount*0.018
    camera.position.set(position[0]+Math.sin(t*17.3)*strength,position[1]+Math.sin(t*23.1+1.7)*strength*.72,position[2]+Math.cos(t*19.7+.4)*strength)
    camera.lookAt(...target)
  })
  return null
}

function Viewport({items, selectedId, setSelectedId, tool, register, onTransformEnd, cameraSettings, cameraRig, rigEnabled, keyframes, selectedCameraKeyframeId, setSelectedCameraKeyframeId, onCameraWaypointTransformEnd}) {
  const [activeObject, setActiveObject] = useState(null)
  const [activeWaypoint, setActiveWaypoint] = useState(null)
  const waypointRefs = useRef({})
  useEffect(() => {
    setActiveObject(window.__ozatroomObjects?.[selectedId] || null)
  }, [selectedId, items])
  useEffect(() => { setActiveWaypoint(waypointRefs.current[selectedCameraKeyframeId] || null) }, [selectedCameraKeyframeId, keyframes])
  const fov = 2 * Math.atan(cameraSettings.sensorWidth / (2 * cameraSettings.focalLength)) * 180 / Math.PI
  return <Canvas shadows dpr={[1,1.7]} camera={{position:[8,6,9],fov}} gl={{antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true}}>
    <CameraLens fov={fov}/><CameraRigView enabled={rigEnabled} position={cameraRig.position} target={cameraRig.target} shakeAmount={cameraSettings.handheldShake||0}/><color attach="background" args={['#171b20']}/>
    <fog attach="fog" args={['#171b20',22,48]}/>
    <ambientLight intensity={.8}/>
    <directionalLight position={[5,10,6]} intensity={2.1} castShadow shadow-mapSize={[2048,2048]}/>
    <directionalLight position={[-6,4,-4]} intensity={.55} color="#8ca4bb"/>
    <Grid args={[40,40]} position={[0,-.035,0]} cellSize={1} cellThickness={.6} cellColor="#46505a"
      sectionSize={5} sectionThickness={1.1} sectionColor="#77818b" fadeDistance={35} fadeStrength={1.5} infiniteGrid/>
    {items.map(item=>item.kind==='model' ? <ImportedModel key={item.id} item={item} register={register} onSelect={setSelectedId}/> : <MeshItem key={item.id} item={item} selected={item.id===selectedId} register={register} onSelect={setSelectedId}/>)}
    {rigEnabled && keyframes.length>0 && <>
      {keyframes.length>1 && <Line points={keyframes.map(frame=>frame.position)} color="#d6a66b" lineWidth={2} dashed dashSize={.18} gapSize={.1}/>}
      {keyframes.map((frame,index)=><group key={frame.id} ref={node=>{if(node){waypointRefs.current[frame.id]=node;if(frame.id===selectedCameraKeyframeId)setActiveWaypoint(node)}else delete waypointRefs.current[frame.id]}} position={frame.position} onClick={event=>{event.stopPropagation();setSelectedCameraKeyframeId(frame.id)}}>
        <mesh><sphereGeometry args={[frame.id===selectedCameraKeyframeId ? 0.22 : 0.13,16,12]}/><meshBasicMaterial color={frame.id===selectedCameraKeyframeId?'#f2c28e':'#d6a66b'}/></mesh>
      </group>)}
      {activeWaypoint && <TransformControls object={activeWaypoint} mode="translate" onMouseUp={()=>onCameraWaypointTransformEnd(selectedCameraKeyframeId,activeWaypoint.position.toArray())}/>}
    </>}
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
  const [scriptText,setScriptText]=useState('Ночная горная дорога в Таджикистане. Мужчина выходит из старого Mercedes-Benz W123 в тумане. Камера медленно приближается, фары освещают мокрый асфальт.')
  const [aiPrompt,setAiPrompt]=useState('')
  const [sceneJson,setSceneJson]=useState('')
  const [aiMessages,setAiMessages]=useState([{role:'assistant',text:'Опиши сцену или вставь сценарий. Я подготовлю кинематографический промт и соберу черновую 3D-сцену из доступных объектов.'}])
  const [aiBusy,setAiBusy]=useState(false)
  const [cameraSettings,setCameraSettings]=useState({profile:'ARRI Alexa 35',focalLength:35,sensorWidth:27.99,aperture:2.8,focusDistance:5,handheldShake:0})
  const [cameraRig,setCameraRig]=useState({position:[8,6,9],target:[0,0,0]})
  const [rigEnabled,setRigEnabled]=useState(false)
  const [cameraRigType,setCameraRigType]=useState('director')
  const [cameraDuration,setCameraDuration]=useState(8)
  const [keyframes,setKeyframes]=useState([])
  const [selectedCameraKeyframeId,setSelectedCameraKeyframeId]=useState(null)
  const [timelinePlaying,setTimelinePlaying]=useState(false)
  const [storyboard,setStoryboard]=useState([])
  const [renderSettings,setRenderSettings]=useState({ratio:'16:9',resolution:'1920x1080',safeGuides:true,frameGuide:true})
  const [units,setUnits]=useState('m')
  const [exportingFrames,setExportingFrames]=useState(false)
  const [exportingVideo,setExportingVideo]=useState(false)
  const [autosaveReady,setAutosaveReady]=useState(false)
  const [historyRevision,setHistoryRevision]=useState(0)
  const [autosaveStatus,setAutosaveStatus]=useState('RESTORING…')
  const historyRef=useRef({past:[],future:[],last:null,ready:false,restoring:false})
  const refs=useRef({})
  const inputRef=useRef()
  const modelInputRef=useRef()
  const selected=items.find(x=>x.id===selectedId)
  const register=useCallback((id,obj)=>{if(obj)refs.current[id]=obj;else delete refs.current[id];window.__ozatroomObjects=refs.current},[])
  const sync=useCallback(()=>setItems(old=>old.map(x=>{const o=refs.current[x.id];return o?{...x,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray()}:x})),[])

  const snapshotProject=()=>({projectName,items,cameraSettings,cameraRig,cameraRigType,cameraDuration,keyframes,objectKeyframes,playhead,timelineDuration,storyboard,renderSettings})
  const applySnapshot=data=>{
    historyRef.current.restoring=true
    historyRef.current.last=JSON.stringify(data)
    setProjectName(data.projectName||'Untitled Cinematic')
    setItems(data.items||starter)
    setCameraSettings({...{profile:'ARRI Alexa 35',focalLength:35,sensorWidth:27.99,aperture:2.8,focusDistance:5,handheldShake:0},...(data.cameraSettings||{})})
    setCameraRig(data.cameraRig||{position:[8,6,9],target:[0,0,0]})
    setCameraRigType(data.cameraRigType||'director')
    setCameraDuration(data.cameraDuration||8)
    setKeyframes(data.keyframes||[])
    setObjectKeyframes(data.objectKeyframes||[])
    setPlayhead(data.playhead||0)
    setTimelineDuration(data.timelineDuration||10)
    setStoryboard(data.storyboard||[])
    setRenderSettings(data.renderSettings||{ratio:'16:9',resolution:'1920x1080',safeGuides:true,frameGuide:true})
    setSelectedId((data.items||starter)[0]?.id||null)
    setTimelinePlaying(false)
  }
  const undo=()=>{
    const h=historyRef.current
    if(!h.past.length)return
    const current=snapshotProject(), previous=h.past.pop()
    h.future.push(current)
    setHistoryRevision(v=>v+1)
    applySnapshot(previous)
  }
  const redo=()=>{
    const h=historyRef.current
    if(!h.future.length)return
    const current=snapshotProject(), next=h.future.pop()
    h.past.push(current)
    setHistoryRevision(v=>v+1)
    applySnapshot(next)
  }
  const canUndo=historyRef.current.past.length>0
  const canRedo=historyRef.current.future.length>0
  useEffect(()=>{
    let active=true
    readAutosave().then(data=>{
      if(!active)return
      if(data?.items?.length) {
        setProjectName(data.projectName||'Recovered Project')
        setItems(data.items)
        setCameraSettings({...{profile:'ARRI Alexa 35',focalLength:35,sensorWidth:27.99,aperture:2.8,focusDistance:5,handheldShake:0},...(data.cameraSettings||{})})
        setCameraRig(data.cameraRig||{position:[8,6,9],target:[0,0,0]})
        setCameraRigType(data.cameraRigType||'director')
        setCameraDuration(data.cameraDuration||8)
        setKeyframes(data.keyframes||[])
        setObjectKeyframes(data.objectKeyframes||[])
        setPlayhead(data.playhead||0)
        setTimelineDuration(data.timelineDuration||10)
        setStoryboard(data.storyboard||[])
        setRenderSettings(data.renderSettings||{ratio:'16:9',resolution:'1920x1080',safeGuides:true,frameGuide:true})
        setSelectedId(data.items[0]?.id||null)
        setAutosaveStatus('RECOVERED')
      } else setAutosaveStatus('READY')
    }).catch(()=>{if(active)setAutosaveStatus('LOCAL STORAGE UNAVAILABLE')}).finally(()=>{
      if(active){historyRef.current.last=null;historyRef.current.ready=true;setAutosaveReady(true);setHistoryRevision(v=>v+1)}
    })
    return ()=>{active=false}
  },[])
  useEffect(()=>{
    if(!autosaveReady)return
    const timer=setTimeout(()=>{
      writeAutosave(snapshotProject()).then(()=>setAutosaveStatus('SAVED LOCALLY')).catch(()=>setAutosaveStatus('AUTOSAVE FAILED'))
    },700)
    return ()=>clearTimeout(timer)
  },[autosaveReady,projectName,items,cameraSettings,cameraRig,cameraRigType,cameraDuration,keyframes,objectKeyframes,playhead,timelineDuration,storyboard,renderSettings])
  useEffect(()=>{
    const h=historyRef.current
    if(!h.ready)return
    const current=JSON.stringify(snapshotProject())
    if(h.restoring){h.restoring=false;h.last=current;return}
    if(timelinePlaying){h.last=current;return}
    if(!h.last){h.last=current;return}
    if(current===h.last)return
    const previous=h.last
    const timer=setTimeout(()=>{
      if(h.restoring)return
      h.past.push(JSON.parse(previous))
      if(h.past.length>60)h.past.shift()
      h.future=[]
      h.last=current
      setHistoryRevision(v=>v+1)
    },180)
    return ()=>clearTimeout(timer)
  },[projectName,items,cameraSettings,cameraRig,cameraRigType,cameraDuration,keyframes,objectKeyframes,playhead,timelineDuration,storyboard,renderSettings,timelinePlaying])
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
    const frame={id:uid(),label:'Shot '+String(keyframes.length+1).padStart(2,'0'),interpolation:'easeInOut',position:[...cameraRig.position],target:[...cameraRig.target],focalLength:cameraSettings.focalLength}
    setKeyframes(p=>[...p,frame]);setSelectedCameraKeyframeId(frame.id);setRigEnabled(true)
  }
  const updateCameraWaypoint=(id,position)=>setKeyframes(p=>p.map(frame=>frame.id===id?{...frame,position:[...position]}:frame))
  const deleteCameraKeyframe=id=>{setKeyframes(p=>p.filter(frame=>frame.id!==id));if(selectedCameraKeyframeId===id)setSelectedCameraKeyframeId(null)}
  const applyKeyframe=frame=>{setRigEnabled(true);setCameraRig({position:[...frame.position],target:[...frame.target]});setCameraSettings(p=>({...p,focalLength:frame.focalLength}))}
  const exportCameraVideo=async()=>{
    if(keyframes.length<2||exportingVideo)return
    const canvas=document.querySelector('.viewport canvas')
    if(!canvas?.captureStream||!window.MediaRecorder){alert('This browser does not support viewport video recording. Try a current version of Chrome or Edge.');return}
    const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm'
    const stream=canvas.captureStream(24)
    const chunks=[]
    let recorder
    try{
      recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:12000000})
      setExportingVideo(true)
      recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)}
      recorder.onerror=event=>{stream.getTracks().forEach(track=>track.stop());setExportingVideo(false);alert('Video recording failed: '+(event.error?.message||'unknown error'))}
      recorder.onstop=()=>{
        const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'})
        const url=URL.createObjectURL(blob),a=document.createElement('a')
        a.href=url;a.download=(projectName.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'ozatroom')+'-camera-preview.webm';a.click()
        setTimeout(()=>URL.revokeObjectURL(url),2000)
        stream.getTracks().forEach(track=>track.stop())
        setExportingVideo(false)
      }
      recorder.start(250)
      setTimelinePlaying(false)
      await waitFrame()
      setTimelinePlaying(true)
      const duration=cameraDuration*1000
      window.setTimeout(()=>{setTimelinePlaying(false);if(recorder.state!=='inactive')recorder.stop()},duration+300)
    }catch(error){
      stream.getTracks().forEach(track=>track.stop())
      setExportingVideo(false)
      alert('Could not start video recording: '+error.message)
    }
  }
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
  const applyCameraRigPreset=type=>{
    setCameraRigType(type);setRigEnabled(true)
    const presets={director:{position:[8,6,9],target:[0,0,0]},dolly:{position:[5,3.2,7],target:[0,1,0]},orbit:{position:[7,3.5,0],target:[0,1,0]},crane:{position:[7,10,8],target:[0,0,0]},fpv:{position:[0,1.7,6],target:[0,1.7,0]}}
    setCameraRig(presets[type]||presets.director)
  }
  const createDollyZoom=()=>{
    if(keyframes.length<2){alert('Create at least two camera keyframes first.');return}
    const first=keyframes[0],baseDistance=Math.max(.1,Math.hypot(...first.position.map((v,i)=>v-first.target[i])))
    setKeyframes(p=>p.map(frame=>{const distance=Math.max(.1,Math.hypot(...frame.position.map((v,i)=>v-frame.target[i])));return {...frame,focalLength:Math.max(18,Math.min(200,Math.round(first.focalLength*distance/baseDistance)))}}))
  }
  const createOrbitPath=()=>{
    const center=cameraRig.target||[0,0,0],radius=Math.max(3,Math.hypot(cameraRig.position[0]-center[0],cameraRig.position[2]-center[2]))
    const frames=Array.from({length:8},(_,i)=>{const angle=(Math.PI*2*i)/7;return {id:uid(),label:'Orbit '+String(i+1).padStart(2,'0'),position:[center[0]+Math.cos(angle)*radius,cameraRig.position[1],center[2]+Math.sin(angle)*radius],target:[...center],focalLength:cameraSettings.focalLength}})
    setKeyframes(frames);setSelectedCameraKeyframeId(frames[0].id);setCameraRig({position:[...frames[0].position],target:[...frames[0].target]});setRigEnabled(true)
  }
  const createCameraMove=(type)=>{
    const p=[...cameraRig.position],t=[...cameraRig.target],dir=t.map((v,i)=>v-p[i]),len=Math.max(.001,Math.hypot(...dir)),unit=dir.map(v=>v/len)
    let endP=[...p],endT=[...t],label='Camera Move'
    if(type==='push-in'){endP=p.map((v,i)=>v+unit[i]*Math.min(2.5,len*.35));label='Push In'}
    if(type==='pull-out'){endP=p.map((v,i)=>v-unit[i]*Math.min(3.5,len*.45));label='Pull Out'}
    if(type==='truck-left'){endP[0]-=2;endT[0]-=2;label='Truck Left'}
    if(type==='truck-right'){endP[0]+=2;endT[0]+=2;label='Truck Right'}
    if(type==='crane-up'){endP[1]+=2.2;endT[1]+=.6;label='Crane Up'}
    if(type==='crane-down'){endP[1]-=1.5;endT[1]-=.4;label='Crane Down'}
    if(type==='pan-left'){endT[0]-=2.2;label='Pan Left'}
    if(type==='pan-right'){endT[0]+=2.2;label='Pan Right'}
    const frames=[{id:uid(),label:label+' · Start',position:p,target:t,focalLength:cameraSettings.focalLength,interpolation:'easeInOut'},{id:uid(),label:label+' · End',position:endP,target:endT,focalLength:cameraSettings.focalLength,interpolation:'easeInOut'}]
    setKeyframes(frames);setSelectedCameraKeyframeId(frames[0].id);setCameraRig({position:p,target:t});setRigEnabled(true);setTimelinePlaying(false)
  }
  const importPastedScene=()=>{
    try{
      const raw=sceneJson.trim()
      if(!raw)throw new Error('Вставь JSON-сцену, которую я подготовил в ChatGPT.')
      const data=JSON.parse(raw)
      if(!Array.isArray(data.objects)||!data.objects.length)throw new Error('В JSON не найден массив objects с объектами сцены.')
      const vector=(value,fallback)=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)?value:fallback
      const validKinds=['box','sphere','cylinder','plane']
      const imported=data.objects.map((o,i)=>({
        id:uid(),name:String(o.name||('Object '+(i+1))).slice(0,80),
        kind:validKinds.includes(o.kind)?o.kind:'box',
        position:vector(o.position,[0,.5,0]),rotation:vector(o.rotation,[0,0,0]),
        scale:vector(o.scale,[1,1,1]),color:/^#[0-9a-f]{6}$/i.test(o.color||'')?o.color:'#a99b89',
        visible:o.visible!==false
      }))
      const shots=Array.isArray(data.shots)?data.shots.map((s,i)=>({
        id:uid(),title:String(s.title||('Shot '+(i+1))),shotType:s.shotType||'Wide',
        duration:Math.max(1,Math.min(120,Number(s.duration)||3)),
        description:String(s.description||''),
        cameraPosition:vector(s.cameraPosition,[6,3,8]),
        cameraTarget:vector(s.cameraTarget,[0,1,0]),
        focalLength:Math.max(10,Math.min(300,Number(s.focalLength)||35))
      })):[]
      setItems(imported);setSelectedId(imported[0].id)
      if(shots.length){setStoryboard(shots);const frames=shots.map(s=>({id:uid(),label:s.title,position:s.cameraPosition,target:s.cameraTarget,focalLength:s.focalLength,interpolation:'easeInOut'}));setKeyframes(frames);setSelectedCameraKeyframeId(frames[0].id);setCameraRig({position:frames[0].position,target:frames[0].target});setRigEnabled(true)}
      if(data.camera&&Number.isFinite(Number(data.camera.duration)))setCameraDuration(Math.max(2,Math.min(30,Number(data.camera.duration))))
      setProjectName(String(data.sceneName||'ChatGPT Scene').slice(0,60))
      setAiMessages(p=>[...p,{role:'assistant',text:'Импортировано из ChatGPT: '+imported.length+' объектов и '+shots.length+' кадров. Теперь сцену можно редактировать в 3D viewport.'}])
      setWorkspaceMode('build');setActiveTab('ai');setTimelinePlaying(false)
    }catch(error){setAiMessages(p=>[...p,{role:'assistant',text:'Не удалось импортировать: '+error.message}])}
  }
  const generateSceneFromScript=()=>{
    const source=scriptText.trim()
    if(!source){setAiMessages(p=>[...p,{role:'assistant',text:'Сначала напиши короткое описание сцены или вставь сценарий.'}]);return}
    setAiBusy(true)
    const lower=source.toLowerCase()
    const has=(...words)=>words.some(word=>lower.includes(word))
    const generated=[]
    const make=(name,kind,position,scale,color)=>generated.push({id:uid(),name,kind,position,rotation:[0,0,0],scale,color,visible:true})
    make('Ground / Stage','plane',[0,-.06,0],[18,18,1],'#343c44')
    if(has('дорог','road','асфальт','шоссе'))make('Wet Mountain Road','box',[0,.02,0],[3.8,.08,15],'#252b30')
    if(has('машин','автомобил','mercedes','car','w123'))make('Hero Vehicle · W123','box',[0,.72,1.2],[2.1,1.05,4.2],'#6c777c')
    if(has('человек','мужчин','женщин','герой','персонаж','man','woman','person'))make('Main Character','box',[-1.7,.9,.2],[.55,1.8,.42],'#b6a18a')
    if(has('дом','здан','интерьер','комнат','house','building','room')){make('Architecture Block','box',[0,1.5,-3],[5,3,5],'#9a9185');make('Interior Floor','plane',[0,.03,-3],[5,5,1],'#8b8071')}
    if(has('гор','mountain','скал')){make('Mountain Left','box',[-6,2,-5],[5,4,5],'#46515a');make('Mountain Right','box',[6,2,-7],[5,4,5],'#3b464f')}
    if(has('дерев','лес','forest','tree')){for(let i=0;i<5;i++)make('Tree '+(i+1),'cylinder',[-4+i*2,.9,-4-(i%2)*2],[.35,1.8,.35],'#526657')}
    if(has('стол','table'))make('Table','box',[0,.75,0],[1.8,.12,1],'#92785d')
    if(has('стул','chair'))make('Chair','box',[1,.5,.8],[.55,1,.55],'#806c57')
    if(generated.length===1){make('Hero Subject','box',[0,.8,0],[1.5,1.6,1.2],'#b7a18a');make('Background Element','box',[0,1,-4],[5,2,.4],'#59636b')}
    const subject=generated.filter(x=>x.kind!=='plane').map(x=>x.name).join(', ')
    const prompt='CINEMATIC AI VIDEO PREVIS\nSCENE: '+source+'\nVISUAL SUBJECTS: '+subject+'\nLOOK: photorealistic cinematic lighting, atmospheric depth, realistic materials, motivated practical lighting, filmic contrast.\nCAMERA: 35mm lens, controlled dolly-in, eye-level composition, 24 fps, natural motion blur.\nCONTINUITY: preserve character, vehicle, environment and screen direction across shots.\nOUTPUT: create a coherent 3D blockout and use the storyboard shots as camera references.'
    const shots=[
      {title:'01 · Establishing',shotType:'Wide',duration:3,description:'Показать пространство, атмосферу и расположение объектов',cameraPosition:[8,5,11],cameraTarget:[0,1,0],focalLength:24},
      {title:'02 · Main Action',shotType:'Medium',duration:3,description:'Главное действие персонажа внутри сцены',cameraPosition:[5,2.8,7],cameraTarget:[0,1,0],focalLength:35},
      {title:'03 · Cinematic Detail',shotType:'Close-up',duration:2,description:'Деталь, эмоция или ключевой объект сцены',cameraPosition:[2.5,1.8,3.5],cameraTarget:[0,1,0],focalLength:85}
    ].map(shot=>({...shot,id:uid()}))
    setItems(generated);setSelectedId(generated.find(x=>x.kind!=='plane')?.id||generated[0].id)
    setStoryboard(shots)
    const frames=shots.map((shot,i)=>({id:uid(),label:shot.title,position:[...shot.cameraPosition],target:[...shot.cameraTarget],focalLength:shot.focalLength,interpolation:'easeInOut'}))
    setKeyframes(frames);setSelectedCameraKeyframeId(frames[0].id)
    setCameraRig({position:[...frames[0].position],target:[...frames[0].target]});setCameraSettings(p=>({...p,focalLength:35}));setRigEnabled(true)
    setProjectName('AI Scene · '+source.slice(0,28).replace(/[.!,?].*$/,''))
    setAiPrompt(prompt)
    setAiMessages(p=>[...p,{role:'user',text:source},{role:'assistant',text:'Черновая сцена собрана: '+generated.length+' объектов, 3 storyboard-кадра и камера с тремя ключевыми точками. Это локальная генерация blockout по ключевым словам — подключение GPT API пока не настроено.'}])
    setWorkspaceMode('build');setActiveTab('ai');setTimelinePlaying(false);setAiBusy(false)
  }
  const applyCameraLook=(look)=>{
    const looks={cinematic:{focalLength:35,aperture:2.8,focusDistance:5,profile:'ARRI Alexa 35',sensorWidth:27.99},portrait:{focalLength:85,aperture:1.8,focusDistance:3,profile:'Sony Venice 2',sensorWidth:36},wide:{focalLength:24,aperture:4,focusDistance:8,profile:'ARRI Alexa 35',sensorWidth:27.99},telephoto:{focalLength:135,aperture:2.8,focusDistance:12,profile:'Sony Venice 2',sensorWidth:36},documentary:{focalLength:35,aperture:5.6,focusDistance:4,profile:'Super 35 Generic',sensorWidth:27.99},anamorphic:{focalLength:50,aperture:2.8,focusDistance:6,profile:'ARRI Alexa Mini LF',sensorWidth:36.7}}
    setCameraSettings(p=>({...p,...looks[look]}))
  }
  useEffect(()=>{
    if(workspaceMode==='animate') return
    if(!timelinePlaying||keyframes.length<2){if(timelinePlaying)setTimelinePlaying(false);return}
    let raf=0,start=null
    const duration=cameraDuration*1000
    const tick=now=>{
      if(start===null)start=now
      const progress=Math.min((now-start)/duration,1)*(keyframes.length-1)
      const index=Math.min(Math.floor(progress),keyframes.length-2)
      const t=progress-index,a=keyframes[index],b=keyframes[index+1]
      const mode=a.interpolation||'easeInOut';const eased=mode==='hold'?0:mode==='linear'?t:t*t*(3-2*t)
      const mix=(x,y)=>x.map((v,i)=>v+(y[i]-v)*eased)
      setRigEnabled(true)
      setCameraRig({position:mix(a.position,b.position),target:mix(a.target,b.target)})
      setCameraSettings(p=>({...p,focalLength:a.focalLength+(b.focalLength-a.focalLength)*eased}))
      if(progress<keyframes.length-1)raf=requestAnimationFrame(tick);else setTimelinePlaying(false)
    }
    raf=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  },[timelinePlaying,keyframes,workspaceMode,cameraDuration])
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
    const blob=new Blob([JSON.stringify({app:'OZATROOM PREVIS',version:'1.8.0',projectName,items,cameraSettings,cameraRig,keyframes,objectKeyframes,playhead,timelineDuration,storyboard,renderSettings},null,2)],{type:'application/json'})
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
    reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.items))throw Error();setItems(d.items);setProjectName(d.projectName||'Imported Project');setSelectedId(d.items[0]?.id||null);if(d.cameraSettings)setCameraSettings(p=>({...{profile:'ARRI Alexa 35',focalLength:35,sensorWidth:27.99,aperture:2.8,focusDistance:5,handheldShake:0},...d.cameraSettings}));if(d.cameraRig)setCameraRig(d.cameraRig);if(d.cameraRigType)setCameraRigType(d.cameraRigType);if(Array.isArray(d.keyframes))setKeyframes(d.keyframes);if(Array.isArray(d.objectKeyframes))setObjectKeyframes(d.objectKeyframes);if(Number.isFinite(d.playhead))setPlayhead(d.playhead);if(Number.isFinite(d.timelineDuration))setTimelineDuration(d.timelineDuration);if(Array.isArray(d.storyboard))setStoryboard(d.storyboard);if(d.renderSettings)setRenderSettings(d.renderSettings)}catch{alert('Invalid OZPREVIS project file')}}
    reader.readAsText(file)
  }
  useEffect(()=>{
    const onKeyDown = event => {
      if (event.repeat) return
      const target = event.target
      const typing = target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]')
      if (typing || target?.isContentEditable) return
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const command=event.code
        if(command==='KeyZ'){event.preventDefault();if(event.shiftKey)redo();else undo();return}
        if(command==='KeyY'){event.preventDefault();redo();return}
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return

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
      <div className="top-actions"><button className="top-btn history-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2 size={14}/> Undo</button><button className="top-btn history-btn" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}><Redo2 size={14}/> Redo</button><button className="top-btn" onClick={()=>modelInputRef.current.click()}><Plus size={15}/> Import GLB</button><button className="top-btn" onClick={()=>inputRef.current.click()}><FolderOpen size={15}/> Open</button><button className="top-btn primary" onClick={save}><Save size={15}/> Save Project</button><div className="avatar">O</div><input ref={inputRef} hidden type="file" accept=".json,.ozprevis.json" onChange={e=>openFile(e.target.files?.[0])}/><input ref={modelInputRef} hidden type="file" accept=".glb,model/gltf-binary" onChange={e=>{importModel(e.target.files?.[0]);e.target.value=""}}/></div>
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
        <div className="viewport"><Viewport items={items} selectedId={selectedId} setSelectedId={setSelectedId} tool={tool} register={register} onTransformEnd={sync} cameraSettings={cameraSettings} cameraRig={cameraRig} rigEnabled={rigEnabled} keyframes={keyframes} selectedCameraKeyframeId={selectedCameraKeyframeId} setSelectedCameraKeyframeId={setSelectedCameraKeyframeId} onCameraWaypointTransformEnd={updateCameraWaypoint}/><div className={'frame-guide '+(renderSettings.frameGuide?'':'hidden')} style={{aspectRatio:renderSettings.ratio.replace(':',' / '),width:(Number(renderSettings.ratio.split(':')[0])/Number(renderSettings.ratio.split(':')[1]))<1?(82*Number(renderSettings.ratio.split(':')[0])/Number(renderSettings.ratio.split(':')[1]))+'%':'82%'}}><div className={'safe-guide '+(renderSettings.safeGuides?'':'hidden')}></div></div><div className="viewport-hud"><span>WORLD SPACE</span><span>GLB IMPORT · METERS · XYZ</span></div><div className="viewport-bottom"><span>SCENE BUILDER / VIEWPORT</span><span>GPU PREVIEW <i/></span></div></div>
        <div className="bottom-panel"><div className="timeline-head"><div><Film size={14}/> {workspaceMode==='animate'?'OBJECT ANIMATION':'SHOT TIMELINE'} <small>{workspaceMode==='animate'?objectKeyframes.length:keyframes.length} keyframes</small></div><div className="timeline-actions">{workspaceMode==='animate'?<><button onClick={addObjectKeyframe} disabled={!selected}><Plus size={12}/> Keyframe (K)</button><button onClick={()=>setTimelinePlaying(v=>!v)} disabled={objectKeyframes.length<2}>{timelinePlaying?'Pause':'Play'}</button><span>{playhead.toFixed(2)} / {timelineDuration}s</span></>:<><button onClick={addKeyframe}><Plus size={12}/> Add Keyframe</button><button disabled={keyframes.length<2} onClick={()=>setTimelinePlaying(v=>!v)}>{timelinePlaying?'Pause':'Play'}</button><button className="export-video-button" disabled={keyframes.length<2||exportingVideo} onClick={exportCameraVideo}><Download size={12}/>{exportingVideo?'RECORDING…':'EXPORT WEBM'}</button><span>24 FPS · CAMERA TRACK</span></>}</div></div><div className="timeline-track">{workspaceMode==='animate'?<><div className="playhead-controls"><label>DURATION <input type="number" min="1" max="60" value={timelineDuration} onChange={e=>setTimelineDuration(Math.max(1,Math.min(60,Number(e.target.value)||1)))}/> SEC</label><input aria-label="Timeline playhead" type="range" min="0" max={timelineDuration} step="0.01" value={Math.min(playhead,timelineDuration)} onChange={e=>{setTimelinePlaying(false);setPlayhead(Number(e.target.value))}}/><span>{playhead.toFixed(2)}s</span></div>{objectKeyframes.length===0?<div className="timeline-empty"><Clapperboard size={18}/> Select an object, move it, set time and press K</div>:<div className="object-track-list">{[...new Set(objectKeyframes.map(k=>k.objectId))].map(id=>{const track=objectKeyframes.filter(k=>k.objectId===id).sort((a,b)=>a.time-b.time);return <div className="object-track" key={id}><b>{track[0].objectName}</b>{track.map((frame,i)=><div className="object-keyframe-marker" key={frame.id} style={{left:(frame.time/timelineDuration*100)+'%'}}><button title={'Go to '+frame.time.toFixed(2)+'s'} onClick={()=>{setTimelinePlaying(false);setPlayhead(frame.time);setSelectedId(frame.objectId)}}>◆</button><select aria-label="Interpolation" value={frame.interpolation||'linear'} onChange={e=>setObjectKeyframes(p=>p.map(k=>k.id===frame.id?{...k,interpolation:e.target.value}:k))}><option value="linear">Linear</option><option value="easeInOut">Ease</option><option value="hold">Hold</option></select><button className="key-delete" title="Delete keyframe" onClick={()=>setObjectKeyframes(p=>p.filter(k=>k.id!==frame.id))}>×</button></div>)}</div>})}</div>}</>:keyframes.length===0?<div className="timeline-empty"><Clapperboard size={18}/> Move the camera, then add your first keyframe</div>:keyframes.map((frame,i)=><button className={'keyframe-chip '+(selectedCameraKeyframeId===frame.id?'selected':'')} key={frame.id} onClick={()=>{setSelectedCameraKeyframeId(frame.id);applyKeyframe(frame)}}><span>{String(i+1).padStart(2,'0')}</span>{frame.label}<small>{frame.focalLength}mm</small></button>)}</div></div>
      </main>
      <aside className="right-panel">
        <div className="panel-tabs"><button className={'tab '+(activeTab==='ai'?'active':'')} onClick={()=>setActiveTab('ai')}><MessageSquare size={14}/> AI SCENE</button><button className={'tab '+(activeTab==='inspector'?'active':'')} onClick={()=>setActiveTab('inspector')}><Settings2 size={14}/> INSPECTOR</button><button className={'tab '+(activeTab==='camera'?'active':'')} onClick={()=>setActiveTab('camera')}><Camera size={14}/> CAMERA</button><button className={'tab '+(activeTab==='storyboard'?'active':'')} onClick={()=>setActiveTab('storyboard')}><FileText size={14}/> SHOTS</button><button className={'tab '+(activeTab==='render'?'active':'')} onClick={()=>setActiveTab('render')}><MonitorPlay size={14}/> RENDER</button><button className={'tab '+(activeTab==='architecture'?'active':'')} onClick={()=>setActiveTab('architecture')}><Box size={14}/> ARCH</button></div>
        {activeTab==='ai'?<><div className="inspector-object"><div className="object-icon"><WandSparkles/></div><div className="object-meta"><b>AI Script → 3D Scene</b><small>STORY-TO-BLOCKOUT WORKSPACE</small></div></div><section className="inspector-section ai-chat-section"><div className="section-title">SCRIPT CHAT <i/></div><div className="ai-chat-log">{aiMessages.map((message,index)=><div className={'ai-message '+message.role} key={index}><b>{message.role==='assistant'?'OZATROOM AI':'YOU'}</b><p>{message.text}</p></div>)}</div><label className="ai-script-label">PASTE SCENE JSON FROM CHATGPT<textarea rows="8" value={sceneJson} onChange={e=>setSceneJson(e.target.value)} placeholder='Вставь сюда JSON сцены, полученный в ChatGPT…'/></label><button className="ai-generate-button" onClick={importPastedScene} disabled={!sceneJson.trim()}><WandSparkles size={14}/> BUILD SCENE FROM PASTED JSON</button><div className="camera-note">Рабочий способ без API: попроси ChatGPT выдать JSON по шаблону ниже, скопируй весь JSON и вставь сюда. Объекты, кадры и камера загрузятся в сцену.</div><details className="ai-json-help"><summary>ПОКАЗАТЬ ФОРМАТ ДЛЯ CHATGPT</summary><pre>{'{\n  "sceneName": "Night Mountain Road",\n  "objects": [\n    {"name":"Road","kind":"box","position":[0,0,0],"rotation":[0,0,0],"scale":[4,0.1,16],"color":"#30363d"},\n    {"name":"Car","kind":"box","position":[0,0.7,2],"rotation":[0,0,0],"scale":[2,1,4],"color":"#687780"}\n  ],\n  "shots": [\n    {"title":"Establishing","shotType":"Wide","duration":3,"description":"Show the location","cameraPosition":[8,5,10],"cameraTarget":[0,1,0],"focalLength":24}\n  ],\n  "camera": {"duration":8}\n}'}</pre></details><div className="ai-script-divider">OR QUICK LOCAL BLOCKOUT</div><label className="ai-script-label">SCENE DESCRIPTION<textarea rows="4" value={scriptText} onChange={e=>setScriptText(e.target.value)} placeholder="Краткое описание для простого локального blockout…"/></label><button className="ai-copy-button" onClick={generateSceneFromScript} disabled={aiBusy||!scriptText.trim()}>GENERATE SIMPLE BLOCKOUT</button></section>{aiPrompt&&<section className="inspector-section"><div className="section-title">GENERATED VIDEO PROMPT <i/></div><textarea className="ai-prompt-output" rows="10" readOnly value={aiPrompt}/><button className="ai-copy-button" onClick={()=>navigator.clipboard?.writeText(aiPrompt)}>COPY PROMPT</button></section>}<section className="inspector-section"><div className="section-title">NEXT WORKFLOW <i/></div><div className="ai-workflow-steps"><span>01 · SCRIPT</span><span>02 · PROMPT</span><span>03 · 3D BLOCKOUT</span><span>04 · CAMERA + SHOTS</span><span>05 · EXPORT TO AI VIDEO</span></div></section></>:activeTab==='architecture'?<><div className="inspector-object"><div className="object-icon"><Box/></div><div className="object-meta"><b>Architecture Tools</b><small>BLOCKOUT · DIMENSIONS IN METERS</small></div></div><section className="inspector-section"><div className="section-title">BUILDING ELEMENTS <i/></div><div className="arch-tool-grid"><button onClick={()=>add('wall')}><Box size={15}/> WALL</button><button onClick={()=>add('floor')}><Grid3X3 size={15}/> FLOOR</button><button onClick={()=>add('ceiling')}><Layers3 size={15}/> CEILING</button></div><div className="camera-note">Creates editable 3D blockout elements. Select an element to change its dimensions in the Inspector.</div></section><section className="inspector-section"><div className="section-title">UNITS <i/></div><select className="camera-select" value={units} onChange={e=>setUnits(e.target.value)}><option value="m">Meters (m)</option><option value="cm">Centimeters (cm)</option><option value="mm">Millimeters (mm)</option></select><div className="camera-note">Unit display changes dimension labels only. Scene coordinates remain in meters.</div></section><section className="inspector-section"><div className="section-title">QUICK DIMENSIONS <i/></div><div className="data-row"><span>Wall preset</span><code>4.00 × 2.80 × 0.20 m</code></div><div className="data-row"><span>Floor preset</span><code>4.00 × 0.12 × 4.00 m</code></div><div className="data-row"><span>Ceiling preset</span><code>4.00 × 0.12 × 4.00 m</code></div></section></>:activeTab==='render'?<><div className="inspector-object"><div className="object-icon"><MonitorPlay/></div><div className="object-meta"><b>Render & Frame</b><small>PREVIEW OUTPUT SETTINGS</small></div></div><section className="inspector-section"><div className="section-title">ASPECT RATIO <i/></div><div className="render-choice-grid">{['16:9','9:16','1:1','4:3','2.39:1'].map(r=><button className={renderSettings.ratio===r?'chosen':''} key={r} onClick={()=>setRenderSettings(p=>({...p,ratio:r}))}>{r}</button>)}</div><div className="section-title render-subhead">RESOLUTION <i/></div><select className="camera-select" value={renderSettings.resolution} onChange={e=>setRenderSettings(p=>({...p,resolution:e.target.value}))}><option>1280x720</option><option>1920x1080</option><option>2560x1440</option><option>3840x2160</option><option>1080x1920</option><option>2160x2160</option></select><div className="camera-note">Resolution is a project output target. PNG export currently captures the viewport's actual displayed pixel size.</div></section><section className="inspector-section"><div className="section-title">COMPOSITION GUIDES <i/></div><label className="render-check"><input type="checkbox" checked={renderSettings.frameGuide} onChange={e=>setRenderSettings(p=>({...p,frameGuide:e.target.checked}))}/> Aspect ratio frame</label><label className="render-check"><input type="checkbox" checked={renderSettings.safeGuides} onChange={e=>setRenderSettings(p=>({...p,safeGuides:e.target.checked}))}/> Action & title safe zones</label><button className="export-preview-button" onClick={exportPreview}><Download size={14}/> EXPORT VIEWPORT PNG</button></section></>:activeTab==='storyboard'?<><div className="inspector-object"><div className="object-icon"><FileText/></div><div className="object-meta"><b>Storyboard Manager</b><small>{storyboard.length} SHOTS IN SEQUENCE</small></div></div><section className="inspector-section"><button className="add-shot-button" onClick={addShot}><Plus size={13}/> ADD SHOT</button><button className="export-frames-button" onClick={exportStoryboardFrames} disabled={!storyboard.length||exportingFrames}><Download size={13}/>{exportingFrames?'EXPORTING FRAMES…':'EXPORT ALL FRAMES · ZIP'}</button><div className="storyboard-list">{storyboard.length===0?<div className="storyboard-empty">No shots yet. Add a shot to build your storyboard.</div>:storyboard.map((shot,index)=><div className="storyboard-card" key={shot.id}><div className="shot-card-head"><span className="shot-number">{String(index+1).padStart(2,'0')}</span><button onClick={()=>applyShot(shot)}>VIEW</button><button className="shot-delete" onClick={()=>setStoryboard(p=>p.filter(x=>x.id!==shot.id))}><Trash2 size={12}/></button></div><input className="shot-title-input" value={shot.title} onChange={e=>updateShot(shot.id,'title',e.target.value)}/><div className="shot-fields"><label>SHOT TYPE<select value={shot.shotType} onChange={e=>updateShot(shot.id,'shotType',e.target.value)}><option>Extreme Wide</option><option>Wide</option><option>Medium</option><option>Close-up</option><option>Extreme Close-up</option><option>Over the Shoulder</option><option>POV</option><option>Insert</option></select></label><label>DURATION (SEC)<input type="number" min="1" max="120" value={shot.duration} onChange={e=>updateShot(shot.id,'duration',Math.max(1,Math.min(120,Number(e.target.value)||1)))}/></label></div><label className="shot-description-label">DIRECTOR'S NOTES<textarea rows="2" placeholder="Action, composition, movement..." value={shot.description} onChange={e=>updateShot(shot.id,'description',e.target.value)}/></label><div className="shot-camera-meta"><span>{shot.focalLength} mm</span><span>{shot.duration}s</span><button onClick={()=>captureShot(shot.id)}>CAPTURE CURRENT CAMERA</button></div></div>)}</div></section></>:activeTab==='camera'?<><div className="inspector-object"><div className="object-icon"><Camera/></div><div className="object-meta"><b>Cinematic Camera</b><small>LIVE VIEWPORT LENS</small></div></div>
          <section className="inspector-section"><div className="section-title">CAMERA RIG <i/></div><button className={'rig-toggle '+(rigEnabled?'enabled':'')} onClick={()=>setRigEnabled(v=>!v)}>{rigEnabled?'RIG CONTROL ON':'ENABLE RIG CONTROL'}</button><div className="rig-preset-grid">{[['director','DIRECTOR'],['dolly','DOLLY'],['orbit','ORBIT'],['crane','CRANE'],['fpv','FPV']].map(([id,label])=><button key={id} className={cameraRigType===id?'chosen':''} onClick={()=>applyCameraRigPreset(id)}>{label}</button>)}</div><button className="orbit-path-button" onClick={createOrbitPath}>GENERATE 360° ORBIT PATH · 8 KEYS</button><button className="orbit-path-button" onClick={createDollyZoom}>APPLY DOLLY ZOOM TO TRACK</button><div className="camera-preset-heading">CINEMATIC MOVES</div><div className="camera-move-grid">{[['push-in','PUSH IN'],['pull-out','PULL OUT'],['truck-left','TRUCK L'],['truck-right','TRUCK R'],['crane-up','CRANE UP'],['crane-down','CRANE DN'],['pan-left','PAN L'],['pan-right','PAN R']].map(([id,label])=><button key={id} onClick={()=>createCameraMove(id)}>{label}</button>)}</div><div className="rig-buttons"><div><span>DOLLY</span><button onClick={()=>moveRig(2,-.5)}>−</button><button onClick={()=>moveRig(2,.5)}>+</button></div><div><span>TRUCK</span><button onClick={()=>moveRig(0,-.5)}>−</button><button onClick={()=>moveRig(0,.5)}>+</button></div><div><span>PEDESTAL</span><button onClick={()=>moveRig(1,-.5)}>−</button><button onClick={()=>moveRig(1,.5)}>+</button></div></div><div className="rig-buttons"><div><span>PAN</span><button onClick={()=>aimRig(0,-.5)}>−</button><button onClick={()=>aimRig(0,.5)}>+</button></div><div><span>TILT</span><button onClick={()=>aimRig(1,-.5)}>−</button><button onClick={()=>aimRig(1,.5)}>+</button></div><div><span>RESET</span><button onClick={()=>applyCameraRigPreset('director')}>↺</button></div></div><div className="camera-note">Enable rig control to show the camera path. Select an amber waypoint in the viewport and use the gizmo to reposition it.</div><div className="camera-control"><label>SHOT DURATION · {cameraDuration.toFixed(1)} SEC</label><div><input type="range" min="2" max="30" step="0.5" value={cameraDuration} onChange={e=>setCameraDuration(Number(e.target.value))}/><strong>{cameraDuration.toFixed(1)}s</strong></div></div><div className="camera-note">Transition curve is set per waypoint and controls movement toward the next point.</div><div className="camera-waypoint-list">{keyframes.map((frame,index)=><div className={'camera-waypoint-row '+(selectedCameraKeyframeId===frame.id?'selected':'')} key={frame.id}><button onClick={()=>{setSelectedCameraKeyframeId(frame.id);applyKeyframe(frame)}}><b>{String(index+1).padStart(2,'0')}</b><span>{frame.label}</span><small>{frame.position.map(v=>v.toFixed(1)).join(' / ')}</small></button><select aria-label={'Transition for waypoint '+(index+1)} value={frame.interpolation||'easeInOut'} onChange={e=>setKeyframes(p=>p.map(k=>k.id===frame.id?{...k,interpolation:e.target.value}:k))}><option value="linear">Linear</option><option value="easeInOut">Ease</option><option value="hold">Hold</option></select><button title="Delete camera waypoint" onClick={()=>deleteCameraKeyframe(frame.id)}>×</button></div>)}</div></section><section className="inspector-section"><div className="section-title">CAMERA PROFILE <i/></div><select className="camera-select" value={cameraSettings.profile} onChange={e=>setCameraSettings(p=>({...p,profile:e.target.value,sensorWidth:e.target.value==='Sony Venice 2'?36:e.target.value==='ARRI Alexa Mini LF'?36.7:27.99}))}><option>ARRI Alexa 35</option><option>ARRI Alexa Mini LF</option><option>Sony Venice 2</option><option>Super 35 Generic</option></select><div className="camera-note">Sensor width: {cameraSettings.sensorWidth.toFixed(2)} mm</div><div className="camera-preset-heading">CAMERA LOOK PRESETS</div><div className="camera-look-grid">{[['cinematic','CINEMATIC'],['portrait','PORTRAIT'],['wide','WIDE'],['telephoto','TELE'],['documentary','DOCU'],['anamorphic','ANAMORPHIC']].map(([id,label])=><button key={id} onClick={()=>applyCameraLook(id)}>{label}</button>)}</div></section>
          <section className="inspector-section"><div className="section-title">LENS SETTINGS <i/></div><div className="camera-control"><label>Focal Length</label><div><input type="range" min="18" max="200" step="1" value={cameraSettings.focalLength} onChange={e=>setCameraSettings(p=>({...p,focalLength:Number(e.target.value)}))}/><strong>{cameraSettings.focalLength} mm</strong></div></div><div className="lens-presets">{[18,24,35,50,85,135].map(v=><button className={cameraSettings.focalLength===v?'chosen':''} key={v} onClick={()=>setCameraSettings(p=>({...p,focalLength:v}))}>{v}</button>)}</div><div className="camera-control aperture-control"><label>Aperture (metadata)</label><div><input type="range" min="1.4" max="16" step="0.1" value={cameraSettings.aperture} onChange={e=>setCameraSettings(p=>({...p,aperture:Number(e.target.value)}))}/><strong>f/{cameraSettings.aperture.toFixed(1)}</strong></div></div><div className="camera-note">Aperture is saved as lens metadata. Optical depth-of-field rendering is not active yet.</div><div className="camera-control"><label>FOCUS DISTANCE · {cameraSettings.focusDistance.toFixed(1)} M</label><div><input type="range" min="0.2" max="50" step="0.1" value={cameraSettings.focusDistance} onChange={e=>setCameraSettings(p=>({...p,focusDistance:Number(e.target.value)}))}/><strong>{cameraSettings.focusDistance.toFixed(1)} m</strong></div></div><div className="camera-note">Focus distance is stored per project for shot planning; it does not yet drive optical focus.</div></section>
          <section className="inspector-section"><div className="section-title">HANDHELD CAMERA <i/></div><div className="camera-control"><label>SHAKE INTENSITY</label><div><input type="range" min="0" max="1" step="0.05" value={cameraSettings.handheldShake||0} onChange={e=>setCameraSettings(p=>({...p,handheldShake:Number(e.target.value)}))}/><strong>{Math.round((cameraSettings.handheldShake||0)*100)}%</strong></div></div><div className="camera-note">Live procedural camera shake is applied to the viewport during rig preview and WebM recording.</div></section><section className="inspector-section"><div className="section-title">FRAMING <i/></div><div className="data-row"><span>Horizontal FOV</span><code>{(2*Math.atan(cameraSettings.sensorWidth/(2*cameraSettings.focalLength))*180/Math.PI).toFixed(1)}°</code></div><div className="data-row"><span>Lens</span><code>{cameraSettings.focalLength} mm</code></div></section>
        </>:selected?<><div className="inspector-object"><div className="object-icon">{(()=>{const I=kindIcon(selected.kind);return <I/>})()}</div><div className="object-meta"><input value={selected.name} onChange={e=>update('name',null,e.target.value)}/><small>{selected.kind.toUpperCase()} · {['wall','floor','ceiling'].includes(selected.kind)?'ARCH ELEMENT':'OBJECT'}</small></div></div>
          <section className="inspector-section"><div className="section-title">TRANSFORM <i/></div>
            {['position','rotation','scale'].map(key=><div className="transform-block" key={key}><div className="transform-label">{key.toUpperCase()} <button onClick={()=>[0,1,2].forEach(i=>update(key,i,key==='scale'?1:0))}>RESET</button></div><div className="vector-inputs">{axes.map((axis,i)=><label key={axis}><span className={'axis-'+axis.toLowerCase()}>{axis}</span><input type="number" step=".1" value={Number(selected[key][i].toFixed(3))} onChange={e=>update(key,i,e.target.value)}/></label>)}</div></div>)}
          </section>
          <section className="inspector-section"><div className="section-title">DIMENSIONS ({units}) <i/></div><div className="dimension-readout">{selected.scale.map((v,i)=><div key={i}><span>{['W','H','D'][i]}</span><b>{(v*(units==='m'?1:units==='cm'?100:1000)).toFixed(0===0?2:1)}</b></div>)}</div><div className="camera-note">Edit Scale X/Y/Z in Transform to change width, height and depth. One scene unit = 1 meter.</div></section><section className="inspector-section"><div className="section-title">MATERIAL <i/></div><div className="color-row"><span>Base Color</span><input type="color" value={selected.color} onChange={e=>update('color',null,e.target.value)}/><code>{selected.color.toUpperCase()}</code></div></section>
          <section className="inspector-section"><div className="section-title">OBJECT DATA <i/></div><div className="data-row"><span>Object ID</span><code>{selected.id}</code></div><div className="data-row"><span>Visibility</span><button className="text-toggle" onClick={()=>setItems(p=>p.map(x=>x.id===selected.id?{...x,visible:!x.visible}:x))}>{selected.visible?'Visible':'Hidden'}</button></div></section>
          <button className="delete-object" onClick={remove}><Trash2 size={14}/> Delete Object</button>
        </>:<div className="empty-inspector"><MousePointer2 size={24}/><b>No object selected</b><span>Select an object in the viewport or Scene Hierarchy.</span></div>}
        <div className="right-footer"><Sparkles size={13}/> OZATROOM PREVIS <span>v1.8.1</span></div>
      </aside>
    </div>
    <footer className="statusbar"><div><i/> READY</div><div><span>SCENE: {items.length} OBJECTS</span><span>SELECTED: {selected?.name||'NONE'}</span><span>WEBGL VIEWPORT</span></div><div>{autosaveStatus} · BEYOND REALITY.</div></footer>
  </div>
}