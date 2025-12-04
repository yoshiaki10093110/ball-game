// --- Matter.js モジュールのエイリアス ---
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;

// --- グローバル変数 ---
let engine;
let world;
let balls = [];
let walls = [];
let nextBallType = 0;
let score = 0;
let highScore = 0; 
let gameState = "TITLE"; 
let canDrop = false;

// 画面サイズ管理用
let gameAreaWidth; // 箱の幅
let wallThickness = 20;
let groundY; 
let deadLineY = 130;

// --- ボールデータ ---
// ここでボールの見た目、大きさ、重さなどを設定しています
const BALL_TYPES = [
  // ==========================================
  // 【0: ピンポン玉】 (一番小さい)
  // ==========================================
  { 
    r: 15,              // 半径
    color: "#FF8C00",   // 色（オレンジ）
    label: "PingPong",  // 名前
    score: 1,           // 結合時のスコア
    density: 1.0,       // 密度（重さの基準）
    stroke: true        // 黒いフチをつける
  },
  
  // ==========================================
  // 【1: ゴルフボール】 (小さいが少し重い)
  // ==========================================
  { 
    r: 20, 
    color: "#FFFFFF", 
    label: "Golf", 
    score: 3, 
    density: 2.0,       // 小さいけど重く設定
    stroke: true,
    // 表面のボコボコ（ディンプル）を描画する関数
    drawFunc: (r) => {
      fill(200); noStroke();
      // 8x8の格子状に小さな円を描いてディンプルを表現
      for(let i=0; i<8; i++) {
        for(let j=0; j<8; j++) {
          circle(map(i,0,7,-r*0.7,r*0.7), map(j,0,7,-r*0.7,r*0.7), r*0.1);
        }
      }
    }
  },
  
  // ==========================================
  // 【2: テニスボール】
  // ==========================================
  { 
    r: 28, 
    color: "#DFFF00", // 蛍光イエロー
    label: "Tennis", 
    score: 6, 
    density: 1.5,
    // 白い曲線を描画
    drawFunc: (r) => {
      noFill(); stroke(255); strokeWeight(r*0.1);
      arc(-r*0.6, 0, r*1.5, r*1.5, -PI/4, PI/4); 
      arc(r*0.6, 0, r*1.5, r*1.5, PI*0.75, PI*1.25);
    }
  },
  
  // ==========================================
  // 【3: 野球ボール】
  // ==========================================
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
  
  // ==========================================
  // 【4: ビリヤードボール (8番)】
  // ==========================================
  { 
    r: 45, 
    color: "#222222", // 黒
    label: "Billiard", 
    score: 15, 
    density: 2.5,     // かなり重く設定
    // 白い円の中に数字の「8」を描く
    drawFunc: (r) => {
      fill(255); noStroke(); circle(0,0, r*0.8); 
      fill(0); textAlign(CENTER, CENTER); textSize(r*0.6); 
      textStyle(BOLD); text("8", 0, 0); textStyle(NORMAL);
    }
  },
  
  // ==========================================
  // 【5: ホッケーボール】
  // ==========================================
  { 
    r: 55, 
    color: "#FF6600", // オレンジ
    label: "Hockey", 
    score: 21, 
    density: 2.3,
    // 少しランダムに窪みを描く
    drawFunc: (r) => {
      fill(255, 100); noStroke(); 
      for(let i=0; i<5; i++) circle(random(-r/2,r/2), random(-r/2,r/2), r*0.2);
    }
  },
  
  // ==========================================
  // 【6: ハンドボール】
  // ==========================================
  { 
    r: 68, 
    color: "#0044FF", // 青
    label: "Hand", 
    score: 28, 
    density: 1.0,
    // パネル模様（六角形のようなライン）を描く
    drawFunc: (r) => {
      noFill(); stroke(255); strokeWeight(r*0.03); 
      beginShape(); 
      for(let i=0; i<6; i++) { 
        let angle=TWO_PI/6*i; 
        vertex(cos(angle)*r*0.6, sin(angle)*r*0.6); 
        line(cos(angle)*r*0.6, sin(angle)*r*0.6, cos(angle)*r, sin(angle)*r); 
      } 
      endShape(CLOSE);
    }
  },
  
  // ==========================================
  // 【7: バレーボール】
  // ==========================================
  { 
    r: 80, 
    color: "#FFD700", // 黄色ベース
    label: "Volley", 
    score: 36, 
    density: 0.8,     // 大きさの割に軽い
    // 青と白の曲線パターンを描く
    drawFunc: (r) => {
      noFill(); strokeWeight(r*0.05); 
      stroke(0,0,255); arc(0, 0, r*1.8, r*1.8, 0, PI/2); 
      stroke(255); arc(0, 0, r*1.8, r*1.8, PI/2, PI); 
      stroke(0,0,255); arc(0, 0, r*1.8, r*1.8, PI, PI*1.5); 
      stroke(255); arc(0, 0, r*1.8, r*1.8, PI*1.5, TWO_PI); 
      stroke(255,255,0); line(-r,0,r,0); line(0,-r,0,r);
    }
  },
  
  // ==========================================
  // 【8: サッカーボール】
  // ==========================================
  { 
    r: 95, 
    color: "#FFFFFF", 
    label: "Soccer", 
    score: 45, 
    density: 1.2, 
    stroke: true,
    // 五角形の黒い模様を描く
    drawFunc: (r) => {
      fill(0); noStroke(); 
      // 中央の五角形
      beginShape(); for(let i=0;i<5;i++){vertex(cos(TWO_PI/5*i-PI/2)*r*0.3, sin(TWO_PI/5*i-PI/2)*r*0.3);} endShape(CLOSE);
      // 周囲の五角形の一部
      for(let i=0;i<5;i++){ 
        let ang=TWO_PI/5*i-PI/2; 
        let x=cos(ang)*r*0.8; let y=sin(ang)*r*0.8; 
        beginShape(); for(let j=0;j<5;j++){vertex(x+cos(TWO_PI/5*j+ang)*r*0.2, y+sin(TWO_PI/5*j+ang)*r*0.2);} endShape(CLOSE); 
      }
    }
  },
  
  // ==========================================
  // 【9: バスケットボール】
  // ==========================================
  { 
    r: 110, 
    color: "#FF7700", // オレンジ
    label: "Basket", 
    score: 55, 
    density: 1.1, 
    stroke: true,
    // 黒いラインを描く
    drawFunc: (r) => {
      noFill(); stroke(0); strokeWeight(r*0.05); 
      line(-r,0,r,0); line(0,-r,0,r); 
      arc(-r*0.7, 0, r, r*1.5, -PI/3, PI/3); 
      arc(r*0.7, 0, r, r*1.5, PI*0.66, PI*1.33);
    }
  },
  
  // ==========================================
  // 【10: ボウリング玉】 (最大・最重量)
  // ==========================================
  { 
    r: 130, 
    color: "#3B1E56", // 紫マーブル
    label: "Bowling", 
    score: 66, 
    density: 3.0,     // 非常に重い
    // 指を入れる穴を描く
    drawFunc: (r) => {
      fill(100, 50, 150, 100); noStroke(); 
      circle(r*0.3, -r*0.3, r*0.8); circle(-r*0.4, r*0.2, r); 
      fill(20); 
      circle(r*0.2, -r*0.3, r*0.2); 
      circle(r*0.4, -r*0.2, r*0.2); 
      circle(r*0.3, -r*0.05, r*0.2);
    }
  }
];

