const renderStates = new WeakMap();
const TICK_MS = 135;
const PLAYER_VIEW_COLUMNS = 44;
const PLAYER_VIEW_ROWS = 28;
const FOOD_COLORS = ["#facc15", "#38bdf8", "#fb7185"];

export function renderMathSnake(canvas, state, playerId) {
  if (!canvas || !state) return;

  let view = renderStates.get(canvas);
  if (!view) {
    view = {
      previous: state,
      state,
      receivedAt: performance.now(),
      lastUpdateAt: 0,
      transitionMs: TICK_MS,
      camera: null,
      lastFrameAt: 0,
      frameId: 0
    };
    renderStates.set(canvas, view);
  } else if (view.state !== state) {
    const now = performance.now();
    view.previous = view.state;
    view.state = state;
    view.transitionMs = view.lastUpdateAt
      ? Math.max(100, Math.min(220, now - view.lastUpdateAt))
      : TICK_MS;
    view.lastUpdateAt = now;
    view.receivedAt = now;
  }

  if (!view.frameId) {
    view.frameId = requestAnimationFrame((time) => drawFrame(canvas, view, playerId, time));
  }
}

function drawFrame(canvas, view, playerId, time) {
  view.frameId = 0;
  if (!canvas.isConnected) return;

  const state = view.state;
  if (!state || !state.gridWidth || !state.gridHeight) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    view.frameId = requestAnimationFrame((nextTime) => drawFrame(canvas, view, playerId, nextTime));
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(rect.width * dpr);
  const pixelHeight = Math.round(rect.height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  paintArena(ctx, rect.width, rect.height, state, view, playerId, time);

  view.lastFrameAt = time;
  view.frameId = requestAnimationFrame((nextTime) => drawFrame(canvas, view, playerId, nextTime));
}

function paintArena(ctx, width, height, state, view, playerId, time) {
  const worldWidth = state.gridWidth;
  const worldHeight = state.gridHeight;
  const isPlayerView = playerId !== null && playerId !== undefined;
  const viewColumns = isPlayerView ? Math.min(PLAYER_VIEW_COLUMNS, worldWidth) : worldWidth;
  const viewRows = isPlayerView ? Math.min(PLAYER_VIEW_ROWS, worldHeight) : worldHeight;
  const cellSize = Math.min(width / viewColumns, height / viewRows);
  const offsetX = (width - viewColumns * cellSize) / 2;
  const offsetY = (height - viewRows * cellSize) / 2;

  const progress = Math.min(1, Math.max(0, (time - view.receivedAt) / view.transitionMs));
  const easedProgress = progress * progress * (3 - 2 * progress);
  const activeSnake = isPlayerView ? state.players.find((snake) => snake.id === playerId) : null;
  const activeHead = activeSnake?.segments?.[0];
  const targetX = activeHead ? activeHead.x + 0.5 : worldWidth / 2;
  const targetY = activeHead ? activeHead.y + 0.5 : worldHeight / 2;

  if (!view.camera) view.camera = { x: targetX, y: targetY };
  if (isPlayerView) {
    const minX = Math.min(viewColumns / 2, worldWidth / 2);
    const maxX = Math.max(minX, worldWidth - viewColumns / 2);
    const minY = Math.min(viewRows / 2, worldHeight / 2);
    const maxY = Math.max(minY, worldHeight - viewRows / 2);
    const desiredX = clamp(targetX, minX, maxX);
    const desiredY = clamp(targetY, minY, maxY);
    const elapsed = view.lastFrameAt ? Math.min(80, time - view.lastFrameAt) : 16;
    const follow = 1 - Math.exp(-elapsed / 75);
    view.camera.x += (desiredX - view.camera.x) * follow;
    view.camera.y += (desiredY - view.camera.y) * follow;
  } else {
    view.camera.x = worldWidth / 2;
    view.camera.y = worldHeight / 2;
  }

  const worldLeft = isPlayerView ? view.camera.x - viewColumns / 2 : 0;
  const worldTop = isPlayerView ? view.camera.y - viewRows / 2 : 0;
  const toX = (x) => offsetX + (x - worldLeft) * cellSize;
  const toY = (y) => offsetY + (y - worldTop) * cellSize;
  const right = offsetX + viewColumns * cellSize;
  const bottom = offsetY + viewRows * cellSize;

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#050817");
  background.addColorStop(0.52, "#070b1c");
  background.addColorStop(1, "#050817");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, offsetY, viewColumns * cellSize, viewRows * cellSize);
  ctx.clip();
  ctx.fillStyle = "rgba(8, 13, 34, 0.34)";
  ctx.fillRect(offsetX, offsetY, viewColumns * cellSize, viewRows * cellSize);

  const gridStep = Math.max(1, Math.ceil(viewColumns / 28));
  ctx.beginPath();
  for (let x = Math.ceil(worldLeft / gridStep) * gridStep; x <= worldLeft + viewColumns; x += gridStep) {
    const px = toX(x);
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, bottom);
  }
  for (let y = Math.ceil(worldTop / gridStep) * gridStep; y <= worldTop + viewRows; y += gridStep) {
    const py = toY(y);
    ctx.moveTo(offsetX, py);
    ctx.lineTo(right, py);
  }
  ctx.strokeStyle = "rgba(75, 103, 161, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawArenaBorder(ctx, toX, toY, cellSize, worldWidth, worldHeight);
  drawResources(ctx, state.resources, toX, toY, cellSize, time);
  for (const snake of state.players) {
    if (!snake.connected || !snake.segments?.length) continue;
    const previousSnake = view.previous?.players?.find((item) => item.id === snake.id);
    const points = interpolateSegments(snake, previousSnake, easedProgress);
    drawSnake(ctx, snake, points, toX, toY, cellSize, time, snake.id === playerId);
  }
  ctx.restore();

  const shade = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.72);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "rgba(1, 7, 15, 0.34)");
  ctx.fillStyle = shade;
  ctx.fillRect(offsetX, offsetY, viewColumns * cellSize, viewRows * cellSize);

  if (isPlayerView) drawLocalViewLabel(ctx, activeSnake, width, height);
}

