"use strict";

class gameArea{
	constructor () {
		this.canvas = document.createElement("canvas");
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		document.body.insertBefore(this.canvas, document.body.childNodes[0]);
		this.context = this.canvas.getContext("2d");
		this._xOffset = 0;
		this._yOffset = 0;
		this.xOffset = -this.canvas.width/2;
		this.yOffset = -this.canvas.height/2;
		this.interval;
		this.inRangeItemIndex = -1;
		this.pickItem = false;
		this.input = {'KeyW':false, 'KeyA':false, 'KeyS':false, 'KeyD':false, 'KeyF':false, 'lMBDown':false};
		this.players = {};
		this.bullets = [];
		this.items = [new item(0, 0, [new circle(0,0, 10, "black", 1, true, "rgb(255,255,255)")]), new item(50, 100, [new circle(0,0, 10, "black", 1, true, "rgb(255,255,255)")]), new item(50, 100, [new circle(0,0, 10, "black", 1, true, "rgb(255,255,255)")]), new item(50, 100, [new circle(0,0, 10, "black", 1, true, "rgb(255,255,255)")]), new ak47(400, 300), new um9(600, 600)];
		this.myCharacterID;
	}


	static clear (ctx,xOffset,yOffset,canvasWidth,canvasHeight) {
		ctx.clearRect(xOffset, yOffset, canvasWidth, canvasHeight);
	}

	update () {
		gameArea.clear(this.context,this.xOffset,this.yOffset,this.canvas.width,this.canvas.height);					
		if (this.players[this.myCharacterID].isAlive()) {
			// Shows pickup ui if near any item and pick it up if 'F' is input
			this.inRangeItemIndex = -1;
			for(i = 0; i < this.items.length; i++) {	
				if (this.items[i].inRange(this.players[this.myCharacterID].x, this.players[this.myCharacterID].y)) {
					document.getElementById("pick-item").innerHTML = this.items[i].name;
					document.getElementById("ui-lower").style.display = "block";
					this.inRangeItemIndex = i;
					break;
				}
			}
			if (this.inRangeItemIndex != -1) {
				document.getElementById("ui-lower").style.display = "block";
			} else if (document.getElementById("ui-lower").style.display == "block") {
				document.getElementById("ui-lower").style.display = "none";
			}
		}

		for (var playerID in this.players) {
			if (this.players[playerID].isAlive()) {
				this.players[playerID].update(this.context);
			} else {
				delete this.players[playerID];
			}
		}
		for (var i = 0; i < this.items.length; i++) {
			this.items[i].update(this.context);
		}
		for (var i = 0; i < this.bullets.length; i++) {
			if (!this.bullets[i].hasExpired()) {
				this.bullets[i].update(this.context);
				for (var playerID in this.players) {
					if (this.players[playerID].isHit(this.bullets[i])){
						this.players[playerID].health -= (this.bullets[i].dmg);
						this.bullets.splice(i,1);
						break;
					}
				}
			} else {
				this.bullets.splice(i,1);
			}
		}

		this.processInput();
		this.sendInput();
	}

	processInput() {
		if (this.pickItem) {
			if (this.items[this.inRangeItemIndex] instanceof weapon) {
				this.players[this.myCharacterID].pickWeapon(this.items.splice(this.inRangeItemIndex,1)[0]);
			} else {
				var itemPick = this.items.splice(this.inRangeItemIndex,1)[0];
				this.players[this.myCharacterID].pickItem(itemPick);
			}
			this.pickItem = false;
		}
		
		if (this.players[this.myCharacterID].isAlive()) {
			// Character movement
			var delta_x = 0;
			var delta_y = 0;
			if (this.input['KeyA']) {
				delta_x -= 1;
			}
			if (this.input['KeyW']) {
				delta_y -= 1;
			}
			if (this.input['KeyD']) {
				delta_x += 1;
			}
			if (this.input['KeyS']) {
				delta_y += 1;
			}
			var pSpeed = this.players[this.myCharacterID].speed;
			delta_x *= pSpeed;
			delta_y *= pSpeed;
			this.players[this.myCharacterID].move(delta_x,delta_y);
			this.moveScreenBy(delta_x,delta_y);
			
			if (this.input['lMBDown'] && this.players[this.myCharacterID].isWeaponReady()) {
				var bullet = this.players[this.myCharacterID].useWeapon();
				if (bullet !== null) {
					this.bullets[this.bullets.length] = bullet;
				}
			}
		}
	}

	moveScreenBy (x,y) {
		this.xOffset += x;
		this.yOffset += y;
	}

	set xOffset(value) {
		this.context.translate(this._xOffset - value,0);
		this._xOffset = value;
		
	}

	get xOffset() {
		return this._xOffset;
	}

	set yOffset(value) {
		this.context.translate(0,this._yOffset - value);
		this._yOffset = value;
	}

	get yOffset() {
		return this._yOffset;
	}

	keyUp (e) {
		this.input[e.code] = false;
	}
	keyDown (e) {
		this.input[e.code] = true;
	}
	lMouseDown (e) {
		this.input['lMBDown'] = true;
	}
	lMouseUp (e) {
		this.input['lMBDown'] = false;
	}

	mouseMove (e) {
		this.players[this.myCharacterID].dir = angleFromVec({x:this.players[this.myCharacterID].x + this.players[this.myCharacterID].body.xOffset, y:this.players[this.myCharacterID].y + this.players[this.myCharacterID].body.yOffset}, {x:this.xOffset + e.pageX, y:this.yOffset + e.pageY});
	}

	sendInput () {
		socket.emit('player_input', this.input);
	}

	updateGame (players) {
		for (var playerID in players) {
			if (this.players[playerID] === undefined) {
				this.players[playerID] = new player(players[playerID].x,players[playerID].y);
			} else {
				this.players[playerID].x = players[playerID].x;
				this.players[playerID].y = players[playerID].y;
			}
		}

		for (var playerID in this.players) {
			if (players[playerID] === undefined) {
				delete this.players[playerID];
			}
		}
	}

	start(myCharacterID) {
		this.myCharacterID = myCharacterID;
		this.interval = setInterval(this.update.bind(this), 1000/60);
	}
}