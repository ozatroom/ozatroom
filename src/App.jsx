import { useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { Suspense } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Grid, OrbitControls, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Box, Circle, Cylinder, Grid3X3, Layers3, Move, Rotate3D, Scaling,
  Save, FolderOpen, Plus, Trash2, Copy, Eye, EyeOff, Camera,
  ChevronDown, MousePointer2, Settings2, Film, Clapperboard, Sparkles
} from 'lucide-react'

const uid = () => 'obj_' + Math.random().toString(36).slice(2, 9)
const starter = [
  { id:'ground', name:'Ground Plane', kind:'plane', position:[0,-.04,0], rotation:[-Math.PI/2,0,0], scale:[12,12,1], color:'#343c44', visible:true },
  { id:'cube_01', name:'Cube 01', kind:'box', position:[0,.8,0], rotation:[0,.35,0], scale:[1.6,1.6,1.6], color:'#b7a18a', visible:true },
  { id:'sphere_01', name:'Sphere 01', kind:'sphere', position:[2.4,.7,-.6], rotation:[0,0,0], scale:[1.35,1.35,1.35], color:'#738a91', visible:true }
]
const kindIcon = k => k==='box' || k==='model' ? Box : k==='sphere' ? Circle : k==='cylinder' ? Cylinder : Grid3X3

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

function Viewport({items, selectedId, setSelectedId, tool, register, onTransformEnd}) {
  const object = window.__ozatroomObjects?.[selectedId]
  return <Canvas shadows dpr={[1,1.7]} camera={{position:[8,6,9],fov:42}} gl={{antialias:true,powerPreference:'high-performance'}}>
    <color attach="background" args={['#171b20']}/>
    <fog attach="fog" args={['#171b20',22,48]}/>
    <ambientLight intensity={.8}/>
    <directionalLight position={[5,10,6]} intensity={2.1} castShadow shadow-mapSize={[2048,2048]}/>
    <directionalLight position={[-6,4,-4]} intensity={.55} color="#8ca4bb"/>
    <Grid args={[40,40]} position={[0,-.035,0]} cellSize={1} cellThickness={.6} cellColor="#46505a"
      sectionSize={5} sectionThickness={1.1} sectionColor="#77818b" fadeDistance={35} fadeStrength={1.5} infiniteGrid/>
    {items.map(item=>item.kind==='model' ? <ImportedModel key={item.id} item={item} register={register} onSelect={setSelectedId}/> : <MeshItem key={item.id} item={item} selected={item.id===selectedId} register={register} onSelect={setSelectedId}/>)}
    {object && tool!=='select' && <TransformControls object={object} mode={tool} onMouseUp={onTransformEnd}/>}
    <OrbitControls makeDefault enabled={tool==='select'} enableDamping dampingFactor={.08}/>
  </Canvas>
}

function ToolButton({title,active,onClick,children}) {
  return <button className={'icon-button '+(active?'active':'')} title={title} onClick={onClick}>{children}</button>
}

