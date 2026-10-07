/* =========================================================
   RÉVISION — fiches, création et modes de révision
   ========================================================= */

const MAX_QUESTIONS_FICHE = 100;

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

const TOUS_TYPES = Object.keys(TYPES_REVISION);

const MODES_REVISION = {
    flashcards:{label:"Flashcard",types:TOUS_TYPES},
    questions:{label:"Question / réponse",types:TOUS_TYPES},
    qcm:{label:"QCM",types:TOUS_TYPES},
    vrai_faux:{label:"Vrai / Faux",types:TOUS_TYPES},
    reponse_ecrite:{label:"Réponse écrite",types:TOUS_TYPES},
    texte_trous:{label:"Texte à trous",types:TOUS_TYPES},
    definition_terme:{label:"Définition → terme",types:["definition","vocabulaire"]},
    terme_definition:{label:"Terme → définition",types:TOUS_TYPES},
    paires:{label:"Paires",types:TOUS_TYPES},
    relier:{label:"Relier",types:TOUS_TYPES},
    glisser_deposer:{label:"Glisser-déposer",types:TOUS_TYPES},
    lettres_melangees:{label:"Lettres mélangées",types:["definition","vocabulaire","personne","lieu"]},
    mot_mystere:{label:"Mot mystère",types:["definition","vocabulaire","personne","lieu"]},
    phrase_reconstituer:{label:"Phrase à reconstituer",types:["question","definition","vocabulaire","regle","methode","processus","exemple","liste"]},
    timeline:{label:"Frise chronologique",types:["date"]},
    intrus:{label:"Trouver l'intrus",types:TOUS_TYPES},
    exercice:{label:"Exercice classique",types:TOUS_TYPES},
    mots_croises:{label:"Mots croisés",types:["definition","question","vocabulaire","personne","lieu","regle","methode","processus","cause","exemple"]},
    mots_meles:{label:"Mots mêlés",types:["definition","question","vocabulaire","personne","lieu","exemple"]},
    puzzle:{label:"Puzzle",types:TOUS_TYPES}
};

let questionsRevision = [];
let ficheEtude = null;
let session = null;

/* ---------- Utilitaires ---------- */

function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

/* ---------- Suivi d'utilisation ---------- */

function idVisiteur(){
    try{
        let id=localStorage.getItem("visiteur_id");
        if(!id){id=genererId();localStorage.setItem("visiteur_id",id);}
        return id;
    }catch{return null;}
}

async function enregistrerEvenement(evenement,extra={}){
    try{
        if(!ficheEtude)return;
        const utilisateur=await utilisateurConnecte();
        const profil=utilisateur?await obtenirProfil():null;
        const {error}=await supabaseClient.from("fiche_vues").insert({
            fiche_id:String(ficheEtude.id),
            fiche_titre:ficheEtude.titre,
            evenement,
            visiteur_id:idVisiteur(),
            user_id:utilisateur?.id??null,
            user_identifiant:profil?.identifiant??null,
            ...extra
        });
        if(error)console.warn("Suivi non enregistré :",error.message);
    }catch(e){
        console.warn("Suivi non enregistré :",e);
    }
}

/* Échappe puis convertit les vrais retours à la ligne en <br> */
function htmlTexte(value){
    return escapeHtml(value).replace(/\r?\n/g,"<br>");
}

function genererId(){
    return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():"q-"+Date.now().toString(36)+Math.random().toString(36).slice(2);
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
    const v=map[q?.type]||["",""];
    return [String(v[0]??"").trim(),String(v[1]??"").trim()];
}

