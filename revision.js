const TYPES_REVISION = {
    definition: { label:"Définition", fields:[["terme","Mot / notion","Ex. Photosynthèse","text"],["definition","Définition","Explique cette notion...","textarea"]] },
    question: { label:"Question / réponse", fields:[["question","Question","Ex. Quelle est la capitale de l'Allemagne ?","text"],["reponse","Réponse","Ex. Berlin","textarea"]] },
    date: { label:"Date / événement", fields:[["date","Date","Ex. 1789","text"],["evenement","Événement associé","Ex. Révolution française","textarea"]] },
    vocabulaire: { label:"Mot-clé / vocabulaire", fields:[["mot","Mot","Ex. Écosystème","text"],["definition","Signification","Définis ce mot...","textarea"]] },
    personne: { label:"Personne / personnage", fields:[["personne","Personne","Ex. Napoléon Bonaparte","text"],["description","Rôle / informations","Qui est cette personne ?","textarea"]] },
    lieu: { label:"Lieu", fields:[["lieu","Lieu","Ex. Rome","text"],["description","Informations","Informations associées...","textarea"]] },
    formule: { label:"Formule", fields:[["formule","Formule","Ex. v = d / t","text"],["explication","Explication / utilisation","Explique cette formule...","textarea"]] },
    regle: { label:"Règle / propriété", fields:[["regle","Règle / propriété","Écris la règle...","textarea"],["application","Application","Dans quel cas l'utiliser ?","textarea"]] },
    methode: { label:"Méthode / procédure", fields:[["objectif","Objectif","Ex. Calculer une moyenne","text"],["etapes","Étapes","Décris les étapes...","textarea"]] },
    processus: { label:"Processus", fields:[["processus","Processus","Ex. Digestion","text"],["etapes","Étapes","Décris les étapes...","textarea"]] },
    cause: { label:"Cause / conséquence", fields:[["cause","Cause","Pourquoi cela se produit ?","textarea"],["consequence","Conséquence","Quel est le résultat ?","textarea"]] },
    exemple: { label:"Exemple", fields:[["notion","Notion concernée","Ex. Mélange homogène","text"],["exemple","Exemple","Donne un exemple...","textarea"]] },
    liste: { label:"Liste / éléments à retenir", fields:[["sujet","Sujet","Ex. Les trois états de l'eau","text"],["elements","Éléments","Un élément par ligne...","textarea"]] }
};

const MODES_REVISION = {
    flashcards:{label:"Flashcard",types:Object.keys(TYPES_REVISION)},
    questions:{label:"Question / réponse",types:Object.keys(TYPES_REVISION)},
    qcm:{label:"QCM",types:Object.keys(TYPES_REVISION)},
    vrai_faux:{label:"Vrai / Faux",types:Object.keys(TYPES_REVISION)},
    reponse_ecrite:{label:"Réponse écrite",types:Object.keys(TYPES_REVISION)},
    texte_trous:{label:"Texte à trous",types:Object.keys(TYPES_REVISION)},
    definition_terme:{label:"Définition → terme",types:["definition","vocabulaire"]},
    terme_definition:{label:"Terme → définition",types:Object.keys(TYPES_REVISION)},
    paires:{label:"Paires",types:Object.keys(TYPES_REVISION)},
    relier:{label:"Relier",types:Object.keys(TYPES_REVISION)},
    glisser_deposer:{label:"Glisser-déposer",types:Object.keys(TYPES_REVISION)},
    lettres_melangees:{label:"Lettres mélangées",types:["definition","vocabulaire","personne","lieu"]},
    mot_mystere:{label:"Mot mystère",types:["definition","vocabulaire","personne","lieu"]},
    phrase_reconstituer:{label:"Phrase à reconstituer",types:["question","definition","vocabulaire","regle","methode","processus","exemple","liste"]},
    timeline:{label:"Frise chronologique",types:["date"]},
    intrus:{label:"Trouver l'intrus",types:Object.keys(TYPES_REVISION)},
    exercice:{label:"Exercice classique",types:Object.keys(TYPES_REVISION)},
    mots_croises:{label:"Mots croisés",types:["definition","question","vocabulaire","personne","lieu","formule","regle","methode","processus","cause","exemple"]},
    mots_meles:{label:"Mots mêlés",types:["definition","question","vocabulaire","personne","lieu","exemple"]}
};

let questionsRevision = [];
let ficheEtude = null;
let session = null;

function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function valeurs(q){
    const d=q?.data||{};
    const map={
        definition:[d.terme,d.definition],question:[d.question,d.reponse],
        date:[d.date,d.evenement],vocabulaire:[d.mot,d.definition],
        personne:[d.personne,d.description],lieu:[d.lieu,d.description],
        formule:[d.formule,d.explication],regle:[d.regle,d.application],
        methode:[d.objectif,d.etapes],processus:[d.processus,d.etapes],
        cause:[d.cause,d.consequence],exemple:[d.notion,d.exemple],liste:[d.sujet,d.elements]
    };
    return map[q?.type]||["",""];
}

