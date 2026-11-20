import * as THREE from 'https://ai9550.github.io/teacher/monopoly-3d/vendor/three.module.js';
const host=document.querySelector('#scene3d'),wrap=document.querySelector('.boardwrap'),msg=document.querySelector('#sceneMessage');
try{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c4e8e0');scene.fog=new THREE.Fog('#c4e8e0',45,90);
 const camera=new THREE.PerspectiveCamera(37,1,.1,130);camera.position.set(23,27,25);camera.lookAt(0,0,0);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.prepend(renderer.domElement);wrap.classList.add('has-webgl');msg.textContent='';
 scene.add(new THREE.HemisphereLight(0xf5ffdf,0x6b967b,2.2));const light=new THREE.DirectionalLight(0xfff3d7,2.4);light.position.set(-15,30,16);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:85});scene.add(light);
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});const geoBox=new THREE.BoxGeometry(1,1,1);const sphere=new THREE.SphereGeometry(1,16,12);const green=mat('#75bb69'),darkGreen=mat('#36845a'),wood=mat('#af7953'),ivory=mat('#fff2cf'),orange=mat('#ee956b'),water=mat('#82d1d3',{roughness:.3}),pink=mat('#e9b7a0');
 function box(parent,w,h,d,x,y,z,m,shadow=true){let o=new THREE.Mesh(geoBox,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
 function orb(parent,r,x,y,z,m){let o=new THREE.Mesh(sphere,m);o.scale.setScalar(r);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
 const root=new THREE.Group();scene.add(root);box(root,21,1.1,21,0,-.65,0,mat('#91714c'));box(root,21.2,.55,21.2,0,-.05,0,mat('#4f9d59'));box(root,20.8,.22,20.8,0,.30,0,green);
 const roadY=.54,step=2.4,tiles=[],houses=[];const spots=['#e88878','#e9ad6b','#e6ca69','#7ecb9a','#85c5cf','#a9a5d4','#e3a3b8'];
 function coord(i){let row,col;if(i<8){row=8;col=8-i}else if(i<15){row=8-(i-7);col=1}else if(i<22){row=1;col=i-13}else{row=i-20;col=8}return new THREE.Vector3((col-4.5)*step,0,(row-4.5)*step)}
 const names=['起點','基隆','臺北','機會','新北','桃園','新竹','監獄','苗栗','臺中','命運','彰化','南投','雲林','免費停車','嘉義','臺南','機會','高雄','屏東','臺東','前往監獄','花蓮','宜蘭','命運','澎湖','金門','連江'];
 const specials=new Set([0,3,7,10,14,17,21,24]);
 function labelTexture(text,sub='',color='#285947'){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='rgba(255,252,234,.97)';x.beginPath();x.roundRect(6,28,500,200,35);x.fill();x.strokeStyle='#b7d8b9';x.lineWidth=8;x.stroke();x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font='bold 82px Microsoft JhengHei, sans-serif';x.fillText(text,256,100,470);if(sub){x.font='bold 43px Microsoft JhengHei, sans-serif';x.fillStyle='#a66c38';x.fillText(sub,256,173,455)}const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture}
 function sprite(parent,text,sub,x,y,z,scale=2.0){let o=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(text,sub),transparent:true,depthWrite:false}));o.position.set(x,y,z);o.scale.set(scale,scale*.5,1);parent.add(o);return o}
 function flatLabel(tile,text,sub='',angle=0){
  const c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#254c43';ctx.font='900 150px Microsoft JhengHei, sans-serif';ctx.fillText(text,256,sub?145:192,490);
  if(sub){ctx.fillStyle='#986139';ctx.font='bold 66px Microsoft JhengHei, sans-serif';ctx.fillText(sub,256,265,480)}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(1.95,1.55),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  label.rotation.order='YXZ';label.rotation.set(-Math.PI/2,angle,0);label.position.set(Math.sin(angle)*.12,.275,Math.cos(angle)*.12);tile.add(label);
 }
 function landmark(x,z,name){
  const g=new THREE.Group();g.position.set(x,roadY+.05,z);g.scale.setScalar(.85);root.add(g);
  const teal=mat('#4cabb1'),red=mat('#d85e52'),yellow=mat('#f2c557'),cream=mat('#fff1d1'),blue=mat('#77c9dd'),brown=mat('#986443'),leaf=mat('#5fae67'),gray=mat('#b4c3b4');
  function cyl(r1,r2,h,x,y,z,m){let o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,16),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
  function cone(r,h,x,y,z,m,n=12){let o=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
  function ball(r,x,y,z,m,sx=1,sy=1,sz=1){let o=orb(g,r,x,y,z,m);o.scale.set(r*sx,r*sy,r*sz);return o}
  function tower(x,y,z){box(g,.68,.55,.62,x,y+.3,z,cream);let r=cone(.58,.35,x,y+.73,z,red,4);r.rotation.y=Math.PI/4}
  cyl(.82,.86,.16,0,.07,0,mat('#d59c66'));cyl(.77,.79,.08,0,.18,0,mat('#fff0ce'));cyl(.73,.73,.045,0,.245,0,mat(['#a6dabb','#a9dbe2','#f8cba9','#d2dca1'][names.indexOf(name)%4]));
  switch(name){
   case '基隆': box(g,1.25,.24,.53,0,.31,0,blue);box(g,.08,1.25,.08,0,1,0,brown); {let sh=new THREE.Shape();sh.moveTo(.08,.15);sh.lineTo(.08,1.1);sh.lineTo(.65,.15);sh.closePath();let sail=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:1}),cream);sail.position.set(0,.45,.04);g.add(sail)} break;
   case '臺北': for(let k=0;k<5;k++)box(g,.84-k*.09,.3,.7-k*.07,0,.3+k*.3,0,teal);cyl(.035,.035,.4,0,2,0,cream);cone(.14,.22,0,1.83,0,yellow,4);break;
   case '新北': tower(-.38,.15,0);tower(.35,.35,-.1);ball(.13,-.38,.63,.35,red);ball(.13,.35,.84,.25,red);break;
   case '桃園': ball(.24,0,.75,0,cream,2.7,1,1);box(g,.24,.09,1.35,0,.72,0,blue);box(g,.16,.4,.2,-.51,.93,0,blue);break;
   case '新竹': cyl(.2,.3,1.25,0,.75,0,cream);ball(.13,0,1.35,.18,yellow);box(g,.12,1.35,.1,0,1.35,.18,red);box(g,1.35,.12,.1,0,1.35,.18,red);break;
   case '苗栗': cyl(.06,.08,.8,0,.5,0,leaf);for(let j=0;j<5;j++){let a=j*Math.PI*2/5;ball(.25,Math.cos(a)*.32,1.03+Math.sin(a)*.32,.05,cream,1,.8,.55)}ball(.16,0,1.03,.2,yellow);break;
   case '臺中': cyl(.56,.42,1.1,0,.72,0,mat('#dcb984'));cyl(.58,.58,.1,0,1.31,0,cream);{let straw=cyl(.065,.065,.65,.23,1.63,0,red);straw.rotation.z=-.2}for(let j=0;j<5;j++)ball(.09,-.32+j*.16,.37,.4,brown);break;
   case '彰化': box(g,1,.2,.7,0,.22,0,brown);ball(.45,0,.65,0,yellow,1,1,.7);ball(.25,0,1.22,0,yellow);ball(.22,-.4,.58,0,yellow);ball(.22,.4,.58,0,yellow);break;
   case '南投': {let lake=cyl(.7,.7,.12,0,.24,0,blue);lake.scale.z=.7;cone(.47,.9,-.3,.7,-.12,leaf,5);cone(.35,.7,.35,.6,-.1,green,5)}break;
   case '雲林': ball(.42,-.23,.54,0,mat('#e7bc76'),1,1.2,.8);ball(.42,.23,.54,0,mat('#e7bc76'),1,1.2,.8);cone(.2,.45,0,1.15,0,leaf);break;
   case '嘉義': box(g,1.1,.58,.58,0,.65,0,red);box(g,.45,.42,.55,-.3,1.15,0,cream);cyl(.12,.12,.4,.36,1.15,0,brown);for(let j of [-.4,.35]){let w=cyl(.18,.18,.68,j,.3,0,brown);w.rotation.x=Math.PI/2}break;
   case '臺南': tower(0,.15,0);box(g,1.15,.13,.85,0,1.06,0,red);{let roof=cone(.8,.4,0,1.27,0,orange,4);roof.rotation.y=Math.PI/4}break;
   case '高雄': box(g,1.3,.32,.6,0,.35,0,red);box(g,.65,.45,.4,-.1,.73,0,cream);box(g,.45,.18,.35,-.1,1.05,0,blue);cyl(.05,.05,.5,.38,.95,0,brown);break;
   case '屏東': ball(.48,0,.66,0,yellow,.8,1.3,.8);for(let j=0;j<5;j++){let a=j*Math.PI*2/5;let l=cone(.12,.65,Math.cos(a)*.18,1.45,Math.sin(a)*.18,leaf,5);l.rotation.z=Math.cos(a)*.4}break;
   case '臺東': box(g,.35,.3,.35,0,.35,0,brown);for(let dx of [-.17,.17])box(g,.035,.55,.035,dx,.75,0,cream);ball(.55,0,1.38,0,red,1,1.15,1);box(g,.16,.8,.04,0,1.38,.52,yellow);break;
   case '花蓮': cone(.55,1.4,-.35,.85,0,gray,5);cone(.55,1.2,.4,.75,0,mat('#8da99c'),5);box(g,.3,.08,1.05,0,.25,0,blue);break;
   case '宜蘭': for(let j=-1;j<=1;j++){cyl(.09,.12,.5,j*.23,.42,0,cream);let stalk=cyl(.1,.1,.9,j*.23,1.1,0,leaf);stalk.rotation.z=j*.16}break;
   case '澎湖': box(g,1.5,.12,.35,0,.75,0,cream);for(let j of [-.45,0,.45]){let arch=new THREE.Mesh(new THREE.TorusGeometry(.23,.055,8,18,Math.PI),cream);arch.position.set(j,.37,0);g.add(arch)}break;
   case '金門': box(g,.9,.2,.7,0,.24,0,red);ball(.4,0,.7,0,teal);ball(.34,0,1.22,0,teal);ball(.14,-.27,1.45,0,teal);ball(.14,.27,1.45,0,teal);ball(.06,-.12,1.24,.3,cream);ball(.06,.12,1.24,.3,cream);break;
   case '連江': {let sea=cyl(.7,.7,.15,0,.24,0,mat('#315e9b'));sea.scale.z=.7;for(let j=0;j<8;j++)ball(.07,Math.cos(j*2.4)*.5,.36,Math.sin(j*2.4)*.3,blue)}break;

  }
  // Sculpted decorations give each miniature a distinct, solid toy-like finish.
  const gold=mat('#f8ce6b'),coral=mat('#ef8e75'),navy=mat('#345f79'),white=mat('#fffaf0'),glass=mat('#75cbd5',{roughness:.28,metalness:.08}),dark=mat('#4c514b');
  function jewel(x,y,z,r=.065,m=gold){ball(r,x,y,z,m)}
  function roof(x,y,z,size=.55){let r=cone(size,.27,x,y,z,red,4);r.rotation.y=Math.PI/4;box(g,size*1.3,.07,size*1.3,x,y-.11,z,gold)}
  switch(name){
   case '基隆':
    box(g,1.3,.09,.6,0,.46,0,cream);box(g,.42,.17,.34,-.18,.58,0,red);box(g,.22,.19,.25,-.18,.75,0,white);for(let j=-2;j<=2;j++)jewel(j*.2,.33,.29,.07,gold);ball(.13,.52,.58,0,red);break;
   case '臺北':
    for(let j=0;j<5;j++){let y=.36+j*.3,w=.77-j*.08;box(g,w,.055,.72-j*.07,0,y,0,gold);for(let k=-1;k<=1;k++){box(g,.12,.14,.025,k*w*.27,y+.12,(.71-j*.07)/2,glass);box(g,.025,.14,.12,(.84-j*.09)/2,y+.12,k*.15,glass)}}ball(.1,0,2.2,0,gold);break;
   case '新北':
    for(let xx of [-.38,.35]){box(g,.24,.3,.035,xx,.43,.33,brown);box(g,.15,.15,.04,xx+.2,.54,.33,glass);roof(xx,1.02,.0,.48);for(let j=-1;j<=1;j++)ball(.09,xx+j*.18,.86,.38,red)}break;
   case '桃園':
    for(let j=-2;j<=2;j++)ball(.055,j*.19,.82,.205,glass);box(g,.58,.07,.16,-.4,.91,0,red);ball(.14,.65,.75,0,navy);for(let z1 of [-.42,.42])ball(.12,-.07,.63,z1,navy,1.5,.7,.7);break;
   case '新竹':
    box(g,.2,.32,.05,0,.45,.25,brown);for(let a=0;a<4;a++){let q=box(g,.23,.46,.08,0,0,.25,white);q.position.set(Math.sin(a*Math.PI/2)*.47,1.35+Math.cos(a*Math.PI/2)*.47,.25);q.rotation.z=-a*Math.PI/2}cyl(.17,.17,.1,0,1.35,.27,coral).rotation.x=Math.PI/2;break;
   case '苗栗':
    for(let j=0;j<5;j++){let a=j*Math.PI*2/5;jewel(Math.cos(a)*.32,1.03+Math.sin(a)*.32,.22,.10,mat('#f7b3b9'))}for(let j of [-1,1]){let l=ball(.24,j*.2,.48,0,leaf,1.4,.35,.6);l.rotation.z=j*.5}for(let j=0;j<6;j++)jewel(Math.cos(j)*.1,1.03+Math.sin(j)*.1,.33,.035,gold);break;
   case '臺中':
    for(let j=0;j<4;j++)for(let k=0;k<2;k++)ball(.085,-.3+j*.2,.38+k*.18,.43,brown);cyl(.48,.48,.04,0,1.38,0,white);box(g,.38,.35,.018,0,.83,.53,cream);ball(.09,0,.83,.56,red);break;
   case '彰化':
    box(g,1.12,.12,.8,0,.34,0,gold);ball(.23,0,.73,.33,coral,1,.8,.5);for(let x1 of [-.09,.09])jewel(x1,1.26,.225,.035,dark);ball(.07,0,1.12,.25,coral);for(let j=0;j<7;j++)ball(.05,Math.cos(j)*.22,1.42,Math.sin(j)*.18,brown);break;
   case '南投':
    cyl(.74,.74,.035,0,.3,0,glass).scale.z=.7;for(let j=0;j<5;j++)box(g,.2,.025,.035,-.4+j*.2,.34,.3,white);ball(.12,.4,.38,.22,white,1.6,.35,.8);cone(.1,.25,.42,.54,.22,coral,4);for(let j=-1;j<=1;j++)ball(.12,j*.25,.38,-.45,leaf);break;
   case '雲林':
    for(let j=-2;j<=2;j++)for(let k=-1;k<=1;k++)jewel(j*.17,.58+k*.18,.32,.035,mat('#bc8b4d'));for(let j of [-1,1]){let l=ball(.23,j*.23,1.12,0,leaf,1.4,.35,.7);l.rotation.z=j*.5}break;
   case '嘉義':
    box(g,.53,.28,.035,-.3,1.16,.3,glass);box(g,.58,.1,.67,-.3,1.4,0,brown);box(g,.14,.27,.1,.43,.78,.32,gold);for(let x1 of [-.4,.35]){let hub=cyl(.08,.08,.72,x1,.3,0,gold);hub.rotation.x=Math.PI/2}ball(.18,.36,1.46,0,white);ball(.13,.47,1.6,0,white);break;
   case '臺南':
    box(g,.28,.42,.04,0,.42,.34,brown);for(let x1 of [-.4,.4]){box(g,.12,.5,.12,x1,.56,.32,red);ball(.1,x1,.83,.36,gold)}roof(0,1.38,0,.72);box(g,.55,.08,.05,0,1.05,.46,gold);break;
   case '高雄':
    box(g,1.2,.08,.64,0,.53,0,gold);for(let j=-2;j<=2;j++)box(g,.12,.12,.03,j*.2,.78,.22,glass);box(g,.45,.24,.12,.38,1.05,0,red);for(let j=0;j<3;j++)ball(.1,.48,1.28+j*.15,0,white);break;
   case '屏東':
    for(let j=0;j<4;j++)for(let k=0;k<5;k++){let a=k*Math.PI*2/5+j*.25;jewel(Math.sin(a)*.35,.38+j*.22,Math.cos(a)*.35,.045,mat('#d99531'))}for(let j=0;j<6;j++){let a=j*Math.PI/3;let l=cone(.11,.65,Math.cos(a)*.2,1.42,Math.sin(a)*.2,leaf,5);l.rotation.z=Math.cos(a)*.5}break;
   case '臺東':
    for(let j=0;j<8;j++){let a=j*Math.PI/4;ball(.24,Math.cos(a)*.42,1.4,Math.sin(a)*.42,j%2?gold:coral,.6,2,.6)}cyl(.32,.34,.1,0,.22,0,gold);box(g,.38,.05,.37,0,.54,0,cream);break;
   case '花蓮':
    cone(.32,.65,-.38,1.36,.0,cream,5);cone(.28,.5,.42,1.17,0,cream,5);for(let j=-1;j<=1;j++){let b=ball(.12,j*.3,.34,.42,leaf);b.scale.y*=.7}box(g,.15,.035,.18,0,.3,.35,white);break;
   case '宜蘭':
    for(let j=-1;j<=1;j++){ball(.13,j*.23,.3,.02,white,.9,1.4,.9);for(let k of [-1,1]){let l=cone(.06,.42,j*.23+k*.1,1.62,0,leaf,7);l.rotation.z=k*.38}}box(g,.9,.07,.56,0,.3,0,gold);break;
   case '澎湖':
    cyl(.7,.7,.05,0,.3,0,glass).scale.z=.65;for(let j of [-.7,.7])box(g,.12,.68,.42,j,.55,0,white);for(let j=-2;j<=2;j++)box(g,.08,.14,.08,j*.28,.87,.2,red);box(g,1.55,.08,.08,0,.94,.2,cream);break;
   case '金門':
    ball(.2,0,1.13,.27,cream,1,.75,.65);ball(.075,0,1.16,.44,dark);for(let x1 of [-.12,.12]){jewel(x1,1.25,.335,.055,dark);ball(.05,x1,1.27,.38,white)}for(let j=0;j<9;j++){let a=j*Math.PI*2/9;ball(.12,Math.cos(a)*.38,1.22+Math.sin(a)*.38,0,gold)}box(g,.5,.09,.48,0,.48,.18,gold);break;
   case '連江':
    for(let j=0;j<12;j++){let a=j*2.4;jewel(Math.cos(a)*.53,.38,Math.sin(a)*.3,.06,j%2?glass:white)}ball(.18,-.35,.32,0,cream,1.8,.25,1);ball(.09,.3,.35,.18,white);break;
  }
 }
 for(let i=0;i<28;i++){let p=coord(i),tile=new THREE.Group();tile.position.set(p.x,roadY,p.z);root.add(tile);box(tile,2.28,.28,2.28,0,0,0,mat(specials.has(i)?'#f7d59e':'#f0d2b7'));box(tile,2.05,.07,2.05,0,.18,0,mat('#fff2df'));const tileAngle=i<8?0:i<15?-Math.PI/2:i<22?Math.PI:Math.PI/2;let band=box(tile,2.04,.08,.27,-Math.sin(tileAngle)*.87,.23,-Math.cos(tileAngle)*.87,mat(spots[Math.floor(i/4)%spots.length]));band.rotation.y=tileAngle;flatLabel(tile,names[i],specials.has(i)?({3:'抽卡',7:'暫停 2 回合',10:'抽卡',14:'休息',17:'抽卡',21:'入監',24:'抽卡'}[i]||''):'$'+(200+(i%5)*50),tileAngle);tiles.push(tile);if(!specials.has(i)){let inward=p.clone();if(i<8)inward.z-=1.95;else if(i<15)inward.x+=1.95;else if(i<22)inward.z+=1.95;else inward.x-=1.95;landmark(inward.x,inward.z,names[i])}houses.push(null)}
 // A raised island silhouette and mountain ridge in the middle of the board.
 const islandGroup=new THREE.Group();islandGroup.scale.set(1.38,1.15,1.38);root.add(islandGroup);
 const islandOutline=new THREE.Shape();
 islandOutline.moveTo(.05,2.45);islandOutline.lineTo(.65,2.15);islandOutline.lineTo(1.05,1.45);islandOutline.lineTo(1.12,.65);islandOutline.lineTo(.94,-.25);islandOutline.lineTo(.58,-1.25);islandOutline.lineTo(.12,-2.35);islandOutline.lineTo(-.25,-2.45);islandOutline.lineTo(-.48,-1.9);islandOutline.lineTo(-.75,-1.25);islandOutline.lineTo(-1.02,-.5);islandOutline.lineTo(-1.05,.35);islandOutline.lineTo(-.82,1.05);islandOutline.lineTo(-.58,1.75);islandOutline.lineTo(-.15,2.3);islandOutline.closePath();
 const island=new THREE.Mesh(new THREE.ExtrudeGeometry(islandOutline,{depth:.35,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:2}),[mat('#8cc979'),mat('#b58b59')]);
 island.rotation.x=-Math.PI/2;island.position.set(0,.48,0);island.castShadow=true;island.receiveShadow=true;islandGroup.add(island);
 for(const [x,z,r,h] of [[.03,-1.1,.38,.7],[.28,-.4,.42,1.05],[.1,.35,.5,1.2],[-.12,1.15,.36,.75]]){
  const mountain=new THREE.Mesh(new THREE.ConeGeometry(r,h,7),mat('#5ba76a'));mountain.position.set(x,.86+h/2,z);mountain.castShadow=true;islandGroup.add(mountain);
 }
 function tree(x,z,size=1){let g=new THREE.Group();g.position.set(x,.45,z);box(g,.22*size,.8*size,.22*size,0,.35*size,0,wood);orb(g,.48*size,0,.95*size,0,mat(['#64b964','#78c66f','#50a965'][Math.floor(Math.abs(x*4+z*7))%3]));root.add(g)}
 [[-5,-4],[5,-4],[-5,4],[5,4],[0,5],[0,-5],[-5,0],[5,0]].forEach(([x,z],i)=>tree(x,z,.7+(i%3)*.15));
 // Two raised, labelled card decks sit in the middle of the board.
 function cardTexture(title,detail,color){
  const c=document.createElement('canvas');c.width=512;c.height=640;const x=c.getContext('2d');
  x.fillStyle=color;x.fillRect(0,0,512,640);x.strokeStyle='#fff4db';x.lineWidth=18;x.strokeRect(18,18,476,604);
  x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff9e9';x.font='bold 105px Microsoft JhengHei, sans-serif';x.fillText(title,256,detail?260:320,440);
  if(detail){x.font='bold 70px Microsoft JhengHei, sans-serif';x.fillText(detail,256,395,440)}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
 }
 const deckPositions={chance:new THREE.Vector3(-3.1,.61,0),fate:new THREE.Vector3(3.1,.61,0)};
 function makeCard(title,detail,color){
  const card=new THREE.Group();box(card,1.75,.1,2.2,0,0,0,mat('#f6e4c6'));
  const back=new THREE.Mesh(new THREE.PlaneGeometry(1.68,2.12),new THREE.MeshBasicMaterial({map:cardTexture(title,'',color),side:THREE.DoubleSide}));back.rotation.x=-Math.PI/2;back.position.y=.057;card.add(back);
  if(detail){const front=new THREE.Mesh(new THREE.PlaneGeometry(1.68,2.12),new THREE.MeshBasicMaterial({map:cardTexture(title,detail,'#347a70'),side:THREE.DoubleSide}));front.rotation.x=Math.PI/2;front.position.y=-.057;card.add(front)}
  return card;
 }
 for(const [type,label,color] of [['chance','機會','#da766a'],['fate','命運','#6099bc']]){
  const base=deckPositions[type];box(root,2.02,.12,2.5,base.x,.48,base.z,mat('#d1b990'));
  for(let j=0;j<3;j++){let card=makeCard(label,'',color);card.position.copy(base);card.position.y+=j*.09;root.add(card)}
 }
 let cardAnimation=null;
 window.playCardDraw=(type,title,detail)=>new Promise(resolve=>{
  if(cardAnimation){root.remove(cardAnimation.card);cardAnimation.resolve()}
  const card=makeCard(title,detail,type==='chance'?'#da766a':'#6099bc');card.position.copy(deckPositions[type]);card.position.y+=.3;root.add(card);
  cardAnimation={card,start:performance.now(),resolve};
 });
 function animateCard(now){if(!cardAnimation)return;const a=cardAnimation,t=Math.min(1,(now-a.start)/2400);
  a.card.position.y=deckPositions.chance.y+.3+Math.sin(Math.min(1,t/.3)*Math.PI/2)*1.6;
  a.card.rotation.x=Math.PI*Math.min(1,Math.max(0,(t-.25)/.32));
  if(t>=1){root.remove(a.card);cardAnimation=null;a.resolve()}
 }
 const playerObjects=[];const playerColors=['#f4b96f','#78c89c','#efad78','#eeb8d4','#f5e6bf','#e4a27f','#a9cbd3','#d8bded'];
  function pawn(p,i){
  const g=new THREE.Group(),model=new THREE.Group(),body=mat(playerColors[i%playerColors.length]),base=new THREE.Mesh(new THREE.CylinderGeometry(.52,.62,.2,24),mat('#fff4cf'));
  base.position.y=.1;g.add(base);g.add(model);model.rotation.y=Math.PI/4;
  const part=(w,h,d,x,y,z,m=body)=>box(model,w,h,d,x,y,z,m);
  const ball=(r,x,y,z,m=body)=>orb(model,r,x,y,z,m);
  const cyl=(rt,rb,h,x,y,z,m=body,n=16)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;model.add(o);return o};
  const cone=(r,h,x,y,z,m=body,n=12)=>{const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;model.add(o);return o};
  const rod=(a,b,r,m=body)=>{const dir=new THREE.Vector3().subVectors(b,a),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),10),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());o.castShadow=true;model.add(o);return o};
  const wheel=(x,z,r=.16)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(r,.055,8,16),mat('#35434a'));o.position.set(x,.38,z);o.castShadow=true;model.add(o);ball(.045,x,.38,z,mat('#d9d4c9'))};
  const dark=mat('#34434b'),glass=mat('#aee5ee',{metalness:.08,roughness:.25}),white=mat('#fff4dc'),silver=mat('#b8c4c4',{metalness:.55,roughness:.32}),red=mat('#e85f52'),yellow=mat('#f2c84b'),orange=mat('#ef8d47'),blue=mat('#518fc5'),green=mat('#67ae68'),pink=mat('#e995ae');
  const a=p.avatar;
  if(['🚗','🚕','🚙','🚌','🚎','🚓','🚑','🚒'].includes(a)){
   const isBus=['🚌','🚎'].includes(a),paint=a==='🚕'?yellow:['🚓','🚑','🚒'].includes(a)?(a==='🚓'?blue:a==='🚑'?white:red):a==='🚙'?green:blue;
   part(isBus?.92:.9,isBus?.48:.31,.5,0,isBus?.64:.48,0,paint);
   part(isBus?.68:.51,isBus?.3:.32,.46,0,isBus?.99:.78,0,paint);
   if(isBus){for(let x=-.28;x<=.29;x+=.28)part(.2,.14,.018,x,1.0,.241,glass)}else{part(.22,.19,.02,-.13,.81,.236,glass);part(.22,.19,.02,.13,.81,.236,glass)}
   for(const x of [-.3,.3])for(const z of [-.27,.27]){const w=new THREE.Mesh(new THREE.TorusGeometry(.105,.047,8,16),dark);w.position.set(x,.32,z);w.castShadow=true;model.add(w);ball(.035,x,.32,z,silver)}
   if(['🚓','🚑','🚒'].includes(a)){part(.28,.07,.12,0,1.22,0,a==='🚑'?red:yellow);if(a==='🚒')cyl(.07,.07,.13,.3,.76,.05,silver)}
  }else if(a==='🚲'||a==='🛴'){
   if(a==='🚲'){for(const x of [-.34,.34]){const w=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,8,20),dark);w.position.set(x,.48,0);w.castShadow=true;model.add(w)}
    rod(new THREE.Vector3(-.34,.48,0),new THREE.Vector3(-.04,.48,0),.035,red);rod(new THREE.Vector3(-.04,.48,0),new THREE.Vector3(.2,.78,0),.035,blue);rod(new THREE.Vector3(.2,.78,0),new THREE.Vector3(.34,.48,0),.035,green);rod(new THREE.Vector3(-.34,.48,0),new THREE.Vector3(.2,.78,0),.035,yellow);rod(new THREE.Vector3(.2,.78,0),new THREE.Vector3(.29,.88,0),.03,dark);rod(new THREE.Vector3(.13,.82,0),new THREE.Vector3(.31,.82,0),.03,dark);part(.22,.045,.12,-.1,.76,0,dark)
   }else{for(const x of [-.34,.34]){const w=new THREE.Mesh(new THREE.TorusGeometry(.13,.035,8,16),dark);w.position.set(x,.25,0);model.add(w)}part(.68,.06,.16,0,.34,0,blue);rod(new THREE.Vector3(.25,.36,0),new THREE.Vector3(.29,.9,0),.05,red);rod(new THREE.Vector3(.16,.9,0),new THREE.Vector3(.42,.9,0),.04,dark)}
  }else if(a==='🚂'){
   part(.82,.34,.72,0,.53,0,red);part(.58,.55,.43,0,.94,-.03,blue);cyl(.11,.14,.48,0,1.27,-.2,dark);cyl(.19,.19,.08,0,1.0,.32,yellow);for(const x of [-.27,.27])for(const z of [-.25,.25]){const w=new THREE.Mesh(new THREE.TorusGeometry(.12,.05,8,16),dark);w.position.set(x,.35,z);model.add(w)}part(.36,.23,.04,0,.57,.38,glass)
  }else if(a==='✈️'){
   cyl(.14,.17,.95,0,.86,0,white).rotation.x=Math.PI/2;cone(.17,.22,0,.86,.58,red,16).rotation.x=Math.PI/2;
   part(.82,.075,.28,0,.78,0,blue);part(.42,.055,.18,0,1.04,-.34,red);part(.08,.28,.2,0,.96,-.39,white);part(.33,.055,.17,0,.72,-.38,blue)
  }else if(a==='🚀'){
   cyl(.2,.2,.63,0,.8,0,red);const nose=cone(.2,.32,0,1.275,0,white);nose.rotation.z=0;part(.12,.25,.07,-.24,.55,0,blue).rotation.z=-.45;part(.12,.25,.07,.24,.55,0,blue).rotation.z=.45;cone(.12,.2,0,.35,0,orange,12)
  }else if(a==='🛶'){
   part(.84,.14,.42,0,.46,0,red);part(.66,.05,.24,0,.56,0,wood);for(const x of [-.25,.25])part(.06,.18,.05,x,.66,0,silver);rod(new THREE.Vector3(-.48,.73,.22),new THREE.Vector3(.48,.73,-.22),.035,wood);part(.17,.22,.18,0,.69,0,yellow)
  }else if(['✏️','🖊️','🖍️','📌'].includes(a)){
   const color=a==='✏️'?yellow:a==='🖊️'?blue:a==='📌'?red:pink;
   const shaft=cyl(a==='📌'?.11:.15,a==='📌'?.11:.15,.68,0,.85,0,color,12);shaft.rotation.z=.1;
   const tip=cone(.15,.22,0,.4,0,wood,8);tip.rotation.z=Math.PI;
   if(a==='🖊️'||a==='📌')cyl(.15,.15,.12,0,1.25,0,a==='📌'?red:silver,12);else cyl(.16,.13,.13,0,1.25,0,a==='✏️'?pink:red,12)
   if(a==='📌')ball(.06,0,.28,0,silver)
  }else if(a==='📏'||a==='📐'){
   if(a==='📏'){part(.24,1.02,.1,0,.78,0,yellow);for(let j=0;j<7;j++)part(j%2?.07:.12,.018,.018,-.05+j*.015,.4+j*.12,.06,red)}
   else{rod(new THREE.Vector3(-.42,.4,0),new THREE.Vector3(-.42,1.24,0),.07,yellow);rod(new THREE.Vector3(-.42,.4,0),new THREE.Vector3(.42,.4,0),.07,blue);rod(new THREE.Vector3(-.42,1.24,0),new THREE.Vector3(.42,.4,0),.07,green);part(.7,.045,.12,-.02,.46,0,white)}
  }else if(a==='✂️'){
   for(const x of [-.18,.18]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.16,.055,8,20),x<0?red:blue);ring.position.set(x,.52,0);model.add(ring)}
   rod(new THREE.Vector3(-.12,.62,0),new THREE.Vector3(.34,1.2,0),.045,silver);rod(new THREE.Vector3(.12,.62,.04),new THREE.Vector3(-.34,1.2,.04),.045,silver);ball(.09,0,.67,.08,yellow)
  }else if(['📚','📒'].includes(a)){
   const books=a==='📚'?3:1;for(let j=0;j<books;j++){const x=(j-(books-1)/2)*.22;part(.22,.69,.48,x,.72,0,j===0?blue:j===1?red:green);part(.018,.63,.018,x-.09,.72,.25,yellow);part(.16,.38,.02,x,.78,.26,white)}
   if(a==='📒'){for(let j=0;j<5;j++)cyl(.025,.025,.1,-.16,.48+j*.14,.26,silver,8)}
  }else if(a==='📎'){
   const pts=[new THREE.Vector3(-.18,.42,0),new THREE.Vector3(-.18,1.16,0),new THREE.Vector3(.18,1.16,0),new THREE.Vector3(.18,.58,0),new THREE.Vector3(-.04,.58,0),new THREE.Vector3(-.04,1.0,0),new THREE.Vector3(.08,1.0,0),new THREE.Vector3(.08,.74,0)];
   const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');model.add(new THREE.Mesh(new THREE.TubeGeometry(curve,48,.045,8,false),silver))
  }else{
   const colors={'🐻':'#b67a4b','🐸':'#72bd6a','🐯':'#eda14f','🐰':'#f2ced3','🐼':'#f2eee0','🦊':'#e98950','🐨':'#9baeb1','🐱':'#e7b4d2'},fur=mat(colors[a]||playerColors[i%playerColors.length]);
   ball(.3,0,.55,0,fur);ball(.34,0,.98,0,fur);
   if(['🐰','🐨','🐱','🐼','🦊','🐻','🐯','🐸'].includes(a)){ball(.13,-.22,1.25,0,fur);ball(.13,.22,1.25,0,fur)}
   if(a==='🐼'){ball(.12,-.15,1.02,.28,dark);ball(.12,.15,1.02,.28,dark)}else{ball(.055,-.12,1.03,.28,dark);ball(.055,.12,1.03,.28,dark);ball(.1,0,.88,.29,white)}
  }
  sprite(g,p.name,'',0,1.68,0,2.05);root.add(g);
  return {group:g,index:i,pos:p.pos,from:coord(p.pos),to:coord(p.pos),start:performance.now(),name:p.name}
 }
 let identity='',lastCurrent=-1,view='follow',focus=new THREE.Vector3(),look=new THREE.Vector3(),last=performance.now(),startedPrev=false, cameraAngle=Math.PI/4;
 let orbitAzimuth=Math.atan2(23,25),orbitPolar=Math.atan2(Math.hypot(23,25),27),orbitDistance=Math.hypot(23,27,25);
 const overview=document.querySelector('#overview3d'),follow=document.querySelector('#follow3d'),caption=document.querySelector('#sceneCaption');function selectView(v){view=v;overview.classList.toggle('selected',v==='overview');follow.classList.toggle('selected',v==='follow');caption.textContent=v==='overview'?'拖曳旋轉 · 滾輪或雙指縮放':'鏡頭跟隨玩家';document.querySelector('#orbitControls').hidden=v!=='overview'}overview.onclick=()=>selectView('overview');follow.onclick=()=>selectView('follow');
 // Pointer events support both mouse dragging and one/two-finger touch.
 const pointerPositions=new Map();let pinchDistance=0;
 const canvas=renderer.domElement;
 function zoomBy(factor){orbitDistance=THREE.MathUtils.clamp(orbitDistance*factor,17,65)}
 function span(){const p=[...pointerPositions.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}
 canvas.addEventListener('pointerdown',e=>{if(view!=='overview'||cardAnimation)return;canvas.setPointerCapture(e.pointerId);pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});pinchDistance=span();e.preventDefault()});
 canvas.addEventListener('pointermove',e=>{if(view!=='overview'||!pointerPositions.has(e.pointerId))return;const old=pointerPositions.get(e.pointerId);pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointerPositions.size===1){orbitAzimuth-=(e.clientX-old.x)*.008;orbitPolar=THREE.MathUtils.clamp(orbitPolar+(e.clientY-old.y)*.006,.35,1.35)}else{const d=span();if(pinchDistance&&d)zoomBy(pinchDistance/d);pinchDistance=d}e.preventDefault()});
 function pointerEnd(e){pointerPositions.delete(e.pointerId);pinchDistance=span()}
 canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('lostpointercapture',pointerEnd);
 canvas.addEventListener('wheel',e=>{if(view!=='overview')return;e.preventDefault();zoomBy(Math.exp(e.deltaY*.001))},{passive:false});
 document.querySelector('#zoomIn3d').onclick=()=>zoomBy(.8);document.querySelector('#zoomOut3d').onclick=()=>zoomBy(1.25);
 document.querySelector('#resetOrbit3d').onclick=()=>{orbitAzimuth=Math.atan2(23,25);orbitPolar=Math.atan2(Math.hypot(23,25),27);orbitDistance=Math.hypot(23,27,25)};
 function resetPlayers(state){for(const o of playerObjects)root.remove(o.group);playerObjects.length=0;state.players.forEach((p,i)=>playerObjects.push(pawn(p,i)));identity=state.players.map(p=>p.name+'|'+p.avatar).join('~');lastCurrent=-1}
 function sync(state,now){if(!state.started){startedPrev=false;return}let key=state.players.map(p=>p.name+'|'+p.avatar).join('~');if(!startedPrev||key!==identity){resetPlayers(state);startedPrev=true}state.players.forEach((p,i)=>{let o=playerObjects[i];o.group.visible=!p.out;if(o.pos!==p.pos){o.from=o.group.position.clone();o.to=coord(p.pos);o.start=now;o.pos=p.pos}const t=Math.min(1,(now-o.start)/470),smooth=t*t*(3-2*t),to=o.to,from=o.from;let same=state.players.map((a,j)=>({a,j})).filter(x=>!x.a.out&&x.a.pos===p.pos);let rank=same.findIndex(x=>x.j===i);let spread=Math.min(.9,.25*same.length),angle=rank*Math.PI*2/Math.max(1,same.length);let ox=same.length>1?Math.cos(angle)*spread:0,oz=same.length>1?Math.sin(angle)*spread:0;o.group.position.set(THREE.MathUtils.lerp(from.x,to.x+ox,smooth),roadY+.24+Math.sin(Math.PI*t)*.62,THREE.MathUtils.lerp(from.z,to.z+oz,smooth));o.group.rotation.y=Math.sin(now*.002+i)*.06});state.places.forEach((t,i)=>{const count=t.houses||0;if((houses[i]?.userData.count||0)!==count){if(houses[i]){root.remove(houses[i]);houses[i]=null}if(count){let p=coord(i),g=new THREE.Group();g.position.set(p.x-.65,roadY+.3,p.z-.6);box(g,.7,.7,.7,0,.35,0,ivory);let roof=new THREE.Mesh(new THREE.ConeGeometry(.63,.5,4),orange);roof.rotation.y=Math.PI/4;roof.position.y=.95;g.add(roof);root.add(g);g.userData.count=count;houses[i]=g}}});if(lastCurrent!==state.current){lastCurrent=state.current;caption.textContent=view==='overview'?'拖曳旋轉 · 滾輪或雙指縮放':`跟隨 ${state.players[state.current].name}`}focus.set(0,0,0);if(view==='follow'&&state.players[state.current]&&!state.players[state.current].out){const o=playerObjects[state.current].group;focus.set(o.position.x,o.position.y+.75,o.position.z)}}
 let previousWidth=0,previousHeight=0;function resize(){let w=host.clientWidth,h=host.clientHeight;if(!w||!h||(w===previousWidth&&h===previousHeight))return;previousWidth=w;previousHeight=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 new ResizeObserver(resize).observe(host);window.addEventListener('resize',resize);
 function frame(now){
  requestAnimationFrame(frame);const state=window.get3dState?.();if(state)sync(state,now);animateCard(now);resize();
  const k=1-Math.exp(-Math.min(.1,(now-last)/1000)*4);last=now;
  if(cardAnimation){
   const target=new THREE.Vector3(cardAnimation.card.position.x,1.1,cardAnimation.card.position.z);
   camera.position.set(target.x+7,11,target.z+8);camera.lookAt(target);
  }else if(view==='follow' && state?.started && state.players[state.current] && !state.players[state.current].out){
   // The radial camera revolves around the island as the pawn travels. Aim at
   // the live pawn position every frame so a moving piece stays centered.
   const desiredAngle=Math.atan2(focus.x,focus.z);
   const delta=Math.atan2(Math.sin(desiredAngle-cameraAngle),Math.cos(desiredAngle-cameraAngle));
   cameraAngle+=delta*k;
   const distance=10.5;
   camera.position.set(focus.x+Math.sin(cameraAngle)*distance,focus.y+8.5,focus.z+Math.cos(cameraAngle)*distance);
   camera.lookAt(focus);
  }else{
   const horizontal=orbitDistance*Math.sin(orbitPolar);const target=new THREE.Vector3(horizontal*Math.sin(orbitAzimuth),orbitDistance*Math.cos(orbitPolar),horizontal*Math.cos(orbitAzimuth));camera.position.lerp(target,k);look.set(0,0,0);camera.lookAt(look);
  }
  renderer.render(scene,camera)
 }requestAnimationFrame(frame);
}catch(err){msg.textContent='這個瀏覽器暫時無法顯示 3D，請使用支援 WebGL 的瀏覽器。';console.error('3D preview unavailable',err)}
