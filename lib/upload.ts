export type UploadPhase={stage:'preparing'|'uploading'|'reading';percent:number|null};

// Fetch does not expose upload byte progress. XHR reports real bytes transferred.
export function uploadReceipt<T>(body:unknown,signal:AbortSignal,onProgress:(phase:UploadPhase)=>void):Promise<T>{
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    const abort=()=>xhr.abort();
    const cleanup=()=>signal.removeEventListener('abort',abort);
    xhr.open('POST','/api/scan');xhr.setRequestHeader('Content-Type','application/json');xhr.timeout=90000;
    xhr.upload.onprogress=event=>onProgress({stage:'uploading',percent:event.lengthComputable?Math.round(event.loaded/event.total*100):null});
    xhr.upload.onload=()=>onProgress({stage:'reading',percent:null});
    xhr.onload=()=>{cleanup();try{const data=JSON.parse(xhr.responseText);if(xhr.status<200||xhr.status>=300)throw new Error(data.error||'Receipt scanning failed. Please try again.');resolve(data);}catch(error){reject(error instanceof SyntaxError?new Error('Receipt scanning returned an unreadable response. Please try again.'):error);}};
    xhr.onerror=()=>{cleanup();reject(new Error('The upload lost its connection. Check your connection and try again.'));};
    xhr.ontimeout=()=>{cleanup();reject(new Error('Receipt scanning timed out. Try again or enter the items manually.'));};
    xhr.onabort=()=>{cleanup();reject(new DOMException('Upload cancelled','AbortError'));};
    if(signal.aborted){reject(new DOMException('Upload cancelled','AbortError'));return;}
    signal.addEventListener('abort',abort,{once:true});onProgress({stage:'uploading',percent:0});xhr.send(JSON.stringify(body));
  });
}