function normaliserTexte(t){
    return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/['’]/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}

function sansEspaces(t){
    return normaliserTexte(t).replace(/\s/g,"");
}

const MOTS_VIDES=new Set("le la les un une des du de d au aux et ou en dans sur sous pour par avec sans est sont a que qui quoi quel quelle quels quelles ce cette ces se sa son ses il elle ils elles je tu on nous vous".split(" "));

function distanceLevenshtein(a,b){
    if(a===b)return 0;
    const m=a.length,n=b.length;
    if(!m)return n;
    if(!n)return m;
    let prev=Array.from({length:n+1},(_,i)=>i);
    for(let i=1;i<=m;i++){
        const cur=[i];
        for(let j=1;j<=n;j++){
            cur[j]=a[i-1]===b[j-1]?prev[j-1]:1+Math.min(prev[j-1],prev[j],cur[j-1]);
        }
        prev=cur;
    }
    return prev[n];
}

function motsSignificatifs(texte){
    return normaliserTexte(texte).split(" ").filter(mot=>mot&&!MOTS_VIDES.has(mot));
}

function toleranceOrthographe(mot){
    if(/\d/.test(mot))return 0;          // dates et nombres : aucune tolérance
    if(mot.length<=3)return 0;
    if(mot.length<=6)return 1;
    return 2;
}

function motsProches(a,b){
    return a===b||distanceLevenshtein(a,b)<=toleranceOrthographe(a);
}

function evaluerReponse(attendue,reponse){
    const a=normaliserTexte(attendue),r=normaliserTexte(reponse);
    if(!a||!r)return {correct:false,score:0};
    if(a===r)return {correct:true,score:1};
    const motsA=motsSignificatifs(attendue);
    if(!motsA.length)return {correct:false,score:0};
    const motsR=[...motsSignificatifs(reponse)];
    let trouves=0;
    for(const mot of motsA){
        const idx=motsR.findIndex(m=>motsProches(mot,m));
        if(idx!==-1){trouves++;motsR.splice(idx,1);}
    }
    const score=trouves/motsA.length;
    const seuil=motsA.length<=2?1:0.7;
    return {correct:score>=seuil,score};
}

/* Mélange de Fisher-Yates (uniforme) */
function melanger(array){
    const t=[...array];
    for(let i=t.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [t[i],t[j]]=[t[j],t[i]];
    }
    return t;
}

/* ---------- Chargement et liste des fiches ---------- */

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

/* ---------- Énoncés ---------- */

/* Chaque énoncé affiche la donnée à partir de laquelle on doit retrouver la réponse (v[0]) */
function promptQuestion(q){
    const v=valeurs(q);
    switch(q.type){
        case "question":return v[0];
        case "definition":case "vocabulaire":return "Qu'est-ce que "+v[0]+" ?";
        case "date":return "À quel événement correspond la date ou période « "+v[0]+" » ?";
        case "personne":return "Qui est "+v[0]+" ?";
        case "lieu":return "Que faut-il retenir sur "+v[0]+" ?";
        case "formule":return "À quoi sert la formule « "+v[0]+" » ?";
        case "regle":return "Dans quel cas applique-t-on cette règle : « "+v[0]+" » ?";
        case "methode":case "processus":return "Quelles sont les étapes de "+v[0]+" ?";
        case "cause":return "Quelle est la conséquence de : « "+v[0]+" » ?";
        case "exemple":return "Donne un exemple pour "+v[0]+".";
        case "liste":return "Quels éléments faut-il retenir pour "+v[0]+" ?";
        default:return "Réponds à la question.";
    }
}

/* ---------- Mots pour les jeux de lettres ---------- */

/* Mot (ou terme) à deviner pour mots croisés / mots mêlés, avec son indice */
function sourceEtIndice(q){
    const v=valeurs(q),estQuestion=q?.type==="question";
    return {source:estQuestion?v[1]:v[0],indice:estQuestion?v[0]:v[1]};
}

function extraireMotCroise(q){
    const {source,indice}=sourceEtIndice(q);
    const solution=sansEspaces(source);
    if(solution.length<3||solution.length>12||!indice)return null;
    return {solution,indice};
}

function motPourMotsMeles(q){
    const {source,indice}=sourceEtIndice(q);
    const mots=normaliserTexte(source).split(" ").filter(x=>x.length>=3&&x.length<=12);
    if(!mots.length||!indice)return null;
    return {mot:mots.sort((a,b)=>b.length-a.length)[0],indice};
}

/* Terme complet pour lettres mélangées / mot mystère (indice = définition) */
function termePourJeuDeLettres(q){
    const v=valeurs(q),n=sansEspaces(v[0]).length;
    if(n<3||n>20||!v[1])return null;
    return {terme:v[0],indice:v[1]};
}

function melangerLettres(texte){
    const source=sansEspaces(texte),lettres=[...source];
    if(lettres.length<2)return source;
    let resultat=source;
    for(let i=0;i<30&&resultat===source;i++)resultat=melanger(lettres).join("");
    if(resultat===source)resultat=lettres.slice(1).concat(lettres[0]).join("");
    return resultat;
}

function motMystere(texte){
    const chars=[...String(texte||"").trim()];
    const estLettre=c=>/[\p{L}\p{N}]/u.test(c);
    const indices=chars.map((c,i)=>estLettre(c)?i:-1).filter(i=>i>=0);
    const visibles=new Set(melanger(indices).slice(0,Math.max(1,Math.ceil(indices.length*.35))));
    const masque=chars.map((c,i)=>estLettre(c)?(visibles.has(i)?c:"_"):"/").join(" ");
    return {masque,solution:sansEspaces(texte)};
}

function phrasePourReconstituer(q){
    const p=valeurs(q)[1];
    if(!p||/\n/.test(p))return null;
    const n=p.split(/\s+/).length;
    return n>=3&&n<=14?p:null;
}

function phraseMelangee(texte){
    const mots=String(texte||"").trim().split(/\s+/).filter(Boolean);
    let resultat=melanger(mots);
    for(let i=0;i<20&&resultat.join(" ")===mots.join(" ");i++)resultat=melanger(mots);
    return resultat;
}

function anneeDe(q){
    const texte=valeurs(q)[0];
    const m=texte.match(/\d{1,4}/);
    if(!m)return null;
    const an=Number(m[0]);
    return /\bav(ant|\.)?\s*J/i.test(texte)?-an:an;
}

/* ---------- Disponibilité des modes ---------- */

function questionsAvecPaire(){
    return ficheEtude.questions.filter(x=>{const v=valeurs(x);return v[0]&&v[1];});
}

function reponsesDistinctes(){
    return new Set(questionsAvecPaire().map(x=>normaliserTexte(valeurs(x)[1])).filter(Boolean)).size;
}

/* Groupe de n questions (dont q) dont les réponses sont toutes différentes */
function groupeDistinct(q,n){
    const vus=new Set([normaliserTexte(valeurs(q)[1])]),groupe=[q];
    for(const x of melanger(questionsAvecPaire())){
        if(groupe.length>=n)break;
        if(x===q)continue;
        const k=normaliserTexte(valeurs(x)[1]);
        if(vus.has(k))continue;
        vus.add(k);groupe.push(x);
    }
    return groupe;
}

function groupeFrise(q,n){
    const dates=ficheEtude.questions.filter(x=>x.type==="date"&&anneeDe(x)!==null);
    const annees=new Set([anneeDe(q)]),groupe=[q];
    for(const x of melanger(dates)){
        if(groupe.length>=n)break;
        if(x===q||annees.has(anneeDe(x)))continue;
        annees.add(anneeDe(x));groupe.push(x);
    }
    return groupe;
}

function modeUtilisablePourQuestion(q,mode){
    const def=MODES_REVISION[mode];
    if(!q||!def||!ficheEtude||!def.types.includes(q.type))return false;
    const v=valeurs(q);
    if(!v[0]||!v[1])return false;
    switch(mode){
        case "qcm":case "paires":case "glisser_deposer":return reponsesDistinctes()>=3;
        case "vrai_faux":return reponsesDistinctes()>=2;
        case "relier":case "puzzle":case "intrus":return groupeDistinct(q,3).length>=3;
        case "phrase_reconstituer":return !!phrasePourReconstituer(q);
        case "mots_croises":return !!extraireMotCroise(q)&&ficheEtude.questions.filter(extraireMotCroise).length>=2;
        case "mots_meles":return !!motPourMotsMeles(q);
        case "lettres_melangees":case "mot_mystere":return !!termePourJeuDeLettres(q);
        case "timeline":return anneeDe(q)!==null&&groupeFrise(q,3).length>=3;
        default:return true;
    }
}

/* ---------- Écrans : configuration, retour ---------- */

function cacherToutesLesVues(){
    document.getElementById("revision-accueil").hidden=true;
    document.getElementById("revision-editor").hidden=true;
    document.getElementById("revision-config").hidden=true;
    document.getElementById("revision-session").hidden=true;
}

function nettoyerSession(){
    if(session?.modeCleanup){session.modeCleanup();session.modeCleanup=null;}
}

function retourFiches(){
    nettoyerSession();
    session=null;
    cacherToutesLesVues();
    document.getElementById("revision-accueil").hidden=false;
    document.getElementById("revision-accueil").scrollIntoView({behavior:"smooth",block:"start"});
}

function afficherConfigurationRevision(fiche){
    const questions=Array.isArray(fiche.questions)?fiche.questions.filter(q=>q&&q.data&&TYPES_REVISION[q.type]):[];
    if(!questions.length){
        alert("Cette fiche ne contient aucune question utilisable.");
        return;
    }
    ficheEtude={...fiche,questions};
    const config=document.getElementById("revision-config");
    config.innerHTML=
        '<div class="section-heading"><div><span class="section-label">RÉVISER</span><h2>'+escapeHtml(fiche.titre)+'</h2></div>'+
        '<button type="button" class="secondary-button" id="fermer-config">Fermer</button></div>'+
        '<p class="revision-intro">Choisis le nombre de questions et les modes de révision. Les modes grisés ne sont pas possibles avec le contenu de cette fiche.</p>'+
        '<div class="revision-config-grid">'+
        '<div class="revision-config-block"><label for="nombre-a-reviser">Nombre de questions</label><input id="nombre-a-reviser" type="number" min="1" max="'+questions.length+'" value="'+Math.min(questions.length,10)+'"><small>Maximum : '+questions.length+'</small></div>'+
        '<div class="revision-config-block"><span class="revision-config-label">Modes de révision</span><div class="revision-mode-actions"><button type="button" class="secondary-button" id="selectionner-tous-modes">Tout sélectionner</button><button type="button" class="secondary-button" id="deselectionner-tous-modes">Tout désélectionner</button></div><div class="revision-mode-list">'+
        Object.entries(MODES_REVISION).map(([key,mode])=>{
            const compatible=questions.some(q=>modeUtilisablePourQuestion(q,key));
            return '<label class="revision-mode-option'+(compatible?'':' is-disabled')+'"><input type="checkbox" name="revision-mode" value="'+key+'" '+(compatible?'checked':'disabled')+'><span>'+escapeHtml(mode.label)+'</span></label>';
        }).join("")+
        '</div></div></div>'+
        '<button type="button" class="primary-button" id="lancer-revision">Commencer la révision</button>'+
        '<p id="revision-config-status" class="revision-status" role="status"></p>';
    cacherToutesLesVues();
    config.hidden=false;
    document.getElementById("fermer-config").onclick=retourFiches;
    const cases=()=>document.querySelectorAll('input[name="revision-mode"]:not(:disabled)');
    document.getElementById("selectionner-tous-modes").onclick=()=>cases().forEach(i=>i.checked=true);
    document.getElementById("deselectionner-tous-modes").onclick=()=>cases().forEach(i=>i.checked=false);
    document.getElementById("lancer-revision").onclick=lancerRevision;
    config.scrollIntoView({behavior:"smooth",block:"start"});
}

function creerSession(questions,modes){
    return {
        questions,modes,index:0,score:0,
        questionsReussies:new Set(),fautes:new Set(),
        etat:{},modeCleanup:null,
        modesParQuestion:questions.map(q=>{
            const ok=modes.filter(m=>modeUtilisablePourQuestion(q,m));
            return ok[Math.floor(Math.random()*ok.length)];
        })
    };
}

function questionsEligibles(modes){
    return ficheEtude.questions.filter(q=>modes.some(m=>modeUtilisablePourQuestion(q,m)));
}

function lancerRevision(){
    const nombre=Number(document.getElementById("nombre-a-reviser").value);
    const modes=[...document.querySelectorAll('input[name="revision-mode"]:checked')].map(x=>x.value);
    const status=document.getElementById("revision-config-status");
    const erreur=msg=>{status.textContent=msg;status.className="revision-status error";};

    if(!Number.isInteger(nombre)||nombre<1||nombre>ficheEtude.questions.length)return erreur("Choisis un nombre de questions valide.");
    if(!modes.length)return erreur("Sélectionne au moins un mode de révision.");
    const eligibles=questionsEligibles(modes);
    if(eligibles.length<nombre)return erreur("Avec les modes sélectionnés, seules "+eligibles.length+" question"+(eligibles.length>1?"s":"")+" sont utilisables.");

    session=creerSession(melanger(eligibles).slice(0,nombre),modes);
    enregistrerEvenement("session",{nb_questions:nombre,modes:modes.join(",")});
    afficherQuestionSession();
}

/* ---------- Score, navigation, retours ---------- */

function marquerQuestionReussie(){
    if(!session||session.questionsReussies.has(session.index)||session.fautes.has(session.index))return false;
    session.questionsReussies.add(session.index);
    session.score=Math.min(session.questions.length,session.score+1);
    return true;
}

/* Une erreur sur la question empêche de gagner le point (jeux à essais multiples) */
function signalerFaute(){
    if(session)session.fautes.add(session.index);
}

function allerSuivant(){
    session.index++;
    afficherQuestionSession();
}

/* Transforme un bouton existant en « Question suivante », ou en ajoute un après l'ancre */
function proposerSuivant(ancre,bouton){
    document.getElementById("passer-question")?.remove();
    if(bouton){bouton.textContent="Question suivante";bouton.onclick=allerSuivant;bouton.disabled=false;return;}
    const suivant=document.createElement("button");
    suivant.type="button";suivant.className="primary-button";suivant.textContent="Question suivante";
    suivant.onclick=allerSuivant;
    ancre.after(suivant);
}

function feedbackEl(){return document.getElementById("feedback-revision");}

function afficherFeedback(texte,type){
    const f=feedbackEl();
    f.textContent=texte;
    f.className="revision-feedback"+(type?" "+type:"");
}

function verdict(ok,attendu){
    afficherFeedback(ok?"Bonne réponse. Continue comme ça.":"Réponse attendue : "+attendu,ok?"success":"error");
    if(ok)marquerQuestionReussie();else signalerFaute();
}

function enregistrerChoix(reponse,attendue,libelleErreur){
    if(session.etat.repondu)return;      // une seule réponse par question
    session.etat.repondu=true;
    const ok=normaliserTexte(reponse)===normaliserTexte(attendue);
    document.querySelectorAll("#revision-session [data-answer]").forEach(b=>{
        b.disabled=true;
        b.draggable=false;
        const k=normaliserTexte(b.dataset.answer);
        if(k===normaliserTexte(attendue))b.classList.add("is-correct");
        else if(k===normaliserTexte(reponse))b.classList.add("is-wrong");
    });
    verdict(ok,libelleErreur||attendue);
    proposerSuivant(feedbackEl());
}

/* Redessine des liaisons SVG lors des redimensionnements */
function surveillerRedimensionnement(redraw){
    requestAnimationFrame(redraw);
    const resize=()=>requestAnimationFrame(redraw);
    window.addEventListener("resize",resize);
    session.modeCleanup=()=>window.removeEventListener("resize",resize);
}

/* ---------- Définition des modes de jeu ---------- */

const JEUX={};

/* Modes avec saisie de texte */
function jeuSaisie(cfg){
    return {
        rendre(q,v,bonne,etat){
            const p=cfg.preparer(q,v,bonne,etat);
            etat.attendu=p.attendu;
            etat.affichage=p.affichage??p.attendu;
            const champ=cfg.long
                ?'<textarea id="reponse-revision" rows="'+(cfg.lignes||4)+'" placeholder="'+escapeHtml(cfg.placeholder)+'"></textarea>'
                :'<input id="reponse-revision" type="text" autocomplete="off" placeholder="'+escapeHtml(cfg.placeholder)+'">';
            return p.html+champ+'<button type="button" class="primary-button" id="valider-reponse">Valider</button>';
        },
        attacher(el,q,v,bonne,etat){
            const champ=document.getElementById("reponse-revision"),bouton=document.getElementById("valider-reponse");
            const valider=()=>{
                if(champ.disabled)return;
                const ok=cfg.strict
                    ?sansEspaces(champ.value)===sansEspaces(etat.attendu)
                    :evaluerReponse(etat.attendu,champ.value).correct;
                champ.disabled=true;
                verdict(ok,etat.affichage);
                proposerSuivant(null,bouton);
            };
            bouton.onclick=valider;
            if(!cfg.long)champ.addEventListener("keydown",e=>{if(e.key==="Enter")valider();});
            champ.focus({preventScroll:true});
        }
    };
}

const titreEtEnonce=(titre,enonce)=>'<h3>'+escapeHtml(titre)+'</h3>'+(enonce?'<p>'+escapeHtml(enonce)+'</p>':'');

JEUX.reponse_ecrite=jeuSaisie({long:true,lignes:5,placeholder:"Écris ta réponse...",
    preparer:(q,v,bonne)=>({html:'<h3>'+escapeHtml(promptQuestion(q))+'</h3>',attendu:bonne})});
JEUX.questions=JEUX.reponse_ecrite;
JEUX.exercice=JEUX.reponse_ecrite;

JEUX.terme_definition=jeuSaisie({long:true,placeholder:"Écris ta réponse...",
    preparer:(q,v,bonne)=>({html:'<h3>'+escapeHtml(v[0])+'</h3><p>Donne la définition ou l’explication.</p>',attendu:bonne})});

JEUX.definition_terme=jeuSaisie({placeholder:"Écris le terme",
    preparer:(q,v,bonne)=>({html:'<h3>'+htmlTexte(bonne)+'</h3><p>Quel est le terme correspondant ?</p>',attendu:v[0]})});

JEUX.texte_trous=jeuSaisie({placeholder:"Mot manquant",
    preparer:(q,v,bonne)=>{
        const mots=bonne.match(/[\p{L}\p{N}]+/gu)||[];
        const candidats=mots.filter(m=>m.length>3);
        const mot=(candidats.length?candidats:mots).sort((a,b)=>b.length-a.length)[0]||bonne;
        const pos=Math.max(0,bonne.indexOf(mot));
        const texte=htmlTexte(bonne.slice(0,pos))+'<span class="revision-blank">____</span>'+htmlTexte(bonne.slice(pos+mot.length));
        return {html:'<h3>'+escapeHtml(promptQuestion(q))+'</h3><p class="revision-fill-blank">'+texte+'</p>',attendu:mot};
    }});

JEUX.lettres_melangees=jeuSaisie({strict:true,placeholder:"Reconstitue le mot",
    preparer:q=>{
        const {terme,indice}=termePourJeuDeLettres(q);
        const lettres=melangerLettres(terme).toUpperCase().split("").map(x=>'<span class="revision-puzzle-letter">'+escapeHtml(x)+'</span>').join("");
        return {html:'<h3>Lettres mélangées</h3><p class="revision-indice">'+htmlTexte(indice)+'</p><div class="revision-word-puzzle">'+lettres+'</div>',attendu:terme};
    }});

JEUX.mot_mystere=jeuSaisie({strict:true,placeholder:"Trouve le mot",
    preparer:q=>{
        const {terme,indice}=termePourJeuDeLettres(q);
        const m=motMystere(terme);
        return {html:'<h3>Mot mystère</h3><p class="revision-indice">'+htmlTexte(indice)+'</p><div class="revision-mystery-word">'+escapeHtml(m.masque.toUpperCase())+'</div>',attendu:terme};
    }});

/* Flashcards (la date est désormais incluse dans l'énoncé par promptQuestion) */
JEUX.flashcards={
    rendre(q,v,bonne){
        return '<h3>'+escapeHtml(promptQuestion(q))+'</h3>'+
            '<button type="button" class="primary-button" id="reveler-reponse">Afficher la réponse</button>'+
            '<div id="reponse-cachee" class="revision-hidden-answer" hidden>'+htmlTexte(bonne)+'</div>'+
            '<div id="flashcard-actions" class="revision-phrase-actions" hidden>'+
            '<button type="button" class="primary-button" id="flash-oui">Je la connaissais</button>'+
            '<button type="button" class="secondary-button" id="flash-non">À revoir</button></div>';
    },
    attacher(){
        const reveler=document.getElementById("reveler-reponse");
        reveler.onclick=()=>{
            document.getElementById("reponse-cachee").hidden=false;
            document.getElementById("flashcard-actions").hidden=false;
            document.getElementById("passer-question")?.remove();
            reveler.hidden=true;
        };
        document.getElementById("flash-oui").onclick=()=>{marquerQuestionReussie();allerSuivant();};
        document.getElementById("flash-non").onclick=()=>{signalerFaute();allerSuivant();};
    }
};

/* Choix : QCM, paires, glisser-déposer */
function construireChoix(q,max=4){
    const bonne=valeurs(q)[1];
    const vus=new Set([normaliserTexte(bonne)]),autres=[];
    for(const x of melanger(ficheEtude.questions)){
        if(x===q)continue;
        const r=valeurs(x)[1],k=normaliserTexte(r);
        if(!r||vus.has(k))continue;
        vus.add(k);autres.push({r,memeType:x.type===q.type});
    }
    autres.sort((a,b)=>b.memeType-a.memeType);   // distracteurs du même type d'abord
    return melanger([bonne,...autres.slice(0,max-1).map(x=>x.r)]);
}

const boutonsChoix=choix=>choix.map(x=>'<button type="button" class="secondary-button revision-choice" data-answer="'+escapeHtml(x)+'">'+htmlTexte(x)+'</button>').join("");

function jeuChoix(avecTitre){
    return {
        rendre(q){
            const entete=avecTitre
                ?'<h3>Paires</h3><h4>'+escapeHtml(promptQuestion(q))+'</h4><p>Choisis la bonne réponse.</p>'
                :'<h3>'+escapeHtml(promptQuestion(q))+'</h3>';
            return entete+'<div class="revision-mode-choices">'+boutonsChoix(construireChoix(q))+'</div>';
        },
        attacher(el,q,v,bonne){
            el.querySelectorAll(".revision-choice").forEach(b=>b.onclick=()=>enregistrerChoix(b.dataset.answer,bonne));
        }
    };
}
JEUX.qcm=jeuChoix(false);
JEUX.paires=jeuChoix(true);

JEUX.glisser_deposer={
    rendre(q){
        return '<h3>'+escapeHtml(promptQuestion(q))+'</h3><p>Fais glisser la bonne réponse dans la zone, ou clique-la directement.</p>'+
            '<div class="revision-drag-options">'+construireChoix(q).map(x=>'<button type="button" draggable="true" class="secondary-button revision-drag-item" data-answer="'+escapeHtml(x)+'">'+htmlTexte(x)+'</button>').join("")+'</div>'+
            '<div class="revision-drop-zone" id="revision-drop-zone">Dépose ta réponse ici</div>';
    },
    attacher(el,q,v,bonne){
        el.querySelectorAll(".revision-drag-item").forEach(item=>{
            item.addEventListener("dragstart",e=>e.dataTransfer?.setData("text/plain",item.dataset.answer||""));
            item.addEventListener("click",()=>enregistrerChoix(item.dataset.answer,bonne));
        });
        const zone=document.getElementById("revision-drop-zone");
        zone.addEventListener("dragover",e=>{if(!session.etat.repondu)e.preventDefault();});
        zone.addEventListener("drop",e=>{
            e.preventDefault();
            if(session.etat.repondu)return;
            const rep=e.dataTransfer?.getData("text/plain")||"";
            if(rep)enregistrerChoix(rep,bonne);
        });
    }
};

/* Vrai / Faux */
JEUX.vrai_faux={
    rendre(q,v,bonne,etat){
        const vrai=Math.random()<.5;
        const fausses=melanger(questionsAvecPaire().map(x=>valeurs(x)[1]).filter(x=>normaliserTexte(x)!==normaliserTexte(bonne)));
        etat.vrai=vrai;
        etat.bonne=bonne;
        const proposition=vrai?bonne:fausses[0];
        return '<h3>'+escapeHtml(promptQuestion(q))+'</h3><p class="revision-statement">'+htmlTexte(proposition)+'</p>'+
            '<div class="revision-mode-choices"><button type="button" class="secondary-button" id="vf-vrai" data-answer="vrai">Vrai</button><button type="button" class="secondary-button" id="vf-faux" data-answer="faux">Faux</button></div>';
    },
    attacher(el,q,v,bonne,etat){
        const attendu=etat.vrai?"vrai":"faux";
        const libelle=etat.vrai?"Vrai : c'était bien la bonne réponse.":"Faux : la bonne réponse était « "+bonne+" ».";
        document.getElementById("vf-vrai").onclick=()=>enregistrerChoix("vrai",attendu,libelle);
        document.getElementById("vf-faux").onclick=()=>enregistrerChoix("faux",attendu,libelle);
    }
};

/* Trouver l'intrus */
JEUX.intrus={
    rendre(q,v,bonne,etat){
        const items=groupeDistinct(q,4).map((x,i)=>({id:"intrus-"+i,prompt:valeurs(x)[0],reponse:valeurs(x)[1]}));
        const i=Math.floor(Math.random()*items.length),autre=items[(i+1)%items.length];
        etat.intrus=items[i].id;
        etat.libelle="« "+items[i].prompt+" » ne va pas avec « "+autre.reponse+" » : la bonne réponse était « "+items[i].reponse+" ».";
        items[i]={...items[i],reponse:autre.reponse};
        return '<h3>Trouve l\'intrus</h3><p>Un de ces couples question / réponse ne va pas ensemble. Clique dessus.</p><div class="revision-mode-choices">'+
            melanger(items).map(it=>'<button type="button" class="secondary-button revision-choice" data-answer="'+it.id+'"><strong>'+htmlTexte(it.prompt)+'</strong><br>'+htmlTexte(it.reponse)+'</button>').join("")+'</div>';
    },
    attacher(el,q,v,bonne,etat){
        el.querySelectorAll(".revision-choice").forEach(b=>b.onclick=()=>enregistrerChoix(b.dataset.answer,etat.intrus,etat.libelle));
    }
};

/* Relier */
JEUX.relier={
    rendre(q,v,bonne,etat){
        const paires=groupeDistinct(q,4).map((x,i)=>({id:"relier-"+i,gauche:valeurs(x)[0],droite:valeurs(x)[1]}));
        etat.total=paires.length;
        return '<h3>Relie chaque élément à sa correspondance</h3><p>Clique un élément à gauche puis sa correspondance à droite.</p>'+
            '<div class="revision-linking" id="revision-linking"><svg class="revision-link-lines" aria-hidden="true"></svg>'+
            '<div class="revision-link-column">'+paires.map(p=>'<button type="button" class="revision-link-item revision-link-left" data-id="'+p.id+'">'+htmlTexte(p.gauche)+'</button>').join("")+'</div>'+
            '<div class="revision-link-column">'+melanger(paires).map(p=>'<button type="button" class="revision-link-item revision-link-right" data-id="'+p.id+'">'+htmlTexte(p.droite)+'</button>').join("")+'</div></div>';
    },
    attacher(el,q,v,bonne,etat){
        const conteneur=document.getElementById("revision-linking"),svg=conteneur.querySelector(".revision-link-lines");
        const liaisons=new Set();
        let gauche=null;
        const redraw=()=>{
            svg.innerHTML="";
            const base=conteneur.getBoundingClientRect();
            liaisons.forEach(id=>{
                const l=conteneur.querySelector('.revision-link-left[data-id="'+id+'"]'),r=conteneur.querySelector('.revision-link-right[data-id="'+id+'"]');
                if(!l||!r)return;
                const a=l.getBoundingClientRect(),b=r.getBoundingClientRect();
                const ligne=document.createElementNS("http://www.w3.org/2000/svg","line");
                ligne.setAttribute("x1",a.right-base.left);ligne.setAttribute("y1",a.top+a.height/2-base.top);
                ligne.setAttribute("x2",b.left-base.left);ligne.setAttribute("y2",b.top+b.height/2-base.top);
                ligne.setAttribute("class","revision-link-line");
                svg.appendChild(ligne);
            });
        };
        el.querySelectorAll(".revision-link-left").forEach(b=>b.onclick=()=>{
            if(b.disabled)return;
            gauche?.classList.remove("selected");
            gauche=b;b.classList.add("selected");
        });
        el.querySelectorAll(".revision-link-right").forEach(b=>b.onclick=()=>{
            if(b.disabled||!gauche)return;
            if(gauche.dataset.id!==b.dataset.id){
                afficherFeedback("Ce n’est pas la bonne paire. Essaie encore.","error");
                signalerFaute();
                gauche.classList.remove("selected");gauche=null;
                return;
            }
            liaisons.add(b.dataset.id);
            gauche.disabled=true;b.disabled=true;
            gauche.classList.remove("selected");gauche=null;
            redraw();
            afficherFeedback("Bonne liaison.","success");
            if(liaisons.size===etat.total){marquerQuestionReussie();proposerSuivant(feedbackEl());}
        });
        surveillerRedimensionnement(redraw);
    }
};

/* Puzzle */
JEUX.puzzle={
    rendre(q,v,bonne,etat){
        const paires=groupeDistinct(q,3).map((x,i)=>({pair:i,gauche:valeurs(x)[0],droite:valeurs(x)[1]}));
        etat.total=paires.length;
        const pieces=melanger(paires.flatMap(p=>[{id:"p"+p.pair+"-g",pair:p.pair,texte:p.gauche},{id:"p"+p.pair+"-d",pair:p.pair,texte:p.droite}]));
        return '<h3>Puzzle</h3><p>Clique deux pièces pour les associer. Un bandeau les relie si c\'est la bonne paire ; clique sur le bandeau pour les séparer.</p>'+
            '<div class="revision-puzzle-board" id="revision-puzzle-board"><svg class="revision-puzzle-bands" aria-hidden="true"></svg><div class="revision-puzzle-pieces">'+
            pieces.map(p=>'<button type="button" class="revision-puzzle-piece" data-piece-id="'+p.id+'" data-pair="'+p.pair+'">'+htmlTexte(p.texte)+'</button>').join("")+'</div></div>';
    },
    attacher(el,q,v,bonne,etat){
        const board=document.getElementById("revision-puzzle-board"),svg=board.querySelector(".revision-puzzle-bands");
        const pieces=[...board.querySelectorAll(".revision-puzzle-piece")];
        const liens=new Map();      // numéro de paire -> {a,b}
        let selection=null,termine=false;
        const parId=id=>pieces.find(p=>p.dataset.pieceId===id);

        const redraw=()=>{
            svg.innerHTML="";
            const base=board.getBoundingClientRect();
            liens.forEach((lien,pair)=>{
                const a=parId(lien.a),b=parId(lien.b);
                if(!a||!b)return;
                const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
                const bande=document.createElementNS("http://www.w3.org/2000/svg","line");
                bande.setAttribute("x1",ra.left+ra.width/2-base.left);bande.setAttribute("y1",ra.top+ra.height/2-base.top);
                bande.setAttribute("x2",rb.left+rb.width/2-base.left);bande.setAttribute("y2",rb.top+rb.height/2-base.top);
                bande.setAttribute("class","revision-puzzle-band");
                bande.addEventListener("click",()=>{
                    if(termine)return;
                    liens.delete(pair);
                    [a,b].forEach(p=>{p.classList.remove("linked");p.disabled=false;});
                    redraw();
                    afficherFeedback("Paire séparée.");
                });
                svg.appendChild(bande);
            });
        };

        pieces.forEach(piece=>piece.addEventListener("click",()=>{
            if(piece.disabled)return;
            if(!selection){selection=piece;piece.classList.add("selected");return;}
            if(selection===piece){piece.classList.remove("selected");selection=null;return;}
            if(selection.dataset.pair===piece.dataset.pair){
                liens.set(piece.dataset.pair,{a:selection.dataset.pieceId,b:piece.dataset.pieceId});
                selection.classList.remove("selected");
                [selection,piece].forEach(p=>{p.classList.add("linked");p.disabled=true;});
                selection=null;
                redraw();
                afficherFeedback("Bonne paire !","success");
                if(liens.size===etat.total){
                    termine=true;
                    marquerQuestionReussie();
                    afficherFeedback("Toutes les paires sont assemblées.","success");
                    proposerSuivant(feedbackEl());
                }
            }else{
                afficherFeedback("Ce n'est pas la bonne paire. Essaie encore.","error");
                signalerFaute();
                selection.classList.remove("selected");selection=null;
            }
        }));
        surveillerRedimensionnement(redraw);
    }
};

/* Mots à ordonner : clic = ajouter, clic sur un mot placé = le retirer, ◀ ▶ = le déplacer */
function attacherOrdre(el,cfg){
    const boutons=[...el.querySelectorAll(cfg.selecteur)],resultat=document.getElementById("revision-ordre-resultat"),ordre=[];
    const valider=document.getElementById("valider-ordre"),reset=document.getElementById("reinitialiser-ordre");
    let verrouille=false;

    const maj=()=>{
        resultat.innerHTML="";
        if(!ordre.length){resultat.textContent=cfg.vide;return;}
        ordre.forEach((b,i)=>{
            const puce=document.createElement("span");
            puce.className="revision-ordre-chip";
            const bouton=(classe,texte,label,action,desactive)=>{
                const x=document.createElement("button");
                x.type="button";x.className=classe;x.textContent=texte;x.setAttribute("aria-label",label);
                x.disabled=!!desactive;x.onclick=action;
                return x;
            };
            puce.append(
                bouton("revision-ordre-move","◀","Déplacer vers la gauche",()=>{[ordre[i-1],ordre[i]]=[ordre[i],ordre[i-1]];maj();},i===0),
                bouton("revision-ordre-label",cfg.libelle(b),"Retirer « "+cfg.libelle(b)+" »",()=>{
                    ordre.splice(i,1);b.disabled=false;b.classList.remove("selected");maj();
                }),
                bouton("revision-ordre-move","▶","Déplacer vers la droite",()=>{[ordre[i+1],ordre[i]]=[ordre[i],ordre[i+1]];maj();},i===ordre.length-1)
            );
            resultat.appendChild(puce);
        });
    };
    const reinit=()=>{ordre.length=0;boutons.forEach(b=>{b.disabled=false;b.classList.remove("selected");});maj();};

    boutons.forEach(b=>b.addEventListener("click",()=>{
        if(b.disabled||verrouille)return;
        ordre.push(b);b.disabled=true;b.classList.add("selected");maj();
    }));
    reset.onclick=reinit;
    maj();

    valider.onclick=()=>{
        if(verrouille)return;
        if(ordre.length<boutons.length){afficherFeedback("Sélectionne tous les éléments dans le bon ordre.","error");return;}
        if(cfg.verifier(ordre)){
            verrouille=true;
            afficherFeedback("Bonne réponse. Continue comme ça.","success");
            marquerQuestionReussie();
            resultat.textContent=cfg.texteFinal(ordre);
            reset.hidden=true;
            proposerSuivant(null,valider);
        }else{
            afficherFeedback("Ce n'est pas le bon ordre. Retire ou déplace des éléments, puis valide à nouveau.","error");
            signalerFaute();
        }
    };
}

const piedOrdre='<div id="revision-ordre-resultat" class="revision-phrase-result"></div><div class="revision-phrase-actions"><button type="button" class="secondary-button" id="reinitialiser-ordre">Réinitialiser</button><button type="button" class="primary-button" id="valider-ordre">Valider</button></div>';

JEUX.phrase_reconstituer={
    rendre(q,v,bonne,etat){
        const phrase=phrasePourReconstituer(q);
        etat.phrase=normaliserTexte(phrase);
        return '<h3>Phrase à reconstituer</h3><p>'+escapeHtml(promptQuestion(q))+'</p><div class="revision-phrase-words">'+
            phraseMelangee(phrase).map(m=>'<button type="button" class="revision-phrase-word" data-word="'+escapeHtml(m)+'">'+escapeHtml(m)+'</button>').join("")+'</div>'+piedOrdre;
    },
    attacher(el,q,v,bonne,etat){
        attacherOrdre(el,{
            selecteur:".revision-phrase-word",libelle:b=>b.dataset.word,vide:"Clique sur les mots dans le bon ordre.",texteFinal:ordre=>ordre.map(b=>b.dataset.word).join(" "),
            verifier:ordre=>normaliserTexte(ordre.map(b=>b.dataset.word).join(" "))===etat.phrase
        });
    }
};

JEUX.timeline={
    rendre(q){
        const items=groupeFrise(q,4).map(x=>({annee:anneeDe(x),date:valeurs(x)[0],evenement:valeurs(x)[1]}));
        return '<h3>Frise chronologique</h3><p>Clique les événements du plus ancien au plus récent.</p><div class="revision-mode-choices">'+
            melanger(items).map(it=>'<button type="button" class="secondary-button revision-timeline-item" data-annee="'+it.annee+'" data-date="'+escapeHtml(it.date)+'">'+htmlTexte(it.evenement)+'</button>').join("")+'</div>'+piedOrdre;
    },
    attacher(el){
        attacherOrdre(el,{
            selecteur:".revision-timeline-item",libelle:b=>b.textContent,vide:"Les événements choisis apparaîtront ici.",
            verifier:ordre=>ordre.every((b,i)=>i===0||Number(ordre[i-1].dataset.annee)<=Number(b.dataset.annee)),
            texteFinal:ordre=>ordre.map(b=>b.dataset.date+" : "+b.textContent).join(" → ")
        });
    }
};

/* Mots croisés */
function peutPlacerCroise(grille,mot,row,col,dir){
    const n=grille.length,dr=dir==="down"?1:0,dc=dir==="across"?1:0;
    const finR=row+dr*(mot.length-1),finC=col+dc*(mot.length-1);
    if(row<0||col<0||finR>=n||finC>=n)return 0;
    const occupe=(r,c)=>r>=0&&r<n&&c>=0&&c<n&&grille[r][c];
    if(occupe(row-dr,col-dc)||occupe(finR+dr,finC+dc))return 0;
    let intersections=0;
    for(let i=0;i<mot.length;i++){
        const r=row+dr*i,c=col+dc*i,cell=grille[r][c];
        if(cell){
            if(cell.letter!==mot[i]||cell[dir])return 0;   // lettre différente, ou mot déjà dans cette direction
            intersections++;
        }else{
            const voisins=dir==="across"?[[r-1,c],[r+1,c]]:[[r,c-1],[r,c+1]];
            if(voisins.some(([vr,vc])=>occupe(vr,vc)))return 0;
        }
    }
    return intersections;
}

function essaiMotsCroises(questions,obligatoire,size){
    const premier=extraireMotCroise(obligatoire);
    const vus=new Set([premier.solution]),autres=[];
    for(const m of melanger(questions.filter(x=>x!==obligatoire).map(extraireMotCroise).filter(Boolean))){
        if(vus.has(m.solution))continue;
        vus.add(m.solution);autres.push(m);
    }
    autres.sort((a,b)=>b.solution.length-a.solution.length);
    const grid=Array.from({length:size},()=>Array(size).fill(null)),entries=[];

    const poser=(mot,row,col,dir)=>{
        for(let i=0;i<mot.solution.length;i++){
            const r=row+(dir==="down"?i:0),c=col+(dir==="across"?i:0);
            if(!grid[r][c])grid[r][c]={letter:mot.solution[i]};
            grid[r][c][dir]=true;
        }
        entries.push({number:0,...mot,row,col,dir});
    };

    poser(premier,Math.floor(size/2),Math.floor((size-premier.solution.length)/2),"across");

    for(const mot of autres.slice(0,6)){
        let best=null;
        for(let i=0;i<mot.solution.length;i++)for(let r=0;r<size;r++)for(let c=0;c<size;c++){
            if(grid[r][c]?.letter!==mot.solution[i])continue;
            for(const dir of ["down","across"]){
                const rr=r-(dir==="down"?i:0),cc=c-(dir==="across"?i:0);
                const cross=peutPlacerCroise(grid,mot.solution,rr,cc,dir);
                if(cross>0&&(!best||cross>best.cross))best={row:rr,col:cc,dir,cross};
            }
        }
        if(best)poser(mot,best.row,best.col,best.dir);
    }

    // Recadrage serré autour des cases occupées
    let minR=size,maxR=-1,minC=size,maxC=-1;
    grid.forEach((row,r)=>row.forEach((cell,c)=>{if(cell){minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);}}));
    const rogne=grid.slice(minR,maxR+1).map(row=>row.slice(minC,maxC+1));
    entries.forEach(e=>{e.row-=minR;e.col-=minC;});

    // Numérotation (un numéro par case de départ)
    const departs=new Map();let numero=1;
    entries.sort((a,b)=>a.row-b.row||a.col-b.col||a.dir.localeCompare(b.dir));
    for(const e of entries){
        const cle=e.row+"-"+e.col;
        if(!departs.has(cle))departs.set(cle,numero++);
        e.number=departs.get(cle);
    }
    return {size:rogne[0].length,grid:rogne,entries};
}

function construireMotsCroises(questions,obligatoire,size=13){
    let meilleur=null;
    for(let t=0;t<12;t++){
        const essai=essaiMotsCroises(questions,obligatoire,size);
        if(!meilleur||essai.entries.length>meilleur.entries.length)meilleur=essai;
        if(meilleur.entries.length>=5)break;
    }
    return meilleur;
}

function rendreMotsCroises(croise){
    const numeros={};
    croise.entries.forEach(e=>{numeros[e.row+"-"+e.col]=e.number;});
    const grille='<div class="revision-crossword-wrap"><div class="revision-crossword" style="--cross-size:'+croise.size+'">'+
        croise.grid.map((row,r)=>'<div class="revision-crossword-row">'+row.map((cell,c)=>{
            if(!cell)return '<span class="revision-crossword-cell empty"></span>';
            const n=numeros[r+"-"+c];
            return '<label class="revision-crossword-cell">'+(n?'<small>'+n+'</small>':"")+
                '<input maxlength="1" autocomplete="off" aria-label="Ligne '+(r+1)+', colonne '+(c+1)+'" data-cross-row="'+r+'" data-cross-col="'+c+'"></label>';
        }).join("")+'</div>').join("")+'</div></div>';
    const indices=(titre,liste)=>'<div class="revision-crossword-clue-group"><h4>'+titre+'</h4>'+
        (liste.length?liste.map(e=>'<button type="button" class="revision-crossword-clue" data-cross-entry="'+e.number+'-'+e.dir+'"><strong>'+e.number+'.</strong> '+escapeHtml(e.indice)+' <span>('+e.solution.length+')</span></button>').join(""):'<p>Aucun indice.</p>')+'</div>';
    return grille+indices("Horizontal",croise.entries.filter(e=>e.dir==="across"))+indices("Vertical",croise.entries.filter(e=>e.dir==="down"));
}

JEUX.mots_croises={
    rendre(q,v,bonne,etat){
        etat.croise=construireMotsCroises(ficheEtude.questions,q);
        return '<h3>Mots croisés</h3><p class="revision-crossword-help">Complète les cases avec les indices horizontaux et verticaux.</p>'+
            rendreMotsCroises(etat.croise)+'<button type="button" class="primary-button" id="verifier-mots-croises">Vérifier la grille</button>';
    },
    attacher(el,q,v,bonne,etat){
        const croise=etat.croise;
        const inputs=[...el.querySelectorAll(".revision-crossword-cell input")];
        const cle=(r,c)=>r+"-"+c;
        const parPos=new Map(inputs.map(i=>[cle(i.dataset.crossRow,i.dataset.crossCol),i]));
        const cellulesDe=e=>Array.from({length:e.solution.length},(_,i)=>cle(e.row+(e.dir==="down"?i:0),e.col+(e.dir==="across"?i:0)));
        const entreesPour=i=>croise.entries.filter(e=>cellulesDe(e).includes(cle(i.dataset.crossRow,i.dataset.crossCol)));
        let direction="across";
        const entreeActive=i=>{const l=entreesPour(i);return l.find(e=>e.dir===direction)||l[0];};
        const decaler=(input,pas)=>{
            const e=entreeActive(input);
            if(!e)return;
            const cases=cellulesDe(e);
            parPos.get(cases[cases.indexOf(cle(input.dataset.crossRow,input.dataset.crossCol))+pas])?.focus();
        };

        inputs.forEach(input=>{
            input.addEventListener("mousedown",()=>{input._etaitActif=document.activeElement===input;});
            input.addEventListener("focus",()=>{
                const l=entreesPour(input);
                if(l.length&&!l.some(e=>e.dir===direction))direction=l[0].dir;
            });
            input.addEventListener("click",()=>{
                if(input._etaitActif&&entreesPour(input).length===2)direction=direction==="down"?"across":"down";
            });
            input.addEventListener("input",()=>{
                input.value=sansEspaces(input.value).slice(-1).toUpperCase();
                input.classList.remove("correct","incorrect");
                if(input.value)decaler(input,1);
            });
            input.addEventListener("keydown",event=>{
                const fleches={ArrowLeft:[0,-1,"across"],ArrowRight:[0,1,"across"],ArrowUp:[-1,0,"down"],ArrowDown:[1,0,"down"]};
                if(fleches[event.key]){
                    event.preventDefault();
                    const [dr,dc,dir]=fleches[event.key];
                    direction=dir;
                    parPos.get(cle(Number(input.dataset.crossRow)+dr,Number(input.dataset.crossCol)+dc))?.focus();
                }else if(event.key==="Backspace"&&!input.value){
                    event.preventDefault();
                    decaler(input,-1);
                }
            });
        });

        el.querySelectorAll(".revision-crossword-clue").forEach(clue=>clue.onclick=()=>{
            const [numero,dir]=clue.dataset.crossEntry.split("-");
            const e=croise.entries.find(x=>String(x.number)===numero&&x.dir===dir);
            if(!e)return;
            direction=dir;
            parPos.get(cle(e.row,e.col))?.focus();
        });

        const bouton=document.getElementById("verifier-mots-croises");
        bouton.addEventListener("click",()=>{
            if(bouton.dataset.fini)return;
            let total=0,correct=0;
            inputs.forEach(input=>{
                const lettre=croise.grid[input.dataset.crossRow][input.dataset.crossCol].letter,val=sansEspaces(input.value);
                total++;
                input.classList.remove("correct","incorrect");
                if(val===lettre){correct++;input.classList.add("correct");}
                else if(val)input.classList.add("incorrect");
            });
            if(correct===total){
                bouton.dataset.fini="1";
                afficherFeedback("Grille complète et correcte.","success");
                marquerQuestionReussie();
                proposerSuivant(null,bouton);
            }else{
                afficherFeedback("Il reste des cases à corriger.","error");
                signalerFaute();
            }
        });
    }
};

/* Mots mêlés */
function construireGrilleMotsMeles(mot){
    const n=12,motNet=sansEspaces(mot),grille=Array.from({length:n},()=>Array(n).fill(""));
    let placement=null;
    for(const [dr,dc] of melanger([[0,1],[1,0],[1,1],[-1,1]])){
        for(let t=0;t<100&&!placement;t++){
            const r0=Math.floor(Math.random()*n),c0=Math.floor(Math.random()*n);
            const r1=r0+dr*(motNet.length-1),c1=c0+dc*(motNet.length-1);
            if(r1<0||r1>=n||c1<0||c1>=n)continue;
            for(let i=0;i<motNet.length;i++)grille[r0+dr*i][c0+dc*i]=motNet[i];
            placement=[r0,c0,r1,c1];
        }
        if(placement)break;
    }
    if(!placement){     // secours : placement horizontal garanti
        const r=Math.floor(Math.random()*n);
        for(let i=0;i<motNet.length;i++)grille[r][i]=motNet[i];
        placement=[r,0,r,motNet.length-1];
    }
    const lettres="abcdefghijklmnopqrstuvwxyz";
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grille[r][c])grille[r][c]=lettres[Math.floor(Math.random()*lettres.length)];
    return {size:n,grille,mot:motNet,placement};
}

