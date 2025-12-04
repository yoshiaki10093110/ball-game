// --- Matter.js モジュールのエイリアス ---
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Events = Matter.Events;

// --- グローバル変数 ---
let engine;
let world;
let balls = [];
let walls = [];
let nextBallType = 0;
let score = 0;
// ★追加：ハイスコア用変数
let highScore = 0; 
let gameState = "TITLE"; // TITLE, HOWTO, GAME, GAMEOVER
let canDrop = true;
let gameAreaWidth;

// --- ゲーム設定 ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 640; 
const WALL_THICKNESS = 20;
const GAME_AREA_WIDTH_SETTING = 500; 

// ゲームオーバーライン
const DEAD_LINE_Y = 130;

// --- ボールデータと模様描画関数 ---
// --- ボールデータと模様描画関数 ---
const BALL_TYPES = [
  // ★変更点：ピンポン玉の色を「オレンジ」に変更し、stroke: true (黒線で囲む) を追加
  // 0: ピンポン (r: 15, 密度: 1.0 - 基準)
  { r: 15, color: "#FF8C00", label: "PingPong", score: 1, density: 1.0, stroke: true },
  
  // 1: ゴルフ (r: 20, 密度: 2.0 - サイズの割に重い)
  { r: 20, color: "#FFFFFF", label: "Golf", score: 3, density: 2.0, stroke: true, drawFunc: (r) => {
      fill(200); noStroke();
      for(let i=0; i<8; i++) {
        for(let j=0; j<8; j++) {
          circle(map(i,0,7,-r*0.7,r*0.7), map(j,0,7,-r*0.7,r*0.7), r*0.1);
        }
      }
  }},
  
  // 2: テニス (r: 28, 密度: 1.5 - 中程度)
  { r: 28, color: "#DFFF00", label: "Tennis", score: 6, density: 1.5, drawFunc: (r) => {
      noFill(); stroke(255); strokeWeight(r*0.1);
      arc(-r*0.6, 0, r*1.5, r*1.5, -PI/4, PI/4);
      arc(r*0.6, 0, r*1.5, r*1.5, PI*0.75, PI*1.25);
  }},
  
  // 3: 野球 (r: 35, 密度: 1.8)
  { r: 35, color: "#F8F8FF", label: "Base", score: 10, density: 1.8, stroke: true, drawFunc: (r) => {
      noFill(); stroke("#FF0000"); strokeWeight(r*0.08);
      arc(-r*0.5, 0, r*1.3, r*1.8, -PI/3, PI/3);
      arc(r*0.5, 0, r*1.3, r*1.8, PI*0.66, PI*1.33);
      strokeWeight(r*0.05);
      for(let i=-PI/4; i<PI/4; i+=0.2) {
        let x = -r*0.5 + cos(i)*r*0.65; let y = sin(i)*r*0.9;
        line(x-r*0.1, y, x+r*0.1, y);
        x = r*0.5 + cos(i+PI)*r*0.65; y = sin(i+PI)*r*0.9;
        line(x-r*0.1, y, x+r*0.1, y);
      }
  }},
  
  // 4: ビリヤード (r: 45, 密度: 2.5 - 非常に高密度)
  { r: 45, color: "#222222", label: "Billiard", score: 15, density: 2.5, drawFunc: (r) => {
      fill(255); noStroke();
      circle(0,0, r*0.8);
      fill(0); textAlign(CENTER, CENTER); textSize(r*0.6); textStyle(BOLD);
      text("8", 0, 0); textStyle(NORMAL);
  }},
  
  // 5: ホッケー (r: 55, 密度: 2.3)
  { r: 55, color: "#FF6600", label: "Hockey", score: 21, density: 2.3, drawFunc: (r) => {
      fill(255, 100); noStroke();
      for(let i=0; i<5; i++) circle(random(-r/2,r/2), random(-r/2,r/2), r*0.2);
  }},
  
  // 6: ハンドボール (r: 68, 密度: 1.0)
  { r: 68, color: "#0044FF", label: "Hand", score: 28, density: 1.0, drawFunc: (r) => {
      noFill(); stroke(255); strokeWeight(r*0.03);
      beginShape();
      for(let i=0; i<6; i++) {
        let angle = TWO_PI / 6 * i;
        vertex(cos(angle)*r*0.6, sin(angle)*r*0.6);
        line(cos(angle)*r*0.6, sin(angle)*r*0.6, cos(angle)*r, sin(angle)*r);
      }
      endShape(CLOSE);
  }},
  
  // 7: バレー (r: 80, 密度: 0.8 - サイズの割に軽い)
  { r: 80, color: "#FFD700", label: "Volley", score: 36, density: 0.8, drawFunc: (r) => {
      noFill(); strokeWeight(r*0.05);
      stroke(0,0,255); arc(0, 0, r*1.8, r*1.8, 0, PI/2);
      stroke(255);    arc(0, 0, r*1.8, r*1.8, PI/2, PI);
      stroke(0,0,255); arc(0, 0, r*1.8, r*1.8, PI, PI*1.5);
      stroke(255);    arc(0, 0, r*1.8, r*1.8, PI*1.5, TWO_PI);
      stroke(255,255,0); line(-r,0,r,0); line(0,-r,0,r);
  }},
  
  // 8: サッカー (r: 95, 密度: 1.2)
  { r: 95, color: "#FFFFFF", label: "Soccer", score: 45, density: 1.2, stroke: true, drawFunc: (r) => {
      fill(0); noStroke();
      beginShape(); for(let i=0;i<5;i++){vertex(cos(TWO_PI/5*i-PI/2)*r*0.3, sin(TWO_PI/5*i-PI/2)*r*0.3);} endShape(CLOSE);
      for(let i=0;i<5;i++){
        let ang = TWO_PI/5*i - PI/2;
        let x = cos(ang)*r*0.8; let y = sin(ang)*r*0.8;
        beginShape();
        for(let j=0;j<5;j++){vertex(x+cos(TWO_PI/5*j+ang)*r*0.2, y+sin(TWO_PI/5*j+ang)*r*0.2);}
        endShape(CLOSE);
      }
  }},
  
  // 9: バスケ (r: 110, 密度: 1.1)
  { r: 110, color: "#FF7700", label: "Basket", score: 55, density: 1.1, stroke: true, drawFunc: (r) => {
      noFill(); stroke(0); strokeWeight(r*0.05);
      line(-r,0,r,0); line(0,-r,0,r);
      arc(-r*0.7, 0, r, r*1.5, -PI/3, PI/3);
      arc(r*0.7, 0, r, r*1.5, PI*0.66, PI*1.33);
  }},
  
  // 10: ボウリング (r: 130, 密度: 3.0 - 最大級の重さ)
  { r: 130, color: "#3B1E56", label: "Bowling", score: 66, density: 3.0, drawFunc: (r) => {
      fill(100, 50, 150, 100); noStroke();
      circle(r*0.3, -r*0.3, r*0.8); circle(-r*0.4, r*0.2, r);
      fill(20);
      circle(r*0.2, -r*0.3, r*0.2);
      circle(r*0.4, -r*0.2, r*0.2);
      circle(r*0.3, -r*0.05, r*0.2);
  }}
];

