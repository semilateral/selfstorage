(()=>{"use strict";class t{constructor(t,{currentDirectory:e=".",parentDirectory:r="..",separator:i="/"}={}){if(this._currentDirectory=`${e}`,this._parentDirectory=`${r}`,this._separator=`${i}`,1!=this._separator.length)throw new Error("FilePath separator must be a single character");const a=`${t}`,s=a.split(this._separator).filter((t=>t&&t!=this._currentDirectory));for(let t=1;t<s.length;++t)t&&s[t]==this._parentDirectory&&s[t-1]!=this._parentDirectory&&(s.splice(t-1,2),t-=2);const o=this._isAbsolute(a);if(o){const t=s.findIndex((t=>t!=this._parentDirectory));s.splice(0,-1==t?s.length:t)}this._path=`${o?this._separator:""}${s.join(this._separator)}`,this._basenameStart=this._path.length-(s[s.length-1]||"").length}get basename(){return this._path.substring(this._basenameStart,this._path.length)||this._path}get currentDirectory(){return this._currentDirectory}get dirname(){return this._path.substring(0,this._basenameStart-1)||(this.isAbsolute?this._separator:this._currentDirectory)}get isAbsolute(){return this._isAbsolute()}get length(){return this._path.length}get parentDirectory(){return this._parentDirectory}get separator(){return this._separator}equals(t){return`${this}`==`${t}`}join(...t){t.unshift(this),t.forEach(((e,r)=>t[r]=`${e}`));let e=t.length;for(;--e&&!this._isAbsolute(t[e]););return new this.constructor(t.splice(e).join(this._separator),this)}toString(){return this._path}_isAbsolute(t=this._path){return t[0]==this._separator}}class e extends Error{constructor(t,...e){super(`No such file or directory: ${t}`,...e),this.path=t}}class r extends Error{constructor(t,...e){super(`Not a directory: ${t}`,...e),this.path=t}}class i extends Error{constructor(t,...e){super(`Not a file: ${t}`,...e),this.path=t}}class a extends class{static error(t){return new Error(`${this.name} -- ${t}`)}async authenticate(){}async copy(t,e){await this.isDirectory(t)?(await this.makeDirectory(e),await Promise.all((await this.list(t)).map((async r=>await this.copy(t.join(r),e.join(r)))))):await this.writeFile(e,await this.readFile(t))}async delete(t){let r;try{r=await this.isDirectory(t)}catch(t){if(t instanceof e)return;throw t}r?(await Promise.all((await this.list(t)).map((async e=>await this.delete(t.join(e))))),"/"!=t&&await this._deleteDirectoryUnsafe(t)):await this._deleteFileUnsafe(t)}async isDirectory(t){if(await this.exists(t))return await this._isDirectoryUnsafe(t);throw new e(t)}async list(t){if(await this.isDirectory(t))return(await this._listUnsafe(t)).sort();throw new r(t)}async makeDirectory(r){let i=!1,a=!1;try{a=await this.isDirectory(r),i=!a}catch(t){if(!(t instanceof e))throw t}if(i&&await this._deleteFileUnsafe(r),!a){const e=new t(r.dirname);e.equals(r)||await this.exists(e)||await this.makeDirectory(e),await this._makeDirectoryUnsafe(r)}}async makeFile(t){try{if(!await this.isDirectory(t))return}catch(t){if(!(t instanceof e))throw t}await this.writeFile(t,"")}async move(t,e){await this.copy(t,e),await this.delete(t)}async readFile(t){if(await this.isDirectory(t))throw new i(t);return await this._readFileUnsafe(t)}async writeFile(e,r){await this.delete(e),await this.makeDirectory(new t(e.dirname)),await this._writeFileUnsafe(e,r)}async _deleteDirectoryUnsafe(t){await this._deleteFileUnsafe(t)}}{static get maxUploadChunkSize(){return 5242880}static get hostName(){return"Google Drive"}static get uploadChunkFactor(){return 262144}static get _folderMimeType(){return"application/vnd.google-apps.folder"}static get _maxQueryPageSize(){return 1e3}static get _rootFileId(){return"root"}static uploadChunkSizeIsValid(t){return"number"==typeof t&&t>0&&t<=this.maxUploadChunkSize&&t%this.uploadChunkFactor==0}static _parseByteRange(t){if(!t||!/^bytes=\d+-\d+$/.test(t))throw this.constructor.error("Error parsing byte range: Range missing or invalid");const[e,r]=t.match(/\d+/g).map((t=>window.parseInt(t)));if(!(e<=r))throw this.constructor.error(`Error parsing byte range: Invalid range ${e}-${r}`);return[e,r]}constructor(t,e,{authCheckPeriod:r=200,maxUploadAttempts:i=3,uploadChunkSize:s=a.maxUploadChunkSize}={}){super(),this.authCheckPeriod=r,this.maxUploadAttempts=i,this.uploadChunkSize=s,this._clientId=t,this._authRedirectUri=e,this._accessTokenPromise=new Promise((t=>this._resolveAccessToken=t))}get uploadChunkSize(){return this._uploadChunkSize}set uploadChunkSize(t){if(!this.constructor.uploadChunkSizeIsValid(t))throw this.constructor.error(`Invalid upload chunk size: ${t}`);this._uploadChunkSize=t}async authenticate(){this._clearAuthInterval(),this._authWindow=window.open(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${this._clientId}&redirect_uri=${this._authRedirectUri}&response_type=token&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file`),this._authInterval=window.setInterval((()=>this._checkAuthWindow()),this.authCheckPeriod),await new Promise(((t,e)=>{this._resolveAuth=t,this._rejectAuth=e}))}async _deleteFileUnsafe(t){const e=await this._accessTokenPromise,r=await this._idForPath(t),i=await fetch(`https://www.googleapis.com/drive/v3/files/${r}`,{headers:{Authorization:`Bearer ${e}`},method:"DELETE"});if(!i.ok)throw this.constructor.error(`Error deleting '${t}': Response status ${i.status}`)}async _isDirectoryUnsafe(t){const e=t.join(".."),r=t.basename,i=await this._idForPath(e);try{const[t]=await this._queryFiles({name:r,parentId:i},{fields:["mimeType"],limit:1});return t.mimeType==this.constructor._folderMimeType}catch(e){throw this.constructor.error(`Error getting MIME type for path '${t}': ${e.message}`)}}_checkAuthWindow(){if(!this._authWindow||this._authWindow.closed)this._clearAuthInterval();else{let t;try{if(!this._authWindow.location.href.startsWith(`${this._authRedirectUri}#`))return;t=new URLSearchParams(this._authWindow.location.hash.substring(1))}catch{return}const e=t.get("access_token");e?(this._resolveAccessToken(e),this._clearAuthInterval()):this._clearAuthInterval(this.constructor.error(`No access token in redirect URI "${this._authWindow.location.href}"`))}}_clearAuthInterval(t=null){this._authInterval&&(window.clearInterval(this._authInterval),this._authInterval=null,this._authWindow&&this._authWindow.close(),t?this._rejectAuth(t):this._resolveAuth())}async _idForPath(t){if(!t||"/"==t)return this.constructor._rootFileId;const[e,r]=Path.split(t),i=await this._idForPath(e);try{const[t]=await this._queryFiles({name:r,parentId:i},{fields:["id"],limit:1});return(t||{}).id||null}catch(e){throw this.constructor.error(`Error getting ID for path '${t}': ${e.message}`)}}async _initiateUpload(t){const e=await this._accessTokenPromise,[r,i]=Path.split(t),a=await this._idForPath(r),s=JSON.stringify({name:i,...a?{parents:[a]}:{}}),o=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",{body:s,headers:{Authorization:`Bearer ${e}`,"Content-Length":new Blob([s]).size,"Content-Type":"application/json; charset=UTF-8"},method:"POST"});if(!o.ok)throw this.constructor.error(`Error initiating resumable upload: Response status ${o.status}`);const n=o.headers.get("Location");if(!n)throw this.constructor.error("Error initiating resumable upload: No upload URL in response");return n}async _listUnsafe(t){const e=await this._idForPath(t);try{return(await this._queryFiles({parentId:e},{fields:["name"]})).map((t=>t.name))}catch(e){throw this.constructor.error(`Error listing files in path '${t}': ${e.message}`)}}async _makeDirectoryUnsafe(t){const e=await this._accessTokenPromise,r=t.join(".."),i=t.basename,a=await this._idForPath(r),s=JSON.stringify({mimeType:this.constructor._folderMimeType,name:i,...a?{parents:[a]}:{}}),o=await fetch("https://www.googleapis.com/drive/v3/files",{body:s,headers:{Authorization:`Bearer ${e}`,"Content-Length":new Blob([s]).size,"Content-Type":"application/json; charset=UTF-8"},method:"POST"});if(!o.ok)throw this.constructor.error(`Error creating directory '${t}': Response status ${o.status}`)}async _queryFiles({name:t=null,parentId:e=null,trashed:r=!1},{fields:i=["id","mimeType","name"],limit:a=1/0}){const s=await this._accessTokenPromise,o=[];null!=t&&o.push(`name+=+'${encodeURIComponent(t)}'`),null!=e&&o.push(`'${e}'+in+parents`),r||o.push("trashed+=+false");const n=await fetch(`https://www.googleapis.com/drive/v3/files?q=${o.join("+and+")}&fields=files(${i.join(",")})&pageSize=${Math.min(a,this.constructor._maxQueryPageSize)}`,{headers:{Authorization:`Bearer ${s}`},method:"GET"});if(!n.ok)throw this.constructor.error(`Error getting file metadata: Response status ${n.status}`);try{return(await n.json()).files||[]}catch(t){throw this.constructor.error(`Error parsing file metadata response: ${t.message}`)}}async _readFileUnsafe(t){const e=await this._accessTokenPromise,r=await this._idForPath(t),i=await fetch(`https://www.googleapis.com/drive/v3/files/${r}?alt=media`,{headers:{Authorization:`Bearer ${e}`},method:"GET"});if(!i.ok)throw this.constructor.error(`Error reading file '${t}': Response status ${i.status}`);try{return await i.text()}catch(e){throw this.constructor.error(`Error reading file '${t}': ${e.message}`)}}async _resumableUpload(t,e,r=0){const i=this.uploadChunkSize;for(let a=r;a<e.byteLength;){const r=await this._uploadChunk(t,e,a,i);if(r.ok)break;if(308!=r.status)throw this.constructor.error(`Error during resumable upload: Response status ${r.status}`);{const t=r.headers.get("Range");a=this.constructor._parseByteRange(t)[1]+1}}}async _resumeIncompleteUpload(t,e,r){const i=await this._accessTokenPromise,a=await fetch(e,{headers:{Authorization:`Bearer ${i}`,"Content-Range":`bytes */${r.byteLength}`},method:"PUT"});if(308==a.status){const t=a.headers.get("Range"),i=this.constructor._parseByteRange(t)[1];return await this._resumableUpload(e,r,i+1)}if(!a.ok){const e=await this._initiateUpload(t);return await this._resumableUpload(e,r)}}async _uploadChunk(t,e,r,i){const a=await this._accessTokenPromise,s=Math.min(r+i,e.byteLength)-1;return await fetch(t,{body:e.slice(r,s+1),headers:{Authorization:`Bearer ${a}`,"Content-Length":e.byteLength,"Content-Range":`bytes ${r}-${s}/${e.byteLength}`},method:"PUT"})}async _writeFileUnsafe(t,e){const[r,i]=await Promise.all([this._initiateUpload(t),new Blob([e]).arrayBuffer()]),a=[];try{return void await this._resumableUpload(r,i)}catch(t){a.push(t)}for(let e=1;e<this.maxUploadAttempts;e++)try{return void await this._resumeIncompleteUpload(t,r,i)}catch(t){a.push(t)}throw this.constructor.error(`Error uploading file: Too many failed upload attempts\nUploads failed with the following errors:\n${a.join("\n")}`)}}const s=document.getElementById("filename"),o=document.getElementById("filecontent"),n=document.getElementById("readfile"),h=document.getElementById("writefile"),c=document.getElementById("deletefile"),l=new a("TODO","https://semilateral.github.io/selfstorage/google-authenticated.html",{uploadChunkSize:262144}),u=new class{constructor(t){this.host=t}async delete(t){return await this.host.delete(t)}async readFile(t){return await this.host.readFile(t)}async writeFile(t,e){return await this.host.writeFile(t,e)}}(l);function d(t){for(const e of[s,o,n,h,c])e.disabled=!t}async function p(t,e=(t=>{})){d(!1);try{await t()}catch(t){throw e(t),d(!0),t}d(!0)}n.addEventListener("click",(()=>p((async()=>o.value=await u.readFile(s.value)),(()=>o.value="")))),h.addEventListener("click",(()=>p((async()=>await u.writeFile(s.value,o.value))))),c.addEventListener("click",(()=>p((async()=>await u.delete(s.value))))),window.fileHost=l,setTimeout((()=>l.authenticate()),2e3)})();