'use client';

import { useEffect, useRef } from 'react';
import Header from '@/app/components/Header';

export default function CurlingPage() {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    // All game logic
    const boardNumbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    const sortedScores = [...boardNumbers].sort((a: number, b: number) => b - a);

    let playerNames: { [key: number]: string } = { 1: "Red Player", 2: "Blue Player" };
    let activeTeam = 1;
    let lastScorer = 1;
    let dartsLeft: { [key: number]: number } = { 1: 8, 2: 8 };
    let gameScore: { [key: number]: number } = { 1: 0, 2: 0 };
    let currentEnd = 1;
    let boardState: any = {};
    let activeBlocks: any = {};
    let history: any[] = [];
    let endScores: any[] = [];

    function getPlayerName(team: number) {
      const input = document.getElementById(`name-t${team}`) as HTMLInputElement;
      return input && input.value.trim() ? input.value.trim() : playerNames[team];
    }

    function updatePlayerNameDisplays() {
      playerNames[1] = getPlayerName(1);
      playerNames[2] = getPlayerName(2);
      const display1 = document.getElementById('name-display-t1');
      const display2 = document.getElementById('name-display-t2');
      const table1 = document.getElementById('table-name-t1');
      const table2 = document.getElementById('table-name-t2');

      if (display1) display1.innerText = playerNames[1].toUpperCase();
      if (display2) display2.innerText = playerNames[2].toUpperCase();
      if (table1) table1.innerText = playerNames[1];
      if (table2) table2.innerText = playerNames[2];
    }

    function createPath(group: SVGGElement, iR: number, oR: number, val: number, zone: string, rot: number, midR: number, rank: number) {
      const id = `${val}-${zone.replace(/\s+/g, '')}`;
      const rad = (rot + 9) * Math.PI / 180;
      boardState[id] = { t1: 0, t2: 0, val, zone, x: midR * Math.cos(rad), y: midR * Math.sin(rad), rank, blockOwner: 0 };
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${iR} 0 L ${oR} 0 A ${oR} ${oR} 0 0 1 ${oR * Math.cos(0.314)} ${oR * Math.sin(0.314)} L ${iR * Math.cos(0.314)} ${iR * Math.sin(0.314)} A ${iR} ${iR} 0 0 0 ${iR} 0 Z`);
      path.setAttribute("class", "segment");
      path.setAttribute("id", `seg-${id}`);
      path.onclick = (e) => { e.preventDefault(); handleHit(id); };
      group.appendChild(path);
    }

    function createBull(r: number, zone: string, rank: number) {
      const id = zone.replace(/\s+/g, '');
      boardState[id] = { t1: 0, t2: 0, val: 0, zone, x: 0, y: 0, rank, blockOwner: 0 };
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", String(r));
      c.setAttribute("class", "segment");
      c.setAttribute("id", `seg-${id}`);
      c.onclick = (e) => { e.preventDefault(); handleHit(id); };
      const layer = document.getElementById('segments-layer');
      if (layer) layer.appendChild(c);
    }

    function handleHit(id: string) {
      if (dartsLeft[activeTeam] <= 0) return;
      updatePlayerNameDisplays();
      const state = boardState[id];
      const current = activeTeam;
      const opp = current === 1 ? 2 : 1;
      const log = document.getElementById('log');
      const playerName = playerNames[current];
      let actionDesc = "";

      if (state.val > 0 && activeBlocks[state.val] === opp && state.zone !== "Large Single" && state.zone !== "Double") {
        actionDesc = `${playerName}: BLOCKED - ${state.val} ${state.zone}`;
        saveHistory(actionDesc);
        if (log) log.innerHTML = `<span style="color:#ff6b6b;font-weight:bold;">${actionDesc} (Dead Dart)</span><br>` + log.innerHTML;
        showRemoveDartsNotice();
      } else if (state.rank === 888) {
        actionDesc = `${playerName}: K.O. ${state.val}`;
        saveHistory(actionDesc);
        triggerKO(state.val);
        if (log) log.innerHTML = `<span style="color:#ffd700;font-weight:bold;">${actionDesc}!</span><br>` + log.innerHTML;
        showRemoveDartsNotice();
      } else if (state.rank === -1) {
        if (state.blockOwner === opp) {
          actionDesc = `${playerName}: Cleared block on ${state.val}`;
          saveHistory(actionDesc);
          toggleBlock(state, 0);
          if (log) log.innerHTML = `${actionDesc}<br>` + log.innerHTML;
        } else {
          actionDesc = `${playerName}: Blocking ${state.val}`;
          saveHistory(actionDesc);
          toggleBlock(state, current);
          if (log) log.innerHTML = `${actionDesc}<br>` + log.innerHTML;
        }
      } else {
        if (state[`t${opp}`] > 0) {
          actionDesc = `${playerName}: Knocked out opponent in ${state.val} ${state.zone}`;
          saveHistory(actionDesc);
          state[`t${opp}`]--;
          if (log) log.innerHTML = `<span style="color:#74b9ff;">${actionDesc}</span><br>` + log.innerHTML;
          showRemoveDartsNotice();
        } else {
          actionDesc = `${playerName}: ${state.val} ${state.zone}`;
          saveHistory(actionDesc);
          state[`t${current}`]++;
          if (log) log.innerHTML = `${actionDesc}<br>` + log.innerHTML;
        }
        updateVisuals(id);
      }

      processTurnEnd(current, opp);
    }

    function handleMiss() {
      if (dartsLeft[activeTeam] <= 0) return;
      updatePlayerNameDisplays();
      const current = activeTeam;
      const opp = current === 1 ? 2 : 1;
      const playerName = playerNames[current];
      const actionDesc = `${playerName}: Missed Board`;
      saveHistory(actionDesc);
      const log = document.getElementById('log');
      if (log) log.innerHTML = `${actionDesc}<br>` + log.innerHTML;
      processTurnEnd(current, opp);
    }

    function showRemoveDartsNotice() {
      const notice = document.getElementById('remove-darts-notice');
      if (notice) {
        notice.style.display = 'block';
        setTimeout(() => { notice.style.display = 'none'; }, 3000);
      }
    }

    function processTurnEnd(current: number, opp: number) {
      dartsLeft[current]--;
      const t1Darts = document.getElementById('t1-darts');
      const t2Darts = document.getElementById('t2-darts');
      if (t1Darts) t1Darts.innerText = String(dartsLeft[1]);
      if (t2Darts) t2Darts.innerText = String(dartsLeft[2]);

      const lie = calcScore();
      updateUI(lie);

      if (dartsLeft[1] === 0 && dartsLeft[2] === 0) {
        finishEnd(lie);
      } else {
        activeTeam = (dartsLeft[opp] > 0) ? opp : current;
        setTurnUI(activeTeam);
      }
    }

    function triggerKO(val: number) {
      const targets = [val, ...getNeighbors(val)];
      const redHasAnchor = targets.some(n => activeBlocks[n] === 1);
      const blueHasAnchor = targets.some(n => activeBlocks[n] === 2);
      for (let k in boardState) {
        const s = boardState[k];
        if (targets.includes(s.val)) {
          s.t1 = 0;
          s.t2 = 0;
          if (s.zone === "Large Single") {
            s.blockOwner = 0;
            targets.forEach(n => delete activeBlocks[n]);
          }
          updateVisuals(k);
        }
        if (s.val === 0) {
          if (!redHasAnchor) s.t1 = 0;
          if (!blueHasAnchor) s.t2 = 0;
          updateVisuals(k);
        }
      }
      renderShields();
    }

    function toggleBlock(state: any, team: number) {
      state.blockOwner = team;
      const targets = [state.val, ...getNeighbors(state.val)];
      targets.forEach(n => { if (team === 0) delete activeBlocks[n]; else activeBlocks[n] = team; });
      renderShields();
    }

    function getNeighbors(val: number) {
      const i = boardNumbers.indexOf(val);
      return [boardNumbers[(i + 19) % 20], boardNumbers[(i + 1) % 20]];
    }

    function renderShields() {
      const layer = document.getElementById('shield-layer');
      if (!layer) return;
      layer.innerHTML = "";
      for (let k in boardState) {
        const s = boardState[k];
        if (s.zone === "Large Single" && s.blockOwner > 0) {
          [s.val, ...getNeighbors(s.val)].forEach(num => drawShieldWedge(num, s.blockOwner));
          const seg = document.getElementById(`seg-${k}`);
          if (seg) seg.classList.add(`occupied-t${s.blockOwner}`);
        } else if (s.zone === "Large Single") {
          const seg = document.getElementById(`seg-${k}`);
          if (seg) seg.classList.remove(`occupied-t1`, `occupied-t2`);
        }
      }
    }

    function drawShieldWedge(num: number, team: number) {
      const i = boardNumbers.indexOf(num);
      const rot = -99 + (i * 18);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M 25 0 L 105 0 A 105 105 0 0 1 ${105 * Math.cos(0.314)} ${105 * Math.sin(0.314)} L ${25 * Math.cos(0.314)} ${25 * Math.sin(0.314)} A 25 25 0 0 0 25 0 Z`);
      path.setAttribute("transform", `rotate(${rot})`);
      path.setAttribute("class", `shield-t${team}`);
      const layer = document.getElementById('shield-layer');
      if (layer) layer.appendChild(path);
    }

    function calcScore() {
      let stones: any[] = [];
      for (let k in boardState) {
        const s = boardState[k];
        if (s.rank <= 0 || s.rank >= 888) continue;
        for (let i = 0; i < s.t1; i++) stones.push({ t: 1, r: s.rank });
        for (let i = 0; i < s.t2; i++) stones.push({ t: 2, r: s.rank });
      }
      stones.sort((a, b) => a.r - b.r);
      if (!stones.length) return { team: 0, pts: 0 };
      const win = stones[0].t;
      let pts = 0;
      for (let s of stones) { if (s.t === win) pts++; else break; }
      return { team: win, pts };
    }

    function saveHistory(actionDescription = "") {
      history.push({
        board: JSON.parse(JSON.stringify(boardState)),
        blocks: JSON.parse(JSON.stringify(activeBlocks)),
        darts: { ...dartsLeft },
        team: activeTeam,
        end: currentEnd,
        score: { ...gameScore },
        endScores: JSON.parse(JSON.stringify(endScores)),
        action: actionDescription
      });
    }

    function undoLastMove() {
      if (history.length === 0) return;
      const last = history.pop();
      boardState = last.board;
      activeBlocks = last.blocks;
      dartsLeft = last.darts;
      activeTeam = last.team;
      currentEnd = last.end;
      gameScore = last.score;
      endScores = last.endScores;

      for (let k in boardState) updateVisuals(k);
      renderShields();
      setTurnUI(activeTeam);
      updateUI(calcScore());
      updateEndScoresTable();

      const t1Darts = document.getElementById('t1-darts');
      const t2Darts = document.getElementById('t2-darts');
      const endCount = document.getElementById('end-count');
      const totalRed = document.getElementById('total-red');
      const totalBlue = document.getElementById('total-blue');
      const log = document.getElementById('log');

      if (t1Darts) t1Darts.innerText = String(dartsLeft[1]);
      if (t2Darts) t2Darts.innerText = String(dartsLeft[2]);
      if (endCount) endCount.innerText = String(currentEnd);
      if (totalRed) totalRed.innerText = String(gameScore[1]);
      if (totalBlue) totalBlue.innerText = String(gameScore[2]);

      const undoMessage = last.action ? `<span style="color:#ffcc00;font-weight:bold;">⟲ Undid: ${last.action}</span>` : `<span style="color:#ffcc00;font-weight:bold;">⟲ Undo</span>`;
      if (log) log.innerHTML = undoMessage + '<br>' + log.innerHTML;
    }

    function updateUI(lie: { team: number; pts: number }) {
      updatePlayerNameDisplays();
      const lieText = document.getElementById('current-lie');
      const lieDetails = document.getElementById('lie-details');

      if (lieText) lieText.innerText = lie.team === 0 ? "No Score" : `${playerNames[lie.team]} ${lie.pts}`;

      if (lie.team > 0 && lie.pts > 0) {
        const countingDarts = getCountingDarts(lie.team);
        if (lieDetails) lieDetails.innerHTML = countingDarts.length > 0 ? 'Scoring: ' + countingDarts.join(', ') : '';
      } else {
        if (lieDetails) lieDetails.innerHTML = '';
      }
    }

    function getCountingDarts(team: number) {
      let stones: any[] = [];
      for (let k in boardState) {
        const s = boardState[k];
        if (s.rank <= 0 || s.rank >= 888) continue;

        const label = s.val === 0 ? (s.zone === "Inner Bull" ? "Bull" : "25") : `${s.val} ${s.zone.replace('Single', '').replace('Large ', '').replace('Small ', '').trim()}`;

        for (let i = 0; i < s.t1; i++) {
          stones.push({ t: 1, r: s.rank, label });
        }
        for (let i = 0; i < s.t2; i++) {
          stones.push({ t: 2, r: s.rank, label });
        }
      }

      stones.sort((a, b) => a.r - b.r);

      let countingDarts: string[] = [];
      for (let s of stones) {
        if (s.t === team) {
          countingDarts.push(s.label);
        } else {
          break;
        }
      }

      return countingDarts.slice(0, 5);
    }

    function setTurnUI(next: number) {
      updatePlayerNameDisplays();
      const d = document.getElementById('turn-display');
      if (d) {
        d.innerText = `${playerNames[next]}'s Turn`;
        d.style.background = next === 1 ? '#d63031' : '#0984e3';
        d.style.borderColor = next === 1 ? '#ff7675' : '#74b9ff';
        d.style.boxShadow = next === 1 ? '0 0 15px rgba(214, 48, 49, 0.3)' : '0 0 15px rgba(9, 132, 227, 0.3)';
      }
    }

    function updateVisuals(id: string) {
      const el = document.getElementById(`seg-${id}`);
      const s = boardState[id];
      if (!el) return;

      el.classList.remove('occupied-t1', 'occupied-t2');
      if (s.t1 > 0) el.classList.add('occupied-t1');
      else if (s.t2 > 0) el.classList.add('occupied-t2');

      const old = document.getElementById(`count-${id}`);
      if (old) old.remove();

      const countTotal = s.t1 + s.t2;
      if (countTotal > 0) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("id", `count-${id}`);
        if (s.val !== 0) {
          const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", String(s.x));
          c.setAttribute("cy", String(s.y));
          c.setAttribute("r", "7");
          c.setAttribute("class", "counter-bg");
          g.appendChild(c);
        }
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", String(s.x));
        t.setAttribute("y", String(s.y + 4));
        t.setAttribute("class", s.val === 0 ? "bull-counter-text" : "counter-text");
        t.textContent = String(countTotal);
        g.appendChild(t);
        const layer = document.getElementById('counter-layer');
        if (layer) layer.appendChild(g);
      }
    }

    function finishEnd(lie: { team: number; pts: number }) {
      updatePlayerNameDisplays();

      const endScore: any = { end: currentEnd, t1: 0, t2: 0, winner: lie.team };
      if (lie.team > 0) {
        endScore[`t${lie.team}`] = lie.pts;
        gameScore[lie.team] += lie.pts;
        lastScorer = lie.team;
      }
      endScores.push(endScore);
      updateEndScoresTable();

      const modalWinner = document.getElementById('modal-winner');
      const modalPoints = document.getElementById('modal-points');
      const scoreModal = document.getElementById('score-modal');
      const totalRed = document.getElementById('total-red');
      const totalBlue = document.getElementById('total-blue');

      if (modalWinner) modalWinner.innerText = lie.team === 1 ? `${playerNames[1].toUpperCase()} SCORES` : (lie.team === 2 ? `${playerNames[2].toUpperCase()} SCORES` : "BLANK END");
      if (modalPoints) modalPoints.innerText = String(lie.pts);
      if (scoreModal) scoreModal.style.display = "block";
      if (totalRed) totalRed.innerText = String(gameScore[1]);
      if (totalBlue) totalBlue.innerText = String(gameScore[2]);
    }

    function updateEndScoresTable() {
      const tbody = document.getElementById('end-scores-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      // Create Red Player row
      const redRow = document.createElement('tr');

      // Team name cell
      const redNameCell = document.createElement('td');
      redNameCell.style.padding = '6px 12px';
      redNameCell.style.textAlign = 'left';
      redNameCell.style.borderRight = '2px solid #444';
      redNameCell.style.color = '#ff7675';
      redNameCell.style.fontWeight = 'bold';
      redNameCell.style.fontSize = '1.1rem';
      redNameCell.style.minWidth = '120px';
      redNameCell.id = 'table-name-t1';
      redNameCell.textContent = playerNames[1];
      redRow.appendChild(redNameCell);

      // Score cells for each end (1-8)
      for (let i = 1; i <= 8; i++) {
        const scoreCell = document.createElement('td');
        scoreCell.style.padding = '6px';
        scoreCell.style.textAlign = 'center';
        scoreCell.style.borderRight = '1px solid #333';
        scoreCell.style.color = '#ff7675';
        scoreCell.style.fontWeight = 'bold';

        const endScore = endScores.find(s => s.end === i);
        scoreCell.textContent = endScore && endScore.t1 > 0 ? String(endScore.t1) : '-';
        redRow.appendChild(scoreCell);
      }

      // Total cell for Red
      const redTotalCell = document.createElement('td');
      redTotalCell.style.padding = '6px 12px';
      redTotalCell.style.textAlign = 'center';
      redTotalCell.style.borderLeft = '2px solid #444';
      redTotalCell.style.color = '#ff7675';
      redTotalCell.style.fontWeight = 'bold';
      redTotalCell.style.fontSize = '1.2rem';
      redTotalCell.textContent = String(gameScore[1]);
      redRow.appendChild(redTotalCell);

      tbody.appendChild(redRow);

      // Create Blue Player row
      const blueRow = document.createElement('tr');

      // Team name cell
      const blueNameCell = document.createElement('td');
      blueNameCell.style.padding = '6px 12px';
      blueNameCell.style.textAlign = 'left';
      blueNameCell.style.borderRight = '2px solid #444';
      blueNameCell.style.color = '#74b9ff';
      blueNameCell.style.fontWeight = 'bold';
      blueNameCell.style.fontSize = '1.1rem';
      blueNameCell.style.minWidth = '120px';
      blueNameCell.id = 'table-name-t2';
      blueNameCell.textContent = playerNames[2];
      blueRow.appendChild(blueNameCell);

      // Score cells for each end (1-8)
      for (let i = 1; i <= 8; i++) {
        const scoreCell = document.createElement('td');
        scoreCell.style.padding = '6px';
        scoreCell.style.textAlign = 'center';
        scoreCell.style.borderRight = '1px solid #333';
        scoreCell.style.color = '#74b9ff';
        scoreCell.style.fontWeight = 'bold';

        const endScore = endScores.find(s => s.end === i);
        scoreCell.textContent = endScore && endScore.t2 > 0 ? String(endScore.t2) : '-';
        blueRow.appendChild(scoreCell);
      }

      // Total cell for Blue
      const blueTotalCell = document.createElement('td');
      blueTotalCell.style.padding = '6px 12px';
      blueTotalCell.style.textAlign = 'center';
      blueTotalCell.style.borderLeft = '2px solid #444';
      blueTotalCell.style.color = '#74b9ff';
      blueTotalCell.style.fontWeight = 'bold';
      blueTotalCell.style.fontSize = '1.2rem';
      blueTotalCell.textContent = String(gameScore[2]);
      blueRow.appendChild(blueTotalCell);

      tbody.appendChild(blueRow);
    }

    function startNextEnd() {
      updatePlayerNameDisplays();
      const scoreModal = document.getElementById('score-modal');
      if (scoreModal) scoreModal.style.display = "none";

      currentEnd++;
      if (currentEnd > 8) {
        alert(`Match Complete! Final Score - ${playerNames[1]}: ${gameScore[1]} | ${playerNames[2]}: ${gameScore[2]}`);
        location.reload();
        return;
      }

      const endCount = document.getElementById('end-count');
      const counterLayer = document.getElementById('counter-layer');
      const shieldLayer = document.getElementById('shield-layer');
      const log = document.getElementById('log');
      const t1Darts = document.getElementById('t1-darts');
      const t2Darts = document.getElementById('t2-darts');

      if (endCount) endCount.innerText = String(currentEnd);
      if (counterLayer) counterLayer.innerHTML = "";
      if (shieldLayer) shieldLayer.innerHTML = "";

      activeBlocks = {};
      for (let k in boardState) {
        boardState[k].t1 = 0;
        boardState[k].t2 = 0;
        boardState[k].blockOwner = 0;
        updateVisuals(k);
      }
      dartsLeft = { 1: 8, 2: 8 };
      activeTeam = lastScorer;
      setTurnUI(activeTeam);
      updateUI({ team: 0, pts: 0 });

      if (t1Darts) t1Darts.innerText = '8';
      if (t2Darts) t2Darts.innerText = '8';
      if (log) log.innerHTML = `--- End ${currentEnd} Started ---<br>` + log.innerHTML;
    }

    function drawLabel(num: number, i: number) {
      const rad = (i * 18 - 90) * Math.PI / 180;
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", String(205 * Math.cos(rad)));
      t.setAttribute("y", String(205 * Math.sin(rad) + 5));
      t.setAttribute("class", "board-number");
      t.setAttribute("text-anchor", "middle");
      t.textContent = String(num);
      const layer = document.getElementById('numbers-layer');
      if (layer) layer.appendChild(t);
    }

    function init() {
      const segLayer = document.getElementById('segments-layer');
      if (!segLayer) return;

      boardNumbers.forEach((num, i) => {
        const rot = -99 + (i * 18);
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `rotate(${rot})`);
        createPath(g, 170, 185, num, "Double", rot, 177.5, 888);
        createPath(g, 105, 170, num, "Large Single", rot, 137.5, -1);
        createPath(g, 90, 105, num, "Triple", rot, 97.5, 3 + sortedScores.indexOf(num));
        createPath(g, 15, 90, num, "Small Single", rot, 52.5, 23 + sortedScores.indexOf(num));
        segLayer.appendChild(g);
        drawLabel(num, i);
      });
      createBull(25, "Outer Bull", 2);
      createBull(12, "Inner Bull", 1);
    }

    // Expose functions globally
    (window as any).undoLastMove = undoLastMove;
    (window as any).handleMiss = handleMiss;
    (window as any).startNextEnd = startNextEnd;

    // Initialize
    init();
    updatePlayerNameDisplays();
    updateEndScoresTable(); // Initialize empty table with team names

    const name1 = document.getElementById('name-t1');
    const name2 = document.getElementById('name-t2');

    if (name1) {
      name1.addEventListener('input', () => {
        updatePlayerNameDisplays();
        updateEndScoresTable();
      });
      name1.addEventListener('blur', () => setTurnUI(activeTeam));
    }
    if (name2) {
      name2.addEventListener('input', () => {
        updatePlayerNameDisplays();
        updateEndScoresTable();
      });
      name2.addEventListener('blur', () => setTurnUI(activeTeam));
    }

    return () => {
      delete (window as any).undoLastMove;
      delete (window as any).handleMiss;
      delete (window as any).startNextEnd;
    };
  }, []);

  return (
    <>
      <Header title="CURLING DARTS" />
      <div style={{
        background: '#0f0f0f',
        color: 'white',
        fontFamily: "'Segoe UI', sans-serif",
        display: 'grid',
        gridTemplateRows: '1fr minmax(100px, auto)',
        gridTemplateColumns: '500px 1fr 300px',
        margin: 0,
        height: '100vh',
        width: '100vw',
        paddingTop: '80px',
        boxSizing: 'border-box'
      }}>
        {/* Left Sidebar - Main Controls */}
        <div id="sidebar" style={{
          background: '#181818',
          padding: '15px',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '2rem', color: '#00d1b2', letterSpacing: '2px' }}>CURLING DARTS</h2>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" id="name-t1" placeholder="Red Player" defaultValue="Red Player" style={{
              flex: 1,
              padding: '8px',
              background: '#222',
              border: '2px solid #d63031',
              color: 'white',
              borderRadius: '4px',
              fontSize: '1rem'
            }} />
            <input type="text" id="name-t2" placeholder="Blue Player" defaultValue="Blue Player" style={{
              flex: 1,
              padding: '8px',
              background: '#222',
              border: '2px solid #0984e3',
              color: 'white',
              borderRadius: '4px',
              fontSize: '1rem'
            }} />
          </div>

          <div id="turn-display" style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
            border: '3px solid #ff7675',
            textTransform: 'uppercase',
            fontSize: '2rem',
            background: '#d63031',
            boxShadow: '0 0 15px rgba(214, 48, 49, 0.4)'
          }}>Red Player&apos;s Turn</div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={() => (window as any).undoLastMove?.()} style={{
              flex: 1,
              padding: '15px',
              border: '2px solid #444',
              cursor: 'pointer',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              textTransform: 'uppercase',
              background: '#333',
              color: '#ccc'
            }}>⟲ Undo</button>
            <button onClick={() => (window as any).handleMiss?.()} style={{
              flex: 1,
              padding: '15px',
              border: '2px solid #444',
              cursor: 'pointer',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              textTransform: 'uppercase',
              background: '#2d3436',
              color: '#fab1a0'
            }}>✗ Miss</button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', marginBottom: '10px', borderLeft: '4px solid #444' }}>
            <p style={{ margin: '0', fontSize: '1.6rem' }}>End: <strong><span id="end-count">1</span> / 8</strong></p>
            <p style={{ margin: '8px 0 0 0', fontSize: '1.5rem' }}>
              Darts: <span style={{ color: '#ff7675' }} id="t1-darts">8</span> | <span style={{ color: '#74b9ff' }} id="t2-darts">8</span>
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', marginBottom: '10px', borderLeft: '4px solid #444' }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '6px', color: '#888' }}>CURRENTLY LYING:</div>
            <div id="current-lie" style={{ fontSize: '2rem', fontWeight: 'bold' }}>No Score</div>
            <div id="lie-details" style={{ fontSize: '1.3rem', marginTop: '6px', color: '#00d1b2', fontWeight: 'bold', lineHeight: 1.4 }}></div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #444' }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#888' }}>MATCH SCORE:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: 'bold' }}>
              <span style={{ color: '#ff7675' }}><span id="name-display-t1">RED</span>: <span id="total-red">0</span></span>
              <span style={{ color: '#74b9ff' }}><span id="name-display-t2">BLUE</span>: <span id="total-blue">0</span></span>
            </div>
          </div>
        </div>

        {/* Center - Dartboard */}
        <div id="game-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', position: 'relative' }}>
          <div id="remove-darts-notice" style={{
            display: 'none',
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ff6b6b',
            color: 'white',
            padding: '20px 40px',
            borderRadius: '12px',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            zIndex: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}>⚠️ REMOVE DARTS FROM BOARD ⚠️</div>

          <div id="score-modal" style={{ display: 'none', position: 'absolute', background: 'rgba(0,0,0,0.95)', padding: '30px', border: '2px solid #00d1b2', borderRadius: '15px', textAlign: 'center', zIndex: 100 }}>
            <h2 id="modal-winner" style={{ marginTop: 0, color: 'white' }}></h2>
            <h1 id="modal-points" style={{ fontSize: '4rem', margin: '10px 0', color: '#00d1b2' }}>0</h1>
            <button onClick={() => (window as any).startNextEnd?.()} style={{
              padding: '12px 24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: '#00d1b2',
              color: 'white',
              border: '2px solid #00d1b2',
              borderRadius: '8px',
              fontSize: '1.2rem',
              textTransform: 'uppercase',
              transition: 'all 0.3s'
            }}>NEXT END</button>
          </div>

          <svg id="main-board" viewBox="-225 -225 450 450" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', maxWidth: '80vh', maxHeight: '80vh', touchAction: 'manipulation' }}>
            <g id="segments-layer"></g>
            <g id="shield-layer"></g>
            <g id="numbers-layer"></g>
            <g id="counter-layer"></g>
          </svg>
        </div>

        {/* Right Sidebar - Dart History */}
        <div style={{
          background: '#181818',
          padding: '15px',
          borderLeft: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#888', textAlign: 'center' }}>DART HISTORY</h3>
          <div id="log" style={{
            color: '#aaa',
            fontSize: '1.1rem',
            flexGrow: 1,
            overflowY: 'auto',
            background: '#111',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #222',
            lineHeight: 1.6
          }}>Game Start</div>
        </div>

        {/* Bottom - End-by-End Scores (Horizontal) */}
        <div style={{
          gridColumn: '1 / -1',
          background: '#181818',
          padding: '10px 15px',
          borderTop: '1px solid #333',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '6px', color: '#888', textAlign: 'center' }}>END-BY-END SCORES</div>
          <table id="end-scores-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.3rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 12px', borderBottom: '2px solid #444', borderRight: '2px solid #444', fontWeight: 'bold', textAlign: 'left', minWidth: '120px' }}>TEAM</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>1</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>2</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>3</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>4</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>5</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>6</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>7</th>
                <th style={{ padding: '6px', borderBottom: '2px solid #444', borderRight: '1px solid #333', fontWeight: 'bold', textAlign: 'center', color: '#888' }}>8</th>
                <th style={{ padding: '6px 12px', borderBottom: '2px solid #444', borderLeft: '2px solid #444', fontWeight: 'bold', textAlign: 'center', color: '#00d1b2' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody id="end-scores-body"></tbody>
          </table>
        </div>

        <style jsx global>{`
          .segment { cursor: pointer; stroke: #2d3436; stroke-width: 0.5; fill: #222; -webkit-tap-highlight-color: transparent; }
          .occupied-t1 { fill: #d63031 !important; }
          .occupied-t2 { fill: #0984e3 !important; }
          .shield-t1 { fill: rgba(214, 48, 49, 0.35) !important; pointer-events: none; }
          .shield-t2 { fill: rgba(9, 132, 227, 0.35) !important; pointer-events: none; }
          .board-number { fill: #888; font-size: 14px; font-weight: bold; pointer-events: none; }
          .counter-bg { fill: rgba(0,0,0,0.85); pointer-events: none; }
          .counter-text { fill: white; font-size: 11px; font-weight: 900; text-anchor: middle; pointer-events: none; }
          .bull-counter-text { fill: white; font-size: 12px; font-weight: 900; text-anchor: middle; pointer-events: none; paint-order: stroke; stroke: rgba(0,0,0,0.9); stroke-width: 4px; }
        `}</style>
      </div>
    </>
  );
}
