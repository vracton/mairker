const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { createCanvas, loadImage, Image } = require('canvas');

//possibly add debounce to rerequest emits on join room to prevent potential ddos or high outband data transfer (non-priority)
//add time limit to word choosing (non-priority)
//server check word choice (non-priority)
//multi word prompts hide the space, change this (non-priority)
//handle drawer leaving mid round (non-priority)

//start server
const app = express();
app.use(express.json());
const httpserver = http.Server(app);
const io = socketio(httpserver);
//make it so bugs wont crash the server
process.on('uncaughtException', console.error);
process.on('uncaughtRejection', console.error);

//set up paths
app.use("/", express.static(path.join(__dirname, "/main/play/")));

app.get("/content/:name", (req, res) => {
	res.sendFile(path.join(__dirname, "/main/content/", req.params.name));
})

app.post("/transform", (req, res) => {
	const image_data = req.body;
	const filepath = `./images/${uuidv4()}.png`;
	const img = transformImg(image_data.strokes, image_data.box);

	const out = fs.createWriteStream(filepath);
	const stream = img.createPNGStream();
	stream.pipe(out);

	out.on('finish', async () => {
			const resizedPath = `./images/${uuidv4()}-resized.png`;
			const resizedImg = await resizeImage(filepath, 28, 28, resizedPath);

			res.sendFile(path.join(__dirname, resizedPath), {}, () => {
		fs.unlink(resizedPath, (err) => {
			if (err) {
				console.error(err);
				return;
			}
			});
				fs.unlink(filepath, (err) => {
				if (err) {
					console.error(err);
					return;
				}
				});
			});
	});
})

httpserver.listen(3000, () => {
	console.log("Server Started")
});

