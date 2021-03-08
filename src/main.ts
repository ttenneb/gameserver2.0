import express from 'express';
import socket from 'socket.io';

//Server startup
const port = 5000;
const app = express();
const PLAYER_SPEED = .1;
const server = app.listen(port, () => {
    console.log("Listening on port: " + port);
})
const io = socket(server);

//player connection handling
io.on('connection',(socket) =>{
    console.log("Client connected: " + socket.id);
    let client: player = new player(new vector(0,0), socket.id)
    Players_byID[socket.id] = client;
    Players.push(client);
    socket.on('player_input', (data: Array<number>) => {
        Players_byID[socket.id].update_input(data);
    });
});


interface HashTable<T> {
    [key: string]: T;
}
class vector{
    x: number;
    y: number;
    constructor(x: number, y: number , copy?: vector) {
        this.x = x;
        this.y = y;
        if(copy != undefined){
            this.x = copy.x;
            this.y = copy.y;
        }
    }
    add(a: vector){
        this.x += a.x;
        this.y += a.y;
    }
    sub(a: vector){
        this.x -= a.x;
        this.y -= a.y;
    }
    mult(a: number){
        this.x *= a;
        this.y *= a;
    }
    div(a: number){
        this.x /= a;
        this.y /= a;
    }
    norm(){
        let mag = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        this.div(mag);
    }
    mag(): number{
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    equals(a: vector): boolean{
        return this.x == a.x && this.y == a.y
    }
    within(a: vector, b: number){
        if(Math.abs(this.x - a.x) > 2){
            return false;
        }
        if(Math.abs(this.y - a.y) > 2){
            return false;
        }
        return true;
    }
}
/*class hitbox_circle{
    radius: number
    location:vector;
    constructor(r: number, l: vector) {
        this.radius = r;
        this.location = l;
    }
    colliding_circle(hitbox: hitbox_circle): boolean{
        if(this.radius != 0 && hitbox.radius != 0) {
            let dx = this.location.x - hitbox.location.x;
            let dy = this.location.y - hitbox.location.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + hitbox.radius) {
                return true;
            }
            return false;
        }

    }
    colliding_rect(hitbox: hitbox_rect): boolean{

    }
}*/

interface input {
    Up: boolean;
    Down: boolean;
    Right: boolean;
    Left: boolean;
    rotation: number;
}

class hitbox_rect{
    width: number;
    height: number;
    location: vector;

    constructor(h: number, w: number, l: vector) {
        this.width = w;
        this.height = h;
        this.location = l;
    }
    colliding_rect(hitbox: hitbox_rect): boolean{
        if (this.location.x < hitbox.location.x + hitbox.width &&
            this.location.x + this.width > hitbox.location.x &&
            this.location.y < hitbox.location.y + hitbox.height &&
            this.location.y + this.height > hitbox.location.y) {
            return true;
        }
        return false;
    }
}
class gameobject{
    location: vector;
    rotation: number;
    constructor(l: vector) {
        this.location=l;
        this.rotation = 0;
    }
}
class player extends gameobject{
    hitbox: hitbox_rect;
    ID: string
    input: input;
    animation: number;
    constructor(l: vector, id:string) {
        super(l);
        this.ID = id;
        this.hitbox = new hitbox_rect(5,5, this.location);
        this.input = {
            Up: false,
            Down: false,
            Right: false,
            Left: false,
            rotation: 0
        };
        this.animation = 0;
    }
    update_input(input: Array<number>){
        // KEY W
        //console.log(input);
        if(input[0] == 1){
            this.input.Up = true;
        }else{
            this.input.Up = false;
        }
        // KEY D
        if(input[1] == 1){
            this.input.Right = true;
        }else{
            this.input.Right = false;
        }
        // KEY S
        if(input[2] == 1){
            this.input.Down = true;
        }else{
            this.input.Down = false;
        }
        // KEY A
        if(input[3] == 1){
            this.input.Left = true;
        }else{
            this.input.Left = false;
        }
        this.rotation = input[4];

    }
    update(){
        if(this.input != undefined) {
            if (this.input.Up) {
                this.location.x -= Math.cos((this.rotation*Math.PI)/180)*PLAYER_SPEED;
                this.location.y -= Math.sin((this.rotation*Math.PI)/180)*PLAYER_SPEED;
            }
            if (this.input.Down) {
                this.location.x += Math.cos((this.rotation*Math.PI)/180)*PLAYER_SPEED;
                this.location.y += Math.sin((this.rotation*Math.PI)/180)*PLAYER_SPEED;
            }
            if (this.input.Right) {
                this.location.x -= Math.cos(((this.rotation-90)*Math.PI)/180)*PLAYER_SPEED;
                this.location.y -= Math.sin(((this.rotation-90)*Math.PI)/180)*PLAYER_SPEED;
            }
            if (this.input.Left) {
                this.location.x -= Math.cos(((this.rotation+90)*Math.PI)/180)*PLAYER_SPEED;
                this.location.y -= Math.sin(((this.rotation+90)*Math.PI)/180)*PLAYER_SPEED;
            }
        }
    }
}



let Players: Array<player> = [];
let Players_byID: HashTable<player> = {};

function buildPlayerPayload(socketId: string): Array<number>{
    let player = Players_byID[socketId];
    let payload: Array<number> = [];
    //upgrade to spatial hash map
    payload.push(Players.length);
    Players.forEach((p) =>{
        payload.push(p.location.x);
        payload.push(p.location.y);
        payload.push(p.rotation);
    });
    //console.log(payload);
    return payload;
}
async function tick(){
    //update game state
    Players.forEach((player)=>
    {
        player.update();
    });
    //send new state to clients
    let sockets = io.sockets.sockets;
    for(let socketId in sockets)
    {
        let socket = sockets[socketId];
        //sends game data with player as first object in the list
        socket.emit('serverTick', buildPlayerPayload(socketId));
    }

    setTimeout(tick, 10);
}
tick();



