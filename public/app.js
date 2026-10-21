const form=document.querySelector('#bar'),input=document.querySelector('#url'),view=document.querySelector('#view'),status=document.querySelector('#status');
function openPage(){let value=input.value.trim();if(!/^https:\/\//i.test(value))value='https://'+value;input.value=value;status.textContent='Loading...';view.src='/api/proxy?url='+encodeURIComponent(value);}
form.addEventListener('submit',e=>{e.preventDefault();openPage()});view.addEventListener('load',()=>status.textContent='Loaded through the safe proxy');