//game code
const games = {}
/*Structure
 {
 	host: socket.id,
	plrs: {
 		plrSocketId: {
	 		name: "name",
			points: 0,
	 		correct: false
		},
		...
		"ai": {
	 		name: "AI",
			points: 0,
	 		correct: false
		}
	},
 totalCorrect: 0,
  status: "status",
	state: "state", (wait, guess)
	word: "word",
 	wordText: "____",
	startTime: 1329029011, 
	drawer: drawerSocketId,
 pastDrawer: pastDrawerSocketId,
 lastDrawURL: "data64 url"
 }
*/
io.on('connection', function(socket) {
	socket.on("disconnecting", () => {
		const game = games[[...socket.rooms][1]]
		if (game) {
			if (game.host == socket.id) {
				if (Object.keys(game.plrs).length > 2) {
					socket.to([...socket.rooms][1]).emit("joinleave", false, games[[...socket.rooms][1]].plrs[socket.id].name)
					delete games[[...socket.rooms][1]].plrs[socket.id]
					for (let i of Object.keys(game.plrs)){
						if (i != "ai" ){
							games[[...socket.rooms][1]].host = i
							io.to(i).emit("newHost")
							break
						}
					}
				} else {
					delete games[[...socket.rooms][1]]
					io.emit("totalRoomData", totalRoomData())
				}
			} else if (game.drawer == socket.id) {
				//do something idk
				//might do later beacuse too lazy
				socket.to([...socket.rooms][1]).emit("joinleave", false, games[[...socket.rooms][1]].plrs[socket.id].name)
				delete games[[...socket.rooms][1]].plrs[socket.id]
			} else {
				socket.to([...socket.rooms][1]).emit("joinleave", false, games[[...socket.rooms][1]].plrs[socket.id].name)
				delete games[[...socket.rooms][1]].plrs[socket.id]
				socket.to([...socket.rooms][1]).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
			}
		}
	})
	
	socket.on("createGame", (roomName, plrName, callback) => {
		const game = games[[...socket.rooms][1]]
		if (!game){
			if (!games[roomName] && roomName != ""){
				if (plrName != ""){
						socket.join(roomName)
						games[roomName] = {
							host: socket.id,
							plrs: {},
							status: "Waiting for more players...",
							state: "wait",
							word: "",
							wordText: "",
							drawer: null,
							pastDrawer: null,
							lastDrawURL: null
						}
						games[roomName].plrs["ai"] = {
							name: "AI",
							points: 0,
							correct: false
						}
						games[roomName].plrs[socket.id] = {
							name: plrName,
							points: 0,
							correct: false
						}
						io.emit("totalRoomData", totalRoomData())
						callback(true)
				} else {
					callback(false, "pname")
				}
			} else {
				callback(false, "rname")
			}
		} else {
			callback(false)
		}
	})

	socket.on("joinRoom", (roomName, plrName, callback) => {
		const game = games[[...socket.rooms][1]]
		if (!game) {
			if (roomName != ""){
				if (games[roomName]) {
					if (Object.keys(games[roomName].plrs).length < 10) {
						if (plrName != ""){
							socket.join(roomName)
							games[roomName].plrs[socket.id] = {
								name: plrName,
								points: 0,
								correct: false
							}
							if (games[roomName].state=="draw"){
								if (games[roomName].lastDrawURL != null){
									socket.emit("canvasDraw", games[roomName].lastDrawURL)
								}
								socket.emit("startDraw", games[roomName].startTime)
							}
							if (games[roomName].state == "wait"){
								games[roomName].status = "Starting..."
								let plrIds = Object.keys(games[roomName].plrs)
								games[roomName].pastDrawer = games[roomName].drawer
								if (games[roomName].pastDrawer){
									const i = plrIds.indexOf(games[roomName].pastDrawer)
									if (i){
										if (i+1<plrIds.length){
											if (plrIds[i+1] == "ai"){
												if (i+2<plrIds.length){
													games[roomName].drawer = plrIds[i+2]
												} else {
													games[roomName].drawer = plrIds[0]
												}
											} else {
												games[roomName].drawer = plrIds[i+1]
											}
										} else {
											if (plrIds[0] == "ai"){
												games[roomName].drawer = plrIds[1]
											} else {
												games[roomName].drawer = plrIds[0]
											}
										}
									} else {
										if (plrIds[0] == "ai"){
											games[roomName].drawer = plrIds[1]
										} else {
											games[roomName].drawer = plrIds[0]
										}
									}
								} else {
									if (plrIds[0] == "ai"){
										games[roomName].drawer = plrIds[1]
									} else {
										games[roomName].drawer = plrIds[0]
									}
								}
								games[roomName].totalCorrect = 0
								games[roomName].state = "choosing"
								games[roomName].status = `${games[roomName].plrs[games[roomName].drawer].name} is choosing a word.`
								for (let i of plrIds){
									games[roomName].plrs[i].correct = false
									if (i!="ai"&&i!=games[roomName].drawer){
										io.to(i).emit("startRound", false)
									}
								}
								io.to(games[roomName].drawer).emit("startRound", true, LABELS[Math.floor(Math.random()*LABELS.length)],LABELS[Math.floor(Math.random()*LABELS.length)],LABELS[Math.floor(Math.random()*LABELS.length)])
							}
							socket.to(roomName).emit("joinleave", true, plrName)
							socket.to(roomName).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
							socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
							callback(true)
						} else {
							callback(false, "name")
						}
					} else {
						callback(false, "rerequest")
					}
				} else {
					callback(false, "rerequest")
				}
			} else {
				callback(false, "rerequest")
			}
		} else {
			callback(false)
		}
	})

	socket.on("roomUpdateRequest", () => {
		socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
	})

	socket.on("totalRoomUpdateRequest", () => {
		socket.emit("totalRoomData", totalRoomData())
	})

	socket.on("chatMes", (message)=>{
		const game = games[[...socket.rooms][1]]
		if (game){
			const plr = game.plrs[socket.id]
			if (socket.id != game.drawer){
				if (message.trim()!=""){
					if (message.trim().toLowerCase()==game.word&&game.state=="draw"){
						if (!games[[...socket.rooms][1]].plrs[socket.id].correct){
							const points = (Object.keys(game.plrs).length -games[[...socket.rooms][1]].totalCorrect-1)*25
							games[[...socket.rooms][1]].totalCorrect++
							games[[...socket.rooms][1]].plrs[socket.id].correct=true
							games[[...socket.rooms][1]].plrs[socket.id].points+=points
							socket.to([...socket.rooms][1]).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
							socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
							socket.to([...socket.rooms][1]).emit("chatMes", plr.name, ` guessed the word ! (+${points})`,"correct","correct")
							socket.emit("chatMes", plr.name, ` guessed the word ! (+${points})`,"correct","correct")
						}
					} else {
						socket.to([...socket.rooms][1]).emit("chatMes", plr.name, ": "+message)
						socket.emit("chatMes", plr.name, ": "+message)
					}
				}
			}
		}
	})

	socket.on("chooseWord", (word)=>{
		const game = games[[...socket.rooms][1]]
		if (game){
			if (game.drawer == socket.id&&game.state=="choosing"){
				game.word = word
				game.wordText = word.replaceAll(/./g,"_")
				game.state="draw"
				const t = new Date().getTime()+75000 //does +4000 on client for some reason
				games[[...socket.rooms][1]].startTime = t
				game.status = `${game.plrs[socket.id].name} is drawing!`
				socket.to([...socket.rooms][1]).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
				socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
				socket.to([...socket.rooms][1]).emit("startDraw", t)
				socket.emit("startDraw", t)
			}
		}
	})

	socket.on("canvasImg", (imgURL)=>{
		const game = games[[...socket.rooms][1]]
		if (game){
			if (game.drawer == socket.id&&game.state=="draw"){
				games[[...socket.rooms][1]].lastDrawURL = imgURL
				socket.to([...socket.rooms][1]).emit("canvasDraw", imgURL)
			}
		}
	})

	socket.on("revealLetter", ()=>{
		const game = games[[...socket.rooms][1]]
		if (game){
			if (game.host == socket.id&&game.state=="draw"){
				let a = Math.floor(Math.random()*game.word.length)
				while (game.wordText[a]!="_"){
					a = Math.floor(Math.random()*game.word.length)
				}
				games[[...socket.rooms][1]].wordText =game.wordText.substring(0,a)+game.word[a]+game.wordText.substring(a+1,game.wordText.length)
				socket.to([...socket.rooms][1]).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
				socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
			}
		}
	})

	socket.on("endRound", ()=>{
		const game = games[[...socket.rooms][1]]
		if (game){
			if (game.host == socket.id&&game.state=="draw"){
					games[[...socket.rooms][1]].state="end"
					games[[...socket.rooms][1]].wordText = game.word
				games[[...socket.rooms][1]].plrs[game.drawer].points += Math.round(game.totalCorrect*12.5)
				socket.to([...socket.rooms][1]).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
				socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
				socket.to([...socket.rooms][1]).emit("chatMes", game.plrs[game.drawer].name, ` was drawing ${game.word}. ${game.totalCorrect}/${Object.keys(game.plrs).length-1} got it correct! (+${Math.round(game.totalCorrect*12.5)})`,"system","system")
				socket.emit("chatMes", game.plrs[game.drawer].name, ` was drawing ${game.word}. ${game.totalCorrect}/${Object.keys(game.plrs).length-1} got it correct! (+${Math.round(game.totalCorrect*12.5)})`,"system")
				if (Object.keys(game.plrs)<3){
					games[[...socket.rooms][1]].state = "wait"
				} else {
					const a = games[[...socket.rooms][1]]
					a.status = "Starting..."
					let plrIds = Object.keys(a.plrs)
					a.pastDrawer = a.drawer
					if (a.pastDrawer){
						const i = plrIds.indexOf(a.pastDrawer)
						if (i){
							if (i+1<plrIds.length){
								if (plrIds[i+1] == "ai"){
									if (i+2<plrIds.length){
										a.drawer = plrIds[i+2]
									} else {
										a.drawer = plrIds[0]
									}
								} else {
									a.drawer = plrIds[i+1]
								}
							} else {
								if (plrIds[0] == "ai"){
									a.drawer = plrIds[1]
								} else {
									a.drawer = plrIds[0]
								}
							}
						} else {
							if (plrIds[0] == "ai"){
								a.drawer = plrIds[1]
							} else {
								a.drawer = plrIds[0]
							}
						}
					} else {
						if (plrIds[0] == "ai"){
							a.drawer = plrIds[1]
						} else {
							a.drawer = plrIds[0]
						}
					}
					a.totalCorrect = 0
					a.state = "choosing"
					a.status = `${a.plrs[a.drawer].name} is choosing a word.`
					for (let i of plrIds){
						a.plrs[i].correct = false
						if (i!="ai"&&i!=a.drawer){
							io.to(i).emit("startRound", false)
						}
					}
					io.to(a.drawer).emit("startRound", true, LABELS[Math.floor(Math.random()*LABELS.length)],LABELS[Math.floor(Math.random()*LABELS.length)],LABELS[Math.floor(Math.random()*LABELS.length)])
					socket.to([...socket.rooms][1]).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
					socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
				}
			}
		}
	})

	socket.on("aiPrediction", (p)=>{
		const game = games[[...socket.rooms][1]]
		if (game){
			if (socket.id==game.drawer){
				if (!game.plrs["ai"].correct){
					if (p[0].probability >= 0.3&&p[0].className==game.word) {
						const points = (Object.keys(game.plrs).length -games[[...socket.rooms][1]].totalCorrect-1)*25
						games[[...socket.rooms][1]].totalCorrect++
						games[[...socket.rooms][1]].plrs['ai'].correct=true
						games[[...socket.rooms][1]].plrs["ai"].points+=points
						socket.to([...socket.rooms][1]).emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
						socket.emit("roomUpdate", roomData(games[[...socket.rooms][1]]))
						socket.to([...socket.rooms][1]).emit("chatMes", "AI", ` guessed the word ! (+${points})`,"correct","correct","ai")
						socket.emit("chatMes", "AI", ` guessed the word ! (+${points})`,"correct","correct","ai")
					} else {
						if (p[0].className==game.word){
							socket.to([...socket.rooms][1]).emit("chatMes", "AI", ": "+p[1].className,"","ai")
							socket.emit("chatMes", "AI", ": "+p[1].className,"","ai")
						} else {
							socket.to([...socket.rooms][1]).emit("chatMes", "AI", ": "+p[0].className,"","ai")
							socket.emit("chatMes", "AI", ": "+p[0].className,"","ai")
						}
					}
				}
			}
		}
	})
})

