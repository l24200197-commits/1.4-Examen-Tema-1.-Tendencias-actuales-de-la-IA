(() => {
  const form=document.getElementById("audioForm"),fileInput=document.getElementById("audioFile"),source=document.getElementById("audioSource"),target=document.getElementById("audioTarget"),submit=document.getElementById("audioSubmit"),status=document.getElementById("audioStatus"),result=document.getElementById("audioResult"),transcription=document.getElementById("audioTranscription"),translation=document.getElementById("audioTranslation"),originalAudio=document.getElementById("originalAudio"),translatedAudio=document.getElementById("translatedAudio"),speechNotice=document.getElementById("audioSpeechNotice"),voiceNote=document.getElementById("audioVoiceNote");let originalUrl,translatedUrl;App.keepOpposite(source,target);
  const showStatus=text=>{status.classList.remove("d-none");status.innerHTML=`<span class="spinner-border spinner-border-sm me-2"></span>${text}`;};
  fileInput.addEventListener("change",()=>{if(originalUrl)URL.revokeObjectURL(originalUrl);const file=fileInput.files[0];if(!file)return originalAudio.classList.add("d-none");originalUrl=URL.createObjectURL(file);originalAudio.src=originalUrl;originalAudio.classList.remove("d-none");});
  /* Grabación con micrófono ------------------------------------------------
     Permite traducir hablando, sin subir un archivo. Pensado para el celular:
     el navegador sólo expone el micrófono en HTTPS y sólo pide permiso dentro
     de un gesto del usuario, por eso todo arranca en el click del botón. */
  const recorderBox=document.getElementById("audioRecorder"),recordBtn=document.getElementById("audioRecord"),recordIcon=document.getElementById("audioRecordIcon"),recordLabel=document.getElementById("audioRecordLabel"),recordTimer=document.getElementById("audioRecordTimer"),recordHint=document.getElementById("audioRecordHint");
  const MAX_RECORDING_MS=60000,MIN_RECORDING_BYTES=1200;
  let recorder,stream,chunks=[],timerId,startedAt;

  const canRecord=()=>window.isSecureContext&&!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=="undefined";
  // Android graba en webm/opus y iOS en mp4; se pregunta cuál soporta el equipo.
  const pickMime=()=>["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/aac"].find(mime=>MediaRecorder.isTypeSupported(mime))||"";
  // El backend acepta mp3, wav, m4a y webm. El contenedor mp4 que graba iOS es
  // justamente un m4a, así que se nombra así para pasar la validación.
  const extensionFor=mime=>mime.includes("webm")?"webm":"m4a";

  const micError=error=>({
    NotAllowedError:"Permiso de micrófono denegado. Actívalo para este sitio en los ajustes del navegador y recarga la página.",
    PermissionDeniedError:"Permiso de micrófono denegado. Actívalo para este sitio en los ajustes del navegador y recarga la página.",
    NotFoundError:"No se detectó ningún micrófono en este dispositivo.",
    NotReadableError:"El micrófono está siendo usado por otra aplicación. Ciérrala e inténtalo de nuevo.",
    SecurityError:"El micrófono requiere una conexión segura (HTTPS)."
  }[error?.name]||"No fue posible acceder al micrófono.");

  function releaseStream(){
    // Sin detener las pistas, el celular deja encendido el indicador de
    // grabación y sigue consumiendo batería.
    stream?.getTracks().forEach(track=>track.stop());stream=null;
    clearInterval(timerId);timerId=null;
  }

  function paintRecording(active){
    recordBtn.classList.toggle("btn-danger",active);
    recordBtn.classList.toggle("btn-outline-primary",!active);
    recordBtn.setAttribute("aria-pressed",String(active));
    recordIcon.className=active?"bi bi-stop-fill me-2":"bi bi-mic-fill me-2";
    recordLabel.textContent=active?"Detener grabación":"Grabar con micrófono";
    recordTimer.classList.toggle("d-none",!active);
    if(active)recordTimer.textContent="0:00";
  }

  function tick(){
    const elapsed=Date.now()-startedAt,seconds=Math.floor(elapsed/1000);
    recordTimer.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;
    if(elapsed>=MAX_RECORDING_MS)stopRecording();
  }

  function attachRecording(blob,mime){
    const file=new File([blob],`grabacion.${extensionFor(mime)}`,{type:mime||blob.type});
    // Poblar el input reutiliza tal cual la validación y el envío existentes.
    const data=new DataTransfer();data.items.add(file);fileInput.files=data.files;
    fileInput.dispatchEvent(new Event("change"));
  }

  function stopRecording(){
    if(recorder&&recorder.state!=="inactive")recorder.stop();
    else{releaseStream();paintRecording(false);}
  }

  async function startRecording(){
    let media;
    try{
      media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
    }catch(error){return App.showAlert(micError(error));}

    stream=media;chunks=[];
    const mime=pickMime();
    recorder=mime?new MediaRecorder(media,{mimeType:mime,audioBitsPerSecond:64000}):new MediaRecorder(media);
    recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data);};
    recorder.onerror=()=>{releaseStream();paintRecording(false);App.showAlert("Se interrumpió la grabación.");};
    recorder.onstop=()=>{
      releaseStream();paintRecording(false);
      const type=recorder.mimeType||mime||"audio/webm",blob=new Blob(chunks,{type});chunks=[];
      if(blob.size<MIN_RECORDING_BYTES)return App.showAlert("La grabación fue demasiado corta. Mantén el botón activo mientras hablas.");
      try{
        attachRecording(blob,type);
        recordHint.textContent="Grabación lista. Pulsa «Procesar audio» para transcribirla y traducirla.";
      }catch{
        App.showAlert("Este navegador no permite adjuntar la grabación. Sube el archivo manualmente.");
      }
    };
    // timeslice: en iOS asegura que se emitan fragmentos durante la grabación.
    recorder.start(250);startedAt=Date.now();paintRecording(true);timerId=setInterval(tick,250);
  }

  if(canRecord()){
    recorderBox.classList.remove("d-none");
    recordBtn.addEventListener("click",()=>{recorder&&recorder.state==="recording"?stopRecording():startRecording();});
    // Al pasar la pestaña a segundo plano el móvil corta el audio: se cierra la
    // grabación en vez de quedarse con una toma rota y el micrófono abierto.
    document.addEventListener("visibilitychange",()=>{if(document.hidden&&recorder?.state==="recording")stopRecording();});
    window.addEventListener("pagehide",releaseStream);
  }

  async function speak(text){
    translatedAudio.classList.add("d-none");voiceNote.classList.add("d-none");
    try{
      const blob=await App.requestAudio("/speech",{text,target_language:target.value});
      if(translatedUrl)URL.revokeObjectURL(translatedUrl);
      translatedUrl=URL.createObjectURL(blob);translatedAudio.src=translatedUrl;
      translatedAudio.classList.remove("d-none");voiceNote.classList.remove("d-none");
    }catch(error){
      const alert=document.createElement("div");alert.className="alert alert-warning mb-0";
      alert.textContent=`La transcripción y la traducción están listas, pero no fue posible generar la voz: ${error.message}`;
      speechNotice.append(alert);
    }
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();try{const file=fileInput.files[0];App.validateFile(file,["mp3","wav","m4a","webm"]);result.classList.add("d-none");showStatus("Subiendo y transcribiendo el audio...");App.setButtonLoading(submit,true,"Procesando...");const body=new FormData();body.append("file",file);body.append("source_language",source.value);body.append("target_language",target.value);const data=await App.requestJson("/audio",{method:"POST",body});transcription.textContent=data.transcription;translation.textContent=data.translation;speechNotice.replaceChildren();result.classList.remove("d-none");showStatus("Generando el audio de la traducción...");await speak(data.translation);status.classList.add("d-none");}
    catch(error){status.classList.add("d-none");App.showAlert(error.message);}finally{App.setButtonLoading(submit,false);}
  });
})();

