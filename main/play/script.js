// document.addEventListener("keypress", (e)=>{
// 	if (e.key === "e"){
// 		const url = prompt("url?")
// 		for (var i of document.getElementsByTagName("img")) {
//         i.style.content = "url('"+url+"')"
//     }
// 	}
// })
//make chat autoscroll to bottom on new message

var canvas, ctx, flag = false,
		prevX = 0,
		currX = 0,
		prevY = 0,
		currY = 0,
		dot_flag = false;
var canDraw = false
var oldPaths = []
var points = []
var x = "black";
var w=0, h=0
var imageStrokes = []
var newStrokes = []
let strokePixels = [[], []];
const CROP_PADDING = (REPOS_PADDING = 2);
var socket
var inGame = false
var isHost = false
var choosingDrawing = false
var lastImg
var isDrawing = false
var curWord = ""

//all images belong to their respective owners
const bgUrls = ["https://www.planetware.com/wpimages/2020/02/france-in-pictures-beautiful-places-to-photograph-eiffel-tower.jpg","https://upload.wikimedia.org/wikipedia/en/1/1c/Rick_Astley_-_Whenever_You_Need_Somebody.png","https://i1.sndcdn.com/artworks-5Mg995iK0AdZ-0-t500x500.jpg","https://www.mytwintiers.com/wp-content/uploads/sites/89/2023/07/64ba03a6a163a2.12128738.jpeg?strip=1", "https://i1.sndcdn.com/artworks-44d3MSjTemoAnmeI-cnwmOA-t500x500.jpg","https://i1.sndcdn.com/artworks-ABqRkLGFhb44FZDv-szLf5Q-t500x500.jpg","https://c418.org/wp-content/uploads/2016/05/a3390257927_10.jpg","https://i.scdn.co/image/ab67616d0000b2732d8b1ba2af5670ae17f81a4c","https://i1.sndcdn.com/artworks-zOl3IY4D6JBQ-0-t500x500.jpg","https://images.genius.com/7e102407f54d49cb905a90596bd21a9b.1000x1000x1.png","https://images.genius.com/35fae8a4af0ddb9fb35910519aa6b013.1000x1000x1.png","https://m.media-amazon.com/images/I/41BFGrF4D-L._UXNaN_FMjpg_QL85_.jpg","https://imgproxy.mapia.io/v3/c-RHEuz4Zu_KP_YxLKIu1AUU6Rkymupe/g:ce/rs:fit:967:1395:true/aHR0cHM6Ly9tZnMu/cGQubWFwaWEuaW8v/cHVibGljL2ZpbGUv/NGNhMDM3NjBiZWFk/MGE5OTg4ZjBkMTFk/YzUyNDUxNWYvZG93/bmxvYWQ_U2Vydmlj/ZS1Qcm92aWRlcj1t/bXM.jpg","https://i.ytimg.com/vi/DVOmxLxmXuY/maxresdefault.jpg","https://i.scdn.co/image/ab67616d00001e0201ae86544e79c99698c43842","https://i1.sndcdn.com/artworks-eCZb1jvsZHkvGz15-3LNfRg-t500x500.jpg","https://meteamedia.org/wp-content/uploads/2023/10/In-and-Out-of-Our-Walls-2-1200x675.jpg"]

preloadImages()

async function preloadImages(){
	for (let i of bgUrls){
		var img=new Image();
		img.src=i;
	}
}

const loadModel = async () => {
		model = await tflite.loadTFLiteModel("../content/Mairker.tflite");
		model.predict(tf.zeros([1, 28, 28, 1])); // warmup

		console.log(`AI Model loaded! (${LABELS.length} classes)`);
};

