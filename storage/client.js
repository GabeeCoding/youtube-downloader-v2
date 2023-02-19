function initDownload(url, format, callback){
	//send a request to the server
	//server recieves it
	//gives us back a URL
	//lets just say otherwise we can send it through
	let headers = new Headers()
	headers.set("format", format)
	headers.set("url", url)
	fetch(`${window.location.origin}/video`, {
		headers: headers
	}).then((r) => {
		//got the response
		r.json().then(body=>{
			if(r.ok){
				//ok
				callback(body.id)
			} else {
				let msg = body.message || "No message provided";
				callback(null, msg);
			}
		}).catch(err => alert(`Failed to parse JSON`));
	})
	//.catch((r) => alert(`Failed to connect to server: ${r}`));
}

function getJson(key){
	return JSON.parse(localStorage.getItem(key)) || null
}

function setJson(key, value){
	localStorage.setItem(key, JSON.stringify(value));
}

function now(){
	return (Date.now() / 1000).toFixed(0)
}