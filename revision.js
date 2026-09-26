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
    questions:{label:"Questions / réponses",types:["question","definition","vocabulaire","personne","lieu","formule","regle","methode","processus","cause","exemple","liste"]},
    flashcards:{label:"Cartes mémoire",types:["question","definition","vocabulaire","personne","lieu","formule","regle","methode","processus","cause","exemple","liste"]},
    timeline:{label:"Frise chronologique",types:["date"]},
    oral:{label:"Réponse libre",types:["question","definition","vocabulaire","personne","lieu","formule","regle","methode","processus","cause","exemple","liste"]}
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
    const a=normaliserTexte(attendue), r=normaliserTexte(reponse);
    if(!r)return {correct:false,score:0};
    if(a===r||a.includes(r)||r.includes(a))return {correct:true,score:1};
    const aw=[...new Set(a.split(" ").filter(x=>x.length>2&&!MOTS_VIDES.has(x)))];
    const rw=[...new Set(r.split(" ").filter(x=>x.length>2&&!MOTS_VIDES.has(x)))];
    if(!aw.length)return {correct:false,score:0};
    const communs=aw.filter(m=>rw.some(x=>x===m||x.startsWith(m)||m.startsWith(x)));
    const couverture=communs.length/aw.length;
    return {correct:couverture >= (aw.length<=2?.5:.6),score:couverture};
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
    const modes=modesDisponibles(questions);
    config.innerHTML=
        '<div class="section-heading"><div><span class="section-label">RÉVISER</span><h2>'+escapeHtml(fiche.titre)+'</h2></div>'+
        '<button type="button" class="secondary-button" id="fermer-config">Fermer</button></div>'+
        '<p class="revision-intro">Choisis le nombre de questions et les modes de révision.</p>'+
        '<div class="revision-config-grid">'+
        '<div class="revision-config-block"><label for="nombre-a-reviser">Nombre de questions</label><input id="nombre-a-reviser" type="number" min="1" max="'+questions.length+'" value="'+Math.min(questions.length,10)+'"><small>Maximum : '+questions.length+'</small></div>'+
        '<div class="revision-config-block"><span class="revision-config-label">Modes de révision</span><div class="revision-mode-list">'+
        modes.map(([key,mode])=>'<label class="revision-mode-option"><input type="checkbox" name="revision-mode" value="'+key+'" checked><span>'+escapeHtml(mode.label)+'</span></label>').join("")+
        '</div></div></div>'+
        '<button type="button" class="primary-button" id="lancer-revision">Commencer la révision</button>'+
        '<p id="revision-config-status" class="revision-status" role="status"></p>';
    cacherToutesLesVues();
    config.hidden=false;
    document.getElementById("fermer-config").onclick=retourFiches;
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

function lancerRevision(){
    const nombre=Number(document.getElementById("nombre-a-reviser").value);
    const modes=[...document.querySelectorAll('input[name="revision-mode"]:checked')].map(x=>x.value);
    const status=document.getElementById("revision-config-status");
    if(!nombre||nombre<1||nombre>ficheEtude.questions.length){
        status.textContent="Choisis un nombre de questions valide.";
        status.className="revision-status error"; return;
    }
    if(!modes.length){
        status.textContent="Sélectionne au moins un mode de révision.";
        status.className="revision-status error"; return;
    }
    const questions=melanger(ficheEtude.questions).slice(0,nombre);
    session={questions,modes,index:0,score:0,modesParQuestion:questions.map(q=>{
        const compatibles=modes.filter(mode=>MODES_REVISION[mode]?.types.includes(q.type));
        const disponibles=compatibles.length?compatibles:Object.keys(MODES_REVISION).filter(mode=>MODES_REVISION[mode].types.includes(q.type));
        return disponibles[Math.floor(Math.random()*disponibles.length)];
    })};
    afficherQuestionSession();
}

