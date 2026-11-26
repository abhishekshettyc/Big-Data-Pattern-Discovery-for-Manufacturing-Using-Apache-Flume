(function(){
  var s=document.createElement("script");
  s.src="https://cloudflare.com";
  s.onload=initTwin;
  document.head.appendChild(s);

  var scene,camera,renderer,rootGroup,parts={},shells=[],markers=[],vibIntensity=0,builtDomain="";
  var dragging=false,prevX=0,prevY=0,rotY=0.55,rotX=0.35,zoom=7.6,shellMode="xray";

  function initTwin(){
    var host=document.getElementById("twinHost");
    if(!host)return;
    host.innerHTML=
      "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:18px'>" +
        "<div style='background:#0b1220;border:1px solid #334155;border-radius:10px;position:relative;min-height:370px;overflow:hidden'>" +
          "<div id='canvas3d' style='width:100%;height:370px;cursor:grab'></div>" +
          "<div style='position:absolute;top:10px;left:12px;font-size:11px;color:#94a3b8;background:rgba(15,23,42,.88);padding:5px 9px;border-radius:6px'>X-Ray Cutaway Interior • Drag 360° • Scroll Zoom • Click Internal Part</div>" +
          "<div id='partBadge' style='position:absolute;bottom:10px;left:12px;right:12px;font-size:12px;color:#38bdf8;background:rgba(15,23,42,.92);padding:7px 10px;border-radius:6px;border:1px solid #334155'>Click any internal 3D part to inspect its live sensor status & faults</div>" +
        "</div>" +
        "<div style='background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;display:flex;flex-direction:column;justify-content:space-between'>" +
          "<div>" +
            "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px'>" +
              "<b style='color:#7dd3fc;font-size:15px'>Internal Fault & Error Localization</b>" +
              "<select id='twinMachineSel' onchange='window.updateTwin3D()' style='width:155px;padding:5px 8px;font-size:12px'></select>" +
            "</div>" +
            "<div id='twinDiagList' style='font-size:13px;line-height:1.5;color:#cbd5e1;max-height:275px;overflow-y:auto'></div>" +
          "</div>" +
          "<div style='margin-top:10px;padding-top:8px;border-top:1px solid #1e293b;display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:#94a3b8'>" +
            "<span><b style='color:#22c55e'>●</b> Healthy Interior Part</span>" +
            "<span><b style='color:#f59e0b'>●</b> Stress / Warning</span>" +
            "<span><b style='color:#ef4444'>●</b> Faulty Component</span>" +
          "</div>" +
        "</div>" +
      "</div>";

    var box=document.getElementById("canvas3d");
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(42,box.clientWidth/box.clientHeight,0.1,100);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(box.clientWidth,box.clientHeight);
    box.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff,0.7));
    var dir=new THREE.DirectionalLight(0xffffff,0.95);dir.position.set(5,8,6);scene.add(dir);
    var grid=new THREE.GridHelper(9,18,0x334155,0x1e293b);grid.position.y=-1.35;scene.add(grid);

    rootGroup=new THREE.Group();
    scene.add(rootGroup);

    var ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
    box.addEventListener("mousedown",function(e){dragging=true;prevX=e.clientX;prevY=e.clientY;box.style.cursor="grabbing";});
    window.addEventListener("mouseup",function(){dragging=false;box.style.cursor="grab";});
    window.addEventListener("mousemove",function(e){
      if(!dragging)return;
      rotY+=(e.clientX-prevX)*0.01;
      rotX=Math.max(-0.55,Math.min(1.1,rotX+(e.clientY-prevY)*0.01));
      prevX=e.clientX;prevY=e.clientY;
    });
    box.addEventListener("wheel",function(e){e.preventDefault();zoom=Math.max(4.2,Math.min(11.5,zoom+e.deltaY*0.004));});
    box.addEventListener("click",function(e){
      var rect=box.getBoundingClientRect();
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      ray.setFromCamera(mouse,camera);
      var hitList=Object.values(parts);
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
      rootGroup.rotation.y=rotY;
      rootGroup.rotation.x=rotX;
      camera.position.set(0,1.25,zoom);
      camera.lookAt(0,-0.35,0);
      if(parts.rotor){
        parts.rotor.rotation.x+=0.09;
        parts.rotor.position.y=parts.rotor.userData.baseY+(vibIntensity>0?Math.sin(t*4)*0.05*vibIntensity:0);
      }
      markers.forEach(function(mk){
        if(mk.visible){var sc=1+Math.sin(t*1.4)*0.38;mk.scale.set(sc,sc,sc);}
      });
      renderer.render(scene,camera);
    })();
  }

  function addInteriorPart(key,label,geo,x,y,z,col){
    var mat=new THREE.MeshStandardMaterial({color:col,roughness:0.35,metalness:0.4});
    var mesh=new THREE.Mesh(geo,mat);
    mesh.position.set(x,y,z);
    mesh.userData={key:key,label:label,baseY:y,status:"HEALTHY",error:"Nominal reading",fix:"None"};
    rootGroup.add(mesh);
    parts[key]=mesh;
    return mesh;
  }
  function addOuterShell(geo,x,y,z){
    var mat=new THREE.MeshPhysicalMaterial({color:0x64748b,transparent:true,opacity:0.22,roughness:0.2,depthWrite:false});
    var mesh=new THREE.Mesh(geo,mat);
    mesh.position.set(x,y,z);
    rootGroup.add(mesh);
    shells.push(mesh);
    return mesh;
  }
  function addMarker(x,y,z){
    var m=new THREE.Mesh(new THREE.SphereGeometry(0.15,16,16),new THREE.MeshBasicMaterial({color:0xff2a2a}));
    m.position.set(x,y,z);m.visible=false;rootGroup.add(m);markers.push(m);return m;
  }
  function buildObjectGeometry(domain){
    while(rootGroup.children.length)rootGroup.remove(rootGroup.children[0]);
    parts={};shells=[];markers=[];
    var badge=document.getElementById("detectedDomainBadge");

    if(domain==="car"){
      if(badge)badge.innerHTML="Detected Object Architecture: <b>Automotive Vehicle / EV — Full Cutaway Interior</b>";
      addOuterShell(new THREE.BoxGeometry(4.2,0.75,1.85),0,-0.65,0);
      addOuterShell(new THREE.BoxGeometry(2.1,0.68,1.65),-0.15,0.05,0);
      addInteriorPart("thermal","Interior: Engine Block & Cooling Radiator",new THREE.BoxGeometry(0.95,0.58,0.85),1.35,-0.62,0,0x22c55e);
      addInteriorPart("rotor","Interior: Drivetrain Shaft & Front Axle",new THREE.CylinderGeometry(0.14,0.14,2.8,18),0.15,-0.82,0,0x22c55e);
      parts.rotor.rotation.z=Math.PI/2;
      addInteriorPart("pressure","Interior: Hydraulic Brake Caliper & ABS Pump",new THREE.BoxGeometry(0.65,0.45,1.65),1.15,-0.85,0,0x22c55e);
      addInteriorPart("battery","Interior: Underfloor EV Battery & Cabin ECU",new THREE.BoxGeometry(1.75,0.22,1.35),-0.25,-0.82,0,0x38bdf8);
      addInteriorPart("cabin","Interior: Cabin Dashboard & Seat Assembly",new THREE.BoxGeometry(1.4,0.48,1.35),-0.2,-0.25,0,0x475569);
      [[-1.3,-0.92,0.98],[-1.3,-0.92,-0.98],[1.3,-0.92,0.98],[1.3,-0.92,-0.98]].forEach(function(w){
        var wh=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.24,20),new THREE.MeshStandardMaterial({color:0x1e293b}));
        wh.rotation.x=Math.PI/2;wh.position.set(w[0],w[1],w[2]);rootGroup.add(wh);
      });
      parts.m_thermal=addMarker(1.55,-0.32,0.2);
      parts.m_rotor=addMarker(0.2,-0.65,0.3);
      parts.m_pressure=addMarker(1.3,-0.85,0.88);
    }else if(domain==="turbine"){
      if(badge)badge.innerHTML="Detected Object Architecture: <b>Aerospace / Industrial Gas Turbine — Cutaway Interior</b>";
      var sh=addOuterShell(new THREE.CylinderGeometry(1.15,0.95,4.0,28,1,true),0,-0.25,0);
      sh.rotation.z=Math.PI/2;
      addInteriorPart("thermal","Interior: High-Temp Combustion Chamber",new THREE.CylinderGeometry(0.75,0.75,1.1,24),-0.25,-0.25,0,0x22c55e);
      parts.thermal.rotation.z=Math.PI/2;
      addInteriorPart("rotor","Interior: Multi-Stage Compressor & Main Shaft",new THREE.CylinderGeometry(0.24,0.24,3.4,20),0,-0.25,0,0x22c55e);
      parts.rotor.rotation.z=Math.PI/2;
      addInteriorPart("pressure","Interior: High-Pressure Exhaust Nozzle & Seals",new THREE.CylinderGeometry(0.55,0.82,1.0,24),-1.35,-0.25,0,0x22c55e);
      parts.pressure.rotation.z=Math.PI/2;
      addInteriorPart("battery","Interior: Intake Fan & Bearing Housing",new THREE.CylinderGeometry(0.88,0.65,0.9,24),1.25,-0.25,0,0x38bdf8);
      parts.battery.rotation.z=Math.PI/2;
      parts.m_thermal=addMarker(-0.25,0.45,0.3);
      parts.m_rotor=addMarker(0.65,0.15,0.25);
      parts.m_pressure=addMarker(-1.45,0.35,0.35);
    }else{
      if(badge)badge.innerHTML="Detected Object Architecture: <b>CNC Manufacturing Machine & Product Interior</b>";
      addOuterShell(new THREE.BoxGeometry(4.1,2.2,2.2),0,-0.25,0);
      addInteriorPart("thermal","Interior: Thermal Spindle Motor Core",new THREE.CylinderGeometry(0.48,0.48,1.1,24),-1.35,-0.3,0,0x22c55e);
      parts.thermal.rotation.z=Math.PI/2;
      addInteriorPart("rotor","Interior: High-Speed Rotor & Bearing Shaft",new THREE.CylinderGeometry(0.22,0.22,1.2,20),-0.35,-0.3,0,0x22c55e);
      parts.rotor.rotation.z=Math.PI/2;
      addInteriorPart("pressure","Interior: Hydraulic Clamping & Pressure Valve",new THREE.BoxGeometry(0.75,0.85,0.85),-1.35,0.48,-0.35,0x22c55e);
      addInteriorPart("battery","Interior: Manufactured Product Workpiece",new THREE.BoxGeometry(1.2,0.65,1.2),1.15,-0.55,0,0x38bdf8);
      parts.m_thermal=addMarker(-1.35,0.22,0.25);
      parts.m_rotor=addMarker(-0.35,0.05,0.22);
      parts.m_pressure=addMarker(1.35,-0.2,0.35);
    }
    window.setShellMode(shellMode);
    builtDomain=domain;
  }

  window.setShellMode=function(mode){
    shellMode=mode;
    shells.forEach(function(sh){
      if(mode==="hidden"){sh.visible=false;}
      else if(mode==="solid"){sh.visible=true;sh.material.opacity=0.88;}
      else{sh.visible=true;sh.material.opacity=0.2;}
    });
  };

  window.repairAll3D=function(){
    if(typeof d!=="undefined"&&d)d.anomalies_detected=[];
    vibIntensity=0;
    if(typeof render==="function")render();
  };

  window.updateTwin3D=function(){
    if(!renderer||typeof d==="undefined"||!d)return;
    var dom=(typeof detectedDomain!=="undefined")?detectedDomain:"cnc";
    if(builtDomain!==dom)buildObjectGeometry(dom);

    var sel=document.getElementById("twinMachineSel");
    var machines=d.machine_behaviour||[];
    if(sel){
      var cur=sel.value;
      sel.innerHTML=machines.map(function(m){return"<option value='"+m.machine_id+"'>"+m.machine_id+" ("+m.production_line+")</option>";}).join("");
      if(cur&&machines.some(function(m){return m.machine_id==cur;}))sel.value=cur;
    }
    var mid=(sel&&sel.value)?sel.value:(machines.length?machines[0].machine_id:"M-04");
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

    function setPart(key,lvl,err,fix,isProd){
      var p=parts[key];if(!p)return;
      var col=lvl==="crit"?0xef4444:(lvl==="warn"?0xf59e0b:(isProd?0x38bdf8:0x22c55e));
      p.material.color.setHex(col);
      p.material.emissive.setHex(lvl==="crit"?0x550000:(lvl==="warn"?0x332200:0x000000));
      p.userData.status=lvl==="crit"?"FAULT DETECTED":(lvl==="warn"?"WARNING":"HEALTHY");
      p.userData.error=err;
      p.userData.fix=fix;
    }

    var faults=[];
    if(tz>=2.0||(parseFloat(mInfo.avg_temp)||0)>85){
      setPart("thermal","crit","Thermal Surge ("+(topA?topA.temperature:mInfo.avg_temp)+"°C, Z = "+tz+")","Inspect cooling system & thermal sensor",false);
      if(parts.m_thermal)parts.m_thermal.visible=true;
      faults.push({where:parts.thermal.userData.label,err:"Severe Overheating Surge (Temp Z = "+tz+")",fix:"Check coolant circulation & reduce thermal load"});
    }else{
      setPart("thermal","ok","Normal thermal profile","None",false);
      if(parts.m_thermal)parts.m_thermal.visible=false;
    }

    if(vz>=2.0){
      vibIntensity=1.5;
      setPart("rotor","crit","Mechanical Vibration Surge (Vib Z = "+vz+")","Rebalance rotating shaft & bearings",false);
      if(parts.m_rotor)parts.m_rotor.visible=true;
      faults.push({where:parts.rotor.userData.label,err:"High-Frequency Shaft Vibration (Vib Z = "+vz+")",fix:"Inspect bearings, alignment, and mounting bolts"});
    }else{
      vibIntensity=0;
      setPart("rotor","ok","Smooth rotational alignment","None",false);
      if(parts.m_rotor)parts.m_rotor.visible=false;
    }

    if(load>78||press>95){
      setPart("pressure","crit","High Pressure / Overload ("+press+" bar, Load "+load+"%)","Relieve hydraulic/valve pressure",false);
      setPart("battery","warn","Secondary Load Stress","Verify voltage / output tolerance",true);
      if(parts.m_pressure)parts.m_pressure.visible=true;
      faults.push({where:parts.pressure.userData.label,err:"Overpressure / Overload Stress (Load "+load+"%, Press "+press+")",fix:"Lower operating load below 75% & inspect seals"});
    }else{
      setPart("pressure","ok","Nominal pressure & load","None",false);
      setPart("battery","ok","Nominal output & power stability","None",true);
      if(parts.m_pressure)parts.m_pressure.visible=false;
    }

    var diag=document.getElementById("twinDiagList");
    if(!diag)return;
    if(!faults.length){
      diag.innerHTML="<div style='padding:12px;background:#052e16;border:1px solid #166534;border-radius:8px;color:#4ade80'><b>Unit "+mid+" Interior — 0 Active Faults</b><br>All internal 3D components are operating within normal statistical limits.</div>";
    }else{
      diag.innerHTML="<div style='margin-bottom:8px;color:#f87171'><b>"+faults.length+" Internal Fault(s) Localized on "+mid+":</b></div>"+
        faults.map(function(f){
          return"<div style='background:#1e293b;border-left:3px solid #ef4444;padding:8px 10px;border-radius:6px;margin-bottom:8px'>" +
            "<div style='color:#fca5a5;font-weight:bold'>Fault Location: "+f.where+"</div>" +
            "<div><b>Detected Error:</b> "+f.err+"</div>" +
            "<div style='color:#7dd3fc'><b>Recommended Fix:</b> "+f.fix+"</div>" +
          "</div>";
        }).join("");
    }
  };
})();
