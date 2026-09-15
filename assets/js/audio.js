(() => {
  const form=document.getElementById("audioForm"),fileInput=document.getElementById("audioFile"),source=document.getElementById("audioSource"),target=document.getElementById("audioTarget"),submit=document.getElementById("audioSubmit"),status=document.getElementById("audioStatus"),result=document.getElementById("audioResult"),transcription=document.getElementById("audioTranscription"),translation=document.getElementById("audioTranslation"),originalAudio=document.getElementById("originalAudio"),translatedAudio=document.getElementById("translatedAudio"),speechNotice=document.getElementById("audioSpeechNotice"),voiceNote=document.getElementById("audioVoiceNote");let originalUrl,translatedUrl;App.keepOpposite(source,target);
  const showStatus=text=>{status.classList.remove("d-none");status.innerHTML=`<span class="spinner-border spinner-border-sm me-2"></span>${text}`;};
  fileInput.addEventListener("change",()=>{if(originalUrl)URL.revokeObjectURL(originalUrl);const file=fileInput.files[0];if(!file)return originalAudio.classList.add("d-none");originalUrl=URL.createObjectURL(file);originalAudio.src=originalUrl;originalAudio.classList.remove("d-none");});
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

