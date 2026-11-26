(function(){
  var s=document.createElement("script");
  s.src="https://cloudflare.com";
  s.onload=initTwin;
  document.head.appendChild(s);

  var scene,camera,renderer,parts={},markers=[],vibIntensity=0;
  var dragging=false,prevX=0,prevY=0,rotY=0.55,rotX=0.38,zoom=7.4;

  function initTwin(){
    var host=document.getElementById("twinHost");
    if(!host)return;
    host.innerHTML=
      "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:18px'>" +
        "<div style='background:#0b1220;border:1px solid #334155;border-radius:10px;position:relative;min-height:360px;overflow:hidden'>" +
          "<div id='canvas3d' style='width:100%;height:360px;cursor:grab'></div>" +
          "<div style='position:absolute;top:10px;left:12px;font-size:11px;color:#94a3b8;background:rgba(15,23,42,.85);padding:5px 9px;border-radius:6px'>Left: Machine Assembly • Right: Manufactured Product • Drag 360° • Click Part</div>" +
          "<div id='partBadge' style='position:absolute;bottom:10px;left:12px;right:12px;font-size:12px;color:#38bdf8;background:rgba(15,23,42,.92);padding:7px 10px;border-radius:6px;border:1px solid #334155'>Click any 3D part of the Machine or Product to inspect exact defects</div>" +
        "</div>" +
        "<div style='background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;display:flex;flex-direction:column;justify-content:space-between'>" +
          "<div>" +
            "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px'>" +
              "<b style='color:#7dd3fc;font-size:15px'>3D Product & Machine Defect Localization</b>" +
              "<select id='twinMachineSel' onchange='window.updateTwin3D()' style='width:140px;padding:5px 8px;font-size:12px'></select>" +
            "</div>" +
            "<div id='twinDiagList' style='font-size:13px;line-height:1.5;color:#cbd5e1;max-height:265px;overflow-y:auto'></div>" +
          "</div>" +
          "<div style='margin-top:10px;padding-top:8px;border-top:1px solid #1e293b;display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:#94a3b8'>" +
            "<span><b style='color:#22c55e'>●</b> Healthy</span>" +
            "<span><b style='color:#f59e0b'>●</b> Warning / Stress</span>" +
            "<span><b style='color:#ef4444'>●</b> Defective Zone</span>" +
          "</div>" +
        "</div>" +
      "</div>";

    var box=document.getElementById("canvas3d");
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(42,box.clientWidth/box.clientHeight,0.1,100);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(box.clientWidth,box.clientHeight);
    box.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff,0.65));
    var dir=new THREE.DirectionalLight(0xffffff,0.95);dir.position.set(5,8,6);scene.add(dir);
    var grid=new THREE.GridHelper(9,18,0x334155,0x1e293b);grid.position.y=-1.35;scene.add(grid);

    var group=new THREE.Group();
    scene.add(group);

    function addPart(key,label,geo,x,y,z,col){
      var mat=new THREE.MeshStandardMaterial({color:col,roughness:0.35,metalness:0.4});
      var mesh=new THREE.Mesh(geo,mat);
      mesh.position.set(x,y,z);
      mesh.userData={key:key,label:label,status:"HEALTHY",error:"No defects detected",fix:"Continue normal operation"};
      group.add(mesh);
      parts[key]=mesh;
      return mesh;
    }

    addPart("chassis","Machine Base Chassis",new THREE.BoxGeometry(2.6,0.4,2.0),-1.1,-1.1,0,0x334155);
    addPart("motor","Machine: Thermal Motor Core",new THREE.CylinderGeometry(0.48,0.48,1.1,24),-1.65,-0.3,0,0x22c55e);
    parts.motor.rotation.z=Math.PI/2;
    addPart("spindle","Machine: Spindle & Rotor Shaft",new THREE.CylinderGeometry(0.22,0.22,1.15,20),-0.65,-0.3,0,0x22c55e);
    parts.spindle.rotation.z=Math.PI/2;
    addPart("hydraulic","Machine: Hydraulic Pressure Manifold",new THREE.BoxGeometry(0.75,0.85,0.85),-1.65,0.45,-0.35,0x22c55e);

    addPart("pedestal","Inspection Stage Pedestal",new THREE.BoxGeometry(1.7,0.35,1.7),1.45,-1.12,0,0x1e293b);
    addPart("prod_edge","Product Part 1: Clamping Edge & Flange",new THREE.BoxGeometry(1.35,0.22,1.35),1.45,-0.82,0,0x38bdf8);
    addPart("prod_core","Product Part 2: Main Core & Bore Body",new THREE.CylinderGeometry(0.52,0.52,0.55,24),1.45,-0.42,0,0x38bdf8);
    addPart("prod_surface","Product Part 3: Top Machined Surface",new THREE.CylinderGeometry(0.54,0.54,0.14,24),1.45,-0.07,0,0x38bdf8);

    function addMarker(x,y,z){
      var m=new THREE.Mesh(new THREE.SphereGeometry(0.14,16,16),new THREE.MeshBasicMaterial({color:0xff2a2a}));
      m.position.set(x,y,z);m.visible=false;group.add(m);markers.push(m);return m;
    }
    parts.m_surface=addMarker(1.75,0.02,0.25);
    parts.m_core=addMarker(1.92,-0.42,0.18);
    parts.m_edge=addMarker(1.98,-0.78,0.48);

    var ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
    box.addEventListener("mousedown",function(e){dragging=true;prevX=e.clientX;prevY=e.clientY;box.style.cursor="grabbing";});
    window.addEventListener("mouseup",function(){dragging=false;box.style.cursor="grab";});
    window.addEventListener("mousemove",function(e){
      if(!dragging)return;
      rotY+=(e.clientX-prevX)*0.01;
      rotX=Math.max(-0.55,Math.min(1.1,rotX+(e.clientY-prevY)*0.01));
      prevX=e.clientX;prevY=e.clientY;
    });
    box.addEventListener("wheel",function(e){e.preventDefault();zoom=Math.max(4.5,Math.min(11,zoom+e.deltaY*0.004));});
    box.addEventListener("click",function(e){
      var rect=box.getBoundingClientRect();
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      ray.setFromCamera(mouse,camera);
      var hitList=Object.keys(parts).filter(function(k){return k.indexOf("m_")!==0;}).map(function(k){return parts[k];});
      var hits=ray.intersectObjects(hitList);
      if(hits.length){
        var u=hits[0].object.userData;
        document.getElementById("partBadge").innerHTML="<b>"+u.label+"</b> ["+u.status+"] — "+u.error+" | <i>Fix: "+u.fix+"</i>";
      }
    });

    window.addEventListener("resize",function(){
      if(!box.clientWidth)return;
      camera.aspect=box.clientWidth/box.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(box.clientWidth,box.clientHeight);
    });

    window.updateTwin3D();
    (function animate(){
      requestAnimationFrame(animate);
      var t=Date.now()*0.008;
      if(!dragging)rotY+=0.0025;
      group.rotation.y=rotY;
      group.rotation.x=rotX;
      camera.position.set(0,1.25,zoom);
      camera.lookAt(0.15,-0.35,0);
      parts.spindle.rotation.x+=0.08;
      if(vibIntensity>0){
        parts.spindle.position.y=-0.3+Math.sin(t*4)*0.05*vibIntensity;
        parts.prod_surface.position.x=1.45+Math.cos(t*4)*0.025*vibIntensity;
      }else{
        parts.spindle.position.y=-0.3;
        parts.prod_surface.position.x=1.45;
      }
      markers.forEach(function(mk){
        if(mk.visible){var sc=1+Math.sin(t*1.4)*0.35;mk.scale.set(sc,sc,sc);}
      });
      renderer.render(scene,camera);
    })();
  }

  window.updateTwin3D=function(){
    if(!renderer||typeof d==="undefined"||!d)return;
    var sel=document.getElementById("twinMachineSel");
    var machines=d.machine_behaviour||[];
    if(sel&&sel.options.length!==machines.length){
      var cur=sel.value;
      sel.innerHTML=machines.map(function(m){return"<option value='"+m.machine_id+"'>"+m.machine_id+" ("+m.production_line+")</option>";}).join("");
      if(cur)sel.value=cur;
    }
    var mid=(sel&&sel.value)?sel.value:(machines[0]?machines[0].machine_id:"M-04");
    var mInfo=machines.filter(function(m){return m.machine_id==mid;})[0]||{};
    var mAnom=(d.anomalies_detected||[]).filter(function(a){return a.machine_id==mid;});
    if(!mAnom.length&&(d.anomalies_detected||[]).length){
      mAnom=[d.anomalies_detected[0]];
      mid=mAnom[0].machine_id;
      if(sel)sel.value=mid;
    }

    var topA=mAnom[0]||null;
    var tz=topA?Math.abs(parseFloat(topA.temp_z)||0):0;
    var vz=topA?Math.abs(parseFloat(topA.vib_z)||0):0;
    var load=parseFloat(mInfo.avg_load)||65;
    var press=parseFloat(mInfo.avg_pressure)||60;

    function setState(key,lvl,err,fix,isProd){
      var p=parts[key];if(!p)return;
      var col=lvl==="crit"?0xef4444:(lvl==="warn"?0xf59e0b:(isProd?0x38bdf8:0x22c55e));
      p.material.color.setHex(col);
      p.material.emissive.setHex(lvl==="crit"?0x550000:(lvl==="warn"?0x332200:0x000000));
      p.userData.status=levelText(lvl);
      p.userData.error=err;
      p.userData.fix=fix;
    }
    function levelText(l){return l==="crit"?"DEFECT DETECTED":(l==="warn"?"WARNING":"HEALTHY");}

    var defects=[];
    if(tz>=2.5||(parseFloat(mInfo.avg_temp)||0)>85){
      setState("motor","crit","Thermal Overheating (Temp Z = "+tz+")","Check coolant loop",false);
      setState("prod_core","crit","Thermal Expansion & Bore Warping (+0.18mm)","Reject & cool workpiece",true);
      parts.m_core.visible=true;
      defects.push({where:"Product Core & Bore Body (Caused by Motor Core)",err:"Dimensional Warping & Thermal Expansion (Temp Z = "+tz+", "+(topA?topA.temperature:mInfo.avg_temp)+"°C)",fix:"Recalibrate thermal offset & inspect coolant flow"});
    }else{
      setState("motor","ok","Normal operating temperature","None",false);
      setState("prod_core","ok","Core diameter within ±0.01mm tolerance","Pass QC",true);
      parts.m_core.visible=false;
    }

    if(vz>=2.5){
      vibIntensity=1.5;
      setState("spindle","crit","Rotor Imbalance / Bearing Surge (Vib Z = "+vz+")","Rebalance spindle rotor",false);
      setState("prod_surface","crit","Surface Chatter Marks & Roughness Defect (Ra > 3.2µm)","Re-machine top face",true);
      parts.m_surface.visible=true;
      defects.push({where:"Product Top Machined Surface (Caused by Spindle Shaft)",err:"Surface Chatter Marks & Roughness Error (Vib Z = "+vz+")",fix:"Tighten tool holder & inspect spindle bearings"});
    }else if(vz>=1.5){
      vibIntensity=0.6;
      setState("spindle","warn","Moderate Spindle Oscillation (Vib Z = "+vz+")","Schedule lubrication",false);
      setState("prod_surface","warn","Minor surface micro-finish variation","Inspect insert wear",true);
      parts.m_surface.visible=true;
      defects.push({where:"Product Top Machined Surface (Caused by Spindle)",err:"Micro-Finish Roughness Warning (Vib Z = "+vz+")",fix:"Check cutting insert sharpness"});
    }else{
      vibIntensity=0;
      setState("spindle","ok","Smooth rotational alignment","None",false);
      setState("prod_surface","ok","Mirror surface finish within ISO spec","Pass QC",true);
      parts.m_surface.visible=false;
    }

    if(load>75||press>110){
      setState("hydraulic","warn","High Load / Pressure Stress (Load "+load+"%, Press "+press+")","Check pressure relief valve",false);
      setState("prod_edge","crit","Clamping Micro-Slip & Edge Burr Defect","Deburr flange & lower feed rate",true);
      parts.m_edge.visible=true;
      defects.push({where:"Product Clamping Edge & Flange (Caused by Hydraulic Manifold)",err:"Edge Burr & Clamping Shift (Load = "+load+"%, Pressure = "+press+")",fix:"Reduce feed load below 75% & check chuck pressure"});
    }else{
      setState("hydraulic","ok","Nominal hydraulic clamping pressure","None",false);
      setState("prod_edge","ok","Clean edge geometry & zero burr","Pass QC",true);
      parts.m_edge.visible=false;
    }

    var diag=document.getElementById("twinDiagList");
    if(!diag)return;
    if(!defects.length){
      diag.innerHTML="<div style='padding:12px;background:#052e16;border:1px solid #166534;border-radius:8px;color:#4ade80'><b>Machine "+mid+" & Output Product — 0 Defects Found</b><br>All product zones (Top Surface, Core Bore, Clamping Edge) and machine subsystems are within normal tolerance.</div>";
    }else{
      diag.innerHTML="<div style='margin-bottom:8px;color:#f87171'><b>"+defects.length+" Product & Machine Defect(s) Detected on "+mid+":</b></div>"+
        defects.map(function(df){
          return"<div style='background:#1e293b;border-left:3px solid #ef4444;padding:8px 10px;border-radius:6px;margin-bottom:8px'>" +
            "<div style='color:#fca5a5;font-weight:bold'>Location: "+df.where+"</div>" +
            "<div><b>Error:</b> "+df.err+"</div>" +
            "<div style='color:#7dd3fc'><b>Corrective Fix:</b> "+df.fix+"</div>" +
          "</div>";
        }).join("");
    }
  };
})();
