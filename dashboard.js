/* =========================================================
   DASHBOARD — Mon compte
   ========================================================= */

function dashEscape(v){
    return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function dashQui(r){
    return r.user_identifiant || "Anonyme #" + String(r.visiteur_id || "?").slice(0,6);
}

function dashTempsRelatif(iso){
    const s = Math.max(0,(Date.now() - new Date(iso).getTime()) / 1000);
    if(s < 60) return "à l'instant";
    if(s < 3600) return "il y a " + Math.floor(s/60) + " min";
    if(s < 86400) return "il y a " + Math.floor(s/3600) + " h";
    if(s < 86400*30) return "il y a " + Math.floor(s/86400) + " j";
    return new Date(iso).toLocaleDateString("fr-FR");
}

function dashCleJour(d){
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

async function dashCharger(admin, utilisateur, jours){
    let req = supabaseClient.from("fiche_vues")
        .select("created_at,fiche_id,fiche_titre,evenement,visiteur_id,user_id,user_identifiant,nb_questions,modes,score")
        .order("created_at",{ascending:false})
        .limit(5000);
    if(jours) req = req.gte("created_at", new Date(Date.now() - jours*864e5).toISOString());
    if(!admin) req = req.eq("user_id", utilisateur.id);
    const {data,error} = await req;
    if(error) throw error;
    return data || [];
}

function dashRendre(rows, admin, jours){
    const sessions  = rows.filter(r => r.evenement === "session");
    const resultats = rows.filter(r => r.evenement === "resultat");

    if(!rows.length){
        return '<div class="empty-state"><h3>Aucune activité pour le moment</h3><p>' +
            (admin ? "Les révisions apparaîtront ici dès qu'une fiche sera utilisée."
                   : "Lance une révision depuis l'onglet Révision pour voir tes statistiques.") + '</p></div>';
    }

    /* --- Chiffres clés --- */
    const identite   = r => r.user_id || r.visiteur_id;
    const uniques    = new Set(sessions.map(identite).filter(Boolean)).size;
    const connectes  = new Set(sessions.filter(r => r.user_id).map(r => r.user_id)).size;
    const anonymes   = new Set(sessions.filter(r => !r.user_id).map(r => r.visiteur_id).filter(Boolean)).size;
    const fichesDiff = new Set(sessions.map(r => r.fiche_id)).size;
    const pts = resultats.reduce((s,r) => s + (r.score||0), 0);
    const tot = resultats.reduce((s,r) => s + (r.nb_questions||0), 0);
    const scoreMoyen = tot ? Math.round(pts/tot*100) + " %" : "—";

    const kpi = (valeur, label, detail) =>
        '<div class="dash-kpi"><strong>' + valeur + '</strong><span>' + label + '</span>' +
        (detail ? '<small>' + detail + '</small>' : '') + '</div>';

    const kpis = admin
        ? kpi(sessions.length,"Révisions lancées") +
          kpi(uniques,"Visiteurs uniques", connectes + " connecté" + (connectes>1?"s":"") + " · " + anonymes + " anonyme" + (anonymes>1?"s":"")) +
          kpi(fichesDiff,"Fiches utilisées") +
          kpi(scoreMoyen,"Score moyen")
        : kpi(sessions.length,"Révisions lancées") +
          kpi(fichesDiff,"Fiches travaillées") +
          kpi(scoreMoyen,"Score moyen");

    /* --- Courbe par jour --- */
    const nbJours = jours || 30;
    const parJour = new Map();
    for(let i = nbJours-1; i >= 0; i--){
        const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
        parJour.set(dashCleJour(d), {date:d, n:0});
    }
    sessions.forEach(r => {
        const j = parJour.get(dashCleJour(new Date(r.created_at)));
        if(j) j.n++;
    });
    const joursListe = [...parJour.values()];
    const max = Math.max(1, ...joursListe.map(j => j.n));
    const pas = nbJours > 14 ? 5 : 1;
    const barres = joursListe.map((j,i) =>
        '<div class="dash-bar" title="' + j.date.toLocaleDateString("fr-FR") + ' : ' + j.n + ' révision' + (j.n>1?"s":"") + '">' +
        '<span style="height:' + Math.round(j.n/max*100) + '%"></span>' +
        '<small>' + (i % pas === 0 ? String(j.date.getDate()).padStart(2,"0") + "/" + String(j.date.getMonth()+1).padStart(2,"0") : "") + '</small></div>'
    ).join("");

    /* --- Top fiches --- */
    const fiches = new Map();
    const entree = r => {
        if(!fiches.has(r.fiche_id)) fiches.set(r.fiche_id,{titre:r.fiche_titre||"Fiche supprimée",n:0,ids:new Set(),last:r.created_at,pts:0,tot:0});
        return fiches.get(r.fiche_id);
    };
    sessions.forEach(r => { const f = entree(r); f.n++; f.ids.add(identite(r)); if(r.created_at > f.last) f.last = r.created_at; });
    resultats.forEach(r => { const f = entree(r); f.pts += r.score||0; f.tot += r.nb_questions||0; });
    const top = [...fiches.values()].filter(f => f.n).sort((a,b) => b.n - a.n).slice(0,10);

    const tableau = '<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Fiche</th><th>Révisions</th>' +
        (admin ? '<th>Visiteurs</th>' : '') + '<th>Score moyen</th><th>Dernière fois</th></tr></thead><tbody>' +
        top.map(f => '<tr><td>' + dashEscape(f.titre) + '</td><td>' + f.n + '</td>' +
            (admin ? '<td>' + f.ids.size + '</td>' : '') +
            '<td>' + (f.tot ? Math.round(f.pts/f.tot*100) + " %" : "—") + '</td><td>' + dashTempsRelatif(f.last) + '</td></tr>').join("") +
        '</tbody></table></div>';

    /* --- Dernières activités --- */
    const activites = rows.slice(0,15).map(r => {
        const qui = admin ? '<strong>' + dashEscape(dashQui(r)) + '</strong>' : '<strong>Vous</strong>';
        const titre = '« ' + dashEscape(r.fiche_titre || "fiche supprimée") + ' »';
        const texte = r.evenement === "session"
            ? qui + ' a lancé une révision de ' + titre
            : qui + ' a terminé ' + titre + ' : <b>' + (r.score ?? 0) + ' / ' + (r.nb_questions ?? 0) + '</b>';
        return '<li>' + texte + '<small>' + dashTempsRelatif(r.created_at) + '</small></li>';
    }).join("");

    return '<div class="dash-kpis">' + kpis + '</div>' +
        '<h3 class="dash-titre">Révisions par jour</h3><div class="dash-chart">' + barres + '</div>' +
        '<h3 class="dash-titre">Fiches les plus utilisées</h3>' + tableau +
        '<h3 class="dash-titre">Activité récente</h3><ul class="dash-activite">' + activites + '</ul>';
}

async function initialiserDashboard(){
    const bloc = document.getElementById("dashboard");
    if(!bloc) return;
    const utilisateur = await utilisateurConnecte();
    if(!utilisateur) return;

    const admin = typeof estAdmin === "function" && await estAdmin();
    document.getElementById("dashboard-label").textContent = admin ? "TABLEAU DE BORD ADMIN" : "MES STATISTIQUES";
    document.getElementById("dashboard-titre").textContent = admin ? "Utilisation des fiches" : "Mon activité";
    bloc.hidden = false;

    const select = document.getElementById("dashboard-periode");
    const contenu = document.getElementById("dashboard-contenu");

    const maj = async () => {
        const jours = Number(select.value);
        contenu.innerHTML = '<p class="dash-chargement">Chargement...</p>';
        try{
            contenu.innerHTML = dashRendre(await dashCharger(admin, utilisateur, jours), admin, jours);
        }catch(e){
            console.error("Erreur dashboard :", e);
            contenu.innerHTML = '<div class="empty-state"><h3>Impossible de charger les statistiques</h3><p>' +
                dashEscape(e.message) + '</p></div>';
        }
    };
    select.onchange = maj;
    maj();
}
