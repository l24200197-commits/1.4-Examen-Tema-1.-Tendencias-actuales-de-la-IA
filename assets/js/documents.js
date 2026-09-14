(() => {
  const form=document.getElementById("documentForm"),fileInput=document.getElementById("documentFile"),source=document.getElementById("documentSource"),target=document.getElementById("documentTarget"),submit=document.getElementById("documentSubmit"),status=document.getElementById("documentStatus"),result=document.getElementById("documentResult"),name=document.getElementById("documentName"),original=document.getElementById("documentOriginal"),translation=document.getElementById("documentTranslation"),download=document.getElementById("documentDownload");let last;App.keepOpposite(source,target);
  form.addEventListener("submit",async event=>{event.preventDefault();try{const file=fileInput.files[0];App.validateFile(file,["pdf","docx","txt"]);result.classList.add("d-none");status.classList.remove("d-none");status.textContent="Extrayendo y traduciendo el documento...";App.setButtonLoading(submit,true,"Traduciendo...");const body=new FormData();body.append("file",file);body.append("source_language",source.value);body.append("target_language",target.value);const data=await App.requestJson("/document",{method:"POST",body});name.textContent=data.filename;original.textContent=data.original;translation.textContent=data.translation;last={filename:data.filename,original:data.original,translation:data.translation,source:source.value,target:target.value};status.classList.add("d-none");result.classList.remove("d-none");}catch(error){status.classList.add("d-none");App.showAlert(error.message);}finally{App.setButtonLoading(submit,false);}});
  download.addEventListener("click",()=>{
    if(!last)return;
    try{
      const pdf=new App.PdfBuilder("Traducción de documento",
        `${last.filename} | ${App.languagePair(last.source,last.target)}`);
      pdf.section("Texto original",last.original);
      pdf.page().section("Traducción",last.translation);
      pdf.save(App.downloadName(last.filename));
    }catch(error){App.showAlert("No fue posible generar el PDF.");}
  });
})();