window.onload = () => {
	socket = io()
	setUpSocketEvents()
	requestTotalRoomUpdate()
	setInterval(requestTotalRoomUpdate, 5000)
	loadModel();
	document.documentElement.style.setProperty('--bgImg', "url("+bgUrls[Math.floor(Math.random()*bgUrls.length)])+")";
	document.documentElement.style.setProperty('--randRot', Math.floor(Math.random()*361)+"deg");
		canvas = document.getElementById('drawCanvas');
		ctx = canvas.getContext("2d");
	resizeCanvas()
		w = canvas.width;
		h = canvas.height;
		canvas.addEventListener("mousemove", function (e) {
				findxy('move', e)
		}, false);
		canvas.addEventListener("mousedown", function (e) {
				findxy('down', e)
		}, false);
		canvas.addEventListener("mouseup", function (e) {
			if (strokePixels[0].length) {
					imageStrokes.push(strokePixels);
					strokePixels = [[], []];
			}
				findxy('up', e)
		}, false);
		canvas.addEventListener("mouseout", function (e) {
				findxy('out', e)
		}, false);
	document.getElementById("chatInput").addEventListener("keyup", (e)=>{
		if (e.key=="Enter"){
			sendChat()
		}
	})
}

//drawing stuff
//fires every resize
function resizeCanvas(){
	try {
		canvas.width = document.getElementById("canvasDisp").clientWidth - 12
		canvas.height = document.getElementById("canvasDisp").clientHeight - 12
		w = canvas.width;
		h = canvas.height;
		document.querySelector(':root').style.setProperty('--iHeight', 
																											document.getElementById("customColor").offsetWidth+"px");
		redrawPaths()
		if (lastImg){
			let img = new Image
			img.onload = () =>{
				document.getElementById("drawCanvas").getContext("2d").drawImage(img,0,0)
			}
			img.src = lastImg
		}
	} catch (e){}
}

function updateStroke(self){
	document.getElementById("strokeDisp").innerText = self.value+ " px"
}

function color(obj) {
		x = obj.style.backgroundColor
}

function ccolor(a){
	x = a.value
}

function draw() {
		ctx.beginPath();
	ctx.strokeStyle = x;
		ctx.lineWidth = document.getElementById("stroke").value;
	ctx.lineCap = "round";
		ctx.moveTo(prevX, prevY);
		ctx.lineTo(currX, currY);
		ctx.stroke();
		ctx.closePath();
}

function undo(){
	oldPaths.pop()
	try {
		imageStrokes.pop()
		strokePixels = [[],[]]
	} catch (e) {
		console.log(e)
	}
	redrawPaths()
}

function erase(dontdelete = false) {
	if (!dontdelete){
		oldPaths = []
		imageStrokes = []
		let strokePixels = [[], []];
		lastImg = null
	}
	ctx.clearRect(0, 0, w, h);
}

function save() {
		document.getElementById("canvasimg").style.border = "2px solid";
		var dataURL = canvas.toDataURL();
		document.getElementById("canvasimg").src = dataURL;
		document.getElementById("canvasimg").style.display = "inline";
}

function findxy(res, e) {
		if (res == 'down' && canDraw) {
				prevX = currX;
				prevY = currY;
				currX = e.clientX - canvas.getBoundingClientRect().left;
				currY = e.clientY - canvas.getBoundingClientRect().top;
			mouse = oMousePos(canvas, e);
				points = [];
				points.push({x:mouse.x,y:mouse.y})
				flag = true;
				dot_flag = true;
				if (dot_flag) {
						ctx.beginPath();
					ctx.strokeStyle = x;
						ctx.lineWidth = document.getElementById("stroke").value;
					ctx.lineCap = "round";
					ctx.moveTo(currX, currY);
					ctx.lineTo(currX, currY);
					ctx.stroke();
						ctx.closePath();
						dot_flag = false;
				}
		}
		if (res == 'up' || res == "out") {
			if (flag){
				oldPaths.push([points, x, document.getElementById("stroke").value]);
				predict()
			}
			flag = false;
		}
		if (res == 'move' && canDraw) {
				if (flag) {
						prevX = currX;
						prevY = currY;
						currX = e.clientX - canvas.getBoundingClientRect().left;
						currY = e.clientY - canvas.getBoundingClientRect().top;
					mouse = oMousePos(canvas, e);
					points.push({x:currX,y:currY})
					strokePixels[0].push(Math.floor(currX));
					strokePixels[1].push(Math.floor(currY));
						draw();
					socket.emit("canvasImg", document.getElementById("drawCanvas").toDataURL())
				}
		}
}

function oMousePos(canvas, evt) {
	var ClientRect = canvas.getBoundingClientRect();
	return { //objeto
	x: Math.round(evt.clientX - ClientRect.left),
	y: Math.round(evt.clientY - ClientRect.top)
}
}