let btnStart, btnHowTo, btnBack;

function setup() {
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  gameAreaWidth = GAME_AREA_WIDTH_SETTING;
  textAlign(CENTER, CENTER);
  
  // ★変更点1：ハイスコアの読み込み
  // ブラウザのローカルストレージからハイスコアを読み込む
  highScore = int(getItem('highScore') || 0); 
  
  initButtons();
  setupPhysics();
  nextBallType = floor(random(0, 4));
}

function draw() {
  background(240, 248, 255);

  if (gameState === "TITLE") {
    drawTitleScreen();
  } else if (gameState === "HOWTO") {
    drawHowToScreen();
  } else if (gameState === "GAME") {
    updatePhysics();
    drawGameScreen();
  } else if (gameState === "GAMEOVER") {
    drawGameScreen();
    drawGameOverOverlay();
  }
}

function drawCommonBall(typeIdx, r) {
  let info = BALL_TYPES[typeIdx];
  push();
  fill(info.color);
  if (info.stroke) { stroke(0); strokeWeight(max(1, r * 0.03)); } else { noStroke(); }
  circle(0, 0, r * 2);

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(0, 0, r, 0, TWO_PI);
  drawingContext.clip();
  if (info.drawFunc) info.drawFunc(r);
  drawingContext.restore();
  pop();
}