JEUX.mots_meles={
    rendre(q,v,bonne,etat){
        const {mot,indice}=motPourMotsMeles(q);
        etat.grille=construireGrilleMotsMeles(mot);
        return '<h3>Mots mêlés</h3><p class="revision-indice">'+htmlTexte(indice)+'</p><p class="revision-hint">Clique la première puis la dernière lettre du mot (en ligne, colonne ou diagonale).</p>'+
            '<div id="revision-word-grid" class="revision-word-grid">'+etat.grille.grille.map((row,r)=>'<div class="revision-word-grid-row">'+
            row.map((l,c)=>'<button type="button" class="revision-word-cell" aria-label="Lettre '+escapeHtml(l.toUpperCase())+', ligne '+(r+1)+', colonne '+(c+1)+'" data-word-row="'+r+'" data-word-col="'+c+'">'+escapeHtml(l.toUpperCase())+'</button>').join("")+'</div>').join("")+'</div>';
    },
    attacher(el,q,v,bonne,etat){
        const g=etat.grille,zone=document.getElementById("revision-word-grid");
        const cellule=(r,c)=>zone.querySelector('[data-word-row="'+r+'"][data-word-col="'+c+'"]');
        let premier=null,selection=[];
        const effacer=()=>{selection.forEach(c=>c.classList.remove("selected"));selection=[];};
        const surligner=()=>{
            const [r0,c0,r1,c1]=g.placement,dr=Math.sign(r1-r0),dc=Math.sign(c1-c0);
            for(let i=0;i<g.mot.length;i++)cellule(r0+dr*i,c0+dc*i)?.classList.add("found");
        };
        const valider=texte=>{
            const val=sansEspaces(texte);
            if(val===g.mot||[...val].reverse().join("")===g.mot){
                marquerQuestionReussie();
                afficherFeedback("Mot trouvé !","success");
                effacer();surligner();
                zone.querySelectorAll(".revision-word-cell").forEach(c=>c.disabled=true);
                proposerSuivant(feedbackEl());
            }else{
                afficherFeedback("Ce n’est pas le bon mot. Cherche encore.","error");
                signalerFaute();
                effacer();
            }
        };
        zone.querySelectorAll(".revision-word-cell").forEach(cell=>cell.onclick=()=>{
            const r=Number(cell.dataset.wordRow),c=Number(cell.dataset.wordCol);
            if(!premier){premier={r,c};selection=[cell];cell.classList.add("selected");return;}
            const dr=Math.sign(r-premier.r),dc=Math.sign(c-premier.c);
            const len=Math.max(Math.abs(r-premier.r),Math.abs(c-premier.c))+1;
            if(!(dr===0||dc===0||Math.abs(r-premier.r)===Math.abs(c-premier.c))){effacer();premier=null;return;}
            effacer();
            let texte="";
            for(let i=0;i<len;i++){
                const cible=cellule(premier.r+dr*i,premier.c+dc*i);
                texte+=cible.textContent.toLowerCase();
                selection.push(cible);
            }
            selection.forEach(x=>x.classList.add("selected"));
            premier=null;
            valider(texte);
        });
    }
};