function totalRoomData(){
	let data = []
	for (let i of Object.keys(games)){
		let game = {}
		game.status = games[i].status
		game.plrCount = Object.keys(games[i].plrs).length
		game.roomName = i
		data.push(game)
	}
	return data
}

function roomData(game){
	let data = JSON.parse(JSON.stringify(game))
	delete data.word
	delete data.host
	return data
}

//ai preprocessing
function transformImg(strokes, box) {
		const width = box[2] - box[0];
		const height = box[3] - box[1];

		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
		for (const stroke of strokes) {
				ctx.beginPath();
				ctx.moveTo(stroke[0][0], stroke[1][0]);
				for (let i = 1; i < stroke[0].length; i++) {
						ctx.lineTo(stroke[0][i], stroke[1][i]);
				}
				ctx.lineWidth = 3;
				ctx.strokeStyle = '#000000';
				ctx.stroke();
		}
		return canvas
}

async function resizeImage(inputPath, width, height, outputPath) {
		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');
		const img = new Image();

		return new Promise((resolve, reject) => {
				img.onload = () => {
						ctx.drawImage(img, 0, 0, width, height);
						const out = fs.createWriteStream(outputPath);
						const stream = canvas.createPNGStream();
						stream.pipe(out);

						out.on('finish', () => {
								resolve(loadImage(outputPath));
						});

						out.on('error', (err) => {
								reject(err);
						});
				};

				img.onerror = (err) => {
						reject(err);
				};

				img.src = inputPath;
		});
}

