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

let hasHtmlExt = window.location.pathname.endsWith(".html")

function goToPage(page){
	let pathname = window.location.pathname
    let url = window.location.origin + pathname
	if(hasHtmlExt){
        //if it has the html extensino
        //split it
        let spl = pathname.split("/")
        let doc = spl[spl.length - 1]
        let split = pathname.split(doc)
        split.pop()
        url = split.join("/") + page
    } else {
        //it doesnt
        if(pathname.endsWith("/")){
            //ends with /
            url += page
        } else {
            url = url + "/" + page
        }
    }
    window.location = url
	//return url
}