function drawTitleScreen() {
  fill(0); noStroke(); textSize(60);
  text("キュウギゲーム", width / 2, height / 3);
  textSize(20);
  text("頑張ってボウリング玉を目指そう！", width / 2, height / 3 + 60);
  drawButton(btnStart); drawButton(btnHowTo);
}

function drawHowToScreen() {
  fill(0); noStroke(); textSize(40);
  text("遊び方", width / 2, 80);
  textSize(18); textAlign(LEFT, TOP);
  let msg = 
    "1. マウスを動かして位置を決め、\n   クリックでボールを落とします。\n" +
    "2. 同じボール同士をくっつけて\n   進化させてください。\n" +
    "3. ボールが「赤い点線」を超えて\n   積み上がるとゲームオーバー！\n\n" +
    "【進化順】\n" +
    "ピンポン → ゴルフ → テニス → 野球 → \n" +
    "ビリヤード → ホッケー → ハンド → バレー → \n" +
    "サッカー → バスケ → ボウリング";
  text(msg, 100, 130);
  textAlign(CENTER, CENTER);
  drawButton(btnBack);
}

function drawGameScreen() {
  // 1. 壁
  fill(100); noStroke(); rectMode(CENTER);
  for (let w of walls) {
    rect(w.position.x, w.position.y, w.bounds.max.x - w.bounds.min.x, w.bounds.max.y - w.bounds.min.y);
  }

  // デッドライン（ゲームオーバーライン）の描画
  stroke(255, 0, 0); strokeWeight(3);
  drawingContext.setLineDash([10, 10]);
  line(WALL_THICKNESS, DEAD_LINE_Y, gameAreaWidth - WALL_THICKNESS, DEAD_LINE_Y);
  drawingContext.setLineDash([]); // 点線リセット

  // 2. 物理ボール
  for (let b of balls) {
    drawPhysicsBall(b);
  }

  // 3. 投下用ボール（マウス追従）
  if (canDrop && gameState === "GAME") {
    let r = BALL_TYPES[nextBallType].r;
    // マウス位置制限（壁の内側）
    let dropX = constrain(mouseX, WALL_THICKNESS + r, gameAreaWidth - WALL_THICKNESS - r);
    
    // ガイドライン
    stroke(200); strokeWeight(1);
    drawingContext.setLineDash([5, 5]);
    line(dropX, 50, dropX, height); 
    drawingContext.setLineDash([]);

    push();
    translate(dropX, 50); // 投下位置は固定(Y=50)
    drawCommonBall(nextBallType, r);
    pop();
  }

  // 4. UI
  drawUI();
}