//at bottom so i dont have to scroll through every time !
const LABELS = [
		"The Eiffel Tower",
		"The Great Wall of China",
		"The Mona Lisa",
		"aircraft carrier",
		"airplane",
		"alarm clock",
		"ambulance",
		"angel",
		"animal migration",
		"ant",
		"anvil",
		"apple",
		"arm",
		"asparagus",
		"axe",
		"backpack",
		"banana",
		"bandage",
		"barn",
		"baseball",
		"baseball bat",
		"basket",
		"basketball",
		"bat",
		"bathtub",
		"beach",
		"bear",
		"beard",
		"bed",
		"bee",
		"belt",
		"bench",
		"bicycle",
		"binoculars",
		"bird",
		"birthday cake",
		"blackberry",
		"blueberry",
		"book",
		"boomerang",
		"bottlecap",
		"bowtie",
		"bracelet",
		"brain",
		"bread",
		"bridge",
		"broccoli",
		"broom",
		"bucket",
		"bulldozer",
		"bus",
		"bush",
		"butterfly",
		"cactus",
		"cake",
		"calculator",
		"calendar",
		"camel",
		"camera",
		"camouflage",
		"campfire",
		"candle",
		"cannon",
		"canoe",
		"car",
		"carrot",
		"castle",
		"cat",
		"ceiling fan",
		"cell phone",
		"cello",
		"chair",
		"chandelier",
		"church",
		"circle",
		"clarinet",
		"clock",
		"cloud",
		"coffee cup",
		"compass",
		"computer",
		"cookie",
		"cooler",
		"couch",
		"cow",
		"crab",
		"crayon",
		"crocodile",
		"crown",
		"cruise ship",
		"cup",
		"diamond",
		"dishwasher",
		"diving board",
		"dog",
		"dolphin",
		"donut",
		"door",
		"dragon",
		"dresser",
		"drill",
		"drums",
		"duck",
		"dumbbell",
		"ear",
		"elbow",
		"elephant",
		"envelope",
		"eraser",
		"eye",
		"eyeglasses",
		"face",
		"fan",
		"feather",
		"fence",
		"finger",
		"fire hydrant",
		"fireplace",
		"firetruck",
		"fish",
		"flamingo",
		"flashlight",
		"flip flops",
		"floor lamp",
		"flower",
		"flying saucer",
		"foot",
		"fork",
		"frog",
		"frying pan",
		"garden",
		"garden hose",
		"giraffe",
		"goatee",
		"golf club",
		"grapes",
		"grass",
		"guitar",
		"hamburger",
		"hammer",
		"hand",
		"harp",
		"hat",
		"headphones",
		"hedgehog",
		"helicopter",
		"helmet",
		"hexagon",
		"hockey puck",
		"hockey stick",
		"horse",
		"hospital",
		"hot air balloon",
		"hot dog",
		"hot tub",
		"hourglass",
		"house",
		"house plant",
		"hurricane",
		"ice cream",
		"jacket",
		"jail",
		"kangaroo",
		"key",
		"keyboard",
		"knee",
		"knife",
		"ladder",
		"lantern",
		"laptop",
		"leaf",
		"leg",
		"light bulb",
		"lighter",
		"lighthouse",
		"lightning",
		"line",
		"lion",
		"lipstick",
		"lobster",
		"lollipop",
		"mailbox",
		"map",
		"marker",
		"matches",
		"megaphone",
		"mermaid",
		"microphone",
		"microwave",
		"monkey",
		"moon",
		"mosquito",
		"motorbike",
		"mountain",
		"mouse",
		"moustache",
		"mouth",
		"mug",
		"mushroom",
		"nail",
		"necklace",
		"nose",
		"ocean",
		"octagon",
		"octopus",
		"onion",
		"oven",
		"owl",
		"paint can",
		"paintbrush",
		"palm tree",
		"panda",
		"pants",
		"paper clip",
		"parachute",
		"parrot",
		"passport",
		"peanut",
		"pear",
		"peas",
		"pencil",
		"penguin",
		"piano",
		"pickup truck",
		"picture frame",
		"pig",
		"pillow",
		"pineapple",
		"pizza",
		"pliers",
		"police car",
		"pond",
		"pool",
		"popsicle",
		"postcard",
		"potato",
		"power outlet",
		"purse",
		"rabbit",
		"raccoon",
		"radio",
		"rain",
		"rainbow",
		"rake",
		"remote control",
		"rhinoceros",
		"rifle",
		"river",
		"roller coaster",
		"rollerskates",
		"sailboat",
		"sandwich",
		"saw",
		"saxophone",
		"school bus",
		"scissors",
		"scorpion",
		"screwdriver",
		"sea turtle",
		"see saw",
		"shark",
		"sheep",
		"shoe",
		"shorts",
		"shovel",
		"sink",
		"skateboard",
		"skull",
		"skyscraper",
		"sleeping bag",
		"smiley face",
		"snail",
		"snake",
		"snorkel",
		"snowflake",
		"snowman",
		"soccer ball",
		"sock",
		"speedboat",
		"spider",
		"spoon",
		"spreadsheet",
		"square",
		"squiggle",
		"squirrel",
		"stairs",
		"star",
		"steak",
		"stereo",
		"stethoscope",
		"stitches",
		"stop sign",
		"stove",
		"strawberry",
		"streetlight",
		"string bean",
		"submarine",
		"suitcase",
		"sun",
		"swan",
		"sweater",
		"swing set",
		"sword",
		"syringe",
		"t-shirt",
		"table",
		"teapot",
		"teddy-bear",
		"telephone",
		"television",
		"tennis racquet",
		"tent",
		"tiger",
		"toaster",
		"toe",
		"toilet",
		"tooth",
		"toothbrush",
		"toothpaste",
		"tornado",
		"tractor",
		"traffic light",
		"train",
		"tree",
		"triangle",
		"trombone",
		"truck",
		"trumpet",
		"umbrella",
		"underwear",
		"van",
		"vase",
		"violin",
		"washing machine",
		"watermelon",
		"waterslide",
		"whale",
		"wheel",
		"windmill",
		"wine bottle",
		"wine glass",
		"wristwatch",
		"yoga",
		"zebra",
		"zigzag",
];