/* ---------- Affichage d'une question ---------- */

function afficherQuestionSession(){
    nettoyerSession();
    if(!session||session.index>=session.questions.length){afficherResultatRevision();return;}
    const el=document.getElementById("revision-session");
    const q=session.questions[session.index],mode=session.modesParQuestion[session.index];
    const v=valeurs(q),bonne=v[1];
    const jeu=JEUX[mode]||JEUX.reponse_ecrite;
    session.etat={};
    const contenu=jeu.rendre(q,v,bonne,session.etat);

    cacherToutesLesVues();
    el.hidden=false;
    el.innerHTML=
        '<div class="section-heading"><div><span class="section-label">EN COURS</span><h2>'+escapeHtml(ficheEtude.titre)+'</h2></div></div>'+
        '<div class="revision-answer-question">'+
        '<span class="small-label">'+escapeHtml(MODES_REVISION[mode]?.label||"Révision")+' — '+(session.index+1)+' / '+session.questions.length+'</span>'+
        contenu+
        '<p id="feedback-revision" class="revision-feedback" role="status" aria-live="polite"></p>'+
        '<div class="revision-session-actions"><button type="button" class="secondary-button" id="passer-question">Passer cette question</button>'+
        '<button type="button" class="secondary-button" id="quitter-revision">Quitter</button></div>'+
        '</div>';

    document.getElementById("passer-question").onclick=()=>{signalerFaute();allerSuivant();};
    document.getElementById("quitter-revision").onclick=retourFiches;
    jeu.attacher(el,q,v,bonne,session.etat);

    const haut=el.getBoundingClientRect().top;
    if(haut<0||haut>window.innerHeight*.5)el.scrollIntoView({behavior:"smooth",block:"start"});
}