function redrawPaths(){
	// delete everything
	erase(true)
	// draw all the paths in the paths array
	oldPaths.forEach(path=>{
	ctx.beginPath();
	ctx.moveTo(path[0][0].x,path[0][0].y);
	for(let i = 0; i < path[0].length; i++){
		ctx.strokeStyle = path[1];
		ctx.lineWidth = path[2];
		ctx.lineCap = "round";
		//ctx.moveTo(path[0][i-1].x,path[0][i-1].y);
		ctx.lineTo(path[0][i].x,path[0][i].y);
	}
		ctx.stroke();
		ctx.closePath();
	})
}

//ai stuff
const preprocess = async (cb) => {
		const {min, max} = getBoundingBox();
		// Resize to 28x28 pixel & crop
		const imageBlob = await fetch("../transform", {
				method: "POST",
				headers: {
						"Content-Type": "application/json",
				},
				redirect: "follow",
				referrerPolicy: "no-referrer",
				body: JSON.stringify({
						strokes: newStrokes,
						box: [min.x, min.y, max.x, max.y],
				}),
		}).then((response) => response.blob());
		const img = new Image(28, 28);
	img.src = URL.createObjectURL(imageBlob);
		img.onload = () => {
				const tensor = tf.tidy(() =>
						tf.browser.fromPixels(img, 1).toFloat().expandDims(0)
				);
				cb(tensor);
		};
};

const predict = async () => {
		if (!imageStrokes.length) return;
		if (!LABELS.length) throw new Error("No labels found!");

		preprocess((tensor) => {
				const predictions = model.predict(tensor).dataSync();

				const top3 = Array.from(predictions)
						.map((p, i) => ({
								probability: p,
								className: LABELS[i],
								index: i,
						}))
						.sort((a, b) => b.probability - a.probability)
						.slice(0, 3);
			socket.emit("aiPrediction", top3)
		});
};

const getBoundingBox = () => {
		repositionImage();

		const coords_x = [];
		const coords_y = [];

		for (const stroke of newStrokes) {
				for (let i = 0; i < stroke[0].length; i++) {
						coords_x.push(stroke[0][i]);
						coords_y.push(stroke[1][i]);
				}
		}

		const x_min = Math.min(...coords_x);
		const x_max = Math.max(...coords_x);
		const y_min = Math.min(...coords_y);
		const y_max = Math.max(...coords_y);

		// New width & height of cropped image
		const width = Math.max(...coords_x) - Math.min(...coords_x);
		const height = Math.max(...coords_y) - Math.min(...coords_y);

		const coords_min = {
				x: Math.max(0, x_min - CROP_PADDING), // Link Kante anlegen
				y: Math.max(0, y_min - CROP_PADDING), // Obere Kante anlegen
		};
		let coords_max;

		if (width > height)
				// Left + right edge as boundary
				coords_max = {
						x: Math.min(w, x_max + CROP_PADDING), // Right edge
						y: Math.max(0, y_min + CROP_PADDING) + width, // Lower edge
				};
		// Upper + lower edge as boundary
		else
				coords_max = {
						x: Math.max(0, x_min + CROP_PADDING) + height, // Right edge
						y: Math.min(h, y_max + CROP_PADDING), // Lower edge
				};
		return {
				min: coords_min,
				max: coords_max,
		};
	//return {min: {x:0,y:0},max: {x:332,y:332}}
};

const repositionImage = () => {
	let a = JSON.parse(JSON.stringify(imageStrokes))
		const [min_x, min_y] = getMinimumCoordinates();
		for (const stroke of a) {
				for (let i = 0; i < stroke[0].length; i++) {
						stroke[0][i] = stroke[0][i] - min_x + REPOS_PADDING;
						stroke[1][i] = stroke[1][i] - min_y + REPOS_PADDING;
				}
		}
	newStrokes = a
};