function interpolateSegments(snake, previousSnake, progress) {
  const segments = snake.segments;
  const oldSegments = previousSnake?.segments;
  if (!oldSegments?.length || progress >= 1) {
    return segments.map((segment) => ({ x: segment.x + 0.5, y: segment.y + 0.5 }));
  }

  return segments.map((segment, index) => {
    const from = oldSegments[index === 0 ? 0 : Math.min(index - 1, oldSegments.length - 1)] ?? oldSegments[oldSegments.length - 1];
    return {
      x: from.x + 0.5 + (segment.x - from.x) * progress,
      y: from.y + 0.5 + (segment.y - from.y) * progress
    };
  });
}

function drawArenaBorder(ctx, toX, toY, cellSize, worldWidth, worldHeight) {
  ctx.save();
  ctx.shadowColor = "#5267ff";
  ctx.shadowBlur = Math.min(18, cellSize * 0.8);
  ctx.strokeStyle = "rgba(75, 104, 255, 0.56)";
  ctx.lineWidth = Math.max(1.5, cellSize * 0.12);
  ctx.strokeRect(toX(0), toY(0), worldWidth * cellSize, worldHeight * cellSize);
  ctx.restore();
}

function drawResources(ctx, resources, toX, toY, cellSize, time) {
  for (const resource of resources) {
    const pulse = 0.9 + 0.1 * Math.sin(time / 230 + (resource.id ?? resource.x * 17 + resource.y));
    const radius = cellSize * 0.24 * pulse;
    const x = toX(resource.x + 0.5);
    const y = toY(resource.y + 0.5);
    const color = FOOD_COLORS[resource.kind] ?? FOOD_COLORS[0];
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.min(16, cellSize * 0.75);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.25, y - radius * 0.28, radius * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSnake(ctx, snake, points, toX, toY, cellSize, time, isMine) {
  const head = points[0];
  if (!head) return;
  const x = toX(head.x);
  const y = toY(head.y);
  const color = snake.color || "#38bdf8";
  const blinking = snake.invulnerableTicks > 0 && Math.floor(time / 110) % 2 === 0;

  ctx.save();
  if (blinking) ctx.globalAlpha = 0.48;
  ctx.beginPath();
  ctx.moveTo(toX(points[0].x), toY(points[0].y));
  for (let index = 1; index < points.length - 1; index++) {
    const currentX = toX(points[index].x);
    const currentY = toY(points[index].y);
    const nextX = toX(points[index + 1].x);
    const nextY = toY(points[index + 1].y);
    ctx.quadraticCurveTo(currentX, currentY, (currentX + nextX) / 2, (currentY + nextY) / 2);
  }
  if (points.length > 1) ctx.lineTo(toX(points.at(-1).x), toY(points.at(-1).y));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(2, 10, 23, 0.82)";
  ctx.lineWidth = cellSize * 0.9;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = cellSize * 0.68;
  ctx.shadowColor = color;
  ctx.shadowBlur = isMine ? Math.min(18, cellSize * 0.65) : Math.min(10, cellSize * 0.36);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const headRadius = cellSize * 0.39;
  const headFill = ctx.createRadialGradient(x - headRadius * 0.34, y - headRadius * 0.42, headRadius * 0.08, x, y, headRadius * 1.12);
  headFill.addColorStop(0, "#ffffff");
  headFill.addColorStop(0.2, color);
  headFill.addColorStop(1, shadeColor(color, -42));
  ctx.fillStyle = headFill;
  ctx.beginPath();
  ctx.arc(x, y, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isMine ? "#ffffff" : "rgba(255,255,255,0.72)";
  ctx.lineWidth = Math.max(1.5, cellSize * 0.09);
  ctx.stroke();

  drawEyes(ctx, x, y, headRadius, snake.dir);
  if (snake.answeringMath) {
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = Math.max(2, cellSize * 0.12);
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, headRadius * 1.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  drawNameTag(ctx, snake, x, y, cellSize, isMine);
  ctx.restore();
}

function drawEyes(ctx, x, y, radius, direction) {
  const facing = {
    right: { x: 1, y: 0 },
    left: { x: -1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 }
  }[direction] ?? { x: 1, y: 0 };
  const forward = radius * 0.28;
  const side = radius * 0.34;
  const eyeRadius = Math.max(1.5, radius * 0.16);
  for (const sign of [-1, 1]) {
    const ex = x + facing.x * forward - facing.y * side * sign;
    const ey = y + facing.y * forward + facing.x * side * sign;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#102033";
    ctx.beginPath();
    ctx.arc(ex + facing.x * eyeRadius * 0.18, ey + facing.y * eyeRadius * 0.18, eyeRadius * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNameTag(ctx, snake, x, y, cellSize, isMine) {
  const label = snake.answeringMath ? `🧮 ${snake.name}` : snake.name;
  ctx.font = `700 ${Math.max(11, Math.min(15, cellSize * 0.58))}px "Noto Sans TC", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(label).width;
  const tagWidth = textWidth + 18;
  const tagHeight = Math.max(20, cellSize * 0.85);
  const tagX = x - tagWidth / 2;
  const tagY = y - cellSize * 0.9 - tagHeight;
  ctx.fillStyle = isMine ? "rgba(14, 116, 144, 0.92)" : "rgba(7, 18, 33, 0.86)";
  roundedRect(ctx, tagX, tagY, tagWidth, tagHeight, tagHeight / 2);
  ctx.fill();
  ctx.strokeStyle = isMine ? "rgba(165, 243, 252, 0.86)" : "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x, tagY + tagHeight / 2 + 0.5);
}

function drawLocalViewLabel(ctx, snake, width, height) {
  const text = snake ? `📍 ${snake.name} 的附近視野` : "📍 個人局部視野";
  ctx.save();
  ctx.font = "700 12px \"Noto Sans TC\", sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const boxWidth = ctx.measureText(text).width + 24;
  const x = Math.max(10, width - boxWidth - 14);
  const y = height - 40;
  ctx.fillStyle = "rgba(5, 18, 31, 0.78)";
  roundedRect(ctx, x, y, boxWidth, 26, 13);
  ctx.fill();
  ctx.strokeStyle = "rgba(103, 232, 209, 0.42)";
  ctx.stroke();
  ctx.fillStyle = "#cffafe";
  ctx.fillText(text, x + 12, y + 13);
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function shadeColor(hex, amount) {
  const value = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(value)) return hex;
  const channels = [0, 2, 4].map((index) => clamp(parseInt(value.slice(index, index + 2), 16) + amount, 0, 255));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
