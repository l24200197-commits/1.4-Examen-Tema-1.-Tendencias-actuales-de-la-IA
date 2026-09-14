(() => {
  const configured = document.querySelector('meta[name="api-base-url"]')?.content?.replace(/\/$/, "");
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  const API_BASE_URL = local ? "http://127.0.0.1:5001/api" : configured;
  const MAX_FILE_BYTES = 3_800_000;

  const escapeHtml = value => { const div=document.createElement("div"); div.textContent=String(value??""); return div.innerHTML; };
  function showAlert(message,type="danger"){
    const box=document.getElementById("globalAlert");
    box.innerHTML=`<div class="alert alert-${type} alert-dismissible fade show">${escapeHtml(message)}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    box.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function setButtonLoading(button,loading,text){
    if(loading){button.dataset.original=button.innerHTML;button.disabled=true;button.innerHTML=`<span class="spinner-border spinner-border-sm me-2"></span>${escapeHtml(text)}`;}
    else{button.disabled=false;button.innerHTML=button.dataset.original;}
  }
  async function errorMessage(response){
    try{return (await response.json()).message||"La solicitud no pudo completarse.";}catch{return response.status===413?"El archivo excede el límite permitido.":"Respuesta inesperada del servidor.";}
  }
  async function requestJson(endpoint,options={}){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),120000);
    try{
      const response=await fetch(`${API_BASE_URL}${endpoint}`,{...options,signal:controller.signal});
      if(!response.ok)throw new Error(await errorMessage(response));
      return await response.json();
    }catch(error){
      if(error.name==="AbortError")throw new Error("La solicitud tardó demasiado tiempo.");
      if(error instanceof TypeError)throw new Error("No fue posible conectar con el backend.");
      throw error;
    }finally{clearTimeout(timer);}
  }
  async function requestAudio(endpoint,body){
    const response=await fetch(`${API_BASE_URL}${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!response.ok)throw new Error(await errorMessage(response));
    return response.blob();
  }
  function validateFile(file,extensions){
    if(!file)throw new Error("Selecciona un archivo.");
    if(file.size>MAX_FILE_BYTES)throw new Error("El archivo excede el límite de 3.8 MB.");
    const extension=file.name.split(".").pop().toLowerCase();
    if(!extensions.includes(extension))throw new Error(`Formato no permitido. Usa: ${extensions.join(", ")}.`);
  }
  const oppositeLanguage=language=>language==="es"?"en":"es";
  function keepOpposite(source,target){
    target.value=oppositeLanguage(source.value);
    source.addEventListener("change",()=>target.value=oppositeLanguage(source.value));
    target.addEventListener("change",()=>source.value=oppositeLanguage(target.value));
  }
  window.App={showAlert,setButtonLoading,requestJson,requestAudio,validateFile,oppositeLanguage,keepOpposite};

  const form=document.getElementById("textForm"),original=document.getElementById("originalText"),translated=document.getElementById("translatedText"),source=document.getElementById("textSource"),target=document.getElementById("textTarget"),submit=document.getElementById("textSubmit"),swap=document.getElementById("textSwap"),counter=document.getElementById("textCounter");
  keepOpposite(source,target);
  original.addEventListener("input",()=>counter.textContent=`${original.value.length} / 10,000 caracteres`);
  swap.addEventListener("click",()=>{[source.value,target.value]=[target.value,source.value];[original.value,translated.value]=[translated.value,original.value];counter.textContent=`${original.value.length} / 10,000 caracteres`;});
  form.addEventListener("submit",async event=>{
    event.preventDefault();if(!original.value.trim())return showAlert("Escribe un texto antes de traducir.");setButtonLoading(submit,true,"Traduciendo...");
    try{const data=await requestJson("/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:original.value,source_language:source.value,target_language:target.value})});translated.value=data.translation;}
    catch(error){showAlert(error.message);}finally{setButtonLoading(submit,false);}
  });
})();