function normaliserTexte(t){
    return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/['’]/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}

const MOTS_VIDES=new Set("le la les un une des du de d au aux et ou en dans sur sous pour par avec sans est sont a que qui quoi quel quelle quels quelles ce cette ces se sa son ses il elle ils elles je tu on nous vous".split(" "));

function evaluerReponse(attendue,reponse){
    const a=normaliserTexte(attendue),r=normaliserTexte(reponse);
    if(!a||!r)return {correct:false,score:0};
    return {correct:a===r,score:a===r?1:0};
}

function melanger(array){return [...array].sort(()=>Math.random()-.5);}

async function chargerFiches(){
    verifierSupabase();
    const {data,error}=await supabaseClient.from("fiches_revision")
        .select("id,titre,matiere,questions,auteur_id,auteur_identifiant,created_at")
        .order("created_at",{ascending:false});
    if(error)throw error;
    return data||[];
}

function afficherFiches(fiches){
    const liste=document.getElementById("liste-fiches");
    if(!fiches.length){
        liste.innerHTML='<div class="empty-state revision-empty"><h3>Aucune fiche pour le moment</h3><p>Crée la première fiche de révision.</p></div>';
        return;
    }
    liste.innerHTML=fiches.map(fiche=>{
        const questions=Array.isArray(fiche.questions)?fiche.questions:[];
        const date=new Date(fiche.created_at).toLocaleDateString("fr-FR");
        return '<article class="revision-fiche-card">'+
            '<span class="article-tag">'+escapeHtml(fiche.matiere)+'</span>'+
            '<h3>'+escapeHtml(fiche.titre)+'</h3>'+
            '<p>'+questions.length+' question'+(questions.length>1?"s":"")+'</p>'+
            '<small>Créée par <strong>'+escapeHtml(fiche.auteur_identifiant||"Utilisateur")+'</strong> le '+date+'</small>'+
            '<button type="button" class="primary-button revision-study-button" data-fiche-id="'+escapeHtml(fiche.id)+'">Réviser</button>'+
            '</article>';
    }).join("");
    liste.querySelectorAll(".revision-study-button").forEach(button=>{
        button.addEventListener("click",()=>{
            const fiche=fiches.find(x=>String(x.id)===String(button.dataset.ficheId));
            if(fiche)afficherConfigurationRevision(fiche);
        });
    });
}

async function actualiserFiches(){
    const liste=document.getElementById("liste-fiches");
    try{
        liste.innerHTML='<div class="empty-state revision-empty"><h3>Chargement des fiches...</h3></div>';
        afficherFiches(await chargerFiches());
    }catch(error){
        console.error(error);
        liste.innerHTML='<div class="empty-state revision-empty"><h3>Impossible de charger les fiches</h3><p>'+escapeHtml(error.message)+'</p></div>';
    }
}

function modesDisponibles(questions){
    const types=new Set(questions.map(q=>q.type));
    return Object.entries(MODES_REVISION).filter(([_,mode])=>mode.types.some(type=>types.has(type)));
}

function promptQuestion(q){
    const v=valeurs(q);
    switch(q.type){
        case "question":return v[0];
        case "definition":case "vocabulaire":return "Qu'est-ce que "+v[0]+" ?";
        case "date":return "À quel événement correspond cette date ou période ?";
        case "personne":return "Qui est "+v[0]+" ?";
        case "lieu":return "Que faut-il retenir sur "+v[0]+" ?";
        case "formule":return "Quelle est la formule à retenir ?";
        case "regle":return "Quelle règle faut-il retenir ?";
        case "methode":case "processus":return "Quelles sont les étapes de "+v[0]+" ?";
        case "cause":return "Quelle est la cause et quelle est la conséquence ?";
        case "exemple":return "Donne un exemple pour "+v[0]+".";
        case "liste":return "Quels éléments faut-il retenir pour "+v[0]+" ?";
        default:return "Réponds à la question.";
    }
}

function afficherConfigurationRevision(fiche){
    const questions=Array.isArray(fiche.questions)?fiche.questions.filter(q=>q&&TYPES_REVISION[q.type]):[];
    if(!questions.length){
        alert("Cette fiche ne contient aucune question utilisable.");
        return;
    }
    ficheEtude={...fiche,questions};
    const config=document.getElementById("revision-config");
    const typesDisponibles=new Set(questions.map(q=>q.type));
    config.innerHTML=
        '<div class="section-heading"><div><span class="section-label">RÉVISER</span><h2>'+escapeHtml(fiche.titre)+'</h2></div>'+
        '<button type="button" class="secondary-button" id="fermer-config">Fermer</button></div>'+
        '<p class="revision-intro">Choisis le nombre de questions et les modes de révision.</p>'+
        '<div class="revision-config-grid">'+
        '<div class="revision-config-block"><label for="nombre-a-reviser">Nombre de questions</label><input id="nombre-a-reviser" type="number" min="1" max="'+questions.length+'" value="'+Math.min(questions.length,10)+'"><small>Maximum : '+questions.length+'</small></div>'+
        '<div class="revision-config-block"><span class="revision-config-label">Modes de révision</span><div class="revision-mode-actions"><button type="button" class="secondary-button" id="selectionner-tous-modes">Tout sélectionner</button><button type="button" class="secondary-button" id="deselectionner-tous-modes">Tout désélectionner</button></div><div class="revision-mode-list">'+
        Object.entries(MODES_REVISION).map(([key,mode])=>{
            const compatible=mode.types.some(type=>typesDisponibles.has(type));
            return '<label class="revision-mode-option'+(compatible?'':' is-disabled')+'"><input type="checkbox" name="revision-mode" value="'+key+'" '+(compatible?'checked':'disabled')+'><span>'+escapeHtml(mode.label)+'</span></label>';
        }).join("")+
        '</div></div></div>'+
        '<button type="button" class="primary-button" id="lancer-revision">Commencer la révision</button>'+
        '<p id="revision-config-status" class="revision-status" role="status"></p>';
    cacherToutesLesVues();
    config.hidden=false;
    document.getElementById("fermer-config").onclick=retourFiches;
    document.getElementById("selectionner-tous-modes").onclick=()=>document.querySelectorAll('input[name="revision-mode"]:not(:disabled)').forEach(input=>input.checked=true);
    document.getElementById("deselectionner-tous-modes").onclick=()=>document.querySelectorAll('input[name="revision-mode"]:not(:disabled)').forEach(input=>input.checked=false);
    document.getElementById("lancer-revision").onclick=lancerRevision;
    config.scrollIntoView({behavior:"smooth",block:"start"});
}

function cacherToutesLesVues(){
    document.getElementById("revision-accueil").hidden=true;
    document.getElementById("revision-editor").hidden=true;
    document.getElementById("revision-config").hidden=true;
    document.getElementById("revision-session").hidden=true;
}

function retourFiches(){
    session=null;
    document.getElementById("revision-config").hidden=true;
    document.getElementById("revision-session").hidden=true;
    document.getElementById("revision-editor").hidden=true;
    document.getElementById("revision-accueil").hidden=false;
    document.getElementById("revision-accueil").scrollIntoView({behavior:"smooth",block:"start"});
}

function modeUtilisablePourQuestion(q,mode){
    if(mode==="mots_meles")return !!motPourMotsMeles(q);
    if(mode==="mots_croises")return !!extraireMotCroise(q);
    return !!MODES_REVISION[mode]?.types.includes(q?.type);
}

function modeUtilisablePourQuestion(q,mode){
    if(mode==="mots_meles")return !!motPourMotsMeles(q);
    if(mode==="mots_croises")return !!extraireMotCroise(q);
    return !!MODES_REVISION[mode]?.types.includes(q?.type);
}

function lancerRevision(){
    const nombre=Number(document.getElementById("nombre-a-reviser").value);
    const modes=[...document.querySelectorAll('input[name="revision-mode"]:checked')].map(x=>x.value);
    const status=document.getElementById("revision-config-status");

    if(!nombre||nombre<1||nombre>ficheEtude.questions.length){
        status.textContent="Choisis un nombre de questions valide.";
        status.className="revision-status error";
        return;
    }
    if(!modes.length){
        status.textContent="Sélectionne au moins un mode de révision.";
        status.className="revision-status error";
        return;
    }

    const questionsEligibles=ficheEtude.questions.filter(q=>modes.some(mode=>modeUtilisablePourQuestion(q,mode)));
    if(questionsEligibles.length<nombre){
        status.textContent="Avec les modes sélectionnés, seules "+questionsEligibles.length+" question"+(questionsEligibles.length>1?"s":"")+" sont utilisables.";
        status.className="revision-status error";
        return;
    }

    const questions=melanger(questionsEligibles).slice(0,nombre);
    session={
        questions,modes,index:0,score:0,questionsReussies:new Set(),
        modesParQuestion:questions.map(q=>{
            const compatibles=modes.filter(mode=>modeUtilisablePourQuestion(q,mode));
            const disponibles=compatibles.length?compatibles:Object.keys(MODES_REVISION).filter(mode=>modeUtilisablePourQuestion(q,mode));
            return disponibles.length?disponibles[Math.floor(Math.random()*disponibles.length)]:"questions";
        })
    };
    afficherQuestionSession();
}

function construireChoix(q){
    const bonne=String(valeurs(q)[1]||"").trim();
    const autres=ficheEtude.questions
        .filter(x=>x!==q)
        .map(x=>String(valeurs(x)[1]||"").trim())
        .filter(Boolean)        .filter(x=>normaliserTexte(x)!==normaliserTexte(bonne));
    const uniques=[...new Map(autres.map(x=>[normaliserTexte(x),x])).values()];
    const choix=melanger([bonne,...melanger(uniques).slice(0,3)]).filter(Boolean);
    return choix.length ? choix : [bonne || "Aucune réponse disponible"];
}

function melangerLettres(texte){
    const source=normaliserTexte(texte).replace(/\s/g,"");
    const lettres=[...source];
    if(lettres.length<2)return source;
    let resultat=source;
    for(let i=0;i<30&&resultat===source;i++)resultat=melanger(lettres).join("");
    if(resultat===source) resultat=lettres.slice(1).concat(lettres[0]).join("");
    return resultat;
}

function motMystere(texte){
    const mot=String(texte||"").trim().split(/\s+/)[0];
    if(mot.length<3)return {masque:mot,solution:mot};
    const lettres=[...mot];
    const visibles=Math.max(1,Math.ceil(lettres.length*.35));
    const indices=new Set(melanger([...Array(lettres.length).keys()]).slice(0,visibles));
    return {masque:lettres.map((l,i)=>indices.has(i)?l:"_").join(" "),solution:mot};
}

function phraseMelangee(texte){
    return melanger(String(texte||"").trim().split(/\s+/).filter(Boolean));
}


function extraireMotCroise(q){
    const v=valeurs(q);
    const source=q?.type==="question"?v[1]:v[0];
    const solution=normaliserTexte(source).replace(/\s/g,"");
    if(solution.length<3||solution.length>12)return null;
    return {solution,indice:String(q?.type==="question"?v[0]:(v[1]||promptQuestion(q))).trim()};
}

function peutPlacerCroise(grille,word,row,col,dir){
    const n=grille.length,dr=dir==="down"?1:0,dc=dir==="across"?1:0;
    const finR=row+dr*(word.length-1),finC=col+dc*(word.length-1);
    if(row<0||col<0||finR>=n||finC>=n)return 0;
    const avantR=row-dr,avantC=col-dc,apresR=finR+dr,apresC=finC+dc;
    if(avantR>=0&&avantR<n&&avantC>=0&&avantC<n&&grille[avantR][avantC])return 0;
    if(apresR>=0&&apresR<n&&apresC>=0&&apresC<n&&grille[apresR][apresC])return 0;
    let intersections=0;
    for(let i=0;i<word.length;i++){
        const r=row+dr*i,cc=col+dc*i,cell=grille[r][cc];
        if(cell&&cell.letter!==word[i])return 0;
        if(cell)intersections++;
        const voisins=dir==="across"?[[r-1,cc],[r+1,cc]]:[[r,cc-1],[r,cc+1]];
        for(const [vr,vc] of voisins)if(vr>=0&&vr<n&&vc>=0&&vc<n&&grille[vr][vc]&&!cell)return 0;
    }
    return intersections;
}

function construireMotsCroises(questions,size=13){
    const candidats=melanger(questions.map(extraireMotCroise).filter(Boolean));
    const uniques=[...new Map(candidats.map(x=>[x.solution,x])).values()].sort((a,b)=>b.solution.length-a.solution.length).slice(0,7);
    const grid=Array.from({length:size},()=>Array(size).fill(null)),entries=[];
    if(!uniques.length)return {size,grid,entries};
    const premiers=uniques.slice(0,Math.min(3,uniques.length));
    const first=premiers[Math.floor(Math.random()*premiers.length)];
    uniques.splice(uniques.indexOf(first),1);
    const row=Math.floor(size/2),col=Math.floor((size-first.solution.length)/2);
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
        for(let i=0;i<word.solution.length;i++){
            const r=best.row+(best.dir==="down"?i:0),cc=best.col+(best.dir==="across"?i:0);
            if(!grid[r][cc])grid[r][cc]={letter:word.solution[i]};
        }
        entries.push({number:0,...word,row:best.row,col:best.col,dir:best.dir});
    }

    // Recadre uniquement le haut de la grille : les premières cases occupées
    // commencent désormais sur la première ligne, sans modifier la largeur.
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
    for(const entry of entries){
        const key=entry.row+"-"+entry.col;
        if(!starts.has(key))starts.set(key,number++);
        entry.number=starts.get(key);
    }

    const occupees=grid.reduce((acc,row,r)=>{
        row.forEach((cell,col)=>{if(cell)acc.push([r,col]);});
        return acc;
    },[]);
    if(occupees.length){
        const minR=Math.min(...occupees.map(x=>x[0])),maxR=Math.max(...occupees.map(x=>x[0]));
        const minC=Math.min(...occupees.map(x=>x[1])),maxC=Math.max(...occupees.map(x=>x[1]));
        const marge=1;
        const r0=Math.max(0,minR-marge),r1=Math.min(size-1,maxR+marge);
        const c0=Math.max(0,minC-marge),c1=Math.min(size-1,maxC+marge);
        const nouvelleGrille=[];
        for(let r=r0;r<=r1;r++)nouvelleGrille.push(grid[r].slice(c0,c1+1));
        for(const entry of entries){entry.row-=r0;entry.col-=c0;}
        return {size:nouvelleGrille[0]?.length||size,rows:nouvelleGrille.length,grid:nouvelleGrille,entries};
    }
    return {size,rows:size,grid,entries};
}
function rendreMotsCroises(croise){
    const numeros={};croise.entries.forEach(e=>numeros[e.row+"-"+e.col]=e.number);
    const grille='<div class="revision-crossword-wrap"><div class="revision-crossword" style="--cross-size:'+croise.size+'">'+croise.grid.map((row,r)=>'<div class="revision-crossword-row">'+row.map((cell,col)=>{
        if(!cell)return '<span class="revision-crossword-cell empty"></span>';
        const n=numeros[r+"-"+col];
        return '<label class="revision-crossword-cell">'+(n?'<small>'+n+'</small>':"")+'<input maxlength="1" autocomplete="off" data-cross-row="'+r+'" data-cross-col="'+col+'"></label>';
    }).join("")+'</div>').join("")+'</div></div>';
    const clues=(title,list)=>'<div class="revision-crossword-clue-group"><h4>'+title+'</h4>'+(list.length?list.map(e=>'<button type="button" class="revision-crossword-clue" data-cross-entry="'+e.number+'-'+e.dir+'"><strong>'+e.number+'.</strong> '+escapeHtml(e.indice)+' <span>('+e.solution.length+')</span></button>').join(""):'<p>Aucun indice.</p>')+'</div>';
    return grille+clues("Horizontal",croise.entries.filter(e=>e.dir==="across"))+clues("Vertical",croise.entries.filter(e=>e.dir==="down"));
}

function motPourMotsMeles(q){
    const v=valeurs(q),source=q?.type==="question"?v[1]:v[0];
    const mots=normaliserTexte(source).split(" ").filter(x=>x.length>=3&&x.length<=12);
    return (mots.sort((a,b)=>b.length-a.length)[0]||"").replace(/\s/g,"");
}

function construireGrilleMotsMeles(mot,taille=12){
    const motNet=normaliserTexte(mot).replace(/\s/g,""),n=12,grille=Array.from({length:n},()=>Array(n).fill(""));
    if(!motNet||motNet.length>n)return {size:n,grille,mot:motNet,placement:null};
    let placement=null;
    for(const [dr,dc] of melanger([[0,1],[1,0],[1,1],[-1,1]])){
        for(let tentative=0;tentative<200&&!placement;tentative++){
            const r0=Math.floor(Math.random()*n),c0=Math.floor(Math.random()*n),r1=r0+dr*(motNet.length-1),c1=c0+dc*(motNet.length-1);
            if(r1<0||r1>=n||c1<0||c1>=n)continue;
            let ok=true;
            for(let i=0;i<motNet.length;i++){const r=r0+dr*i,col=c0+dc*i;if(grille[r][col]&&grille[r][col]!==motNet[i]){ok=false;break;}}
            if(!ok)continue;
            for(let i=0;i<motNet.length;i++)grille[r0+dr*i][c0+dc*i]=motNet[i];
            placement=[r0,c0,r1,c1];
        }
        if(placement)break;
    }
    const lettres="abcdefghijklmnopqrstuvwxyz";
    for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(!grille[r][col])grille[r][col]=lettres[Math.floor(Math.random()*lettres.length)];
    return {size:n,grille,mot:motNet,placement};
}

function marquerQuestionReussie(){
    if(!session||session.index<0)return false;
    session.questionsReussies=session.questionsReussies||new Set();
    if(session.questionsReussies.has(session.index))return false;
    session.questionsReussies.add(session.index);
    session.score=Math.min(session.questions.length,session.score+1);
    return true;
}

function afficherQuestionSession(){
    if(session?.relierCleanup){session.relierCleanup();session.relierCleanup=null;}
    const el=document.getElementById("revision-session");
    if(!session||session.index>=session.questions.length){afficherResultatRevision();return;}
    const q=session.questions[session.index],mode=session.modesParQuestion[session.index],v=valeurs(q);
    const bonne=v[1]||"";
    let contenu='<div class="revision-answer-question"><span class="small-label">'+escapeHtml(MODES_REVISION[mode]?.label||"Révision")+' — '+(session.index+1)+' / '+session.questions.length+'</span>';

    if(mode==="flashcards"){
        const faceDate=q.type==="date"?'<p class="revision-flashcard-date"><strong>Date / période :</strong> '+escapeHtml(v[0])+'</p>':"";
        contenu+='<h3>'+escapeHtml(promptQuestion(q))+'</h3>'+faceDate+'<button type="button" class="primary-button" id="reveler-reponse">Afficher la réponse</button><div id="reponse-cachee" class="revision-hidden-answer" hidden>'+escapeHtml(bonne).replace(/\\n/g,"<br>")+'</div>';
    }else if(mode==="qcm"){
        contenu+='<h3>'+escapeHtml(promptQuestion(q))+'</h3><div class="revision-mode-choices">'+construireChoix(q).map(x=>'<button type="button" class="secondary-button revision-choice" data-answer="'+escapeHtml(x)+'">'+escapeHtml(x)+'</button>').join("")+'</div>';
    }else if(mode==="vrai_faux"){
        const vrai=Math.random()<.5, proposition=vrai?bonne:(construireChoix(q).find(x=>normaliserTexte(x)!==normaliserTexte(bonne))||bonne+" (autre réponse)");
        session.vraiFaux={proposition,correct:vrai};
        contenu+='<h3>'+escapeHtml(promptQuestion(q))+'</h3><p class="revision-statement">'+escapeHtml(proposition)+'</p><div class="revision-mode-choices"><button type="button" class="secondary-button" id="vf-vrai">Vrai</button><button type="button" class="secondary-button" id="vf-faux">Faux</button></div>';
    }else if(mode==="definition_terme"){
        contenu+='<h3>'+escapeHtml(bonne)+'</h3><p>Quel est le terme correspondant ?</p><input id="reponse-revision" type="text" placeholder="Écris le terme"><button type="button" class="primary-button" id="valider-reponse">Valider</button>';
    }else if(mode==="terme_definition"){
        contenu+='<h3>'+escapeHtml(v[0])+'</h3><p>Donne la définition ou l’explication.</p><textarea id="reponse-revision" rows="4" placeholder="Écris ta réponse..."></textarea><button type="button" class="primary-button" id="valider-reponse">Valider</button>';
    }else if(mode==="texte_trous"){
        const mots=String(bonne).split(/\s+/).filter(x=>x.length>3),mot=mots[0]||bonne;
        const motEchappe=String(mot).replace(/[.*+?^{}()|[\]\\]/g,"\\$&");
        const texte=escapeHtml(bonne).replace(new RegExp(motEchappe,"i"),"____");
        contenu+='<h3>'+escapeHtml(promptQuestion(q))+'</h3><p class="revision-fill-blank">'+texte+'</p><input id="reponse-revision" type="text" placeholder="Mot manquant" style="margin-top: 20px;"><button type="button" class="primary-button" id="valider-reponse">Valider</button>';
    }else if(["paires","relier","glisser_deposer"].includes(mode)){
        const choix=construireChoix(q);session.associationMode=mode;session.associationAnswer=bonne;
        if(mode==="paires"){
            contenu+='<h3>'+escapeHtml(MODES_REVISION[mode].label)+'</h3><h4>'+escapeHtml(promptQuestion(q))+'</h4><p>Choisis la bonne réponse.</p><div class="revision-mode-choices">'+choix.map(x=>'<button type="button" class="secondary-button revision-choice" data-answer="'+escapeHtml(x)+'">'+escapeHtml(x)+'</button>').join("")+'</div>';
        }else if(mode==="relier"){
            const sources=melanger([q,...ficheEtude.questions.filter(x=>x!==q)]).slice(0,Math.min(4,ficheEtude.questions.length));
            const liens=sources.map((x,i)=>({id:"relier-"+i,gauche:valeurs(x)[0],droite:valeurs(x)[1]}));session.relier=liens;
            contenu+='<h3>Relier</h3><p>Clique sur un élément à gauche puis sur sa réponse à droite pour créer un trait.</p><div class="revision-linking" id="revision-linking"><svg class="revision-link-lines" aria-hidden="true"></svg><div class="revision-link-column">'+liens.map(x=>'<button type="button" class="revision-link-item revision-link-left" data-id="'+x.id+'">'+escapeHtml(x.gauche)+'</button>').join("")+'</div><div class="revision-link-column">'+melanger(liens).map(x=>'<button type="button" class="revision-link-item revision-link-right" data-id="'+x.id+'">'+escapeHtml(x.droite)+'</button>').join("")+'</div></div>';
        }else{
            contenu+='<h3>Glisser-déposer</h3><h4>'+escapeHtml(promptQuestion(q))+'</h4><p>Glisse la bonne réponse dans la zone ou clique dessus.</p><div class="revision-drag-options">'+choix.map(x=>'<button type="button" draggable="true" class="secondary-button revision-choice revision-drag-item" data-answer="'+escapeHtml(x)+'">'+escapeHtml(x)+'</button>').join("")+'</div><div id="revision-drop-zone" class="revision-drop-zone" tabindex="0">Dépose la réponse ici</div>';
        }
    }else if(mode==="lettres_melangees"){
        const solution=String(v[0]||"").trim();
        const melange=melangerLettres(solution);
        session.lettresMelangees=normaliserTexte(solution).replace(/\s/g,"");
        contenu+='<h3>Lettres mélangées</h3><p>'+escapeHtml(promptQuestion(q))+'</p><div class="revision-word-puzzle">'+melange.toUpperCase().split("").map(x=>'<span class="revision-puzzle-letter">'+escapeHtml(x)+'</span>').join("")+'</div><input id="reponse-revision" type="text" placeholder="Reconstitue le mot" autocomplete="off"><button type="button" class="primary-button" id="valider-reponse">Valider</button>';
    }else if(mode==="mot_mystere"){
        const mystere=motMystere(v[0]);
        session.mystere=normaliserTexte(mystere.solution);
        contenu+='<h3>Mot mystère</h3><p>'+escapeHtml(promptQuestion(q))+'</p><div class="revision-mystery-word">'+escapeHtml(mystere.masque.toUpperCase())+'</div><input id="reponse-revision" type="text" placeholder="Trouve le mot" autocomplete="off"><button type="button" class="primary-button" id="valider-reponse">Valider</button>';
    }else if(mode==="phrase_reconstituer"){
        const phrase=String(v[1]||"").trim();
        session.phraseReponse=normaliserTexte(phrase);
        const mots=phraseMelangee(phrase);
        contenu+='<h3>Phrase à reconstituer</h3><p>'+escapeHtml(promptQuestion(q))+'</p><div class="revision-phrase-words">'+mots.map((mot,i)=>'<button type="button" class="revision-phrase-word" data-index="'+i+'" data-word="'+escapeHtml(mot)+'">'+escapeHtml(mot)+'</button>').join("")+'</div><div id="revision-phrase-result" class="revision-phrase-result">Clique sur les mots dans le bon ordre.</div><div class="revision-phrase-actions"><button type="button" class="secondary-button" id="reinitialiser-phrase">Réinitialiser</button><button type="button" class="primary-button" id="valider-phrase">Valider</button></div>';
    }else if(mode==="mots_croises"){
        const croise=construireMotsCroises(ficheEtude.questions,13);session.motsCroises=croise;
        if(!croise.entries.length)contenu+='<h3>Mots croisés</h3><p>Aucune grille croisée compatible n’a pu être générée avec cette fiche.</p>';
        else contenu+='<h3>Mots croisés</h3><p style="margin-bottom: 30px;">Complète les cases avec les indices horizontaux et verticaux.</p>'+rendreMotsCroises(croise)+'<button type="button" class="primary-button" id="verifier-mots-croises">Vérifier la grille</button>';
    }else if(mode==="lettres_melangees"||mode==="mot_mystere"){
        const bouton=document.getElementById("valider-reponse");
        if(bouton)bouton.onclick=validerReponse;
        document.getElementById("reponse-revision")?.focus();
    }else if(mode==="phrase_reconstituer"){
        const resultat=document.getElementById("revision-phrase-result");
        const mots=[...el.querySelectorAll(".revision-phrase-word")];
        const ordre=[];
        const valider=document.getElementById("valider-phrase");
        const reinitialiser=()=>{
            ordre.length=0;
            mots.forEach(button=>{
                button.disabled=false;
                button.classList.remove("selected");
            });
            if(resultat)resultat.textContent="";
        };
        mots.forEach(button=>{
            button.addEventListener("click",event=>{
                event.preventDefault();
                if(button.disabled)return;
                ordre.push(button.dataset.word||button.textContent.trim());
                button.disabled=true;
                button.classList.add("selected");
                if(resultat)resultat.textContent=ordre.join(" ");
            });
        });
        valider?.addEventListener("click",event=>{
            event.preventDefault();
            if(!ordre.length){
                const feedback=document.getElementById("feedback-revision");
                feedback.textContent="Sélectionne les mots dans l'ordre avant de valider.";
                feedback.className="revision-feedback error";
                return;
            }
            const reponse=normaliserTexte(ordre.join(" "));
            const correct=reponse===session.phraseReponse;
            const feedback=document.getElementById("feedback-revision");
            if(correct){
                feedback.textContent="Bonne réponse. Continue comme ça.";
                feedback.className="revision-feedback success";
                marquerQuestionReussie();
                valider.textContent="Question suivante";
                valider.onclick=()=>{session.index++;afficherQuestionSession();};
            }else{
                feedback.textContent="La phrase n'est pas dans le bon ordre. Recommence.";
                feedback.className="revision-feedback error";
                reinitialiser();
            }
        });
    }else if(mode==="mots_meles"){
        const grille=document.getElementById("revision-word-grid");
        let debut=null;
        let selection=[];
        const effacer=()=>{
            selection.forEach(cell=>cell.classList.remove("selected"));
            selection=[];
            debut=null;
        };
        const cellule=(r,c)=>grille?.querySelector('[data-word-row="'+r+'"][data-word-col="'+c+'"]');
        const validerSelection=()=>{
            if(!selection.length)return;
            const mot=selection.map(cell=>normaliserTexte(cell.textContent)).join("");
            const inverse=[...mot].reverse().join("");
            const correct=mot===session.motsMeles.mot||inverse===session.motsMeles.mot;
            const feedback=document.getElementById("feedback-revision");
            if(correct){
                selection.forEach(cell=>cell.classList.add("found"));
                marquerQuestionReussie();
                feedback.textContent="Mot trouvé !";
                feedback.className="revision-feedback success";
                selection.forEach(cell=>cell.disabled=true);
                const bouton=document.createElement("button");
                bouton.type="button";
                bouton.className="primary-button";
                bouton.textContent="Question suivante";
                bouton.onclick=()=>{session.index++;afficherQuestionSession();};
                feedback.after(bouton);
            }else{
                feedback.textContent="Ce n’est pas le bon mot. Recommence.";
                feedback.className="revision-feedback error";
                effacer();
            }
        };
        grille?.querySelectorAll(".revision-word-cell").forEach(cell=>cell.addEventListener("click",()=>{
            if(cell.disabled)return;
            const r=Number(cell.dataset.wordRow),c=Number(cell.dataset.wordCol);
            if(!debut){
                debut={r,c};
                selection=[cell];
                cell.classList.add("selected");
                return;
            }
            const dr=Math.sign(r-debut.r),dc=Math.sign(c-debut.c);
            const distance=Math.max(Math.abs(r-debut.r),Math.abs(c-debut.c));
            if(distance===0||!(dr===0||dc===0||Math.abs(r-debut.r)===Math.abs(c-debut.c))){
                effacer();
                debut={r,c};
                selection=[cell];
                cell.classList.add("selected");
                return;
            }
            selection.forEach(x=>x.classList.remove("selected"));
            selection=[];
            for(let i=0;i<=distance;i++){
                const cible=cellule(debut.r+dr*i,debut.c+dc*i);
                if(!cible){effacer();return;}
                selection.push(cible);
            }
            selection.forEach(x=>x.classList.add("selected"));
            validerSelection();
        }));
        }else{
        contenu+='<h3>'+escapeHtml(promptQuestion(q))+'</h3><textarea id="reponse-revision" rows="5" placeholder="Écris ta réponse..."></textarea><button type="button" class="primary-button" id="valider-reponse">Valider</button>';
    }

    cacherToutesLesVues();
    el.hidden=false;
    el.innerHTML='<div class="section-heading"><div><span class="section-label">EN COURS</span><h2>'+escapeHtml(ficheEtude.titre)+'</h2></div></div>'+contenu+'<p id="feedback-revision" class="revision-feedback" role="status"></p>';

    if(mode==="flashcards"){
        const reveal=document.getElementById("reveler-reponse");
        reveal.onclick=()=>{document.getElementById("reponse-cachee").hidden=false;reveal.textContent="Je connaissais la réponse";reveal.onclick=()=>{marquerQuestionReussie();session.index++;afficherQuestionSession();};};
    }else if(mode==="qcm"||mode==="paires"){
        el.querySelectorAll(".revision-choice").forEach(button=>button.onclick=()=>enregistrerChoix(button.dataset.answer,bonne));
    }else if(mode==="relier"){
        const container=document.getElementById("revision-linking"),svg=container?.querySelector(".revision-link-lines"),selected={button:null},connections=new Set();
        const redraw=()=>{if(!container||!svg)return;svg.innerHTML="";const base=container.getBoundingClientRect();connections.forEach(id=>{const left=container.querySelector('.revision-link-left[data-id="'+id+'"]'),right=container.querySelector('.revision-link-right[data-id="'+id+'"]');if(!left||!right)return;const a=left.getBoundingClientRect(),b=right.getBoundingClientRect(),line=document.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1",a.right-base.left);line.setAttribute("y1",a.top+a.height/2-base.top);line.setAttribute("x2",b.left-base.left);line.setAttribute("y2",b.top+b.height/2-base.top);line.setAttribute("class","revision-link-line");svg.appendChild(line);});};
        const choose=(button,side)=>{
            if(button.disabled)return;
            if(side==="left"){if(selected.button)selected.button.classList.remove("selected");selected.button=button;button.classList.add("selected");return;}
            if(!selected.button)return;
            const left=selected.button;
            if(left.dataset.id!==button.dataset.id){const feedback=document.getElementById("feedback-revision");feedback.textContent="Ce n’est pas la bonne paire. Essaie encore.";feedback.className="revision-feedback error";left.classList.remove("selected");selected.button=null;return;}
            connections.add(button.dataset.id);left.disabled=true;button.disabled=true;left.classList.remove("selected");selected.button=null;redraw();
            const feedback=document.getElementById("feedback-revision");feedback.textContent="Bonne liaison.";feedback.className="revision-feedback success";
            if(connections.size===session.relier.length){marquerQuestionReussie();const next=document.createElement("button");next.type="button";next.className="primary-button";next.textContent="Question suivante";next.onclick=()=>{session.index++;afficherQuestionSession();};feedback.after(next);}
        };
        el.querySelectorAll(".revision-link-left").forEach(b=>b.onclick=()=>choose(b,"left"));el.querySelectorAll(".revision-link-right").forEach(b=>b.onclick=()=>choose(b,"right"));
        requestAnimationFrame(redraw);const resize=()=>requestAnimationFrame(redraw);window.addEventListener("resize",resize);session.relierCleanup=()=>window.removeEventListener("resize",resize);
    }else if(mode==="phrase_reconstituer"){
        const resultat=document.getElementById("revision-phrase-result");
        const mots=[...el.querySelectorAll(".revision-phrase-word")];
        const ordre=[];
        const reset=document.getElementById("reinitialiser-phrase");
        const reinitialiser=()=>{
            ordre.length=0;
            mots.forEach(button=>{button.disabled=false;button.classList.remove("selected");});
            if(resultat)resultat.textContent="Clique sur les mots dans le bon ordre.";
        };
        mots.forEach(button=>button.addEventListener("click",()=>{
            if(button.disabled)return;
            ordre.push(button.textContent.trim());
            button.disabled=true;
            button.classList.add("selected");
            if(resultat)resultat.textContent=ordre.join(" ");
        }));
        reset?.addEventListener("click",reinitialiser);
        document.getElementById("valider-phrase")?.addEventListener("click",()=>{
            const feedback=document.getElementById("feedback-revision");
            const correct=normaliserTexte(ordre.join(" "))===session.phraseReponse;
            if(correct){
                feedback.textContent="Bonne réponse. Continue comme ça.";
                feedback.className="revision-feedback success";
                marquerQuestionReussie();
                const bouton=document.getElementById("valider-phrase");
                bouton.textContent="Question suivante";
                bouton.onclick=()=>{session.index++;afficherQuestionSession();};
            }else{
                feedback.textContent=ordre.length?"La phrase n'est pas dans le bon ordre. Recommence.":"Sélectionne les mots dans le bon ordre.";
                feedback.className="revision-feedback error";
                reinitialiser();
            }
        });
    }else if(mode==="mots_croises"){
        const bouton=document.getElementById("verifier-mots-croises"),inputs=[...el.querySelectorAll(".revision-crossword-cell input")];
        const entreePour=(input,direction)=>{const r=Number(input.dataset.crossRow),c=Number(input.dataset.crossCol);return session.motsCroises.entries.find(entry=>entry.dir===direction&&Array.from({length:entry.solution.length},(_,i)=>[entry.row+(entry.dir==="down"?i:0),entry.col+(entry.dir==="across"?i:0)]).some(([rr,cc])=>rr===r&&cc===c));};
        const celluleCroisee=(row,col)=>inputs.find(x=>Number(x.dataset.crossRow)===row&&Number(x.dataset.crossCol)===col);

        const directionsParCellule=input=>{
            const r=Number(input.dataset.crossRow),c=Number(input.dataset.crossCol);
            return ["across","down"].filter(direction=>entreePour(input,direction));
        };
        let directionActive="across";
        inputs.forEach(input=>{
            input.addEventListener("focus",()=>{
                const dirs=directionsParCellule(input);
                if(dirs.length===1)directionActive=dirs[0];
            });
            input.addEventListener("click",()=>{
                const dirs=directionsParCellule(input);
                if(dirs.length===2)directionActive=directionActive==="down"?"across":"down";
                else if(dirs.length===1)directionActive=dirs[0];
            });
            input.addEventListener("input",()=>{
                input.value=normaliserTexte(input.value).replace(/\s/g,"").slice(-1).toUpperCase();
                input.classList.remove("incorrect");
                const entry=entreePour(input,directionActive)||entreePour(input,directionActive==="down"?"across":"down");
                if(!entry)return;
                const r=Number(input.dataset.crossRow),cc=Number(input.dataset.crossCol),i=entry.dir==="down"?r-entry.row:cc-entry.col;
                celluleCroisee(entry.row+(entry.dir==="down"?i+1:0),entry.col+(entry.dir==="across"?i+1:0))?.focus();
            });
            input.addEventListener("keydown",event=>{
                const directions={ArrowLeft:[0,-1,"across"],ArrowRight:[0,1,"across"],ArrowUp:[-1,0,"down"],ArrowDown:[1,0,"down"]};
                if(directions[event.key]){
                    event.preventDefault();
                    const [dr,dc,dir]=directions[event.key];
                    directionActive=dir;
                    const cible=celluleCroisee(Number(input.dataset.crossRow)+dr,Number(input.dataset.crossCol)+dc);
                    if(cible)cible.focus();
                    return;
                }
                if(event.key==="Backspace"&&!input.value){
                    event.preventDefault();
                    const entry=entreePour(input,directionActive)||entreePour(input,directionActive==="down"?"across":"down");
                    if(!entry)return;
                    const r=Number(input.dataset.crossRow),cc=Number(input.dataset.crossCol),i=entry.dir==="down"?r-entry.row:cc-entry.col;
                    celluleCroisee(entry.row+(entry.dir==="down"?i-1:0),entry.col+(entry.dir==="across"?i-1:0))?.focus();
                }
            });
        });
    el.querySelectorAll(".revision-crossword-clue").forEach(clue=>clue.onclick=()=>{
            const [number,direction]=clue.dataset.crossEntry.split("-");
            const entry=session.motsCroises.entries.find(x=>String(x.number)===number&&x.dir===direction);
            if(!entry)return;
            directionActive=direction;
            inputs.find(x=>Number(x.dataset.crossRow)===entry.row&&Number(x.dataset.crossCol)===entry.col)?.focus();
        });
        bouton?.addEventListener("click",()=>{
            let total=0,correct=0;session.motsCroises.grid.forEach((row,r)=>row.forEach((cell,c)=>{if(!cell)return;const input=el.querySelector('[data-cross-row="'+r+'"][data-cross-col="'+c+'"]');if(!input)return;total++;const value=normaliserTexte(input.value).replace(/\s/g,"");input.classList.remove("correct","incorrect");if(value===cell.letter){correct++;input.classList.add("correct");}else if(value)input.classList.add("incorrect");}));
            const feedback=document.getElementById("feedback-revision");
            if(total&&correct===total){marquerQuestionReussie();feedback.textContent="Grille complète et correcte.";feedback.className="revision-feedback success";bouton.textContent="Question suivante";bouton.onclick=()=>{session.index++;afficherQuestionSession();};}
            else{feedback.textContent="Il reste des cases à corriger.";feedback.className="revision-feedback error";}
        });
    }else if(mode==="glisser_deposer"){
        const zone=document.getElementById("revision-drop-zone");        el.querySelectorAll(".revision-drag-item").forEach(item=>{item.addEventListener("dragstart",event=>event.dataTransfer?.setData("text/plain",item.dataset.answer||""));item.addEventListener("click",()=>enregistrerChoix(item.dataset.answer,bonne));});
        if(zone){zone.addEventListener("dragover",event=>event.preventDefault());zone.addEventListener("drop",event=>{event.preventDefault();enregistrerChoix(event.dataTransfer?.getData("text/plain")||"",bonne);});}
    }else if(mode==="vrai_faux"){
        document.getElementById("vf-vrai").onclick=()=>enregistrerChoix("vrai",session.vraiFaux.correct?"vrai":"faux");document.getElementById("vf-faux").onclick=()=>enregistrerChoix("faux",session.vraiFaux.correct?"vrai":"faux");
    }else if(mode==="intrus"){
        el.querySelectorAll(".revision-choice").forEach(button=>button.onclick=()=>enregistrerChoix(button.dataset.answer,session.intrus));
    }else if(mode==="mots_meles"){
        const bouton=document.getElementById("valider-reponse"),champ=document.getElementById("reponse-revision"),grille=document.getElementById("revision-word-grid");
        let premier=null,selection=[];
        const effacer=()=>{selection.forEach(cell=>cell.classList.remove("selected"));selection=[];};
        const surligner=()=>{const p=session.motsMeles.placement;if(!p)return;const [r0,c0,r1,c1]=p,dr=Math.sign(r1-r0),dc=Math.sign(c1-c0);for(let i=0;i<session.motsMeles.mot.length;i++)grille.querySelector('[data-word-row="'+(r0+dr*i)+'"][data-word-col="'+(c0+dc*i)+'"]')?.classList.add("found");};
        const valider=mot=>{const value=normaliserTexte(mot).replace(/\s/g,""),reverse=[...value].reverse().join(""),correct=value===session.motsMeles.mot||reverse===session.motsMeles.mot,feedback=document.getElementById("feedback-revision");if(correct){marquerQuestionReussie();champ.value=session.motsMeles.mot.toUpperCase();champ.disabled=true;bouton.textContent="Question suivante";bouton.onclick=()=>{session.index++;afficherQuestionSession();};feedback.textContent="Mot trouvé !";feedback.className="revision-feedback success";surligner();grille.querySelectorAll(".revision-word-cell").forEach(cell=>cell.disabled=true);}else{feedback.textContent="Ce n’est pas le bon mot. Cherche encore.";feedback.className="revision-feedback error";}};
        bouton.onclick=()=>valider(champ.value);
        const cellule=(r,c)=>grille.querySelector('[data-word-row="'+r+'"][data-word-col="'+c+'"]');
        grille.querySelectorAll(".revision-word-cell").forEach(cell=>cell.onclick=()=>{
            const r=Number(cell.dataset.wordRow),c=Number(cell.dataset.wordCol);
            if(!premier){premier={r,c};selection=[cell];cell.classList.add("selected");return;}
            const dr=Math.sign(r-premier.r),dc=Math.sign(c-premier.c),len=Math.max(Math.abs(r-premier.r),Math.abs(c-premier.c))+1;
            if(!(dr===0||dc===0||Math.abs(r-premier.r)===Math.abs(c-premier.c))){effacer();premier=null;return;}
            effacer();let mot="";
            for(let i=0;i<len;i++){const cible=cellule(premier.r+dr*i,premier.c+dc*i);if(!cible){mot="";break;}mot+=cible.textContent.toLowerCase();selection.push(cible);}
            selection.forEach(x=>x.classList.add("selected"));premier=null;if(mot)valider(mot);else effacer();
        });
    }else{
        const bouton=document.getElementById("valider-reponse");
        if(bouton){bouton.onclick=validerReponse;document.getElementById("reponse-revision")?.focus();}
    }
    // Modes à interaction personnalisée : leurs handlers doivent être attachés après le rendu HTML.    if(mode==="lettres_melangees"||mode==="mot_mystere"){        const bouton=document.getElementById("valider-reponse");        if(bouton)bouton.onclick=validerReponse;        document.getElementById("reponse-revision")?.focus();    }else if(mode==="phrase_reconstituer"){        const resultat=document.getElementById("revision-phrase-result");        const mots=[...el.querySelectorAll(".revision-phrase-word")];        const ordre=[];        mots.forEach(button=>button.onclick=()=>{            if(button.disabled)return;            ordre.push(button.textContent.trim());            button.disabled=true;            button.classList.add("selected");            if(resultat)resultat.textContent=ordre.join(" ");        });        const bouton=document.getElementById("valider-phrase");        if(bouton)bouton.onclick=()=>{            const reponse=normaliserTexte(ordre.join(" "));            const correct=reponse===session.phraseReponse;            const feedback=document.getElementById("feedback-revision");            feedback.textContent=correct?"Bonne réponse. Continue comme ça.":"La phrase n'est pas dans le bon ordre.";            feedback.className="revision-feedback "+(correct?"success":"error");            if(correct){                marquerQuestionReussie();                bouton.textContent="Question suivante";                bouton.onclick=()=>{session.index++;afficherQuestionSession();};            }else{                mots.forEach(button=>{button.disabled=false;button.classList.remove("selected");});                ordre.length=0;                if(resultat)resultat.textContent="";            }        };    }    el.scrollIntoView({behavior:"smooth",block:"start"});
}

function enregistrerChoix(reponse,attendue){
    const feedback=document.getElementById("feedback-revision");
    const correct=normaliserTexte(reponse)===normaliserTexte(attendue);
    feedback.textContent=correct?"Bonne réponse. Continue comme ça.":"Réponse attendue : "+attendue;
    feedback.className="revision-feedback "+(correct?"success":"error");
    if(correct)marquerQuestionReussie();
    document.querySelectorAll(".revision-choice,#vf-vrai,#vf-faux").forEach(b=>b.disabled=true);
    const suivant=document.createElement("button");
    suivant.type="button";suivant.className="primary-button";suivant.textContent="Question suivante";
    suivant.onclick=()=>{session.index++;afficherQuestionSession();};
    feedback.after(suivant);
}
function validerReponse(){
    if(!session)return;
    const q=session.questions[session.index],mode=session.modesParQuestion[session.index];
    const champ=document.getElementById("reponse-revision"),bouton=document.getElementById("valider-reponse"),feedback=document.getElementById("feedback-revision");
    const attendu=mode==="definition_terme"?valeurs(q)[0]:mode==="timeline"?valeurs(q)[0]:mode==="mot_mystere"?session.mystere:mode==="phrase_reconstituer"?session.phraseReponse:mode==="lettres_melangees"?session.lettresMelangees:mode==="mots_croises"?valeurs(q)[0]:mode==="mots_meles"?(session.motsMeles?.mot||valeurs(q)[0]):valeurs(q)[1];
    const resultat=evaluerReponse(attendu,champ.value);
    feedback.textContent=resultat.correct?"Bonne réponse. Continue comme ça.":"Réponse attendue : "+attendu;
    feedback.className="revision-feedback "+(resultat.correct?"success":"error");
    if(resultat.correct)marquerQuestionReussie();
    champ.disabled=true;bouton.textContent="Question suivante";bouton.onclick=()=>{session.index++;afficherQuestionSession();};
}
function afficherResultatRevision(){
    const total=session.questions.length;
    const pct=total?Math.round(session.score/total*100):0;
    let commentaire="Continue tes révisions : chaque question travaillée te fait progresser.";
    if(pct===100)commentaire="Excellent travail : toutes les réponses sont correctes.";
    else if(pct>=80)commentaire="Très bon travail : tes connaissances sont bien maîtrisées.";
    else if(pct>=60)commentaire="Bon travail : encore quelques révisions et ce sera solide.";
    else if(pct>=40)commentaire="Tu as les bases. Reprends les points difficiles et réessaie.";
    const el=document.getElementById("revision-session");
    cacherToutesLesVues();
    el.hidden=false;
    el.innerHTML='<div class="revision-result"><span class="section-label">RÉSULTAT</span><h2>'+pct+'%</h2><p class="revision-score">'+session.score+' / '+total+'</p><p>'+commentaire+'</p>'+
    '<button type="button" class="primary-button" id="recommencer-revision">Recommencer</button> '+
    '<button type="button" class="secondary-button" id="retour-fiches">Retour aux fiches</button></div>';
    document.getElementById("recommencer-revision").onclick=()=>{
        const totalQuestions=session.questions.length;
        const modes=session.modes;
        const questionsEligibles=ficheEtude.questions.filter(q=>modes.some(mode=>modeUtilisablePourQuestion(q,mode)));
        const questions=melanger(questionsEligibles).slice(0,totalQuestions);
        session={questions,modes,index:0,score:0,questionsReussies:new Set(),modesParQuestion:questions.map(q=>{
            const compatibles=modes.filter(mode=>modeUtilisablePourQuestion(q,mode));
            const disponibles=compatibles.length?compatibles:Object.keys(MODES_REVISION).filter(mode=>modeUtilisablePourQuestion(q,mode));
            return disponibles.length?disponibles[Math.floor(Math.random()*disponibles.length)]:"questions";
        })};
        afficherQuestionSession();
    };
    document.getElementById("retour-fiches").onclick=retourFiches;
    el.scrollIntoView({behavior:"smooth",block:"start"});
}

function ajouterQuestion(){
    questionsRevision.push({id:crypto.randomUUID(),type:"",data:{},editing:true});
    afficherQuestions();
}

function afficherQuestions(){
    const container=document.getElementById("questions-container");
    document.getElementById("nombre-questions").textContent=questionsRevision.length+" question"+(questionsRevision.length>1?"s":"");
    container.innerHTML=questionsRevision.map((question,index)=>{
        const type=TYPES_REVISION[question.type];
        if(!question.editing){
            return '<article class="revision-question-summary"><div><span class="small-label">QUESTION '+(index+1)+'</span><strong>'+escapeHtml(type?.label||"Question")+'</strong></div>'+
            '<div class="revision-summary-actions"><button type="button" class="secondary-button revision-edit" data-id="'+question.id+'">Éditer</button><button type="button" class="danger-button revision-delete" data-id="'+question.id+'">Supprimer</button></div></article>';
        }
        return '<article class="revision-question-card" data-question-id="'+question.id+'">'+
        '<div class="revision-question-top" style="margin-left: 20px;margin-top: 10px;"><div><span class="small-label">QUESTION '+(index+1)+'</span><h3>'+escapeHtml(type?.label||"Nouvelle question")+'</h3></div><button type="button" class="danger-button revision-delete" data-id="'+question.id+'">Supprimer</button></div>'+
        '<label style="margin-left: 20px; margin-top: 10px;">Type de donnée</label><select class="revision-type-select"><option value="">Choisir un type...</option>'+
        Object.entries(TYPES_REVISION).map(([key,item])=>'<option value="'+key+'" '+(key===question.type?"selected":"")+'>'+escapeHtml(item.label)+'</option>').join("")+
        '</select>'+
        (type?'<div class="revision-fields">'+type.fields.map(([name,label,placeholder,inputType])=>
            '<label>'+escapeHtml(label)+'</label>'+
            (inputType==="textarea"?'<textarea data-field="'+name+'" rows="4" required placeholder="'+escapeHtml(placeholder)+'">'+escapeHtml(question.data[name]||"")+'</textarea>':'<input data-field="'+name+'" type="text" required value="'+escapeHtml(question.data[name]||"")+'" placeholder="'+escapeHtml(placeholder)+'">')
        ).join("")+'<button type="button" class="secondary-button revision-finish-edit">Terminer</button></div>':'<p class="revision-type-help">Choisis d’abord un type de donnée.</p>')+
        '</article>';
    }).join("");
    container.querySelectorAll(".revision-type-select").forEach(select=>select.onchange=e=>{
        const card=e.target.closest(".revision-question-card");
        const q=questionsRevision.find(x=>x.id===card.dataset.questionId);
        q.type=e.target.value;q.data={};afficherQuestions();
    });
    container.querySelectorAll("[data-field]").forEach(field=>field.oninput=e=>{
        const card=e.target.closest(".revision-question-card");
        const q=questionsRevision.find(x=>x.id===card.dataset.questionId);
        q.data[e.target.dataset.field]=e.target.value;
    });
    container.querySelectorAll(".revision-finish-edit").forEach(button=>button.onclick=()=>{
        const card=button.closest(".revision-question-card"),q=questionsRevision.find(x=>x.id===card.dataset.questionId);
        if(!q.type)return;
        const fields=[...card.querySelectorAll("[data-field]")];
        if(fields.some(field=>!field.value.trim())){alert("Remplis tous les champs de cette question.");return;}
        q.editing=false;afficherQuestions();
    });
    container.querySelectorAll(".revision-edit").forEach(button=>button.onclick=()=>{
        const q=questionsRevision.find(x=>x.id===button.dataset.id);q.editing=true;afficherQuestions();
    });
    container.querySelectorAll(".revision-delete").forEach(button=>button.onclick=()=>{
        questionsRevision=questionsRevision.filter(x=>x.id!==button.dataset.id);afficherQuestions();
    });
}

function initialiserCreation(){
    const ouvrir=document.getElementById("ouvrir-createur"),editor=document.getElementById("revision-editor"),accueil=document.getElementById("revision-accueil");
    const annuler=document.getElementById("annuler-fiche"),ajouter=document.getElementById("ajouter-question"),form=document.getElementById("fiche-form"),status=document.getElementById("revision-status");
    ouvrir.onclick=async()=>{
        if(!await utilisateurConnecte()){window.location.href="connexion.html";return;}
        questionsRevision=[];form.reset();afficherQuestions();status.textContent="";status.className="revision-status";
        cacherToutesLesVues();editor.hidden=false;editor.scrollIntoView({behavior:"smooth",block:"start"});
    };
    annuler.onclick=()=>{editor.hidden=true;accueil.hidden=false;};
    ajouter.onclick=ajouterQuestion;
    form.onsubmit=async event=>{
        event.preventDefault();
        const titre=document.getElementById("fiche-titre").value.trim(),matiere=document.getElementById("fiche-matiere").value.trim();
        if(!titre||!matiere){status.textContent="Remplis le nom et la matière.";status.className="revision-status error";return;}
        if(!questionsRevision.length){status.textContent="Ajoute au moins une question.";status.className="revision-status error";return;}
        if(questionsRevision.some(q=>q.editing||!q.type)){status.textContent="Termine toutes les questions avant de publier la fiche.";status.className="revision-status error";return;}
        const utilisateur=await utilisateurConnecte();
        if(!utilisateur){window.location.href="connexion.html";return;}
        const profil=await obtenirProfil();
        const fiche={titre,matiere,questions:questionsRevision.map(q=>({type:q.type,data:{...q.data}})),auteur_id:utilisateur.id,auteur_identifiant:profil?.identifiant||"Utilisateur"};
        status.textContent="Publication...";
        const {error}=await supabaseClient.from("fiches_revision").insert(fiche);
        if(error){console.error(error);status.textContent="Impossible de publier la fiche : "+error.message;status.className="revision-status error";return;}
        status.textContent="Fiche publiée !";status.className="revision-status success";
        questionsRevision=[];form.reset();editor.hidden=true;accueil.hidden=false;await actualiserFiches();
        accueil.scrollIntoView({behavior:"smooth",block:"start"});
    };
}

document.addEventListener("DOMContentLoaded",async()=>{
    try{
        initialiserCreation();
        await actualiserFiches();
    }catch(error){
        console.error("Erreur initialisation révision :",error);
        const liste=document.getElementById("liste-fiches");
        if(liste)liste.innerHTML='<div class="empty-state revision-empty"><h3>Erreur de chargement</h3><p>'+escapeHtml(error.message)+'</p></div>';
    }
});
