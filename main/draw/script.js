var canvas, ctx, flag = false,
		prevX = 0,
		currX = 0,
		prevY = 0,
		currY = 0,
		dot_flag = false;
var oldPaths = []
var points = []

//all images belong to their respective owners
const bgUrls = ["https://www.planetware.com/wpimages/2020/02/france-in-pictures-beautiful-places-to-photograph-eiffel-tower.jpg","https://upload.wikimedia.org/wikipedia/en/1/1c/Rick_Astley_-_Whenever_You_Need_Somebody.png","https://i1.sndcdn.com/artworks-5Mg995iK0AdZ-0-t500x500.jpg","https://www.mytwintiers.com/wp-content/uploads/sites/89/2023/07/64ba03a6a163a2.12128738.jpeg?strip=1", "https://i1.sndcdn.com/artworks-44d3MSjTemoAnmeI-cnwmOA-t500x500.jpg","https://i1.sndcdn.com/artworks-ABqRkLGFhb44FZDv-szLf5Q-t500x500.jpg","https://c418.org/wp-content/uploads/2016/05/a3390257927_10.jpg","https://i.scdn.co/image/ab67616d0000b2732d8b1ba2af5670ae17f81a4c","https://i1.sndcdn.com/artworks-zOl3IY4D6JBQ-0-t500x500.jpg","https://images.genius.com/7e102407f54d49cb905a90596bd21a9b.1000x1000x1.png","https://images.genius.com/35fae8a4af0ddb9fb35910519aa6b013.1000x1000x1.png","https://m.media-amazon.com/images/I/41BFGrF4D-L._UXNaN_FMjpg_QL85_.jpg","https://imgproxy.mapia.io/v3/c-RHEuz4Zu_KP_YxLKIu1AUU6Rkymupe/g:ce/rs:fit:967:1395:true/aHR0cHM6Ly9tZnMu/cGQubWFwaWEuaW8v/cHVibGljL2ZpbGUv/NGNhMDM3NjBiZWFk/MGE5OTg4ZjBkMTFk/YzUyNDUxNWYvZG93/bmxvYWQ_U2Vydmlj/ZS1Qcm92aWRlcj1t/bXM.jpg","https://i.ytimg.com/vi/DVOmxLxmXuY/maxresdefault.jpg","https://i.scdn.co/image/ab67616d00001e0201ae86544e79c99698c43842","https://i1.sndcdn.com/artworks-eCZb1jvsZHkvGz15-3LNfRg-t500x500.jpg"]

var x = "black",
		y = 2;

function resizeCanvas(){
	canvas.width = document.getElementById("canvasDisp").clientWidth - 12
	canvas.height = document.getElementById("canvasDisp").clientHeight - 12
	document.querySelector(':root').style.setProperty('--iHeight', document.getElementById("customColor").offsetWidth+"px");
}

function updateStroke(self){
	document.getElementById("strokeDisp").innerText = self.value+ " px"
}

function init() {
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
				findxy('up', e)
		}, false);
		canvas.addEventListener("mouseout", function (e) {
				findxy('out', e)
		}, false);
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
	redrawPaths()
}

function erase(dontdelete = false) {
	if (!dontdelete){
		oldPaths = []
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
		if (res == 'down') {
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
			}
			flag = false;
		}
		if (res == 'move') {
				if (flag) {
						prevX = currX;
						prevY = currY;
						currX = e.clientX - canvas.getBoundingClientRect().left;
						currY = e.clientY - canvas.getBoundingClientRect().top;
					mouse = oMousePos(canvas, e);
					points.push({x:currX,y:currY})
						draw();
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
	for(let i = 1; i < path[0].length; i++){
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