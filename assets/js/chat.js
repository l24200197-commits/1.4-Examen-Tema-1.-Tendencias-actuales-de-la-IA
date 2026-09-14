(() => {
  const form=document.getElementById("chatForm"),box=document.getElementById("chatMessages"),speaker=document.getElementById("chatSpeaker"),source=document.getElementById("chatSource"),input=document.getElementById("chatMessage"),submit=document.getElementById("chatSubmit"),clear=document.getElementById("clearChat");
  let conversation=[];try{conversation=JSON.parse(sessionStorage.getItem("bilingualConversation")||"[]");if(!Array.isArray(conversation))conversation=[];}catch{conversation=[];}
  const element=(className,text)=>{const node=document.createElement("div");node.className=className;node.textContent=text;return node;};
  function render(){
    box.replaceChildren();if(!conversation.length){const empty=element("empty-state","");empty.append(element("bi bi-chat-square-text",""),element("","La conversación aparecerá aquí."));box.append(empty);return;}
    conversation.forEach(message=>{const article=document.createElement("article");article.className=message.source_language==="en"?"chat-message english":"chat-message";article.append(element("chat-speaker",`${message.speaker} · ${message.source_language==="es"?"Español":"English"}`),element("chat-label","Original"),element("",message.original),element("chat-label","Traducción"),element("",message.translation));box.append(article);});box.scrollTop=box.scrollHeight;
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();const message=input.value.trim(),sourceLanguage=source.value,targetLanguage=App.oppositeLanguage(sourceLanguage);if(!message)return App.showAlert("Escribe un mensaje.");App.setButtonLoading(submit,true,"Traduciendo...");
    try{const data=await App.requestJson("/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({speaker:speaker.value.trim(),message,source_language:sourceLanguage,target_language:targetLanguage,history:conversation.slice(-8)})});conversation.push(data);sessionStorage.setItem("bilingualConversation",JSON.stringify(conversation));render();input.value="";source.value=targetLanguage;input.focus();}
    catch(error){App.showAlert(error.message);}finally{App.setButtonLoading(submit,false);}
  });
  clear.addEventListener("click",()=>{conversation=[];sessionStorage.removeItem("bilingualConversation");render();});render();
})();