let btnStart, btnHowTo, btnBack;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  highScore = int(getItem('highScore') || 0);
  
  engine = Engine.create();
  world = engine.world;
  Events.on(engine, 'collisionStart', handleCollisions);

  calculateLayout();
  
  nextBallType = floor(random(0, 4));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateLayout();
}

// 画面サイズに応じてレイアウトを計算する関数
function calculateLayout() {
  let isMobile = width < 768; // スマホ判定

  // 箱の幅設定
  if (isMobile) {
    gameAreaWidth = width * 0.95; // スマホは画面いっぱい
    deadLineY = 180; // UIが上に来る分、デッドラインを下げる
  } else {
    gameAreaWidth = 480; // PCは固定幅
    deadLineY = 130;
  }
  
  groundY = height;

  // ボタン位置
  btnStart = { x: width/2, y: height/2 + 20, w: 200, h: 50, label: "スタート" };
  btnHowTo = { x: width/2, y: height/2 + 90, w: 200, h: 50, label: "遊び方" };
  btnBack  = { x: width/2, y: height - 80, w: 200, h: 50, label: "戻る" };

  // 壁の再配置
  if (walls.length > 0) World.remove(world, walls);
  
  let centerX = width / 2;
  let ground = Bodies.rectangle(centerX, groundY, gameAreaWidth, wallThickness*2, { isStatic: true });
  let leftWall = Bodies.rectangle(centerX - gameAreaWidth/2 - wallThickness/2, groundY/2, wallThickness, groundY, { isStatic: true });
  let rightWall = Bodies.rectangle(centerX + gameAreaWidth/2 + wallThickness/2, groundY/2, wallThickness, groundY, { isStatic: true });
  
  walls = [ground, leftWall, rightWall];
  World.add(world, walls);
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

function drawGameScreen() {
  // 壁の描画
  fill(100); noStroke(); rectMode(CENTER);
  for (let w of walls) {
    rect(w.position.x, w.position.y, w.bounds.max.x - w.bounds.min.x, w.bounds.max.y - w.bounds.min.y);
  }

  // デッドライン
  let centerX = width / 2;
  stroke(255, 0, 0); strokeWeight(3);
  drawingContext.setLineDash([10, 10]);
  line(centerX - gameAreaWidth/2, deadLineY, centerX + gameAreaWidth/2, deadLineY);
  drawingContext.setLineDash([]);

  // ボール描画
  for (let b of balls) {
    drawPhysicsBall(b);
  }

  // 投下用ボール
  if (canDrop && gameState === "GAME") {
    let r = BALL_TYPES[nextBallType].r;
    let minX = centerX - gameAreaWidth/2 + wallThickness + r;
    let maxX = centerX + gameAreaWidth/2 - wallThickness - r;
    // スマホでも操作しやすいよう、タッチ位置を制限
    let dropX = constrain(mouseX, minX, maxX);
    
    stroke(200); strokeWeight(1);
    drawingContext.setLineDash([5, 5]);
    line(dropX, 50, dropX, height); 
    drawingContext.setLineDash([]);

    push();
    translate(dropX, 80); 
    drawCommonBall(nextBallType, r);
    pop();
  }

  drawResponsiveUI();
}

// ★PCとスマホで表示位置を切り替えるUI描画関数★
function drawResponsiveUI() {
  let isMobile = width < 768;
  noStroke(); fill(0);
  
  let nextInfo = BALL_TYPES[nextBallType];

  if (!isMobile) {
    // ================= PC用レイアウト =================
    // スコア: 左上
    textAlign(LEFT, TOP);
    textSize(24); text("SCORE: " + score, 40, 40);
    textSize(16); text("HIGH SCORE: " + highScore, 40, 70);

    // NEXTボール: 右上
    textAlign(RIGHT, TOP);
    textSize(24); text("NEXT", width - 40, 40);
    push();
    translate(width - 60, 100);
    drawCommonBall(nextBallType, nextInfo.r * 0.8);
    pop();
    textSize(14); text(nextInfo.label, width - 40, 150);

    // 進化順リスト: 右下
    textAlign(RIGHT, BOTTOM);
    textSize(16); text("進化順", width - 40, height - 30);
    
    let startX = width - 40;
    let startY = height - 60;
    for(let i=0; i<BALL_TYPES.length; i++) {
        let bx = startX - 20;
        let by = startY - i * 35;
        push(); translate(bx, by); drawCommonBall(i, 12); pop();
        textAlign(RIGHT, CENTER); textSize(12); fill(0);
        text(BALL_TYPES[i].label, bx - 20, by);
    }

  } else {
    // ================= スマホ用レイアウト =================
    // スコア: 画面上部・中央
    textAlign(CENTER, TOP);
    textSize(24); text(score, width/2, 40);
    textSize(12); text("HI: " + highScore, width/2, 70);

    // NEXTボール: 右上（少し小さめ）
    textAlign(RIGHT, TOP);
    textSize(14); text("NEXT", width - 20, 20);
    push();
    translate(width - 40, 60);
    drawCommonBall(nextBallType, 20); 
    pop();

    // 進化順リスト: 左上（コンパクトに）
    textAlign(LEFT, TOP);
    textSize(14); text("進化順", 20, 20);
    
    let startY = 50;
    for(let i=0; i<BALL_TYPES.length; i++) {
        let bx = 30;
        let by = startY + i * 22; 
        push(); translate(bx, by); drawCommonBall(i, 8); pop();
        textAlign(LEFT, CENTER); textSize(10); fill(0);
        text(BALL_TYPES[i].label, bx + 15, by);
    }
  }
}

function drawTitleScreen() {
  fill(0); noStroke(); textAlign(CENTER, CENTER);
  textSize(min(60, width/8)); 
  text("キュウギゲーム", width / 2, height / 3);
  textSize(min(20, width/20));
  text("ボールをくっつけてボウリング玉を目指そう！", width / 2, height / 3 + 60);
  drawButton(btnStart); drawButton(btnHowTo);
}

function drawHowToScreen() {
  fill(0); noStroke(); textAlign(CENTER, CENTER);
  textSize(40); text("遊び方", width / 2, 80);
  textSize(min(18, width/25)); textAlign(LEFT, TOP);
  let msg = 
    "1. タップ/クリックでボール投下\n" +
    "2. 同じボールで進化\n" +
    "3. 赤い線を越えたら終了\n\n" +
    "【進化順】\n" +
    "ピンポン → ゴルフ → テニス → \n" +
    "野球 → ビリヤード → ホッケー → \n" +
    "ハンド → バレー → サッカー → \n" +
    "バスケ → ボウリング";
  let textX = width < 768 ? width * 0.1 : width/2 - 200;
  text(msg, textX, 130);
  textAlign(CENTER, CENTER);
  drawButton(btnBack);
}

function drawGameOverOverlay() {
  if (score > highScore) { highScore = score; storeItem('highScore', highScore); }
  fill(0, 0, 0, 150); rect(width/2, height/2, width, height);
  fill(255); textAlign(CENTER, CENTER);
  textSize(50); text("GAME OVER", width/2, height/2 - 40);
  textSize(30); text("Score: " + score, width/2, height/2 + 20);
  textSize(20); text("High Score: " + highScore, width/2, height/2 + 60);
  text("タップしてタイトルへ", width/2, height/2 + 120); 
}

function drawCommonBall(typeIdx, r) {
  let info = BALL_TYPES[typeIdx];
  push();
  fill(info.color);
  if (info.stroke) { stroke(0); strokeWeight(max(1, r * 0.03)); } else { noStroke(); }
  circle(0, 0, r * 2);
  drawingContext.save(); drawingContext.beginPath(); drawingContext.arc(0, 0, r, 0, TWO_PI); drawingContext.clip();
  if (info.drawFunc) info.drawFunc(r);
  drawingContext.restore();
  pop();
}

function drawPhysicsBall(body) {
  let pos = body.position;
  let angle = body.angle;
  let typeIdx = body.ballType;
  let r = BALL_TYPES[typeIdx].r;
  push(); translate(pos.x, pos.y); rotate(angle); drawCommonBall(typeIdx, r); pop();
}

function updatePhysics() {
  Engine.update(engine);
  for(let b of balls) {
    if(!b.isSpawning && b.position.y < deadLineY && Math.abs(b.velocity.y) < 0.2 && Math.abs(b.velocity.x) < 0.2) {
       gameState = "GAMEOVER";
    }
  }
}

function handleCollisions(event) {
  let pairs = event.pairs;
  for (let i = 0; i < pairs.length; i++) {
    let bodyA = pairs[i].bodyA; let bodyB = pairs[i].bodyB;
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
  let ball = Bodies.circle(x, y, info.r, { restitution: 0.3, friction: 0.1, density: info.density, label: 'ball' });
  ball.ballType = typeIndex; ball.isSpawning = isSpawning;
  if(isSpawning) { setTimeout(() => { ball.isSpawning = false; }, 2000); }
  balls.push(ball); World.add(world, ball);
}

function resetGame() {
  for (let b of balls) World.remove(world, b);
  balls = []; score = 0; nextBallType = floor(random(0, 4)); canDrop = false;
}

function dropBall() {
  canDrop = false;
  let r = BALL_TYPES[nextBallType].r;
  let centerX = width / 2;
  let minX = centerX - gameAreaWidth/2 + wallThickness + r;
  let maxX = centerX + gameAreaWidth/2 - wallThickness - r;
  let dropX = constrain(mouseX, minX, maxX);
  
  createNewBall(dropX, 80, nextBallType, true);
  nextBallType = floor(random(0, 4));
  setTimeout(() => { canDrop = true; }, 800);
}

// 入力処理（ボタンの誤反応を防ぐロジック入り）
function mouseClicked() {
  if (gameState === "TITLE") {
    if (isMouseOver(btnStart)) { 
      resetGame(); gameState = "GAME"; 
      setTimeout(() => { canDrop = true; }, 500); // 誤操作防止のため少し待つ
      return; 
    }
    if (isMouseOver(btnHowTo)) { gameState = "HOWTO"; return; }
  } else if (gameState === "HOWTO") {
    if (isMouseOver(btnBack)) { gameState = "TITLE"; return; }
  } 
  
  if (gameState === "GAME") {
    let centerX = width / 2;
    // 箱の内部（横幅）の範囲内でのみ反応させる
    if (canDrop && mouseX > centerX - gameAreaWidth/2 && mouseX < centerX + gameAreaWidth/2) {
      dropBall();
      return;
    }
  } 
  
  if (gameState === "GAMEOVER") { gameState = "TITLE"; }
}

// スマホのタッチ対応
function touchStarted() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) { mouseClicked(); }
  return false;
}

function initButtons() {
  // 初期化は calculateLayout で行うため空でOK
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