const getMinimumCoordinates = () => {
		let min_x = Number.MAX_SAFE_INTEGER;
		let min_y = Number.MAX_SAFE_INTEGER;

		for (const stroke of imageStrokes) {
				for (let i = 0; i < stroke[0].length; i++) {
						min_x = Math.min(min_x, stroke[0][i]);
						min_y = Math.min(min_y, stroke[1][i]);
				}
		}

		return [Math.max(0, min_x), Math.max(0, min_y)];
};

//multiplayer code

function setUpSocketEvents(){
	socket.on("roomUpdate", (data) => {
		if (isDrawing){
			document.getElementById("topBar").innerHTML = `<p>${curWord}</p>`
		} else {
			document.getElementById("topBar").innerHTML = `<p>${data.wordText}</p>`
		}
		document.getElementById("bottomBar").innerHTML = `<p>${data.status}</p>`
		document.getElementById("leaderboard").innerHTML = ""
		for (let i of Object.keys(data.plrs)){
			const div1 = document.createElement("div")
			div1.classList.add("lbItem", "sBlur")
			if (data.plrs[i].correct){div1.classList.add("correct");}
			if (i==data.drawer){div1.classList.add("drawingLB");}
			const div2 = document.createElement("div")
			div2.classList.add("lbName")
			const p = document.createElement("p")
			p.innerText = data.plrs[i].name
			if (i=="ai"){p.classList.add("ai");}
			if (i==socket.id){p.classList.add("curUser");}
			const div3 = document.createElement("div")
			div3.classList.add("lbPoints")
			div3.innerHTML = `<p>${data.plrs[i].points}</p>`
			div2.appendChild(p)
			div1.appendChild(div2)
			div1.appendChild(div3)
			document.getElementById("leaderboard").appendChild(div1)
		} 
	})

	socket.on("totalRoomData", (data) => {
		document.getElementById("roomCont").innerHTML = ""
		for (let i of data){
			const div = document.createElement("div")
			div.classList.add("sBlur", "roomCard")
			const title = document.createElement("h1")
			title.classList.add("roomNameJoin")
			const stat = document.createElement("h3")
			stat.classList.add("roomStatus")
			const plrCount = document.createElement("h3")
			plrCount.classList.add("roomPlrCount")
			title.innerHTML = i.roomName
			stat.innerHTML = i.status
			plrCount.innerHTML = i.plrCount+"/10 Players"
			div.appendChild(title)
			div.appendChild(stat)
			div.appendChild(plrCount)
			div.onclick = () => {
				isHost = false
				inGame = true
				socket.emit("joinRoom", i.roomName, document.getElementById("nameInput").value, (success, res) => {
					if (success) {
						joinRoom(i.roomName)
					} else {
						inGame = false
						if (res){
							if (res == "name"){
								document.getElementById("nameInput").value = ""
								document.getElementById("nameInput").placeholder = "Invalid Nickname"
							} else if (res == "rerequest") {
								requestTotalRoomUpdate()
							}
						}
					}
				})
			}
			document.getElementById("roomCont").appendChild(div)
		}
	})

	socket.on("joinleave", (join, name) => {
		addChatMessage(name, join ? " has joined!" : " has left!", join ? "join" : "leave")
	})
	
	socket.on("newHost", () => {
		isHost = true
	})

	socket.on("startRound", (drawer,c1,c2,c3) => {
		document.getElementById("timeLeft").innerHTML = ""
		if (drawer){
			erase()
			document.getElementById("canvasDisp").style.display="none"
			document.getElementById("chatPanel").style.display="none"
			document.getElementById("choice1").innerHTML = c1
			document.getElementById("choice2").innerHTML = c2
			document.getElementById("choice3").innerHTML = c3
			document.getElementById("chooseWord").style.display="block"
			document.getElementById("drawPanels").style.display="block"
			resizeCanvas()
			choosingDrawing = true
			isDrawing = true
		} else {
			isDrawing = false
			canDraw = false
			flag = false
			document.getElementById("canvasDisp").style.display="block"
			document.getElementById("chatPanel").style.display="block"
			document.getElementById("chooseWord").style.display="none"
			document.getElementById("drawPanels").style.display="none"
		}
	})

	socket.on("chatMes", (name, msg, mc, uc1, uc2)=>{
		addChatMessage(name, msg, mc, uc1, uc2)
	})

	socket.on("canvasDraw", (imgURL)=>{
		if (document.getElementById("chatPanel").style.display==="none"){
			isDrawing = false
			canDraw = false
			flag = false
			document.getElementById("canvasDisp").style.display="block"
			document.getElementById("chatPanel").style.display="block"
			document.getElementById("chooseWord").style.display="none"
			document.getElementById("drawPanels").style.display="none"
			document.getElementById("timeLeft").innerHTML = ""
		}
		erase()
		lastImg = imgURL
		let img = new Image
		img.onload = () =>{
			document.getElementById("drawCanvas").getContext("2d").drawImage(img,0,0)
		}
		img.src = imgURL
	})
	
	socket.on("startDraw", (t)=>{
		erase()
		const t2 = t-new Date().getTime()
		const s1 = Math.round(t2/1000)
		document.getElementById("timeLeft").innerHTML = `${s1}s Left`
		const a = setInterval(()=>{
			const t1 = t-new Date().getTime()
			const s = Math.round(t1/1000)
			document.getElementById("timeLeft").innerHTML = `${s}s Left`
			if (s<=0){
				clearInterval(a)
				document.getElementById("timeLeft").innerHTML = `0s Left`
				if (isHost){
					socket.emit("endRound")
				}
			}
		},1000)
		
		const w = document.getElementById("topBar").innerHTML.substring(3,document.getElementById("topBar").innerHTML.length-4)
		const b = setInterval(()=>{
			const t1 = t-new Date().getTime()
			const s = Math.round(t1/1000)
			if (s<=10){
				clearInterval(b)
			}
			if (isHost){
				socket.emit("revealLetter")
			}
		},Math.floor(((t-new Date().getTime()-10000))/Math.floor(w.length/2)))
	})
}