export default function App() {
  const [items,setItems]=useState(starter)
  const [selectedId,setSelectedId]=useState('cube_01')
  const [tool,setTool]=useState('select')
  const [projectName,setProjectName]=useState('Untitled Cinematic')
  const [addOpen,setAddOpen]=useState(false)
  const refs=useRef({})
  const inputRef=useRef()
  const modelInputRef=useRef()
  const selected=items.find(x=>x.id===selectedId)
  const register=useCallback((id,obj)=>{if(obj)refs.current[id]=obj;else delete refs.current[id];window.__ozatroomObjects=refs.current},[])
  const sync=useCallback(()=>setItems(old=>old.map(x=>{const o=refs.current[x.id];return o?{...x,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray()}:x})),[])
  const add=(kind)=>{
    const count=items.filter(x=>x.kind===kind).length+1, id=uid()
    const names={box:'Cube',sphere:'Sphere',cylinder:'Cylinder',plane:'Plane'}
    const item={id,name:names[kind]+' '+String(count).padStart(2,'0'),kind,
      position:[0,kind==='plane'?0:.6,0],rotation:kind==='plane'?[-Math.PI/2,0,0]:[0,0,0],
      scale:kind==='plane'?[3,3,1]:[1,1,1],color:kind==='plane'?'#414a52':'#b7a18a',visible:true}
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
  const save=()=>{
    const blob=new Blob([JSON.stringify({app:'OZATROOM PREVIS',version:'0.1.0',projectName,items},null,2)],{type:'application/json'})
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
    reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.items))throw Error();setItems(d.items);setProjectName(d.projectName||'Imported Project');setSelectedId(d.items[0]?.id||null)}catch{alert('Invalid OZPREVIS project file')}}
    reader.readAsText(file)
  }
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
        <div className="viewport"><Viewport items={items} selectedId={selectedId} setSelectedId={setSelectedId} tool={tool} register={register} onTransformEnd={sync}/><div className="viewport-hud"><span>WORLD SPACE</span><span>GLB IMPORT · METERS · XYZ</span></div><div className="viewport-bottom"><span>SCENE BUILDER / VIEWPORT</span><span>GPU PREVIEW <i/></span></div></div>
        <div className="bottom-panel"><div className="timeline-head"><div><Film size={14}/> SHOT TIMELINE <small>Coming in next module</small></div><span>24 FPS　 00:00:00:00</span></div><div className="timeline-empty"><Clapperboard size={18}/> Timeline module follows the asset import milestone.</div></div>
      </main>
      <aside className="right-panel">
        <div className="panel-tabs"><div className="tab active"><Settings2 size={14}/> INSPECTOR</div><div className="tab"><Camera size={14}/> CAMERA</div></div>
        {selected?<><div className="inspector-object"><div className="object-icon">{(()=>{const I=kindIcon(selected.kind);return <I/>})()}</div><div className="object-meta"><input value={selected.name} onChange={e=>update('name',null,e.target.value)}/><small>{selected.kind.toUpperCase()} · OBJECT</small></div></div>
          <section className="inspector-section"><div className="section-title">TRANSFORM <i/></div>
            {['position','rotation','scale'].map(key=><div className="transform-block" key={key}><div className="transform-label">{key.toUpperCase()} <button onClick={()=>[0,1,2].forEach(i=>update(key,i,key==='scale'?1:0))}>RESET</button></div><div className="vector-inputs">{axes.map((axis,i)=><label key={axis}><span className={'axis-'+axis.toLowerCase()}>{axis}</span><input type="number" step=".1" value={Number(selected[key][i].toFixed(3))} onChange={e=>update(key,i,e.target.value)}/></label>)}</div></div>)}
          </section>
          <section className="inspector-section"><div className="section-title">MATERIAL <i/></div><div className="color-row"><span>Base Color</span><input type="color" value={selected.color} onChange={e=>update('color',null,e.target.value)}/><code>{selected.color.toUpperCase()}</code></div></section>
          <section className="inspector-section"><div className="section-title">OBJECT DATA <i/></div><div className="data-row"><span>Object ID</span><code>{selected.id}</code></div><div className="data-row"><span>Visibility</span><button className="text-toggle" onClick={()=>setItems(p=>p.map(x=>x.id===selected.id?{...x,visible:!x.visible}:x))}>{selected.visible?'Visible':'Hidden'}</button></div></section>
          <button className="delete-object" onClick={remove}><Trash2 size={14}/> Delete Object</button>
        </>:<div className="empty-inspector"><MousePointer2 size={24}/><b>No object selected</b><span>Select an object in the viewport or Scene Hierarchy.</span></div>}
        <div className="right-footer"><Sparkles size={13}/> OZATROOM PREVIS <span>v0.1.0</span></div>
      </aside>
    </div>
    <footer className="statusbar"><div><i/> READY</div><div><span>SCENE: {items.length} OBJECTS</span><span>SELECTED: {selected?.name||'NONE'}</span><span>WEBGL VIEWPORT</span></div><div>BEYOND REALITY.</div></footer>
  </div>
}