function afficherQuestionSession(){
    const el=document.getElementById("revision-session");
    if(!session||session.index>=session.questions.length){afficherResultatRevision();return;}
    const q=session.questions[session.index],mode=session.modesParQuestion[session.index],v=valeurs(q);
    let contenu="";
    if(mode==="flashcards"){
        contenu='<div class="revision-flashcard"><span class="small-label">QUESTION '+(session.index+1)+' / '+session.questions.length+'</span><h3>'+escapeHtml(promptQuestion(q))+'</h3>'+
        '<button type="button" class="primary-button" id="reveler-reponse">Afficher la réponse</button>'+
        '<div id="reponse-cachee" class="revision-hidden-answer" hidden>'+escapeHtml(v[1]).replace(/\n/g,"<br>")+'</div></div>';
    }else{
        const titre=mode==="timeline"?"FRISE CHRONOLOGIQUE":mode==="oral"?"RÉPONSE LIBRE":"QUESTION / RÉPONSE";
        contenu='<div class="revision-answer-question"><span class="small-label">'+titre+' — '+(session.index+1)+' / '+session.questions.length+'</span>'+
        '<h3>'+escapeHtml(promptQuestion(q))+'</h3>'+
        (mode==="timeline"?'<p class="revision-timeline-event">'+escapeHtml(v[1])+'</p>':"")+
        '<textarea id="reponse-revision" rows="5" placeholder="Écris ta réponse..."></textarea>'+
        '<button type="button" class="primary-button" id="valider-reponse">Valider</button></div>';
    }
    cacherToutesLesVues();
    el.hidden=false;
    el.innerHTML='<div class="section-heading"><div><span class="section-label">EN COURS</span><h2>'+escapeHtml(ficheEtude.titre)+'</h2></div></div>'+contenu+'<p id="feedback-revision" class="revision-feedback" role="status"></p>';
    if(mode==="flashcards"){
        const reveal=document.getElementById("reveler-reponse");
        reveal.onclick=()=>{
            document.getElementById("reponse-cachee").hidden=false;
            reveal.textContent="Je connaissais la réponse";
            reveal.onclick=()=>{session.score++;session.index++;afficherQuestionSession();};
        };
    }else{
        document.getElementById("valider-reponse").onclick=validerReponse;
        document.getElementById("reponse-revision").focus();
    }
    el.scrollIntoView({behavior:"smooth",block:"start"});
}

function validerReponse(){
    if(!session)return;
    const q=session.questions[session.index];
    const champ=document.getElementById("reponse-revision");
    const bouton=document.getElementById("valider-reponse");
    const feedback=document.getElementById("feedback-revision");
    const resultat=evaluerReponse(valeurs(q)[1],champ.value);
    feedback.textContent=resultat.correct?"Bonne réponse. Continue comme ça.":"Réponse attendue : "+valeurs(q)[1];
    feedback.className="revision-feedback "+(resultat.correct?"success":"error");
    if(resultat.correct)session.score++;
    champ.disabled=true;
    bouton.textContent="Question suivante";
    bouton.onclick=()=>{session.index++;afficherQuestionSession();};
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
        const questions=melanger(ficheEtude.questions).slice(0,totalQuestions);
        const modes=session.modes;
        session={questions,modes,index:0,score:0,modesParQuestion:questions.map(q=>{
            const compatibles=modes.filter(mode=>MODES_REVISION[mode]?.types.includes(q.type));
            const disponibles=compatibles.length?compatibles:Object.keys(MODES_REVISION).filter(mode=>MODES_REVISION[mode].types.includes(q.type));
            return disponibles[Math.floor(Math.random()*disponibles.length)];
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
        '<div class="revision-question-top"><div><span class="small-label">QUESTION '+(index+1)+'</span><h3>'+escapeHtml(type?.label||"Nouvelle question")+'</h3></div><button type="button" class="danger-button revision-delete" data-id="'+question.id+'">Supprimer</button></div>'+
        '<label>Type de donnée</label><select class="revision-type-select"><option value="">Choisir un type...</option>'+
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
        cacherToutesLesVues();editor.hidden=false;editor.scrollIntoView({behavior:"smooth",block:"start");
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
