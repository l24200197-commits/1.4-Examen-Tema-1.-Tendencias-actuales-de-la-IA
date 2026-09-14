(() => {
  const form=document.getElementById("imageForm"),fileInput=document.getElementById("imageFile"),source=document.getElementById("imageSource"),target=document.getElementById("imageTarget"),submit=document.getElementById("imageSubmit"),status=document.getElementById("imageStatus"),result=document.getElementById("imageResult"),previewBox=document.getElementById("imagePreviewContainer"),preview=document.getElementById("imagePreview"),detected=document.getElementById("imageDetectedText"),translation=document.getElementById("imageTranslation"),warning=document.getElementById("imageWarning"),download=document.getElementById("imageDownload");let previewUrl,last;App.keepOpposite(source,target);
  fileInput.addEventListener("change",()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const file=fileInput.files[0];if(!file)return previewBox.classList.add("d-none");previewUrl=URL.createObjectURL(file);preview.src=previewUrl;previewBox.classList.remove("d-none");});
  form.addEventListener("submit",async event=>{event.preventDefault();try{const file=fileInput.files[0];App.validateFile(file,["jpg","jpeg","png","webp"]);result.classList.add("d-none");status.classList.remove("d-none");status.textContent="Interpretando el texto visible...";App.setButtonLoading(submit,true,"Analizando...");const body=new FormData();body.append("file",file);body.append("source_language",source.value);body.append("target_language",target.value);const data=await App.requestJson("/image",{method:"POST",body});detected.textContent=data.detected_text;translation.textContent=data.translation;warning.replaceChildren();if(data.warning){const alert=document.createElement("div");alert.className="alert alert-warning";alert.textContent=data.warning;warning.append(alert);}last={file,filename:data.filename,detected:data.detected_text,translation:data.translation,source:source.value,target:target.value};status.classList.add("d-none");result.classList.remove("d-none");}catch(error){status.classList.add("d-none");App.showAlert(error.message);}finally{App.setButtonLoading(submit,false);}});
  download.addEventListener("click",async()=>{
    if(!last)return;
    App.setButtonLoading(download,true,"Generando...");
    try{
      const pdf=new App.PdfBuilder("Traducción de imagen",
        `${last.filename} | ${App.languagePair(last.source,last.target)}`);
      pdf.image(await App.toPicture(last.file));
      pdf.section("Texto identificado",last.detected);
      pdf.section("Traducción",last.translation);
      pdf.save(App.downloadName(last.filename));
    }catch(error){App.showAlert("No fue posible generar el PDF.");}
    finally{App.setButtonLoading(download,false);}
  });
})();