function drawUI() {
  stroke(0); strokeWeight(1);
  line(gameAreaWidth, 0, gameAreaWidth, height);
  noStroke(); fill(0);
  let uiCenterX = gameAreaWidth + (width - gameAreaWidth)/2;
  
  // スコアとハイスコア表示
  textSize(20); text("SCORE", uiCenterX, 40);
  textSize(30); text(score, uiCenterX, 75);
  // ★変更点1：ハイスコアの表示
  textSize(16); text("HIGH SCORE: " + highScore, uiCenterX, 105);

  // ★変更点2：次に出てくるボールの提示
  let nextBallInfo = BALL_TYPES[nextBallType];
  textSize(20); text("NEXT BALL", uiCenterX, 170);
  
  // 次のボールのアイコンを表示
  push();
  translate(uiCenterX, 220); 
  // 半分のサイズでアイコンとして表示
  drawCommonBall(nextBallType, nextBallInfo.r * 0.5); 
  // ボール名も表示
  fill(0); textSize(12);
  text(nextBallInfo.label, 0, nextBallInfo.r * 0.5 + 15);
  pop();
  
  // 進化順リスト
  textSize(16); text("進化順", uiCenterX, 270); 
  
  let startY = 300; // リストの開始位置
  for(let i=0; i<BALL_TYPES.length; i++) {
    let info = BALL_TYPES[i];
    let x = gameAreaWidth + 30;
    let y = startY + i * 30; // 間隔を詰めて表示 (30px)
    let iconR = 10; // アイコンサイズを小さく
    
    push();
    translate(x, y);
    drawCommonBall(i, iconR);
    pop();
    
    fill(0); noStroke(); textAlign(LEFT, CENTER); textSize(12);
    text(info.label, x + 20, y); 
  }
  textAlign(CENTER, CENTER);
}

function drawGameOverOverlay() {
  // ★変更点1：ハイスコアの更新と保存
  if (score > highScore) {
    highScore = score;
    storeItem('highScore', highScore);
  }
  
  fill(0, 0, 0, 150); rect(width/2, height/2, width, height);
  fill(255); textSize(50); text("GAME OVER", width/2, height/2 - 40);
  textSize(30); text("Score: " + score, width/2, height/2 + 20);
  // ハイスコア表示をゲームオーバー画面にも追加
  textSize(20); text("High Score: " + highScore, width/2, height/2 + 50);
  text("クリックでタイトルへ", width/2, height/2 + 100); 
}

function drawPhysicsBall(body) {
  let pos = body.position;
  let angle = body.angle;
  let typeIdx = body.ballType;
  let r = BALL_TYPES[typeIdx].r;

  push();
  translate(pos.x, pos.y);
  rotate(angle);
  drawCommonBall(typeIdx, r);
  pop();
}

function setupPhysics() {
  engine = Engine.create();
  world = engine.world;
  
  // 壁の作成（U字型）
  let ground = Bodies.rectangle(gameAreaWidth/2, height, gameAreaWidth, WALL_THICKNESS*2, { isStatic: true });
  let leftWall = Bodies.rectangle(0, height/2, WALL_THICKNESS, height, { isStatic: true });
  let rightWall = Bodies.rectangle(gameAreaWidth, height/2, WALL_THICKNESS, height, { isStatic: true });
  
  walls = [ground, leftWall, rightWall];
  World.add(world, walls);
  Events.on(engine, 'collisionStart', handleCollisions);
}

function updatePhysics() {
  Engine.update(engine);
  
  // ゲームオーバー判定
  for(let b of balls) {
    if(!b.isSpawning && b.position.y < DEAD_LINE_Y && Math.abs(b.velocity.y) < 0.2 && Math.abs(b.velocity.x) < 0.2) {
       gameState = "GAMEOVER";
    }
  }
}

function handleCollisions(event) {
  let pairs = event.pairs;
  for (let i = 0; i < pairs.length; i++) {
    let bodyA = pairs[i].bodyA;
    let bodyB = pairs[i].bodyB;
    if (bodyA.label === 'ball' && bodyB.label === 'ball') {
      if (bodyA.ballType === bodyB.ballType) {
        if (bodyA.isRemoved || bodyB.isRemoved) continue;
        if (bodyA.ballType === BALL_TYPES.length - 1) continue;
        mergeBalls(bodyA, bodyB);
      }
    }
  }
}

function mergeBalls(bodyA, bodyB) {
  bodyA.isRemoved = true; bodyB.isRemoved = true;
  let newX = (bodyA.position.x + bodyB.position.x) / 2;
  let newY = (bodyA.position.y + bodyB.position.y) / 2;
  let newType = bodyA.ballType + 1;
  score += BALL_TYPES[newType].score;
  World.remove(world, bodyA); World.remove(world, bodyB);
  balls = balls.filter(b => b !== bodyA && b !== bodyB);
  createNewBall(newX, newY, newType, false);
}