function afficherResultatRevision(){
    const total=session.questions.length;
    const pct=total?Math.round(session.score/total*100):0;
    enregistrerEvenement("resultat",{score:session.score,nb_questions:total});
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
        const modes=session.modes;
        session=creerSession(melanger(questionsEligibles(modes)).slice(0,total),modes);
        afficherQuestionSession();
    };
    document.getElementById("retour-fiches").onclick=retourFiches;
    el.scrollIntoView({behavior:"smooth",block:"start"});
}

/* ---------- Création d'une fiche ---------- */

function ajouterQuestion(){
    if(questionsRevision.length>=MAX_QUESTIONS_FICHE){
        alert("Une fiche peut contenir au maximum "+MAX_QUESTIONS_FICHE+" questions.");
        return;
    }
    questionsRevision.push({id:genererId(),type:"",data:{},editing:true});
    afficherQuestions();
}

function afficherQuestions(){
    const container=document.getElementById("questions-container");
    document.getElementById("nombre-questions").textContent=questionsRevision.length+" question"+(questionsRevision.length>1?"s":"");
    container.innerHTML=questionsRevision.map((question,index)=>{
        const type=TYPES_REVISION[question.type];
        const id=escapeHtml(question.id);
        if(!question.editing){
            return '<article class="revision-question-summary"><div><span class="small-label">QUESTION '+(index+1)+'</span><strong>'+escapeHtml(type?.label||"Question")+'</strong></div>'+
                '<div class="revision-summary-actions"><button type="button" class="secondary-button revision-edit" data-id="'+id+'">Éditer</button><button type="button" class="danger-button revision-delete" data-id="'+id+'">Supprimer</button></div></article>';
        }
        return '<article class="revision-question-card" data-question-id="'+id+'">'+
            '<div class="revision-question-top"><div><span class="small-label">QUESTION '+(index+1)+'</span><h3>'+escapeHtml(type?.label||"Nouvelle question")+'</h3></div><button type="button" class="danger-button revision-delete" data-id="'+id+'">Supprimer</button></div>'+
            '<label class="revision-type-label">Type de donnée</label><select class="revision-type-select"><option value="">Choisir un type...</option>'+
            Object.entries(TYPES_REVISION).map(([key,item])=>'<option value="'+key+'" '+(key===question.type?"selected":"")+'>'+escapeHtml(item.label)+'</option>').join("")+
            '</select>'+
            (type?'<div class="revision-fields">'+type.fields.map(([name,label,placeholder,inputType])=>
                '<label>'+escapeHtml(label)+'</label>'+
                (inputType==="textarea"
                    ?'<textarea data-field="'+name+'" rows="4" maxlength="1500" required placeholder="'+escapeHtml(placeholder)+'">'+escapeHtml(question.data[name]||"")+'</textarea>'
                    :'<input data-field="'+name+'" type="text" maxlength="300" required value="'+escapeHtml(question.data[name]||"")+'" placeholder="'+escapeHtml(placeholder)+'">')
            ).join("")+'<button type="button" class="secondary-button revision-finish-edit">Terminer</button></div>'
            :'<p class="revision-type-help">Choisis d’abord un type de donnée.</p>')+
            '</article>';
    }).join("");

    const trouver=id=>questionsRevision.find(x=>x.id===id);
    container.querySelectorAll(".revision-type-select").forEach(select=>select.onchange=e=>{
        const q=trouver(e.target.closest(".revision-question-card").dataset.questionId);
        q.type=e.target.value;q.data={};afficherQuestions();
    });
    container.querySelectorAll("[data-field]").forEach(field=>field.oninput=e=>{
        const q=trouver(e.target.closest(".revision-question-card").dataset.questionId);
        q.data[e.target.dataset.field]=e.target.value;
    });
    container.querySelectorAll(".revision-finish-edit").forEach(button=>button.onclick=()=>{
        const card=button.closest(".revision-question-card"),q=trouver(card.dataset.questionId);
        if(!q.type)return;
        if([...card.querySelectorAll("[data-field]")].some(f=>!f.value.trim())){alert("Remplis tous les champs de cette question.");return;}
        q.editing=false;afficherQuestions();
    });
    container.querySelectorAll(".revision-edit").forEach(button=>button.onclick=()=>{
        trouver(button.dataset.id).editing=true;afficherQuestions();
    });
    container.querySelectorAll(".revision-delete").forEach(button=>button.onclick=()=>{
        if(!confirm("Supprimer cette question ?"))return;
        questionsRevision=questionsRevision.filter(x=>x.id!==button.dataset.id);afficherQuestions();
    });
}

