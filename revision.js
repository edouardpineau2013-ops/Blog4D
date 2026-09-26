        if(cell)intersections++;
        const voisins=dir==="across"?[[r-1,cc],[r+1,cc]]:[[r,cc-1],[r,cc+1]];
        for(const [vr,vc] of voisins)if(vr>=0&&vr<n&&vc>=0&&vc<n&&grille[vr][vc]&&!cell)return 0;
    }
    return intersections;
}

function construireMotsCroises(questions,size=13){
    const candidats=questions.map(extraireMotCroise).filter(Boolean);
    const uniques=[...new Map(candidats.map(x=>[x.solution,x])).values()].sort((a,b)=>b.solution.length-a.solution.length).slice(0,7);
    const grid=Array.from({length:size},()=>Array(size).fill(null)),entries=[];
    if(!uniques.length)return {size,grid,entries};
    const first=uniques.shift(),row=Math.floor(size/2),col=Math.floor((size-first.solution.length)/2);
    for(let i=0;i<first.solution.length;i++)grid[row][col+i]={letter:first.solution[i]};
    entries.push({number:0,...first,row,col,dir:"across"});

    for(const word of uniques){
        let best=null;
        for(let i=0;i<word.solution.length;i++)for(let r=0;r<size;r++)for(let cc=0;cc<size;cc++){
            const cell=grid[r][cc];
            if(!cell||cell.letter!==word.solution[i])continue;
            for(const dir of ["down","across"]){
                const dr=dir==="down"?1:0,dc=dir==="across"?1:0,rr=r-dr*i,ccc=cc-dc*i;
                const cross=peutPlacerCroise(grid,word.solution,rr,ccc,dir);
                if(cross>0&&(!best||cross>best.cross))best={row:rr,col:ccc,dir,cross};
            }
        }
        if(!best)continue;
        for(let i=0;i<word.solution.length;i++){const r=best.row+(best.dir==="down"?i:0),cc=best.col+(best.dir==="across"?i:0);if(!grid[r][cc])grid[r][cc]={letter:word.solution[i]};}
        entries.push({number:0,...word,row:best.row,col:best.col,dir:best.dir});
    }

    // Recadre la grille vers le haut pour supprimer les lignes vides inutiles.
    const premiereLigne=grid.findIndex(row=>row.some(Boolean));
    if(premiereLigne>0){
        const nouvelleGrille=Array.from({length:size},()=>Array(size).fill(null));
        for(let r=premiereLigne;r<size;r++){
            for(let c=0;c<size;c++)nouvelleGrille[r-premiereLigne][c]=grid[r][c];
        }
        for(const entry of entries)entry.row-=premiereLigne;
        for(let r=0;r<size;r++)grid[r]=nouvelleGrille[r];
    }

    const starts=new Map();let number=1;
    entries.sort((a,b)=>a.row-b.row||a.col-b.col||a.dir.localeCompare(b.dir));
    for(const entry of entries){const key=entry.row+"-"+entry.col;if(!starts.has(key))starts.set(key,number++);entry.number=starts.get(key);}

    return {size,grid,entries};
}

function rendreMotsCroises(croise){
    const numeros={};croise.entries.forEach(e=>numeros[e.row+"-"+e.col]=e.number);
    const grille='<div class="revision-crossword-wrap"><div class="revision-crossword" style="--cross-size:'+croise.size+'">'+croise.grid.map((row,r)=>'<div class="revision-crossword-row">'+row.map((cell,col)=>{
        if(!cell)return '<span class="revision-crossword-cell empty"></span>';
        const n=numeros[r+"-"+col];
        return '<label class="revision-crossword-cell">'+(n?'<small>'+n+'</small>':"")+'<input maxlength="1" autocomplete="off" data-cross-row="'+r+'" data-cross-col="'+col+'"></label>';
    }).join("")+'</div>').join("")+'</div></div>';