function createNewBall(x, y, typeIndex, isSpawning) {
  let info = BALL_TYPES[typeIndex];
  let ball = Bodies.circle(x, y, info.r, {
    restitution: 0.3, 
    friction: 0.1, 
    // ★変更点3：密度をボールの種類に応じて設定
    density: info.density, 
    label: 'ball'
  });
  ball.ballType = typeIndex;
  ball.isSpawning = isSpawning;
  
  // 生成直後の無敵時間
  if(isSpawning) { setTimeout(() => { ball.isSpawning = false; }, 2000); }
  
  balls.push(ball);
  World.add(world, ball);
}

function mouseClicked() {
  if (gameState === "TITLE") {
    if (isMouseOver(btnStart)) { 
      resetGame(); 
      gameState = "GAME";
      
      // ★変更点2：0.2秒後にボール投下を許可する
      setTimeout(() => { canDrop = true; }, 200); 
      
      return; 
    }
    if (isMouseOver(btnHowTo)) {
      gameState = "HOWTO";
      return; 
    }
  } else if (gameState === "HOWTO") {
    if (isMouseOver(btnBack)) {
      gameState = "TITLE";
      return; 
    }
  } 
  
  // ★重要修正点：GAMEステートかつ投下エリア内のクリックのみ、ボール投下を許可
  if (gameState === "GAME") { // <-- ステートの確認を追加
    if (canDrop && mouseX < gameAreaWidth) {
      dropBall();
      return; // 投下処理後、ここで処理を終了
    }
  } 
  
  // ゲームオーバー画面でのクリックはタイトルへ遷移
  if (gameState === "GAMEOVER") {
    gameState = "TITLE";
  }
}

// touchStarted 関数はそのまま残してください
function touchStarted() {
  // mouseClicked と同じロジックを呼び出す
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    mouseClicked();
  }
  return false;
}

function dropBall() {
  canDrop = false;
  let r = BALL_TYPES[nextBallType].r;
  let dropX = constrain(mouseX, WALL_THICKNESS + r, gameAreaWidth - WALL_THICKNESS - r);
  
  createNewBall(dropX, 50, nextBallType, true);
  
  // 次のボール
  nextBallType = floor(random(0, 4));
  
  // ★変更点3：次の投下可能までの時間を確認 (800ms)
  setTimeout(() => { canDrop = true; }, 800);
}

function resetGame() {
  for (let b of balls) World.remove(world, b);
  balls = []; 
  score = 0; 
  nextBallType = floor(random(0, 4)); 
  
  // ★変更点1：初期状態では投下不可(false)にする
  canDrop = false; 
}

function initButtons() {
  btnStart = { x: width/2, y: height/2 + 20, w: 200, h: 50, label: "スタート" };
  btnHowTo = { x: width/2, y: height/2 + 90, w: 200, h: 50, label: "遊び方" };
  btnBack  = { x: width/2, y: height - 80, w: 200, h: 50, label: "戻る" };
}

function drawButton(btn) {
  fill(255); stroke(0); strokeWeight(2); rectMode(CENTER);
  if (isMouseOver(btn)) fill(220);
  rect(btn.x, btn.y, btn.w, btn.h, 10);
  fill(0); noStroke(); textSize(20); text(btn.label, btn.x, btn.y);
}

function isMouseOver(btn) {
  return mouseX>btn.x-btn.w/2 && mouseX<btn.x+btn.w/2 && mouseY>btn.y-btn.h/2 && mouseY<btn.y+btn.h/2;
}

// --- タッチイベントの追加 ---
// スマートフォンでのタッチ操作に対応するために touchStarted を実装
function touchStarted() {
  // mouseClicked と同じロジックを呼び出す
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    mouseClicked();
  }
  
  // スマホでブラウザのスクロールを防ぐため、必ず false を返す
  return false;
}

// 既存の mouseClicked 関数（ロジックに変更は不要です）
// function mouseClicked() {
//   // ... 既存のロジック
// }