function initialiserCreation(){
    const ouvrir=document.getElementById("ouvrir-createur"),editor=document.getElementById("revision-editor"),accueil=document.getElementById("revision-accueil");
    const annuler=document.getElementById("annuler-fiche"),ajouter=document.getElementById("ajouter-question");
    const form=document.getElementById("fiche-form"),status=document.getElementById("revision-status");
    const erreur=msg=>{status.textContent=msg;status.className="revision-status error";};

    ouvrir.onclick=async()=>{
        if(!await utilisateurConnecte()){window.location.href="connexion.html";return;}
        questionsRevision=[];form.reset();afficherQuestions();status.textContent="";status.className="revision-status";
        cacherToutesLesVues();editor.hidden=false;editor.scrollIntoView({behavior:"smooth",block:"start"});
    };
    annuler.onclick=()=>{
        if(questionsRevision.length&&!confirm("Abandonner cette fiche ? Les questions saisies seront perdues."))return;
        editor.hidden=true;accueil.hidden=false;
    };
    ajouter.onclick=ajouterQuestion;

    form.onsubmit=async event=>{
        event.preventDefault();
        const bouton=form.querySelector('button[type="submit"]');
        const titre=document.getElementById("fiche-titre").value.trim(),matiere=document.getElementById("fiche-matiere").value.trim();
        if(!titre||!matiere)return erreur("Remplis le nom et la matière.");
        if(!questionsRevision.length)return erreur("Ajoute au moins une question.");
        if(questionsRevision.some(q=>q.editing||!q.type))return erreur("Termine toutes les questions avant de publier la fiche.");

        bouton.disabled=true;
        try{
            const utilisateur=await utilisateurConnecte();
            if(!utilisateur){window.location.href="connexion.html";return;}
            const profil=await obtenirProfil();
            const fiche={titre,matiere,questions:questionsRevision.map(q=>({type:q.type,data:{...q.data}})),auteur_id:utilisateur.id,auteur_identifiant:profil?.identifiant||"Utilisateur"};
            status.textContent="Publication...";status.className="revision-status";
            const {error}=await supabaseClient.from("fiches_revision").insert(fiche);
            if(error){console.error(error);return erreur("Impossible de publier la fiche : "+error.message);}
            status.textContent="Fiche publiée !";status.className="revision-status success";
            questionsRevision=[];form.reset();editor.hidden=true;accueil.hidden=false;
            await actualiserFiches();
            accueil.scrollIntoView({behavior:"smooth",block:"start"});
        }catch(e){
            console.error(e);erreur("Une erreur est survenue : "+e.message);
        }finally{
            bouton.disabled=false;
        }
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