function chooseWord(elem){
	choosingDrawing = false
	socket.emit("chooseWord", elem.innerHTML)
	curWord = elem.innerHTML
	erase()
	document.getElementById("canvasDisp").style.display="block"
	document.getElementById("chooseWord").style.display="none"
	resizeCanvas()
	canDraw = true
}

function createGame(){
	if (!inGame){
		inGame = true
		isHost = true
		const roomName = document.getElementById("roomInput").value
		const plrName = document.getElementById("nameInput").value
		socket.emit("createGame", roomName, plrName, (success, res) => {
			if (success) {
				joinRoom(roomName)
			} else {
				if (res){
					if (res =="rname"){
						document.getElementById("roomInput").value = ""
						document.getElementById("roomInput").placeholder = "Invalid Room Name"
					} else if (res == "pname"){
						document.getElementById("nameInput").value = ""
						document.getElementById("nameInput").placeholder = "Invalid Nickname"
					}
				}
				inGame = false
				isHost = false
			}
		})
	}
}

function joinRoom(roomName){
	document.getElementById("roomName").innerHTML = `<p id='roomNameText'>${roomName}<p>`
	setTimeout(function(){
		document.getElementById("roomName").style.width = `calc(${document.getElementById("roomNameText").clientWidth}px + 5px)`
	}, 100)
	requestRoomUpdate()
	document.getElementById("join").style.display="none"
	document.getElementById("play").style.display="block"
	resizeCanvas()
}

function requestRoomUpdate(){
	socket.emit("roomUpdateRequest")
}

function requestTotalRoomUpdate(){
	socket.emit("totalRoomUpdateRequest")
}

function sendChat(){
	if (socket){
		socket.emit("chatMes", document.getElementById("chatInput").value)
		document.getElementById("chatInput").value=""
	}
}

function addChatMessage(user, text, mesClass, userClass1, userClass2){
	const p = document.createElement("p")
	p.classList.add("chatMes")
	if (mesClass!=""){p.classList.add(mesClass)}
	const span = document.createElement("span")
	span.classList.add("user")
	if (userClass1!=""){span.classList.add(userClass1)}
	if (userClass2!=""){span.classList.add(userClass2)}
	span.innerText = user
	p.appendChild(span)
	const p2 = document.createElement("p")
	p2.style.display="inline"
	p2.innerText = text
	p.appendChild(p2)
	const cd = document.getElementById("chatDisplay")
	cd.appendChild(p)
	cd.scrollTop = cd.scrollHeight;
}
