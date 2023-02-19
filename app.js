const fs = require("fs")
const ytdl = require("ytdl-core")
const express = require("express");
const { randomUUID } = require("crypto");
const cp = require("child_process")
const ffmpeg = require("ffmpeg-static");
require("dotenv").config()

const app = express();

app.use((req, resp, next) => {
	resp.header("Access-Control-Allow-Origin", "*")
	resp.header("Access-Control-Allow-Headers", "*")
	if (req.method === 'OPTIONS') {
		return resp.sendStatus(200);
	} else {
		return next();
	}
})

function AreHeadersValid(headers) {
	let valid = true
	headers.forEach((header) => {
		if (header === undefined) {
			valid = false
		}
	})
	return valid
}

function getStream(url, options) {
	let stream
	try {
		stream = ytdl(url, options);
	} catch (err) {
		console.log("Failed to download video: ")
		console.log(err)
	}
	return stream
}

let videos = [
	{
		id: "x",
		title: "video title",
		status: "waiting",
		progressPercent: 0,
		url: "",
		youtubeUrl: "",
		ready: false,
		error: false,
		format: "mp4",
	}
]

app.get("/info", (req, resp) => {
	//the only time this info request will not send back ok is when:
	//missing id
	//couldn't find video
	let id = req.headers.id
	if(!id){
		resp.sendStatus(400).end();
		return
	}
	let video = videos.find(video => video.id === id);
	if(video === undefined){
		resp.sendStatus(404).end()
		return
	}
	resp.json(video);
})

app.get("/video", async (req, resp) => {
	let headers = req.headers
	let url = headers.url
	let format = headers.format
	if (AreHeadersValid([url, format]) === false) {
		resp.status(400).json({ message: "Missing headers" });
		return
	}

	//check if the same video was already downloaded
	let sameVideo = videos.find(video => video.youtubeUrl === url && video.format === format);
	if(sameVideo){
		return resp.json({id: sameVideo.id});
	}

	let videoDetails
	try {
		videoDetails = (await ytdl.getInfo(url)).videoDetails
	} catch (e) {
		resp.status(400).json({ message: "Invalid video url, failed" }).end()
		return
	}
	if(videoDetails.isLiveContent){
		return resp.status(400).json({message: "Cannot download livestreams"}).end();
	}
	let title = videoDetails.title;
	let fileName = randomUUID();
	
	//video id
	if(format === "mp4"){
		let stream = getStream(url, {quality: 18});
		if (stream === undefined) {
			//stream failed
			resp.status(500).json({ message: "Failed to download video" });
			return
		}
		//its working
		let video = videos[videos.push({
			id: fileName,
			progressPercent: 0,
			ready: false,
			title: title,
			url: `/temp/${fileName}.mp4`,
			youtubeUrl: url,
			error: false,
			format: format,
			status: "Downloading video...",
		}) - 1]
		console.log(`Id is ${video.id}`);
		stream.pipe(fs.createWriteStream(`./storage/temp/${fileName}.mp4`));
		let len
		let downloaded = 0;
		stream.on("response", (resp) => {
			len = parseInt(resp.headers["content-length"], 10)
		})
		stream.on("data", (data) => {
			downloaded += data.length;
			if(len){
				let progress = downloaded / len;
				let percent = progress.toFixed(2) * 100;
				video.progressPercent = percent;
			} else {
				video.progressPercent = 0;
			}
		})
		stream.on("finish", () => {
			//finished downloading video
			video.progressPercent = 100;
			video.ready = true;
			video.status = "Ready";
		})
		stream.on("error", err => {
			console.log(err);
			video.error = true;
			video.status = "Error while downloading"
		})
		resp.json({ id: video.id });
	} else {
		let videoPath = `./storage/temp/${fileName}.mp4`
		let audioPath = `./storage/temp/${fileName}.mp3`
		let stream = getStream(url, { quality: 'highestaudio' });
		if (stream === undefined) {
			//stream failed
			resp.status(500).json({ message: "Failed to download video" });
			return
		}
		//its working
		let video = videos[videos.push({
			id: fileName,
			progressPercent: 0,
			ready: false,
			title: title,
			url: `/temp/${fileName}.mp3`,
			youtubeUrl: url,
			error: false,
			format: format,
			status: "Downloading..."
		}) - 1]
		stream.pipe(fs.createWriteStream(videoPath));
		let len
		let downloaded = 0;
		stream.on("response", (resp) => {
			len = parseInt(resp.headers["content-length"], 10)
		})
		stream.on("data", (data) => {
			downloaded += data.length;
			if(len){
				let progress = downloaded / len;
				let percent = progress.toFixed(2) * 100;
				video.progressPercent = (percent / 2).toFixed(0);
			} else {
				video.progressPercent = 0;
			}
		})
		stream.on("finish", () => {
			//finished downloading video
			video.progressPercent = 50;
			video.status = "Converting video to audio..."
			//video.ready = true;
			//convert to mp3
			//cp.execSync(`${ffmpeg} -loglevel 24 -i ${videoPath} -vn -sn -c:a mp3 ${audioPath}`);
			cp.exec(`${ffmpeg} -loglevel 24 -i ${videoPath} -vn -sn -c:a mp3 ${audioPath}`, (err, stdout, stderr) => {
				if(err){
					console.log("ffmpeg error!")
					console.log(err);
					return
				}
			}).once("exit", (code, signal) => {
				if(code){
					if(code !== 0){
						//not clean
						video.error = true;
						return
					}
				}
				//clean
				fs.rmSync(videoPath);
				video.ready = true;
				video.progressPercent = 100;
				video.status = "Ready"
			});
		})
		stream.on("error", err => {
			console.log(err);
			video.error = true;
			video.status = "Error while downloading";
		})
		resp.json({ id: video.id });
	}
})

//clear temp storage
fs.readdirSync(__dirname + "/storage/temp", { withFileTypes: true })
	.forEach((ent) => {
		let n = ent.name
		if (n === ".gitkeep") {
			return
		}
		console.log(`Removing ${n.split(".")[1]} file`)
		fs.rm(`./storage/temp/${ent.name}`, () => { });
	})

app.use(express.static("./storage"));

const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Listening on port ${port} (http://localhost:${port}) (http://${Object.values(require('os').networkInterfaces()).reduce((r, list) => r.concat(list.reduce((rr, i) => rr.concat(i.family === 'IPv4' && !i.internal && i.address || []), [])), [])}:${port})`)
});
